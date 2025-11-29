Proxy options to call the Supabase webhook without exposing Bearer tokens

Why
----
Supabase's gateway (Kong) often requires a Bearer token or project key at the HTTP layer before requests reach the Edge Function. If you want third-party services (Make.com, Zapier, etc.) to call your webhook using only a per-user API key (X-API-Key), the safest approach is to run a small proxy that:

- accepts only X-API-Key from the caller
- validates/minimally inspects the payload if needed
- forwards the request to the Supabase Function, adding the Authorization header from a secret bound to the proxy

Cloudflare Worker (recommended)
-------------------------------
Files:
- `worker.js` — basic proxy implementation

Deployment steps (quick):

1. Install Wrangler: `npm i -g wrangler` (or use the Cloudflare dashboard)
2. Create a Worker project or use `wrangler init` and place `worker.js` content there
3. Configure secrets / bindings in `wrangler.toml`:

   - `SUPABASE_ANON_KEY` — the project anon key (store as a secret)
   - `SUPABASE_FUNCTION_URL` — e.g. `https://<project-ref>.supabase.co/functions/v1`

Example `wrangler.toml` bindings:

[[vars]]
name = "SUPABASE_FUNCTION_URL"
value = "https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1"

[secrets]
SUPABASE_ANON_KEY = "<your anon key>"

4. Deploy: `wrangler publish`

Netlify Functions alternative
---------------------------
- If you prefer Netlify, create a small serverless function (Node) that performs the same proxying behavior. Keep secrets in Netlify environment variables and forward the Authorization header in the request you send to Supabase Functions.

Security notes
--------------
- Do not store/service_role keys in the proxy. Use the anon/publishable key in the proxy so the proxy only allows forwarding, and let the Edge Function do per-user authorization using the X-API-Key.
- Optionally add HMAC verification or API token for the proxy itself to prevent abuse.

Local Node.js proxy (quick dev option)
------------------------------------
If you don't want to deploy a Cloudflare Worker, run the local proxy included in `proxy/local-proxy`.

1. Install deps and run:

```bash
cd proxy/local-proxy
npm install
SUPABASE_ANON_KEY="<your anon key>" SUPABASE_FUNCTION_URL="http://localhost:54321/functions/v1" npm start
```

2. Call the proxy (only X-API-Key required by the caller):

```bash
curl -X POST http://localhost:8787/ -H "Content-Type: application/json" -H "X-API-Key: test-api-key-12345" -d '{"sql":"SELECT 1;"}'
```

The proxy will forward the request to your Supabase Function adding the Authorization header internally.


Signing requests (HMAC)
-----------------------

The webhook now requires a hex HMAC-SHA256 signature of the raw JSON body using the user's API key as the secret. Send it in the `X-Signature` header. Example (Node):

```js
import crypto from 'crypto';

function sign(bodyJsonString, userApiKey) {
   return crypto.createHmac('sha256', userApiKey).update(bodyJsonString).digest('hex');
}

const body = JSON.stringify({ sql: 'SELECT 1' });
const signature = sign(body, 'user-api-key-123');

fetch('https://your-proxy.example.com/webhook', {
   method: 'POST',
   headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'user-api-key-123',
      'X-Signature': signature
   },
   body
});
```

If you use the local proxy, the proxy will forward the `X-API-Key` and `X-Signature` to the Supabase Function — only the proxy needs the Supabase anon/service key.

