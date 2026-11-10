import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import type { PostReturner } from '@/types/feed';
import { timeAgo } from '@/utils/time';
import { Avatar } from './Avatar';
import { GlassSurface } from './GlassSurface';

type Props = { post: PostReturner; variant?: 'pinned' | 'strip' };

/**
 * The reference to the post a reply answers (Telegram-style quote). Replies are independent posts,
 * so each one carries its own reference instead of being nested under the original.
 *  - pinned: compact card at the top of the replies page, labelled "Original post".
 *  - strip: one line inside a reply card: "↩ Name  snippet".
 */
export function PostQuote({ post, variant = 'strip' }: Props) {
  if (variant === 'strip') {
    return (
      <View style={styles.strip}>
        <View style={styles.accent} />
        <View style={styles.stripBody}>
          <View style={styles.stripTitle}>
            <Feather name="corner-up-left" size={12} color={colors.ink} />
            <Text style={[typography.caption, styles.stripName]} numberOfLines={1}>
              {post.author_display_name}
            </Text>
          </View>
          <Text style={[typography.caption, styles.muted]} numberOfLines={1}>
            {post.content || 'Photo'}
          </Text>
        </View>
      </View>
    );
  }

  const thumb = post.media_urls[0];
  return (
    <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.pinned}>
      <View style={styles.accentTall} />
      <View style={styles.pinnedBody}>
        <Text style={[typography.caption, styles.label]}>ORIGINAL POST</Text>
        <View style={styles.authorRow}>
          <Avatar uri={post.author_profile_image} name={post.author_display_name} size={24} />
          <Text style={[typography.cardTitle, styles.name]} numberOfLines={1}>
            {post.author_display_name}
          </Text>
          <Text style={[typography.caption, styles.muted]}>{timeAgo(post.created_at)}</Text>
        </View>
        {post.content ? (
          <Text style={[typography.cardBody, styles.content]} numberOfLines={3}>
            {post.content}
          </Text>
        ) : null}
      </View>
      {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" /> : null}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted },
  accent: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.ink },
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: 6,
    paddingRight: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.iconTile,
  },
  stripBody: { flex: 1, gap: 1 },
  stripTitle: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stripName: { color: colors.ink, fontFamily: typography.cardTitle.fontFamily, flexShrink: 1 },

  pinned: { flexDirection: 'row', gap: spacing.sm + 2, padding: spacing.sm + 2, alignItems: 'center' },
  accentTall: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.ink },
  pinnedBody: { flex: 1, gap: 4 },
  label: { color: colors.textMuted, letterSpacing: 0.6, fontSize: 11, lineHeight: 14 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { color: colors.textPrimary, flexShrink: 1, fontSize: 14, lineHeight: 19 },
  content: { color: colors.textPrimary, fontSize: 14, lineHeight: 19 },
  thumb: { width: 44, height: 44, borderRadius: radius.sm },
});
