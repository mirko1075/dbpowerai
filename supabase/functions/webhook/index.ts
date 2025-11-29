import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { analyzeWithValidation, fakeAnalysis } from '../_shared/analyzer.ts';
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
    // Debug: request method and a masked headers summary
    console.log(`[webhook] method=${req.method}`);
    const hdrSummary = {
      has_x_api_key: !!req.headers.get("x-api-key") || !!req.headers.get("X-API-Key"),
      x_api_key_preview: (() => {
        const v = req.headers.get("x-api-key") || req.headers.get("X-API-Key");
        if (!v) return null;
        return `${v.slice(0,4)}...${v.slice(-4)}`;
      })()
    };
    console.log('[webhook] headers=', JSON.stringify(hdrSummary));
    console.log('Sending to SLACK');
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    });
    if (!response.ok) {
      console.error("[SLACK] Failed:", response.status);
    } else {
      console.log("[SLACK] Notification sent!");
    }
  } catch (err) {
    console.error("[SLACK] Error sending notification:", err);
  }
}
Deno.serve(async (req) => {
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

    // Authentication: only X-API-Key (per-user API key stored in user_profiles.api_key)
    const userApiKeyHeader = req.headers.get("x-api-key") || req.headers.get("X-API-Key");

    if (!userApiKeyHeader) {
      console.warn('[webhook] missing X-API-Key header');
      return new Response(JSON.stringify({ error: "Unauthorized: Missing X-API-Key header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, slack_webhook_url, slack_enabled, deleted_at")
      .eq("api_key", userApiKeyHeader)
      .single();
    console.log('[webhook] profile lookup err=', !!profileError, 'profile=', profile ? { id: profile.id, deleted_at: profile.deleted_at, slack_enabled: !!profile.slack_enabled } : null);
    if (profileError || !profile) {
      console.warn('[webhook] invalid per-user API key');
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

    const body = await req.json();
    if (!body || !body.sql) {
      return new Response(JSON.stringify({ error: "'sql' field required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
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
    if (insertError) {
      console.error('[webhook] failed to insert query:', insertError);
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
