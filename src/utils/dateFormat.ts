/** Lenient parse: ISO and Postgres-style "2026-10-15 09:00:00+00". Returns NaN when unparseable. */
export function parseTime(value: string): number {
  let s = value.trim().replace(' ', 'T');
  if (/[+-]\d{2}$/.test(s)) s += ':00'; // Hermes is strict
  return Date.parse(s);
}

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** "6:00 PM" */
export const formatClock = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** "Today", "Tomorrow", or "Wed, Oct 21". */
export function dayLabel(t: number, now: number = Date.now()): string {
  const diff = Math.round((startOfDay(t) - startOfDay(now)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return new Date(t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Calendar-day key, for grouping. */
export const dayKey = (t: number) => startOfDay(t);

/** { month: 'OCT', day: 20 } for the date tile. */
export function dateTile(t: number) {
  const d = new Date(t);
  return { month: d.toLocaleDateString([], { month: 'short' }).toUpperCase(), day: d.getDate() };
}

/** "Mar 2026" */
export function formatMonthYear(value: string): string {
  const t = parseTime(value);
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleDateString([], { month: 'short', year: 'numeric' });
}

/** "in 3h" / "in 25m" for upcoming starts within a day, else ''. */
export function startsIn(start: number, now: number = Date.now()): string {
  const min = Math.round((start - now) / 60_000);
  if (min <= 0 || min >= 24 * 60) return '';
  return min < 60 ? `in ${min}m` : `in ${Math.floor(min / 60)}h`;
}

/** Time left on a chat session: "5h left", "40m left" or "Expired". `hours` is the whole-hour count (for urgency styling). */
export function expiresIn(expiresAt: string, now: number = Date.now()): { label: string; hours: number } {
  const t = parseTime(expiresAt);
  if (Number.isNaN(t)) return { label: '', hours: Infinity };
  const min = Math.round((t - now) / 60_000);
  if (min <= 0) return { label: 'Expired', hours: 0 };
  if (min < 60) return { label: `${min}m left`, hours: 0 };
  const h = Math.floor(min / 60);
  return { label: `${h}h left`, hours: h };
}
