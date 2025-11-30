import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { parseSql } from "../optimize/parseSql.ts";
import { detectPatterns } from "../optimize/detectPatterns.ts";
import { buildPrompt } from "../optimize/buildPrompt.ts";

interface OptimizeQueryParams {
  query: string;
  db: string;
  schema?: string;
  executionPlan?: string;
  openaiApiKey: string;
}

interface OptimizeQueryResult {
  analysis: string;
  warnings: string[];
  rewrittenQuery: string;
  recommendedIndexes: string;
  notes: string;
  detectedPatterns: Array<{
    type: string;
    severity: string;
    message: string;
    suggestion?: string;
  }>;
  warningsJson: string;
  patternsJson: string;
  bottleneck: string;
}

export async function optimizeQuery(
  params: OptimizeQueryParams
): Promise<OptimizeQueryResult> {
  const { query, db, schema, executionPlan, openaiApiKey } = params;

  console.log(`[optimizeQuery] Analyzing query for database: ${db}`);

  // Parse SQL structure
  const structure = parseSql(query);
  console.log("[optimizeQuery] Structure:", JSON.stringify(structure, null, 2));

  // Detect patterns
  const patterns = detectPatterns(structure);
  console.log("[optimizeQuery] Patterns detected:", patterns.length);

  // Build prompt for OpenAI
  const advisorPrompt = buildPrompt({
    query,
    db,
    structure,
    patterns,
    schema,
    executionPlan,
  });
  console.log("[optimizeQuery] Prompt built, calling OpenAI...");

  // Call OpenAI
  const openaiResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: advisorPrompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    }
  );

  if (!openaiResponse.ok) {
    const errorText = await openaiResponse.text();
    console.error("[optimizeQuery] OpenAI API error:", errorText);
    throw new Error("Failed to analyze query with OpenAI");
  }

  const openaiData = await openaiResponse.json();
  const resultText = openaiData.choices[0].message.content;
  console.log("[optimizeQuery] OpenAI response received");

  let result: {
    analysis: string;
    warnings: string[];
    rewrittenQuery: string;
    recommendedIndexes: string;
    notes: string;
  };

  try {
    result = JSON.parse(resultText);
  } catch (parseError) {
    console.error("[optimizeQuery] Failed to parse OpenAI response:", parseError);
    throw new Error("Invalid AI response format");
  }

  const warningsJson = JSON.stringify(result.warnings || []);
  const patternsJson = JSON.stringify(patterns || []);
  const bottleneck =
    patterns.map((p) => p.message).join("; ") || "No major issues detected";

  return {
    ...result,
    detectedPatterns: patterns,
    warningsJson,
    patternsJson,
    bottleneck,
  };
}
