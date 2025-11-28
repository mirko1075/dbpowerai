import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  throw new Error(
    'Missing Supabase environment variables. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

// Only log OAuth errors from URL for debugging
const urlParams = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
const oauthError = urlParams.get('error') || hashParams.get('error');
if (oauthError) {
  console.error('❌ OAuth error in URL:', {
    error: oauthError,
    description: urlParams.get('error_description') || hashParams.get('error_description'),
  });
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

    // Custom storage with minimal logging (only errors and critical events)
    storage: {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.error('❌ Storage GET error:', error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('❌ Storage SET error:', error);
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('❌ Storage REMOVE error:', error);
        }
      },
    },
  },
});

// Verify localStorage is accessible (critical for auth)
try {
  localStorage.setItem('__test__', 'test');
  localStorage.removeItem('__test__');
} catch (error) {
  console.error('❌ CRITICAL: localStorage is not accessible. Authentication will fail.', error);
}
