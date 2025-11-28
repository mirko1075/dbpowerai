console.info('delete-account function starting');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const CORS_HEADERS = (origin = '*') => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
});

Deno.serve(async (req: Request) => {
  try {
    const origin = req.headers.get('origin') || '*';

    if (req.method === 'OPTIONS') {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS_HEADERS(origin) });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS_HEADERS(origin) });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: CORS_HEADERS(origin) });
    }

    let payload: any;
    try { payload = await req.json(); } catch (err) {
      console.error('Invalid JSON payload', err);
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { status: 400, headers: CORS_HEADERS(origin) });
    }

    const { user_id } = payload || {};
    if (!user_id) return new Response(JSON.stringify({ error: 'Missing user_id' }), { status: 400, headers: CORS_HEADERS(origin) });

    const rpcResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_user_account`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ user_id })
    }).catch((e) => { console.warn('RPC fetch error', e); return null; });

    if (rpcResp && rpcResp.ok) {
      const data = await rpcResp.json().catch(() => null);
      return new Response(JSON.stringify({ ok: true, detail: 'deleted via rpc', data }), { status: 200, headers: CORS_HEADERS(origin) });
    }

    console.warn('RPC delete_user_account failed or not found, falling back to soft delete. Status:', rpcResp?.status);

    const DB_URL = Deno.env.get('SUPABASE_DB_URL') || '';
    if (DB_URL) {
      return new Response(JSON.stringify({ error: 'RPC not available; please run fallback SQL via SUPABASE_DB_URL or create delete_user_account rpc' }), { status: 500, headers: CORS_HEADERS(origin) });
    }

    return new Response(JSON.stringify({ error: 'Delete failed: RPC and fallbacks failed' }), { status: 500, headers: CORS_HEADERS(origin) });

  } catch (err) {
    console.error('Unhandled error in delete-account function', err);
    const origin = (new URL(req.url)).origin || '*';
    return new Response(JSON.stringify({ error: 'Internal server error', detail: String(err) }), { status: 500, headers: CORS_HEADERS(origin) });
  }
});