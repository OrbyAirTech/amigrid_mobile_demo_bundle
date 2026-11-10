import { AppState } from 'react-native';

import { CHAT_WS_URL, DEMO } from '@/config/env';
import { DemoSocket } from '@/demo';
import { ensureChatToken, getChatToken } from './chatApi';

/**
 * One WebSocket to the chat server for live events (new messages, typing, read receipts, talk requests...).
 * The server authenticates the upgrade request from a `chatauth` header and then pushes `{ action, data }` frames.
 * Delivery is best effort, so the store refetches over REST whenever the socket (re)connects.
 */
export type ChatEvent = { action: string; data: any };
type Listener = {
  onEvent: (e: ChatEvent) => void;
  /** Fires after every successful connect, including reconnects. */
  onOpen: () => void;
};

let socket: WebSocket | null = null;
let listener: Listener | null = null;
let wanted = false;
let attempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let appSub: { remove: () => void } | null = null;
let lastTyping = 0;

const delay = () => Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5));

function schedule() {
  if (!wanted || retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void open();
  }, delay());
  attempt++;
}

async function open() {
  if (!wanted || !listener || socket) return;
  // After a failed attempt the access token may have expired (they last 10 minutes), so renew it first.
  if (!(await ensureChatToken(attempt > 0)) || !wanted) return schedule();
  const token = getChatToken();
  if (!token) return schedule();

  let ws: WebSocket;
  try {
    // React Native accepts a third argument with request headers; the browser WebSocket type doesn't know it.
    const Socket = DEMO ? (DemoSocket as unknown as typeof WebSocket) : WebSocket;
    ws = new (Socket as unknown as new (url: string, protocols?: string | string[] | null, options?: { headers: Record<string, string> }) => WebSocket)(
      CHAT_WS_URL,
      null,
      { headers: { chatauth: `Bearer ${token}` } },
    );
  } catch {
    return schedule();
  }
  socket = ws;

  ws.onmessage = (m) => {
    let frame: any;
    try {
      frame = JSON.parse(String(m.data));
    } catch {
      return;
    }
    // The first frame is the handshake: { status: "true" } on success, { status: false } when the token is refused.
    if (frame && frame.action === undefined && 'status' in frame) {
      if (String(frame.status) === 'true') {
        attempt = 0;
        listener?.onOpen();
      }
      return;
    }
    if (frame?.action) listener?.onEvent({ action: frame.action, data: frame.data });
  };
  ws.onclose = () => {
    if (socket === ws) socket = null;
    schedule();
  };
  ws.onerror = () => {
    // onclose follows and does the retry
  };
}

export function connectChatSocket(l: Listener) {
  listener = l;
  wanted = true;
  attempt = 0;
  void open();
  appSub?.remove();
  // Phones drop sockets in the background: reconnect straight away when the app comes back.
  appSub = AppState.addEventListener('change', (s) => {
    if (s === 'active' && wanted && !socket) {
      attempt = 0;
      void open();
    }
  });
}

export function disconnectChatSocket() {
  wanted = false;
  listener = null;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  appSub?.remove();
  appSub = null;
  const s = socket;
  socket = null;
  try {
    s?.close();
  } catch {
    // already closed
  }
}

export const isChatSocketOpen = () => socket?.readyState === 1;

/** Tells the other person you're typing. The server only allows one every 2.5s per chat and drops the rest. */
export function sendTyping(chatId: string) {
  const now = Date.now();
  if (now - lastTyping < 2500 || socket?.readyState !== 1) return;
  lastTyping = now;
  socket.send(JSON.stringify({ action: 'typing', chatId }));
}
