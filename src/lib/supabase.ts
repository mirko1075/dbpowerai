import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// DEBUG: Log environment variables (don't log keys in production!)
console.log('🔧 Supabase Client Init:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  anonKeyPrefix: supabaseAnonKey?.substring(0, 20) + '...',
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

// DEBUG: Log URL at client creation time
console.log('🌐 Current URL at Supabase client creation:', window.location.href);
console.log('🔑 URL Hash:', window.location.hash);

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

    // DEBUG: Custom storage to log all storage operations
    storage: {
      getItem: (key: string) => {
        const value = localStorage.getItem(key);
        console.log(`📖 Storage GET [${key}]:`, value ? 'EXISTS' : 'NULL');
        return value;
      },
      setItem: (key: string, value: string) => {
        console.log(`💾 Storage SET [${key}]:`, value.substring(0, 50) + '...');
        localStorage.setItem(key, value);
      },
      removeItem: (key: string) => {
        console.log(`🗑️ Storage REMOVE [${key}]`);
        localStorage.removeItem(key);
      },
    },
  },
});

// DEBUG: Test localStorage immediately
try {
  localStorage.setItem('__test__', 'test');
  localStorage.removeItem('__test__');
  console.log('✅ localStorage is accessible');
} catch (error) {
  console.error('❌ localStorage is NOT accessible:', error);
}
