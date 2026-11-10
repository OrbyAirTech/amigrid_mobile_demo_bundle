import type { AttachmentKind, ChatAttachment, ChatMessageView } from '@/types/chat';

/** A file chosen or recorded on this device, before it is uploaded. */
export type PickedFile = {
  uri: string;
  name: string;
  mime: string;
  kind: AttachmentKind;
  size?: number;
  durationSec?: number;
};

/** Assumed client-side cap. The server has not stated a limit; confirm it and change this one number. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const EXT: Record<string, AttachmentKind> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', heic: 'image', heif: 'image',
  mp4: 'video', mov: 'video', m4v: 'video', webm: 'video', '3gp': 'video',
  m4a: 'audio', mp3: 'audio', aac: 'audio', wav: 'audio', ogg: 'audio', caf: 'audio', opus: 'audio',
};

const pathOf = (url: string) => url.split('?')[0].split('#')[0];
export const nameFromUrl = (url: string) => decodeURIComponent(pathOf(url).split('/').pop() ?? '') || 'file';
export const kindFromName = (name: string): AttachmentKind => EXT[(name.split('.').pop() ?? '').toLowerCase()] ?? 'document';

/** Kind and name from a bare media_url, which is all the chat server gives us. */
export const inferAttachment = (url: string): ChatAttachment => {
  const name = nameFromUrl(url);
  return { kind: kindFromName(name), name };
};

export const attachmentOf = (m: ChatMessageView): ChatAttachment | null =>
  m.media_url ? (m.attachment ?? inferAttachment(m.media_url)) : null;

/**
 * The server requires non-empty `message` text even for media-only sends, so attachments carry a short label.
 * The bubble hides the text when it is just this label.
 */
export const attachmentLabel = (a: ChatAttachment) =>
  a.kind === 'image' ? 'Photo' : a.kind === 'video' ? 'Video' : a.kind === 'audio' ? 'Voice note' : `Document: ${a.name ?? 'file'}`;

export const isLabelOnly = (message: string, a: ChatAttachment) => message.trim() === attachmentLabel(a);

export const formatBytes = (n?: number) => {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatDuration = (sec?: number) => {
  if (sec == null || !Number.isFinite(sec)) return '';
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
