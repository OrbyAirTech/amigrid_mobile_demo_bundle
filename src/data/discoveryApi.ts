import type { DiscoveryItem, SpaceItem, StoreItem, UserItem } from '@/types/discovery';
import type { TrendingSpace, TrendingSpacesResult } from '@/types/trending';
import { api } from './api/client';
import { getKnownBroadcasting } from './broadcastStore';

export type DiscoveryKind = 'space' | 'user' | 'store';

/** POST /engine/location/ping. Every other engine route comes back empty until the caller has a ping on file. */
export async function pingLocation(fix: { latitude: number; longitude: number; accuracy: number | null }) {
  await api.post('/engine/location/ping', {
    longitude: fix.longitude,
    latitude: fix.latitude,
    ...(fix.accuracy != null ? { accuracy_meters: fix.accuracy } : null),
    // Left out until the saved choice is known, so the server keeps following its own setting.
    ...(getKnownBroadcasting() !== undefined ? { is_broadcasting: getKnownBroadcasting() } : null),
  });
}

// ---- what the engine returns (ids + scores only) --------------------------------------------------------------

type Ranked = { entity_id: string; entity_type: string } & Record<string, unknown>;
type Neighbour = { user_id: number | string } & Record<string, unknown>;
type ResolveItem = { type: DiscoveryKind; entity_id: string } & Record<string, unknown>;
type Hydrated = Record<string, unknown> & { resolved?: boolean };

const rankedToItems = (rows: Ranked[], type: DiscoveryKind): ResolveItem[] =>
  rows.map(({ entity_type: _dropped, ...rest }) => ({ ...rest, type, entity_id: String(rest.entity_id) }));

// nearby/users is the odd one out: `user_id` (a number, and no entity_type) becomes a string `entity_id`.
const neighboursToItems = (rows: Neighbour[]): ResolveItem[] =>
  rows.map(({ user_id, ...rest }) => ({ ...rest, type: 'user', entity_id: String(user_id) }));

/**
 * POST /search/resolve_many fills in names and images and echoes every engine field straight back.
 * It is order preserving, and an id that no longer resolves comes back with `resolved: false` instead of
 * being dropped. It rejects an empty list, so that case never reaches the server.
 */
async function resolveMany(items: ResolveItem[]): Promise<Hydrated[]> {
  if (items.length === 0) return [];
  const { data } = await api.post<{ data?: Hydrated[] }>('/search/resolve_many', { items: items.slice(0, 100) });
  return (data.data ?? []).filter((h) => h.resolved !== false);
}

/** Names and photos for a list of user ids (the chat server only knows ids). Unknown ids are left out. */
export async function resolveUsers(ids: string[]): Promise<{ user_id: string; username: string; display_name: string; profile_image_url: string | null }[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const rows = await resolveMany(unique.map((id) => ({ type: 'user' as const, entity_id: id })));
  return rows.map((h) => ({
    user_id: String(h.entity_id ?? ''),
    username: typeof h.username === 'string' ? h.username : '',
    display_name: (typeof h.display_name === 'string' && h.display_name) || (typeof h.username === 'string' ? h.username : ''),
    profile_image_url: typeof h.profile_pic_url === 'string' && h.profile_pic_url ? h.profile_pic_url : null,
  }));
}

// ---- hydrated server shapes -> the shapes the cards already render ---------------------------------------------

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown, d = 0) => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : d;
};
const pos = (h: Hydrated) => {
  const latitude = typeof h.latitude === 'number' ? h.latitude : undefined;
  const longitude = typeof h.longitude === 'number' ? h.longitude : undefined;
  return latitude !== undefined && longitude !== undefined ? { latitude, longitude } : {};
};

const toSpace = (h: Hydrated): SpaceItem => ({
  type: 'space',
  entity_id: str(h.entity_id),
  name: str(h.name),
  profile_url: str(h.profile_url),
  visibility: str(h.visibility) === 'private' ? 'private' : 'public',
  access_mode: (str(h.access_mode) || 'open') as SpaceItem['access_mode'],
  geo_score: num(h.geo_score),
  social_score: num(h.social_score),
  popularity_score: num(h.popularity_score),
  temporal_score: num(h.temporal_score),
  final_score: num(h.final_score),
  neighbour_visit_count: num(h.neighbour_visit_count),
  is_member: h.is_member === true,
  ...pos(h),
});

const toUser = (h: Hydrated): UserItem => ({
  type: 'user',
  entity_id: str(h.entity_id),
  username: str(h.username),
  display_name: str(h.display_name) || str(h.username),
  profile_pic_url: str(h.profile_pic_url),
  bio: str(h.bio),
  are_amigos: h.are_amigos === true,
  is_amigo: h.are_amigos === true,
  distance_meters: num(h.distance_meters),
  // similarity_score is null until the similarity engine has scored the neighbour.
  similarity_score: num(h.similarity_score),
  shared_space_count: num(h.shared_space_count),
  ...pos(h),
});

const toStore = (h: Hydrated): StoreItem => ({
  type: 'store',
  entity_id: str(h.entity_id),
  name: str(h.name),
  category: str(h.category),
  logo_url: str(h.logo_url),
  isOpen: h.is_open === true,
  rating: num(h.rating), // the server sends the rating as text
  ...pos(h),
});

// ---- the three lists ---------------------------------------------------------------------------------------------

const radiusQuery = (radius_m: number) => ({ radius_m });

export const fetchSpaces = async (radius_m: number): Promise<SpaceItem[]> => {
  const { data } = await api.get<{ ranked?: Ranked[] }>('/engine/discover/spaces', radiusQuery(radius_m));
  return (await resolveMany(rankedToItems(data.ranked ?? [], 'space'))).map(toSpace);
};

export const fetchStores = async (radius_m: number): Promise<StoreItem[]> => {
  const { data } = await api.get<{ ranked?: Ranked[] }>('/engine/discover/stores', radiusQuery(radius_m));
  return (await resolveMany(rankedToItems(data.ranked ?? [], 'store'))).map(toStore);
};

export const fetchPeople = async (radius_m: number): Promise<UserItem[]> => {
  const { data } = await api.get<{ neighbours?: Neighbour[] }>('/engine/nearby/users', radiusQuery(radius_m));
  return (await resolveMany(neighboursToItems(data.neighbours ?? []))).map(toUser);
};

export type { DiscoveryItem };

// ---- trending + counters ------------------------------------------------------------------------------------------

/** GET /engine/trending/spaces: not personalised and already hydrated, so cards render from it directly. */
export async function fetchTrending(limit = 20): Promise<TrendingSpace[]> {
  const { data } = await api.get<TrendingSpacesResult>('/engine/trending/spaces', { offset: 0, limit });
  return data.spaces ?? [];
}

export type Counters = { live_grid_count: number; active_events_count: number };

/** GET /stream-discovery/counter: grids with a live stream, and events that have not ended yet. */
export async function fetchCounters(): Promise<Counters> {
  const { data } = await api.get<Counters>('/stream-discovery/counter', { current_time: new Date().toISOString() });
  return { live_grid_count: data.live_grid_count ?? 0, active_events_count: data.active_events_count ?? 0 };
}

// ---- card actions --------------------------------------------------------------------------------------------------

/** The server answers a refused join (closed, wrong code, ...) with HTTP 200 and `status: false`; the client turns that into an error. */
export const joinSpace = (spaceId: string, security?: string) =>
  api.put('/space/join', security ? { security } : {}, { query: { space_id: spaceId } });

export const sendAmigoRequest = (userId: string) => api.post('/amigo/send_request', undefined, { query: { id: userId } });
