import { Feather } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { colors, radius, typography, type GlassTone } from '@/theme';
import { GlassSurface } from './GlassSurface';

export type SegmentKey = string;

type Props<K extends SegmentKey> = {
  segments: { key: K; label: string; /** Optional leading Feather icon. */ icon?: ComponentProps<typeof Feather>['name']; accessibilityLabel?: string }[];
  value: K;
  onChange: (key: K) => void;
  /** Glass recipe for the track. Use 'floating' when hovering over content. */
  tone?: GlassTone;
  /** Small pill (~36px tall, smaller text), like an iOS dynamic island. Give the parent a fixed width. */
  compact?: boolean;
};

/** Glass 3-way (or N-way) toggle, e.g. Grid / People / Stores. Equal-width segments with a sliding highlight. */
export function SegmentedToggle<K extends SegmentKey>({ segments, value, onChange, tone = 'light', compact = false }: Props<K>) {
  const [trackWidth, setTrackWidth] = useState(0);
  const index = Math.max(0, segments.findIndex((s) => s.key === value));
  const segmentWidth = trackWidth / segments.length;

  const highlightStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: withTiming(segmentWidth * index, { duration: 200 }) }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <GlassSurface tone={tone} radius={radius.pill} contentStyle={compact ? styles.trackCompact : styles.track}>
      <View onLayout={onLayout} style={styles.row}>
        {trackWidth > 0 ? (
          <Animated.View style={[styles.highlight, highlightStyle]}>
            <View style={styles.highlightFill} />
          </Animated.View>
        ) : null}
        {segments.map((s) => {
          const active = s.key === value;
          const color = active ? colors.ink : colors.textMuted;
          return (
            <Pressable
              key={s.key}
              onPress={() => onChange(s.key)}
              style={[styles.segment, compact && styles.segmentCompact]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={s.accessibilityLabel ?? s.label}
            >
              {s.icon ? <Feather name={s.icon} size={compact ? 13 : 15} color={color} /> : null}
              <Text style={[typography.cardBody, compact && styles.labelCompact, styles.label, active && styles.labelActive]}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  track: { padding: 4 },
  trackCompact: { padding: 3 },
  row: { flexDirection: 'row', position: 'relative' },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, zIndex: 1 },
  segmentCompact: { paddingVertical: 6 },
  label: { color: colors.textMuted, fontFamily: typography.button.fontFamily },
  labelCompact: { fontSize: 13, lineHeight: 18 },
  labelActive: { color: colors.ink },
  highlight: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: radius.pill, overflow: 'hidden' },
  highlightFill: { flex: 1, backgroundColor: colors.primary, opacity: 0.9 },
});
