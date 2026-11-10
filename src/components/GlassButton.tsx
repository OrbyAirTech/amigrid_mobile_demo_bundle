import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { glass, radius, typography } from '@/theme';
import { GlassSurface } from './GlassSurface';

type Props = {
  label: string;
  onPress?: () => void;
  /** primary = #DBD9DB glass, secondary = white glass, dark = #241623 glass */
  variant?: 'primary' | 'secondary' | 'dark';
  /** lg = 56, md = 52, sm = 36 (compact, e.g. profile actions). */
  size?: 'lg' | 'md' | 'sm';
  /** Reports an on/off state to screen readers, for toggle-style buttons. */
  selected?: boolean;
  /** Trailing Feather icon, e.g. "arrow-right". */
  icon?: ComponentProps<typeof Feather>['name'];
  /** Custom leading element, e.g. a brand icon for social buttons. */
  leading?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TONE = { primary: 'primary', secondary: 'light', dark: 'dark' } as const;
const HEIGHT = { lg: 56, md: 52, sm: 36 } as const;

export function GlassButton({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  selected,
  icon,
  leading,
  disabled = false,
  style,
}: Props) {
  const tone = TONE[variant];
  const color = glass[tone].text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        { opacity: disabled ? 0.55 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      <GlassSurface
        tone={tone}
        radius={radius.md}
        raised={variant !== 'secondary' && !disabled}
        contentStyle={[styles.content, size === 'sm' && styles.contentSm, { height: HEIGHT[size] }]}
      >
        {leading}
        <Text style={[typography.button, size === 'sm' && styles.labelSm, { color }]} numberOfLines={1}>
          {label}
        </Text>
        {icon ? <Feather name={icon} size={size === 'sm' ? 15 : 18} color={color} /> : null}
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  contentSm: { gap: 6, paddingHorizontal: 12 },
  labelSm: { fontSize: 13, lineHeight: 18 },
});
