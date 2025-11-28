import { serve } from 'https://deno.land/std@0.170.0/http/server.ts';
// Using fetch and Web APIs only; Supabase secrets available via env
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

console.info('delete-account function starting');

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch (err) {
      console.error('Invalid JSON payload', err);
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { user_id } = payload || {};
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Basic defensive DB operation: attempt to call a stored procedure delete_user_account(user_id) else fallback to soft delete
    const rpcResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_user_account`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ user_id })
    });

    if (rpcResp.ok) {
      const data = await rpcResp.json().catch(() => null);
      return new Response(JSON.stringify({ ok: true, detail: 'deleted via rpc', data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // If RPC not found or failed, perform a safe soft-delete
    console.warn('RPC delete_user_account failed or not found, falling back to soft delete. Status:', rpcResp.status);

    const softDeleteSql = `UPDATE users SET deleted_at = now() WHERE id = '${user_id}';`;
    const sqlResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ sql: softDeleteSql })
    }).catch(() => null);

    // Note: Supabase REST doesn't expose a raw SQL RPC endpoint by default; if this fails, we attempt using the query endpoint
    if (sqlResp && sqlResp.ok) {
      const resData = await sqlResp.json().catch(() => null);
      return new Response(JSON.stringify({ ok: true, detail: 'soft-deleted via sql rpc', data: resData }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Final attempt: use the Admin Postgres URL if available
    const DB_URL = Deno.env.get('SUPABASE_DB_URL') || '';
    if (DB_URL) {
      // As we cannot open direct DB connections here without a client, return a helpful error suggesting to run SQL
      console.error('DB_URL present but direct DB execution not implemented in function');
      return new Response(JSON.stringify({ error: 'Could not delete via RPC or REST; please run fallback SQL using SUPABASE_DB_URL or ensure delete_user_account RPC exists' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Delete failed: RPC and REST fallbacks failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Unhandled error in delete-account function', err);
    return new Response(JSON.stringify({ error: 'Internal server error', detail: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});