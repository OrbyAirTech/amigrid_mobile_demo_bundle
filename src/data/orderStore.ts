import { useSyncExternalStore } from 'react';

import { MAX_ORDER_LINES } from '@/utils/orderToken';

/** What a shopper has picked from one store, kept in memory until it is sent to the owner. Same pattern as the other stores. */
export type OrderLine = { id: string; name: string; price: number; currency: string; thumb: string; qty: number };
export type Order = { storeId: string; storeName: string; ownerId: string; lines: OrderLine[] };

let orders: Record<string, Order> = {};
const listeners = new Set<() => void>();
const emit = (next: Record<string, Order>) => {
  orders = next;
  listeners.forEach((l) => l());
};

export const getOrder = (storeId: string): Order | undefined => orders[storeId];

export function addToOrder(store: { storeId: string; storeName: string; ownerId: string }, line: Omit<OrderLine, 'qty'>, qty = 1): boolean {
  const cur = orders[store.storeId] ?? { ...store, lines: [] };
  const at = cur.lines.findIndex((l) => l.id === line.id);
  if (at < 0 && cur.lines.length >= MAX_ORDER_LINES) return false;
  const lines = at < 0 ? [...cur.lines, { ...line, qty: Math.min(qty, 99) }] : cur.lines.map((l, i) => (i === at ? { ...l, qty: Math.min(l.qty + qty, 99) } : l));
  emit({ ...orders, [store.storeId]: { ...cur, lines } });
  return true;
}

export function setQty(storeId: string, productId: string, qty: number) {
  const cur = orders[storeId];
  if (!cur) return;
  const lines = qty < 1 ? cur.lines.filter((l) => l.id !== productId) : cur.lines.map((l) => (l.id === productId ? { ...l, qty: Math.min(qty, 99) } : l));
  const next = { ...orders };
  if (lines.length === 0) delete next[storeId];
  else next[storeId] = { ...cur, lines };
  emit(next);
}

export const clearOrder = (storeId: string) => {
  const next = { ...orders };
  delete next[storeId];
  emit(next);
};

export const clearOrders = () => emit({});

export const useOrder = (storeId: string | undefined): Order | undefined =>
  useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => (storeId ? orders[storeId] : undefined),
    () => undefined,
  );

export const orderCount = (o?: Order) => o?.lines.reduce((n, l) => n + l.qty, 0) ?? 0;
