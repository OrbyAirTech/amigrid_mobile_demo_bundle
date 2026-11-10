import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/data/api/client';
import { likePost, unlikePost } from '@/data/postsApi';
import { colors, radius, spacing, typography } from '@/theme';
import type { PostReturner } from '@/types/feed';
import { formatCount, timeAgo } from '@/utils/time';
import { Avatar } from './Avatar';
import { GlassSurface } from './GlassSurface';
import { PostQuote } from './PostQuote';

type Props = {
  post: PostReturner;
  /** The post this one answers; shown as a reference strip on top (used on the replies page). */
  quote?: PostReturner;
  /** Append a new reply (private DM in the local feed, public reply post in a grid). */
  onReply?: (post: PostReturner) => void;
  /** Open the page (slides in from the right) listing the replies to this post. */
  onOpenReplies?: (post: PostReturner) => void;
  onPressAuthor?: (post: PostReturner) => void;
  onPressSpace?: (post: PostReturner) => void;
  /** Shows the "more" button (used for the signed-in user's own posts: delete). */
  onMore?: (post: PostReturner) => void;
};

function Chip({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.chip}>
      <Feather name={icon} size={12} color={colors.ink} />
      <Text style={[typography.caption, styles.chipText]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function Media({ urls }: { urls: string[] }) {
  const [width, setWidth] = useState(0);
  if (urls.length === 0) return null;
  if (urls.length === 1) {
    return <Image source={{ uri: urls[0] }} style={styles.mediaSingle} contentFit="cover" />;
  }
  const itemW = width * 0.88;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={itemW + spacing.sm}
          decelerationRate="fast"
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {urls.map((u, i) => (
            <Image key={`${u}-${i}`} source={{ uri: u }} style={[styles.mediaMulti, { width: itemW }]} contentFit="cover" />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

/**
 * One post block, rendered from a `post_returner`. A reply is just another post: it is listed on the
 * original's replies page (the Replies button) rather than nested under it.
 */
export function PostCard({ post, quote, onReply, onOpenReplies, onPressAuthor, onPressSpace, onMore }: Props) {
  // The server doesn't say whether you've already liked a post, so this starts empty and follows your taps.
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const likes = post.like_count + (liked ? 1 : 0);

  const toggleLike = async () => {
    if (busy) return;
    const next = !liked;
    setLiked(next);
    setBusy(true);
    try {
      await (next ? likePost(post.id) : unlikePost(post.id));
    } catch (e) {
      // 409 on like = it was already liked from before; keep the heart filled rather than undoing it.
      if (next && e instanceof ApiError && e.status === 409) {
        // stays liked
      } else {
        setLiked(!next);
        Alert.alert('Couldn’t update like', e instanceof ApiError ? e.message : 'Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    try {
      await Share.share({ message: `${post.author_display_name} on Amigrid: ${post.content.slice(0, 120)} ${Linking.createURL(`post/${post.id}`)}` });
    } catch {
      // dismissed
    }
  };

  return (
    <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.card}>
      {quote ? <PostQuote post={quote} variant="strip" /> : null}

      <View style={styles.header}>
        <Pressable onPress={() => onPressAuthor?.(post)} style={styles.author}>
          <Avatar uri={post.author_profile_image} name={post.author_display_name} size={40} />
          <View style={styles.authorText}>
            <Text style={[typography.cardTitle, styles.name]} numberOfLines={1}>
              {post.author_display_name}
            </Text>
            <Text style={[typography.caption, styles.meta]} numberOfLines={1}>
              @{post.author_username} · {timeAgo(post.created_at)} · {formatCount(post.view_count)} views
            </Text>
          </View>
        </Pressable>
        {onMore ? (
          <Pressable onPress={() => onMore(post)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Post options">
            <Feather name="more-horizontal" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {post.content ? <Text style={[typography.cardBody, styles.content]}>{post.content}</Text> : null}

      {post.space_name || post.location || post.stream_title ? (
        <View style={styles.chips}>
          {post.space_name ? <Chip icon="grid" label={post.space_name} onPress={() => onPressSpace?.(post)} /> : null}
          {post.location ? <Chip icon="map-pin" label="Location tagged" /> : null}
          {post.stream_title ? <Chip icon="video" label={`Live moment · ${post.stream_title}`} /> : null}
        </View>
      ) : null}

      <Media urls={post.media_urls} />

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={toggleLike} accessibilityLabel="Like">
          <Feather name="heart" size={19} color={liked ? colors.danger : colors.textMuted} />
          <Text style={[typography.cardBody, { color: liked ? colors.danger : colors.textMuted }]}>
            {formatCount(likes)}
          </Text>
        </Pressable>
        <Pressable
          style={styles.action}
          onPress={() => onReply?.(post)}
          accessibilityRole="button"
          accessibilityLabel={`Reply to ${post.author_display_name}`}
          hitSlop={8}
        >
          <Feather name="corner-up-left" size={19} color={colors.textMuted} />
          <Text style={[typography.cardBody, { color: colors.textMuted }]}>Reply</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={share} accessibilityLabel="Share">
          <Feather name="share-2" size={19} color={colors.textMuted} />
        </Pressable>
        <View style={styles.spacer} />
        <Pressable
          onPress={() => onOpenReplies?.(post)}
          accessibilityRole="button"
          accessibilityLabel={`View replies to ${post.author_display_name}`}
          hitSlop={8}
          style={({ pressed }) => [styles.repliesBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={[typography.cardBody, styles.repliesText]}>Replies</Text>
          <Feather name="chevron-right" size={16} color={colors.ink} />
        </Pressable>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  authorText: { flex: 1 },
  name: { color: colors.textPrimary },
  meta: { color: colors.textMuted },
  content: { color: colors.textPrimary, fontSize: 15, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.iconTile,
    maxWidth: '100%',
  },
  chipText: { color: colors.ink, flexShrink: 1 },
  mediaSingle: { width: '100%', aspectRatio: 1, borderRadius: radius.md },
  mediaMulti: { aspectRatio: 1, borderRadius: radius.md },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  repliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.iconTile,
  },
  repliesText: { color: colors.ink, fontFamily: typography.cardTitle.fontFamily, fontSize: 13, lineHeight: 18 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spacer: { flex: 1 },
});
