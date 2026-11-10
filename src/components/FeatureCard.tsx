import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/theme';
import { GlassSurface } from './GlassSurface';

type Props = {
  icon: ComponentProps<typeof Feather>['name'];
  title: string;
  description: string;
};

export function FeatureCard({ icon, title, description }: Props) {
  return (
    <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.row}>
      <View style={styles.tile}>
        <Feather name={icon} size={18} color={colors.ink} />
      </View>
      <View style={styles.copy}>
        <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[typography.cardBody, { color: colors.textMuted }]}>{description}</Text>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, padding: 16 },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.iconTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 4 },
});
