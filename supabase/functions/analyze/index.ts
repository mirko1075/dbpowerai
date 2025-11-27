import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { VALIDATOR_PROMPT } from './validatorPrompt.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Free-Analysis-Token",
};

interface AnalysisRequest {
  query: string;
  schema?: string;
  explain?: string;
}

interface AnalysisResult {
  score: number;
  severity: "low" | "medium" | "high" | "critical";
  issues: string[];
  suggestedIndex: string;
  rewrittenQuery: string | null;
  speedupEstimate: number;
  validator_status?: "valid" | "invalid";
  semantic_warning?: string | null;
}

function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIP = req.headers.get("x-real-ip");
  const cfConnectingIP = req.headers.get("cf-connecting-ip");

  return cfConnectingIP || forwardedFor?.split(',')[0]?.trim() || realIP || 'unknown';
}

function estimateTokens(request: AnalysisRequest): number {
  const queryLength = request.query?.length || 0;
  const schemaLength = request.schema?.length || 0;
  const explainLength = request.explain?.length || 0;

  return Math.ceil((queryLength + schemaLength + explainLength) / 4);
}

function fakeAnalysis(request: AnalysisRequest): AnalysisResult {
  const { query } = request;
  const queryLower = query.toLowerCase();

  const issues: string[] = [];
  let score = 85;
  let severity: "low" | "medium" | "high" | "critical" = "low";

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

  if (score < 40) {
    severity = "critical";
  } else if (score < 60) {
    severity = "high";
  } else if (score < 75) {
    severity = "medium";
  }

  const tableName =
    query.match(/from\s+(\w+)/i)?.[1] || "your_table";
  const whereColumn =
    query.match(/where\s+(\w+)/i)?.[1] || "status";

  const suggestedIndex = issues.some((i) =>
    i.includes("Missing index")
  )
    ? `CREATE INDEX idx_${tableName}_${whereColumn}\nON ${tableName}(${whereColumn});`
    : "";

  let rewrittenQuery = query.trim();

  if (queryLower.includes("select *")) {
    rewrittenQuery = rewrittenQuery.replace(
      /SELECT\s+\*/gi,
      "SELECT id, status, created_at"
    );
  }

  if (
    queryLower.includes("order by") &&
    !queryLower.includes("limit")
  ) {
    if (!rewrittenQuery.endsWith(";")) {
      rewrittenQuery += "\nLIMIT 100;";
    } else {
      rewrittenQuery = rewrittenQuery.replace(
        /;$/,
        "\nLIMIT 100;"
      );
    }
  }

  const speedupEstimate =
    issues.length > 0
      ? Math.min(0.9, 0.2 + issues.length * 0.15)
      : 0.1;

  return {
    score: Math.max(0, Math.min(100, score)),
    severity,
    issues:
      issues.length > 0
        ? issues
        : ["No major issues found"],
    suggestedIndex,
    rewrittenQuery,
    speedupEstimate,
  };
}

async function callAnalyzer(
  query: string,
  openaiApiKey: string,
  correctionInstructions?: string
): Promise<{ analysis: string; issues: string[]; rewrittenQuery: string; suggestedIndexes: string } | null> {
const analyzerPrompt = `
  ### DBPowerAI — SQL Performance Analyzer (System Prompt)
  You are DBPowerAI, a senior-level SQL performance engineer specialized in:
  - PostgreSQL internals  
  - Execution plans  
  - Query optimization  
  - Join cardinality  
  - Sargability  
  - Index design  
  - Semantic-preserving query rewriting  
  
  Your mission:
  1. Analyze the SQL query
  2. Identify performance issues
  3. Suggest accurate indexes
  4. Rewrite the query for performance **without changing semantics**
  5. Interpret the execution plan
  6. Produce a final semantic self-check
  
  ============================================================
  ### 🚨 STRICT RULES FOR SEMANTIC IDENTITY (MANDATORY)
  
  You MUST preserve exactly:
  
  1. All WHERE filters  
  2. All JOIN predicates  
  3. All correlated subqueries  
  4. All scoping behavior (per-user, per-campaign, per-group logic)  
  5. All ORDER BY … LIMIT 1 semantics  
  6. All GROUP BY cardinality  
  7. All DISTINCT logic  
  8. All non-sargable conditions (unless rewritten safely)  
  9. All domain boundaries  
  
  If ANY of these change → the rewrite is INVALID.
  
  ============================================================
  ### 🚫 PROHIBITED TRANSFORMATIONS
  
  1. ❌ Replacing ORDER BY … LIMIT 1 with MAX() or MIN()
  2. ❌ Moving COUNT DISTINCT after a high-cardinality JOIN
  3. ❌ Removing or weakening WHERE conditions
  4. ❌ Dropping correlation conditions
  5. ❌ Widening IN() subqueries 
  6. ❌ Introducing window functions unless identical in semantics
  7. ❌ Altering GROUP BY keys
  8. ❌ Removing nested filters in correlated subqueries  
  9. ❌ Changing date/time filtering precision
  10. ❌ Producing extra rows or fewer rows
  
  ============================================================
  ### ✔️ ALLOWED SAFE TRANSFORMATIONS
  
  - Rewriting correlated subqueries using ROW_NUMBER() when identical
  - Pre-aggregating child tables via CTE when semantics remain identical
  - Replacing non-sargable patterns ONLY if safe
  - Using EXISTS instead of IN when identical
  
  ============================================================
  ### 🧪 SEMANTIC SELF-CHECK (MANDATORY)
  
  After producing the rewritten query, answer:
  
  1. Did I preserve all WHERE conditions?
  2. Did I preserve all JOIN conditions?
  3. Did I preserve all correlated subqueries?
  4. Did I preserve GROUP BY keys?
  5. Did I avoid introducing new rows or dropping rows?
  6. Are DISTINCT semantics unchanged?
  7. Are domain filters identical?
  8. Would both queries produce EXACTLY the same results on any dataset?
  
  If any answer is NO → FIX the rewritten query before outputting.
  
  Output final line:
  SEMANTIC CHECK: PASSED
  
  ============================================================
  
  ### INPUT QUERY:
  ${query}
  
  ### OPTIONAL SCHEMA:
  ${correctionInstructions ? `\n### CORRECTION REQUIRED:\n${correctionInstructions}\n` : ''}
  
  Respond in JSON ONLY with this structure:
  
  {
    "analysis": "...",
    "issues": ["..."],
    "rewrittenQuery": "...",
    "suggestedIndexes": "..."
  }
  `;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: analyzerPrompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", await response.text());
      return null;
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return result;
  } catch (error) {
    console.error("Analyzer error:", error);
    return null;
  }
}

async function callValidator(
  originalQuery: string,
  rewrittenQuery: string,
  openaiApiKey: string
): Promise<{ valid: boolean; explanation: string }> {
  const validatorPrompt = `${VALIDATOR_PROMPT}

### Original Query:
${originalQuery}

### Rewritten Query:
${rewrittenQuery}

Now validate if the rewritten query is 100% semantically identical to the original.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: validatorPrompt }],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error("Validator API error:", await response.text());
      return { valid: false, explanation: "Validator API failed" };
    }

    const data = await response.json();
    const validatorResponse = data.choices[0].message.content;

    const isValid = validatorResponse.includes("VALID: YES");
    const explanation = validatorResponse.split("Explanation:")[1]?.trim() || validatorResponse;

    return { valid: isValid, explanation };
  } catch (error) {
    console.error("Validator error:", error);
    return { valid: false, explanation: "Validator failed" };
  }
}

async function analyzeWithValidation(
  query: string,
  openaiApiKey: string,
  supabase: any
): Promise<AnalysisResult> {
  console.log("[Analyze] Calling analyzer (attempt 1)...");
  let analyzerResult = await callAnalyzer(query, openaiApiKey);

  if (!analyzerResult) {
    console.log("[Analyze] Analyzer failed, falling back to fake analysis");
    return { ...fakeAnalysis({ query }), validator_status: "invalid", semantic_warning: "Analyzer failed" };
  }

  console.log("[Analyze] Validating rewritten query...");
  const validatorResult = await callValidator(query, analyzerResult.rewrittenQuery, openaiApiKey);

  if (validatorResult.valid) {
    console.log("[Analyze] Validation passed on first attempt");
    return {
      score: 85,
      severity: "medium",
      issues: analyzerResult.issues,
      suggestedIndex: analyzerResult.suggestedIndexes,
      rewrittenQuery: analyzerResult.rewrittenQuery,
      speedupEstimate: 0.5,
      validator_status: "valid",
      semantic_warning: null,
    };
  }

  console.log("[Analyze] Validation failed, retrying with corrections...");
  const correctionInstructions = `The validator rejected your previous rewrite with this feedback:
${validatorResult.explanation}

You MUST correct the rewritten SQL according to the validator feedback.
You MUST preserve all WHERE conditions, correlated subqueries, GROUP BY semantics, DISTINCT positions, and domain restrictions.
Fix ONLY the rewrite, not the analysis.
Produce a corrected rewritten query that passes validation.`;

  analyzerResult = await callAnalyzer(query, openaiApiKey, correctionInstructions);

  if (!analyzerResult) {
    console.log("[Analyze] Retry failed, returning without rewrite");
    return {
      score: 70,
      severity: "medium",
      issues: ["Analysis failed after retry"],
      suggestedIndex: "",
      rewrittenQuery: null,
      speedupEstimate: 0,
      validator_status: "invalid",
      semantic_warning: "Rewrite could not be validated",
    };
  }

  console.log("[Analyze] Validating corrected query...");
  const secondValidation = await callValidator(query, analyzerResult.rewrittenQuery, openaiApiKey);

  if (secondValidation.valid) {
    console.log("[Analyze] Validation passed on second attempt");
    return {
      score: 85,
      severity: "medium",
      issues: analyzerResult.issues,
      suggestedIndex: analyzerResult.suggestedIndexes,
      rewrittenQuery: analyzerResult.rewrittenQuery,
      speedupEstimate: 0.5,
      validator_status: "valid",
      semantic_warning: null,
    };
  }

  console.log("[Analyze] Validation failed on both attempts, logging failure");

  await supabase.from("llm_validation_failures").insert({
    original_query: query,
    attempted_rewrite: analyzerResult.rewrittenQuery,
    validator_explanation: secondValidation.explanation,
  });

  return {
    score: 70,
    severity: "medium",
    issues: analyzerResult.issues,
    suggestedIndex: analyzerResult.suggestedIndexes,
    rewrittenQuery: null,
    speedupEstimate: 0,
    validator_status: "invalid",
    semantic_warning: secondValidation.explanation,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    let isAuthenticated = false;
    let userId: string | null = null;

    if (authHeader) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        isAuthenticated = true;
        userId = user.id;
      }
    }

    const body = await req.json();

    if (!body.query || typeof body.query !== "string") {
      return new Response(
        JSON.stringify({
          error: "Invalid request: query is required",
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
      query: body.query,
      schema: body.schema,
      explain: body.explain,
    };

    const estimatedTokens = estimateTokens(analysisRequest);
    const tokenCost = estimatedTokens;

    if (isAuthenticated && userId) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      let { data: userPlan, error: planError } = await supabaseAdmin
        .from("user_plans")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (planError && planError.code !== 'PGRST116') {
        console.error("Error fetching user plan:", planError);
        return new Response(
          JSON.stringify({
            error: "server_error",
            message: "Unable to verify plan limits.",
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

      if (!userPlan) {
        const cutoffDate = new Date('2025-12-31T23:59:59Z');
        const isEarlyAdopterPeriod = new Date() <= cutoffDate;

        if (isEarlyAdopterPeriod) {
          await supabaseAdmin.from("user_plans").insert({
            user_id: userId,
            plan: 'early_adopter',
            analysis_limit: 500,
            token_limit: 500000,
            early_expires_at: cutoffDate.toISOString(),
          });
        } else {
          await supabaseAdmin.from("user_plans").insert({
            user_id: userId,
            plan: 'free',
            analysis_limit: 20,
            token_limit: 40000,
          });
        }

        const { data: newPlan } = await supabaseAdmin
          .from("user_plans")
          .select("*")
          .eq("user_id", userId)
          .single();

        userPlan = newPlan;
      }

      if (userPlan.analysis_used >= userPlan.analysis_limit) {
        return new Response(
          JSON.stringify({
            error: "PLAN_LIMIT_REACHED",
            limit_type: "analyses",
            plan: userPlan.plan,
            used: userPlan.analysis_used,
            limit: userPlan.analysis_limit,
            message: `You've reached your monthly limit of ${userPlan.analysis_limit} analyses on the ${userPlan.plan} plan.`,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (userPlan.token_used + estimatedTokens > userPlan.token_limit) {
        return new Response(
          JSON.stringify({
            error: "PLAN_LIMIT_REACHED",
            limit_type: "tokens",
            plan: userPlan.plan,
            used: userPlan.token_used,
            limit: userPlan.token_limit,
            message: `You've reached your monthly token limit on the ${userPlan.plan} plan.`,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
      let result: AnalysisResult;

      if (openaiApiKey) {
        console.log("[Analyze] Using LLM analysis with validation for authenticated user");
        result = await analyzeWithValidation(analysisRequest.query, openaiApiKey, supabaseAdmin);
      } else {
        console.log("[Analyze] OpenAI API key not configured, using fake analysis");
        result = fakeAnalysis(analysisRequest);
      }

      console.log("Plan before update:", userPlan);
      console.log("Token cost:", tokenCost);

      await supabaseAdmin
        .from("user_plans")
        .update({
          analysis_used: userPlan.analysis_used + 1,
          token_used: userPlan.token_used + tokenCost,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      console.log("Counters updated");

      await supabaseAdmin
        .from("query_history")
        .insert({
          user_id: userId,
          input_query: analysisRequest.query,
          analysis_result: result,
        });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (!isAuthenticated) {
      const freeToken = req.headers.get("X-Free-Analysis-Token");
      const clientIP = getClientIP(req);

      if (!freeToken) {
        return new Response(
          JSON.stringify({
            error: "no_free_token",
            message: "Create a free account to continue analyzing queries.",
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      const { data: existingTokenByIP } = await supabaseAdmin
        .from("free_tokens")
        .select("token")
        .eq("ip_address", clientIP)
        .maybeSingle();

      if (existingTokenByIP) {
        return new Response(
          JSON.stringify({
            error: "free_limit_reached",
            message: "Your free analysis has been used. Please sign up for unlimited access.",
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const { data: existingToken } = await supabaseAdmin
        .from("free_tokens")
        .select("token")
        .eq("token", freeToken)
        .maybeSingle();

      if (existingToken) {
        return new Response(
          JSON.stringify({
            error: "free_limit_reached",
            message: "Your free analysis has been used. Please sign up for unlimited access.",
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const { error: insertError } = await supabaseAdmin
        .from("free_tokens")
        .insert({
          token: freeToken,
          ip_address: clientIP
        });

      if (insertError) {
        console.error("Error inserting free token:", insertError);
        return new Response(
          JSON.stringify({
            error: "server_error",
            message: "Unable to process request. Please try again.",
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
    }

    const result = fakeAnalysis(analysisRequest);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in analyze function:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
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