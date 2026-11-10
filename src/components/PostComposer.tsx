import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { GlassButton } from './GlassButton';
import { GlassSurface } from './GlassSurface';

export type PickedImage = { uri: string; name: string; mime: string };
export type PostDraft = { text: string; images: PickedImage[]; withLocation: boolean };

const MAX_IMAGES = 4;

type Props = {
  placeholder?: string;
  /** Resolve when the post is saved (the composer then clears); throw to keep the draft. */
  onPost?: (draft: PostDraft) => Promise<void>;
};

/** "Share what's happening around you…" card at the top of a feed: text, up to four photos, and a location tag. */
export function PostComposer({ placeholder = "Share what's happening around you…", onPost }: Props) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [withLocation, setWithLocation] = useState(false);
  const [busy, setBusy] = useState(false);
  const canPost = text.trim().length > 0 && !busy;

  const pick = async () => {
    if (images.length >= MAX_IMAGES) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos are off', 'Allow photo access in Settings to attach pictures.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.8,
    });
    if (res.canceled) return;
    setImages((cur) =>
      [
        ...cur,
        ...res.assets.map((a, i) => {
          const ext = (a.uri.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
          return { uri: a.uri, name: `post-${Date.now()}-${i}.${ext}`, mime: a.mimeType ?? (ext === 'png' ? 'image/png' : 'image/jpeg') };
        }),
      ].slice(0, MAX_IMAGES),
    );
  };

  const submit = async () => {
    if (!canPost) return;
    setBusy(true);
    try {
      await onPost?.({ text: text.trim(), images, withLocation });
      setText('');
      setImages([]);
      setWithLocation(false);
    } catch {
      // the screen already told the user what went wrong; the draft stays
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.card}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={5000}
        style={[typography.cardBody, styles.input]}
      />
      {images.length > 0 ? (
        <View style={styles.thumbs}>
          {images.map((img, i) => (
            <View key={img.uri} style={styles.thumb}>
              <Image source={{ uri: img.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <Pressable
                onPress={() => setImages((cur) => cur.filter((_, idx) => idx !== i))}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                style={styles.remove}
              >
                <Feather name="x" size={12} color={colors.white} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.row}>
        <View style={styles.icons}>
          <Pressable onPress={pick} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add photos" disabled={busy}>
            <Feather name="image" size={18} color={images.length > 0 ? colors.ink : colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => setWithLocation((v) => !v)} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: withLocation }} accessibilityLabel="Tag my location" disabled={busy}>
            <Feather name="map-pin" size={18} color={withLocation ? colors.ink : colors.textMuted} />
          </Pressable>
        </View>
        <GlassButton label={busy ? 'Posting…' : 'Post'} size="sm" disabled={!canPost} style={styles.postBtn} onPress={submit} />
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm },
  input: { color: colors.textPrimary, minHeight: 36, textAlignVertical: 'top', padding: 0 },
  thumbs: { flexDirection: 'row', gap: spacing.sm },
  thumb: { width: 56, height: 56, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.iconTile },
  remove: { position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(36,22,35,0.6)', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icons: { flexDirection: 'row', gap: spacing.md },
  postBtn: { minWidth: 88 },
});
