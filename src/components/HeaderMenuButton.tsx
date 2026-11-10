import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/theme';
import { GlassSurface } from './GlassSurface';
import { HEADER_BUTTON_SIZE } from './HeaderProfileButton';

type Props = { onPress: () => void; label?: string };

/** Top-right corner "more" button (sits beside messages). Opens a screen's menu. */
export function HeaderMenuButton({ onPress, label = 'Menu' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <GlassSurface tone="floating" radius={HEADER_BUTTON_SIZE / 2} raised contentStyle={styles.center}>
        <Feather name="more-horizontal" size={22} color={colors.ink} />
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { width: HEADER_BUTTON_SIZE - 2, height: HEADER_BUTTON_SIZE - 2, alignItems: 'center', justifyContent: 'center' },
});
