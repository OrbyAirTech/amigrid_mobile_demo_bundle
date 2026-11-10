import type { PostReturner } from '@/types/feed';
import { api } from './api/client';
import { readPage } from './amigosApi';
import { uploadFile } from './uploadApi';

// ---- reading --------------------------------------------------------------------------------------------------

/** Posts from your amigos (the Local feed). Top-level posts that aren't in a grid. */
export const fetchAmigoFeed = (offset: number) => readPage<PostReturner>('/post/amigo_feed', offset);

/** A grid's feed: top-level posts made in that grid. */
export const fetchGridFeed = (spaceId: string, offset: number) => readPage<PostReturner>('/post/space', offset, { space_id: spaceId });

/** Replies to a post, oldest first. A reply is itself a post whose parent_post_id is the post it answers. */
export const fetchReplies = async (postId: string, offset: number) =>
  (await readPage<PostReturner>('/post/get_reply', offset, { parent_post_id: postId })).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

export const fetchPost = async (postId: string) => (await api.get<PostReturner>('/post', { post_id: postId })).data;

// ---- writing --------------------------------------------------------------------------------------------------

export type NewPost = {
  content: string;
  /** Set for a post made inside a grid; leave out for a post to your amigos. */
  spaceId?: string;
  mediaUrls?: string[];
  location?: { latitude: number; longitude: number };
};

/**
 * POST /post/makePost. The server doesn't send the new post back, so callers reload the feed afterwards.
 * Grid posts are 'space-only'; posts to amigos are 'public' (they show in amigos' Local feeds).
 */
export const createPost = (p: NewPost) =>
  api.post('/post/makePost', {
    content: p.content,
    visibility: p.spaceId ? 'space-only' : 'public',
    ...(p.spaceId ? { space_id: p.spaceId } : null),
    ...(p.mediaUrls?.length ? { mediaUrls: p.mediaUrls } : null),
    ...(p.location ? { location: p.location } : null),
  });

/**
 * POST /post/reply. The reply route reads every key, so all four are always sent (null when unused).
 * `postId` is the post (or reply) being answered.
 */
export const replyToPost = (postId: string, content: string, spaceId?: string | null) =>
  api.post('/post/reply', { content, space_id: spaceId ?? null, media_url: null, location: null }, { query: { post_id: postId } });

export const likePost = (postId: string) => api.post('/post/like', undefined, { query: { post_id: postId } });
export const unlikePost = (postId: string) => api.post('/post/unlike', undefined, { query: { post_id: postId } });
export const deletePost = (postId: string) => api.del('/post/delete', { query: { post_id: postId } });

/** Uploads one picked image for a post and returns its URL. */
export const uploadPostImage = (uri: string, filename: string, mime: string) => uploadFile('POST', uri, filename, mime);
