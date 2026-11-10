import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import type { StoreItem } from '@/types/discovery';
import { GlassSurface } from './GlassSurface';
import { Pill } from './Pill';

type Props = { item: StoreItem; onPress?: (item: StoreItem) => void };

export function StoreCard({ item, onPress }: Props) {
  return (
    <Pressable onPress={() => onPress?.(item)} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
    <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.row}>
      <Image source={{ uri: item.logo_url }} style={styles.thumb} contentFit="cover" />

      <View style={styles.body}>
        <Text style={[typography.cardTitle, styles.name]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[typography.caption, styles.category]} numberOfLines={1}>
          {item.category}
        </Text>
        <View style={styles.metaRow}>
          <Feather name="star" size={12} color="#C99A2E" />
          <Text style={[typography.caption, styles.meta]}>{item.rating.toFixed(1)}</Text>
        </View>
      </View>

      <Pill
        icon={item.isOpen ? 'check-circle' : 'x-circle'}
        label={item.isOpen ? 'Open Now' : 'Closed'}
        tone={item.isOpen ? 'success' : 'muted'}
      />
    </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm + 2, padding: spacing.sm + 2, alignItems: 'center' },
  thumb: { width: 44, height: 44, borderRadius: radius.sm },
  body: { flex: 1, gap: 2 },
  name: { color: colors.textPrimary, ...typography.rowTitle },
  category: { color: colors.textMuted, ...typography.rowMeta },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { color: colors.textMuted },
});
