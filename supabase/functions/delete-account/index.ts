import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
    // Step 1: Validate HTTP method
    if (req.method !== 'POST') {
      console.error('[delete-account] Invalid method:', req.method);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Step 2: Validate Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[delete-account] Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Step 3: Verify environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('[delete-account] Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Step 4: Verify user authentication using user token
    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('[delete-account] Auth verification failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('[delete-account] Authenticated user:', user.id);

    // Step 5: Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('[delete-account] JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { user_id } = requestBody;

    if (!user_id) {
      console.error('[delete-account] Missing user_id in request body');
      return new Response(
        JSON.stringify({ error: 'Missing user_id in request body' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Step 6: Verify user can only delete their own account
    if (user_id !== user.id) {
      console.error('[delete-account] User ID mismatch. Requested:', user_id, 'Authenticated:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Can only delete your own account' }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Step 7: Create admin client with SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('[delete-account] Starting deletion process for user:', user_id);

    // Step 8: FIRST - Soft delete the profile using PostgreSQL function (bypasses RLS)
    console.log('[delete-account] Step 1: Soft deleting user profile via PostgreSQL function...');
    const { data: softDeleteResult, error: profileError } = await supabaseAdmin
      .rpc('soft_delete_user_profile', { target_user_id: user_id });

    if (profileError) {
      console.error('[delete-account] Profile soft delete RPC failed:', profileError);
      return new Response(
        JSON.stringify({
          error: 'Failed to call soft delete function',
          details: profileError.message
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Check if the PostgreSQL function returned success
    if (!softDeleteResult || !softDeleteResult.success) {
      console.error('[delete-account] Soft delete function returned failure:', softDeleteResult);
      return new Response(
        JSON.stringify({
          error: 'Failed to soft delete profile',
          details: softDeleteResult?.error || 'Unknown error from database function'
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('[delete-account] Profile soft deleted successfully via PostgreSQL function');

    // Step 9: SECOND - Hard delete the auth user using admin API
    console.log('[delete-account] Step 2: Deleting auth user...');
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authDeleteError) {
      console.error('[delete-account] Auth user deletion failed:', authDeleteError);

      // Attempt to rollback profile soft delete
      console.log('[delete-account] Attempting rollback of profile soft delete...');
      await supabaseAdmin
        .from('user_profiles')
        .update({
          is_deleted: false,
          deleted_at: null,
        })
        .eq('id', user_id);

      return new Response(
        JSON.stringify({
          error: 'Failed to delete user account',
          details: authDeleteError.message
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('[delete-account] Auth user deleted successfully');
    console.log('[delete-account] Account deletion completed for user:', user_id);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('[delete-account] Unexpected error:', err);
    console.error('[delete-account] Error details:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
    });

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});