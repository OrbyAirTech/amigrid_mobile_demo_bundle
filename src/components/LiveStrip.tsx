import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { setActiveAudio } from '@/data/livekit';
import { isMine, joinAndWatch, leaveWatch, toggleUpvote, useLiveStreams, useStreamPolling } from '@/data/streamStore';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import type { Stream } from '@/types/stream';
import { formatCount } from '@/utils/time';
import { Avatar } from './Avatar';
import { BlinkingOutline } from './BlinkingOutline';
import { LiveVideoSurface } from './LiveVideoSurface';

const GAP = spacing.sm;
const PEEK = 26; // next card shows this much, so it reads as swipeable

export const viewerLabel = (n: number | null | undefined) => (typeof n === 'number' ? formatCount(n) : '–');

export function LivePill() {
  return (
    <View style={styles.livePill}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
}

function Card({ stream, width, onOpen, playing }: { stream: Stream; width: number; onOpen: (s: Stream) => void; playing: boolean }) {
  const height = Math.round(width * 0.56);
  return (
    <Pressable
      onPress={() => onOpen(stream)}
      accessibilityRole="button"
      accessibilityLabel={`Watch ${stream.creator.display_name}, ${stream.title ?? 'live stream'}`}
      style={({ pressed }) => [{ width, height, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
    >
      <View style={[styles.card, { borderRadius: radius.lg }]}>
        <LiveVideoSurface live={playing} compact streamId={stream.stream_id} stream={stream} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(36,22,35,0.35)', 'transparent']} style={styles.topShade} pointerEvents="none" />
        <LinearGradient colors={['transparent', 'rgba(36,22,35,0.88)']} style={styles.bottomShade} pointerEvents="none" />

        <View style={styles.topRow}>
          <LivePill />
          <View style={styles.glassPill}>
            <Feather name="eye" size={12} color={colors.white} />
            <Text style={styles.pillText}>{viewerLabel(stream.viewer_count)}</Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <Avatar uri={stream.creator.profile_pic_url} name={stream.creator.display_name} size={30} ring />
          <View style={styles.texts}>
            <Text style={styles.name} numberOfLines={1}>{stream.creator.display_name}</Text>
            <Text style={styles.title} numberOfLines={1}>{stream.title ?? 'Live now'}</Text>
          </View>
          <Pressable
            onPress={() => toggleUpvote(stream.stream_id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={stream.has_upvoted ? 'Remove upvote' : 'Upvote'}
            style={styles.glassPill}
          >
            <Feather name="arrow-up" size={13} color={stream.has_upvoted ? colors.danger : colors.white} />
            <Text style={styles.pillText}>{formatCount(stream.upvote_count)}</Text>
          </Pressable>
          <View style={styles.watch}>
            <Feather name="play" size={11} color={colors.ink} />
            <Text style={styles.watchText}>Watch</Text>
          </View>
        </View>
      </View>
      <BlinkingOutline active radius={radius.lg} />
    </Pressable>
  );
}

/**
 * Pinned under the post composer while a grid has live streams. Each live stream is a POV; swipe sideways to
 * browse them, tap one to open it big. It lives in the feed's header, so scrolling past it is easy and new
 * posts arriving below never push it away. Hides itself when nothing is live (or streaming is unavailable).
 */
export function LiveStrip({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const streams = useLiveStreams(spaceId);
  const [page, setPage] = useState(0);
  useStreamPolling(spaceId);

  // Only the first stream plays in the feed, muted, as a teaser. Every other card is a still, so the feed never
  // holds more than one video connection. The connection is dropped when the feed loses focus (the viewer takes over).
  const first = streams.find((s) => !isMine(s))?.stream_id;
  useFocusEffect(
    useCallback(() => {
      if (!first) return;
      setActiveAudio(null);
      joinAndWatch(first).catch(() => {});
      return () => leaveWatch(first);
    }, [first]),
  );

  if (streams.length === 0) return null;

  const many = streams.length > 1;
  const full = width - spacing.lg * 2;
  const cardW = many ? full - PEEK : full;
  // Your own stream opens the host view: the server refuses to let the publisher join as a viewer.
  const open = (s: Stream) =>
    isMine(s)
      ? router.push({ pathname: '/go-live', params: { gridId: String(s.space_id) } })
      : router.push({ pathname: '/stream', params: { streamId: String(s.stream_id), gridId: String(s.space_id) } });
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.min(streams.length - 1, Math.round(e.nativeEvent.contentOffset.x / (cardW + GAP))));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.headDot} />
        <Text style={styles.headText}>
          Live now{many ? ` · ${streams.length} POVs` : ''}
        </Text>
        <View style={{ flex: 1 }} />
        {many ? (
          <View style={styles.dots}>
            {streams.map((s, i) => (
              <View key={s.stream_id} style={[styles.dotPage, i === page && styles.dotPageOn]} />
            ))}
          </View>
        ) : null}
      </View>
      <FlatList
        horizontal
        data={streams}
        keyExtractor={(s) => String(s.stream_id)}
        renderItem={({ item }) => <Card stream={item} width={cardW} onOpen={open} playing={item.stream_id === first} />}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        snapToInterval={cardW + GAP}
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onEnd}
        nestedScrollEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  headDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  headText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4, textTransform: 'uppercase' },
  dots: { flexDirection: 'row', gap: 4 },
  dotPage: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(36,22,35,0.22)' },
  dotPageOn: { width: 14, backgroundColor: colors.ink },
  card: { flex: 1, overflow: 'hidden' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 56 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '62%' },
  topRow: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.danger, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white },
  liveText: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 10, lineHeight: 13, letterSpacing: 0.6 },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  pillText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
  bottomRow: { position: 'absolute', left: 10, right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  texts: { flex: 1 },
  name: { color: colors.white, ...typography.rowTitle, fontSize: 14, lineHeight: 18 },
  title: { color: 'rgba(255,255,255,0.82)', ...typography.rowMeta },
  watch: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.9)' },
  watchText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
});
