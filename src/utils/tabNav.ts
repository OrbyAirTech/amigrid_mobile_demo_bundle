import type { useRouter } from 'expo-router';

/**
 * Order of the top-level screens. Profile isn't in the bottom nav: it's opened from the top-left avatar.
 * Screen transitions are switched off app-wide for now (see app/_layout), so this is only the list of
 * routes. Keep it: direction-aware transitions can come back by reading the indexes here.
 */
export const TAB_ORDER = ['profile', 'map', 'feed', 'search', 'activity'] as const;
export type TabKey = (typeof TAB_ORDER)[number];

const ROUTES = {
  profile: '/profile',
  map: '/map',
  feed: '/feed',
  search: '/search',
  activity: '/activity',
} as const;

export const isTabRoute = (name: string): name is TabKey => (TAB_ORDER as readonly string[]).includes(name);

/** Switch to another top-level screen (no transition animation). */
export function navigateTab(router: ReturnType<typeof useRouter>, from: TabKey | string, to: TabKey) {
  if (from === to) return;
  router.replace(ROUTES[to]);
}
