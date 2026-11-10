import { api } from './api/client';
import { PAGE_SIZE } from './amigosApi';

/** One event as the /event routes return it (flat, with the grid's name and picture and a live flag). */
export type GridEvent = {
  event_id: string;
  space_id: string;
  space_name: string;
  space_profile_url: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  is_live: boolean;
  live_stream_id: string | null;
};

type EventsPage = { events?: GridEvent[] };

async function eventsPage(path: string, offset: number, query: Record<string, string>): Promise<GridEvent[]> {
  const { data } = await api.get<EventsPage>(path, { ...query, offset: String(offset), limit: String(PAGE_SIZE) });
  return data?.events ?? [];
}

/** A grid's events: scope 'upcoming' (not finished, soonest first) or 'past'. Only visible to members for private grids. */
export const fetchGridEvents = (spaceId: string, scope: 'upcoming' | 'past', offset: number) =>
  eventsPage('/event/space', offset, { space_id: spaceId, scope });

/** Upcoming events in grids you can see (public grids, and private ones you belong to). */
export const fetchUpcomingEvents = (offset: number) => eventsPage('/event/upcoming', offset, {});

/**
 * Creates an event. Only the grid's owner or an admin can. Times must be ISO-8601 with a zone
 * (e.g. new Date().toISOString()); the server allows up to 7 days long and 1 year ahead.
 */
export const createEvent = (spaceId: string, title: string, startsAt: Date, endsAt: Date) =>
  api.post('/event/create', { title, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() }, { query: { space_id: spaceId } });

export const deleteEvent = (eventId: string) => api.del('/event/delete', { query: { event_id: eventId } });
