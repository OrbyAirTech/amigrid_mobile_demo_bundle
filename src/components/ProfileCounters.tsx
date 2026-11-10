import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, typography } from '@/theme';
import { formatCount } from '@/utils/time';
import { GlassSurface } from './GlassSurface';

type Props = {
  amigos: number;
  grid: number;
  store: number;
  onPressAmigos?: () => void;
  onPressGrid?: () => void;
  onPressStore?: () => void;
};

type Stat = { key: string; label: string; icon: ComponentProps<typeof Feather>['name']; value: number; onPress?: () => void };

/** Amigos / Grid / Store counters: icon + number over an uppercase label, split by hairlines (Visily p.11). */
export function ProfileCounters({ amigos, grid, store, onPressAmigos, onPressGrid, onPressStore }: Props) {
  const stats: Stat[] = [
    { key: 'amigos', label: 'AMIGOS', icon: 'users', value: amigos, onPress: onPressAmigos },
    { key: 'grid', label: 'GRID', icon: 'grid', value: grid, onPress: onPressGrid },
    { key: 'store', label: 'STORE', icon: 'shopping-bag', value: store, onPress: onPressStore },
  ];

  return (
    <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.row}>
      {stats.map((s, i) => (
        <View key={s.key} style={styles.cellWrap}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <Pressable
            style={styles.cell}
            onPress={s.onPress}
            disabled={!s.onPress}
            accessibilityRole={s.onPress ? 'button' : undefined}
            accessibilityLabel={`${s.value} ${s.label.toLowerCase()}`}
          >
            <View style={styles.valueRow}>
              <Feather name={s.icon} size={15} color={colors.textMuted} />
              <Text style={styles.value}>{formatCount(s.value)}</Text>
            </View>
            <Text style={[typography.caption, styles.label]}>{s.label}</Text>
          </Pressable>
        </View>
      ))}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  cellWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(36, 22, 35, 0.1)' },
  cell: { flex: 1, alignItems: 'center', gap: 2 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontFamily: fonts.extrabold, fontSize: 18, lineHeight: 24, color: colors.textPrimary },
  label: { color: colors.textMuted, fontSize: 11, lineHeight: 14, letterSpacing: 0.6, fontFamily: fonts.semibold },
});
