import { useSyncExternalStore } from 'react';

import type { PostReturner } from '@/types/feed';
import { getSessionUser } from './currentUserStore';

/**
 * A small shared set of posts the screens have loaded, so a post opened from the feed is already known on
 * the replies page and a reply or moment posted from one place shows up in the other. It is only a cache:
 * the lists themselves come from the API (see postsApi) and are reloaded after a post is made.
 */
let posts: PostReturner[] = [];
const listeners = new Set<() => void>();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnapshot = () => posts;

/** Adds or refreshes posts by id. */
export function rememberPosts(list: PostReturner[]) {
  if (list.length === 0) return;
  const byId = new Map(posts.map((p) => [p.id, p]));
  list.forEach((p) => byId.set(p.id, p));
  posts = [...byId.values()];
  listeners.forEach((l) => l());
}

export const addPost = (post: PostReturner) => rememberPosts([post]);
export const usePosts = (): PostReturner[] => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
export const findPost = (id: string) => posts.find((p) => p.id === id);

export function clearPosts() {
  posts = [];
  listeners.forEach((l) => l());
}

/** A post authored by the signed-in user, for showing straight away (e.g. a captured live moment). */
export function createPost(partial: Partial<PostReturner> & { content: string }): PostReturner {
  const me = getSessionUser();
  const now = new Date().toISOString();
  return {
    status: true,
    id: `local-${Date.now()}`,
    author_id: me?.id ?? '',
    author_username: me?.username ?? '',
    author_display_name: me?.display_name ?? '',
    author_profile_image: me?.profile_image ?? null,
    is_reply: false,
    media_urls: [],
    view_count: 0,
    like_count: 0,
    visibility: 'public',
    created_at: now,
    updated_at: now,
    ...partial,
  };
}
