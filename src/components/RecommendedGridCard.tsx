import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, glass, radius, spacing, typography } from '@/theme';
import type { SpaceListSkeleton } from '@/types/feed';
import { formatCount } from '@/utils/time';
import { GlassSurface } from './GlassSurface';

const ACCESS: Record<string, string> = { open: 'Open', invite_only: 'Invite only', approval_required: 'Approval' };

type Props = { item: SpaceListSkeleton; width: number; onPress?: (item: SpaceListSkeleton) => void };

/** Compact grid (space) card for horizontal rows: image, tag, access badge, name, blurb, member count. */
export function RecommendedGridCard({ item, width, onPress }: Props) {
  return (
    <Pressable onPress={() => onPress?.(item)} style={({ pressed }) => ({ width, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <GlassSurface tone="light" radius={radius.lg} raised>
        <View style={styles.imageWrap}>
          <Image source={{ uri: item.profile_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[styles.badge, styles.tag]}>
            <Text style={styles.badgeText}>grid</Text>
          </View>
          {item.access_mode ? (
            <View style={[styles.badge, styles.corner]}>
              <Text style={styles.badgeText}>{ACCESS[item.access_mode] ?? item.access_mode}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          <Text style={[typography.cardTitle, styles.name]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={[typography.caption, styles.muted]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.meta}>
            {item.participant_count != null ? (
              <>
                <Feather name="users" size={13} color={colors.textMuted} />
                <Text style={[typography.caption, styles.muted]}>{formatCount(item.participant_count)} members</Text>
              </>
            ) : null}
            <View style={{ flex: 1 }} />
            <Feather name="chevron-right" size={16} color={colors.textMuted} />
          </View>
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  imageWrap: { height: 96, backgroundColor: colors.iconTile },
  badge: {
    position: 'absolute',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: glass.dark.fill,
  },
  tag: { top: spacing.sm, left: spacing.sm },
  corner: { bottom: spacing.sm, right: spacing.sm },
  badgeText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
  body: { padding: spacing.md, paddingTop: 10, gap: 3 },
  name: { color: colors.textPrimary, ...typography.rowTitle },
  muted: { color: colors.textMuted },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
});
