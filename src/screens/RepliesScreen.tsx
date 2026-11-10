import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/GlassButton';
import { GlassIconButton } from '@/components/GlassIconButton';
import { GlassSurface } from '@/components/GlassSurface';
import { PostCard } from '@/components/PostCard';
import { PostQuote } from '@/components/PostQuote';
import { ReplyComposer } from '@/components/ReplyComposer';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ApiError } from '@/data/api/client';
import { useSessionUser } from '@/data/currentUserStore';
import { deletePost, fetchPost, fetchReplies, replyToPost } from '@/data/postsApi';
import { findPost, rememberPosts } from '@/data/postStore';
import { colors, radius, spacing, typography } from '@/theme';
import type { PostReturner } from '@/types/feed';
import { usePagedList } from '@/utils/usePagedList';

const TOP_BAR_H = 40;

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

/**
 * Slides in from the right (stack push) and lists the replies to one post. Replies are independent
 * posts, so each reply card carries a reference strip to the post it answers, and the original is pinned
 * at the top. A reply bar stays at the bottom; tapping Reply on a card retargets it, Telegram-style.
 */
export default function RepliesScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useSessionUser()?.id;

  // The post is usually already known from the feed; load it when opened from somewhere else.
  const [post, setPost] = useState<PostReturner | null>(() => (postId ? findPost(postId) ?? null : null));
  const [postError, setPostError] = useState<string | null>(null);
  const loadPost = useCallback(async () => {
    if (!postId) return;
    try {
      const p = await fetchPost(postId);
      setPost(p);
      rememberPosts([p]);
      setPostError(null);
    } catch (e) {
      setPostError(e instanceof ApiError && e.status !== 404 ? e.message : 'This post is unavailable.');
    }
  }, [postId]);
  useEffect(() => {
    if (!post) loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const replies = usePagedList<PostReturner>(useCallback((offset: number) => fetchReplies(postId ?? '', offset), [postId]), postId ?? '');
  useEffect(() => {
    rememberPosts(replies.items);
  }, [replies.items]);

  const [target, setTarget] = useState<PostReturner | null>(null); // null = the page's own post

  const composeTarget = target ?? post;
  const bottomBar = insets.bottom + spacing.sm;

  const send = async (text: string) => {
    if (!composeTarget || !post) return;
    try {
      await replyToPost(composeTarget.id, text, post.space_id ?? null);
      setTarget(null);
      await replies.refresh();
    } catch (e) {
      Alert.alert('Couldn’t send reply', e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    }
  };

  const confirmDelete = (p: PostReturner) =>
    Alert.alert('Delete this reply?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(p.id);
            replies.setItems((cur) => cur.filter((x) => x.id !== p.id));
          } catch (e) {
            Alert.alert('Couldn’t delete', e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
          }
        },
      },
    ]);

  const openReplies = (p: PostReturner) => router.push({ pathname: '/replies', params: { postId: p.id } });

  return (
    <View style={styles.root}>
      <ScreenBackground />

      {post ? (
        <FlatList
          data={replies.items}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PostCard post={item} quote={post} onReply={setTarget} onOpenReplies={openReplies} onMore={me && item.author_id === me ? confirmDelete : undefined} />
          )}
          refreshControl={<RefreshControl refreshing={replies.refreshing} onRefresh={replies.refresh} tintColor={colors.ink} progressViewOffset={insets.top + spacing.sm + TOP_BAR_H} />}
          onEndReached={replies.loadMore}
          onEndReachedThreshold={0.5}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            <View style={styles.header}>
              <PostQuote post={post} variant="pinned" />
              <Text style={[typography.caption, styles.count]}>
                {replies.items.length === 1 ? '1 REPLY' : `${replies.items.length}${replies.items.length >= 30 && !replies.loadingMore ? '+' : ''} REPLIES`}
              </Text>
            </View>
          }
          ListEmptyComponent={
            replies.loading ? (
              <ActivityIndicator color={colors.ink} style={styles.empty} />
            ) : replies.error ? (
              <View style={styles.empty}>
                <Text style={[typography.body, styles.emptyText]}>{replies.error}</Text>
                <GlassButton label="Try again" size="sm" variant="primary" onPress={replies.reload} style={{ minWidth: 140 }} />
              </View>
            ) : (
              <Text style={[typography.body, styles.emptyText, styles.empty]}>No replies yet. Be the first to reply.</Text>
            )
          }
          contentContainerStyle={{
            paddingTop: insets.top + spacing.sm + TOP_BAR_H + spacing.md,
            paddingBottom: bottomBar + 150,
            paddingHorizontal: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <View style={[styles.empty, { marginTop: insets.top + 120 }]}>
          {postError ? <Text style={[typography.body, styles.emptyText]}>{postError}</Text> : <ActivityIndicator color={colors.ink} />}
        </View>
      )}

      {/* Floating header: back button + title, hovering over the replies. */}
      <View style={[styles.topBar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <GlassIconButton icon="arrow-left" label="Back" tone="floating" size={TOP_BAR_H} onPress={() => router.back()} />
        <GlassSurface tone="floating" radius={radius.pill} raised contentStyle={styles.titlePill}>
          <Text style={[typography.cardTitle, styles.title]}>Replies</Text>
        </GlassSurface>
      </View>

      {composeTarget ? (
        <ReplyComposer
          key={composeTarget.id}
          target={composeTarget}
          mode="post"
          autoFocus={target != null}
          bottomOffset={bottomBar}
          onCancel={target ? () => setTarget(null) : undefined}
          onSend={send}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  count: { color: colors.textMuted, letterSpacing: 0.6, marginLeft: spacing.xs },
  empty: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  topBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titlePill: { height: TOP_BAR_H - 2, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: 15, lineHeight: 20 },
});
