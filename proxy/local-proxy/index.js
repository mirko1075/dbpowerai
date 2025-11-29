const express = require('express')
const fetch = require('node-fetch')
const app = express()
app.use(express.json())

const SUPABASE_FUNCTION_URL = process.env.SUPABASE_FUNCTION_URL || 'http://localhost:54321/functions/v1'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''

app.options('/', (req, res) => {
  res.set({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-API-Key' })
  res.sendStatus(204)
})

app.post('/', async (req, res) => {
  const userApiKey = req.header('x-api-key')
  if (!userApiKey) return res.status(401).json({ error: 'Missing X-API-Key' })
  if (!SUPABASE_ANON_KEY) return res.status(500).json({ error: 'Proxy not configured (SUPABASE_ANON_KEY missing)' })

  try {
    const response = await fetch(`${SUPABASE_FUNCTION_URL.replace(/\/$/, '')}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'X-API-Key': userApiKey },
      body: JSON.stringify(req.body)
    })
    const text = await response.text()
    res.set('Content-Type', response.headers.get('content-type') || 'application/json')
    res.status(response.status).send(text)
  } catch (err) {
    res.status(502).json({ error: 'Proxy error', details: String(err) })
  }
})

const port = process.env.PORT || 8787
app.listen(port, () => console.log(`Proxy listening on http://localhost:${port} (forwarding to ${SUPABASE_FUNCTION_URL})`))
