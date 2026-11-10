import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlatGlassProvider } from '@/components/GlassSurface';
import { LiveGridRow } from '@/components/LiveGridRow';
import { NavTabBar } from '@/components/NavTabBar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { GlassButton } from '@/components/GlassButton';
import { fetchLiveGrids } from '@/data/exploreApi';
import { colors, navOccupied, spacing, typography } from '@/theme';
import type { SpaceInitials } from '@/types/live';
import { openGridFeed } from '@/utils/gridNav';
import { usePagedList } from '@/utils/usePagedList';

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

/** Explore -> Watch live. Lists the grids that are streaming right now, busiest first. */
export default function LiveGridsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const list = usePagedList<SpaceInitials>(fetchLiveGrids);
  const grids = useMemo(() => [...list.items].sort((a, b) => b.live_stream_count - a.live_stream_count), [list.items]);
  const streams = grids.reduce((n, g) => n + g.live_stream_count, 0);

  const open = (g: SpaceInitials) => openGridFeed(router, g.id);

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <TabScreenHeader title="Live now" caption={`${grids.length} grids · ${streams} streams`} />

      <FlatGlassProvider value>
        <FlatList
          data={grids}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => <LiveGridRow item={item} onPress={open} />}
          ItemSeparatorComponent={Separator}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.ink} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            list.loading ? (
              <ActivityIndicator color={colors.ink} style={styles.empty} />
            ) : list.error ? (
              <View style={styles.empty}>
                <Text style={[typography.body, styles.emptyText]}>{list.error}</Text>
                <GlassButton label="Try again" size="sm" variant="primary" onPress={list.reload} style={{ minWidth: 140 }} />
              </View>
            ) : (
              <Text style={[typography.body, styles.emptyText, styles.empty]}>No grids are live right now.</Text>
            )
          }
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.ink} style={{ marginVertical: spacing.md }} /> : null}
          contentContainerStyle={{ paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: navOccupied(insets.bottom) + spacing.lg }}
          showsVerticalScrollIndicator={false}
        />
      </FlatGlassProvider>

      <NavTabBar active="live" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
});
