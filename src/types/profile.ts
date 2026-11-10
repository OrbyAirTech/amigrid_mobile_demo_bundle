/**
 * Mirrors the C++ structs the server serialises for the profile screen.
 * Field names are kept exactly as the C++ members (so the JSON maps 1:1), including the mixed
 * casing of `basicInitial` and `digitalCard_count`.
 */

/** C++ `PostData_type`. One tile in the profile's posts grid. */
export type PostData = {
  id: string;
  media_urls: string[];
  like_count: number;
  created_at: string; // ISO or Postgres-style, see utils/time
};

/** C++ `basicProfile_type`. */
export type BasicProfile = {
  user_id: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  display_name: string;
  bio: string;
  links: string[];
  birthday: string;
};

/** C++ `userProfile_type`. */
export type UserProfile = {
  status: boolean;
  basicInitial: BasicProfile;

  space_count: number; // shown as "Grid"
  amigos_count: number; // shown as "Amigos"
  notification_count: number;
  business_count: number; // shown as "Store"
  digitalCard_count: number; // short. Not shown yet.

  posts: PostData[];
};
