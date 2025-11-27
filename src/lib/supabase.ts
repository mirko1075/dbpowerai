import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // PKCE flow for OAuth (recommended for production)
    flowType: 'pkce',

    // Explicitly enable session detection in URL after OAuth
    detectSessionInUrl: true,

    // Auto-refresh tokens before expiry
    autoRefreshToken: true,

    // Persist session in localStorage
    persistSession: true,

    // Storage key for session data
    storageKey: 'dbpowerai-auth-token',
  },
});
