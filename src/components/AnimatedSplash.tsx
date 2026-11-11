import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/BrandLogo';
import { Wordmark } from '@/components/Wordmark';
import { colors } from '@/theme';

/**
 * The startup screen for the demo, drawn inside the app so it shows the same way in Expo Go (which can't use
 * the app's own native splash). It continues straight from the native splash colour: the glass badge settles
 * in, the name follows, then the whole screen fades into the welcome screen.
 */
export function AnimatedSplash({ onDone }: { onDone?: () => void }) {
  const badge = useRef(new Animated.Value(0)).current;
  const name = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;
  const [gone, setGone] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(badge, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(name, { toValue: 1, duration: 600, delay: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.delay(550),
      Animated.timing(out, { toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      setGone(true);
      onDone?.();
    });
  }, [badge, name, out, onDone]);

  if (gone) return null;

  return (
    <Animated.View style={[styles.root, { opacity: out }]} pointerEvents="auto">
      <Animated.View style={{ opacity: badge, transform: [{ scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }] }}>
        <BrandLogo variant="startup" style={styles.badge} />
      </Animated.View>
      <Animated.View style={{ opacity: name, transform: [{ translateY: name.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
        <View style={styles.nameRow}>
          <Wordmark size={30} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 100, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  badge: { width: 200, height: 200 },
  nameRow: { marginTop: 4 },
});
