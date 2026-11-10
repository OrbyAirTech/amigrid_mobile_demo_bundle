import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { FlatGlassProvider } from '@/components/GlassSurface';
import { GridListItem } from '@/components/GridListItem';
import { NavTabBar } from '@/components/NavTabBar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { GlassButton } from '@/components/GlassButton';
import { refreshMyGrids, useMyGrids } from '@/data/myGridsStore';
import { colors, navOccupied, spacing, typography } from '@/theme';
import { openGridFeed } from '@/utils/gridNav';

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

/** Profile -> Grid counter. The grids you belong to. Tap one to open its feed. */
export default function GridsListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, loaded, loading, error } = useMyGrids();

  useEffect(() => {
    refreshMyGrids();
  }, []);

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader title="Grids" caption={`${items.length} ${items.length === 1 ? 'grid' : 'grids'}`} fallback="/profile" />

      <FlatGlassProvider value>
        <FlatList
          data={items}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => (
            <GridListItem item={item} onPress={(g) => openGridFeed(router, g.id)} />
          )}
          ItemSeparatorComponent={Separator}
          refreshControl={<RefreshControl refreshing={loading && loaded} onRefresh={refreshMyGrids} tintColor={colors.ink} />}
          ListEmptyComponent={
            !loaded || (loading && items.length === 0) ? (
              <ActivityIndicator color={colors.ink} style={styles.empty} />
            ) : error ? (
              <View style={styles.empty}>
                <Text style={[typography.body, styles.emptyText]}>{error}</Text>
                <GlassButton label="Try again" size="sm" variant="primary" onPress={refreshMyGrids} style={{ minWidth: 140 }} />
              </View>
            ) : (
              <Text style={[typography.body, styles.emptyText, styles.empty]}>You haven’t joined any grids yet.</Text>
            )
          }
          contentContainerStyle={{ paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: navOccupied(insets.bottom) + spacing.lg }}
          showsVerticalScrollIndicator={false}
        />
      </FlatGlassProvider>

      <NavTabBar active="grids" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
});
