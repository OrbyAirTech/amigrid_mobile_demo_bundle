import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, glass, radius, spacing, typography } from '@/theme';
import type { StoreItem } from '@/types/discovery';
import { GlassSurface } from './GlassSurface';

type Props = { item: StoreItem; width: number; onPress?: (item: StoreItem) => void };

/** Compact store card for horizontal rows, same pattern as RecommendedGridCard. */
export function RecommendedStoreCard({ item, width, onPress }: Props) {
  return (
    <Pressable onPress={() => onPress?.(item)} style={({ pressed }) => ({ width, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <GlassSurface tone="light" radius={radius.lg} raised>
        <View style={styles.imageWrap}>
          <Image source={{ uri: item.logo_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[styles.badge, styles.tag]}>
            <Text style={styles.badgeText}>store</Text>
          </View>
          <View style={[styles.badge, styles.corner]}>
            <Text style={styles.badgeText}>{item.isOpen ? 'Open now' : 'Closed'}</Text>
          </View>
        </View>
        <View style={styles.body}>
          <Text style={[typography.cardTitle, styles.name]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[typography.caption, styles.muted]} numberOfLines={1}>
            {item.category}
          </Text>
          <View style={styles.meta}>
            <Feather name="star" size={13} color="#C99A2E" />
            <Text style={[typography.caption, styles.muted]}>{item.rating.toFixed(1)}</Text>
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
