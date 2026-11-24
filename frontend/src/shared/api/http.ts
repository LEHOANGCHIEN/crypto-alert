import type { ApiErrorEnvelope, ApiSuccess, FieldError, RefreshResult } from './types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

/** `code` is an API.md error code, or NETWORK_ERROR (client-only, translated as unknown). */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly details?: FieldError[],
    readonly status = 0,
  ) {
    super(code);
  }
}

let accessToken: string | null = null;
let authFailureHandler: (() => void) | null = null;
let refreshing: Promise<RefreshResult | null> | null = null;
const tokenListeners = new Set<(token: string | null) => void>();

/** The access token lives in memory only (ADR-11). Listeners (the socket client) hear every change. */
export const setAccessToken = (t: string | null): void => {
  if (t === accessToken) return;
  accessToken = t;
  for (const fn of tokenListeners) fn(t);
};
/** Subscribe to access-token changes (login, logout, refresh). Returns the unsubscribe function. */
export const onAccessTokenChange = (fn: (token: string | null) => void): (() => void) => {
  tokenListeners.add(fn);
  return () => tokenListeners.delete(fn);
};
export const getAccessToken = (): string | null => accessToken;
/** Called when the session cannot be refreshed any more (user must log in again). */
export const setAuthFailureHandler = (fn: (() => void) | null): void => {
  authFailureHandler = fn;
};

async function send(method: string, path: string, body: unknown, withAuth: boolean): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (withAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('NETWORK_ERROR');
  }
  let json: ApiSuccess<unknown> | ApiErrorEnvelope | null = null;
  try {
    json = (await res.json()) as ApiSuccess<unknown> | ApiErrorEnvelope;
  } catch {
    /* not JSON */
  }
  if (!json) throw new ApiError('INTERNAL_ERROR', undefined, res.status);
  if (json.success) return json.data;
  throw new ApiError(json.error.code, json.error.details, res.status);
}

/** Single-flight: concurrent callers share one POST /auth/refresh. null = session is gone. */
export function refreshSession(): Promise<RefreshResult | null> {
  refreshing ??= send('POST', '/auth/refresh', undefined, false)
    .then((d) => {
      const r = d as RefreshResult;
      setAccessToken(r.accessToken);
      return r;
    })
    .catch((e: unknown) => {
      if (e instanceof ApiError && e.code === 'REFRESH_TOKEN_INVALID') {
        setAccessToken(null);
        return null;
      }
      throw e; // network trouble is not a logout
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

const isAuthExpiry = (e: unknown): boolean => e instanceof ApiError && (e.code === 'TOKEN_EXPIRED' || e.code === 'UNAUTHENTICATED');

/** Only function that talks to the backend. Unwraps the envelope; refreshes once on token expiry. */
export async function request<T>(method: string, path: string, body?: unknown, opts: { auth?: boolean } = {}): Promise<T> {
  const withAuth = opts.auth !== false;
  try {
    return (await send(method, path, body, withAuth)) as T;
  } catch (e) {
    if (!withAuth || !isAuthExpiry(e)) throw e;
    const refreshed = await refreshSession();
    if (!refreshed) {
      authFailureHandler?.();
      throw e;
    }
    return (await send(method, path, body, withAuth)) as T;
  }
}
