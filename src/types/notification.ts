/**
 * Mirrors the C++ notification structs. uint64_t ids are strings (the API client quotes 64-bit numbers while parsing, see types/feed.ts).
 * `Notification` is renamed `AppNotification` to avoid clashing with the DOM global of the same name.
 */

/** C++ `notification_ref`: what the notification points at. Use `ref_id` to fetch the full item. */
export type NotificationRef = {
  ref_id: string;
  /** What ref_id points at: 'users', 'post' or 'spaces'. Empty when there is no reference. */
  ref_table: string;
};

/** C++ `involved_user`: who triggered the notification. */
export type InvolvedUser = {
  user_id: string; // '0' when the notification has no sender
  username: string;
  display_name: string;
  profile_pic_url: string;
};

/** C++ `Notification`. */
export type AppNotification = {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  user: InvolvedUser;
  ref: NotificationRef;
};

/** C++ `notification_rtn_type`. */
export type NotificationRtnType = {
  status: boolean;
  data: AppNotification[];
};
