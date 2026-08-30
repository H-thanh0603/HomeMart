'use client';

import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiEnvelope } from './types';
import { useAuthStore } from '@/stores/auth-store';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  code?: string;
  status?: number;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status?: number, code?: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true, // send the httpOnly refresh-token cookie
});

// ─── Request: gắn Bearer token ───────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

// ─── Response: unwrap envelope + refresh một lần khi 401 ─────────────────────
let refreshingPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { setSession, clearSession } = useAuthStore.getState();
  try {
    // Refresh token is in the httpOnly cookie — no body needed.
    const res = await axios.post<ApiEnvelope<{ accessToken: string }>>(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const payload = res.data.data;
    setSession(payload.accessToken);
    return payload.accessToken;
  } catch {
    clearSession();
    return null;
  } finally {
    refreshingPromise = null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const isAuthCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/register');

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      refreshingPromise = refreshingPromise ?? refreshAccessToken();
      const newToken = await refreshingPromise;
      if (newToken) {
        const headers = AxiosHeaders.from(original.headers);
        headers.set('Authorization', `Bearer ${newToken}`);
        original.headers = headers;
        return api.request(original as AxiosRequestConfig);
      }
    }

    const envelope = error.response?.data as Partial<ApiEnvelope<unknown>> | undefined;
    const fieldErrors: Record<string, string> | undefined = envelope?.errors
      ? Object.fromEntries(envelope.errors.map((e) => [e.field, e.message]))
      : undefined;

    throw new ApiError(
      envelope?.message ?? 'Có lỗi xảy ra, vui lòng thử lại',
      error.response?.status,
      envelope?.code,
      fieldErrors,
    );
  },
);

/** Lấy `data` từ envelope. */
export async function getData<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await api.request<ApiEnvelope<T>>(config);
  return res.data.data;
}

/** Lấy `{ data: items[], meta }` từ envelope (danh sách phân trang).
 *  Hỗ trợ cả 2 shape backend: `data` là mảng hoặc `data.items` là mảng.
 *  Meta lấy từ envelope, hoặc suy ra từ {total,page,limit} của payload. */
export async function getPage<T>(
  config: AxiosRequestConfig,
): Promise<{ data: T[]; meta?: ApiEnvelope<T[]>['meta'] }> {
  const res = await api.request<ApiEnvelope<T[] | { items?: T[]; total?: number; page?: number; limit?: number }>>(
    config,
  );
  const raw = res.data.data;
  const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  const meta =
    res.data.meta ??
    (raw && !Array.isArray(raw) && typeof raw.total === 'number'
      ? {
          page: raw.page ?? 1,
          limit: raw.limit ?? items.length,
          total: raw.total,
          totalPages: Math.max(1, Math.ceil(raw.total / (raw.limit ?? (items.length || 1)))),
        }
      : undefined);
  return { data: items, meta };
}

export async function postData<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await api.post<ApiEnvelope<T>>(url, body, { headers });
  return res.data.data;
}

export async function patchData<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<ApiEnvelope<T>>(url, body);
  return res.data.data;
}

export async function putData<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.put<ApiEnvelope<T>>(url, body);
  return res.data.data;
}

export async function deleteData<T>(url: string): Promise<T> {
  const res = await api.delete<ApiEnvelope<T>>(url);
  return res.data.data;
}
