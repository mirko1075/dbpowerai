import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS_HEADERS });

  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    if (!serviceKey || !supabaseUrl) {
      return new Response(JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL' }), { status: 500, headers: CORS_HEADERS });
    }

    const service = createClient(supabaseUrl, serviceKey);

    // Fetch up to 20 pending jobs that are due
    const { data: rows, error } = await service
      .from('deletion_queue')
      .select('*')
      .lte('scheduled_for', 'now()')
      .eq('status', 'pending')
      .limit(20);

    if (error) {
      console.error('Failed to fetch deletion_queue', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS_HEADERS });
    }

    const results: Array<any> = [];

    for (const row of rows || []) {
      try {
        // mark in_progress
        await service.from('deletion_queue').update({ status: 'in_progress' }).eq('id', row.id);

        const { data, error: rpcErr } = await service.rpc('perform_hard_delete', { p_user_id: row.user_id, p_performed_by: row.requested_by });
        if (rpcErr) {
          console.error('perform_hard_delete error for', row.user_id, rpcErr);
          await service.from('deletion_queue').update({ status: 'failed', error: rpcErr.message }).eq('id', row.id);
          results.push({ user_id: row.user_id, ok: false, error: rpcErr.message });
          continue;
        }

        // success
        await service.from('deletion_queue').update({ status: 'completed', error: null }).eq('id', row.id);
        results.push({ user_id: row.user_id, ok: true, data });
      } catch (e) {
        console.error('Processing error', e);
        await service.from('deletion_queue').update({ status: 'failed', error: String(e) }).eq('id', row.id);
        results.push({ user_id: row.user_id, ok: false, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    console.error('Unhandled error in process-deletion-queue', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS_HEADERS });
  }
});
