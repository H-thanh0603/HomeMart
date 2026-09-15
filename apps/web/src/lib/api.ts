'use client';

import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiEnvelope } from './types';
import { useAuthStore, persistUser } from '@/stores/auth-store';

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
let refreshingPromise: Promise<string | null> | null = null;
/**
 * Latch: the refresh cookie is absent/invalid (guest or expired session).
 * Set after one failed refresh so guests don't pay a wasted roundtrip on
 * every request; reset when a login/register succeeds (response interceptor).
 */
let refreshFailed = false;

/**
 * Silent refresh: exchange the httpOnly `hm_rt` cookie for a fresh access
 * token. Single-flight — concurrent callers share one request.
 * Called automatically by the request interceptor when memory is empty
 * (e.g. right after a full page reload).
 */
export function ensureFreshToken(): Promise<string | null> {
  if (refreshFailed) return Promise.resolve(null);
  refreshingPromise = refreshingPromise ?? refreshAccessToken();
  return refreshingPromise;
}

/**
 * Called after a successful login/register so a previously failed guest
 * refresh doesn't block future silent refreshes this session.
 */
export function resetAuthRefresh() {
  refreshFailed = false;
}

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
    // Cookie invalid/expired — session really is gone. Clear the persisted
    // profile mirror too (the access token was never persisted).
    clearSession();
    persistUser(null);
    refreshFailed = true;
    return null;
  } finally {
    refreshingPromise = null;
  }
}

api.interceptors.request.use(async (config) => {
  let token = useAuthStore.getState().accessToken;
  // Token lives in memory only (see auth-store). After a page reload it is
  // null until the httpOnly cookie silently restores it. Skip for the refresh
  // call itself (plain axios — never hits this) and don't spam refresh when
  // it already failed this session (guest browsing).
  if (!token && !refreshFailed) {
    token = await ensureFreshToken();
  }
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

// ─── Response: unwrap envelope + refresh một lần khi 401 ─────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const isAuthCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/register');

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      const newToken = await ensureFreshToken();
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
