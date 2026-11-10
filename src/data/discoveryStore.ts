import { useSyncExternalStore } from 'react';

import type { SpaceItem, StoreItem, UserItem } from '@/types/discovery';
import type { TrendingSpace } from '@/types/trending';
import { getCurrentFix, type Fix } from '@/utils/locationPermission';
import { ApiError } from './api/client';
import {
  fetchCounters,
  fetchPeople,
  fetchSpaces,
  fetchStores,
  fetchTrending,
  joinSpace,
  pingLocation,
  sendAmigoRequest,
  type Counters,
  type DiscoveryKind,
} from './discoveryApi';

/**
 * Discovery nearby, fed by the engine routes + resolve_many.
 *
 * One refresh = (1) get a position fix, (2) ping it to the engine, (3) fetch the three lists in parallel
 * and hydrate each through resolve_many. Each list succeeds or fails on its own, so a failing stores
 * route doesn't blank the Grid and People tabs.
 */
export const DEFAULT_RADIUS_M = 1500;
const MIN_INTERVAL_MS = 30_000; // don't re-query more often than this unless forced
const PING_EVERY_MS = 5 * 60_000; // the server marks a location stale after ~20 min

export type ListState<T> = { items: T[]; error: string | null };
export type DiscoveryState = {
  /** 'idle' before the first load, 'no-location' when permission or a fix is missing. */
  phase: 'idle' | 'loading' | 'ready' | 'no-location';
  /** True while refreshing with data already on screen (pull-to-refresh style), so lists keep their rows. */
  refreshing: boolean;
  fix: Fix | null;
  updatedAt: number;
  space: ListState<SpaceItem>;
  user: ListState<UserItem>;
  store: ListState<StoreItem>;
  /** Trending spaces and the Watch Live / Events counters: global, so they don't need a location fix. */
  trending: ListState<TrendingSpace> & { loaded: boolean };
  counters: Counters | null;
};

const empty = <T,>(): ListState<T> => ({ items: [], error: null });
let state: DiscoveryState = {
  phase: 'idle',
  refreshing: false,
  fix: null,
  updatedAt: 0,
  space: empty(),
  user: empty(),
  store: empty(),
  trending: { ...empty<TrendingSpace>(), loaded: false },
  counters: null,
};

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnapshot = () => state;
const set = (patch: Partial<DiscoveryState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const useDiscovery = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong loading this list.');

async function load<T>(fn: () => Promise<T[]>): Promise<ListState<T>> {
  try {
    return { items: await fn(), error: null };
  } catch (e) {
    return { items: [], error: errMsg(e) };
  }
}

let inFlight: Promise<void> | null = null;
let lastPing = 0;

export function refreshDiscovery(opts: { force?: boolean; radius_m?: number } = {}): Promise<void> {
  if (inFlight) return inFlight;
  if (!opts.force && state.phase === 'ready' && Date.now() - state.updatedAt < MIN_INTERVAL_MS) return Promise.resolve();

  const radius = opts.radius_m ?? DEFAULT_RADIUS_M;
  set(state.phase === 'ready' ? { refreshing: true } : { phase: 'loading' });

  inFlight = (async () => {
    const fix = await getCurrentFix();
    if (!fix) {
      set({ phase: 'no-location', refreshing: false, fix: null });
      return;
    }

    // The ping is what puts this user on the engine's map. If it fails, the lists below would come back
    // empty and look like "nothing nearby", so surface that instead of silently continuing.
    try {
      if (Date.now() - lastPing > PING_EVERY_MS || opts.force) {
        await pingLocation(fix);
        lastPing = Date.now();
      }
    } catch (e) {
      const msg = errMsg(e);
      set({ phase: 'ready', refreshing: false, fix, space: { items: [], error: msg }, user: { items: [], error: msg }, store: { items: [], error: msg }, updatedAt: Date.now() });
      return;
    }

    const [space, user, store] = await Promise.all([
      load(() => fetchSpaces(radius)),
      load(() => fetchPeople(radius)),
      load(() => fetchStores(radius)),
    ]);
    set({ phase: 'ready', refreshing: false, fix, space, user, store, updatedAt: Date.now() });
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/** Local updates after a card action succeeds, so the card flips without waiting for a refetch. */
const patchItem = (kind: DiscoveryKind, id: string, patch: Record<string, unknown>) => {
  const list = state[kind] as ListState<{ entity_id?: string }>;
  set({
    [kind]: { ...list, items: list.items.map((i) => (i.entity_id === id ? { ...i, ...patch } : i)) },
  } as Partial<DiscoveryState>);
};

export async function joinDiscoveredSpace(item: SpaceItem) {
  await joinSpace(item.entity_id);
  patchItem('space', item.entity_id, { is_member: true });
}

export async function requestAmigo(item: UserItem) {
  await sendAmigoRequest(item.entity_id);
  // The request is pending, not accepted, so this isn't flipped to "Amigos". Mark it so the button
  // can't be tapped twice.
  patchItem('user', item.entity_id, { request_sent: true });
}

/**
 * Trending spaces and the counters don't depend on where the user is, so they load separately from the
 * location-based lists and still work when location is off.
 */
let trendingInFlight: Promise<void> | null = null;
export function refreshTrending(): Promise<void> {
  trendingInFlight ??= (async () => {
    const [trending, counters] = await Promise.allSettled([fetchTrending(), fetchCounters()]);
    set({
      trending:
        trending.status === 'fulfilled'
          ? { items: trending.value, error: null, loaded: true }
          : { items: state.trending.items, error: errMsg(trending.reason), loaded: true },
      counters: counters.status === 'fulfilled' ? counters.value : state.counters,
    });
  })().finally(() => {
    trendingInFlight = null;
  });
  return trendingInFlight;
}
