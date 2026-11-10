import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/theme';
import { GlassSurface } from './GlassSurface';
import { Wordmark } from './Wordmark';

const BTN = 40;
const ICON = 20;

/** Space a scrolling list needs at its top so the first row starts below the floating header. */
export const profileHeaderOffset = (insetTop: number) => insetTop + spacing.sm + BTN + spacing.md;

function HeaderGlassButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <GlassSurface tone="floating" radius={BTN / 2} raised contentStyle={styles.center}>
        {children}
      </GlassSurface>
    </Pressable>
  );
}

type Props = {
  onSwitchAccount?: () => void;
  onShareQr?: () => void;
  onMenu?: () => void;
};

/**
 * Profile top bar. "Amigrid" brands the page (the way Instagram shows its wordmark) and the
 * account actions sit on the right. Every piece is its own floating glass control, positioned
 * absolutely, so it stays put and hovers over the posts as they scroll (same pattern as the feed).
 */
export function ProfileHeader({ onSwitchAccount, onShareQr, onMenu }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
      <GlassSurface tone="floating" radius={radius.pill} raised contentStyle={styles.brandPill}>
        <View accessibilityRole="header">
          <Wordmark size={20} />
        </View>
      </GlassSurface>

      <View style={{ flex: 1 }} />

      {/* Placeholders until the account switcher, QR share sheet and settings menu exist. */}
      <HeaderGlassButton label="Switch account" onPress={onSwitchAccount ?? (() => console.log('Switch account'))}>
        <MaterialCommunityIcons name="account-switch-outline" size={ICON + 1} color={colors.ink} />
      </HeaderGlassButton>
      <HeaderGlassButton label="Share my QR code" onPress={onShareQr ?? (() => console.log('Share profile QR'))}>
        <Ionicons name="qr-code-outline" size={ICON} color={colors.ink} />
      </HeaderGlassButton>
      <HeaderGlassButton label="Menu" onPress={onMenu ?? (() => console.log('Open profile menu'))}>
        <Feather name="align-right" size={ICON} color={colors.ink} />
      </HeaderGlassButton>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  center: { width: BTN - 2, height: BTN - 2, alignItems: 'center', justifyContent: 'center' },
  brandPill: { height: BTN - 2, paddingHorizontal: spacing.lg, justifyContent: 'center' },
});
