import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { analyzeWithValidation, fakeAnalysis } from '../_shared/analyzer.ts';

type AnalysisShape = {
  severity?: string | null;
  score?: number | null;
  issues?: string[] | null;
  suggestedIndex?: string | string[] | null;
  suggestedIndexes?: string | string[] | null;
  semantic_warning?: string | null;
  notes?: string | null;
  note?: string | null;
  rewrittenQuery?: string | null;
  optimized_query?: string | null;
  speedupEstimate?: number | null;
  validator_status?: string | null;
};

// Module load time log
console.log('[webhook] module initialized');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, X-Signature"
};

async function sendSlackNotification(webhookUrl: string, sql: string, analysis: AnalysisShape, tableSchema?: string | null, executionPlan?: string | null) {
  console.log("[STEP SLACK] Sending Slack notification...");
  const severityColor: Record<string, string> = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#ef4444",
    critical: "#dc2626"
  };

  // Normalize analysis fields with safe defaults
  const severity = String(analysis?.severity || 'low').toLowerCase();
  const score = analysis?.score ?? 'N/A';
  const issuesList = (Array.isArray(analysis?.issues) && analysis!.issues!.length) ? (analysis!.issues!.map((i: unknown) => `• ${String(i)}`).join('\n')) : 'None detected';
  const suggestedIndexes = analysis?.suggestedIndex || analysis?.suggestedIndexes || null;
  const notes = analysis?.semantic_warning || analysis?.notes || analysis?.note || 'No notes provided';
  const optimized = analysis?.rewrittenQuery || analysis?.optimized_query || null;
  const speedupPct = Math.round(((analysis?.speedupEstimate ?? 0) * 100));

  const blocks: unknown[] = [
    { type: "header", text: { type: "plain_text", text: "🔍 SQL Query Analyzed via Webhook API" } },
    { type: "section", fields: [ { type: "mrkdwn", text: `*Severity:* ${severity.toUpperCase()}` }, { type: "mrkdwn", text: `*Score:* ${score}/100` } ] },
    { type: "section", text: { type: "mrkdwn", text: `*Original Query:*
\`\`\`${sql}\`\`\`` } },
    { type: "section", text: { type: "mrkdwn", text: `*Optimized Query:*
\`\`\`${optimized || 'No rewrite available'}\`\`\`` } },
    { type: "section", text: { type: "mrkdwn", text: `*Suggested Indexes:*
${suggestedIndexes ? '```' + String(suggestedIndexes) + '```' : 'None suggested'}` } },
    { type: "section", text: { type: "mrkdwn", text: `*Bottleneck Analysis:*
${issuesList}` } },
    { type: "section", text: { type: "mrkdwn", text: `*Notes:*
${notes}` } }
  ];

  if (tableSchema) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: `*Table Schema:*
\`\`\`${tableSchema}\`\`\`` } });
  }
  if (executionPlan) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: `*Execution Plan:*
\`\`\`${executionPlan}\`\`\`` } });
  }

  const message = {
    text: `🔍 New SQL Analysis from Webhook API`,
    blocks,
    attachments: [ { color: severityColor[severity] || severityColor['low'], fields: [ { title: "Speedup Estimate", value: `${speedupPct}%`, short: true }, { title: "Validation Status", value: analysis?.validator_status === "valid" ? "✅ Valid" : "⚠️ Needs Review", short: true } ] } ]
  };

  try {
    console.log('[SLACK] sending...');
    const resp = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(message) });
    if (!resp.ok) console.error('[SLACK] failed', resp.status);
  } catch {
    console.error('[SLACK] Error sending notification');
  }
}

export const config = {
  runtime: 'edge',
  allowMethods: ['POST','OPTIONS'],
  verifyJWT: false
};

Deno.serve(async (req: Request) => {
  // Invocation start
  try {
    const preview = req.headers.get('x-api-key') || req.headers.get('X-API-Key') || null;
    console.log('[webhook] invocation start, x-api-key-preview=', preview ? `${preview.slice(0,4)}...${preview.slice(-4)}` : 'none');
  } catch (e) {
    console.log('[webhook] invocation start (failed to preview header)');
  }

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[webhook] missing env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server config error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const writeDebug = async (level: string, message: string, meta: unknown = null) => {
      try { await supabaseAdmin.from('function_debug_logs').insert({ function_name: 'webhook', level, message, meta }); } catch (e) { console.warn('[webhook] writeDebug failed', String(e)); }
    };

    const userApiKeyHeader = req.headers.get('x-api-key') || req.headers.get('X-API-Key');
    if (!userApiKeyHeader) { await writeDebug('warn','missing X-API-Key header'); return new Response(JSON.stringify({ error: 'Unauthorized: Missing X-API-Key header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    const { data: profile, error: profileError } = await supabaseAdmin.from('user_profiles').select('id, slack_webhook_url, slack_enabled, deleted_at').eq('api_key', userApiKeyHeader).single();
    await writeDebug('info','profile lookup', { profile: profile ? { id: profile.id, deleted_at: profile.deleted_at, slack_enabled: !!profile.slack_enabled } : null, profileError: profileError ? String(profileError) : null });
    if (profileError || !profile) { await writeDebug('warn','invalid per-user API key', { api_key_preview: `${userApiKeyHeader.slice(0,4)}...${userApiKeyHeader.slice(-4)}` }); return new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    if (profile.deleted_at) return new Response(JSON.stringify({ error: 'Account deleted' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const bodyText = await req.text();
  let body: Record<string, unknown> | null = null;
  try { body = bodyText ? JSON.parse(bodyText) : null; } catch (err) { await writeDebug('warn','invalid JSON body parse', { error: String(err) }); return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    if (!body || !(('sql' in body) && typeof (body as any).sql === 'string')) return new Response(JSON.stringify({ error: "'sql' field required" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // extract typed fields from body to satisfy TS checks
    const bodyRec = body as Record<string, unknown>;
    const sql = String(bodyRec['sql']);
    const dbTypeVal = bodyRec['db_type'] ? String(bodyRec['db_type']) : 'unknown';
    const schemaVal = bodyRec['database_schema'] ? String(bodyRec['database_schema']) : (bodyRec['schema'] ? String(bodyRec['schema']) : null);
    const executionPlanBody = bodyRec['explain_plan'] ? String(bodyRec['explain_plan']) : (bodyRec['explain'] ? String(bodyRec['explain']) : null);
    const tsRawBody = bodyRec['ts'];

    const sigHeader = (req.headers.get('x-signature') || req.headers.get('X-Signature') || '').toString().toLowerCase();
    if (!sigHeader) { await writeDebug('warn','missing X-Signature header', { api_key_preview: `${userApiKeyHeader.slice(0,4)}...${userApiKeyHeader.slice(-4)}` }); return new Response(JSON.stringify({ error: 'Missing X-Signature header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    async function verifyHMACHex(secret: string, message: string, expectedHex: string): Promise<boolean> {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
      const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('');
      if (hex.length !== expectedHex.length) return false;
      let diff = 0; for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ expectedHex.charCodeAt(i); return diff === 0;
    }

  const sigValid = await verifyHMACHex(userApiKeyHeader, bodyText, sigHeader);
    if (!sigValid) { await writeDebug('warn','invalid signature', { api_key_preview: `${userApiKeyHeader.slice(0,4)}...${userApiKeyHeader.slice(-4)}` }); return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
  const nowSec = Math.floor(Date.now()/1000);
  const ts = typeof tsRawBody === 'number' ? tsRawBody : (typeof tsRawBody === 'string' ? parseInt(String(tsRawBody),10) : NaN);
    const ALLOWED_SKEW = 120;
  if (!ts || Number.isNaN(ts)) { await writeDebug('warn','missing or invalid ts in request', { preview: sql ? sql.substring(0,80) : null }); return new Response(JSON.stringify({ error: 'Missing or invalid ts (epoch seconds) in body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    if (Math.abs(nowSec - ts) > ALLOWED_SKEW) { await writeDebug('warn','stale timestamp', { now: nowSec, ts, allowed_skew: ALLOWED_SKEW }); return new Response(JSON.stringify({ error: 'Stale timestamp' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
  const analysisResult = openaiApiKey ? await analyzeWithValidation(sql, openaiApiKey, supabaseAdmin) : fakeAnalysis({ query: sql });

  const analysisRec = analysisResult as unknown as Record<string, unknown> & AnalysisShape;
  const bottleneckStr = Array.isArray(analysisRec.issues) ? (analysisRec.issues as string[]).join(', ') : String(analysisRec.issues || '');
  const { error: insertError } = await supabaseAdmin.from('queries').insert({ user_id: profile.id, raw_query: sql, optimized_query: analysisRec.rewrittenQuery, suggested_indexes: analysisRec.suggestedIndex, bottleneck: bottleneckStr, db_type: dbTypeVal, schema: schemaVal, execution_plan: executionPlanBody, analysis: JSON.stringify(analysisResult), notes: analysisRec.semantic_warning || 'Analyzed via webhook API', origin: 'webhook' });
    await writeDebug('info','insert result', { insertError: insertError ? String(insertError) : null });
    if (insertError) { await writeDebug('error','failed to insert query', { insertError: String(insertError) }); return new Response(JSON.stringify({ error: 'Failed to save', details: insertError }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    if (profile.slack_enabled && profile.slack_webhook_url) { 
      // Fire-and-forget Slack notification (don't block main response on failures)
      sendSlackNotification(profile.slack_webhook_url, sql, analysisResult, schemaVal, executionPlanBody).catch(()=>{}); 
    }

    return new Response(JSON.stringify({ success: true, ...analysisResult, message: 'Query analyzed & saved' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[webhook] unexpected error', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
