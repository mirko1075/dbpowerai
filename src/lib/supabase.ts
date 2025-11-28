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
console.log('🔍 URL Search:', window.location.search);

// DIAGNOSTIC: Check if URL contains OAuth parameters
const urlParams = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
console.log('🔎 OAuth params in URL:', {
  code: urlParams.get('code') || hashParams.get('code') || 'NONE',
  access_token: urlParams.get('access_token') || hashParams.get('access_token') || 'NONE',
  error: urlParams.get('error') || hashParams.get('error') || 'NONE',
  error_description: urlParams.get('error_description') || hashParams.get('error_description') || 'NONE',
});

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

    // DEBUG: Custom storage to log all storage operations with stack traces
    storage: {
      getItem: (key: string) => {
        const value = localStorage.getItem(key);
        const timestamp = new Date().toISOString();
        console.group(`📖 [${timestamp}] Storage GET [${key}]`);
        console.log('Value:', value ? `EXISTS (${value.length} chars)` : 'NULL');
        if (value) {
          try {
            const parsed = JSON.parse(value);
            console.log('Parsed keys:', Object.keys(parsed));
          } catch {
            console.log('Raw value (not JSON):', value.substring(0, 100));
          }
        }
        console.trace('Called from:');
        console.groupEnd();
        return value;
      },
      setItem: (key: string, value: string) => {
        const timestamp = new Date().toISOString();
        console.group(`💾 [${timestamp}] Storage SET [${key}]`);
        console.log('Value length:', value.length, 'chars');
        console.log('Value preview:', value.substring(0, 100) + '...');
        try {
          const parsed = JSON.parse(value);
          console.log('Setting keys:', Object.keys(parsed));
          if (parsed.access_token) {
            console.log('✅ Contains access_token:', parsed.access_token.substring(0, 20) + '...');
          }
          if (parsed.refresh_token) {
            console.log('✅ Contains refresh_token');
          }
        } catch {
          console.log('Raw value (not JSON)');
        }
        console.trace('Called from:');
        console.groupEnd();
        localStorage.setItem(key, value);
      },
      removeItem: (key: string) => {
        const timestamp = new Date().toISOString();
        console.group(`🗑️ [${timestamp}] Storage REMOVE [${key}]`);
        console.trace('Called from:');
        console.groupEnd();
        localStorage.removeItem(key);
      },
    },
  },
});

// DIAGNOSTIC: Wait and check if Supabase detected session in URL
setTimeout(() => {
  console.log('⏰ [100ms after client creation] Post-init check:');
  console.log('  - Current URL:', window.location.href);
  console.log('  - Hash:', window.location.hash || 'EMPTY');
  console.log('  - Search:', window.location.search || 'EMPTY');
  console.log('  - LocalStorage dbpowerai-auth-token:', localStorage.getItem('dbpowerai-auth-token') ? 'EXISTS' : 'NULL');
}, 100);

// DEBUG: Test localStorage immediately
try {
  localStorage.setItem('__test__', 'test');
  localStorage.removeItem('__test__');
  console.log('✅ localStorage is accessible');
} catch (error) {
  console.error('❌ localStorage is NOT accessible:', error);
}
