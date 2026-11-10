import type { Call, Reply } from './core';
import * as db from './db';
import { ME, ahead } from './db';

/* ---- live events (what the chat server would push over the socket) ---- */
type Listener = (frame: { action: string; data: any }) => void;
const listeners = new Set<Listener>();
export const onChatEvent = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const emit = (action: string, data: any) => listeners.forEach((l) => l({ action, data }));

const later = (ms: number, fn: () => void) => setTimeout(fn, ms);
let msgCount = 100;
const newMsgId = () => `m${++msgCount}`;
let replyCount = 0;

const ok = (extra: object = {}): Reply => ({ body: { status: true, ...extra } });
const fail = (status: number, message: string): Reply => ({ status, body: { status: false, message } });

const chatUser = (id: string) => {
  const u = db.userById(id)!;
  return { user_id: u.id, username: u.username, display_name: u.display_name, profile_image_url: u.pic };
};
const last = (c: db.DChat) => c.messages[c.messages.length - 1];
const findChat = (id: string) => db.chats.find((c) => c.id === id);
const isExpired = (c: db.DChat) => !c.pinned && Date.parse(c.expires) < Date.now();

const sessionOut = (c: db.DChat) => {
  const m = last(c);
  return {
    chat_id: c.id,
    participants: [ME, c.other],
    pinned: c.pinned,
    status: c.status,
    last_activity: c.activity,
    expires_at: c.expires,
    last_message: m ? { message_id: m._id, from: m.from, to: m.to, message: m.message, read: m.read, timestamp: m.timestamp } : null,
    requested_by: c.requested_by,
  };
};

const requestOut = (c: db.DChat) => {
  const first = c.messages[0];
  return {
    _id: c.id,
    participants: [ME, c.other],
    status: c.status,
    requested_by: c.requested_by,
    pinned: c.pinned,
    last_activity: c.activity,
    expires_at: c.expires,
    first_message: first ? { _id: first._id, from: first.from, to: first.to, message: first.message, timestamp: first.timestamp } : null,
    pending_count: c.messages.length,
  };
};

/** The other person types for a moment, reads what was sent and answers. */
function answerLater(c: db.DChat, to: db.DChatMsg) {
  later(700, () => emit('readReceipt', { chatId: c.id, messageId: to._id }));
  later(900, () => {
    to.read = true;
  });
  later(1300, () => emit('typing', { chatId: c.id }));
  later(3200, () => {
    const m: db.DChatMsg = { _id: newMsgId(), chat_id: c.id, from: c.other, to: ME, message: db.REPLIES[replyCount++ % db.REPLIES.length], media_url: null, post_id: null, read: false, timestamp: new Date().toISOString() };
    c.messages.push(m);
    c.activity = m.timestamp;
    emit('newMessage', m);
  });
}

/** An unanswered request I sent gets accepted after a few seconds, so the demo can show a full conversation. */
function acceptLater(c: db.DChat) {
  later(5000, () => {
    if (c.status !== 'requested' || c.requested_by !== ME) return;
    c.status = 'active';
    c.expires = ahead(60 * 24);
    emit('acceptedRequest', { chat_id: c.id });
    const first = c.messages[c.messages.length - 1];
    if (first) answerLater(c, first);
  });
}

/** One scripted message shortly after the app connects, to show a live incoming chat. */
let scripted = false;
export function startChatScript() {
  if (scripted) return;
  scripted = true;
  later(14_000, () => {
    const c = findChat('c2');
    if (!c || c.status !== 'active') return;
    const m: db.DChatMsg = { _id: newMsgId(), chat_id: c.id, from: c.other, to: ME, message: 'The grid is buzzing about those shots. Come see the comments.', media_url: null, post_id: null, read: false, timestamp: new Date().toISOString() };
    emit('typing', { chatId: c.id });
    later(1800, () => {
      c.messages.push(m);
      c.activity = m.timestamp;
      emit('newMessage', m);
    });
  });
}
export const resetChatScript = () => {
  scripted = false;
};

export function handleChat(c: Call): Reply {
  const { method: m, path: p, query: q, body: b } = c;
  const seg = p.split('/').filter(Boolean).map(decodeURIComponent);

  if (m === 'POST' && (p === '/sign/sync' || p === '/sign/refresh')) {
    const n = ++msgCount;
    return { body: { status: true }, headers: { chatauth: `Bearer demo-chat-${n}`, 'x-chat-refresh-token': `Bearer demo-chat-refresh-${n}` } };
  }
  if (seg[0] === 'chat' && seg[1] === 'push') return ok();

  if (m === 'GET' && p === '/chat/list') {
    const rows = db.chats.filter((x) => x.status !== 'requested').sort((a, b2) => Date.parse(b2.activity) - Date.parse(a.activity));
    return { body: { status: true, data: rows.map(sessionOut), pagination: { offset: 0, limit: 50, hasMore: false } } };
  }
  if (m === 'GET' && p === '/chat/request') return { body: { status: true, data: db.chats.filter((x) => x.status === 'requested' && x.requested_by !== ME).map(requestOut) } };
  if (m === 'GET' && p === '/chat/request/initiated') return { body: { status: true, data: db.chats.filter((x) => x.status === 'requested' && x.requested_by === ME).map(requestOut) } };

  if (m === 'GET' && seg[1] === 'history') {
    const chat = findChat(seg[2]);
    if (!chat) return { body: { status: true, data: [], pagination: { hasMore: false } } };
    const offset = Number(q.offset ?? 0) || 0;
    const limit = Number(q.limit ?? 30) || 30;
    const newestFirst = [...chat.messages].reverse();
    return { body: { status: true, data: newestFirst.slice(offset, offset + limit), pagination: { offset, limit, hasMore: offset + limit < newestFirst.length } } };
  }

  if (m === 'POST' && seg[1] === 'request' && (seg[2] === 'accept' || seg[2] === 'decline')) {
    const chat = findChat(seg[3]);
    if (!chat) return fail(404, 'Request not found.');
    chat.status = seg[2] === 'accept' ? 'active' : 'rejected';
    if (seg[2] === 'accept') chat.expires = ahead(60 * 24);
    return ok();
  }
  if (m === 'POST' && (seg[1] === 'pinChat' || seg[1] === 'unpinChat')) {
    const chat = findChat(seg[2]);
    if (chat) chat.pinned = seg[1] === 'pinChat';
    return ok();
  }

  if (m === 'POST' && seg[1] === 'send_message') {
    let chat = findChat(seg[2]);
    const text = String(b?.message ?? '');
    const other = String(b?.reciever_id ?? chat?.other ?? '');
    if (!chat) {
      if (!other || !db.userById(other)) return fail(404, 'Chat not found.');
      chat = { id: seg[2], other, status: 'requested', requested_by: ME, pinned: false, expires: ahead(60 * 24), activity: new Date().toISOString(), messages: [] };
      db.chats.push(chat);
    }
    const msg: db.DChatMsg = { _id: newMsgId(), chat_id: chat.id, from: ME, to: chat.other, message: text, media_url: b?.media_url ?? null, post_id: b?.post_id ?? null, read: false, timestamp: new Date().toISOString() };

    // An expired chat starts over as a new talk request.
    if (chat.status === 'active' && isExpired(chat)) {
      chat.status = 'requested';
      chat.requested_by = ME;
      chat.expires = ahead(60 * 24);
    }
    chat.messages.push(msg);
    chat.activity = msg.timestamp;

    if (chat.status === 'requested') {
      if (chat.requested_by === ME) {
        acceptLater(chat);
        return { status: 202, body: { status: true, data: msg } };
      }
      return fail(403, 'Accept the request first.');
    }
    if (chat.status === 'rejected') return fail(403, 'This request was declined.');
    answerLater(chat, msg);
    return { status: 200, body: { status: true, data: msg } };
  }

  if (seg[1] === 'edit_message') {
    const chat = findChat(seg[2]);
    const msg = chat?.messages.find((x) => x._id === seg[3]);
    if (!chat || !msg) return fail(404, 'Message not found.');
    msg.message = String(b?.message ?? msg.message);
    return ok();
  }
  if (seg[1] === 'delete_message') {
    const chat = findChat(seg[2]);
    if (chat) chat.messages = chat.messages.filter((x) => x._id !== seg[3]);
    return ok();
  }
  if (seg[1] === 'mark-read') {
    const chat = findChat(seg[2]);
    chat?.messages.forEach((x) => {
      if (x.from !== ME) x.read = true;
    });
    return ok();
  }

  if (p === '/chat/settings') {
    if (m === 'PUT' || m === 'POST' || m === 'PATCH') Object.assign(db.chatSettings, b ?? {});
    return { body: { status: true, data: { ...db.chatSettings } } };
  }
  if (seg[1] === 'block' || seg[1] === 'mute') {
    const set = seg[1] === 'block' ? db.blocked : db.muted;
    if (m === 'GET') return { body: { status: true, data: [...set].filter((id) => db.userById(id)).map(chatUser) } };
    if (m === 'POST') set.add(seg[2]);
    if (m === 'DELETE') set.delete(seg[2]);
    return ok();
  }

  if (m === 'DELETE' && seg[0] === 'chat' && seg.length === 2) {
    const i = db.chats.findIndex((x) => x.id === seg[1]);
    if (i >= 0) db.chats.splice(i, 1);
    return ok();
  }

  return fail(404, `Not part of the demo: ${m} ${p}`);
}

