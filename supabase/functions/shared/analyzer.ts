// Shared SQL Analysis Logic
// Used by both /analyze (form) and /webhook (API) endpoints

export interface AnalysisRequest {
  query: string;
  schema?: string;
  explain?: string;
}

export interface AnalysisResult {
  score: number;
  severity: "low" | "medium" | "high" | "critical";
  issues: string[];
  suggestedIndex: string;
  rewrittenQuery: string | null;
  speedupEstimate: number;
  validator_status?: "valid" | "invalid";
  semantic_warning?: string | null;
}

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

export function fakeAnalysis(request: AnalysisRequest): AnalysisResult {
  const { query } = request;
  const queryLower = query.toLowerCase();

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
  const tableName =
    query.match(/from\s+(\w+)/i)?.[1] || "your_table";
  const whereColumn =
    query.match(/where\s+(\w+)/i)?.[1] || "status";

  const suggestedIndex = issues.some((i) =>
    i.includes("Missing index")
  )
    ? `CREATE INDEX idx_${tableName}_${whereColumn}\nON ${tableName}(${whereColumn});`
    : "";

  // Rewrite query
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

export async function analyzeWithValidation(
  query: string,
  openaiApiKey: string | undefined,
  supabase: any
): Promise<AnalysisResult> {
  // If no OpenAI key, use fake analysis
  if (!openaiApiKey) {
    console.log("[Analyzer] No OpenAI key, using fake analysis");
    return fakeAnalysis({ query });
  }

  console.log("[Analyzer] Calling OpenAI analyzer (attempt 1)...");
  let analyzerResult = await callAnalyzer(query, openaiApiKey);

  if (!analyzerResult) {
    console.log("[Analyzer] Analyzer failed, falling back to fake analysis");
    return { ...fakeAnalysis({ query }), validator_status: "invalid", semantic_warning: "Analyzer failed" };
  }

  console.log("[Analyzer] Validating rewritten query...");
  const validatorResult = await callValidator(query, analyzerResult.rewrittenQuery, openaiApiKey);

  if (validatorResult.valid) {
    console.log("[Analyzer] Validation passed on first attempt");
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

  console.log("[Analyzer] Validation failed, retrying with corrections...");
  const correctionInstructions = `The validator rejected your previous rewrite with this feedback:
${validatorResult.explanation}

You MUST correct the rewritten SQL according to the validator feedback.
You MUST preserve all WHERE conditions, correlated subqueries, GROUP BY semantics, DISTINCT positions, and domain restrictions.
Fix ONLY the rewrite, not the analysis.
Produce a corrected rewritten query that passes validation.`;

  analyzerResult = await callAnalyzer(query, openaiApiKey, correctionInstructions);

  if (!analyzerResult) {
    console.log("[Analyzer] Retry failed, returning without rewrite");
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

  console.log("[Analyzer] Validating corrected query...");
  const secondValidation = await callValidator(query, analyzerResult.rewrittenQuery, openaiApiKey);

  if (secondValidation.valid) {
    console.log("[Analyzer] Validation passed on second attempt");
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

  console.log("[Analyzer] Validation failed on both attempts, logging failure");

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
