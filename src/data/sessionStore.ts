import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

/**
 * Access + refresh tokens for the Core server, kept in the OS keychain/keystore (not AsyncStorage).
 * Same useSyncExternalStore pattern as the other stores so screens can react to sign-in / sign-out.
 *
 * `loading` only lasts until hydrateSession() has read the keychain once, so the root layout can hold
 * the splash screen instead of flashing the welcome screen at someone who is already signed in.
 */
export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

type SessionState = { status: SessionStatus; accessToken: string | null; refreshToken: string | null };

const AT_KEY = 'amigrid.access_token';
const RT_KEY = 'amigrid.refresh_token';

let state: SessionState = { status: 'loading', accessToken: null, refreshToken: null };
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnapshot = () => state;
const emit = () => listeners.forEach((l) => l());

async function persist(key: string, value: string | null) {
  try {
    if (value) await SecureStore.setItemAsync(key, value);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    // Secure storage can be unavailable (web, locked keychain). The in-memory session still works for this run.
  }
}

export async function hydrateSession() {
  let at: string | null = null;
  let rt: string | null = null;
  try {
    [at, rt] = await Promise.all([SecureStore.getItemAsync(AT_KEY), SecureStore.getItemAsync(RT_KEY)]);
  } catch {
    // fall through to signed out
  }
  state = { status: at && rt ? 'signedIn' : 'signedOut', accessToken: at, refreshToken: rt };
  emit();
}

export function getAccessToken() {
  return state.accessToken;
}
export function getRefreshToken() {
  return state.refreshToken;
}

/** Store a fresh token pair (login, sign-up, refresh). Values are the bare tokens, no "Bearer " prefix. */
export async function setTokens(accessToken: string, refreshToken: string) {
  state = { status: 'signedIn', accessToken, refreshToken };
  emit();
  await Promise.all([persist(AT_KEY, accessToken), persist(RT_KEY, refreshToken)]);
}

/** Replace only the access token (change-email / change-phone hand back a fresh one; the refresh token stays valid). */
export async function setAccessToken(accessToken: string) {
  state = { ...state, status: 'signedIn', accessToken };
  emit();
  await persist(AT_KEY, accessToken);
}

export async function clearSession() {
  state = { status: 'signedOut', accessToken: null, refreshToken: null };
  emit();
  await Promise.all([persist(AT_KEY, null), persist(RT_KEY, null)]);
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
