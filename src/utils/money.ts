/** "GHS 120" or "GHS 12.50". Whole amounts drop the decimals, like the store screens. */
export const formatMoney = (amount: number, currency: string) =>
  `${currency ? currency + ' ' : ''}${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;

/** One total per currency, so a mixed order never adds unlike amounts together. */
export function totalsOf(lines: Array<{ price: number; currency: string; qty: number }>): string {
  const by = new Map<string, number>();
  lines.forEach((l) => by.set(l.currency, (by.get(l.currency) ?? 0) + l.price * l.qty));
  return [...by].map(([c, v]) => formatMoney(Math.round(v * 100) / 100, c)).join(' + ');
}
