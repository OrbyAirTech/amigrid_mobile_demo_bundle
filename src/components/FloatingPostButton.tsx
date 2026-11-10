import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, navOccupied } from '@/theme';
import { GlassSurface } from './GlassSurface';

const SIZE = 58;
type Props = { onPress?: () => void };

/** "+" create-post button: translucent glass that hovers over the feed. */
export function FloatingPostButton({ onPress }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Create post"
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        { bottom: navOccupied(insets.bottom) + 16, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <GlassSurface tone="floating" radius={SIZE / 2} raised contentStyle={styles.center}>
        <Feather name="plus" size={26} color={colors.ink} />
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 20 },
  center: { width: SIZE - 2, height: SIZE - 2, alignItems: 'center', justifyContent: 'center' },
});
