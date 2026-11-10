import { useSyncExternalStore } from 'react';

/**
 * Which background (index into BACKGROUNDS in components/ScreenBackground) every screen shows.
 * In-memory: shared by all screens, but resets when the app restarts. To keep the choice, persist
 * `index` (e.g. AsyncStorage / SecureStore) and seed it here.
 */
let index = 0;
const listeners = new Set<() => void>();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnapshot = () => index;

/** Move to the next background, wrapping around. */
export function nextBackground(total: number) {
  if (total < 2) return;
  index = (index + 1) % total;
  listeners.forEach((l) => l());
}

export function useBackgroundIndex(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
