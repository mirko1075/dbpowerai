import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

console.info('delete-account function starting');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const ADMIN_KEY = Deno.env.get('DBPOWER_ADMIN_KEY') || '';

const CORS_HEADERS = (origin = '*') => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
});

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '*';
  try {
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

    const { user_id, immediate } = payload || {};
    if (!user_id) return new Response(JSON.stringify({ error: 'Missing user_id' }), { status: 400, headers: CORS_HEADERS(origin) });

    // Validate caller via Authorization header
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS(origin) });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create a supabase client using anon key but forwarding the Authorization header to validate the user
    const supabase = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      console.error('Unauthorized user', userErr);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS(origin) });
    }

    const isAdminRequest = token === ADMIN_KEY;
    // Only allow if caller is the same user or admin key provided
    if (!isAdminRequest && user.id !== user_id) {
      return new Response(JSON.stringify({ error: 'Forbidden: can only delete your own account' }), { status: 403, headers: CORS_HEADERS(origin) });
    }

    // Call the request_user_deletion RPC using the service role key for enqueueing
    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // If immediate flag is set and caller is admin, call perform_hard_delete directly (caution)
    if (immediate && isAdminRequest) {
      const { data, error } = await serviceClient.rpc('perform_hard_delete', { p_user_id: user_id, p_performed_by: user.id });
      if (error) {
        console.error('perform_hard_delete error', error);
        return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: CORS_HEADERS(origin) });
      }
      return new Response(JSON.stringify({ ok: true, detail: 'hard_deleted', data }), { status: 200, headers: CORS_HEADERS(origin) });
    }

    const { data: rpcData, error: rpcError } = await serviceClient.rpc('request_user_deletion', { p_user_id: user_id, p_requested_by: user.id });
    if (rpcError) {
      console.error('request_user_deletion rpc error', rpcError);
      return new Response(JSON.stringify({ ok: false, error: rpcError.message }), { status: 500, headers: CORS_HEADERS(origin) });
    }

    return new Response(JSON.stringify({ ok: true, detail: 'scheduled', data: rpcData }), { status: 200, headers: CORS_HEADERS(origin) });

  } catch (err) {
    console.error('Unhandled error in delete-account function', err);
    return new Response(JSON.stringify({ error: 'Internal server error', detail: String(err) }), { status: 500, headers: CORS_HEADERS((new URL(req.url)).origin || '*') });
  }
});