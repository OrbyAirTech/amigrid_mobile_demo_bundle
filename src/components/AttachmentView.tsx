import { Feather } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing } from '@/theme';
import type { ChatAttachment, ChatMessageView } from '@/types/chat';
import { attachmentOf, formatBytes, formatDuration, nameFromUrl } from '@/utils/media';

type Props = { message: ChatMessageView; mine: boolean };

const ink = (mine: boolean) => (mine ? colors.white : colors.ink);
const soft = (mine: boolean) => (mine ? 'rgba(255,255,255,0.72)' : colors.textMuted);

function Uploading({ p }: { p?: number }) {
  if (p == null) return null;
  return (
    <View style={styles.uploading} pointerEvents="none">
      <Text style={styles.uploadingText}>{Math.round(p * 100)}%</Text>
    </View>
  );
}

function ImageAttachment({ m }: { m: ChatMessageView }) {
  return (
    <View>
      <Image source={{ uri: m.media_url! }} style={styles.image} contentFit="cover" />
      <Uploading p={m.uploadProgress} />
    </View>
  );
}

function VideoModal({ url, onClose }: { url: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(url, (p) => p.play());
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.videoRoot}>
        <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" />
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close video" style={[styles.videoClose, { top: insets.top + spacing.sm }]}>
          <Feather name="x" size={20} color={colors.white} />
        </Pressable>
      </View>
    </Modal>
  );
}

function VideoAttachment({ m, a }: { m: ChatMessageView; a: ChatAttachment }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => m.uploadProgress == null && setOpen(true)} accessibilityRole="button" accessibilityLabel="Play video" style={styles.video}>
        <View style={styles.playDisc}>
          <Feather name="play" size={20} color={colors.white} />
        </View>
        {a.durationSec ? <Text style={styles.videoDuration}>{formatDuration(a.durationSec)}</Text> : null}
        <Uploading p={m.uploadProgress} />
      </Pressable>
      {open ? <VideoModal url={m.media_url!} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

const BARS = 24;
/** Stable pseudo waveform per message (the server does not send one). */
const barsFor = (seed: string) =>
  Array.from({ length: BARS }, (_, i) => {
    const c = seed.charCodeAt(i % seed.length) || 7;
    return 0.3 + ((c * (i + 3)) % 70) / 100;
  });

function AudioAttachment({ m, a, mine }: { m: ChatMessageView; a: ChatAttachment; mine: boolean }) {
  const player = useAudioPlayer(m.media_url!);
  const status = useAudioPlayerStatus(player);
  const bars = useMemo(() => barsFor(m._id), [m._id]);
  const total = status.duration > 0 ? status.duration : (a.durationSec ?? 0);
  const progress = total > 0 ? Math.min(1, status.currentTime / total) : 0;

  useEffect(() => {
    if (status.didJustFinish) void player.seekTo(0);
  }, [status.didJustFinish, player]);

  const toggle = () => (status.playing ? player.pause() : player.play());

  return (
    <View style={styles.audio}>
      <Pressable
        onPress={toggle}
        disabled={m.uploadProgress != null}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice note' : 'Play voice note'}
        style={[styles.audioBtn, { backgroundColor: mine ? 'rgba(255,255,255,0.18)' : colors.iconTile }]}
      >
        <Feather name={status.playing ? 'pause' : 'play'} size={16} color={ink(mine)} />
      </Pressable>
      <View style={styles.wave}>
        {bars.map((h, i) => (
          <View
            key={i}
            style={[styles.bar, { height: 4 + h * 18, backgroundColor: i / BARS < progress ? ink(mine) : soft(mine), opacity: i / BARS < progress ? 1 : 0.55 }]}
          />
        ))}
      </View>
      <Text style={[styles.audioTime, { color: soft(mine) }]}>
        {m.uploadProgress != null ? `${Math.round(m.uploadProgress * 100)}%` : formatDuration(status.playing ? status.currentTime : total)}
      </Text>
    </View>
  );
}

function DocumentAttachment({ m, a, mine }: { m: ChatMessageView; a: ChatAttachment; mine: boolean }) {
  const name = a.name ?? nameFromUrl(m.media_url!);
  const ext = (name.split('.').pop() ?? '').toUpperCase().slice(0, 4);
  const meta = [ext, formatBytes(a.size)].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => m.uploadProgress == null && void Linking.openURL(m.media_url!)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${name}`}
      style={[styles.doc, { backgroundColor: mine ? 'rgba(255,255,255,0.12)' : colors.iconTile }]}
    >
      <View style={[styles.docIcon, { backgroundColor: mine ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)' }]}>
        <Feather name="file-text" size={18} color={ink(mine)} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.docName, { color: ink(mine) }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.docMeta, { color: soft(mine) }]} numberOfLines={1}>
          {m.uploadProgress != null ? `Uploading ${Math.round(m.uploadProgress * 100)}%` : meta || 'Tap to open'}
        </Text>
      </View>
    </Pressable>
  );
}

/** The media part of a message bubble, by kind: photo, video, voice note or document. */
export function AttachmentView({ message: m, mine }: Props) {
  const a = attachmentOf(m);
  if (!a || !m.media_url) return null;
  if (a.kind === 'image') return <ImageAttachment m={m} />;
  if (a.kind === 'video') return <VideoAttachment m={m} a={a} />;
  if (a.kind === 'audio') return <AudioAttachment m={m} a={a} mine={mine} />;
  return <DocumentAttachment m={m} a={a} mine={mine} />;
}

const styles = StyleSheet.create({
  image: { width: 220, aspectRatio: 4 / 3, borderRadius: 12 },
  uploading: { ...StyleSheet.absoluteFill, borderRadius: 12, backgroundColor: 'rgba(36,22,35,0.45)', alignItems: 'center', justifyContent: 'center' },
  uploadingText: { color: colors.white, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  video: { width: 220, height: 124, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  playDisc: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  videoDuration: { position: 'absolute', right: 8, bottom: 6, color: colors.white, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
  videoRoot: { flex: 1, backgroundColor: '#000' },
  videoClose: { position: 'absolute', right: spacing.lg, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  audio: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 210, paddingVertical: 2 },
  audioBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  wave: { flex: 1, height: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bar: { width: 2.5, borderRadius: 2 },
  audioTime: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, minWidth: 30, textAlign: 'right' },
  doc: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 220, padding: 8, borderRadius: radius.sm },
  docIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docName: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  docMeta: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },
});
