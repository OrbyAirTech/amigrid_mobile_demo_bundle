import { DEMO } from '@/config/env';
import { api, ApiError } from './api/client';

/** The keys the server's presign route knows. Upper case: the route builds the storage path from it. */
export type UploadAction = 'PROFILE_PHOTO' | 'POST' | 'CHAT_UPLOAD' | 'STORE_UPLOAD' | 'STORE_PROFILE';

/**
 * Uploads one local file and returns the public URL to store on the record.
 * Presign (POST /post/presign_url) -> PUT the bytes to the signed URL -> use the returned fileUrl.
 */
export async function uploadFile(action: UploadAction, uri: string, filename: string, mime: string): Promise<string> {
  const { data } = await api.post<{ fileUrl: string[]; uploadUrl: string[] }>(
    '/post/presign_url',
    { filenames: [filename] },
    { query: { upload_action: action } },
  );
  const uploadUrl = data.uploadUrl?.[0];
  const fileUrl = data.fileUrl?.[0];
  if (!uploadUrl || !fileUrl) throw new ApiError('Could not prepare the upload. Try again.', 500);

  // Demo mode keeps the picked file on the device and uses it as-is.
  if (DEMO) return uri;

  const blob = await (await fetch(uri)).blob();
  let put: Response;
  try {
    put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mime }, body: blob });
  } catch {
    throw new ApiError('The upload failed. Check your connection and try again.', 0);
  }
  if (!put.ok) throw new ApiError('The upload was rejected. Try again.', put.status);
  return fileUrl;
}
