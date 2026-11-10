import { API_URL, REQUEST_TIMEOUT_MS } from '@/config/env';
import { clearSession, getAccessToken, getRefreshToken, setTokens } from '../sessionStore';

/** Thrown for every failed call: network, timeout, HTTP error, or a 200 whose body says `status: false`. */
export class ApiError extends Error {
  readonly status: number;
  readonly retryAfter?: number;
  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  query?: Query;
  body?: unknown;
  /** false for login/verify-email/refresh, which have no token to send and must not trigger a refresh. */
  auth?: boolean;
  /**
   * A one-off bearer token that replaces the session's. The sign-up steps use short-lived tokens the server
   * hands back (email check -> OTP -> sign-up). A 401 on these never touches the signed-in session.
   */
  token?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export type ApiResponse<T> = { data: T; headers: Headers; status: number };

const bare = (header: string | null) => header?.replace(/^Bearer\s+/i, '').trim() || null;

function buildUrl(path: string, query?: Query) {
  const qs = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  return `${API_URL}${path}${qs ? `?${qs}` : ''}`;
}

async function rawFetch(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  opts.signal?.addEventListener('abort', () => controller.abort());
  try {
    return await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : null),
        ...(token ? { Authorization: `Bearer ${token}` } : null),
        ...opts.headers,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = (e as Error)?.name === 'AbortError';
    throw new ApiError(aborted ? 'The server took too long to respond.' : 'Can’t reach the server.', 0);
  } finally {
    clearTimeout(timer);
  }
}

// One refresh at a time: when several requests hit an expired token together they all wait on the same call.
let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  refreshing ??= (async () => {
    try {
      const res = await rawFetch('/auth/refresh', { method: 'POST', headers: { 'X-Refresh-Token': rt } }, null);
      if (!res.ok) return false;
      const at = bare(res.headers.get('authorization'));
      const nextRt = bare(res.headers.get('x-refresh-token'));
      if (!at || !nextRt) return false;
      await setTokens(at, nextRt);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/**
 * The server sends some 64-bit ids (post ids, author ids, user ids in engine results) as bare JSON numbers.
 * JS numbers lose precision above 2^53, which would silently turn an id into a different one, so any whole
 * number of 16+ digits outside a string is wrapped in quotes before parsing. Ids stay strings in the app.
 */
export function quoteBigInts(text: string): string {
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < n && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (c >= '0' && c <= '9') {
      let j = i;
      while (j < n && text[j] >= '0' && text[j] <= '9') j++;
      const wholeNumber = text[j] !== '.' && text[j] !== 'e' && text[j] !== 'E' && text[i - 1] !== '.' && text[i - 1] !== '-';
      out += wholeNumber && j - i >= 16 ? `"${text.slice(i, j)}"` : text.slice(i, j);
      i = j;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(quoteBigInts(text));
  } catch {
    return text;
  }
}

function messageOf(body: unknown, fallback: string) {
  if (body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string') {
    return (body as { message: string }).message;
  }
  return fallback;
}

export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
  const useAuth = opts.auth !== false && !opts.token;
  let res = await rawFetch(path, opts, opts.token ?? (useAuth ? getAccessToken() : null));

  // Expired access token: swap it using the refresh token, then replay the request once.
  if (res.status === 401 && useAuth) {
    if (await refreshTokens()) res = await rawFetch(path, opts, getAccessToken());
    if (res.status === 401) {
      await clearSession();
      throw new ApiError('Your session has expired. Please log in again.', 401);
    }
  }

  const body = await parse(res);

  if (res.status === 429) {
    const retry = Number(res.headers.get('retry-after'));
    throw new ApiError('Too many requests. Try again in a moment.', 429, Number.isFinite(retry) && retry > 0 ? retry : undefined);
  }
  if (!res.ok) throw new ApiError(messageOf(body, `Request failed (${res.status}).`), res.status);

  // The server answers some failures with HTTP 200 and { status: false }.
  if (body && typeof body === 'object' && (body as { status?: unknown }).status === false) {
    throw new ApiError(messageOf(body, 'The server could not complete that request.'), res.status);
  }

  return { data: body as T, headers: res.headers, status: res.status };
}

export const api = {
  get: <T>(path: string, query?: Query, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET', query }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'PUT', body }),
  del: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
};

export { bare as stripBearer };
