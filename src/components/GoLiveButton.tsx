import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, navOccupied } from '@/theme';
import { GlassSurface } from './GlassSurface';

const SIZE = 58; // the same size as the "+" button below it
type Props = { onPress?: () => void; /** The user is already streaming here: a small red dot shows, and it resumes the host view. */ live?: boolean };

/** Go Live: the same glass circle as the "+" button, sitting right above it. Only in a grid's feed, only for people who may stream there. */
export function GoLiveButton({ onPress, live = false }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={live ? 'Back to your live stream' : 'Go live'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        { bottom: navOccupied(insets.bottom) + 16 + SIZE + 10, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <GlassSurface tone="floating" radius={SIZE / 2} raised contentStyle={styles.center}>
        <Feather name="video" size={24} color={colors.ink} />
      </GlassSurface>
      {live ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 20 },
  center: { width: SIZE - 2, height: SIZE - 2, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 4, right: 4, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.white },
});
