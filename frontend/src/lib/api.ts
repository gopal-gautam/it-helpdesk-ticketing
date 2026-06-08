const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiOptions extends RequestInit {
  token?: string | null;
  _retried?: boolean;
}

// Shared in-flight refresh so concurrent 401s only trigger one refresh call.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

function handleAuthFailure() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, _retried, ...customConfig } = options;

  const isFormData = customConfig.body instanceof FormData;
  const defaultHeaders: Record<string, string> = {};
  // Let the browser set the multipart boundary for FormData uploads.
  if (!isFormData) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);

  if (activeToken) {
    defaultHeaders['Authorization'] = `Bearer ${activeToken}`;
  }

  const config: RequestInit = {
    method: options.method || 'GET',
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...customConfig,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    // Access token likely expired — try to refresh once, then retry the request.
    const isAuthEndpoint = endpoint.startsWith('/auth/');
    if (response.status === 401 && !_retried && !token && !isAuthEndpoint && typeof window !== 'undefined') {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;

      if (newToken) {
        return request<T>(endpoint, { ...options, _retried: true });
      }

      handleAuthFailure();
    }

    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // JSON parsing failed or wasn't provided
    }
    throw new Error(errorMessage);
  }

  // If status is 204 or body is empty
  if (response.status === 204) {
    return {} as T;
  }

  try {
    return await response.json();
  } catch {
    return {} as T;
  }
}

export const api = {
  get: <T>(endpoint: string, options: ApiOptions = {}) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options: ApiOptions = {}) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: any, options: ApiOptions = {}) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: any, options: ApiOptions = {}) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options: ApiOptions = {}) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  // For multipart uploads — pass a FormData body directly.
  upload: <T>(endpoint: string, formData: FormData, options: ApiOptions = {}) =>
    request<T>(endpoint, { ...options, method: 'POST', body: formData }),
};
