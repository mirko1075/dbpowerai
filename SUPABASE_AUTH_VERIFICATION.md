# Supabase Authentication Verification Checklist

## 🔍 Problema Identificato
L'autenticazione OAuth con Google non crea una session. I sintomi principali sono:
- Nessun log di `storage.setItem` dopo OAuth redirect
- URL callback vuoto (senza code/tokens)
- `AuthContext` riporta sempre "No initial session found"

## 📋 Checklist Verifiche Supabase Dashboard

### 1. Authentication → URL Configuration

**Vai a:** Supabase Dashboard → Authentication → URL Configuration

Verifica le seguenti configurazioni:

- [ ] **Site URL** = `https://dbpowerai.vercel.app`
  - ⚠️ NON deve avere trailing slash
  - ⚠️ DEVE essere esattamente l'origin della tua app Vercel

- [ ] **Redirect URLs** contiene:
  - [ ] `https://dbpowerai.vercel.app/**` (wildcard per tutti i path)
  - [ ] `https://dbpowerai.vercel.app/dashboard` (specifico per il redirect OAuth)

  **IMPORTANTE:** Se manca uno di questi, Google OAuth fallirà silenziosamente

### 2. Authentication → Providers → Google

**Vai a:** Supabase Dashboard → Authentication → Providers → Google

Verifica:

- [ ] **Enabled** = ON (provider abilitato)
- [ ] **Client ID** è configurato (da Google Cloud Console)
- [ ] **Client Secret** è configurato
- [ ] **Authorized Client IDs** (se richiesto)

**Test da fare:**
```
Click su "Test Configuration" (se disponibile)
```

### 3. Google Cloud Console - OAuth Consent Screen

**Vai a:** [Google Cloud Console](https://console.cloud.google.com/apis/credentials/consent)

Verifica:

- [ ] **App pubblicata** oppure in "Testing" con il tuo email come test user
- [ ] **Authorized domains** include `dbpowerai.vercel.app`

### 4. Google Cloud Console - OAuth Credentials

**Vai a:** [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

Verifica che l'OAuth 2.0 Client ID ha:

- [ ] **Authorized JavaScript origins:**
  ```
  https://dbpowerai.vercel.app
  ```

- [ ] **Authorized redirect URIs:**
  ```
  https://onfhmkhhjnouspczrwcr.supabase.co/auth/v1/callback
  ```

  ⚠️ **CRITICO:** Questo URL deve essere esattamente quello fornito da Supabase

### 5. Vercel Environment Variables

**Vai a:** Vercel Dashboard → Project Settings → Environment Variables

Verifica che esistano:

- [ ] `VITE_SUPABASE_URL` = `https://onfhmkhhjnouspczrwcr.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` = JWT format (inizia con `eyJ...`)

  ⚠️ **NON** deve essere `sb_publishable_...`

### 6. Database → Triggers

**Vai a:** Supabase Dashboard → Database → Triggers

Verifica che il trigger `on_auth_user_created` esista e sia abilitato:

```sql
-- Esegui questa query nell'SQL Editor
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname LIKE '%auth%';
```

**Risultato atteso:**
```
trigger_name         | enabled | table_name
---------------------|---------|------------
on_auth_user_created |    O    | auth.users
```

Se `enabled` è diverso da `O` (originale), il trigger potrebbe essere disabilitato.

### 7. Row Level Security (RLS) Policies

**Vai a:** Supabase Dashboard → Authentication → Policies

Verifica che la tabella `user_profiles` abbia policies che permettono INSERT:

```sql
-- Esegui questa query nell'SQL Editor
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'user_profiles';
```

**Verifica che esista almeno una policy con:**
- `cmd = 'INSERT'`
- `permissive = 'PERMISSIVE'`

## 🧪 Test di Verifica in Browser Console

### Test #1: Verifica OAuth Parameters in URL

Dopo aver fatto login con Google e essere tornato all'app, esegui:

```javascript
// In browser console su dbpowerai.vercel.app/dashboard
console.log('URL completo:', window.location.href);
console.log('Hash:', window.location.hash);
console.log('Search:', window.location.search);

// Estrai parametri
const searchParams = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));

console.log('Parametri OAuth:', {
  code: searchParams.get('code') || hashParams.get('code'),
  access_token: searchParams.get('access_token') || hashParams.get('access_token'),
  error: searchParams.get('error') || hashParams.get('error'),
  error_description: searchParams.get('error_description') || hashParams.get('error_description'),
});
```

**Risultato Atteso (PKCE):**
- `code` DEVE esistere
- `access_token` NON deve esistere (PKCE usa code exchange)
- `error` DEVE essere null

**Se vedi:**
- ❌ Nessun parametro → Redirect URL mismatch in Supabase Dashboard
- ❌ `error=access_denied` → User ha rifiutato l'autorizzazione
- ❌ `error=redirect_uri_mismatch` → Google OAuth redirect URI non configurato correttamente

### Test #2: Verifica Session Storage

```javascript
// Controlla se esiste una session salvata
const sessionKey = 'dbpowerai-auth-token';
const rawSession = localStorage.getItem(sessionKey);

console.log('Session in localStorage:', rawSession ? 'EXISTS' : 'NULL');

if (rawSession) {
  try {
    const parsed = JSON.parse(rawSession);
    console.log('Session data:', {
      hasAccessToken: !!parsed.access_token,
      hasRefreshToken: !!parsed.refresh_token,
      hasUser: !!parsed.user,
      expiresAt: parsed.expires_at ? new Date(parsed.expires_at * 1000) : null,
    });
  } catch (e) {
    console.error('Failed to parse session:', e);
  }
}
```

**Risultato Atteso:**
- Se OAuth è riuscito: `EXISTS` con `hasAccessToken: true`
- Se OAuth è fallito: `NULL`

### Test #3: Verifica getSession()

```javascript
// Importa supabase (se non già disponibile)
const { data, error } = await supabase.auth.getSession();

console.log('getSession() result:', {
  hasSession: !!data.session,
  hasError: !!error,
  user: data.session?.user?.email,
  error: error,
});
```

**Risultato Atteso:**
- `hasSession: true` se autenticato
- `user: "tua-email@gmail.com"`

### Test #4: Force Token Exchange (se hai code nell'URL)

```javascript
// Se vedi un 'code' nell'URL ma nessuna session
const urlParams = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
const code = urlParams.get('code') || hashParams.get('code');

if (code) {
  console.log('Found authorization code:', code.substring(0, 20) + '...');

  // Tenta lo scambio manuale
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  console.log('Manual exchange result:', {
    hasSession: !!data.session,
    hasError: !!error,
    error: error,
  });
}
```

## 🐛 Interpretazione dei Log Console

### Log di Successo (OAuth Funziona)

```
🔐 GOOGLE OAUTH SIGN IN - DIAGNOSTIC
⏰ Timestamp: 2024-01-XX...
📍 Current location: { origin: "https://dbpowerai.vercel.app", ... }
🎯 Redirect target: https://dbpowerai.vercel.app/dashboard
🚀 Calling supabase.auth.signInWithOAuth...
📊 OAuth response received: { hasData: true, hasError: false }
✅ OAuth initiated successfully
🔄 Browser should redirect to Google OAuth...

[Browser redirects to Google]
[User approves]
[Browser redirects back to /dashboard?code=XXX]

🌐 Current URL at Supabase client creation: https://dbpowerai.vercel.app/dashboard?code=...
🔎 OAuth params in URL: { code: "ABC123...", access_token: "NONE" }

💾 [timestamp] Storage SET [dbpowerai-auth-token]
✅ Contains access_token: eyJhbGc...
✅ Contains refresh_token

🔄 [timestamp] AUTH STATE CHANGE
Event: SIGNED_IN
User: your-email@gmail.com
✅ Has Session: true
```

### Log di Fallimento (Redirect URI Mismatch)

```
🔐 GOOGLE OAUTH SIGN IN - DIAGNOSTIC
🚀 Calling supabase.auth.signInWithOAuth...
❌ OAuth error: { message: "Invalid redirect URI", status: 400 }
```

### Log di Fallimento (Code Non Trovato in URL)

```
[Dopo redirect da Google]

🌐 Current URL: https://dbpowerai.vercel.app/dashboard
🔎 OAuth params in URL: { code: "NONE", access_token: "NONE" }

🚀 AuthContext: Starting initialization...
ℹ️ AuthContext: No initial session found
💾 LocalStorage value: NULL
```

## 📝 Azioni Correttive

### Se OAuth redirect fallisce (error in URL)

1. Vai a Google Cloud Console → Credentials
2. Verifica che `Authorized redirect URIs` contenga esattamente:
   ```
   https://onfhmkhhjnouspczrwcr.supabase.co/auth/v1/callback
   ```
3. Salva e riprova dopo 5 minuti (cache Google)

### Se URL callback è vuoto (nessun code/error)

1. Vai a Supabase Dashboard → Authentication → URL Configuration
2. Aggiungi `https://dbpowerai.vercel.app/**` a Redirect URLs
3. Verifica che Site URL = `https://dbpowerai.vercel.app`
4. Salva e riprova immediatamente

### Se code esiste ma nessuna session viene creata

1. Controlla i log console per vedere se `storage.setItem` viene chiamato
2. Se NON viene chiamato:
   - Possibile bug nel custom storage wrapper
   - Prova a commentare temporaneamente il custom storage e usare quello di default
3. Se viene chiamato ma `getSession()` restituisce null:
   - Possibile problema di parsing del JSON
   - Verifica che localStorage non sia corrotto

### Se trigger `create_profile_for_new_user` fallisce

```sql
-- Verifica che la funzione esista
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'create_profile_for_new_user';

-- Se non esiste, ri-esegui la migration
-- File: supabase/migrations/20251121170902_create_auto_profile_trigger.sql
```

## 🎯 Next Steps

1. ✅ Completa TUTTI i punti della checklist sopra
2. ✅ Esegui i 4 test in browser console
3. ✅ Leggi i log console e confrontali con i pattern di successo/fallimento
4. ✅ Se vedi un pattern specifico, applica l'azione correttiva corrispondente
5. ✅ Deploy su Vercel le modifiche del codice (logging enhancements)
6. ✅ Riprova il login con Google e raccogli i nuovi log
7. ✅ Condividi i log completi per ulteriore diagnosi

## 📞 Informazioni di Debug da Raccogliere

Se il problema persiste dopo aver seguito questa checklist, raccogli:

1. Screenshot di Supabase Dashboard → Authentication → URL Configuration
2. Screenshot di Google Cloud Console → OAuth Credentials → Redirect URIs
3. Log completi della console browser dall'inizio del login fino al redirect finale
4. Output del test `getSession()` in console
5. Contenuto di `localStorage` chiave `dbpowerai-auth-token`
