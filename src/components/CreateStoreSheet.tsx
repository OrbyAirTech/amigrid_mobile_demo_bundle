import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/data/api/client';
import { refreshMyProfile } from '@/data/currentUserStore';
import { createStore } from '@/data/storeApi';
import { colors, fonts, glass, radius, spacing, typography } from '@/theme';
import { getCurrentFix } from '@/utils/locationPermission';
import { GlassButton } from './GlassButton';
import { GlassSheet } from './GlassSheet';

const CATEGORIES = ['Food', 'Fashion', 'Beauty', 'Groceries', 'Electronics', 'Services', 'Home', 'Other'];

type Props = { visible: boolean; onClose: () => void };

/** Name, what it sells and a category. The store can sit on the map at your current spot. Opens the new store when it's made. */
export function CreateStoreSheet({ visible, onClose }: Props) {
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [category, setCategory] = useState('');
  const [onMap, setOnMap] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) return;
    setName('');
    setAbout('');
    setCategory('');
  }, [visible]);

  const ready = name.trim().length > 0 && about.trim().length > 0 && !!category;

  const create = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const fix = onMap ? await getCurrentFix() : null;
      const id = await createStore({
        name: name.trim(),
        description: about.trim(),
        category,
        location: fix ? { latitude: fix.latitude, longitude: fix.longitude } : undefined,
      });
      void refreshMyProfile();
      onClose();
      router.push({ pathname: '/store', params: { id } });
    } catch (e) {
      Alert.alert('Couldn’t create the store', e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassSheet visible={visible} onClose={onClose} title="Create a store">
      <View style={styles.body}>
        <TextInput value={name} onChangeText={setName} placeholder="Store name" placeholderTextColor={colors.textMuted} maxLength={60} style={styles.input} accessibilityLabel="Store name" />
        <TextInput
          value={about}
          onChangeText={setAbout}
          placeholder="What do you sell?"
          placeholderTextColor={colors.textMuted}
          maxLength={300}
          multiline
          style={[styles.input, styles.about]}
          accessibilityLabel="Store description"
        />
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => setCategory(c)} accessibilityRole="button" accessibilityState={{ selected: category === c }} style={[styles.chip, category === c && styles.chipOn]}>
              <Text style={[styles.chipText, category === c && styles.chipTextOn]}>{c}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.mapRow}>
          <Text style={[typography.cardBody, styles.mapText]}>Show on the map at my location</Text>
          <Switch value={onMap} onValueChange={setOnMap} trackColor={{ true: colors.ink }} />
        </View>
        <GlassButton label={busy ? 'Creating…' : 'Create store'} variant="dark" size="md" disabled={!ready || busy} onPress={create} />
      </View>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm + 2 },
  input: { minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(36,22,35,0.1)', color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 14 },
  about: { minHeight: 72, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: glass.light.fill, borderWidth: 1, borderColor: glass.light.border },
  chipOn: { backgroundColor: glass.dark.fill, borderColor: glass.dark.border },
  chipText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  chipTextOn: { color: colors.white },
  mapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapText: { color: colors.textPrimary, flex: 1 },
});
