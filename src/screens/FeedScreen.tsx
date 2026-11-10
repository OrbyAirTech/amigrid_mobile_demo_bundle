import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { FloatingPostButton } from '@/components/FloatingPostButton';
import { GlassButton } from '@/components/GlassButton';
import { GlassIconButton } from '@/components/GlassIconButton';
import { GlassSurface } from '@/components/GlassSurface';
import { GoLiveButton } from '@/components/GoLiveButton';
import { GridListItem } from '@/components/GridListItem';
import { HEADER_BUTTON_SIZE, HeaderProfileButton } from '@/components/HeaderProfileButton';
import { HeaderMessagesButton } from '@/components/HeaderMessagesButton';
import { NavTabBar } from '@/components/NavTabBar';
import { LiveStrip } from '@/components/LiveStrip';
import { PostComposer, type PostDraft } from '@/components/PostComposer';
import { ReplyComposer, type ReplyMode } from '@/components/ReplyComposer';
import { ScreenBackground } from '@/components/ScreenBackground';
import { SegmentedToggle } from '@/components/SegmentedToggle';
import { PostCard } from '@/components/PostCard';
import { ApiError } from '@/data/api/client';
import { useSessionUser } from '@/data/currentUserStore';
import { fetchAdmins, fetchGrid } from '@/data/gridsApi';
import { refreshMyGrids, useMyGrids } from '@/data/myGridsStore';
import { createPost, deletePost, fetchAmigoFeed, fetchGridFeed, replyToPost, uploadPostImage } from '@/data/postsApi';
import { rememberPosts } from '@/data/postStore';
import { useMyActiveStream } from '@/data/streamStore';
import { colors, navOccupied, radius, spacing, typography } from '@/theme';
import type { PostReturner, SpaceListSkeleton } from '@/types/feed';
import type { SpaceData } from '@/types/grid';
import { openGridProfile } from '@/utils/gridNav';
import { getCurrentFix } from '@/utils/locationPermission';
import { usePagedList } from '@/utils/usePagedList';

type Mode = 'grid' | 'local';
type ReplyState = { post: PostReturner; mode: ReplyMode } | null;

const TOP_BAR_H = HEADER_BUTTON_SIZE;
// Inside a grid the bar shrinks: smaller back button and grid pill.
const GRID_BAR_H = 40;
// Room under the last post for the floating "+" button (the floating nav bar is added on top of this).
const FAB_SPACE = 58 + 24;

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const toSkeleton = (g: SpaceData): SpaceListSkeleton => ({
  id: g.id,
  name: g.name,
  description: g.description,
  participant_count: g.space_participant_count,
  access_mode: g.access_mode,
  profile_url: g.profile_url,
});

const errText = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Try again.');

/**
 * A live feed: one page at a time, pull to refresh, and the composer on top. A reply is an independent post
 * that lives on its original's replies page (the Replies button), so only top-level posts are listed here.
 */
function PostList({
  fetchPage,
  resetKey,
  placeholder,
  topPad,
  bottomPad,
  emptyText,
  onReply,
  onOpenReplies,
  spaceId,
  listRef,
}: {
  fetchPage: (offset: number) => Promise<PostReturner[]>;
  resetKey: string;
  placeholder: string;
  topPad: number;
  bottomPad: number;
  emptyText: string;
  onReply: (post: PostReturner) => void;
  onOpenReplies: (post: PostReturner) => void;
  /** Inside a grid's feed: posts go to that grid and its live streams are pinned under the composer. */
  spaceId?: string;
  listRef: React.RefObject<FlatList<PostReturner> | null>;
}) {
  const router = useRouter();
  const me = useSessionUser()?.id;
  const list = usePagedList<PostReturner>(fetchPage, resetKey);
  const roots = useMemo(() => list.items.filter((p) => p.parent_post_id == null), [list.items]);

  useEffect(() => {
    rememberPosts(list.items);
  }, [list.items]);

  const onSpace = (p: PostReturner) => {
    if (p.space_id != null) openGridProfile(router, String(p.space_id));
  };

  const create = async (d: PostDraft) => {
    try {
      const mediaUrls = await Promise.all(d.images.map((i) => uploadPostImage(i.uri, i.name, i.mime)));
      let location: { latitude: number; longitude: number } | undefined;
      if (d.withLocation) {
        const fix = await getCurrentFix();
        if (!fix) throw new ApiError('Allow location access to tag your post.', 0);
        location = { latitude: fix.latitude, longitude: fix.longitude };
      }
      await createPost({ content: d.text, spaceId, mediaUrls, location });
      await list.refresh();
    } catch (e) {
      Alert.alert('Couldn’t post', errText(e));
      throw e;
    }
  };

  const confirmDelete = (p: PostReturner) =>
    Alert.alert('Delete this post?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(p.id);
            list.setItems((cur) => cur.filter((x) => x.id !== p.id));
          } catch (e) {
            Alert.alert('Couldn’t delete', errText(e));
          }
        },
      },
    ]);

  return (
    <FlatList
      ref={listRef}
      data={roots}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          onReply={onReply}
          onOpenReplies={onOpenReplies}
          onPressSpace={onSpace}
          onMore={me && item.author_id === me ? confirmDelete : undefined}
        />
      )}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.sm, gap: spacing.sm }}>
          <PostComposer placeholder={placeholder} onPost={create} />
          {spaceId ? <LiveStrip spaceId={spaceId} /> : null}
        </View>
      }
      ListEmptyComponent={
        list.loading ? (
          <ActivityIndicator color={colors.ink} style={styles.emptyBox} />
        ) : list.error ? (
          <View style={styles.emptyBox}>
            <Text style={[typography.body, styles.emptyText]}>{list.error}</Text>
            <GlassButton label="Try again" size="sm" variant="primary" onPress={list.reload} style={{ minWidth: 140 }} />
          </View>
        ) : (
          <Text style={[typography.body, styles.emptyText, styles.emptyBox]}>{emptyText}</Text>
        )
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.ink} style={{ marginVertical: spacing.md }} /> : null}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.ink} progressViewOffset={topPad} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.6}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad, paddingHorizontal: spacing.lg }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    />
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useSessionUser()?.id;
  const { items: myGrids, loaded, loading: gridsLoading, error: gridsError } = useMyGrids();
  // Opened from elsewhere (live list, profile grids, search...) with ?gridId: go straight into that grid's feed.
  const { gridId } = useLocalSearchParams<{ gridId?: string }>();
  const startGrid = !!gridId;
  const [mode, setMode] = useState<Mode>(startGrid ? 'grid' : 'local'); // local feed shows posts right away
  const [grid, setGrid] = useState<SpaceListSkeleton | null>(null); // open grid's feed, or the grid list
  const [isAdmin, setIsAdmin] = useState(false);
  const [reply, setReply] = useState<ReplyState>(null);
  const myStream = useMyActiveStream();
  const listRef = useRef<FlatList<PostReturner>>(null);

  useEffect(() => {
    refreshMyGrids();
  }, []);

  // ?gridId: find that grid among yours, or load it (e.g. a grid you're only looking at).
  useEffect(() => {
    if (!gridId) return;
    const found = myGrids.find((g) => g.id === gridId);
    if (found) {
      setGrid((cur) => (cur?.id === found.id ? cur : found));
      return;
    }
    if (!loaded) return;
    fetchGrid(gridId)
      .then((g) => setGrid(toSkeleton(g)))
      .catch(() => {});
  }, [gridId, myGrids, loaded]);

  // Go Live is for a grid's owner and admins.
  useEffect(() => {
    setIsAdmin(false);
    if (!grid || !me) return;
    let live = true;
    fetchAdmins(grid.id)
      .then((a) => live && setIsAdmin(a.some((x) => x.user_id === me)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [grid?.id, me]);

  const fetchLocal = useCallback((offset: number) => fetchAmigoFeed(offset), []);
  const fetchGridPosts = useCallback((offset: number) => fetchGridFeed(grid?.id ?? '', offset), [grid?.id]);

  const inGridFeed = mode === 'grid' && grid;
  const topPad = insets.top + spacing.sm + (inGridFeed ? GRID_BAR_H : TOP_BAR_H) + spacing.md;
  const bottomPad = navOccupied(insets.bottom) + FAB_SPACE + (reply ? 140 : 0);

  const openReplies = (p: PostReturner) => router.push({ pathname: '/replies', params: { postId: p.id } });

  const sendReply = async (text: string) => {
    if (!reply) return;
    const target = reply.post;
    if (reply.mode === 'dm') {
      // Local feed: with no grid the core server turns the reply into a chat message to the post's author.
      try {
        await replyToPost(target.id, text, null);
        setReply(null);
        Alert.alert('Sent', 'Your reply went to their messages.');
      } catch (e) {
        Alert.alert('Couldn’t send reply', errText(e));
      }
      return;
    }
    try {
      await replyToPost(target.id, text, grid?.id ?? null);
      setReply(null);
      openReplies(target);
    } catch (e) {
      Alert.alert('Couldn’t send reply', errText(e));
    }
  };

  const changeMode = (m: Mode) => {
    setMode(m);
    setGrid(null);
    setReply(null);
  };

  return (
    <View style={styles.root}>
      <ScreenBackground />

      {mode === 'local' ? (
        <PostList
          listRef={listRef}
          fetchPage={fetchLocal}
          resetKey="local"
          placeholder="Share what's happening around you…"
          topPad={topPad}
          bottomPad={bottomPad}
          emptyText="No posts from your amigos yet."
          onReply={(p) => setReply({ post: p, mode: 'dm' })}
          onOpenReplies={openReplies}
        />
      ) : grid ? (
        <PostList
          listRef={listRef}
          fetchPage={fetchGridPosts}
          resetKey={`grid-${grid.id}`}
          placeholder={`Share something with ${grid.name}…`}
          topPad={topPad}
          bottomPad={bottomPad}
          emptyText="No posts in this grid yet."
          spaceId={grid.id}
          onReply={(p) => setReply({ post: p, mode: 'post' })}
          onOpenReplies={openReplies}
        />
      ) : (
        <FlatList
          data={myGrids}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => <GridListItem item={item} onPress={setGrid} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={<RefreshControl refreshing={gridsLoading && loaded} onRefresh={refreshMyGrids} tintColor={colors.ink} progressViewOffset={topPad} />}
          ListEmptyComponent={
            !loaded || (gridsLoading && myGrids.length === 0) ? (
              <ActivityIndicator color={colors.ink} style={styles.emptyBox} />
            ) : gridsError ? (
              <View style={styles.emptyBox}>
                <Text style={[typography.body, styles.emptyText]}>{gridsError}</Text>
                <GlassButton label="Try again" size="sm" variant="primary" onPress={refreshMyGrids} style={{ minWidth: 140 }} />
              </View>
            ) : (
              <Text style={[typography.body, styles.emptyText, styles.emptyBox]}>Join a grid to see its feed here.</Text>
            )
          }
          contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad, paddingHorizontal: spacing.lg }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating top controls: hover over the posts, like a dynamic island. */}
      <View style={[styles.topBar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        {inGridFeed ? (
          // Inside a grid: profile + messages go away; back button and the grid's identity take over.
          <View style={styles.row}>
            <GlassIconButton
              icon="arrow-left"
              label="Back to grids"
              tone="floating"
              size={GRID_BAR_H}
              onPress={() => {
                // Came here from another screen: Back returns there. Otherwise back to the grid list.
                if (startGrid && router.canGoBack()) {
                  router.back();
                  return;
                }
                setGrid(null);
                setReply(null);
              }}
            />
            <Pressable
              style={styles.gridPillWrap}
              onPress={() => openGridProfile(router, grid.id)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${grid.name} profile`}
            >
              <GlassSurface tone="floating" radius={radius.pill} raised contentStyle={styles.gridPill}>
                <Avatar uri={grid.profile_url} name={grid.name} size={GRID_BAR_H - 10} ring />
                <Text style={[typography.cardTitle, styles.gridName]} numberOfLines={1}>
                  {grid.name}
                </Text>
              </GlassSurface>
            </Pressable>
          </View>
        ) : (
          <View style={styles.row}>
            <HeaderProfileButton />
            <View style={styles.toggleWrap}>
              <View style={styles.island}>
              <SegmentedToggle<Mode>
                tone="floating"
                compact
                segments={[
                  { key: 'grid', label: 'Grid', icon: 'grid', accessibilityLabel: 'Grid feed' },
                  { key: 'local', label: 'Local', icon: 'map-pin', accessibilityLabel: 'Local feed' },
                ]}
                value={mode}
                onChange={changeMode}
              />
              </View>
            </View>
            <HeaderMessagesButton />
          </View>
        )}
      </View>

      {reply ? (
        <ReplyComposer
          key={reply.post.id}
          target={reply.post}
          mode={reply.mode}
          onCancel={() => setReply(null)}
          onSend={sendReply}
        />
      ) : (
        <>
          {/* Go Live only exists inside a grid, and only for its owner and admins (the server enforces it with a 403). */}
          {inGridFeed && grid && isAdmin ? (
            <GoLiveButton
              live={!!myStream}
              onPress={() => router.push({ pathname: '/go-live', params: { gridId: grid.id } })}
            />
          ) : null}
          <FloatingPostButton onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} />
        </>
      )}
      <NavTabBar active="feed" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  emptyBox: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  topBar: { position: 'absolute', left: 0, right: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  toggleWrap: { flex: 1, alignItems: 'center' },
  // Small centred pill, like an iOS dynamic island.
  island: { width: 156 },
  gridPillWrap: { flex: 1 },
  gridPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: GRID_BAR_H - 2,
    paddingHorizontal: 4,
    paddingRight: spacing.md,
  },
  gridName: { flex: 1, color: colors.textPrimary, fontSize: 15, lineHeight: 20 },
});
