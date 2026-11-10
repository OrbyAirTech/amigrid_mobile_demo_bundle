import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

/**
 * Stands in for a live camera feed in demo mode: a short looping clip, muted. Each stream picks one by its id so
 * different streams don't all show the same picture. If a clip can't load (no internet) the bundled globe loop plays instead.
 */
const CLIPS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
];
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FALLBACK = require('../../assets/images/hero-globe.mp4');

const pick = (seed: string) => CLIPS[[...seed].reduce((n, c) => n + c.charCodeAt(0), 0) % CLIPS.length];

export function DemoVideo({ seed }: { seed: string }) {
  const player = useVideoPlayer(pick(seed), (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') {
        player.replace(FALLBACK);
        player.play();
      }
    });
    return () => sub.remove();
  }, [player]);

  return <VideoView style={StyleSheet.absoluteFill} player={player} nativeControls={false} contentFit="cover" allowsPictureInPicture={false} pointerEvents="none" />;
}
