import type { DiscoveryItem } from '@/types/discovery';

export type LatLng = { latitude: number; longitude: number };

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

const valid = (lat: number | null, lng: number | null): LatLng | null =>
  lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)
    ? { latitude: lat, longitude: lng }
    : null;

/**
 * Pulls a map position off a hydrated item. The backend has used both flat fields and a nested
 * `location` object elsewhere (posts send `location: {longitude, latitude}`), so both are accepted.
 * Returns null when the item carries no usable coordinates, which just means it isn't plotted.
 */
export function getCoords(item: DiscoveryItem): LatLng | null {
  const o = item as unknown as Record<string, unknown>;
  const loc = (o.location ?? o.coordinates) as Record<string, unknown> | undefined;
  return (
    valid(num(o.latitude), num(o.longitude)) ??
    valid(num(o.lat), num(o.lng ?? o.lon)) ??
    (loc ? valid(num(loc.latitude ?? loc.lat), num(loc.longitude ?? loc.lng ?? loc.lon)) : null)
  );
}
