/** Live POV streams, as Core returns them from /stream/list, /stream/data and /stream/active. Ids are strings here (Core sends them as numbers). */
export type StreamStatus = 'starting' | 'live' | 'ending' | 'ended';
export type EndReason = 'normal' | 'admin_ended' | 'publisher_disconnected' | 'never_started' | 'timeout';

export type StreamCreator = {
  id: string;
  username: string;
  display_name: string;
  profile_pic_url?: string | null;
};

export type Stream = {
  stream_id: string;
  space_id: string;
  title: string | null;
  status: StreamStatus;
  end_reason: EndReason | null;
  /** Reserved on the server; nothing sets it yet. */
  post_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  upvote_count: number;
  peak_viewer_count: number;
  total_viewer_count: number;
  has_upvoted: boolean;
  creator: StreamCreator;
  /** Only on live items in list responses. Approximate; null means unknown (render "–", never 0). */
  viewer_count?: number | null;
};

/** GET /stream/participants item (managers only). */
export type StreamParticipant = {
  user_id: string;
  username: string;
  display_name: string;
  profile_pic_url?: string | null;
  role: string;
  join_count: number;
  first_joined_at: string;
  last_left_at: string | null;
  removed_at: string | null;
};
