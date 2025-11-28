// name: delete-profile
import { createClient } from "npm:@supabase/supabase-js@2.29.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return new Response(JSON.stringify({ error: "Missing token" }), { status: 401 });

  // Validate JWT and get user
  const { data: getUserData, error: getUserErr } = await supabaseAdmin.auth.getUser(token);
  if (getUserErr || !getUserData?.user) {
    console.error("auth.getUser error:", getUserErr);
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
  }
  const user = getUserData.user;

  // Fetch subscription row if present
  const { data: sub, error: subErr } = await supabaseAdmin
    .from("subscriptions")
    .select("id, stripe_subscription_id, status")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (subErr && subErr.details && !subErr.message.includes("No rows")) {
    console.error("Error fetching subscription:", subErr);
    return new Response(JSON.stringify({ error: "Failed to fetch subscription" }), { status: 500 });
  }

  // If Stripe subscription exists and STRIPE_SECRET_KEY provided, cancel it
  if (sub && sub.stripe_subscription_id && STRIPE_SECRET_KEY) {
    try {
      const body = new URLSearchParams();
      body.set("cancel_at_period_end", "false");

      const stripeRes = await fetch(`https://api.stripe.com/v1/subscriptions/${sub.stripe_subscription_id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      });

      if (!stripeRes.ok) {
        const errText = await stripeRes.text();
        console.error("Stripe cancel error:", errText);
        return new Response(JSON.stringify({ error: "Failed to cancel Stripe subscription" }), { status: 502 });
      }

      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "canceled", canceled_at: new Date().toISOString() })
        .eq("id", sub.id);
    } catch (e) {
      console.error("Stripe API thrown error:", e);
      return new Response(JSON.stringify({ error: "Stripe API error" }), { status: 502 });
    }
  }

  // Call DB RPC to soft-delete/anonymize
  const reasonPayload = await req.json().catch(() => ({ reason: "user_requested" }));
  const reason = reasonPayload.reason || "user_requested";

  const { error: rpcErr } = await supabaseAdmin.rpc("soft_delete_user", { p_user_id: user.id, p_reason: reason });
  if (rpcErr) {
    console.error("RPC soft_delete_user error:", rpcErr);
    return new Response(JSON.stringify({ error: "Failed to soft-delete user" }), { status: 500 });
  }

  try {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
  } catch (e) {
    console.warn("admin.deleteUser may have failed or is not applicable:", e);
  }

  return new Response(JSON.stringify({ status: "ok" }), { status: 200, headers: { "Content-Type": "application/json" } });
});