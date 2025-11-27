import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  try {
    const payload = await req.json();

    const user = payload?.record ?? payload;

    const { email, id, created_at } = user;

    // Chiama Make.com
    await fetch(Deno.env.get("MAKE_WEBHOOK_URL"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "user_created",
        email,
        user_id: id,
        created_at
      })
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500
    });
  }
});
