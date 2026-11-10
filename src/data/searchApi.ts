import type { StoreItem, UserItem } from '@/types/discovery';
import type { SpaceListSkeleton } from '@/types/feed';
import { api, ApiError } from './api/client';
import { PAGE_SIZE } from './amigosApi';

// Search answers "no matches" with 404/409, and 424 when the query itself fails server-side ("Reload").
const EMPTY = [404, 409, 424];

type UserHit = { user_id: string; username: string; display_name: string; profile_pic_url: string; bio: string; is_amigo: boolean };
type SpaceHit = { space_id: string; name: string; description?: string; type: string; profile_url: string; visibility: string; access_mode: string; participant_count?: number };
type StoreHit = { store_id: string; name: string; category: string; logo_url: string; is_open: boolean; rating: string };

const toUser = (h: UserHit): UserItem => ({
  type: 'user',
  entity_id: String(h.user_id),
  username: h.username,
  display_name: h.display_name || h.username,
  profile_pic_url: h.profile_pic_url,
  bio: h.bio ?? '',
  is_amigo: !!h.is_amigo,
  are_amigos: !!h.is_amigo,
  similarity_score: 0,
});

const toGrid = (h: SpaceHit): SpaceListSkeleton => ({
  id: String(h.space_id),
  name: h.name,
  description: h.description ?? '',
  participant_count: h.participant_count ?? null,
  access_mode: h.access_mode,
  profile_url: h.profile_url,
});

const toStore = (h: StoreHit): StoreItem => ({
  type: 'store',
  entity_id: String(h.store_id),
  name: h.name,
  category: h.category,
  logo_url: h.logo_url,
  isOpen: !!h.is_open,
  rating: Number(h.rating) || 0,
});

async function page<T>(path: string, term: string, offset = 0): Promise<T[]> {
  try {
    const { data } = await api.get<{ data?: T[] }>(path, { term, offset: String(offset), limit: String(PAGE_SIZE) });
    return data?.data ?? [];
  } catch (e) {
    if (e instanceof ApiError && EMPTY.includes(e.status)) return [];
    throw e;
  }
}

export const searchUsers = async (term: string, offset = 0) => (await page<UserHit>('/search/users', term, offset)).map(toUser);
export const searchAmigos = async (term: string, offset = 0) => (await page<UserHit>('/search/amigos', term, offset)).map(toUser);
export const searchGrids = async (term: string, offset = 0) => (await page<SpaceHit>('/search/spaces', term, offset)).map(toGrid);
export const searchStores = async (term: string, offset = 0) => (await page<StoreHit>('/search/stores', term, offset)).map(toStore);

export type SearchAll = { users: UserItem[]; grids: SpaceListSkeleton[]; stores: StoreItem[] };
export type SearchKind = 'grid' | 'store' | 'users' | 'amigos';
export const NO_RESULTS: SearchAll = { users: [], grids: [], stores: [] };

/** One page of a single kind, in the same shape as the combined search so the screen can treat both alike. */
export async function searchKind(kind: SearchKind, term: string, offset = 0): Promise<SearchAll> {
  if (kind === 'grid') return { ...NO_RESULTS, grids: await searchGrids(term, offset) };
  if (kind === 'store') return { ...NO_RESULTS, stores: await searchStores(term, offset) };
  if (kind === 'users') return { ...NO_RESULTS, users: await searchUsers(term, offset) };
  return { ...NO_RESULTS, users: await searchAmigos(term, offset) };
}

/** One call for the "All" chip: a short list of each kind. */
export async function searchAll(term: string): Promise<SearchAll> {
  try {
    const { data } = await api.get<{ users?: UserHit[]; spaces?: SpaceHit[]; stores?: StoreHit[] }>('/search/all', { term });
    return {
      users: (data?.users ?? []).map(toUser),
      grids: (data?.spaces ?? []).map(toGrid),
      stores: (data?.stores ?? []).map(toStore),
    };
  } catch (e) {
    if (e instanceof ApiError && EMPTY.includes(e.status)) return { users: [], grids: [], stores: [] };
    throw e;
  }
}
