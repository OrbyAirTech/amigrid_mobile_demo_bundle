import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, type GlassTone } from '@/theme';
import { GlassSurface } from './GlassSurface';

type Props = {
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
  onPress?: () => void;
  size?: number;
  tone?: GlassTone;
};

/** Circular glass button for headers (back, settings, share...). */
export function GlassIconButton({ icon, label, onPress, size = 44, tone = 'light' }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <GlassSurface
        tone={tone}
        radius={size / 2}
        raised
        contentStyle={[styles.center, { width: size - 2, height: size - 2 }]}
      >
        <Feather name={icon} size={size * 0.45} color={colors.ink} />
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
