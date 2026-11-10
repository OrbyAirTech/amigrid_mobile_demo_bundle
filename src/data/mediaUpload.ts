import type { PickedFile } from '@/utils/media';
import { DEMO } from '@/config/env';
import { api, ApiError } from './api/client';

/**
 * Uploads a picked file straight to S3 and hands back the final `media_url` that goes into the chat message.
 *   1. POST /post/presign_url?upload_action=CHAT_UPLOAD asks Core for a signed PUT url
 *   2. PUT the file bytes to it (progress comes from the request)
 *   3. the caller sends the chat message with the returned url (and a label as `message`)
 */
export async function uploadChatMedia(file: PickedFile, onProgress: (p: number) => void): Promise<string> {
  const { data } = await api.post<{ fileUrl?: string[]; uploadUrl?: string[] }>(
    '/post/presign_url',
    { filenames: [file.name] },
    { query: { upload_action: 'CHAT_UPLOAD' } },
  );
  const uploadUrl = data.uploadUrl?.[0];
  const fileUrl = data.fileUrl?.[0];
  if (!uploadUrl || !fileUrl) throw new ApiError('Could not prepare the upload. Try again.', 500);

  if (DEMO) {
    onProgress(1);
    return file.uri;
  }

  const blob = await (await fetch(file.uri)).blob();
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.mime);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ApiError('The upload was rejected. Try again.', xhr.status)));
    xhr.onerror = () => reject(new ApiError('The upload failed. Check your connection and try again.', 0));
    xhr.send(blob);
  });
  onProgress(1);
  return fileUrl;
}
