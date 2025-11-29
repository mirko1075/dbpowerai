import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { analyzeWithValidation, fakeAnalysis } from '../_shared/analyzer.ts';
// Module load time log
console.log('[webhook] module initialized');
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key"
};
async function sendSlackNotification(webhookUrl, sql, analysis) {
  console.log("[STEP SLACK] Sending Slack notification...");
  const severityColor = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#ef4444",
    critical: "#dc2626"
  };
  const message = {
    text: `🔍 New SQL Analysis from Webhook API`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🔍 SQL Query Analyzed via Webhook API"
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Severity:* ${analysis.severity.toUpperCase()}`
          },
          {
            type: "mrkdwn",
            text: `*Score:* ${analysis.score}/100`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Original Query:*\n\`\`\`${sql.substring(0, 200)}${sql.length > 200 ? '...' : ''}\`\`\``
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Issues Found:*\n${analysis.issues.map((i)=>`• ${i}`).join('\n')}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Optimized Query:*\n\`\`\`${analysis.rewrittenQuery ? analysis.rewrittenQuery.substring(0, 300) : 'No rewrite available'}${analysis.rewrittenQuery && analysis.rewrittenQuery.length > 300 ? '...' : ''}\`\`\``
        }
      }
    ],
    attachments: [
      {
        color: severityColor[analysis.severity],
        fields: [
          {
            title: "Speedup Estimate",
            value: `${(analysis.speedupEstimate * 100).toFixed(0)}%`,
            short: true
          },
          {
            title: "Validation Status",
            value: analysis.validator_status === "valid" ? "✅ Valid" : "⚠️ Needs Review",
            short: true
          }
        ]
      }
    ]
  };
  try {
    console.log('Sending to SLACK');
    const response = await fetch(webhookUrl, {
      method: "POST",
      // nothing extra to do here; we attempted persistent logging earlier but avoid doing it from the catch to keep runtime simple
  try {
    const preview = req.headers.get('x-api-key') || req.headers.get('X-API-Key') || null;
    console.log('[webhook] invocation start, x-api-key-preview=', preview ? `${preview.slice(0,4)}...${preview.slice(-4)}` : 'none');
  } catch (e) {
    console.log('[webhook] invocation start (failed to preview header)');
  }
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[webhook] missing env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    console.log('[webhook] env ok, openai=', !!openaiApiKey);

    // create supabase admin client early (used for debug writes)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // helper to write a persistent debug row (best-effort, non-blocking)
    const writeDebug = async (level: string, message: string, meta: any = null) => {
      try {
        await supabaseAdmin.from('function_debug_logs').insert({ function_name: 'webhook', level, message, meta });
      } catch (err) {
        console.warn('[webhook] writeDebug failed', String(err));
      }
    };

    // Authentication: only X-API-Key (per-user API key stored in user_profiles.api_key)
    const userApiKeyHeader = req.headers.get("x-api-key") || req.headers.get("X-API-Key");

    if (!userApiKeyHeader) {
      console.warn('[webhook] missing X-API-Key header');
      await writeDebug('warn', 'missing X-API-Key header');
      return new Response(JSON.stringify({ error: "Unauthorized: Missing X-API-Key header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, slack_webhook_url, slack_enabled, deleted_at")
      .eq("api_key", userApiKeyHeader)
      .single();
    console.log('[webhook] profile lookup err=', !!profileError, 'profile=', profile ? { id: profile.id, deleted_at: profile.deleted_at, slack_enabled: !!profile.slack_enabled } : null);
    await writeDebug('info', 'profile lookup', { profile: profile ? { id: profile.id, deleted_at: profile.deleted_at, slack_enabled: !!profile.slack_enabled } : null, profileError: profileError ? String(profileError) : null });
    if (profileError || !profile) {
      console.warn('[webhook] invalid per-user API key');
      await writeDebug('warn', 'invalid per-user API key', { api_key_preview: `${userApiKeyHeader.slice(0,4)}...${userApiKeyHeader.slice(-4)}` });
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (profile.deleted_at) {
      return new Response(JSON.stringify({ error: "Account deleted" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Read raw body text for HMAC verification, then parse JSON
    const bodyText = await req.text();
    let body = null;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch (err) {
      console.warn('[webhook] invalid JSON body parse', String(err));
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!body || !body.sql) {
      return new Response(JSON.stringify({ error: "'sql' field required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // HMAC verification: expect header X-Signature with hex(hmac_sha256(bodyText, api_key))
    const sigHeader = req.headers.get('x-signature') || req.headers.get('X-Signature');
    if (!sigHeader) {
      await writeDebug('warn', 'missing X-Signature header', { api_key_preview: `${userApiKeyHeader.slice(0,4)}...${userApiKeyHeader.slice(-4)}` });
      return new Response(JSON.stringify({ error: 'Missing X-Signature header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    async function verifyHMACHex(secret: string, message: string, expectedHex: string): Promise<boolean> {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
      // convert ArrayBuffer to hex
      const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
      // timing-safe compare
      if (hex.length !== expectedHex.length) return false;
      let diff = 0;
      for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
      return diff === 0;
    }

    const sigValid = await verifyHMACHex(userApiKeyHeader, bodyText, sigHeader.toLowerCase());
    if (!sigValid) {
      await writeDebug('warn', 'invalid signature', { api_key_preview: `${userApiKeyHeader.slice(0,4)}...${userApiKeyHeader.slice(-4)}` });
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Timestamp replay protection: require body.ts (epoch seconds) and ensure within allowed window
    const nowSec = Math.floor(Date.now() / 1000);
    const tsRaw = body.ts;
    const ts = typeof tsRaw === 'number' ? tsRaw : (typeof tsRaw === 'string' ? parseInt(tsRaw, 10) : NaN);
    const ALLOWED_SKEW = 120; // seconds
    if (!ts || Number.isNaN(ts)) {
      await writeDebug('warn', 'missing or invalid ts in request', { preview: body.sql ? body.sql.substring(0,80) : null });
      return new Response(JSON.stringify({ error: 'Missing or invalid ts (epoch seconds) in body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (Math.abs(nowSec - ts) > ALLOWED_SKEW) {
      await writeDebug('warn', 'stale timestamp', { now: nowSec, ts, allowed_skew: ALLOWED_SKEW });
      return new Response(JSON.stringify({ error: 'Stale timestamp' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const analysisResult = openaiApiKey ? await analyzeWithValidation(body.sql, openaiApiKey, supabaseAdmin) : fakeAnalysis({ query: body.sql });

    const { error: insertError } = await supabaseAdmin.from("queries").insert({
      user_id: profile.id,
      raw_query: body.sql,
      optimized_query: analysisResult.rewrittenQuery,
      suggested_indexes: analysisResult.suggestedIndex,
      bottleneck: analysisResult.issues.join(", "),
      db_type: body.db_type || "unknown",
      schema: body.database_schema || body.schema,
      execution_plan: body.explain_plan || body.explain,
      analysis: JSON.stringify(analysisResult),
      notes: analysisResult.semantic_warning || "Analyzed via webhook API",
      origin: "webhook"
    });
    console.log('[webhook] insertError=', insertError);
    await writeDebug('info', 'insert result', { insertError: insertError ? String(insertError) : null });
    if (insertError) {
      console.error('[webhook] failed to insert query:', insertError);
      await writeDebug('error', 'failed to insert query', { insertError: String(insertError) });
      return new Response(JSON.stringify({ error: "Failed to save", details: insertError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (profile.slack_enabled && profile.slack_webhook_url) {
      // Fire-and-forget Slack notification (don't block main response on failures)
      sendSlackNotification(profile.slack_webhook_url, body.sql, analysisResult).catch(() => {
        // swallow errors - optional logging could be added here
      });
    }

    return new Response(JSON.stringify({ success: true, ...analysisResult, message: "Query analyzed & saved" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('[webhook] unexpected error', error);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
