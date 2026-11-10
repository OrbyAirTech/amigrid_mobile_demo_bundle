import type { GrandFinalEvent } from '@/types/events';
import type { SpaceInitials } from '@/types/live';
import { api, ApiError } from './api/client';
import { readPage } from './amigosApi';

// These discovery routes answer "nothing here" with HTTP 409 and `status: false`.
const EMPTY = [404, 409];

/** Events that haven't finished yet, soonest first, with the hosting grid and who created them. */
export const fetchEvents = (offset: number) =>
  readPage<GrandFinalEvent>('/stream-discovery/event-discovery', offset, { current_time: new Date().toISOString() }, EMPTY);

/** Grids with at least one live stream right now, most recently started first. */
export const fetchLiveGrids = (offset: number) => readPage<SpaceInitials>('/stream-discovery/grid-on-live', offset, {}, EMPTY);

/** How many events a grid has that haven't finished yet. */
export async function fetchGridEventCount(gridId: string): Promise<number> {
  try {
    const { data } = await api.get<{ count_value?: number }>('/stream-discovery/grid_event_count', {
      grid_id: gridId,
      current_time: new Date().toISOString(),
    });
    return data?.count_value ?? 0;
  } catch (e) {
    if (e instanceof ApiError && EMPTY.includes(e.status)) return 0;
    throw e;
  }
}
