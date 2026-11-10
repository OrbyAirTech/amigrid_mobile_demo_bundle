import type { AppNotification } from '@/types/notification';

export type NotificationSection = { title: string; data: AppNotification[] };

// Same lenient parsing as utils/time: accepts ISO and Postgres-style "2026-10-15 09:00:00+00".
function toTime(createdAt: string): number {
  let s = createdAt.trim().replace(' ', 'T');
  if (/[+-]\d{2}$/.test(s)) s += ':00';
  return Date.parse(s);
}

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Age buckets, by calendar day, in the order they are shown. */
const BUCKETS: { title: string; maxDays: number }[] = [
  { title: 'Today', maxDays: 0 },
  { title: 'Yesterday', maxDays: 1 },
  { title: 'This week', maxDays: 6 },
  { title: 'This month', maxDays: 29 },
  { title: 'Earlier', maxDays: Infinity },
];

/** Splits notifications into Instagram-style groups (Today, Yesterday, This week, This month, Earlier), newest first. */
export function groupNotifications(items: AppNotification[], now: number = Date.now()): NotificationSection[] {
  const today = startOfDay(now);
  const sorted = [...items].sort((a, b) => (toTime(b.createdAt) || 0) - (toTime(a.createdAt) || 0));
  const sections: NotificationSection[] = BUCKETS.map((b) => ({ title: b.title, data: [] }));

  for (const n of sorted) {
    const t = toTime(n.createdAt);
    const days = Number.isNaN(t) ? Infinity : Math.max(0, Math.round((today - startOfDay(t)) / 86_400_000));
    const i = BUCKETS.findIndex((b) => days <= b.maxDays);
    sections[i].data.push(n);
  }
  return sections.filter((s) => s.data.length > 0);
}
