import { Feather } from '@expo/vector-icons';
import { useEffect, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, typography } from '@/theme';
import { GlassSurface } from './GlassSurface';

type Props = {
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
  value: string | number;
  caption: string;
  /** Highlights the card as an active live stream: a solid coloured outline that blinks. */
  live?: boolean;
  onPress?: () => void;
};

/**
 * Stat tile. With `live`, a solid outline blinks around the glass to pull the eye to the live stream.
 * The blink is one opacity loop on the UI thread (cheap), and it stays solid if the user has reduce-motion on.
 */
export function DiscoveryStatCard({ icon, label, value, caption, live = false, onPress }: Props) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (live && !reduceMotion) {
      pulse.value = withRepeat(withSequence(withTiming(0.15, { duration: 750 }), withTiming(1, { duration: 750 })), -1);
    } else {
      cancelAnimation(pulse);
      pulse.value = 1;
    }
    return () => cancelAnimation(pulse);
  }, [live, reduceMotion, pulse]);

  const outlineStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const accent = live ? colors.danger : colors.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}, ${value}, ${caption}`}
      style={({ pressed }) => [styles.root, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      {/* No flex here: only the outer Pressable shares the row width. Vertical flex:1 collapses the card. */}
      <View>
        <GlassSurface tone="light" radius={radius.lg} contentStyle={styles.inner}>
          <View style={styles.labelRow}>
            <Feather name={icon} size={14} color={accent} />
            <Text style={[typography.caption, styles.label, live && { color: accent }]}>{label}</Text>
          </View>
          <Text style={[typography.title, styles.value]}>{value}</Text>
          <Text style={[typography.caption, styles.caption]}>{caption}</Text>
        </GlassSurface>

        {live ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.outline, { borderColor: colors.danger }, outlineStyle]}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { padding: 14, gap: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { color: colors.ink, letterSpacing: 0.4 },
  value: { color: colors.textPrimary, fontSize: 24 },
  caption: { color: colors.textMuted },
  outline: { ...StyleSheet.absoluteFillObject, borderRadius: radius.lg, borderWidth: 2 },
});
