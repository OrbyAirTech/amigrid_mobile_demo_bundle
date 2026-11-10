import { useSyncExternalStore } from 'react';

import type { CurrentUserSummary } from '@/types/user';
import type { UserProfile } from '@/types/profile';
import { ApiError } from './api/client';
import { getMyProfile, getSettings, updateSettings, type AccountSettings, type SettingsPatch } from './profileApi';
import { getBroadcasting, hydrateBroadcasting, resetBroadcasting, setBroadcastingLocal } from './broadcastStore';
import { getAccessToken } from './sessionStore';

/**
 * The signed-in user: the full GET /user profile (profile screen, edit screen) plus the account settings,
 * with the small header summary derived from it. Ids stay strings because the server's ids are 64-bit and a
 * JS number can't hold them exactly.
 */
export type SessionUser = Pick<CurrentUserSummary, 'username' | 'display_name' | 'profile_image' | 'notification_count' | 'settings_prompt_count'> & {
  id: string;
};

type State = {
  profile: UserProfile | null;
  settings: AccountSettings | null;
  /** true until the first load finishes, so screens can tell "loading" from "failed". */
  loading: boolean;
  error: string | null;
};

let state: State = { profile: null, settings: null, loading: false, error: null };
let summary: SessionUser | null = null;
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
  summary = state.profile
    ? {
        id: state.profile.basicInitial.user_id,
        username: state.profile.basicInitial.username,
        display_name: state.profile.basicInitial.display_name || state.profile.basicInitial.username,
        profile_image: state.profile.basicInitial.profile_pic_url || null,
        notification_count: state.profile.notification_count ?? 0,
        // The server has no "profile prompts" count yet.
        settings_prompt_count: 0,
      }
    : null;
  listeners.forEach((l) => l());
};

/** Non-reactive read of the signed-in user's header summary. */
export const getSessionUser = () => summary;

export const useMyProfile = () => useSyncExternalStore(subscribe, () => state, () => state);
/** Just the header summary. Null until the profile has loaded. */
export const useSessionUser = () => useSyncExternalStore(subscribe, () => summary, () => summary);

/**
 * Changes account settings: the new values show immediately, and are rolled back (and the error rethrown)
 * if the server refuses. The server's stored row replaces the local one when it answers.
 */
export async function saveSettings(patch: SettingsPatch) {
  const before = state.settings;
  const wasBroadcasting = getBroadcasting();
  if (before) set({ settings: { ...before, ...patch } });
  if (patch.broadcast_location !== undefined) setBroadcastingLocal(patch.broadcast_location);
  try {
    const stored = await updateSettings(patch);
    set({ settings: { ...(state.settings ?? stored), ...stored } });
    if (patch.broadcast_location !== undefined) hydrateBroadcasting(stored.broadcast_location);
  } catch (e) {
    set({ settings: before });
    if (patch.broadcast_location !== undefined) setBroadcastingLocal(wasBroadcasting);
    throw e;
  }
}

export function clearSessionUser() {
  resetBroadcasting();
  state = { profile: null, settings: null, loading: false, error: null };
  summary = null;
  listeners.forEach((l) => l());
}

/** Loads (or reloads) the profile and settings. Concurrent calls share one request. */
export function refreshMyProfile(): Promise<void> {
  if (!getAccessToken()) return Promise.resolve();
  if (inFlight) return inFlight;
  set({ loading: !state.profile, error: null });
  inFlight = (async () => {
    // Settings are secondary: a failure there must not hide the profile.
    const [profile, settings] = await Promise.allSettled([getMyProfile(), getSettings()]);
    if (profile.status === 'fulfilled') {
      set({ profile: profile.value, loading: false, error: null });
    } else {
      set({
        loading: false,
        error: profile.reason instanceof ApiError ? profile.reason.message : 'Couldn’t load your profile.',
      });
    }
    if (settings.status === 'fulfilled') {
      set({ settings: settings.value });
      hydrateBroadcasting(settings.value.broadcast_location);
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
