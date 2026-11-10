import { useSyncExternalStore } from 'react';

/**
 * Whether this user is visible to others nearby ("broadcasting"). The server's account settings row is the
 * source of truth; this just mirrors it so screens update at once. Until the settings have loaded the value
 * is unknown, and location pings leave the choice out so the server keeps following what it has saved.
 */
let on = true;
let known = false;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const getBroadcasting = () => on;
/** The saved choice, or undefined while it hasn't been loaded. For pings. */
export const getKnownBroadcasting = () => (known ? on : undefined);
export const useBroadcasting = () => useSyncExternalStore(subscribe, getBroadcasting, getBroadcasting);

export function setBroadcastingLocal(next: boolean) {
  known = true;
  if (on === next) return;
  on = next;
  listeners.forEach((l) => l());
}

/** Called with the server's `broadcast_location` whenever the settings are loaded. */
export const hydrateBroadcasting = (serverValue: boolean) => setBroadcastingLocal(serverValue);

export function resetBroadcasting() {
  on = true;
  known = false;
  listeners.forEach((l) => l());
}
