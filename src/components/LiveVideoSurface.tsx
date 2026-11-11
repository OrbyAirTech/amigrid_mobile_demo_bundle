import { Image } from 'expo-image';
import { forwardRef } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { DEMO } from '@/config/env';
import { getVideoTrackView, liveKitMissing, useLiveKit } from '@/data/livekit';
import { DemoVideo } from '@/demo/DemoVideo';
import { colors, typography } from '@/theme';
import type { Stream } from '@/types/stream';
import { Avatar } from './Avatar';
import { BrandLogo } from './BrandLogo';

type Props = {
  /** The stream this picture is for (its creator is shown while there is no video). */
  stream?: Stream;
  style?: StyleProp<ViewStyle>;
  /** Which stream's video to draw. Leave out in the host view (your own camera). */
  streamId?: string;
  /** true: draw the live video from the open connection. Left off, a quiet placeholder, so a feed of streams never holds several connections. */
  live?: boolean;
  /** Shown over the placeholder while there is no video. */
  idleText?: string;
  /** A small tile: no status text. */
  compact?: boolean;
  /** Demo mode: show a still picture instead of playing video (small tiles that sit next to the playing one). */
  still?: boolean;
};

/**
 * The one place a stream's picture is drawn. A feed card is a placeholder with the creator's photo; the open
 * viewer and the host view pass `live` and get the LiveKit video track.
 */
export const LiveVideoSurface = forwardRef<View, Props>(function LiveVideoSurface({ stream, style, live, idleText, streamId, compact, still }, ref) {
  const lk = useLiveKit(streamId);
  const Track = live ? getVideoTrackView() : null;
  const showVideo = !!(live && Track && lk.trackRef);
  const showStill = DEMO && !!still && !!streamId;
  const showDemo = DEMO && !!live && !still && lk.status === 'connected';

  return (
    <View ref={ref} collapsable={false} style={[styles.base, style]}>
      {showStill ? (
        <Image source={{ uri: `https://picsum.photos/seed/stream-${streamId}/320/200` }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : showDemo ? (
        <DemoVideo seed={streamId ?? 'host'} />
      ) : showVideo && Track ? (
        <Track trackRef={lk.trackRef} style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : (
        <View style={styles.idle}>
          {live && lk.status === 'connecting' ? (
            <ActivityIndicator color="rgba(255,255,255,0.7)" />
          ) : stream ? (
            <Avatar uri={stream.creator.profile_pic_url} name={stream.creator.display_name} size={compact ? 28 : live ? 64 : 36} />
          ) : (
            <BrandLogo variant="startup" style={styles.mark} />
          )}
          {live && !compact ? (
            <Text style={styles.text}>
              {liveKitMissing()
                ? 'Live video isn’t in this build yet'
                : lk.status === 'failed'
                  ? (lk.error ?? 'Couldn’t connect to the stream')
                  : lk.status === 'connecting'
                    ? 'Connecting…'
                    : lk.status === 'reconnecting'
                      ? 'Reconnecting…'
                      : (idleText ?? 'Waiting for video…')}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  base: { backgroundColor: colors.ink, overflow: 'hidden' },
  idle: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  mark: { width: 56, height: 56, opacity: 0.9 },
  text: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', ...typography.caption },
});
