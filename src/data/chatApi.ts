import { CHAT_URL, REQUEST_TIMEOUT_MS } from '@/config/env';
import type { ChatMessage, ChatSession, ChatSettings, ChatUser } from '@/types/chat';
import { api, ApiError } from './api/client';
import { deviceInfo } from './authApi';
import { getAccessToken } from './sessionStore';

/**
 * The chat server is its own service with its own tokens. The app signs in to Core first, then trades that
 * access token for a chat pair with POST /sign/sync (the server checks it with Core). Chat tokens are only
 * kept in memory: a fresh sync at launch is cheap, so there is nothing to persist.
 *
 *   chatauth: Bearer <access>             10 minutes, sent on every call
 *   x-chat-refresh-token: <refresh>       7 days, trades for a new pair at POST /sign/refresh
 */
let chatAt: string | null = null;
let chatRt: string | null = null;
let syncing: Promise<boolean> | null = null;

const bare = (v: string | null) => v?.replace(/^Bearer\s+/i, '').trim() || null;
const tokens = (h: Headers) => ({ at: bare(h.get('chatauth')), rt: bare(h.get('x-chat-refresh-token')) });

export const getChatToken = () => chatAt;
export const clearChatSession = () => {
  chatAt = null;
  chatRt = null;
};

type Query = Record<string, string | number | boolean | null | undefined>;

const urlOf = (path: string, query?: Query) => {
  const qs = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  return `${CHAT_URL}${path}${qs ? `?${qs}` : ''}`;
};

async function send(path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown; query?: Query }): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(urlOf(path, init.query), {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : null),
        ...init.headers,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = (e as Error)?.name === 'AbortError';
    throw new ApiError(aborted ? 'The chat server took too long to respond.' : 'Can’t reach the chat server.', 0);
  } finally {
    clearTimeout(timer);
  }
}

/** Trade the Core access token for a chat pair. Core may need to refresh its own token first. */
async function sync(): Promise<boolean> {
  const call = () => {
    const core = getAccessToken();
    return core ? send('/sign/sync', { method: 'POST', headers: { Authorization: `Bearer ${core}` }, body: { deviceInfo } }) : null;
  };
  let res = await call();
  if (res && res.status === 401) {
    try {
      await api.get('/user'); // any Core call swaps an expired access token for a fresh one
    } catch {
      return false;
    }
    res = await call();
  }
  if (!res || !res.ok) return false;
  const t = tokens(res.headers);
  if (!t.at || !t.rt) return false;
  chatAt = t.at;
  chatRt = t.rt;
  return true;
}

async function refresh(): Promise<boolean> {
  if (!chatRt) return false;
  const res = await send('/sign/refresh', { method: 'POST', headers: { 'x-chat-refresh-token': chatRt }, body: { deviceInfo } });
  if (!res.ok) return false;
  const t = tokens(res.headers);
  if (!t.at || !t.rt) return false;
  chatAt = t.at;
  chatRt = t.rt;
  return true;
}

/**
 * Makes sure there is a usable chat access token, one attempt at a time. `renew` forces a new pair: first the
 * refresh token, and if the server doesn't know it (another device signed in) a full sync.
 */
export function ensureChatToken(renew = false): Promise<boolean> {
  if (chatAt && !renew) return Promise.resolve(true);
  syncing ??= (async () => {
    try {
      if (renew && (await refresh())) return true;
      return await sync();
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const messageOf = (body: unknown, fallback: string) => {
  if (body && typeof body === 'object') {
    const b = body as { message?: unknown; errors?: unknown };
    if (typeof b.message === 'string') return b.message;
    if (Array.isArray(b.errors) && b.errors[0] && typeof (b.errors[0] as { msg?: unknown }).msg === 'string') return (b.errors[0] as { msg: string }).msg;
  }
  return fallback;
};

export type ChatResponse<T> = { data: T; status: number };

export async function chatRequest<T = unknown>(path: string, opts: { method?: string; body?: unknown; query?: Query } = {}): Promise<ChatResponse<T>> {
  if (!(await ensureChatToken())) throw new ApiError('Chat isn’t available right now.', 503);
  const run = () => send(path, { ...opts, headers: { chatauth: `Bearer ${chatAt}` } });
  let res = await run();
  if (res.status === 401) {
    if (await ensureChatToken(true)) res = await run();
    if (res.status === 401) throw new ApiError('Chat session expired.', 401);
  }
  const body = await parse(res);
  if (res.status === 429) throw new ApiError('Too many requests. Try again in a moment.', 429);
  if (!res.ok) throw new ApiError(messageOf(body, `Request failed (${res.status}).`), res.status);
  if (body && typeof body === 'object' && (body as { status?: unknown }).status === false) {
    throw new ApiError(messageOf(body, 'The chat server could not complete that.'), res.status);
  }
  return { data: body as T, status: res.status };
}

const get = <T>(path: string, query?: Query) => chatRequest<T>(path, { query });
const post = <T>(path: string, body?: unknown) => chatRequest<T>(path, { method: 'POST', body });

// ---- shapes ---------------------------------------------------------------------------------------------------------

export type Page<T> = { data: T[]; pagination?: { offset: number; limit: number; hasMore: boolean } };

/** A queued first message on a talk request (GET /chat/request and /request/initiated). */
export type FirstMessage = { _id: string; from: string; to: string; message: string; timestamp: string; media_url?: string; post_id?: string };

/** Raw session document from the request routes: `_id` is the chat id. */
export type RequestDoc = {
  _id: string;
  participants: [string, string];
  status: ChatSession['status'];
  requested_by: string;
  pinned?: boolean;
  last_activity?: string;
  updatedAt?: string;
  expires_at?: string;
  first_message: FirstMessage | null;
  pending_count: number;
};

export const PAGE = 30;

// ---- sessions ---------------------------------------------------------------------------------------------------------

export const fetchChatList = async () => (await get<Page<ChatSession>>('/chat/list', { offset: 0, limit: 50 })).data.data ?? [];
export const fetchIncomingRequests = async () => (await get<{ data: RequestDoc[] }>('/chat/request', { offset: 0, limit: 50 })).data.data ?? [];
export const fetchSentRequests = async () => (await get<{ data: RequestDoc[] }>('/chat/request/initiated', { offset: 0, limit: 50 })).data.data ?? [];

export async function fetchHistory(chatId: string, offset: number): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const { data } = await get<Page<ChatMessage>>(`/chat/history/${encodeURIComponent(chatId)}`, { offset, limit: PAGE });
  return { messages: data.data ?? [], hasMore: !!data.pagination?.hasMore };
}

export const acceptTalk = (chatId: string) => post(`/chat/request/accept/${encodeURIComponent(chatId)}`);
export const declineTalk = (chatId: string) => post(`/chat/request/decline/${encodeURIComponent(chatId)}`);
export const pinSession = (chatId: string) => post(`/chat/pinChat/${encodeURIComponent(chatId)}`);
export const unpinSession = (chatId: string) => post(`/chat/unpinChat/${encodeURIComponent(chatId)}`);
export const removeSession = (chatId: string) => chatRequest(`/chat/${encodeURIComponent(chatId)}`, { method: 'DELETE' });

// ---- messages ---------------------------------------------------------------------------------------------------------

export type OutgoingMessage = { message?: string; media_url?: string; post_id?: string; reciever_id?: string };

/** 200 = delivered, 202 = queued until the other person accepts. `data` is the stored message when the server returns it. */
export async function sendChatMessage(chatId: string, body: OutgoingMessage) {
  const { data, status } = await post<{ data?: ChatMessage }>(`/chat/send_message/${encodeURIComponent(chatId)}`, body);
  return { queued: status === 202, saved: data?.data ?? null };
}

export const editChatMessage = (chatId: string, messageId: string, message: string) =>
  post<{ data?: ChatMessage }>(`/chat/edit_message/${encodeURIComponent(chatId)}/${messageId}`, { message });
export const deleteChatMessage = (chatId: string, messageId: string) => post(`/chat/delete_message/${encodeURIComponent(chatId)}/${messageId}`);
export const markChatMessageRead = (chatId: string, messageId: string) => post(`/chat/mark-read/${encodeURIComponent(chatId)}/${messageId}`);

// ---- settings, block, mute --------------------------------------------------------------------------------------------

export const fetchChatSettings = async () => (await get<{ data: ChatSettings }>('/chat/settings')).data.data;
export const saveChatSettings = async (patch: Partial<ChatSettings>) =>
  (await chatRequest<{ data: ChatSettings }>('/chat/settings', { method: 'PUT', body: patch })).data.data;

export const fetchBlocked = async () => (await get<{ data: ChatUser[] }>('/chat/block')).data.data ?? [];
export const blockChatUser = (id: string) => post(`/chat/block/${encodeURIComponent(id)}`);
export const unblockChatUser = (id: string) => chatRequest(`/chat/block/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const fetchMuted = async () => (await get<{ data: ChatUser[] }>('/chat/mute')).data.data ?? [];
export const muteChatUser = (id: string) => post(`/chat/mute/${encodeURIComponent(id)}`);
export const unmuteChatUser = (id: string) => chatRequest(`/chat/mute/${encodeURIComponent(id)}`, { method: 'DELETE' });
