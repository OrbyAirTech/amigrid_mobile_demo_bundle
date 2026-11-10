import { useEffect, useState, useSyncExternalStore } from 'react';

import type { SpaceListSkeleton } from '@/types/feed';
import { ApiError } from './api/client';
import { fetchGrid, fetchMyGrids } from './gridsApi';
import { getAccessToken } from './sessionStore';

/** The grids the user belongs to. Used by the Grids list and to tell whether a grid page shows "Join" or "Joined". */
type State = { items: SpaceListSkeleton[]; loaded: boolean; loading: boolean; error: string | null };

let state: State = { items: [], loaded: false, loading: false, error: null };
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

export const useMyGrids = () => useSyncExternalStore(subscribe, () => state, () => state);

export function refreshMyGrids(): Promise<void> {
  if (!getAccessToken()) return Promise.resolve();
  if (inFlight) return inFlight;
  set({ loading: true, error: null });
  inFlight = fetchMyGrids()
    .then((items) => set({ items, loaded: true, loading: false }))
    .catch((e) => set({ loaded: true, loading: false, error: e instanceof ApiError ? e.message : 'Couldn’t load your grids.' }))
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function forgetGrid(id: string) {
  set({ items: state.items.filter((g) => g.id !== id) });
}

export function clearMyGrids() {
  state = { items: [], loaded: false, loading: false, error: null };
  listeners.forEach((l) => l());
}

// Grids looked up one by one (a grid you aren't in), kept so the same grid isn't fetched twice.
const looked = new Map<string, SpaceListSkeleton>();

/** The list-row shape of a grid by id: from my grids when it's there, otherwise fetched once. Null until known. */
export function useGridSkeleton(id: string | undefined): SpaceListSkeleton | null {
  const mine = useMyGrids().items.find((g) => g.id === id);
  const [fetched, setFetched] = useState<SpaceListSkeleton | null>(id ? (looked.get(id) ?? null) : null);
  useEffect(() => {
    if (!id || mine || looked.has(id)) return;
    let live = true;
    fetchGrid(id)
      .then((g) => {
        const s = { id: g.id, name: g.name, description: g.description, participant_count: g.space_participant_count, access_mode: g.access_mode, profile_url: g.profile_url };
        looked.set(id, s);
        if (live) setFetched(s);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id, mine]);
  return mine ?? fetched;
}
