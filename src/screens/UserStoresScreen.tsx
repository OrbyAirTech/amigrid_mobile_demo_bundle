import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { CreateStoreSheet } from '@/components/CreateStoreSheet';
import { GlassButton } from '@/components/GlassButton';
import { GlassIconButton } from '@/components/GlassIconButton';
import { FlatGlassProvider, GlassSurface } from '@/components/GlassSurface';
import { Pill } from '@/components/Pill';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ApiError } from '@/data/api/client';
import { meId } from '@/data/chatStore';
import { fetchUserStores } from '@/data/storeApi';
import { colors, radius, spacing, typography } from '@/theme';
import type { UserStore } from '@/types/store';

/** Profile -> Store counter. The stores one person runs. With no `userId` it is your own list. */
export default function UserStoresScreen() {
  const insets = useSafeAreaInsets();
  const { userId, name } = useLocalSearchParams<{ userId?: string; name?: string }>();
  const target = userId || meId();
  const mine = target === meId();
  const [items, setItems] = useState<UserStore[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(
    async (pull = false) => {
      if (!target) return;
      if (pull) setRefreshing(true);
      setError(null);
      try {
        setItems(await fetchUserStores(target));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Couldn’t load the stores.');
      } finally {
        setRefreshing(false);
      }
    },
    [target],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader
        title={mine ? 'My stores' : name ? `${name}’s stores` : 'Stores'}
        caption={items ? `${items.length} ${items.length === 1 ? 'store' : 'stores'}` : undefined}
        fallback="/profile"
        right={mine ? <GlassIconButton icon="plus" label="Create a store" size={40} onPress={() => setCreating(true)} /> : undefined}
      />
      <FlatGlassProvider value>
        <FlatList
          data={items ?? []}
          keyExtractor={(s) => s.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/store', params: { id: item.id } })} accessibilityRole="button" accessibilityLabel={item.name} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
              <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.row}>
                <View style={styles.logo}>
                  {item.logo_url ? <Image source={{ uri: item.logo_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Feather name="shopping-bag" size={18} color={colors.ink} />}
                </View>
                <View style={styles.body}>
                  <View style={styles.nameRow}>
                    <Text style={[typography.rowTitle, styles.name]} numberOfLines={1}>{item.name}</Text>
                    {item.is_verified ? <Feather name="check-circle" size={13} color={colors.ink} /> : null}
                  </View>
                  {item.description ? <Text style={[typography.rowMeta, styles.muted]} numberOfLines={1}>{item.description}</Text> : null}
                </View>
                <Pill icon={item.is_open ? 'check-circle' : 'x-circle'} label={item.is_open ? 'Open Now' : 'Closed'} tone={item.is_open ? 'success' : 'muted'} />
              </GlassSurface>
            </Pressable>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.ink} />}
          ListEmptyComponent={
            items === null && !error ? (
              <ActivityIndicator color={colors.ink} style={styles.empty} />
            ) : error ? (
              <View style={styles.empty}>
                <Text style={[typography.body, styles.muted, styles.center]}>{error}</Text>
                <GlassButton label="Try again" size="sm" variant="primary" onPress={() => load()} style={{ minWidth: 140 }} />
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={[typography.body, styles.muted, styles.center]}>{mine ? 'You don’t have a store yet.' : 'No stores yet.'}</Text>
                {mine ? <GlassButton label="Create a store" size="sm" variant="primary" icon="plus" onPress={() => setCreating(true)} style={{ minWidth: 160 }} /> : null}
              </View>
            )
          }
          contentContainerStyle={{ paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          showsVerticalScrollIndicator={false}
        />
      </FlatGlassProvider>
      {mine ? <CreateStoreSheet visible={creating} onClose={() => setCreating(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, padding: spacing.sm + 2 },
  logo: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.iconTile, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  body: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: colors.textPrimary, flexShrink: 1 },
  muted: { color: colors.textMuted },
  center: { textAlign: 'center' },
  empty: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.md },
});
