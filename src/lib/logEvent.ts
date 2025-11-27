import { supabase } from './supabase';

export async function logEvent(
  event: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return;
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-event`;

    await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event, metadata }),
    });
  } catch (error) {
    console.error('Failed to log event:', error);
  }
}
