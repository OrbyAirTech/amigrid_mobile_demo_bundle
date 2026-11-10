import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventRow } from '@/components/EventRow';
import { FlatGlassProvider } from '@/components/GlassSurface';
import { NavTabBar } from '@/components/NavTabBar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { GlassButton } from '@/components/GlassButton';
import { fetchEvents } from '@/data/exploreApi';
import { colors, navOccupied, spacing, typography } from '@/theme';
import type { GrandFinalEvent } from '@/types/events';
import { dayKey, dayLabel, parseTime } from '@/utils/dateFormat';
import { openGridProfile } from '@/utils/gridNav';
import { usePagedList } from '@/utils/usePagedList';

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

/** Explore -> Events. Upcoming and in-progress events, grouped by day. Tapping one opens its grid's profile. */
export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const list = usePagedList<GrandFinalEvent>(fetchEvents);

  const sections = useMemo(() => {
    const now = Date.now();
    const sorted = [...list.items]
      .filter((e) => parseTime(e.event_details.ends_at) > now) // hide finished events
      .sort((a, b) => parseTime(a.event_details.starts_at) - parseTime(b.event_details.starts_at));
    const byDay = new Map<number, { title: string; data: GrandFinalEvent[] }>();
    for (const e of sorted) {
      const t = parseTime(e.event_details.starts_at);
      const eff = Math.max(t, now); // an event already under way counts as today
      const k = dayKey(eff);
      if (!byDay.has(k)) byDay.set(k, { title: dayLabel(eff, now), data: [] });
      byDay.get(k)!.data.push(e);
    }
    return [...byDay.values()];
  }, [list.items]);

  const count = sections.reduce((n, s) => n + s.data.length, 0);

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <TabScreenHeader title="Events" caption={`${count} upcoming`} />

      <FlatGlassProvider value>
        <SectionList
          sections={sections}
          keyExtractor={(e) => e.event_details.id}
          renderItem={({ item }) => <EventRow item={item} onPress={(e) => openGridProfile(router, e.space_details.space_id)} />}
          renderSectionHeader={({ section }) => <Text style={[typography.cardTitle, styles.section]}>{section.title}</Text>}
          stickySectionHeadersEnabled={false}
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
              <Text style={[typography.body, styles.emptyText, styles.empty]}>No events coming up.</Text>
            )
          }
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.ink} style={{ marginVertical: spacing.md }} /> : null}
          contentContainerStyle={{ paddingTop: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: navOccupied(insets.bottom) + spacing.lg }}
          showsVerticalScrollIndicator={false}
        />
      </FlatGlassProvider>

      <NavTabBar active="events" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  section: { color: colors.textPrimary, paddingTop: spacing.md, paddingBottom: spacing.sm, paddingHorizontal: spacing.xs },
  empty: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
});
