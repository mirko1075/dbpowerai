import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { optimizeQuery } from "../shared/optimize-query.ts";
import { sendSlackMessage, buildSlackMessage, AnalysisShape } from "../shared/slack.ts";

// Typed shapes to satisfy linter
type Profile = {
  id: string;
  slack_webhook_url?: string | null;
  slack_enabled?: boolean | null;
  deleted_at?: string | null;
};

type WebhookBody = {
  sql: string;
  db_type?: string;
  database_schema?: string;
  schema?: string;
  explain_plan?: string;
  explain?: string;
  ts?: number | string;
};

// Module load time log 
console.log("[webhook] module initialized");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key"
};

export const config = {
  runtime: "edge",
  verifyJWT: false,
  cors: {
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["content-type", "x-api-key"],
    allowOrigins: ["*"]
  }
};

Deno.serve(async (req: Request) => {
  try {
    const preview =
      req.headers.get("x-api-key") ||
      req.headers.get("X-API-Key") ||
      null;
    console.log(
      "[webhook] invocation start, x-api-key-preview=",
      preview ? `${preview.slice(0, 4)}...${preview.slice(-4)}` : "none"
    );
  } catch {
    console.log("[webhook] invocation start (failed to preview header)");
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[webhook] missing env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server config error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const writeDebug = async (level: string, message: string, meta: unknown = null) => {
      try {
        await supabaseAdmin
          .from("function_debug_logs")
          .insert({ function_name: "webhook", level, message, meta });
      } catch (e) {
        console.warn("[webhook] writeDebug failed", String(e));
      }
    };

    // 🔥 Keep ONLY this authentication
    const userApiKeyHeader =
      req.headers.get("x-api-key") || req.headers.get("X-API-Key");

    if (!userApiKeyHeader) {
      await writeDebug("warn", "missing X-API-Key header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing X-API-Key header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try client lookup first; fall back to REST endpoint if it fails (handles gateway/JWT issues)
  let profile: Profile | null = null;
  let profileError: string | null = null;
    try {
      const res = await supabaseAdmin
        .from("user_profiles")
        .select("id, slack_webhook_url, slack_enabled, deleted_at")
        .eq("api_key", userApiKeyHeader)
        .single();
      profile = res.data;
      profileError = res.error ? String(res.error) : null;
    } catch (e) {
      profile = null;
      profileError = String(e);
    }

    if (!profile) {
      try {
        const url = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/user_profiles?select=id,slack_webhook_url,slack_enabled,deleted_at&api_key=eq.${encodeURIComponent(
          userApiKeyHeader
        )}&limit=1`;
        const r = await fetch(url, {
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
            Accept: "application/json"
          }
        });
        if (r.ok) {
          const bodyJson = await r.json();
          if (Array.isArray(bodyJson) && bodyJson.length > 0) profile = bodyJson[0];
        } else {
          profileError = `rest lookup failed status=${r.status}`;
        }
      } catch (e) {
        profileError = String(e);
      }
    }

    await writeDebug("info", "profile lookup", {
      profile: profile
        ? { id: profile.id, deleted_at: profile.deleted_at, slack_enabled: !!profile.slack_enabled }
        : null,
      profileError: profileError ? String(profileError) : null
    });

    if (profileError || !profile) {
      await writeDebug("warn", "invalid per-user API key", {
        api_key_preview: `${userApiKeyHeader.slice(0, 4)}...${userApiKeyHeader.slice(-4)}`
      });
      return new Response(JSON.stringify({ error: "Invalid API key" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (profile.deleted_at) {
      return new Response(
        JSON.stringify({ error: "Account deleted" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body
    const bodyText = await req.text();
    let body: WebhookBody | null = null;

    try {
      body = bodyText ? (JSON.parse(bodyText) as WebhookBody) : null;
    } catch (err) {
      await writeDebug("warn", "invalid JSON body parse", { error: String(err) });
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body || typeof body.sql !== "string") {
      return new Response(
        JSON.stringify({ error: "'sql' field required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  // Extract fields
  const bodyRec = body as WebhookBody;
    const sql = String(bodyRec["sql"]);
    const dbTypeVal = bodyRec["db_type"]
      ? String(bodyRec["db_type"])
      : "unknown";
    const schemaVal = bodyRec["database_schema"]
      ? String(bodyRec["database_schema"])
      : bodyRec["schema"]
      ? String(bodyRec["schema"])
      : null;

    const executionPlanBody = bodyRec["explain_plan"]
      ? String(bodyRec["explain_plan"])
      : bodyRec["explain"]
      ? String(bodyRec["explain"])
      : null;

    // Analysis using the same logic as /optimize
    if (!openaiApiKey) {
      await writeDebug("error", "OpenAI API key not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let optimizeResult;
    try {
      optimizeResult = await optimizeQuery({
        query: sql,
        db: dbTypeVal,
        schema: schemaVal || undefined,
        executionPlan: executionPlanBody || undefined,
        openaiApiKey,
      });
    } catch (error) {
      await writeDebug("error", "optimize query failed", { error: String(error) });
      return new Response(
        JSON.stringify({ error: "Unable to optimize query. Please check your SQL and try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bottleneckStr = optimizeResult.bottleneck;

    const { error: insertError } = await supabaseAdmin
      .from("queries")
      .insert({
        user_id: profile.id,
        raw_query: sql,
        optimized_query: optimizeResult.rewrittenQuery,
        suggested_indexes: optimizeResult.recommendedIndexes,
        bottleneck: bottleneckStr,
        db_type: dbTypeVal,
        schema: schemaVal,
        execution_plan: executionPlanBody,
        analysis: optimizeResult.analysis,
        warnings: optimizeResult.warningsJson,
        detected_patterns: optimizeResult.patternsJson,
        notes: optimizeResult.notes || "Analyzed via webhook API",
        origin: "webhook"
      });

    await writeDebug("info", "insert result", {
      insertError: insertError ? String(insertError) : null
    });

    if (insertError) {
      await writeDebug("error", "failed to insert query", {
        insertError: String(insertError)
      });
      return new Response(
        JSON.stringify({ error: "Failed to save", details: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Slack notifications
    if (profile.slack_enabled && profile.slack_webhook_url) {
      try {
        // Build a simple slack message with the key results
        const slackText = `*SQL Analysis Complete*\n` +
          `Bottleneck: ${bottleneckStr}\n` +
          `Optimized Query: \`\`\`${optimizeResult.rewrittenQuery}\`\`\`\n` +
          `Recommended Indexes: ${optimizeResult.recommendedIndexes}`;

        await fetch(profile.slack_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: slackText })
        }).catch((e) => console.warn("[webhook] slack send failed", String(e)));
      } catch (e) {
        console.warn("[webhook] failed to send slack message", String(e));
      }
    }

    // Build response matching the documented API format
    return new Response(
      JSON.stringify({
        success: true,
        score: optimizeResult.detectedPatterns.length === 0 ? 95 :
               optimizeResult.detectedPatterns.some(p => p.severity === "high") ? 40 : 70,
        severity: optimizeResult.detectedPatterns.some(p => p.severity === "high") ? "high" :
                  optimizeResult.detectedPatterns.some(p => p.severity === "medium") ? "medium" : "low",
        speedupEstimate: optimizeResult.detectedPatterns.length === 0 ? 0 : 0.5,
        rewrittenQuery: optimizeResult.rewrittenQuery,
        suggestedIndex: optimizeResult.recommendedIndexes,
        issues: optimizeResult.detectedPatterns.map(p => p.message),
        semantic_warning: optimizeResult.notes.includes("semantic") ? optimizeResult.notes : null,
        validator_status: "valid",
        bottleneck: bottleneckStr,
        analysis: optimizeResult.analysis,
        warnings: optimizeResult.warningsJson,
        detected_patterns: optimizeResult.patternsJson,
        schema: schemaVal,
        execution_plan: executionPlanBody,
        message: "Query analyzed & saved"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[webhook] unexpected error", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
