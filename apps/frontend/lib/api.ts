/**
 * API utility functions for making authenticated requests to the backend
 */

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use public API URL
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }
  // Server-side: use backend URL
  return process.env.BACKEND_URL || process.env.API_URL || `http://localhost:${process.env.BACKEND_PORT || 3001}`;
};

export interface ApiError {
  error: string;
  message?: string;
  details?: unknown;
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint}`;

  // Get session token for client-side requests
  let token: string | undefined;
  if (typeof window !== 'undefined') {
    try {
      const sessionRes = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        token = session.accessToken;
      }
    } catch (error) {
      console.error('Failed to get session token:', error);
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: 'Unknown error',
      message: `Request failed with status ${response.status}`,
    }));
    throw new Error(error.message || error.error || 'Request failed');
  }

  return response.json();
}

/**
 * GET request helper
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  endpoint: string,
  data?: unknown
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T>(
  endpoint: string,
  data?: unknown
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

