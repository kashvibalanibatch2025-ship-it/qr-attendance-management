export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:10000';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new Error('Unable to connect to the backend server. Please verify the backend is running and reachable.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}
