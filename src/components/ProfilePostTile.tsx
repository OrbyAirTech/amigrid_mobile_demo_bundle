import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';
import type { PostData } from '@/types/profile';
import { formatCount, timeAgo } from '@/utils/time';

type Props = { post: PostData; width: number; height: number; onPress?: (post: PostData) => void };

/** One rounded media tile for the profile grid: first image, like count bottom-left, stack icon for multi-image posts. */
export function ProfilePostTile({ post, width, height, onPress }: Props) {
  const cover = post.media_urls[0];
  const multiple = post.media_urls.length > 1;
  const when = timeAgo(post.created_at);

  return (
    <Pressable
      onPress={() => onPress?.(post)}
      accessibilityRole="button"
      accessibilityLabel={`Post with ${post.like_count} likes${when ? `, ${when}` : ''}`}
      style={({ pressed }) => [styles.tile, { width, height, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      {cover ? (
        <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <View style={styles.placeholder}>
          <Feather name="image" size={22} color={colors.textMuted} />
        </View>
      )}

      <LinearGradient
        colors={['rgba(36,22,35,0)', 'rgba(36,22,35,0.6)']}
        style={styles.fade}
        pointerEvents="none"
      />

      {multiple ? (
        <View style={styles.multi} pointerEvents="none">
          <Feather name="layers" size={14} color={colors.white} />
        </View>
      ) : null}

      <View style={styles.stats} pointerEvents="none">
        <Feather name="heart" size={13} color={colors.white} />
        <Text style={styles.count}>{formatCount(post.like_count)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.iconTile,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.75)',
  },
  placeholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
  multi: { position: 'absolute', top: 10, right: 10 },
  stats: { position: 'absolute', left: 10, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  count: { color: colors.white, fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
});
