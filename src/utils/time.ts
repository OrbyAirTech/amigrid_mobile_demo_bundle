/** "12m ago" style label. Accepts ISO strings and Postgres-style "2026-10-15 09:00:00+00". */
export function timeAgo(createdAt: string, now: number = Date.now()): string {
  let s = createdAt.trim().replace(' ', 'T');
  if (/[+-]\d{2}$/.test(s)) s += ':00'; // "+00" -> "+00:00" (Hermes is strict)
  const t = Date.parse(s);
  if (Number.isNaN(t)) return '';
  const sec = Math.max(0, Math.floor((now - t) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return `${Math.floor(day / 7)}w ago`;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}
