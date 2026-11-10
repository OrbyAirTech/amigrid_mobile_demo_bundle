import { useSyncExternalStore } from 'react';

import type { AppNotification } from '@/types/notification';
import { ApiError, api } from './api/client';
import { PAGE_SIZE } from './amigosApi';
import { getSessionUser, refreshMyProfile, useSessionUser } from './currentUserStore';
import { getAccessToken } from './sessionStore';

/**
 * The notification list shared by the Activity screen and the nav bar badge.
 *
 * The server marks every notification it returns as read in the same call that returns it, so a row can never
 * come back "unread". To keep the new ones highlighted when the screen opens, the unread total from GET /user
 * (read just before) tells us how many of the newest rows were new. After loading, the profile is refreshed so
 * the badge drops to zero.
 */
type State = { items: AppNotification[]; loading: boolean; loaded: boolean; error: string | null; done: boolean };

let state: State = { items: [], loading: false, loaded: false, error: null, done: false };
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const useNotifications = () => useSyncExternalStore(subscribe, () => state, () => state);

/** Unread total for the nav badge: what the server counted for this user. */
export const useUnreadCount = (): number => {
  const { items } = useNotifications();
  const server = useSessionUser()?.notification_count ?? 0;
  return Math.max(server, items.filter((n) => !n.isRead).length);
};
const getSessionUserCount = () => getSessionUser()?.notification_count ?? 0;

async function page(offset: number): Promise<AppNotification[]> {
  try {
    const { data } = await api.get<{ data?: AppNotification[] }>('/user/notification', { offset: String(offset), limit: String(PAGE_SIZE) });
    return data?.data ?? [];
  } catch (e) {
    // An empty list comes back as 200 with `status: false`, which the client reports as an error with status 200.
    if (e instanceof ApiError && e.status === 200) return [];
    throw e;
  }
}

/** Loads the first page (reload = true) or the next one. */
export function loadNotifications(reload = true): Promise<void> {
  if (!getAccessToken()) return Promise.resolve();
  if (inFlight) return inFlight;
  const offset = reload ? 0 : state.items.length;
  if (!reload && state.done) return Promise.resolve();
  set({ loading: true, error: null });
  inFlight = (async () => {
    try {
      const unread = reload ? getSessionUserCount() : 0;
      const rows = await page(offset);
      const marked = reload ? rows.map((n, i) => ({ ...n, isRead: i >= unread })) : rows;
      set({ items: reload ? marked : [...state.items, ...rows], loaded: true, loading: false, done: rows.length < PAGE_SIZE });
      if (reload && unread > 0) refreshMyProfile();
    } catch (e) {
      set({ loading: false, loaded: true, error: e instanceof ApiError ? e.message : 'Couldn’t load your notifications.' });
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function markRead(id: string) {
  if (!state.items.some((n) => n.id === id && !n.isRead)) return;
  set({ items: state.items.map((n) => (n.id === id ? { ...n, isRead: true } : n)) });
}

export function markAllRead() {
  if (state.items.every((n) => n.isRead)) return;
  set({ items: state.items.map((n) => (n.isRead ? n : { ...n, isRead: true })) });
}

export function clearNotifications() {
  state = { items: [], loading: false, loaded: false, error: null, done: false };
  listeners.forEach((l) => l());
}
