import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

type Props = {
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  /** Destructive action (leave, remove, report). */
  danger?: boolean;
  disabled?: boolean;
  /** Small tag on the right, e.g. "Premium". */
  badge?: string;
  /** Hairline above the row; leave off the first one. */
  divider?: boolean;
};

/** One tappable row inside a GlassSheet menu. */
export function SheetAction({ icon, label, onPress, danger = false, disabled = false, badge, divider = true }: Props) {
  const color = danger ? colors.danger : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, divider && styles.divider, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}
    >
      <Feather name={icon} size={19} color={color} />
      <Text style={[typography.cardBody, styles.label, { color }]}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Feather name="lock" size={10} color={colors.textMuted} />
          <Text style={[typography.caption, styles.badgeText]}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 13 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(36, 22, 35, 0.1)' },
  label: { fontFamily: typography.cardTitle.fontFamily, flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(110, 102, 112, 0.14)' },
  badgeText: { color: colors.textMuted, fontSize: 11, lineHeight: 14 },
});
