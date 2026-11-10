import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { GlassButton } from '@/components/GlassButton';
import { GlassIconButton } from '@/components/GlassIconButton';
import { HoldToRecordButton } from '@/components/HoldToRecordButton';
import { GlassSheet } from '@/components/GlassSheet';
import { GlassSurface } from '@/components/GlassSurface';
import { LivePill, viewerLabel } from '@/components/LiveStrip';
import { LiveVideoSurface } from '@/components/LiveVideoSurface';
import { Pill } from '@/components/Pill';
import { useKeyboardHeight } from '@/components/ReplyComposer';
import { ApiError } from '@/data/api/client';
import { disconnectStream, useLiveKit } from '@/data/livekit';
import { useGridSkeleton } from '@/data/myGridsStore';
import { endStream, goLive, refreshMyStream, refreshParticipants, removeParticipant, resumePublishing, useMyActiveStream, useParticipants } from '@/data/streamStore';
import { colors, fonts, radius, spacing, typography } from '@/theme';

const mmss = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h > 0 ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(s).padStart(2, '0')}`;
};

/**
 * Host side of a live stream: set a title and go live, then see viewers, manage them and end the stream.
 * Going live starts the stream on Core and publishes the rear camera and microphone through LiveKit. Leaving
 * this screen stops sending video; coming back to it resumes, and only End stream closes the stream.
 */
export default function GoLiveScreen() {
  const { gridId } = useLocalSearchParams<{ gridId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const grid = useGridSkeleton(gridId);
  const mine = useMyActiveStream();
  const participants = useParticipants(mine?.stream_id);
  const [title, setTitle] = useState('');
  const [viewersOpen, setViewersOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const lk = useLiveKit();
  const resumed = useRef(false);
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((m: string) => {
    setNote(m);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 2600);
  }, []);

  const live = !!mine;
  const exit = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/feed', params: { gridId } }));

  useEffect(() => {
    if (!mine?.started_at) return;
    const started = Date.parse(mine.started_at);
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [mine?.started_at]);

  // Reopened (or the app was restarted) while a stream of mine is still going: pick the camera back up.
  useEffect(() => {
    if (!mine || resumed.current || lk.status !== 'idle') return;
    resumed.current = true;
    resumePublishing(mine.stream_id).catch((e) => Alert.alert('Couldn’t reconnect the camera', e instanceof Error ? e.message : 'Try again.'));
  }, [mine, lk.status]);

  // While live: keep the status, viewer count and viewer list fresh. Leaving the screen stops the video.
  useEffect(() => {
    if (!mine) return;
    void refreshParticipants(mine.stream_id);
    const t = setInterval(() => {
      void refreshMyStream();
      void refreshParticipants(mine.stream_id);
    }, 10_000);
    return () => clearInterval(t);
  }, [mine?.stream_id]);
  const mineId = useRef<string | undefined>(undefined);
  mineId.current = mine?.stream_id;
  useEffect(() => () => void (mineId.current && disconnectStream(mineId.current)), []);

  const start = async () => {
    if (!grid || busy) return;
    setBusy(true);
    try {
      resumed.current = true;
      await goLive(grid.id, title);
    } catch (e) {
      Alert.alert('Couldn’t go live', e instanceof ApiError || e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmEnd = () =>
    Alert.alert('End stream?', 'Your viewers will see that the stream has ended. There is no replay.', [
      { text: 'Keep streaming', style: 'cancel' },
      {
        text: 'End stream',
        style: 'destructive',
        onPress: async () => {
          if (!mine) return;
          try {
            await endStream(mine.stream_id);
            exit();
          } catch (e) {
            Alert.alert('Couldn’t end the stream', e instanceof Error ? e.message : 'Try again.');
          }
        },
      },
    ]);

  const active = participants.filter((p) => !p.removed_at);

  return (
    <View style={styles.root}>
      {live ? (
        <LiveVideoSurface live stream={mine} style={StyleSheet.absoluteFill} idleText="Starting your camera…" />
      ) : (
        <View style={styles.preview}>
          <Feather name="camera" size={34} color="rgba(255,255,255,0.35)" />
          <Text style={styles.previewText}>Your camera preview appears here</Text>
        </View>
      )}
      <LinearGradient colors={['rgba(36,22,35,0.6)', 'transparent']} style={[styles.shade, { top: 0, height: insets.top + 96 }]} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(36,22,35,0.92)']} style={[styles.shade, { bottom: 0, height: 320 + insets.bottom }]} pointerEvents="none" />

      <View style={[styles.top, { top: insets.top + spacing.sm }]}>
        {live ? (
          <>
            {mine?.status === 'starting' ? (
              <View style={styles.glassPill}>
                <Text style={styles.pillText}>Starting…</Text>
              </View>
            ) : (
              <LivePill />
            )}
            <View style={styles.glassPill}>
              <Feather name="clock" size={12} color={colors.white} />
              <Text style={styles.pillText}>{mmss(elapsed)}</Text>
            </View>
            <View style={styles.glassPill}>
              <Feather name="eye" size={12} color={colors.white} />
              <Text style={styles.pillText}>{viewerLabel(mine?.viewer_count)}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <View style={styles.glassPill}>
              <Feather name="arrow-up" size={12} color={colors.white} />
              <Text style={styles.pillText}>{mine?.upvote_count ?? 0}</Text>
            </View>
          </>
        ) : (
          <GlassIconButton icon="arrow-left" label="Back" size={40} onPress={exit} />
        )}
      </View>

      <View style={[styles.bottom, { paddingBottom: kb > 0 ? kb + spacing.sm : insets.bottom + spacing.sm }]}>
        {live && mine ? (
          <>
            <View style={styles.who}>
              <Avatar uri={grid?.profile_url} name={grid?.name ?? 'Grid'} size={36} ring />
              <View style={{ flex: 1 }}>
                <Text style={styles.whoName} numberOfLines={1}>{mine.title ?? 'You’re live'}</Text>
                <Text style={styles.whoMeta} numberOfLines={1}>Live in {grid?.name ?? 'your grid'}</Text>
              </View>
            </View>
            {note ? <Text style={[typography.caption, styles.whoMeta]}>{note}</Text> : null}
            <HoldToRecordButton streamId={mine.stream_id} onResult={say} />
            <View style={styles.row}>
              <GlassButton label={`Viewers${active.length ? ` · ${active.length}` : ''}`} size="sm" variant="secondary" style={styles.flex} onPress={() => setViewersOpen(true)} />
              <Pressable onPress={confirmEnd} accessibilityRole="button" accessibilityLabel="End stream" style={[styles.flex, styles.end]}>
                <Feather name="square" size={14} color={colors.white} />
                <Text style={styles.endText}>End stream</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <GlassSurface tone="light" radius={radius.xl} raised contentStyle={styles.panel}>
            <Text style={[typography.cardTitle, styles.panelTitle]}>Go live in {grid?.name ?? 'this grid'}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Add a title (optional)"
              placeholderTextColor={colors.textMuted}
              maxLength={120}
              returnKeyType="done"
              style={styles.input}
              accessibilityLabel="Stream title"
            />
            <Text style={[typography.caption, styles.note]}>
              Members of {grid?.name ?? 'the grid'} can watch and upvote. Viewers comment by posting from a captured moment. Your rear camera and microphone are used, and there is no replay.
            </Text>
            <View style={styles.row}>
              <GlassButton label="Cancel" size="sm" variant="secondary" style={styles.flex} onPress={exit} />
              <GlassButton label={busy ? 'Starting…' : 'Go live'} size="sm" variant="primary" icon="video" style={{ flex: 2 }} disabled={busy || !grid} onPress={start} />
            </View>
          </GlassSurface>
        )}
      </View>

      <GlassSheet visible={viewersOpen} onClose={() => setViewersOpen(false)} title="Viewers">
        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          {participants.length === 0 ? (
            <Text style={[typography.caption, styles.empty]}>No one has joined yet.</Text>
          ) : (
            participants.map((p) => (
              <View key={p.user_id} style={styles.viewer}>
                <Avatar uri={p.profile_pic_url} name={p.display_name} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.rowTitle, styles.viewerName]} numberOfLines={1}>{p.display_name}</Text>
                  <Text style={[typography.rowMeta, styles.viewerMeta]} numberOfLines={1}>@{p.username}</Text>
                </View>
                {p.removed_at ? (
                  <Pill icon="slash" label="Removed" tone="muted" />
                ) : (
                  <GlassButton
                    label="Remove"
                    size="sm"
                    variant="secondary"
                    onPress={() => mine && removeParticipant(mine.stream_id, p.user_id).catch((e) => Alert.alert('Couldn’t remove viewer', e instanceof Error ? e.message : 'Try again.'))}
                  />
                )}
              </View>
            ))
          )}
        </ScrollView>
      </GlassSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  preview: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  previewText: { color: 'rgba(255,255,255,0.45)', ...typography.caption },
  shade: { position: 'absolute', left: 0, right: 0 },
  top: { position: 'absolute', left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  glassPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  pillText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, gap: spacing.md },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  whoName: { color: colors.white, ...typography.rowTitle },
  whoMeta: { color: 'rgba(255,255,255,0.8)', ...typography.rowMeta },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  end: { height: 36, borderRadius: radius.md, backgroundColor: colors.danger, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  endText: { color: colors.white, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  panel: { padding: spacing.md, gap: spacing.sm + 2 },
  panelTitle: { color: colors.textPrimary, ...typography.rowTitle },
  input: { height: 42, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(36,22,35,0.1)', color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 14 },
  note: { color: colors.textMuted, ...typography.rowMeta },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  viewer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: 7 },
  viewerName: { color: colors.textPrimary },
  viewerMeta: { color: colors.textMuted },
});
