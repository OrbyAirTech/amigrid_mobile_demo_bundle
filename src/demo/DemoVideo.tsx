import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/BrandLogo';
import { colors } from '@/theme';

/**
 * Stands in for a live camera feed in demo mode: a short looping clip, muted. Each stream picks one by its id so
 * different streams don't all show the same picture. While a clip loads, or if it can't (no internet), the
 * Amigrid badge is shown on the app background instead.
 */
const REMOTE = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
];
// Bundled loops that always play, so a stream is never empty (offline, or a sample link gone).
/* eslint-disable @typescript-eslint/no-require-imports */
const LOCAL = [require('../../assets/demo/aurora-1.mp4'), require('../../assets/demo/aurora-2.mp4'), require('../../assets/demo/aurora-3.mp4')];
/* eslint-enable @typescript-eslint/no-require-imports */

const hash = (seed: string) => [...seed].reduce((n, c) => n + c.charCodeAt(0), 0);
/** What to try for a stream, in order: its sample clip, another sample clip, then a bundled loop. */
const chain = (seed: string): (string | number)[] => [REMOTE[hash(seed) % REMOTE.length], REMOTE[(hash(seed) + 1) % REMOTE.length], LOCAL[hash(seed) % LOCAL.length]];

function BrandPlaceholder() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={styles.placeholder}>
      <Animated.View style={{ transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.03] }) }] }}>
        <BrandLogo variant="startup" style={styles.badge} />
      </Animated.View>
    </View>
  );
}

export function DemoVideo({ seed }: { seed: string }) {
  const sources = chain(seed);
  const tried = useRef(0);
  const [state, setState] = useState<'loading' | 'ready'>('loading');
  const player = useVideoPlayer(sources[0], (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    tried.current = 0;
    setState('loading');
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') setState('ready');
      else if (status === 'error' && tried.current < sources.length - 1) {
        tried.current += 1;
        setState('loading');
        player.replace(sources[tried.current] as never);
        player.play();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, seed]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoView style={StyleSheet.absoluteFill} player={player} nativeControls={false} contentFit="cover" allowsPictureInPicture={false} pointerEvents="none" />
      {state !== 'ready' ? <BrandPlaceholder /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  badge: { width: 120, height: 120 },
});
