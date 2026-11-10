import { router } from 'expo-router';
import { PermissionsAndroid, Platform } from 'react-native';
import { useSyncExternalStore } from 'react';

import { api } from './api/client';
import { chatRequest } from './chatApi';
import { refreshChat } from './chatStore';
import { loadNotifications } from './notificationStore';

/**
 * Push notifications over Firebase Cloud Messaging. Both servers send them: Core for notifications and new grid
 * posts, the chat server for messages and talk requests. This device's FCM token is registered with each, so
 * either one can reach it. The Firebase modules are native and loaded only when present, so the app still runs
 * on a build that doesn't include them yet.
 *
 * A message that arrives while the app is open shows as a small in-app banner (the system doesn't draw one then).
 * Tapping a push, or the banner, opens the screen it is about.
 */

type PushData = Record<string, string | undefined>;
type Banner = { id: number; title: string; body: string; data: PushData } | null;

let banner: Banner = null;
const listeners = new Set<() => void>();
const setBanner = (b: Banner) => {
  banner = b;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const usePushBanner = (): Banner => useSyncExternalStore(subscribe, () => banner, () => banner);
export const dismissPushBanner = () => setBanner(null);

let messaging: any;
function load() {
  if (messaging !== undefined) return messaging;
  try {
    messaging = require('@react-native-firebase/messaging').default;
  } catch {
    messaging = null;
  }
  return messaging;
}

/** Where a push should take you. Core sends `event`, the chat server sends `type`. */
export function openFromPush(data: PushData | undefined) {
  if (!data) return;
  if (data.type === 'newMessage') router.push('/chats');
  else if (data.event === 'space_post_created' && data.space_id) router.push({ pathname: '/feed', params: { gridId: data.space_id } });
  else if (data.event === 'notification') router.push('/activity');
}

/** Keeps what is on screen current when a push says something changed. */
function refreshFor(data: PushData) {
  if (data.type === 'newMessage') void refreshChat();
  if (data.event === 'notification') void loadNotifications(true);
}

async function allowed(m: any): Promise<boolean> {
  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const r = await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as never);
      return r === PermissionsAndroid.RESULTS.GRANTED;
    }
    if (Platform.OS === 'ios') {
      const status = await m().requestPermission();
      return status === 1 || status === 2; // authorized or provisional
    }
    return true;
  } catch {
    return false;
  }
}

let registered: string | null = null;
let stops: (() => void)[] = [];
let starting = false;

/** Tell both servers about this device. Core ties the token to the current session; the chat server to the user. */
async function register(token: string) {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const results = await Promise.allSettled([
    api.post('/fire_b_service/register-device', { token, device_type: platform }),
    chatRequest('/chat/push/register', { method: 'POST', body: { token, platform } }),
  ]);
  // Core ties the token to this login session, so it is registered again at every sign-in.
  if (results.some((r) => r.status === 'fulfilled')) registered = token;
}

/** Ask permission, get this device's token and register it. Call once the user is signed in. */
export async function startPush() {
  const m = load();
  if (!m || starting || stops.length) return;
  starting = true;
  try {
    if (!(await allowed(m))) return;
    const token: string = await m().getToken();
    if (token) await register(token);

    stops.push(m().onTokenRefresh((t: string) => void register(t)));
    stops.push(
      m().onMessage(async (msg: any) => {
        const data: PushData = msg?.data ?? {};
        refreshFor(data);
        const title = msg?.notification?.title ?? 'Amigrid';
        const body = msg?.notification?.body ?? '';
        setBanner({ id: Date.now(), title, body, data });
      }),
    );
    stops.push(m().onNotificationOpenedApp((msg: any) => openFromPush(msg?.data)));
    // Launched by tapping a push while the app was closed.
    const first = await m().getInitialNotification();
    if (first) openFromPush(first.data);
  } catch {
    /* push is a convenience; the app works without it */
  } finally {
    starting = false;
  }
}

/** Sign-out: stop listening, and tell the chat server to stop pushing to this device. Core drops it with the session. */
export async function stopPush() {
  stops.forEach((s) => s());
  stops = [];
  setBanner(null);
  const token = registered;
  registered = null;
  const m = load();
  try {
    if (token) await chatRequest(`/chat/push/${encodeURIComponent(token)}`, { method: 'DELETE' });
    if (m) await m().deleteToken(); // the next sign-in gets a fresh token
  } catch {
    /* signing out must never wait on this */
  }
}

/** A push that arrives with the app closed or in the background is drawn by the system. This only silences a warning. */
export function registerBackgroundHandler() {
  try {
    load()?.().setBackgroundMessageHandler(async () => {});
  } catch {
    /* not in this build */
  }
}
