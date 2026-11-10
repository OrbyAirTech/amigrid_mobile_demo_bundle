import { Feather } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing, typography } from '@/theme';
import { MAX_UPLOAD_BYTES, formatBytes, formatDuration, type PickedFile } from '@/utils/media';
import { BlinkingOutline } from './BlinkingOutline';
import { GlassSheet } from './GlassSheet';
import { GlassSurface } from './GlassSurface';
import { useKeyboardHeight } from './ReplyComposer';
import { SheetAction } from './SheetAction';

type Props = {
  onSend: (text: string) => void;
  /** A photo, video, voice note or document, ready to upload and send. Omit to hide attachments. */
  onAttach?: (file: PickedFile) => void;
  /** Text of the message being edited, or null. */
  editing?: string | null;
  onCancelEdit?: () => void;
  /** Fired as the person types (the caller throttles it). */
  onTyping?: () => void;
  placeholder?: string;
};

const MAX_VOICE_SEC = 300;

const fromAsset = (a: ImagePicker.ImagePickerAsset): PickedFile => {
  const video = a.type === 'video';
  return {
    uri: a.uri,
    name: a.fileName ?? `${video ? 'video' : 'photo'}-${Date.now()}.${video ? 'mp4' : 'jpg'}`,
    mime: a.mimeType ?? (video ? 'video/mp4' : 'image/jpeg'),
    kind: video ? 'video' : 'image',
    size: a.fileSize,
    durationSec: a.duration ? Math.round(a.duration / 1000) : undefined,
  };
};

/** Compact glass input bar that sits under the thread and rides above the keyboard. Text, attachments, voice notes. */
export function ChatComposer({ onSend, onAttach, editing = null, onCancelEdit, onTyping, placeholder = 'Message…' }: Props) {
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const [text, setText] = useState('');
  const [sheet, setSheet] = useState(false);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const canSend = text.trim().length > 0;
  const showMic = !!onAttach && !canSend && editing == null;

  useEffect(() => {
    if (editing != null) setText(editing);
  }, [editing]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  useEffect(() => {
    if (recording && secs >= MAX_VOICE_SEC) void stopRecording(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secs, recording]);

  const emit = (file: PickedFile) => {
    if (file.size != null && file.size > MAX_UPLOAD_BYTES) {
      Alert.alert('File too large', `Files can be up to ${formatBytes(MAX_UPLOAD_BYTES)}. This one is ${formatBytes(file.size)}.`);
      return;
    }
    onAttach?.(file);
  };

  const pickMedia = async () => {
    setSheet(false);
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (!r.canceled && r.assets[0]) emit(fromAsset(r.assets[0]));
  };

  const takeMedia = async () => {
    setSheet(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access', 'Allow camera access in Settings to take photos and videos.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (!r.canceled && r.assets[0]) emit(fromAsset(r.assets[0]));
  };

  const pickDocument = async () => {
    setSheet(false);
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    const a = r.canceled ? null : r.assets[0];
    if (a) emit({ uri: a.uri, name: a.name, mime: a.mimeType ?? 'application/octet-stream', kind: 'document', size: a.size });
  };

  const startRecording = async () => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Microphone access', 'Allow microphone access in Settings to record voice notes.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setSecs(0);
    setRecording(true);
  };

  const stopRecording = async (send: boolean) => {
    const length = secs;
    setRecording(false);
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    if (send && recorder.uri && length >= 1) {
      emit({ uri: recorder.uri, name: `voice-note-${Date.now()}.m4a`, mime: 'audio/m4a', kind: 'audio', durationSec: length });
    }
  };

  return (
    <View style={[styles.wrap, { paddingBottom: kb > 0 ? kb + spacing.sm : insets.bottom + spacing.sm }]}>
      {editing != null ? (
        <View style={styles.editing}>
          <Feather name="edit-2" size={12} color={colors.ink} />
          <Text style={[typography.caption, styles.editingText]}>Editing message</Text>
          <Pressable
            onPress={() => {
              setText('');
              onCancelEdit?.();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Cancel edit"
          >
            <Feather name="x" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      {recording ? (
        <GlassSurface tone="light" radius={radius.xl} raised contentStyle={styles.bar}>
          <Pressable onPress={() => void stopRecording(false)} style={styles.round} accessibilityRole="button" accessibilityLabel="Discard recording">
            <Feather name="trash-2" size={17} color={colors.ink} />
          </Pressable>
          <View style={styles.recInfo}>
            <View style={styles.recDot}>
              <BlinkingOutline active radius={5} color={colors.danger} width={5} />
            </View>
            <Text style={[typography.cardBody, styles.recTime]}>{formatDuration(secs)}</Text>
            <Text style={[typography.caption, styles.recHint]}>Recording…</Text>
          </View>
          <Pressable onPress={() => void stopRecording(true)} style={styles.send} accessibilityRole="button" accessibilityLabel="Send voice note">
            <Feather name="arrow-up" size={18} color={colors.white} />
          </Pressable>
        </GlassSurface>
      ) : (
        <GlassSurface tone="light" radius={radius.xl} raised contentStyle={styles.bar}>
          {onAttach && editing == null ? (
            <Pressable onPress={() => setSheet(true)} style={styles.round} accessibilityRole="button" accessibilityLabel="Attach a file">
              <Feather name="plus" size={19} color={colors.ink} />
            </Pressable>
          ) : null}
          <TextInput
            value={text}
            onChangeText={(t) => {
              setText(t);
              if (t && !editing) onTyping?.();
            }}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.ink}
            multiline
            maxLength={5000}
            accessibilityLabel="Message"
            style={[typography.cardBody, styles.input]}
          />
          {showMic ? (
            <Pressable onPress={() => void startRecording()} style={styles.send} accessibilityRole="button" accessibilityLabel="Record a voice note">
              <Feather name="mic" size={17} color={colors.white} />
            </Pressable>
          ) : (
            <Pressable
              disabled={!canSend}
              onPress={() => {
                onSend(text.trim());
                setText('');
              }}
              accessibilityRole="button"
              accessibilityLabel={editing != null ? 'Save edit' : 'Send message'}
              style={[styles.send, { opacity: canSend ? 1 : 0.4 }]}
            >
              <Feather name={editing != null ? 'check' : 'arrow-up'} size={18} color={colors.white} />
            </Pressable>
          )}
        </GlassSurface>
      )}

      <GlassSheet visible={sheet} onClose={() => setSheet(false)} title="Send">
        <SheetAction icon="image" label="Photo or video" divider={false} onPress={() => void pickMedia()} />
        <SheetAction icon="camera" label="Camera" onPress={() => void takeMedia()} />
        <SheetAction icon="file-text" label="Document" onPress={() => void pickDocument()} />
      </GlassSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, gap: spacing.xs },
  editing: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm },
  editingText: { flex: 1, color: colors.ink },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingLeft: 5, paddingRight: 5, paddingVertical: 5 },
  input: { flex: 1, color: colors.textPrimary, maxHeight: 96, paddingVertical: 7, paddingHorizontal: 0 },
  round: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.iconTile, alignItems: 'center', justifyContent: 'center' },
  send: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  recInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center' },
  recDot: { width: 10, height: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  recTime: { color: colors.textPrimary, fontFamily: fonts.bold },
  recHint: { color: colors.textMuted },
});
