import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const VALIDATOR_PROMPT = `
You are DBPowerAI-Validator.

Your ONLY task is to check whether the rewritten SQL query is
100% semantically IDENTICAL to the original query.

You must follow this strict checklist:

### SEMANTIC CHECKLIST (ALL MUST BE TRUE)

1. All WHERE conditions are preserved exactly.
2. All JOIN conditions are preserved exactly.
3. All correlated subqueries remain correlated.
4. ORDER BY ... LIMIT 1 is NOT replaced by MAX()/MIN().
5. No filters are broadened (no missing campaign_id, user_id, etc.).
6. No COUNT DISTINCT is moved after a fan-out join.
7. No GROUP BY keys added, removed, or modified.
8. No aggregate logic is moved to a different grouping level.
9. Cardinality must remain identical.
10. No new rows can be produced or filtered out.
11. No domain widening (no DISTINCT global sets).
12. No logical condition changes, even minor.

### Your response MUST be:

VALID: YES
Explanation: (why it passes)

OR

VALID: NO
Explanation: (which rule fails and why)
`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TestCase {
  query: string;
  schema?: string;
  explain?: string;
  test_type?: string;
}

interface TestResult {
  id: number;
  status: string;
  query: string;
  test_type?: string;
  validator_status?: string;
  semantic_warning?: string | null;
  rewritten_query?: string | null;
}

async function callAnalyzer(
  query: string,
  openaiApiKey: string,
  correctionInstructions?: string
): Promise<{ analysis: string; issues: string[]; rewrittenQuery: string; suggestedIndexes: string } | null> {
  const analyzerPrompt = `You are a SQL performance analyzer. Analyze the following query and provide:
1. Analysis summary
2. List of issues found
3. Rewritten optimized query (semantically identical)
4. Suggested indexes

${correctionInstructions ? `\n### CORRECTION REQUIRED:\n${correctionInstructions}\n` : ''}

SQL Query:
${query}

Respond in JSON format:
{
  "analysis": "...",
  "issues": ["..."],
  "rewrittenQuery": "...",
  "suggestedIndexes": "..."
}`;

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
  openaiApiKey: string
): Promise<{
  rewrittenQuery: string | null;
  validator_status: "valid" | "invalid";
  semantic_warning: string | null;
  attempts: number;
  result: any;
}> {
  console.log("[Admin Test] Calling analyzer (attempt 1)...");
  let analyzerResult = await callAnalyzer(query, openaiApiKey);
  let attempts = 1;

  if (!analyzerResult) {
    console.log("[Admin Test] Analyzer failed");
    return {
      rewrittenQuery: null,
      validator_status: "invalid",
      semantic_warning: "Analyzer failed",
      attempts,
      result: { error: "Analyzer failed" }
    };
  }

  console.log("[Admin Test] Validating rewritten query...");
  const validatorResult = await callValidator(query, analyzerResult.rewrittenQuery, openaiApiKey);

  if (validatorResult.valid) {
    console.log("[Admin Test] Validation passed on first attempt");
    return {
      rewrittenQuery: analyzerResult.rewrittenQuery,
      validator_status: "valid",
      semantic_warning: null,
      attempts,
      result: {
        analysis: analyzerResult.analysis,
        issues: analyzerResult.issues,
        suggestedIndexes: analyzerResult.suggestedIndexes
      }
    };
  }

  console.log("[Admin Test] Validation failed, retrying with corrections...");
  const correctionInstructions = `The validator rejected your previous rewrite with this feedback:
${validatorResult.explanation}

You MUST correct the rewritten SQL according to the validator feedback.
You MUST preserve all WHERE conditions, correlated subqueries, GROUP BY semantics, DISTINCT positions, and domain restrictions.
Fix ONLY the rewrite, not the analysis.
Produce a corrected rewritten query that passes validation.`;

  analyzerResult = await callAnalyzer(query, openaiApiKey, correctionInstructions);
  attempts++;

  if (!analyzerResult) {
    console.log("[Admin Test] Retry failed");
    return {
      rewrittenQuery: null,
      validator_status: "invalid",
      semantic_warning: "Rewrite could not be validated",
      attempts,
      result: { error: "Retry failed" }
    };
  }

  console.log("[Admin Test] Validating corrected query...");
  const secondValidation = await callValidator(query, analyzerResult.rewrittenQuery, openaiApiKey);

  if (secondValidation.valid) {
    console.log("[Admin Test] Validation passed on second attempt");
    return {
      rewrittenQuery: analyzerResult.rewrittenQuery,
      validator_status: "valid",
      semantic_warning: null,
      attempts,
      result: {
        analysis: analyzerResult.analysis,
        issues: analyzerResult.issues,
        suggestedIndexes: analyzerResult.suggestedIndexes
      }
    };
  }

  console.log("[Admin Test] Validation failed on both attempts");
  return {
    rewrittenQuery: null,
    validator_status: "invalid",
    semantic_warning: secondValidation.explanation,
    attempts,
    result: {
      analysis: analyzerResult.analysis,
      issues: analyzerResult.issues,
      validator_explanation: secondValidation.explanation
    }
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
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

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Handle GET ?check=1 for admin role verification
    const url = new URL(req.url);
    if (req.method === "GET" && url.searchParams.get("check") === "1") {
      return new Response(
        JSON.stringify({ admin: true }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

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

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body = await req.json();
    const tests: TestCase[] = body.tests || [];

    if (!Array.isArray(tests) || tests.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request: tests array is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`[Admin Test] Running ${tests.length} tests...`);

    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      console.log(`[Admin Test] Processing test: ${test.query.substring(0, 50)}...`);

      const analysisResult = await analyzeWithValidation(test.query, openaiApiKey);

      const status = analysisResult.rewrittenQuery === null || analysisResult.validator_status === "invalid"
        ? "failed"
        : "passed";

      if (status === "passed") {
        passed++;
      } else {
        failed++;
      }

      const { data: insertedTest, error: insertError } = await supabase
        .from("ai_tests")
        .insert({
          created_by: user.id,
          query: test.query,
          schema: test.schema || null,
          explain: test.explain || null,
          test_type: test.test_type || null,
          status,
          attempts: analysisResult.attempts,
          original_query: test.query,
          rewritten_query: analysisResult.rewrittenQuery,
          validator_explanation: analysisResult.semantic_warning,
          result: analysisResult.result,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[Admin Test] Insert error:", insertError);
      }

      results.push({
        id: insertedTest?.id || 0,
        status,
        query: test.query,
        test_type: test.test_type,
        validator_status: analysisResult.validator_status,
        semantic_warning: analysisResult.semantic_warning,
        rewritten_query: analysisResult.rewrittenQuery,
      });
    }

    console.log(`[Admin Test] Completed: ${passed} passed, ${failed} failed`);

    return new Response(
      JSON.stringify({
        total: tests.length,
        passed,
        failed,
        tests: results,
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
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
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
