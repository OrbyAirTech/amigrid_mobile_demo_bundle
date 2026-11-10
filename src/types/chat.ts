/**
 * Mirrors the OrbyAir chat server contract (1:1, ephemeral). Fields marked "UI" exist only on the client.
 * Ids are opaque strings; a chat id is the two user ids sorted and joined with "_".
 */

export type ChatStatus = 'requested' | 'active' | 'rejected' | 'none';

/** GET /chat/list -> last_message. */
export type ChatLastMessage = {
  message_id: string;
  from: string;
  to: string;
  message: string;
  read: boolean;
  timestamp: string;
};

/** A chat session (GET /chat/list, and the raw docs in GET /chat/request). */
export type ChatSession = {
  chat_id: string;
  participants: [string, string];
  pinned: boolean;
  status: ChatStatus;
  last_activity: string;
  expires_at: string; // sessions and messages expire 24h after creation
  last_message: ChatLastMessage | null;
  /** Who sent the talk request. Needed to tell incoming from outgoing; confirm the real field name on integration. */
  requested_by?: string;
};

/** Delivery state of a message the user sent. UI only. */
export type SendState = 'pending' | 'sent' | 'queued' | 'failed';

/** GET /chat/history/:chatId item. */
export type ChatMessage = {
  _id: string;
  chat_id: string;
  from: string;
  to: string;
  message: string;
  media_url?: string | null;
  post_id?: string | null;
  read: boolean;
  timestamp: string;
};

export type AttachmentKind = 'image' | 'video' | 'audio' | 'document';

/**
 * What the app knows about an attachment. The chat server only stores `media_url`, so for messages that come
 * from the server the kind and name are inferred from the URL (utils/media.ts). Messages sent from this device
 * also carry the picked file's name, size and duration. UI only.
 */
export type ChatAttachment = { kind: AttachmentKind; name?: string; size?: number; durationSec?: number; mime?: string };

export type ChatMessageView = ChatMessage & {
  state?: SendState;
  attachment?: ChatAttachment;
  /** 0..1 while the file is uploading to S3 (before the message is sent). UI only. */
  uploadProgress?: number;
  /** The first message of a talk request, shown before the request is accepted. Dropped once real history loads. UI only. */
  preview?: boolean;
};

/** The chat server only sends ids, so names and photos come from a directory. */
export type ChatUser = {
  user_id: string;
  username: string;
  display_name: string;
  profile_image_url?: string | null;
};

export type ThemePreference = 'light' | 'dark' | 'system';

/** GET/PUT /chat/settings. */
export type ChatSettings = {
  allow_read_receipts: boolean;
  show_online_status: boolean;
  mute_all_notifications: boolean;
  show_message_preview: boolean;
  theme_preference: ThemePreference;
};
