import type { AmigoUser } from '@/types/grid';
import { api, ApiError } from './api/client';

export const PAGE_SIZE = 30;

/** A pending request someone sent to the signed-in user. */
export type AmigoRequest = AmigoUser & { request_id: string; requested_at: string };

/**
 * Reads one page of a list route. The server answers an empty list with 404 (and some space lists with
 * 409), so those count as "nothing here" rather than a failure. Offset and limit must always be sent.
 */
export async function readPage<T>(path: string, offset: number, query: Record<string, string> = {}, emptyStatuses: number[] = [404]): Promise<T[]> {
  try {
    const { data } = await api.get<{ data?: T[] }>(path, { ...query, offset: String(offset), limit: String(PAGE_SIZE) });
    return data?.data ?? [];
  } catch (e) {
    if (e instanceof ApiError && emptyStatuses.includes(e.status)) return [];
    throw e;
  }
}

/** Reads pages until one comes back short, up to `maxPages`. For small lists the screen needs in full. */
export async function readAll<T>(page: (offset: number) => Promise<T[]>, maxPages = 5): Promise<T[]> {
  const all: T[] = [];
  for (let i = 0; i < maxPages; i++) {
    const rows = await page(i * PAGE_SIZE);
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}

/** Your amigos, or another person's when `userId` is given (Core: GET /amigo?id=). */
export const fetchAmigos = (offset: number, userId?: string) => readPage<AmigoUser>('/amigo', offset, userId ? { id: userId } : {});
export const fetchAmigoRequests = (offset: number) => readPage<AmigoRequest>('/amigo/get_request', offset);

export const unfriend = (userId: string) => api.post('/amigo/unfriend', undefined, { query: { id: userId } });
export const acceptRequest = (requestId: string) => api.put('/amigo/accept_amigo', undefined, { query: { request_id: requestId } });
/** Declines a request someone sent you (the same route cancels one you sent). */
export const declineRequest = (requestId: string) => api.del('/amigo/cancel_request', { query: { request_id: requestId } });
