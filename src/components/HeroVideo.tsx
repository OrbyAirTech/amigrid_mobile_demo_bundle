import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useState } from 'react';

import { colors } from '@/theme';

type Props = {
  /** Result of require('...mp4'), passed down so the caller controls the asset. */
  source: number;
  style?: object;
  accessibilityLabel?: string;
  poster?: number; // require('...jpg')
};

/**
 * Looping, muted, autoplaying background video (the welcome screen hero).
 * No controls, no sound — it behaves like an animated image, not a media player.
 */
export function HeroVideo({ source, poster, style, accessibilityLabel }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEvent(player, 'statusChange');

  return (
    <View style={style} accessible accessibilityLabel={accessibilityLabel}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        nativeControls={false}
        contentFit="cover"
        allowsPictureInPicture={false}
        pointerEvents="none"
        onFirstFrameRender={() => setIsPlaying(true)}
      />
      {poster && !isPlaying ? (
        <Image
          source={poster}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: -1 }]} />
    </View>
  );
}