import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/** Open a grid's feed (the Feed screen, straight into that grid). */
export const openGridFeed = (router: Router, gridId: string) =>
  router.push({ pathname: '/feed', params: { gridId } });

/** Open a grid's profile page. */
export const openGridProfile = (router: Router, gridId: string) =>
  router.push({ pathname: '/grid-profile', params: { id: gridId } });

/** Open a grid's participants list. */
export const openGridMembers = (router: Router, gridId: string) =>
  router.push({ pathname: '/grid-members', params: { id: gridId } });
