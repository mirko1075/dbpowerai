import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    const initializeAuth = async () => {
      console.log('🚀 AuthContext: Starting initialization...');
      console.log('📍 Current URL:', window.location.href);
      console.log('🔗 URL Hash:', window.location.hash);
      console.log('🔍 URL Search:', window.location.search);

      try {
        // CRITICAL: Add 200ms delay to allow Supabase to parse URL session after OAuth redirect
        // This prevents the race condition where getSession() is called before URL tokens are extracted
        console.log('⏱️ AuthContext: Waiting 200ms for URL session detection...');
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log('🔍 AuthContext: Calling getSession()...');
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        console.log('📊 AuthContext: getSession() result:', {
          hasSession: !!initialSession,
          hasError: !!error,
          user: initialSession?.user?.email || 'none',
          expiresAt: initialSession?.expires_at,
        });

        if (error) {
          console.error('❌ Auth initialization error:', error);
        }

        if (initialSession) {
          console.log('✅ AuthContext: Initial session found for user:', initialSession.user.email);
          setSession(initialSession);
          setUser(initialSession.user);
        } else {
          console.log('ℹ️ AuthContext: No initial session found');
          console.log('🔎 Checking localStorage manually...');
          const storedSession = localStorage.getItem('dbpowerai-auth-token');
          console.log('💾 LocalStorage value:', storedSession ? 'EXISTS' : 'NULL');
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        setSession(null);
        setUser(null);
      } finally {
        console.log('✅ AuthContext: Initialization complete, setting isLoading = false');
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    console.log('👂 AuthContext: Setting up onAuthStateChange listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔄 AuthContext: Auth state changed:', {
          event,
          user: currentSession?.user?.email || 'no user',
          hasSession: !!currentSession,
          timestamp: new Date().toISOString(),
        });

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // After auth state changes, we're no longer loading
        if (isLoading) {
          setIsLoading(false);
        }
      }
    );
    console.log('✅ AuthContext: onAuthStateChange listener registered');

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('👋 AuthContext: Signing out...');
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Sign out error:', error);
        throw error;
      }

      // These will be set by onAuthStateChange, but we set them immediately for instant UI update
      setUser(null);
      setSession(null);
      console.log('✅ AuthContext: Signed out successfully');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  console.log('context :>> ', context);
  return context;
}
