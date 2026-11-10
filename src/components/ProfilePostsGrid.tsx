import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';
import type { PostData } from '@/types/profile';
import { ProfilePostTile } from './ProfilePostTile';

const GAP = spacing.sm;
const FEATURED_RATIO = 1.7; // width / height of the wide tile

type Props = { posts: PostData[]; onOpen?: (post: PostData) => void };

/**
 * Two-column posts grid (Visily p.11). With an odd number of posts the newest one takes a full-width
 * tile on top, so the rows below always pair up and no tile is left dangling on its own.
 */
export function ProfilePostsGrid({ posts, onOpen }: Props) {
  const { width } = useWindowDimensions();

  if (posts.length === 0) {
    return <Text style={[typography.cardBody, styles.empty]}>No posts yet.</Text>;
  }

  const full = width - spacing.lg * 2;
  const col = Math.floor((full - GAP) / 2);
  const featured = posts.length % 2 === 1 ? posts[0] : null;
  const rest = featured ? posts.slice(1) : posts;

  return (
    <View style={styles.wrap}>
      {featured ? (
        <ProfilePostTile post={featured} width={full} height={Math.round(full / FEATURED_RATIO)} onPress={onOpen} />
      ) : null}
      <View style={styles.row}>
        {rest.map((p) => (
          <ProfilePostTile key={p.id} post={p} width={col} height={col} onPress={onOpen} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: GAP },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
});
