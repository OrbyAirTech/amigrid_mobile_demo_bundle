import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme';

type Props = {
  /** Only renders (and animates) while true. */
  active: boolean;
  radius: number;
  color?: string;
  width?: number;
};

/**
 * Thin solid outline that blinks around its (relatively positioned) parent. Same recipe as the live
 * discovery stat card: one opacity loop on the UI thread, solid when reduce-motion is on.
 */
export function BlinkingOutline({ active, radius, color = colors.danger, width = 1.5 }: Props) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (active && !reduceMotion) {
      pulse.value = withRepeat(withSequence(withTiming(0.15, { duration: 750 }), withTiming(1, { duration: 750 })), -1);
    } else {
      cancelAnimation(pulse);
      pulse.value = 1;
    }
    return () => cancelAnimation(pulse);
  }, [active, reduceMotion, pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  if (!active) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: width, borderColor: color }, style]}
    />
  );
}
