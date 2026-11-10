import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { GlassButton } from '@/components/GlassButton';
import { FlatGlassProvider } from '@/components/GlassSurface';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ApiError } from '@/data/api/client';
import { createProduct } from '@/data/storeApi';
import { uploadFile } from '@/data/uploadApi';
import { colors, fonts, glass, radius, spacing, typography } from '@/theme';

const MAX_PHOTOS = 5;
const CURRENCIES = ['GHS', 'USD', 'NGN', 'EUR', 'GBP'];

type Photo = { uri: string; name: string; mime: string };

/** Store owners only. Photos, name, price and stock. The first photo becomes the thumbnail. */
export default function AddProductScreen() {
  const insets = useSafeAreaInsets();
  const { storeId, storeName } = useLocalSearchParams<{ storeId: string; storeName?: string }>();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [about, setAbout] = useState('');
  const [inStock, setInStock] = useState(true);
  const [busy, setBusy] = useState(false);

  const amount = Number(price.replace(',', '.'));
  const ready = name.trim().length > 0 && price.trim() !== '' && Number.isFinite(amount) && amount > 0;

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos are off', 'Allow photo access in Settings to add product photos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS - photos.length, quality: 0.8 });
    if (res.canceled) return;
    const next = res.assets.map((a, i) => {
      const ext = (a.uri.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      return { uri: a.uri, name: `product-${Date.now()}-${i}.${ext}`, mime: a.mimeType ?? (ext === 'png' ? 'image/png' : 'image/jpeg') };
    });
    setPhotos((cur) => [...cur, ...next].slice(0, MAX_PHOTOS));
  };

  const save = async () => {
    if (!ready || busy || !storeId) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const p of photos) urls.push(await uploadFile('STORE_UPLOAD', p.uri, p.name, p.mime));
      await createProduct(storeId, { name: name.trim(), price: Math.round(amount * 100) / 100, currency, description: about.trim(), media_urls: urls, in_stock: inStock });
      router.back(); // the store screen reloads its list when it comes back into view
    } catch (e) {
      Alert.alert('Couldn’t add the product', e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader title="Add a product" caption={storeName} />
      <FlatGlassProvider value>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.sm + 2 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
              {photos.map((p, i) => (
                <View key={p.uri} style={styles.photo}>
                  <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <Pressable onPress={() => setPhotos((cur) => cur.filter((_, k) => k !== i))} hitSlop={6} accessibilityRole="button" accessibilityLabel="Remove photo" style={styles.remove}>
                    <Feather name="x" size={12} color={colors.white} />
                  </Pressable>
                </View>
              ))}
              {photos.length < MAX_PHOTOS ? (
                <Pressable onPress={pick} accessibilityRole="button" accessibilityLabel="Add photos" style={[styles.photo, styles.addPhoto]}>
                  <Feather name="image" size={18} color={colors.ink} />
                  <Text style={[typography.caption, styles.muted]}>Add photos</Text>
                </Pressable>
              ) : null}
            </ScrollView>

            <TextInput value={name} onChangeText={setName} placeholder="Product name" placeholderTextColor={colors.textMuted} maxLength={80} style={styles.input} accessibilityLabel="Product name" />
            <TextInput value={price} onChangeText={setPrice} placeholder="Price" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" maxLength={10} style={styles.input} accessibilityLabel="Price" />
            <View style={styles.chips}>
              {CURRENCIES.map((c) => (
                <Pressable key={c} onPress={() => setCurrency(c)} accessibilityRole="button" accessibilityState={{ selected: currency === c }} style={[styles.chip, currency === c && styles.chipOn]}>
                  <Text style={[styles.chipText, currency === c && styles.chipTextOn]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={about} onChangeText={setAbout} placeholder="Description (optional)" placeholderTextColor={colors.textMuted} multiline maxLength={500} style={[styles.input, styles.about]} accessibilityLabel="Description" />
            <View style={styles.stockRow}>
              <Text style={[typography.cardBody, styles.text]}>In stock</Text>
              <Switch value={inStock} onValueChange={setInStock} trackColor={{ true: colors.ink }} />
            </View>
            <GlassButton label={busy ? 'Adding…' : 'Add product'} variant="dark" size="md" disabled={!ready || busy} onPress={save} />
          </ScrollView>
        </KeyboardAvoidingView>
      </FlatGlassProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  muted: { color: colors.textMuted },
  text: { color: colors.textPrimary },
  photos: { gap: spacing.sm },
  photo: { width: 88, height: 88, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.iconTile },
  addPhoto: { alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(36,22,35,0.15)', borderStyle: 'dashed' },
  remove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(36,22,35,0.7)', alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(36,22,35,0.1)', color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 14 },
  about: { minHeight: 72, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: glass.light.fill, borderWidth: 1, borderColor: glass.light.border },
  chipOn: { backgroundColor: glass.dark.fill, borderColor: glass.dark.border },
  chipText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  chipTextOn: { color: colors.white },
  stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
