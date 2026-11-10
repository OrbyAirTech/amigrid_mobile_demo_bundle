/**
 * Mirrors the C++ structs. std::optional<T> -> `T | null` (field may also be absent).
 * uint64_t ids are strings: the server sends them as JSON numbers, which the API client quotes while
 * parsing (see quoteBigInts) because JS numbers can't hold a 64-bit id exactly.
 */

/** C++ `post_returner`. A post with `parent_post_id` set is a comment/reply (a comment IS a post). */
export type PostReturner = {
  status: boolean;
  id: string;
  author_id: string;
  author_username: string;
  author_display_name: string;
  author_profile_image?: string | null;

  space_id?: string | null;
  space_name?: string | null;

  parent_post_id?: string | null;
  is_reply: boolean;

  content: string;
  media_urls: string[];
  view_count: number;
  like_count: number;

  location?: string | null;
  /** Set when the post was made from a captured live moment. Frontend-only for now (see the server change requests). */
  stream_id?: string | null;
  stream_title?: string | null;
  visibility: string; // ENUM cast to text, e.g. 'public' | 'private' | ...
  created_at: string;
  updated_at: string;
};

/** C++ `post_returner_wrapper`. */
export type PostReturnerWrapper = {
  status: boolean;
  data: PostReturner[];
};

/** C++ `space_list_skeleton` — one row in the Grid Feed list. */
export type SpaceListSkeleton = {
  id: string;
  name: string;
  description: string;
  /** null when it isn't known (search hits don't carry a count). */
  participant_count: number | null;
  access_mode: string; // 'open' | 'invite_only' | 'approval_required' (backend sends text)
  profile_url: string;
};

/** C++ `listed_space_type`. */
export type ListedSpaceType = {
  status: boolean;
  data: SpaceListSkeleton[];
};
