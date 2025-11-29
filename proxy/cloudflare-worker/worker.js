addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

/**
 * Simple proxy for Supabase Function webhook.
 * Expects callers to set X-API-Key (per-user key). The proxy will forward to the
 * Supabase Function URL adding Authorization: Bearer <PROJECT_ANON_KEY> from the
 * worker's secret binding SUPABASE_ANON_KEY.
 */
async function handle(req) {
  // Only POST allowed
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonCors() })
  }

  const userApiKey = req.headers.get('x-api-key')
  if (!userApiKey) {
    return new Response(JSON.stringify({ error: 'Missing X-API-Key' }), { status: 401, headers: jsonCors() })
  }

  // Read body as text and forward
  const bodyText = await req.text()

  // Build forwarding headers
  const forwardHeaders = new Headers()
  forwardHeaders.set('Content-Type', req.headers.get('content-type') || 'application/json')
  // Project anon key stored in worker secret binding SUPABASE_ANON_KEY
  const supabaseAnon = SUPABASE_ANON_KEY
  if (!supabaseAnon) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: jsonCors() })
  }
  forwardHeaders.set('Authorization', `Bearer ${supabaseAnon}`)
  // Pass the per-user key through so the function can authenticate the user
  forwardHeaders.set('X-API-Key', userApiKey)

  // Optionally forward other headers like a client-id
  try {
    const target = `${SUPABASE_FUNCTION_URL.replace(/\/$/, '')}/webhook`
    const resp = await fetch(target, { method: 'POST', headers: forwardHeaders, body: bodyText })
    const text = await resp.text()
    const headers = jsonCors()
    // Copy some response headers
    headers['Content-Type'] = resp.headers.get('content-type') || 'application/json'
    return new Response(text, { status: resp.status, headers })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error', details: String(err) }), { status: 502, headers: jsonCors() })
  }
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key'
  }
}

function jsonCors() {
  return Object.assign({ 'Content-Type': 'application/json' }, cors())
}
