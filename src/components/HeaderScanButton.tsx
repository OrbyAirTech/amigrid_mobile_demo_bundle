import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/theme';
import { GlassSurface } from './GlassSurface';
import { HEADER_BUTTON_SIZE } from './HeaderProfileButton';

type Props = { onPress?: () => void };

/**
 * Scan button for finding someone in person (scan their code to open their profile).
 * PLACEHOLDER: no camera code yet. It's a native module, so it comes back with the native build.
 * When added, replace the default onPress with the scanner launch.
 */
export function HeaderScanButton({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress ?? (() => console.log('Scan: camera not wired up yet'))}
      accessibilityRole="button"
      accessibilityLabel="Scan to find someone nearby"
      hitSlop={6}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <GlassSurface tone="floating" radius={HEADER_BUTTON_SIZE / 2} raised contentStyle={styles.center}>
        <Ionicons name="scan-outline" size={22} color={colors.ink} />
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { width: HEADER_BUTTON_SIZE - 2, height: HEADER_BUTTON_SIZE - 2, alignItems: 'center', justifyContent: 'center' },
});
