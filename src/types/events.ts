/** Mirrors the C++ grid events payload (explore -> Events today). Timestamps are ISO or Postgres-style strings. */

/** C++ `event`. */
export type GridEventDetails = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

/** C++ `space` (the grid hosting the event). */
export type EventSpace = {
  space_id: string;
  space_name: string;
  space_profile_url: string;
  space_description: string;
  space_type: string;
  space_is_system_generated: boolean;
  visibility: string;
};

/** C++ `creator` (events flavour). */
export type EventCreator = {
  creator_id: string;
  creator_username: string;
  creator_display_name: string;
  creator_profile_pic_url: string;
};

/** C++ `grand_final_event`. */
export type GrandFinalEvent = {
  event_details: GridEventDetails;
  space_details: EventSpace;
  creator_details: EventCreator;
};

/** C++ `grid_events_payload`. */
export type GridEventsPayload = {
  status: boolean;
  data: GrandFinalEvent[];
};
