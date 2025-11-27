import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getSessionId(): string {
  let sessionId = localStorage.getItem('dbp_session_id');
  if (!sessionId) {
    sessionId = 'session_' + crypto.randomUUID();
    localStorage.setItem('dbp_session_id', sessionId);
  }
  return sessionId;
}

export async function trackEvent(
  type: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    const sessionId = getSessionId();

    const { data: { session } } = await supabase.auth.getSession();
    const authHeader = session?.access_token
      ? `Bearer ${session.access_token}`
      : `Bearer ${SUPABASE_ANON_KEY}`;

    await fetch(`${SUPABASE_URL}/functions/v1/track-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        type,
        session_id: sessionId,
        metadata: {
          page: window.location.pathname,
          ...metadata,
        },
      }),
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}
