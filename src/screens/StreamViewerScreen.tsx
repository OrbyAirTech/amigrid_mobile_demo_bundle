import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { BlinkingOutline } from '@/components/BlinkingOutline';
import { GlassButton } from '@/components/GlassButton';
import { GlassIconButton } from '@/components/GlassIconButton';
import { HoldToRecordButton } from '@/components/HoldToRecordButton';
import { GlassSurface } from '@/components/GlassSurface';
import { LivePill, viewerLabel } from '@/components/LiveStrip';
import { LiveVideoSurface } from '@/components/LiveVideoSurface';
import { useKeyboardHeight } from '@/components/ReplyComposer';
import { ApiError } from '@/data/api/client';
import { captureStreamFrame, setActiveAudio, useLiveKit } from '@/data/livekit';
import { useGridSkeleton } from '@/data/myGridsStore';
import { createPost, uploadPostImage } from '@/data/postsApi';
import { isMine, joinAndWatch, leaveWatch, loadStream, toggleUpvote, useLiveStreams, useStream, useStreamPolling, useStreamState } from '@/data/streamStore';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import type { Stream } from '@/types/stream';
import { openGridProfile } from '@/utils/gridNav';
import { formatCount, timeAgo } from '@/utils/time';

type Moment = { uri: string; atSec: number };

/** Live POVs the viewer plays at once (each one is its own connection). */
const MAX_WATCHED = 4;

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/**
 * The big-format viewer for one live stream. Tap a POV below the video to switch, upvote, or capture the
 * current frame and turn it into a post in the grid (streams have no comments; a post is the comment).
 */
export default function StreamViewerScreen() {
  const { streamId, gridId } = useLocalSearchParams<{ streamId: string; gridId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();

  const [activeId, setActiveId] = useState(String(streamId));
  const stream = useStream(activeId);
  const { unavailable } = useStreamState();
  useStreamPolling(stream?.space_id ?? gridId);
  const povs = useLiveStreams(stream?.space_id ?? gridId);
  const lk = useLiveKit(activeId);
  const watching = useRef<Set<string>>(new Set());
  const videoRef = useRef<View>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const grid = useGridSkeleton(String(stream?.space_id ?? gridId ?? '') || undefined);

  const [moment, setMoment] = useState<Moment | null>(null);
  const [text, setText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Know the stream (it may have been opened from a link), then connect to its video. Switching POV reconnects.
  useEffect(() => {
    if (!stream) void loadStream(activeId);
  }, [activeId, stream]);
  const isLive = stream?.status === 'live';
  const mineStream = !!stream && isMine(stream);
  useEffect(() => {
    if (mineStream) {
      // The publisher can't join their own stream: send them to the host view.
      router.replace({ pathname: '/go-live', params: { gridId: String(stream?.space_id ?? gridId ?? '') } });
    }
  }, [mineStream]);

  // Every live POV plays at once: the one in the big frame and (up to MAX_WATCHED in all) the small ones below it.
  // Only the big one has sound. Tapping a small frame just swaps which one is big, so it is instant.
  const watchIds = useMemo(() => {
    if (!isLive || mineStream) return [] as string[];
    const others = povs.filter((p) => p.stream_id !== activeId && !isMine(p)).map((p) => p.stream_id);
    return [activeId, ...others].slice(0, MAX_WATCHED);
  }, [isLive, mineStream, povs, activeId]);
  const watchKey = watchIds.join(',');
  useEffect(() => {
    const want = new Set(watchIds);
    for (const id of [...watching.current]) {
      if (!want.has(id)) {
        watching.current.delete(id);
        leaveWatch(id);
      }
    }
    for (const id of watchIds) {
      if (watching.current.has(id)) continue;
      watching.current.add(id);
      joinAndWatch(id).catch((e) => {
        watching.current.delete(id);
        if (id === activeId) setJoinError(e instanceof ApiError || e instanceof Error ? e.message : 'Couldn’t connect to the stream.');
      });
    }
    setActiveAudio(activeId);
  }, [watchKey, activeId]);
  useEffect(() => setJoinError(null), [activeId]);
  useEffect(
    () => () => {
      watching.current.forEach((id) => leaveWatch(id));
      watching.current.clear();
    },
    [],
  );

  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const close = () => (router.canGoBack() ? router.back() : router.replace('/feed'));
  const live = !!stream && stream.status === 'live' && !unavailable && !lk.ended;

  const say = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  // Grabs the frame in the big picture: read from the video track by the native module, and if that isn't in this
  // build, a screenshot of the view (react-native-view-shot, which works on iOS and some Android devices).
  const capture = async () => {
    if (!stream) return;
    let shot = await captureStreamFrame(stream.stream_id);
    if (!shot && videoRef.current) {
      try {
        const { captureRef } = require('react-native-view-shot');
        shot = await captureRef(videoRef.current, { format: 'jpg', quality: 0.85, result: 'tmpfile' });
      } catch {
        shot = null;
      }
    }
    if (!shot) {
      say('Couldn’t capture this frame');
      return;
    }
    flash.value = 0.85;
    flash.value = withTiming(0, { duration: 260 });
    const started = stream.started_at ? Date.parse(stream.started_at) : Date.now();
    setMoment({ uri: shot, atSec: Math.max(0, Math.floor((Date.now() - started) / 1000)) });
    setText('');
  };

  // A stream has no comments of its own: the captured frame becomes an ordinary post in the grid.
  const postMoment = async () => {
    if (!moment || !stream || !text.trim() || posting) return;
    setPosting(true);
    try {
      const url = await uploadPostImage(moment.uri, `moment-${Date.now()}.jpg`, 'image/jpeg');
      await createPost({ content: text.trim(), spaceId: stream.space_id, mediaUrls: [url] });
      setMoment(null);
      setText('');
      say(`Posted to ${grid?.name ?? 'the grid'}`);
    } catch (e) {
      Alert.alert('Couldn’t post this moment', e instanceof ApiError ? e.message : 'Try again.');
    } finally {
      setPosting(false);
    }
  };

  if (!stream || !live) {
    return (
      <View style={[styles.root, styles.center]}>
        <GlassSurface tone="light" radius={radius.xl} raised contentStyle={styles.endCard}>
          <Feather name={unavailable ? 'wifi-off' : 'video-off'} size={26} color={colors.ink} />
          <Text style={[typography.cardTitle, styles.endTitle]}>
            {unavailable ? 'Live streaming isn’t available right now' : stream?.status === 'starting' ? 'This stream is about to start' : !stream ? 'Loading stream…' : 'This stream has ended'}
          </Text>
          {stream && !unavailable ? (
            <Text style={[typography.caption, styles.endMeta]}>
              {formatCount(stream.peak_viewer_count)} peak viewers · {formatCount(stream.upvote_count)} upvotes
            </Text>
          ) : null}
          <GlassButton label="Back to feed" size="sm" variant="primary" onPress={close} />
        </GlassSurface>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LiveVideoSurface ref={videoRef} live streamId={stream.stream_id} stream={stream} idleText={joinError ?? undefined} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(36,22,35,0.6)', 'transparent']} style={[styles.shade, { top: 0, height: insets.top + 96 }]} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(36,22,35,0.92)']} style={[styles.shade, { bottom: 0, height: 330 + insets.bottom }]} pointerEvents="none" />

      {/* Top: close, grid, live + viewers */}
      <View style={[styles.top, { top: insets.top + spacing.sm }]}>
        <GlassIconButton icon="x" label="Close" size={40} onPress={close} />
        {grid ? (
          <Pressable onPress={() => openGridProfile(router, grid.id)} style={styles.gridChip} accessibilityRole="button" accessibilityLabel={`Open ${grid.name}`}>
            <Avatar uri={grid.profile_url} name={grid.name} size={22} />
            <Text style={styles.gridChipText} numberOfLines={1}>{grid.name}</Text>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        <LivePill />
        <View style={styles.glassPill}>
          <Feather name="eye" size={12} color={colors.white} />
          <Text style={styles.pillText}>{viewerLabel(stream.viewer_count)}</Text>
        </View>
      </View>

      {/* Bottom: who, POV rail, actions */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.who}>
          <Avatar uri={stream.creator.profile_pic_url} name={stream.creator.display_name} size={36} ring />
          <View style={{ flex: 1 }}>
            <Text style={styles.whoName} numberOfLines={1}>{stream.creator.display_name}</Text>
            <Text style={styles.whoTitle} numberOfLines={1}>
              {stream.title ?? 'Live now'}{stream.started_at ? ` · started ${timeAgo(stream.started_at).replace(' ago', '')} ago` : ''}
            </Text>
          </View>
        </View>

        {povs.length > 1 ? (
          <View style={{ gap: 6 }}>
            <Text style={styles.railLabel}>Choose a POV</Text>
            <FlatList
              horizontal
              data={povs}
              keyExtractor={(s) => s.stream_id}
              renderItem={({ item }) => <PovThumb stream={item} active={item.stream_id === stream.stream_id} onPress={() => setActiveId(item.stream_id)} />}
              ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={() => toggleUpvote(stream.stream_id)}
            accessibilityRole="button"
            accessibilityLabel={stream.has_upvoted ? 'Remove upvote' : 'Upvote'}
            accessibilityState={{ selected: stream.has_upvoted }}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <GlassSurface tone="light" radius={radius.md} raised contentStyle={styles.upvote}>
              <Feather name="arrow-up" size={18} color={stream.has_upvoted ? colors.danger : colors.ink} />
              <Text style={[typography.cardBody, styles.upvoteText]}>{formatCount(stream.upvote_count)}</Text>
            </GlassSurface>
          </Pressable>
          <Pressable
            onPress={capture}
            accessibilityRole="button"
            accessibilityLabel="Capture this moment"
            style={({ pressed }) => [styles.captureWrap, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <GlassSurface tone="primary" radius={radius.md} raised contentStyle={styles.capture}>
              <Feather name="camera" size={18} color={colors.ink} />
              <Text style={[typography.cardBody, styles.captureText]}>Capture</Text>
            </GlassSurface>
          </Pressable>
          <HoldToRecordButton streamId={stream.stream_id} onResult={say} />
        </View>
      </View>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.white }, flashStyle]} />

      {toast ? (
        <View style={[styles.toastWrap, { top: insets.top + 56 }]} pointerEvents="none">
          <GlassSurface tone="light" radius={radius.pill} raised contentStyle={styles.toast}>
            <Feather name="check" size={14} color={colors.ink} />
            <Text style={[typography.caption, styles.toastText]}>{toast}</Text>
          </GlassSurface>
        </View>
      ) : null}

      {/* Comment on the captured moment: becomes a post in the grid */}
      {moment ? (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={styles.dim} onPress={() => setMoment(null)} accessibilityLabel="Cancel" />
          <View style={[styles.panelWrap, { bottom: kb > 0 ? kb + spacing.sm : insets.bottom + spacing.sm }]}>
            <GlassSurface tone="light" radius={radius.xl} raised contentStyle={styles.panel}>
              <View style={styles.panelHead}>
                <Text style={[typography.cardTitle, styles.panelTitle]}>Comment on this moment</Text>
                <Pressable onPress={() => setMoment(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                  <Feather name="x" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
              <View style={styles.frame}>
                <Image source={{ uri: moment.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <View style={styles.frameChip}>
                  <View style={styles.frameDot} />
                  <Text style={styles.frameChipText}>Live · {mmss(moment.atSec)} in</Text>
                </View>
              </View>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Say something about this moment…"
                placeholderTextColor={colors.textMuted}
                multiline
                autoFocus
                maxLength={1000}
                style={styles.input}
              />
              <View style={styles.panelBtns}>
                <GlassButton label="Retake" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => { setMoment(null); capture(); }} />
                <GlassButton label={posting ? 'Posting…' : `Post to ${grid?.name ?? 'grid'}`} size="sm" variant="primary" style={{ flex: 2 }} disabled={!text.trim() || posting} onPress={postMoment} />
              </View>
            </GlassSurface>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function PovThumb({ stream, active, onPress }: { stream: Stream; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`Watch ${stream.creator.display_name}`}>
      <View style={[styles.thumb, active && styles.thumbOn]}>
        <LiveVideoSurface live compact still streamId={stream.stream_id} stream={stream} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['transparent', 'rgba(36,22,35,0.85)']} style={styles.thumbShade} pointerEvents="none" />
        <View style={styles.thumbDot} />
        <Text style={styles.thumbName} numberOfLines={1}>{stream.creator.display_name.split(' ')[0]}</Text>
      </View>
      <BlinkingOutline active={active} radius={radius.sm} color={colors.white} width={1.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  shade: { position: 'absolute', left: 0, right: 0 },
  top: { position: 'absolute', left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gridChip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 150, paddingLeft: 4, paddingRight: 10, height: 32, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  gridChipText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, flexShrink: 1 },
  glassPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  pillText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, gap: spacing.md },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  whoName: { color: colors.white, ...typography.rowTitle },
  whoTitle: { color: 'rgba(255,255,255,0.82)', ...typography.rowMeta },
  railLabel: { color: 'rgba(255,255,255,0.78)', fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, letterSpacing: 0.5, textTransform: 'uppercase' },
  thumb: { width: 92, height: 58, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: colors.ink },
  thumbOn: { borderColor: colors.white },
  thumbShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 28 },
  thumbDot: { position: 'absolute', top: 6, left: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },
  thumbName: { position: 'absolute', left: 6, right: 6, bottom: 4, color: colors.white, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  upvote: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 16 },
  upvoteText: { color: colors.ink, fontFamily: fonts.bold },
  captureWrap: { flex: 1 },
  capture: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, paddingHorizontal: 16 },
  captureText: { color: colors.ink, fontFamily: fonts.bold },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7 },
  toastText: { color: colors.ink, fontFamily: fonts.semibold },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(36,22,35,0.55)' },
  panelWrap: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  panel: { padding: spacing.md, gap: spacing.sm + 2 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { color: colors.textPrimary, ...typography.rowTitle },
  frame: { height: 150, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.ink },
  frameChip: { position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: 'rgba(36,22,35,0.62)' },
  frameDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },
  frameChipText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
  input: { minHeight: 64, maxHeight: 110, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(36,22,35,0.1)', color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
  panelBtns: { flexDirection: 'row', gap: spacing.sm },
  endCard: { alignItems: 'center', gap: spacing.sm + 2, padding: spacing.xl },
  endTitle: { color: colors.textPrimary, textAlign: 'center', ...typography.rowTitle },
  endMeta: { color: colors.textMuted },
});
