import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { analyzeWithValidation, fakeAnalysis, type AnalysisRequest, type AnalysisResult } from '../shared/analyzer.ts';

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

    // For authenticated users, call the optimize endpoint which has better analysis
    if (isAuthenticated && userId) {
      console.log("[Analyze] Authenticated user, calling optimize endpoint");

      // Call the optimize function internally
      const optimizeUrl = `${supabaseUrl}/functions/v1/optimize`;
      const optimizeResponse = await fetch(optimizeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader!,
        },
        body: JSON.stringify({
          query: body.query,
          db: body.db || 'PostgreSQL', // Default to PostgreSQL if not specified
          schema: body.schema,
          executionPlan: body.explain,
        }),
      });

      const optimizeData = await optimizeResponse.json();

      // Return the optimize response (which includes success, data with all fields)
      return new Response(JSON.stringify(optimizeData), {
        status: optimizeResponse.status,
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

    // Format the response to match the optimize endpoint format
    // Extract patterns from issues for severity calculation
    const patterns = (result.issues || []).map(issue => ({
      type: 'performance',
      severity: 'medium' as const,
      message: issue
    }));

    const severity = patterns.length > 0 ? 'medium' : 'low';
    const score = patterns.length === 0 ? 95 : 70;
    const speedupEstimate = patterns.length === 0 ? 0 : 0.3;
    const bottleneck = (result.issues || []).join('; ') || 'No major issues detected';

    return new Response(JSON.stringify({
      success: true,
      data: {
        analysis: `Free trial analysis completed. For detailed database-specific optimization, please sign up.`,
        warnings: result.issues || [],
        rewrittenQuery: result.rewrittenQuery || '',
        recommendedIndexes: result.suggestedIndex || '',
        notes: result.semantic_warning || 'This is a basic analysis. Sign up for advanced features.',
        detectedPatterns: patterns,
        bottleneck,
        severity,
        score,
        speedupEstimate,
      }
    }), {
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
