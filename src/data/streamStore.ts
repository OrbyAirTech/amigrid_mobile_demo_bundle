import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import type { Stream, StreamParticipant } from '@/types/stream';
import { ApiError } from './api/client';
import { getSessionUser } from './currentUserStore';
import { disconnectLiveKit, disconnectStream, isConnected, publishToStream, watchStream } from './livekit';
import {
  endStreamApi,
  fetchActiveStream,
  fetchLiveStreams,
  fetchStream,
  fetchStreamParticipants,
  joinStreamApi,
  publisherToken,
  removeParticipantApi,
  setUpvote,
  startStreamApi,
} from './streamApi';

/**
 * Live stream state, on Core's stream routes. Core pushes nothing, so screens poll while focused (POLL_MS) and on
 * returning to the foreground. A 503 from any stream route means streaming isn't switched on: `unavailable`.
 */
type State = { streams: Stream[]; unavailable: boolean; participants: Record<string, StreamParticipant[]>; mineLoaded: boolean };

let state: State = { streams: [], unavailable: false, participants: {}, mineLoaded: false };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnapshot = () => state;

export const POLL_MS = 20_000;

const noteUnavailable = (e: unknown) => {
  if (e instanceof ApiError && e.status === 503) set({ unavailable: true });
};
const isActive = (s: Stream) => s.status === 'live' || s.status === 'starting';

/** Put (or replace) one stream in the list. */
function upsert(s: Stream) {
  const has = state.streams.some((x) => x.stream_id === s.stream_id);
  set({ streams: has ? state.streams.map((x) => (x.stream_id === s.stream_id ? { ...x, ...s } : x)) : [...state.streams, s] });
}

/** Reload one grid's live streams. One that was live and is gone from the list has ended. */
export async function refreshStreams(spaceId: string | undefined) {
  if (!spaceId) return;
  try {
    const live = await fetchLiveStreams(spaceId);
    const ids = new Set(live.map((s) => s.stream_id));
    const dropped = state.streams.filter((s) => s.space_id === spaceId && s.status === 'live' && !ids.has(s.stream_id)).map((s) => ({ ...s, status: 'ended' as const }));
    const rest = state.streams.filter((s) => s.space_id !== spaceId || (s.status !== 'live' && !ids.has(s.stream_id)));
    set({ streams: [...rest.filter((s) => !dropped.some((d) => d.stream_id === s.stream_id)), ...dropped, ...live], unavailable: false });
  } catch (e) {
    noteUnavailable(e);
  }
}

/** Load one stream by id (the viewer was opened from a link, or the feed hasn't loaded it). */
export async function loadStream(streamId: string) {
  try {
    upsert((await fetchStream(streamId)).stream);
  } catch (e) {
    noteUnavailable(e);
  }
}

/** The signed-in user's own starting or live stream, if any. */
export async function refreshMyStream() {
  try {
    const mine = await fetchActiveStream();
    const me = String(getSessionUser()?.id ?? '');
    // A stream of mine that is no longer active has ended.
    const stale = state.streams.filter((s) => s.creator.id === me && isActive(s) && s.stream_id !== mine?.stream_id).map((s) => ({ ...s, status: 'ended' as const }));
    const rest = state.streams.filter((s) => !stale.some((x) => x.stream_id === s.stream_id) && s.stream_id !== mine?.stream_id);
    set({ streams: [...rest, ...stale, ...(mine ? [mine] : [])], mineLoaded: true });
  } catch (e) {
    noteUnavailable(e);
    set({ mineLoaded: true });
  }
}

/** Upvote is idempotent on the server; the count it returns is the truth. */
export async function toggleUpvote(streamId: string) {
  const before = state.streams.find((s) => s.stream_id === streamId);
  if (!before || before.status !== 'live') return;
  const on = !before.has_upvoted;
  upsert({ ...before, has_upvoted: on, upvote_count: Math.max(0, before.upvote_count + (on ? 1 : -1)) });
  try {
    const count = await setUpvote(streamId, on);
    upsert({ ...(state.streams.find((s) => s.stream_id === streamId) ?? before), has_upvoted: on, upvote_count: count });
  } catch (e) {
    upsert(before);
    noteUnavailable(e);
  }
}

export function useStreamState(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Live streams of one grid, in a stable order (oldest first) so a swipe position never shuffles on refresh. */
export function useLiveStreams(spaceId: string | undefined): Stream[] {
  const { streams, unavailable } = useStreamState();
  return useMemo(() => {
    if (unavailable || spaceId == null) return [];
    return streams.filter((s) => s.space_id === String(spaceId) && s.status === 'live').sort((a, b) => Date.parse(a.started_at ?? '') - Date.parse(b.started_at ?? ''));
  }, [streams, unavailable, spaceId]);
}

export function useStream(streamId: string | undefined): Stream | undefined {
  const { streams } = useStreamState();
  return useMemo(() => streams.find((s) => s.stream_id === streamId), [streams, streamId]);
}

/** Refetch a grid's live streams on focus, every POLL_MS while focused, and when the app returns to the foreground. */
export function useStreamPolling(spaceId: string | undefined) {
  useFocusEffect(
    useCallback(() => {
      void refreshStreams(spaceId);
      const timer = setInterval(() => void refreshStreams(spaceId), POLL_MS);
      const sub = AppState.addEventListener('change', (s) => s === 'active' && void refreshStreams(spaceId));
      return () => {
        clearInterval(timer);
        sub.remove();
      };
    }, [spaceId]),
  );
}

// ---- Hosting (Go Live) ----------------------------------------------------------------------------------------
/** Is this the signed-in user's own stream? (They open the host view, not the viewer: join returns 400 for the publisher.) */
export const isMine = (s: Stream) => !!s.creator.id && s.creator.id === String(getSessionUser()?.id ?? '');

/**
 * Starts a stream in a grid and begins publishing the rear camera and microphone. If you already have one going
 * (the server answers 409) it is resumed instead. The stream shows as `starting` until the server sees the video,
 * then `live`.
 */
export async function goLive(spaceId: string, title: string) {
  let access;
  try {
    access = await startStreamApi(spaceId, title);
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const existing = await fetchActiveStream();
      if (!existing) throw e;
      access = await publisherToken(existing.stream_id);
    } else {
      noteUnavailable(e);
      throw e;
    }
  }
  await loadStream(access.stream_id);
  try {
    await publishToStream(access.stream_id, access.livekit_url, access.livekit_token);
  } catch (e) {
    // The stream exists on the server but nothing is being sent, so close it rather than leave it "starting".
    await endStreamApi(access.stream_id).catch(() => {});
    void refreshMyStream();
    throw e;
  }
}

/** Reconnect the camera to a stream of yours that is still going (the app was closed, or the connection dropped). */
export async function resumePublishing(streamId: string) {
  const access = await publisherToken(streamId);
  await publishToStream(streamId, access.livekit_url, access.livekit_token);
}

/** POST /stream/end. A 202 ("ending") is also success: the server finishes it shortly. */
export async function endStream(streamId: string) {
  await disconnectStream(streamId);
  const known = state.streams.find((s) => s.stream_id === streamId);
  if (known) upsert({ ...known, status: 'ended', end_reason: 'normal', ended_at: new Date().toISOString() });
  try {
    await endStreamApi(streamId);
  } catch (e) {
    void refreshMyStream();
    throw e;
  }
}

/**
 * Joins a stream as a viewer and starts its video. The feed card and the open viewer can both want the same stream,
 * so each caller counts: the video stays up until the last one calls leaveWatch.
 */
const watchers = new Map<string, number>();
export async function joinAndWatch(streamId: string) {
  watchers.set(streamId, (watchers.get(streamId) ?? 0) + 1);
  if (isConnected(streamId)) return;
  try {
    const access = await joinStreamApi(streamId);
    if (!isConnected(streamId)) await watchStream(streamId, access.livekit_url, access.livekit_token);
  } catch (e) {
    leaveWatch(streamId);
    throw e;
  }
}

/** The matching call for joinAndWatch. */
export function leaveWatch(streamId: string) {
  const n = (watchers.get(streamId) ?? 0) - 1;
  if (n > 0) {
    watchers.set(streamId, n);
    return;
  }
  watchers.delete(streamId);
  void disconnectStream(streamId);
}

/** The signed-in user's own starting/live stream. Loads it once when first used. */
export function useMyActiveStream(): Stream | undefined {
  const { streams, mineLoaded } = useStreamState();
  useEffect(() => {
    if (!mineLoaded) void refreshMyStream();
  }, [mineLoaded]);
  return useMemo(() => streams.find((s) => isMine(s) && isActive(s)), [streams]);
}

/** Viewers of a stream (managers only). Reloads while the list is in use. */
export async function refreshParticipants(streamId: string) {
  try {
    set({ participants: { ...state.participants, [streamId]: await fetchStreamParticipants(streamId) } });
  } catch (e) {
    noteUnavailable(e);
  }
}

export function useParticipants(streamId: string | undefined): StreamParticipant[] {
  const { participants } = useStreamState();
  return streamId != null ? (participants[streamId] ?? []) : [];
}

/** The viewer is removed and cannot re-join this stream. */
export async function removeParticipant(streamId: string, userId: string) {
  const before = state.participants[streamId] ?? [];
  set({ participants: { ...state.participants, [streamId]: before.map((p) => (p.user_id === userId ? { ...p, removed_at: new Date().toISOString() } : p)) } });
  try {
    await removeParticipantApi(streamId, userId);
  } catch (e) {
    set({ participants: { ...state.participants, [streamId]: before } });
    throw e;
  }
}

/** Sign-out: drop everything and stop any video. */
export function clearStreams() {
  watchers.clear();
  void disconnectLiveKit();
  state = { streams: [], unavailable: false, participants: {}, mineLoaded: false };
  listeners.forEach((l) => l());
}
