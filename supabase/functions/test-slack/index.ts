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
    // Verify method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[test-slack] Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      console.error("[test-slack] Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[test-slack] Testing Slack integration for user: ${user.id}`);

    // Get user profile with Slack webhook URL
    const { data: profile, error: profileError } = await supabaseClient
      .from("user_profiles")
      .select("slack_webhook_url")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[test-slack] Failed to get user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to get user profile" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const webhookUrl = profile.slack_webhook_url;

    // Validate webhook URL exists
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({
          error: "No Slack webhook URL configured. Please add one in settings.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate webhook URL is actually a Slack webhook
    if (!webhookUrl.startsWith("https://hooks.slack.com/")) {
      return new Response(
        JSON.stringify({
          error: "Invalid Slack webhook URL. Must start with https://hooks.slack.com/",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send test message to Slack
    const testMessage = {
      text: "🎉 Integration OK from DBPowerAI",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Slack Integration Test*\n\nYour DBPowerAI Slack notifications are configured correctly! :white_check_mark:",
          },
        },
      ],
    };

    console.log(`[test-slack] Sending test message to Slack webhook`);

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const slackResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testMessage),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!slackResponse.ok) {
        const errorText = await slackResponse.text();
        console.error("[test-slack] Slack API error:", slackResponse.status, errorText);
        return new Response(
          JSON.stringify({
            error: "Slack webhook returned an error",
            details: `HTTP ${slackResponse.status}: ${errorText}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`[test-slack] Successfully sent test message to Slack`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Test message sent successfully! Check your Slack channel.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return new Response(
          JSON.stringify({
            error: "Request timed out",
            details: "Slack webhook did not respond within 5 seconds",
          }),
          {
            status: 504,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw fetchError;
    }
  } catch (err) {
    console.error("[test-slack] Unexpected error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
