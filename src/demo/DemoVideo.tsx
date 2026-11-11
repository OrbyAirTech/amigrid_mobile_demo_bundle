import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/BrandLogo';
import { colors } from '@/theme';

/**
 * Stands in for a live camera feed in demo mode. Video needs native modules Expo Go doesn't have, so each stream
 * shows its own still picture with a slow drift, which reads as "live" on camera. The Amigrid badge sits behind it
 * and shows while the picture loads (or if the phone is offline).
 */
export function DemoVideo({ seed }: { seed: string }) {
  const drift = useRef(new Animated.Value(0)).current;
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  return (
    <View style={styles.root}>
      <View style={styles.placeholder}>
        <BrandLogo variant="startup" style={styles.badge} />
      </View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: loaded ? 1 : 0, transform: [{ scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.1] }) }, { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] }) }] },
        ]}
      >
        <Image source={{ uri: `https://picsum.photos/seed/live-${seed}/720/1280` }} style={StyleSheet.absoluteFill} contentFit="cover" onLoad={() => setLoaded(true)} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  placeholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  badge: { width: 120, height: 120 },
});
