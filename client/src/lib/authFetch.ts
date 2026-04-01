const TOKEN_KEY = 'diabetes_app_token';
const USER_KEY = 'diabetes_app_user';
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

// Pages call setLogoutHandler() once on mount so authFetch can trigger logout
// from anywhere without needing React context or prop drilling.
let _onUnauthorized: (() => void) | null = null;

export function setLogoutHandler(fn: () => void) {
  _onUnauthorized = fn;
}

export async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  // Token expired or invalid — clear session and redirect to login
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    _onUnauthorized?.();
    throw new Error('Your session has expired. Please sign in again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || 'Request failed');
  }

  return data as T;
}
