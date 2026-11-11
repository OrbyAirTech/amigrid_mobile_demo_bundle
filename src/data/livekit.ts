import { requireOptionalNativeModule } from 'expo';
import { useSyncExternalStore } from 'react';

import { DEMO } from '@/config/env';

/**
 * LiveKit connections. Publishing your own stream is one connection; watching is one per live POV, so the big
 * frame and the small frames below it all play at once. Only the big one has sound. The video modules are native
 * and loaded only when needed, so the app still starts on a build that doesn't include them yet.
 */

export type LiveKitStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
export type Connection = {
  status: LiveKitStatus;
  mode: 'publish' | 'watch';
  /** What <VideoTrack> renders; null until the camera is up. */
  trackRef: unknown | null;
  error: string | null;
  /** The remote end went away (the host left or the stream ended). */
  ended: boolean;
};

const IDLE: Connection = { status: 'idle', mode: 'watch', trackRef: null, error: null, ended: false };

type Store = { conns: Record<string, Connection> };
let state: Store = { conns: {} };
const listeners = new Set<() => void>();
const patch = (id: string, next: Partial<Connection> | null) => {
  const conns = { ...state.conns };
  if (next === null) delete conns[id];
  else conns[id] = { ...(conns[id] ?? IDLE), ...next };
  state = { conns };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** One stream's connection (a viewer), or with no id your own publishing connection. */
export function useLiveKit(streamId?: string): Connection {
  const s = useSyncExternalStore(subscribe, () => state, () => state);
  if (streamId) return s.conns[streamId] ?? IDLE;
  return Object.values(s.conns).find((c) => c.mode === 'publish') ?? IDLE;
}

type Lk = { rn: any; client: any };
let loaded: Lk | null | undefined;

function load(): Lk | null {
  if (DEMO) return null; // Expo Go has no WebRTC; demo mode never loads it
  if (loaded !== undefined) return loaded;
  try {
    const rn = require('@livekit/react-native');
    const client = require('livekit-client');
    rn.registerGlobals();
    loaded = { rn, client };
  } catch {
    loaded = null;
  }
  return loaded;
}

export const liveKitMissing = () => !DEMO && load() === null;

/** The component that draws a track, or null when the native modules aren't in this build. */
export const getVideoTrackView = (): React.ComponentType<any> | null => load()?.rn.VideoTrack ?? null;

const MISSING = 'Live video isn’t in this build of the app yet. Rebuild the development client to use it.';

type Live = { room: any; mode: 'publish' | 'watch'; attempt: number };
const rooms = new Map<string, Live>();
let attempts = 0;
let audioId: string | null = null;
let audioSessions = 0;

/** Video is always subscribed; sound only for the stream in the big frame. */
function syncSubscriptions(id: string, room: any) {
  if (DEMO) return; // the demo has no real room to subscribe on
  const { Track } = load()!.client;
  for (const p of room.remoteParticipants.values()) {
    for (const pub of p.trackPublications.values()) {
      try {
        if (pub.kind === Track.Kind.Video) pub.setSubscribed(true);
        else if (pub.kind === Track.Kind.Audio) pub.setSubscribed(id === audioId);
      } catch {
        /* the publication went away */
      }
    }
  }
}

/** Choose which watched stream plays sound (the one in the big frame). */
export function setActiveAudio(streamId: string | null) {
  audioId = streamId;
  for (const [id, l] of rooms) if (l.mode === 'watch') syncSubscriptions(id, l.room);
}

async function startAudio(lk: Lk) {
  if (audioSessions++ === 0) await lk.rn.AudioSession.startAudioSession();
}
async function stopAudio() {
  if (audioSessions > 0 && --audioSessions === 0) {
    try {
      await load()?.rn.AudioSession.stopAudioSession();
    } catch {
      /* nothing to stop */
    }
  }
}

async function connect(url: string, token: string, mode: 'publish' | 'watch', streamId: string) {
  if (DEMO) {
    // No video servers in demo mode: pretend to connect, and the surface plays a sample clip (see demo/DemoVideo).
    if (rooms.has(streamId)) await disconnectStream(streamId);
    const mine = ++attempts;
    rooms.set(streamId, { room: { disconnect: async () => {}, remoteParticipants: new Map() }, mode, attempt: mine });
    patch(streamId, { ...IDLE, status: 'connecting', mode });
    await new Promise((r) => setTimeout(r, 800));
    if (rooms.get(streamId)?.attempt === mine) patch(streamId, { status: 'connected', trackRef: { demo: true } });
    return;
  }
  const lk = load();
  if (!lk) {
    patch(streamId, { ...IDLE, status: 'failed', mode, error: MISSING });
    throw new Error(MISSING);
  }
  if (rooms.has(streamId)) await disconnectStream(streamId);
  const mine = ++attempts;
  patch(streamId, { ...IDLE, status: 'connecting', mode });
  const { Room, RoomEvent, Track } = lk.client;
  const room = new Room({ adaptiveStream: true, dynacast: true });
  rooms.set(streamId, { room, mode, attempt: mine });
  const current = () => rooms.get(streamId)?.attempt === mine;

  const pickRemote = () => {
    for (const p of room.remoteParticipants.values()) {
      const pub = p.getTrackPublication(Track.Source.Camera);
      if (pub?.track) return { participant: p, publication: pub, source: Track.Source.Camera };
    }
    return null;
  };

  room.on(RoomEvent.TrackPublished, () => current() && syncSubscriptions(streamId, room));
  room.on(RoomEvent.ParticipantConnected, () => current() && syncSubscriptions(streamId, room));
  room.on(RoomEvent.TrackSubscribed, () => current() && mode === 'watch' && patch(streamId, { trackRef: pickRemote(), ended: false }));
  room.on(RoomEvent.TrackUnsubscribed, () => current() && mode === 'watch' && patch(streamId, { trackRef: pickRemote() }));
  room.on(RoomEvent.ParticipantDisconnected, () => current() && mode === 'watch' && !room.remoteParticipants.size && patch(streamId, { trackRef: null, ended: true }));
  room.on(RoomEvent.Reconnecting, () => current() && patch(streamId, { status: 'reconnecting' }));
  room.on(RoomEvent.Reconnected, () => current() && patch(streamId, { status: 'connected' }));
  room.on(RoomEvent.Disconnected, () => current() && patch(streamId, { status: 'idle', trackRef: null, ended: mode === 'watch' }));

  try {
    await startAudio(lk);
    await room.connect(url, token, mode === 'watch' ? { autoSubscribe: false } : undefined);
    if (!current()) return;
    if (mode === 'publish') {
      await room.localParticipant.setCameraEnabled(true, { facingMode: 'environment' });
      await room.localParticipant.setMicrophoneEnabled(true);
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      patch(streamId, { status: 'connected', trackRef: pub ? { participant: room.localParticipant, publication: pub, source: Track.Source.Camera } : null });
    } else {
      syncSubscriptions(streamId, room);
      patch(streamId, { status: 'connected', trackRef: pickRemote() });
    }
  } catch (e) {
    if (current()) {
      patch(streamId, { status: 'failed', error: e instanceof Error && e.message ? e.message : 'Couldn’t connect to the stream.' });
      await disconnectStream(streamId, true);
    }
    throw e;
  }
}

/** Start sending your rear camera and microphone. */
export const publishToStream = (streamId: string, url: string, token: string) => connect(url, token, 'publish', streamId);
/** Start watching someone else's stream. Other streams you are watching keep playing. */
export const watchStream = (streamId: string, url: string, token: string) => connect(url, token, 'watch', streamId);
export const isConnected = (streamId: string) => rooms.has(streamId);

/** Leave one stream. `keepState` leaves its status (e.g. the error) on screen. */
export async function disconnectStream(streamId: string, keepState = false) {
  const l = rooms.get(streamId);
  rooms.delete(streamId);
  if (l) {
    try {
      await l.room.disconnect();
    } catch {
      /* already gone */
    }
    await stopAudio();
  }
  if (!keepState && state.conns[streamId]) patch(streamId, null);
}

/** Leave everything (sign-out, or the viewer was closed). */
export async function disconnectLiveKit() {
  await Promise.all([...rooms.keys()].map((id) => disconnectStream(id)));
  audioId = null;
}

/**
 * Saves the frame now showing for a stream as a JPEG and returns its uri. Reads the frame from the video track
 * itself (native module), because a screenshot of the video view comes out black on most Android devices.
 * Returns null when the native reader isn't in this build or no frame could be read.
 */
type FrameModule = {
  captureFrame(streamUrl: string): Promise<string>;
  startRecording?(streamUrl: string): Promise<void>;
  stopRecording?(): Promise<{ uri: string; durationMs: number }>;
};
const frameReader = requireOptionalNativeModule<FrameModule>('AmigridFrame');

/** The React tag the native side looks the stream up by. */
function streamUrlOf(streamId: string): string | undefined {
  const ref = state.conns[streamId]?.trackRef as { publication?: { track?: { mediaStream?: { toURL?: () => string } } } } | null;
  return ref?.publication?.track?.mediaStream?.toURL?.();
}

export async function captureStreamFrame(streamId: string): Promise<string | null> {
  // Demo: a screenshot of a video view comes out black, so a still from the stream's picture stands in.
  if (DEMO) return `https://picsum.photos/seed/moment-${streamId}-${Date.now() % 7}/900/900`;
  const url = streamUrlOf(streamId);
  if (!frameReader || !url) return null;
  try {
    return await frameReader.captureFrame(url);
  } catch {
    return null;
  }
}

/** True when this build has the native recorder (it is added with the frame reader, so it needs the same rebuild). */
export const canRecordClips = !!frameReader?.startRecording;

/**
 * Hold to record. Starts writing the stream's video into an .mp4 on the device. It taps the track LiveKit already
 * uses (a second sink), so the camera isn't opened twice and the stream is untouched. Returns false if it couldn't start.
 */
export async function startStreamClip(streamId: string): Promise<boolean> {
  const url = streamUrlOf(streamId);
  if (!frameReader?.startRecording || !url) return false;
  try {
    await frameReader.startRecording(url);
    return true;
  } catch {
    return false;
  }
}

/** Ends the recording and returns the finished file (uri + length), or null if nothing usable was written. */
export async function stopStreamClip(): Promise<{ uri: string; durationMs: number } | null> {
  if (!frameReader?.stopRecording) return null;
  try {
    return await frameReader.stopRecording();
  } catch {
    return null;
  }
}
