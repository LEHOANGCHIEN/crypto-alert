import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request, setAccessToken, setAuthFailureHandler } from './http';

const ok = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { status: 200 });
const fail = (code: string, status = 401, details?: unknown) =>
  new Response(JSON.stringify({ success: false, error: { code, details } }), { status });

describe('http client', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('old');
    setAuthFailureHandler(null);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('unwraps the envelope and sends the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(ok({ a: 1 }));
    expect(await request('GET', '/x')).toEqual({ a: 1 });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer old');
  });

  it('throws ApiError with code and details', async () => {
    fetchMock.mockResolvedValueOnce(fail('VALIDATION_ERROR', 400, [{ field: 'email', code: 'REQUIRED' }]));
    const err = await request('POST', '/x', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('VALIDATION_ERROR');
    expect((err as ApiError).details).toEqual([{ field: 'email', code: 'REQUIRED' }]);
  });

  it('refreshes once (single-flight) when two calls hit TOKEN_EXPIRED, then retries both', async () => {
    let refreshCalls = 0;
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls++;
        return ok({ accessToken: 'new', expiresIn: 900 });
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === 'Bearer new' ? ok({ done: true }) : fail('TOKEN_EXPIRED');
    });
    const [a, b] = await Promise.all([request('GET', '/a'), request('GET', '/b')]);
    expect(a).toEqual({ done: true });
    expect(b).toEqual({ done: true });
    expect(refreshCalls).toBe(1);
  });

  it('calls the auth-failure handler when refresh is refused', async () => {
    const handler = vi.fn();
    setAuthFailureHandler(handler);
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/auth/refresh') ? fail('REFRESH_TOKEN_INVALID') : fail('TOKEN_EXPIRED')));
    await expect(request('GET', '/a')).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not refresh for unauthenticated calls such as login', async () => {
    fetchMock.mockResolvedValueOnce(fail('INVALID_CREDENTIALS'));
    await expect(request('POST', '/auth/login', {}, { auth: false })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('network failure becomes NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await expect(request('GET', '/a')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
