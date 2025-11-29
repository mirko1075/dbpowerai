import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { analyzeWithValidation, fakeAnalysis, type AnalysisRequest, type AnalysisResult } from '../_shared/analyzer.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Free-Analysis-Token",
};

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

      // Save to queries table with origin='form'
      await supabaseAdmin
        .from("queries")
        .insert({
          user_id: userId,
          raw_query: analysisRequest.query,
          optimized_query: result.rewrittenQuery,
          suggested_indexes: result.suggestedIndex,
          bottleneck: result.issues.join(", "),
          db_type: "unknown",
          schema: analysisRequest.schema,
          execution_plan: analysisRequest.explain,
          analysis: JSON.stringify(result),
          origin: "form", // CRITICAL: Set origin to form
          notes: result.semantic_warning || null,
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
