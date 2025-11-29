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
Deno.serve(async (req)=>{
  console.log("\n===========================");
  console.log("[STEP 1] Incoming request");
  console.log("===========================");
  if (req.method === "OPTIONS") {
    console.log("[STEP OPTIONS] CORS preflight");
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    console.log("[STEP 2] Checking HTTP method:", req.method);
    if (req.method !== "POST") {
      console.error("[ERROR] Invalid method:", req.method);
      return new Response(JSON.stringify({
        error: "Method not allowed"
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log("[STEP 3] Reading environment variables...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    console.log("[ENV] SUPABASE_URL:", supabaseUrl);
    console.log("[ENV] Service key exists:", !!supabaseServiceKey);
    console.log("[ENV] OPENAI key exists:", !!openaiApiKey);
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[ERROR] Missing env");
      return new Response(JSON.stringify({
        error: "Server config error"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log("[STEP 4] Checking X-API-Key...");
    const apiKeyHeader = req.headers.get("X-API-Key");
    console.log("[HEADER] X-API-Key:", apiKeyHeader);
    if (!apiKeyHeader) {
      console.error("[ERROR] Missing X-API-Key");
      return new Response(JSON.stringify({
        error: "Missing X-API-Key"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log("[STEP 5] Creating Supabase admin client");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log("[STEP 6] Looking up user profile...");
    const { data: profile, error: profileError } = await supabaseAdmin.from("user_profiles").select("*").eq("api_key", apiKeyHeader).single();
    console.log("[PROFILE RESULT]", {
      profile,
      profileError
    });
    if (profileError || !profile) {
      console.error("[ERROR] Invalid API key");
      return new Response(JSON.stringify({
        error: "Invalid API key"
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (profile.deleted_at) {
      console.log("[ERROR] Deleted user");
      return new Response(JSON.stringify({
        error: "Account deleted"
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log("[STEP 7] User authenticated:", profile.id);
    console.log("[STEP 8] Reading request body...");
    const body = await req.json();
    console.log("[BODY RECEIVED]", body);
    if (!body.sql) {
      console.error("[ERROR] Missing SQL");
      return new Response(JSON.stringify({
        error: "'sql' field required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log("[STEP 9] Running analysis...");
    const analysisResult = openaiApiKey ? await analyzeWithValidation(body.sql, openaiApiKey, supabaseAdmin) : fakeAnalysis({
      query: body.sql
    });
    console.log("[ANALYSIS RESULT]", analysisResult);
    console.log("[STEP 10] Saving query to DB...");
    const { error: insertError } = await supabaseAdmin.from("queries").insert({
      user_id: profile.id,
      raw_query: body.sql,
      optimized_query: analysisResult.rewrittenQuery,
      suggested_indexes: analysisResult.suggestedIndex,
      bottleneck: analysisResult.issues.join(", "),
      db_type: "unknown",
      schema: body.database_schema || body.schema,
      execution_plan: body.explain_plan || body.explain,
      analysis: JSON.stringify(analysisResult),
      notes: analysisResult.semantic_warning || "Analyzed via webhook API",
      origin: "webhook"
    });
    console.log("[INSERT RESULT]", insertError);
    if (insertError) {
      console.error("[ERROR] Failed to save:", insertError);
      return new Response(JSON.stringify({
        error: "Failed to save",
        details: insertError
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log("[STEP 11] Saved successfully!");
    if (profile.slack_enabled && profile.slack_webhook_url) {
      console.log("[STEP 12] Sending Slack...");
      await sendSlackNotification(profile.slack_webhook_url, body.sql, analysisResult);
    } else {
      console.log("[STEP SLACK] Disabled for user");
    }
    console.log("[STEP 13] Returning response");
    return new Response(JSON.stringify({
      success: true,
      ...analysisResult,
      message: "Query analyzed & saved"
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("[CRITICAL ERROR]", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message || error.toString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
