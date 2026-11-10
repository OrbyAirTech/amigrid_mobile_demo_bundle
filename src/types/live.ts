/** Mirrors the C++ live grids payload (explore -> Watch live). */

/** C++ `space_initials_junk`. */
export type SpaceInitials = {
  id: string;
  name: string;
  profile_url: string;
  profile_banner_url: string;
  description: string;
  type: string; // 'event' | 'campus' | 'organization' | 'custom'
  is_system_generated: boolean;
  visibility: string; // 'public' | 'private'
  live_stream_count: number;
};

/** C++ `live_grid_payload`. */
export type LiveGridPayload = {
  status: boolean;
  data: SpaceInitials[];
};
