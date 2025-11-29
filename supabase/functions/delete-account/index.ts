import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

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
      console.error("[delete-account] Invalid method:", req.method);
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

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("[delete-account] Missing environment variables");
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

    // Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[delete-account] Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Verify user authentication
    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("[delete-account] Auth verification failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`[delete-account] Authenticated user: ${user.id}`);

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("[delete-account] JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { user_id } = requestBody;

    if (!user_id) {
      console.error("[delete-account] Missing user_id in request body");
      return new Response(
        JSON.stringify({ error: "Missing user_id in request body" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // CRITICAL: Verify user can only delete their own account
    if (user_id !== user.id) {
      console.error(
        `[delete-account] User ID mismatch. Requested: ${user_id}, Authenticated: ${user.id}`
      );
      return new Response(
        JSON.stringify({ error: "Forbidden: Can only delete your own account" }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`[delete-account] Starting deletion process for user: ${user_id}`);

    // Create admin client with SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Step 1: Soft delete user data via RPC (bypasses RLS)
    console.log("[delete-account] Step 1: Calling delete_user_account RPC...");

    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      "delete_user_account",
      { user_id }
    );

    if (rpcError) {
      console.error("[delete-account] RPC call failed:", rpcError);
      return new Response(
        JSON.stringify({
          error: "Failed to call soft delete function",
          details: rpcError.message,
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

    if (!rpcResult || !rpcResult.success) {
      console.error("[delete-account] Soft delete failed:", rpcResult);
      return new Response(
        JSON.stringify({
          error: "Failed to soft delete user data",
          details: rpcResult?.error || "Unknown error from database function",
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

    console.log("[delete-account] User data soft deleted successfully");

    // Step 2: Hard delete from auth.users
    console.log("[delete-account] Step 2: Deleting from auth.users...");

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authDeleteError) {
      console.error("[delete-account] Auth user deletion failed:", authDeleteError);
      return new Response(
        JSON.stringify({
          error: "Failed to delete authentication account",
          details: authDeleteError.message,
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

    console.log("[delete-account] Auth user deleted successfully");
    console.log(`[delete-account] Account deletion completed for user: ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account deleted successfully",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("[delete-account] Unexpected error:", err);
    console.error("[delete-account] Error details:", {
      message: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown error",
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
