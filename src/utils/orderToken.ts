/**
 * An order request travels as a chat message: "Order request · AGO1.<code>". The code holds the store, the
 * product ids with quantities and an optional note, so it stays short and the store owner's phone looks the
 * products up for current names and prices. Core has no checkout yet; this is the stand-in.
 */
export type OrderToken = { store: string; items: Array<{ id: string; qty: number }>; note: string };

const PREFIX = 'AGO1.';
const LEAD = 'Order request · ';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function utf8(s: string): number[] {
  const out: number[] = [];
  for (const m of encodeURIComponent(s).match(/%[0-9A-F]{2}|[^%]/gi) ?? []) out.push(m.length === 3 ? parseInt(m.slice(1), 16) : m.charCodeAt(0));
  return out;
}
function fromUtf8(b: number[]): string {
  return decodeURIComponent(b.map((x) => '%' + x.toString(16).padStart(2, '0')).join(''));
}
function b64(bytes: number[]): string {
  let o = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    o += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '') + (i + 2 < bytes.length ? B64[n & 63] : '');
  }
  return o;
}
function unb64(s: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 4) {
    const v = [0, 1, 2, 3].map((k) => (i + k < s.length ? B64.indexOf(s[i + k]) : -2));
    if (v[0] < 0 || v[1] < 0 || v.some((x) => x === -1)) throw new Error('bad code');
    out.push(((v[0] << 2) | (v[1] >> 4)) & 255);
    if (v[2] >= 0) out.push(((v[1] << 4) | (v[2] >> 2)) & 255);
    if (v[3] >= 0) out.push(((v[2] << 6) | v[3]) & 255);
  }
  return out;
}

export const MAX_ORDER_LINES = 10;
export const MAX_NOTE = 140;

export function encodeOrder(o: OrderToken): string {
  const json = JSON.stringify({ s: o.store, i: o.items.map((x) => [x.id, x.qty]), n: o.note.slice(0, MAX_NOTE) });
  return PREFIX + b64(utf8(json));
}

export function decodeOrder(token: string): OrderToken | null {
  try {
    if (!token.startsWith(PREFIX)) return null;
    const j = JSON.parse(fromUtf8(unb64(token.slice(PREFIX.length)))) as { s?: unknown; i?: unknown; n?: unknown };
    if (typeof j.s !== 'string' || !Array.isArray(j.i) || j.i.length === 0 || j.i.length > MAX_ORDER_LINES) return null;
    const items = j.i.map((r) => {
      const [id, qty] = r as [unknown, unknown];
      if (typeof id !== 'string' || !/^\d+$/.test(id) || typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > 99) throw new Error('bad line');
      return { id, qty };
    });
    return { store: j.s, items, note: typeof j.n === 'string' ? j.n.slice(0, MAX_NOTE) : '' };
  } catch {
    return null;
  }
}

/** The chat message that carries an order. */
export const orderMessage = (o: OrderToken) => LEAD + encodeOrder(o);

/** The token inside a chat message, or null when the message is ordinary text. */
export function orderTokenOf(message: string | undefined): string | null {
  if (!message?.startsWith(LEAD)) return null;
  const t = message.slice(LEAD.length).trim();
  return decodeOrder(t) ? t : null;
}

/** What a chat list shows for an order message. */
export const orderPreview = (message: string | undefined) => (orderTokenOf(message) ? 'Order request' : message ?? '');
