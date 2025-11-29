import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { analyzeWithValidation, fakeAnalysis } from "../_shared/analyzer.ts";
import { sendSlackMessage, buildSlackMessage, AnalysisShape } from "../_shared/slack.ts";

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
console.log('config :>> ', config);
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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, slack_webhook_url, slack_enabled, deleted_at")
      .eq("api_key", userApiKeyHeader)
      .single();

    await writeDebug("info", "profile lookup", {
      profile: profile
        ? {
            id: profile.id,
            deleted_at: profile.deleted_at,
            slack_enabled: !!profile.slack_enabled
          }
        : null,
      profileError: profileError ? String(profileError) : null
    });

    if (profileError || !profile) {
      await writeDebug("warn", "invalid per-user API key", {
        api_key_preview: `${userApiKeyHeader.slice(0, 4)}...${userApiKeyHeader.slice(-4)}`
      });
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile.deleted_at) {
      return new Response(
        JSON.stringify({ error: "Account deleted" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body
    const bodyText = await req.text();
    let body: Record<string, unknown> | null = null;

    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch (err) {
      await writeDebug("warn", "invalid JSON body parse", { error: String(err) });
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body || !("sql" in body) || typeof (body as any).sql !== "string") {
      return new Response(
        JSON.stringify({ error: "'sql' field required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract fields
    const bodyRec = body as Record<string, unknown>;
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

    // Analysis
    const analysisResult = openaiApiKey
      ? await analyzeWithValidation(sql, openaiApiKey, supabaseAdmin)
      : fakeAnalysis({ query: sql });

    const analysisRec = analysisResult as unknown as Record<
      string,
      unknown
    > &
      AnalysisShape;

    const bottleneckStr = Array.isArray(analysisRec.issues)
      ? (analysisRec.issues as string[]).join(", ")
      : String(analysisRec.issues || "");

    const { error: insertError } = await supabaseAdmin
      .from("queries")
      .insert({
        user_id: profile.id,
        raw_query: sql,
        optimized_query: analysisRec.rewrittenQuery,
        suggested_indexes: analysisRec.suggestedIndex,
        bottleneck: bottleneckStr,
        db_type: dbTypeVal,
        schema: schemaVal,
        execution_plan: executionPlanBody,
        analysis: JSON.stringify(analysisResult),
        notes: analysisRec.semantic_warning || "Analyzed via webhook API",
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
        const slackPayload = buildSlackMessage(
          bodyRec,
          analysisResult as AnalysisShape
        );
        await supabaseAdmin
          .from("function_debug_logs")
          .insert({
            function_name: "webhook",
            level: "debug",
            message: "slack_payload",
            meta: slackPayload
          });
      } catch (e) {
        console.warn("[webhook] failed to persist slack payload", String(e));
      }

      sendSlackMessage(
        profile.slack_webhook_url,
        bodyRec,
        analysisResult as AnalysisShape
      ).catch(() => {});
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...analysisResult,
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
