import type { Stream, StreamParticipant } from '@/types/stream';
import { api, ApiError } from './api/client';

/**
 * Core's stream routes (LiveKit does the video; Core keeps the records). Ids come back as bare numbers, so every
 * id is turned into a string here, once. Streaming being switched off on the server is a 503.
 */

type RawStream = Omit<Stream, 'stream_id' | 'space_id' | 'post_id' | 'creator'> & {
  stream_id: number | string;
  space_id: number | string;
  post_id: number | string | null;
  creator?: { id: number | string | null; username?: string; display_name?: string; profile_pic_url?: string | null };
};

const str = (v: unknown) => (v == null ? '' : String(v));

export const toStream = (r: RawStream): Stream => ({
  stream_id: str(r.stream_id),
  space_id: str(r.space_id),
  title: r.title ?? null,
  status: r.status,
  end_reason: r.end_reason ?? null,
  post_id: r.post_id == null ? null : str(r.post_id),
  started_at: r.started_at ?? null,
  ended_at: r.ended_at ?? null,
  upvote_count: r.upvote_count ?? 0,
  peak_viewer_count: r.peak_viewer_count ?? 0,
  total_viewer_count: r.total_viewer_count ?? 0,
  has_upvoted: !!r.has_upvoted,
  creator: {
    id: str(r.creator?.id),
    username: r.creator?.username ?? '',
    display_name: r.creator?.display_name || r.creator?.username || 'Someone',
    profile_pic_url: r.creator?.profile_pic_url || null,
  },
  ...('viewer_count' in r ? { viewer_count: r.viewer_count ?? null } : null),
});

const EMPTY = [404, 409, 424];
const LIMIT = '50';

/** Live streams of one grid (members only: a non-member gets 403, which reads as "none"). */
export async function fetchLiveStreams(spaceId: string): Promise<Stream[]> {
  try {
    const { data } = await api.get<{ streams?: RawStream[] }>('/stream/list', { space_id: spaceId, status: 'live', offset: '0', limit: LIMIT });
    return (data?.streams ?? []).map(toStream);
  } catch (e) {
    if (e instanceof ApiError && [...EMPTY, 403].includes(e.status)) return [];
    throw e;
  }
}

export async function fetchStream(streamId: string): Promise<{ stream: Stream; isCreator: boolean; canManage: boolean }> {
  const { data } = await api.get<{ stream: RawStream; is_creator?: boolean; can_manage?: boolean }>('/stream/data', { stream_id: streamId });
  return { stream: toStream(data.stream), isCreator: !!data.is_creator, canManage: !!data.can_manage };
}

/** The signed-in user's own starting or live stream. 404 means they have none, which is normal. */
export async function fetchActiveStream(): Promise<Stream | null> {
  try {
    const { data } = await api.get<{ stream?: RawStream }>('/stream/active');
    return data?.stream ? toStream(data.stream) : null;
  } catch (e) {
    if (e instanceof ApiError && EMPTY.includes(e.status)) return null;
    throw e;
  }
}

export async function fetchStreamParticipants(streamId: string): Promise<StreamParticipant[]> {
  try {
    const { data } = await api.get<{ participants?: (Omit<StreamParticipant, 'user_id'> & { user_id: number | string })[] }>('/stream/participants', {
      stream_id: streamId,
      offset: '0',
      limit: LIMIT,
    });
    return (data?.participants ?? []).map((p) => ({ ...p, user_id: str(p.user_id), profile_pic_url: p.profile_pic_url || null }));
  } catch (e) {
    if (e instanceof ApiError && EMPTY.includes(e.status)) return [];
    throw e;
  }
}

export type LiveKitAccess = { stream_id: string; livekit_url: string; livekit_token: string };
type RawAccess = { stream_id: number | string; livekit_url: string; livekit_token: string };
const access = (r: RawAccess): LiveKitAccess => ({ stream_id: str(r.stream_id), livekit_url: r.livekit_url, livekit_token: r.livekit_token });

/** Grid owner or admin. A 409 means you already have a stream going: the caller resumes it. */
export async function startStreamApi(spaceId: string, title: string): Promise<LiveKitAccess> {
  const body = title.trim() ? { title: title.trim() } : {};
  const { data } = await api.post<RawAccess>('/stream/start', body, { query: { space_id: spaceId } });
  return access(data);
}

/** A fresh publisher token for your own live stream (after the app was closed or the connection dropped). */
export async function publisherToken(streamId: string): Promise<LiveKitAccess> {
  const { data } = await api.post<RawAccess>('/stream/publisher_token', undefined, { query: { stream_id: streamId } });
  return access(data);
}

/** Viewer token. 400 for the publisher, 403 if removed or not a member, 409 when it isn't live any more. */
export async function joinStreamApi(streamId: string): Promise<LiveKitAccess> {
  const { data } = await api.post<RawAccess>('/stream/join', undefined, { query: { stream_id: streamId } });
  return access(data);
}

/** The count that comes back is the truth. */
export async function setUpvote(streamId: string, on: boolean): Promise<number> {
  const { data } = await (on ? api.post<{ upvote_count: number }>('/stream/upvote', undefined, { query: { stream_id: streamId } }) : api.del<{ upvote_count: number }>('/stream/upvote', { query: { stream_id: streamId } }));
  return data.upvote_count;
}

export const removeParticipantApi = (streamId: string, userId: string) =>
  api.post('/stream/remove_participant', undefined, { query: { stream_id: streamId, party_id: userId } });

/** 'ending' (HTTP 202) means LiveKit couldn't be reached; the server finishes the job shortly. Both are success. */
export async function endStreamApi(streamId: string): Promise<'ended' | 'ending'> {
  const { data } = await api.post<{ stream_status?: string }>('/stream/end', undefined, { query: { stream_id: streamId } });
  return data?.stream_status === 'ending' ? 'ending' : 'ended';
}
