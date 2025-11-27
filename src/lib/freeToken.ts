const FREE_TOKEN_KEY = 'dbp_free_token';
const FREE_TOKEN_USED_KEY = 'dbp_free_token_used';

export function generateFreeToken(): string {
  if (typeof crypto === 'undefined' || !crypto.randomUUID) {
    return `free_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  return `free_${crypto.randomUUID()}`;
}

export function getFreeToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(FREE_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setFreeToken(token: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(FREE_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save free token:', error);
  }
}

export function isFreeTokenUsed(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return localStorage.getItem(FREE_TOKEN_USED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markFreeTokenAsUsed(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(FREE_TOKEN_USED_KEY, 'true');
  } catch (error) {
    console.error('Failed to mark token as used:', error);
  }
}

export function getOrCreateFreeToken(): string {
  let token = getFreeToken();

  if (!token) {
    token = generateFreeToken();
    setFreeToken(token);
  }

  return token;
}
