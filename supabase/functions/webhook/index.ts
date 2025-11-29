import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

interface AnalysisRequest {
  sql: string;
  database_schema?: string;
  explain_plan?: string;
}

interface AnalysisResult {
  score: number;
  severity: "low" | "medium" | "high" | "critical";
  issues: string[];
  suggestedIndex: string;
  rewrittenQuery: string;
  speedupEstimate: number;
}

function analyzeQuery(request: AnalysisRequest): AnalysisResult {
  const { sql } = request;
  const queryLower = sql.toLowerCase();

  const issues: string[] = [];
  let score = 85;
  let severity: "low" | "medium" | "high" | "critical" = "low";

  // Analyze common performance issues
  if (queryLower.includes("select *")) {
    issues.push("Using SELECT * retrieves unnecessary columns");
    score -= 15;
  }

  if (queryLower.includes("where") && !queryLower.includes("index")) {
    issues.push("Missing index on WHERE clause columns");
    score -= 20;
    severity = "high";
  }

  if (queryLower.includes("order by") && !queryLower.includes("limit")) {
    issues.push("ORDER BY without LIMIT can cause performance issues");
    score -= 10;
  }

  if (queryLower.includes("like '%")) {
    issues.push("Leading wildcard in LIKE prevents index usage");
    score -= 15;
    severity = "high";
  }

  if (queryLower.includes("or")) {
    issues.push("OR conditions may prevent index optimization");
    score -= 10;
  }

  if (
    queryLower.includes("join") &&
    !queryLower.includes("on") &&
    !queryLower.includes("using")
  ) {
    issues.push("JOIN without proper ON clause");
    score -= 25;
    severity = "critical";
  }

  if (queryLower.includes("subquery") || queryLower.match(/\(select/gi)) {
    issues.push("Subquery detected - consider using JOIN instead");
    score -= 12;
  }

  // Determine severity
  if (score < 40) {
    severity = "critical";
  } else if (score < 60) {
    severity = "high";
  } else if (score < 75) {
    severity = "medium";
  }

  // Suggest index
  const tableName = sql.match(/from\s+(\w+)/i)?.[1] || "your_table";
  const whereColumn = sql.match(/where\s+(\w+)/i)?.[1] || "status";

  const suggestedIndex = issues.some((i) => i.includes("Missing index"))
    ? `CREATE INDEX idx_${tableName}_${whereColumn}\nON ${tableName}(${whereColumn});`
    : "";

  // Rewrite query
  let rewrittenQuery = sql.trim();

  if (queryLower.includes("select *")) {
    rewrittenQuery = rewrittenQuery.replace(
      /SELECT\s+\*/gi,
      "SELECT id, status, created_at"
    );
  }

  if (queryLower.includes("order by") && !queryLower.includes("limit")) {
    if (!rewrittenQuery.endsWith(";")) {
      rewrittenQuery += "\nLIMIT 100;";
    } else {
      rewrittenQuery = rewrittenQuery.replace(/;$/, "\nLIMIT 100;");
    }
  }

  const speedupEstimate =
    issues.length > 0 ? Math.min(0.9, 0.2 + issues.length * 0.15) : 0.1;

  return {
    score: Math.max(0, Math.min(100, score)),
    severity,
    issues: issues.length > 0 ? issues : ["No major issues found"],
    suggestedIndex,
    rewrittenQuery,
    speedupEstimate,
  };
}

async function sendSlackNotification(
  webhookUrl: string,
  sql: string,
  analysis: AnalysisResult
): Promise<void> {
  const severityColor = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#ef4444",
    critical: "#dc2626"
  };

  const message = {
    text: `🔍 New SQL Analysis from Webhook`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🔍 SQL Query Analyzed via Webhook",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Severity:* ${analysis.severity.toUpperCase()}`,
          },
          {
            type: "mrkdwn",
            text: `*Score:* ${analysis.score}/100`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Query:*\n\`\`\`${sql.substring(0, 200)}${sql.length > 200 ? '...' : ''}\`\`\``,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Issues Found:*\n${analysis.issues.map(i => `• ${i}`).join('\n')}`,
        },
      },
    ],
    attachments: [
      {
        color: severityColor[analysis.severity],
        text: `Speedup Estimate: ${(analysis.speedupEstimate * 100).toFixed(0)}%`,
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(`[webhook] Slack notification failed: ${response.status}`);
    }
  } catch (error) {
    console.error("[webhook] Failed to send Slack notification:", error);
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Validate HTTP method
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[webhook] Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Validate API key header
    const apiKeyHeader = req.headers.get("X-API-Key");
    if (!apiKeyHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing X-API-Key header" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Validate API key and get user
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, slack_webhook_url, slack_enabled, deleted_at")
      .eq("api_key", apiKeyHeader)
      .single();

    if (profileError || !profile) {
      console.error("[webhook] Invalid API key");
      return new Response(
        JSON.stringify({ error: "Forbidden: Invalid API key" }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Check if user is deleted
    if (profile.deleted_at) {
      console.error("[webhook] User account deleted");
      return new Response(
        JSON.stringify({ error: "Forbidden: Account has been deleted" }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`[webhook] Authenticated user: ${profile.id}`);

    // Parse request body
    const body = await req.json();

    if (!body.sql || typeof body.sql !== "string") {
      return new Response(
        JSON.stringify({
          error: "Bad Request: 'sql' field is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const analysisRequest: AnalysisRequest = {
      sql: body.sql,
      database_schema: body.database_schema || body.schema,
      explain_plan: body.explain_plan || body.explain,
    };

    console.log(`[webhook] Analyzing query for user ${profile.id}`);

    // Perform analysis
    const analysisResult = analyzeQuery(analysisRequest);

    // Save to queries table with origin='webhook'
    const { error: insertError } = await supabaseAdmin
      .from("queries")
      .insert({
        user_id: profile.id,
        raw_query: analysisRequest.sql,
        optimized_query: analysisResult.rewrittenQuery,
        suggested_indexes: analysisResult.suggestedIndex,
        bottleneck: analysisResult.issues.join(", "),
        db_type: "unknown",
        schema: analysisRequest.database_schema,
        execution_plan: analysisRequest.explain_plan,
        analysis: JSON.stringify(analysisResult),
        notes: `Analyzed via webhook API`,
        origin: "webhook", // CRITICAL: Set origin to webhook
      });

    if (insertError) {
      console.error("[webhook] Failed to save query:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to save query analysis",
          details: insertError.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`[webhook] Query saved successfully for user ${profile.id}`);

    // Send Slack notification ONLY if enabled
    if (profile.slack_enabled && profile.slack_webhook_url) {
      console.log(`[webhook] Sending Slack notification for user ${profile.id}`);
      await sendSlackNotification(
        profile.slack_webhook_url,
        analysisRequest.sql,
        analysisResult
      );
    } else {
      console.log(`[webhook] Slack notifications disabled for user ${profile.id}`);
    }

    // Return analysis result
    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        message: "Query analyzed and saved successfully",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[webhook] Unexpected error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
