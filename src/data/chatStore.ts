import { useSyncExternalStore } from 'react';
import { Alert } from 'react-native';

import type { ChatMessage, ChatMessageView, ChatSession, ChatSettings, ChatUser, SendState } from '@/types/chat';
import { parseTime } from '@/utils/dateFormat';
import { attachmentLabel, type PickedFile } from '@/utils/media';
import { ApiError } from './api/client';
import {
  acceptTalk,
  blockChatUser,
  clearChatSession,
  declineTalk,
  deleteChatMessage,
  editChatMessage,
  fetchBlocked,
  fetchChatList,
  fetchChatSettings,
  fetchHistory,
  fetchIncomingRequests,
  fetchMuted,
  fetchSentRequests,
  markChatMessageRead,
  muteChatUser,
  pinSession,
  removeSession,
  saveChatSettings,
  sendChatMessage,
  unblockChatUser,
  unmuteChatUser,
  unpinSession,
  type OutgoingMessage,
  type RequestDoc,
} from './chatApi';
import { connectChatSocket, disconnectChatSocket, sendTyping, type ChatEvent } from './chatSocket';
import { getSessionUser } from './currentUserStore';
import { resolveUsers } from './discoveryApi';
import { uploadChatMedia } from './mediaUpload';

/**
 * Chat state shared by every chat screen (and the messages badge). Sessions, requests, settings, block and mute
 * come from the chat server over REST; the WebSocket keeps them live. Sends are optimistic: the message shows
 * at once as "pending" and settles to sent, queued (the other person hasn't accepted yet) or failed.
 */

type ChatState = {
  sessions: ChatSession[];
  messages: Record<string, ChatMessageView[]>; // ascending by time
  /** More (older) messages exist on the server for this chat. */
  hasMore: Record<string, boolean>;
  /** Messages waiting behind a talk request, by chat id. */
  pending: Record<string, number>;
  typing: Record<string, boolean>;
  settings: ChatSettings;
  blocked: ChatUser[];
  muted: ChatUser[];
  directory: Record<string, ChatUser>;
  loaded: boolean;
  loading: boolean;
  error: string | null;
};

const defaultSettings: ChatSettings = {
  allow_read_receipts: true,
  show_online_status: true,
  mute_all_notifications: false,
  show_message_preview: true,
  theme_preference: 'system',
};

const initial = (): ChatState => ({
  sessions: [],
  messages: {},
  hasMore: {},
  pending: {},
  typing: {},
  settings: defaultSettings,
  blocked: [],
  muted: [],
  directory: {},
  loaded: false,
  loading: false,
  error: null,
});

let state: ChatState = initial();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const set = (next: Partial<ChatState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

export const useChat = (): ChatState => useSyncExternalStore(subscribe, () => state, () => state);

/* ---- lookups ---- */
/** The signed-in user's id, as the chat server knows it (a string). */
export const meId = () => String(getSessionUser()?.id ?? '');
export const userOf = (id: string | undefined): ChatUser =>
  (id && state.directory[id]) || { user_id: id ?? '', username: '', display_name: 'Someone' };
export const otherOf = (s: ChatSession) => s.participants.find((p) => p !== meId()) ?? s.participants[0];
export const chatIdFor = (a: string, b: string) => [a, b].sort().join('_');
export const isIncomingRequest = (s: ChatSession) => s.status === 'requested' && s.requested_by !== meId();
export const isUnread = (s: ChatSession) => !!s.last_message && s.last_message.to === meId() && !s.last_message.read;

/** An unpinned chat past its 24 hours. The server removes it soon after, so the way back is a new talk request. */
export const isExpired = (s: ChatSession) => s.status === 'active' && !s.pinned && parseTime(s.expires_at) <= Date.now();

export type TalkState = 'none' | 'chat' | 'pending' | 'incoming' | 'expired' | 'declined';

/** Where things stand with one person, for the "Request talk" button in people lists. */
export function talkStateOf(sessions: ChatSession[], userId: string): TalkState {
  const me = meId();
  const s = sessions.find((x) => x.participants.includes(userId) && x.participants.includes(me));
  if (!s) return 'none';
  if (s.status === 'rejected') return 'declined';
  if (s.status === 'requested') return s.requested_by === me ? 'pending' : 'incoming';
  return isExpired(s) ? 'expired' : 'chat';
}

export const useTalkState = (userId: string): TalkState => talkStateOf(useChat().sessions, userId);

/** Forget an expired chat with this person, so a fresh talk request starts clean. */
export function dropExpiredWith(userId: string) {
  const me = meId();
  const gone = state.sessions.filter((s) => s.participants.includes(userId) && s.participants.includes(me) && isExpired(s)).map((s) => s.chat_id);
  if (gone.length === 0) return;
  const messages = { ...state.messages };
  gone.forEach((id) => delete messages[id]);
  set({ sessions: state.sessions.filter((s) => !gone.includes(s.chat_id)), messages });
}

/** Unread chats plus incoming requests: the number on the messages icon. */
export function useChatBadge(): number {
  const { sessions } = useChat();
  return sessions.filter((s) => (s.status === 'active' && isUnread(s)) || isIncomingRequest(s)).length;
}

const failAlert = (title: string, e: unknown) => Alert.alert(title, e instanceof ApiError ? e.message : 'Something went wrong. Try again.');

/* ---- shaping what the server sends ---- */
const toMessage = (m: ChatMessage & { createdAt?: string }): ChatMessageView => ({
  _id: String(m._id),
  chat_id: m.chat_id,
  from: String(m.from),
  to: String(m.to),
  message: m.message ?? '',
  media_url: m.media_url ?? null,
  post_id: m.post_id ?? null,
  read: !!m.read,
  timestamp: m.timestamp ?? m.createdAt ?? new Date().toISOString(),
});

const lastOf = (m: ChatMessageView) => ({ message_id: m._id, from: m.from, to: m.to, message: m.message, read: m.read, timestamp: m.timestamp });
const isLocal = (m: ChatMessageView) => m._id.startsWith('local-');
const byTime = (a: ChatMessageView, b: ChatMessageView) => Date.parse(a.timestamp) - Date.parse(b.timestamp);

function fromRequest(doc: RequestDoc): ChatSession {
  const fm = doc.first_message;
  return {
    chat_id: doc._id,
    participants: doc.participants,
    pinned: !!doc.pinned,
    status: doc.status,
    requested_by: doc.requested_by,
    last_activity: doc.last_activity ?? doc.updatedAt ?? new Date().toISOString(),
    expires_at: doc.expires_at ?? new Date(Date.now() + 24 * 3_600_000).toISOString(),
    last_message: fm ? { message_id: fm._id, from: fm.from, to: fm.to, message: fm.message, read: false, timestamp: fm.timestamp } : null,
  };
}

/** The queued first message of a talk request, shaped like a message so the thread can show it before acceptance. */
function previewOf(doc: RequestDoc): ChatMessageView | null {
  const fm = doc.first_message;
  if (!fm) return null;
  return {
    _id: String(fm._id),
    chat_id: doc._id,
    from: fm.from,
    to: fm.to,
    message: fm.message ?? '',
    media_url: fm.media_url ?? null,
    post_id: fm.post_id ?? null,
    read: false,
    timestamp: fm.timestamp,
    preview: true,
    state: fm.from === meId() ? 'queued' : undefined,
  };
}

/* ---- people (the chat server only knows ids) ---- */
const asked = new Set<string>();

/** Looks up names and photos for ids the app hasn't seen yet. */
export async function ensureUsers(ids: string[]) {
  const need = [...new Set(ids)].filter((id) => id && !state.directory[id] && !asked.has(id));
  if (need.length === 0) return;
  need.forEach((id) => asked.add(id));
  try {
    const found = await resolveUsers(need);
    if (found.length) set({ directory: { ...state.directory, ...Object.fromEntries(found.map((u) => [u.user_id, u])) } });
    need.filter((id) => !found.some((u) => u.user_id === id)).forEach((id) => asked.delete(id));
  } catch {
    need.forEach((id) => asked.delete(id)); // try again on the next refresh
  }
}

/* ---- helpers ---- */
let seq = 0;
const localId = () => `local-${Date.now()}-${seq++}`;

const patchSession = (chatId: string, fn: (s: ChatSession) => ChatSession) =>
  set({ sessions: state.sessions.map((s) => (s.chat_id === chatId ? fn(s) : s)) });

const putMessages = (chatId: string, list: ChatMessageView[]) => set({ messages: { ...state.messages, [chatId]: list } });

const patchMessage = (chatId: string, id: string, patch: Partial<ChatMessageView>) =>
  putMessages(chatId, (state.messages[chatId] ?? []).map((m) => (m._id === id ? { ...m, ...patch } : m)));

function addMessage(m: ChatMessageView) {
  const list = state.messages[m.chat_id] ?? [];
  if (list.some((x) => x._id === m._id)) return;
  putMessages(m.chat_id, [...list.filter((x) => !x.preview), m].sort(byTime));
}

/* ---- loading ---- */
let inFlight: Promise<void> | null = null;

/** Sessions, requests, settings, block and mute. Called at start, on reconnect and on pull-to-refresh. */
export function refreshChat(): Promise<void> {
  if (inFlight) return inFlight;
  set({ loading: true, error: null });
  inFlight = (async () => {
    const [list, incoming, sent, settings, blocked, muted] = await Promise.allSettled([
      fetchChatList(),
      fetchIncomingRequests(),
      fetchSentRequests(),
      fetchChatSettings(),
      fetchBlocked(),
      fetchMuted(),
    ]);

    if (list.status === 'rejected' && incoming.status === 'rejected' && sent.status === 'rejected') {
      const e = list.reason;
      set({ loading: false, loaded: true, error: e instanceof ApiError ? e.message : 'Couldn’t load your chats.' });
      return;
    }

    const requestDocs = [...(incoming.status === 'fulfilled' ? incoming.value : []), ...(sent.status === 'fulfilled' ? sent.value : [])];
    const fresh = new Map<string, ChatSession>();
    (list.status === 'fulfilled' ? list.value : []).forEach((s) => fresh.set(s.chat_id, s));
    requestDocs.forEach((d) => fresh.set(d._id, fromRequest(d)));

    // A declined request is gone from the server's lists, so keep what this device already knows about it.
    state.sessions.filter((s) => s.status === 'rejected' && !fresh.has(s.chat_id)).forEach((s) => fresh.set(s.chat_id, s));
    // The server drops a chat once it expires. Keep it on this device so it can offer "Request talk".
    state.sessions.filter((s) => isExpired(s) && !fresh.has(s.chat_id)).forEach((s) => fresh.set(s.chat_id, s));
    // Keep a request just created here until the server lists it.
    state.sessions.filter((s) => s.status === 'requested' && s.requested_by === meId() && !fresh.has(s.chat_id) && (state.messages[s.chat_id] ?? []).some(isLocal)).forEach((s) => fresh.set(s.chat_id, s));

    const messages = { ...state.messages };
    const pending: Record<string, number> = {};
    for (const d of requestDocs) {
      pending[d._id] = d.pending_count ?? 0;
      const preview = previewOf(d);
      const existing = messages[d._id] ?? [];
      if (preview && !existing.some((m) => !m.preview)) messages[d._id] = [preview];
    }

    set({
      sessions: [...fresh.values()],
      messages,
      pending,
      settings: settings.status === 'fulfilled' ? { ...defaultSettings, ...settings.value } : state.settings,
      loading: false,
      loaded: true,
      error: null,
    });

    const sessionIds = [...fresh.values()].flatMap((s) => s.participants);
    const listed = (r: PromiseSettledResult<ChatUser[]>) => (r.status === 'fulfilled' ? r.value : null);
    const blockedList = listed(blocked);
    const mutedList = listed(muted);
    await ensureUsers([...sessionIds, ...(blockedList ?? []).map((u) => u.user_id), ...(mutedList ?? []).map((u) => u.user_id)].filter((id) => id !== meId()));
    // Names and photos come from Core, which knows them better than the chat server's own copy.
    const dir = (u: ChatUser) => ({ ...u, ...(state.directory[u.user_id] ?? {}) });
    set({ ...(blockedList ? { blocked: blockedList.map(dir) } : null), ...(mutedList ? { muted: mutedList.map(dir) } : null) });
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

let requestTimer: ReturnType<typeof setTimeout> | null = null;
/** A talk request or a queued message arrived: reload soon (several events in a row become one reload). */
const refreshSoon = () => {
  if (requestTimer) return;
  requestTimer = setTimeout(() => {
    requestTimer = null;
    void refreshChat();
  }, 600);
};

let openChat: string | null = null;

/** Loads a chat's messages (newest page, or the next older one). Safe to call for a chat the server doesn't have yet. */
export async function loadHistory(chatId: string, older = false) {
  if (chatId === 'none') return;
  const current = state.messages[chatId] ?? [];
  const real = current.filter((m) => !m.preview && !isLocal(m));
  try {
    const { messages, hasMore } = await fetchHistory(chatId, older ? real.length : 0);
    const incoming = messages.map(toMessage).reverse(); // the server sends newest first
    const kept = older ? current : current.filter(isLocal);
    const ids = new Set(kept.map((m) => m._id));
    putMessages(chatId, [...kept.filter((m) => !m.preview), ...incoming.filter((m) => !ids.has(m._id))].sort(byTime));
    set({ hasMore: { ...state.hasMore, [chatId]: hasMore } });
    const last = [...(state.messages[chatId] ?? [])].pop();
    if (last && !last.preview && !older) patchSession(chatId, (s) => ({ ...s, last_message: lastOf(last) }));
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 403) throw e; // 403: no session with this person yet
  }
}

/** Called by the thread screen: remembers which chat is on screen (so new messages are read at once) and loads it. */
export function enterChat(chatId: string) {
  openChat = chatId;
  void loadHistory(chatId).catch(() => {});
}
export function leaveChat(chatId: string) {
  if (openChat === chatId) openChat = null;
}

/* ---- sending ---- */
type Outgoing = { chatId: string; body: OutgoingMessage; file?: PickedFile };
const outbox = new Map<string, Outgoing>();

function pushLocal(chatId: string, body: OutgoingMessage, extra: Partial<ChatMessageView> = {}): string {
  const s = state.sessions.find((x) => x.chat_id === chatId);
  const to = s ? otherOf(s) : (chatId.split('_').find((p) => p !== meId()) ?? '');
  const m: ChatMessageView = {
    _id: localId(),
    chat_id: chatId,
    from: meId(),
    to,
    message: body.message ?? '',
    media_url: body.media_url ?? null,
    read: false,
    timestamp: new Date().toISOString(),
    state: 'pending',
    ...extra,
  };
  putMessages(chatId, [...(state.messages[chatId] ?? []).filter((x) => !x.preview), m]);
  patchSession(chatId, (x) => ({ ...x, last_message: lastOf(m), last_activity: m.timestamp }));
  return m._id;
}

async function deliver(id: string) {
  const o = outbox.get(id);
  if (!o) return;
  const { chatId, body } = o;
  patchMessage(chatId, id, { state: 'pending' });
  try {
    const known = state.sessions.some((s) => s.chat_id === chatId);
    const r = await sendChatMessage(known ? chatId : 'none', known ? body : { ...body, reciever_id: chatId.split('_').find((p) => p !== meId()) });
    outbox.delete(id);
    const settled: SendState = r.queued ? 'queued' : 'sent';
    if (r.saved) {
      const real = toMessage(r.saved);
      putMessages(chatId, (state.messages[chatId] ?? []).map((m) => (m._id === id ? { ...real, state: settled, attachment: m.attachment, read: false } : m)).sort(byTime));
      patchSession(chatId, (x) => (x.last_message?.message_id === id ? { ...x, last_message: lastOf(real) } : x));
    } else {
      patchMessage(chatId, id, { state: settled });
      // Without the stored message there is no real id yet (needed to edit or delete it), so reload the thread.
      if (!r.queued) void loadHistory(chatId).catch(() => {});
    }
    if (!known || r.queued) refreshSoon(); // the talk request now exists on the server
  } catch (e) {
    patchMessage(chatId, id, { state: 'failed', uploadProgress: undefined });
    if (e instanceof ApiError && e.status === 409) Alert.alert('Message not sent', e.message);
  }
}

export function sendMessage(chatId: string, text: string) {
  const body = text.trim();
  if (!body || !state.sessions.some((x) => x.chat_id === chatId)) return;
  const id = pushLocal(chatId, { message: body });
  outbox.set(id, { chatId, body: { message: body } });
  void deliver(id);
}

/** First message to someone with no session: creates a "requested" session and queues the message. */
export function startChatWith(userId: string, text: string, file?: PickedFile): string {
  const me = meId();
  const chatId = chatIdFor(me, userId);
  if (!state.sessions.some((s) => s.chat_id === chatId)) {
    const now = new Date();
    const session: ChatSession = {
      chat_id: chatId,
      participants: chatId.split('_') as [string, string],
      pinned: false,
      status: 'requested',
      requested_by: me,
      last_activity: now.toISOString(),
      expires_at: new Date(now.getTime() + 24 * 3_600_000).toISOString(),
      last_message: null,
    };
    set({ sessions: [session, ...state.sessions], messages: { ...state.messages, [chatId]: [] } });
  }
  void ensureUsers([userId]);
  if (file) sendAttachment(chatId, file);
  else sendMessage(chatId, text);
  return chatId;
}

async function runUpload(chatId: string, id: string, file: PickedFile) {
  patchMessage(chatId, id, { state: 'pending', uploadProgress: 0 });
  try {
    const url = await uploadChatMedia(file, (p) => patchMessage(chatId, id, { uploadProgress: p }));
    const body: OutgoingMessage = { message: attachmentLabel({ kind: file.kind, name: file.name }), media_url: url };
    outbox.set(id, { chatId, body });
    patchMessage(chatId, id, { media_url: url, uploadProgress: undefined });
    await deliver(id);
  } catch {
    patchMessage(chatId, id, { state: 'failed', uploadProgress: undefined });
  }
}

/** Send a photo, video, voice note or document: upload to S3 first, then send the message that points at it. */
export function sendAttachment(chatId: string, file: PickedFile) {
  if (!state.sessions.some((x) => x.chat_id === chatId)) return;
  const attachment = { kind: file.kind, name: file.name, size: file.size, durationSec: file.durationSec, mime: file.mime };
  const id = pushLocal(chatId, { message: attachmentLabel(attachment), media_url: file.uri }, { attachment, uploadProgress: 0 });
  outbox.set(id, { chatId, body: {}, file });
  void runUpload(chatId, id, file);
}

export function retryMessage(chatId: string, id: string) {
  const o = outbox.get(id);
  if (!o) return;
  if (o.file && !o.body.media_url) void runUpload(chatId, id, o.file);
  else void deliver(id);
}

export async function editMessage(chatId: string, id: string, text: string) {
  const body = text.trim();
  const before = (state.messages[chatId] ?? []).find((m) => m._id === id);
  if (!body || !before || isLocal(before)) return;
  patchMessage(chatId, id, { message: body });
  patchSession(chatId, (s) => (s.last_message?.message_id === id ? { ...s, last_message: { ...s.last_message, message: body } } : s));
  try {
    await editChatMessage(chatId, id, body);
  } catch (e) {
    patchMessage(chatId, id, { message: before.message });
    patchSession(chatId, (s) => (s.last_message?.message_id === id ? { ...s, last_message: { ...s.last_message, message: before.message } } : s));
    failAlert('Couldn’t edit message', e);
  }
}

export async function deleteMessage(chatId: string, id: string) {
  const before = state.messages[chatId] ?? [];
  const target = before.find((m) => m._id === id);
  if (!target) return;
  const list = before.filter((m) => m._id !== id);
  const tail = list[list.length - 1];
  putMessages(chatId, list);
  patchSession(chatId, (s) => (s.last_message?.message_id === id ? { ...s, last_message: tail ? lastOf(tail) : null } : s));
  if (isLocal(target)) {
    outbox.delete(id);
    return;
  }
  try {
    await deleteChatMessage(chatId, id);
  } catch (e) {
    putMessages(chatId, before);
    failAlert('Couldn’t delete message', e);
  }
}

/** Mark what the other person sent as read here, and tell the server about the newest one. */
const told = new Set<string>();
export function markChatRead(chatId: string) {
  const list = state.messages[chatId] ?? [];
  const unread = list.filter((m) => m.to === meId() && !m.read && !m.preview);
  if (unread.length === 0) return;
  putMessages(chatId, list.map((m) => (m.to === meId() && !m.read && !m.preview ? { ...m, read: true } : m)));
  patchSession(chatId, (s) => (s.last_message && s.last_message.to === meId() ? { ...s, last_message: { ...s.last_message, read: true } } : s));
  const newest = unread[unread.length - 1];
  if (isLocal(newest) || told.has(newest._id)) return;
  told.add(newest._id);
  markChatMessageRead(chatId, newest._id).catch(() => told.delete(newest._id));
}

export function clearTyping(chatId: string) {
  if (state.typing[chatId]) set({ typing: { ...state.typing, [chatId]: false } });
}

/** Call as the person types in a chat. Throttled, and ignored until the other person has accepted. */
export function notifyTyping(chatId: string) {
  if (state.sessions.find((s) => s.chat_id === chatId)?.status === 'active') sendTyping(chatId);
}

/* ---- sessions ---- */
export async function acceptRequest(chatId: string) {
  patchSession(chatId, (s) => ({ ...s, status: 'active' }));
  try {
    await acceptTalk(chatId);
    // The queued messages are delivered by the server as it accepts; they also arrive live, and this catches the rest.
    setTimeout(() => void loadHistory(chatId).catch(() => {}), 800);
    refreshSoon();
  } catch (e) {
    patchSession(chatId, (s) => ({ ...s, status: 'requested' }));
    failAlert('Couldn’t accept request', e);
  }
}

export async function declineRequest(chatId: string) {
  const before = state.sessions;
  patchSession(chatId, (s) => ({ ...s, status: 'rejected' }));
  try {
    await declineTalk(chatId);
    set({ sessions: state.sessions.filter((s) => s.chat_id !== chatId) }); // you don't need a declined request around
  } catch (e) {
    set({ sessions: before });
    failAlert('Couldn’t decline request', e);
  }
}

async function setPinned(chatId: string, pinned: boolean) {
  patchSession(chatId, (s) => (s.status === 'active' ? { ...s, pinned } : s));
  try {
    await (pinned ? pinSession(chatId) : unpinSession(chatId));
  } catch (e) {
    patchSession(chatId, (s) => ({ ...s, pinned: !pinned }));
    failAlert(pinned ? 'Couldn’t pin chat' : 'Couldn’t unpin chat', e);
  }
}
export const pinChat = (chatId: string) => setPinned(chatId, true);
export const unpinChat = (chatId: string) => setPinned(chatId, false);

export async function deleteChat(chatId: string) {
  const { sessions, messages } = state;
  const { [chatId]: _gone, ...rest } = messages;
  set({ sessions: sessions.filter((s) => s.chat_id !== chatId), messages: rest });
  try {
    await removeSession(chatId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return; // already gone on the server
    set({ sessions, messages });
    failAlert('Couldn’t delete chat', e);
  }
}

/* ---- settings, block, mute ---- */
export async function updateSettings(patch: Partial<ChatSettings>) {
  const before = state.settings;
  set({ settings: { ...before, ...patch } });
  try {
    set({ settings: { ...defaultSettings, ...(await saveChatSettings(patch)) } });
  } catch (e) {
    set({ settings: before });
    failAlert('Couldn’t save settings', e);
  }
}

const addTo = (list: ChatUser[], id: string) => (list.some((u) => u.user_id === id) ? list : [...list, userOf(id)]);

async function changeList(kind: 'blocked' | 'muted', id: string, add: boolean, call: () => Promise<unknown>, title: string) {
  const before = state[kind];
  set({ [kind]: add ? addTo(before, id) : before.filter((u) => u.user_id !== id) } as Partial<ChatState>);
  try {
    await call();
  } catch (e) {
    set({ [kind]: before } as Partial<ChatState>);
    failAlert(title, e);
  }
}

export const blockUser = (id: string) => changeList('blocked', id, true, () => blockChatUser(id), 'Couldn’t block');
export const unblockUser = (id: string) => changeList('blocked', id, false, () => unblockChatUser(id), 'Couldn’t unblock');
export const muteUser = (id: string) => changeList('muted', id, true, () => muteChatUser(id), 'Couldn’t mute');
export const unmuteUser = (id: string) => changeList('muted', id, false, () => unmuteChatUser(id), 'Couldn’t unmute');

/* ---- live events ---- */
function onEvent({ action, data }: ChatEvent) {
  switch (action) {
    case 'newMessage': {
      const m = toMessage(data);
      const known = state.sessions.some((s) => s.chat_id === m.chat_id);
      addMessage(m);
      if (!known) return refreshSoon();
      patchSession(m.chat_id, (s) => ({ ...s, last_message: lastOf(m), last_activity: m.timestamp }));
      clearTyping(m.chat_id);
      if (openChat === m.chat_id && m.from !== meId()) markChatRead(m.chat_id);
      void ensureUsers([m.from]);
      return;
    }
    case 'editMessage': {
      const m = toMessage(data);
      patchMessage(m.chat_id, m._id, { message: m.message, media_url: m.media_url });
      patchSession(m.chat_id, (s) => (s.last_message?.message_id === m._id ? { ...s, last_message: { ...s.last_message, message: m.message } } : s));
      return;
    }
    case 'messageDeleted': {
      const list = (state.messages[data.chatId] ?? []).filter((m) => m._id !== data.messageId);
      putMessages(data.chatId, list);
      const tail = list[list.length - 1];
      patchSession(data.chatId, (s) => (s.last_message?.message_id === data.messageId ? { ...s, last_message: tail ? lastOf(tail) : null } : s));
      return;
    }
    case 'typing':
      set({ typing: { ...state.typing, [data.chatId]: true } });
      return;
    case 'readReceipt':
    case 'seen': {
      // One receipt covers that message and everything I sent before it.
      const list = state.messages[data.chatId] ?? [];
      const at = list.find((m) => m._id === data.messageId);
      if (!at) return;
      putMessages(data.chatId, list.map((m) => (m.from === meId() && Date.parse(m.timestamp) <= Date.parse(at.timestamp) ? { ...m, read: true } : m)));
      return;
    }
    case 'talkRequest':
    case 'pendingMessage':
      return refreshSoon();
    case 'acceptedRequest': {
      patchSession(data.chat_id, (s) => ({ ...s, status: 'active' }));
      putMessages(data.chat_id, (state.messages[data.chat_id] ?? []).filter((m) => !m.preview).map((m) => (m.state === 'queued' ? { ...m, state: 'sent' } : m)));
      return refreshSoon();
    }
    case 'talkReject':
      patchSession(data.chat_id, (s) => ({ ...s, status: 'rejected' }));
      return;
    case 'pinChat':
    case 'unpinChat':
      patchSession(data.chat_id, (s) => ({ ...s, pinned: action === 'pinChat' }));
      return;
    default:
  }
}

/* ---- lifecycle ---- */
let started = false;

/** Opens the chat connection once the user is signed in. */
export function startChat() {
  if (started) return;
  started = true;
  void refreshChat();
  connectChatSocket({ onEvent, onOpen: () => void refreshChat() });
}

/** Closes the connection and forgets everything (sign-out). */
export function stopChat() {
  started = false;
  disconnectChatSocket();
  clearChatSession();
  if (requestTimer) clearTimeout(requestTimer);
  requestTimer = null;
  openChat = null;
  outbox.clear();
  told.clear();
  asked.clear();
  state = initial();
  listeners.forEach((l) => l());
}
