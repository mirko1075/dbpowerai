import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TrackEventRequest {
  type: string;
  session_id: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let userId: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: { Authorization: authHeader },
        },
      });

      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (user && !authError) {
        userId = user.id;
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, session_id, metadata = {} }: TrackEventRequest = await req.json();

    if (!type || typeof type !== "string" || !type.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid 'type' field" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!session_id || typeof session_id !== "string" || !session_id.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing session_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: insertError } = await supabase
      .from("events")
      .insert({
        type: type.trim(),
        session_id: session_id.trim(),
        user_id: userId,
        metadata: metadata || {},
      });

    if (insertError) {
      console.error("Failed to insert event:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to track event" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Event Tracked] type=${type}, session_id=${session_id}, user_id=${userId || "anonymous"}`);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in track-event:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
