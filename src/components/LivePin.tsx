import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/theme';

type Props =
  | { variant: 'live'; avatarUrl?: string }
  | { variant: 'activity'; count: number };

/**
 * Map pins for the mock overlay: a live-presence avatar ring, or a numbered
 * activity cluster bubble. Both carry a small glass "chip" label underneath,
 * matching the Visily mock.
 */
export function LivePin(props: Props) {
  if (props.variant === 'live') {
    return (
      <View style={styles.wrap}>
        <View style={styles.liveRing}>
          {props.avatarUrl ? (
            <Image source={{ uri: props.avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]} />
          )}
          <View style={styles.liveDot} />
        </View>
        <View style={styles.chip}>
          <Text style={[typography.caption, styles.chipText]}>Live Now</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.activityBubble}>
        <Text style={styles.activityCount}>{props.count}</Text>
      </View>
      <View style={styles.chip}>
        <Text style={[typography.caption, styles.chipText]}>Activity</Text>
      </View>
    </View>
  );
}

const SIZE = 48;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  liveRing: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: SIZE - 10, height: SIZE - 10, borderRadius: (SIZE - 10) / 2 },
  avatarFallback: { backgroundColor: colors.iconTile },
  liveDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2F6B48',
    borderWidth: 2,
    borderColor: colors.white,
  },
  activityBubble: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  activityCount: { color: colors.white, fontFamily: typography.cardTitle.fontFamily, fontSize: 15 },
  chip: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  chipText: { color: colors.textPrimary, fontSize: 11 },
});
