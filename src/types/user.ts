/** Signed-in user's header summary (profile picture + the counts shown on the corner buttons). */
export type CurrentUserSummary = {
  id: number;
  username: string;
  display_name: string;
  profile_image?: string | null;
  notification_count: number; // unread notifications
  settings_prompt_count: number; // pending profile / settings prompts (e.g. "verify email")
  unread_message_count: number; // unread DMs, shown on the messages button
};
