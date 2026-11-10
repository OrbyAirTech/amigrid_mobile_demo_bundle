/**
 * Mirrors the C++ grid (space) structs. std::optional<T> -> `T | null` (field may also be absent).
 * The list payload `listed_space_type` / `space_list_skeleton` already lives in types/feed.ts.
 */

export type SpaceType = 'event' | 'campus' | 'organization' | 'custom';
export type SpaceVisibility = 'public' | 'private';
export type SpaceAccessMode = 'open' | 'closed' | 'secure';

/** C++ `creator` inside `SpaceData` (not the same shape as the events `creator`). */
export type SpaceCreator = {
  user_id: string;
  username: string;
  profile_pic_url: string;
  bio: string;
};

/** C++ `SpaceData`. */
export type SpaceData = {
  id: string;
  name: string;
  description: string;
  profile_url: string;
  profile_banner_url: string;
  creator_info: SpaceCreator;
  type: SpaceType;
  location?: string | null; // "POINT(lon lat)"
  radius_meters?: number | null;
  visibility: SpaceVisibility;
  access_mode: SpaceAccessMode;
  is_system_generated: boolean;
  space_participant_count: number;
  created_at: string;
};

/** C++ `SpaceReturn`. */
export type SpaceReturn = {
  status: boolean;
  data?: SpaceData | null;
};

/** C++ `amigos_vector_userObj`. Used for the amigos list and for grid participants. */
export type AmigoUser = {
  user_id: string;
  username: string;
  profile_pic_url: string;
  bio: string;
};

/** C++ `amigos_rtn_obj`. */
export type AmigosRtnObj = {
  status: boolean;
  data: AmigoUser[];
};

/**
 * A grid participant. `is_admin` is NOT in the C++ struct yet: the admin filter and the admin badge
 * need the backend to send it (or to expose an admins-only route). Absent = regular member.
 */
export type GridMember = AmigoUser & { is_admin?: boolean };

export type GridMembersRtnObj = {
  status: boolean;
  data: GridMember[];
};
