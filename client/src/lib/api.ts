import { API_BASE } from './constants';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('sadra_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  // برای FormData نباید Content-Type دستی تنظیم شود تا مرورگر boundary را اضافه کند
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let body: ApiResponse<T> | null = null;

  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    // پاسخ JSON نیست
  }

  if (!response.ok || !body?.success) {
    const message = body?.error || body?.message || 'خطای غیرمنتظره رخ داد.';
    const error = new ApiError(message, response.status);
    throw error;
  }

  return body;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),
};

export function toImageUrl(url: string | null | undefined): string {
  if (!url) return '/placeholder.svg';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/static')) return url;
  return `/static${url}`;
}