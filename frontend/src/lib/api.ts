const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiOptions extends RequestInit {
  token?: string | null;
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, ...customConfig } = options;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

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
      body: body ? JSON.stringify(body) : undefined 
    }),
    
  put: <T>(endpoint: string, body?: any, options: ApiOptions = {}) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: body ? JSON.stringify(body) : undefined 
    }),
    
  patch: <T>(endpoint: string, body?: any, options: ApiOptions = {}) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: body ? JSON.stringify(body) : undefined 
    }),
    
  delete: <T>(endpoint: string, options: ApiOptions = {}) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
