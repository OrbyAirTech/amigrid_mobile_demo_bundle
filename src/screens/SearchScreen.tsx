import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CatalogChips } from '@/components/CatalogChips';
import { FlatGlassProvider, GlassSurface } from '@/components/GlassSurface';
import { GridListItem } from '@/components/GridListItem';
import { HeaderMessagesButton } from '@/components/HeaderMessagesButton';
import { HeaderProfileButton } from '@/components/HeaderProfileButton';
import { HeaderScanButton } from '@/components/HeaderScanButton';
import { HorizontalSection } from '@/components/HorizontalSection';
import { NavTabBar } from '@/components/NavTabBar';
import { RecommendedGridCard } from '@/components/RecommendedGridCard';
import { RecommendedStoreCard } from '@/components/RecommendedStoreCard';
import { ScreenBackground } from '@/components/ScreenBackground';
import { SearchField } from '@/components/SearchField';
import { StoreCard } from '@/components/StoreCard';
import { UserCard } from '@/components/UserCard';
import { EventRow } from '@/components/EventRow';
import { GlassButton } from '@/components/GlassButton';
import { LiveGridRow } from '@/components/LiveGridRow';
import { ApiError } from '@/data/api/client';
import { sendAmigoRequest } from '@/data/discoveryApi';
import { refreshDiscovery, refreshTrending, useDiscovery } from '@/data/discoveryStore';
import { fetchEvents, fetchLiveGrids } from '@/data/exploreApi';
import { PAGE_SIZE } from '@/data/amigosApi';
import { NO_RESULTS, searchAll, searchKind, type SearchAll, type SearchKind } from '@/data/searchApi';
import { colors, fonts, navOccupied, radius, spacing, typography } from '@/theme';
import type { StoreItem, UserItem } from '@/types/discovery';
import type { SpaceListSkeleton } from '@/types/feed';
import type { SearchCatalog } from '@/types/search';
import type { GrandFinalEvent } from '@/types/events';
import type { SpaceInitials } from '@/types/live';
import { openGridFeed, openGridProfile } from '@/utils/gridNav';
import { navigateTab } from '@/utils/tabNav';
import { usePagedList } from '@/utils/usePagedList';

const CARD_W = 224;

type Result =
  | { kind: 'grid'; key: string; data: SpaceListSkeleton }
  | { kind: 'store'; key: string; data: StoreItem }
  | { kind: 'user'; key: string; data: UserItem };

const EMPTY_COPY: Partial<Record<SearchCatalog, string>> = {
  live: 'No live threads right now.',
  events: 'No events to show yet.',
};

const matches = (q: string, ...fields: (string | undefined)[]) => !q || fields.some((f) => f?.toLowerCase().includes(q));
const errText = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Try again.');

/** Waits for typing to pause before the value is used to search. */
function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const discovery = useDiscovery();
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<SearchCatalog>('all');
  const [sent, setSent] = useState<Set<string>>(new Set());

  const q = query.trim().toLowerCase();
  const term = useDebounced(query.trim(), 350);
  const typing = query.trim() !== term; // the box has moved on from what was last searched
  const searchable = catalog !== 'live' && catalog !== 'events';
  const showHome = catalog === 'all' && !q; // otherwise show a results list

  useEffect(() => {
    refreshTrending();
    refreshDiscovery();
  }, []);

  // Live now and Events have no search route: load the list and filter it as you type.
  const live = usePagedList<SpaceInitials>((o) => (catalog === 'live' ? fetchLiveGrids(o) : Promise.resolve([])), catalog);
  const events = usePagedList<GrandFinalEvent>((o) => (catalog === 'events' ? fetchEvents(o) : Promise.resolve([])), catalog);

  // Everything else goes to the server.
  const [found, setFound] = useState<SearchAll>(NO_RESULTS);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!searchable || !term) {
      setFound(NO_RESULTS);
      setMore(false);
      setSearching(false);
      setSearchError(null);
      return;
    }
    let live = true;
    setSearching(true);
    setSearchError(null);
    const run = catalog === 'all' ? searchAll(term) : searchKind(catalog as SearchKind, term, 0);
    run
      .then((r) => {
        if (!live) return;
        setFound(r);
        // The combined search is a short preview; a single kind pages on until a page comes back short.
        setMore(catalog !== 'all' && Math.max(r.users.length, r.grids.length, r.stores.length) >= PAGE_SIZE);
      })
      .catch((e) => live && setSearchError(errText(e)))
      .finally(() => live && setSearching(false));
    return () => {
      live = false;
    };
  }, [catalog, term, retry, searchable]);

  const loadMore = async () => {
    if (loadingMore || !more || catalog === 'all') return;
    const have = Math.max(found.users.length, found.grids.length, found.stores.length);
    setLoadingMore(true);
    try {
      const r = await searchKind(catalog as SearchKind, term, have);
      setFound((cur) => ({ users: [...cur.users, ...r.users], grids: [...cur.grids, ...r.grids], stores: [...cur.stores, ...r.stores] }));
      setMore(Math.max(r.users.length, r.grids.length, r.stores.length) >= PAGE_SIZE);
    } catch (e) {
      Alert.alert('Couldn’t load more', errText(e));
    } finally {
      setLoadingMore(false);
    }
  };

  const results = useMemo<Result[]>(() => {
    const grids: Result[] = found.grids.map((g) => ({ kind: 'grid', key: `g-${g.id}`, data: g }));
    const stores: Result[] = found.stores.map((s) => ({ kind: 'store', key: `s-${s.entity_id}`, data: s }));
    const users: Result[] = found.users.map((u) => ({ kind: 'user', key: `u-${u.entity_id}`, data: { ...u, request_sent: sent.has(u.entity_id) } }));
    return [...grids, ...stores, ...users];
  }, [found, sent]);

  const liveRows = useMemo(() => live.items.filter((g) => matches(q, g.name, g.description)), [live.items, q]);
  const eventRows = useMemo(() => events.items.filter((e) => matches(q, e.event_details.title, e.space_details.space_name)), [events.items, q]);

  // Home: grids that are trending anywhere, stores near you (when there's a location).
  const trendingGrids = useMemo<SpaceListSkeleton[]>(
    () =>
      discovery.trending.items.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        participant_count: t.participant_count,
        access_mode: '',
        profile_url: t.profile_url,
      })),
    [discovery.trending.items],
  );
  const nearbyStores = discovery.store.items;

  const openStore = (s: StoreItem) => s.entity_id && router.push({ pathname: '/store', params: { id: s.entity_id } });
  const openUser = (u: UserItem) => router.push({ pathname: '/user', params: { id: u.entity_id, amigo: u.are_amigos ? '1' : '' } });

  const sendRequest = async (u: UserItem) => {
    try {
      await sendAmigoRequest(u.entity_id);
      setSent((cur) => new Set(cur).add(u.entity_id));
    } catch (e) {
      Alert.alert('Could not send request', errText(e));
    }
  };

  const listLoading = catalog === 'live' ? live.loading : catalog === 'events' ? events.loading : false;
  const listError = catalog === 'live' ? live.error : catalog === 'events' ? events.error : null;
  const busy = searchable ? (!!q && (typing || searching)) : listLoading;
  const error = searchable ? searchError : listError;

  // "See all" on the home rows (no text typed): grids are the trending list, stores are the nearby list.
  const browse: Result[] =
    catalog === 'grid' ? trendingGrids.map((g) => ({ kind: 'grid', key: `g-${g.id}`, data: g }))
    : catalog === 'store' ? nearbyStores.map((s, i) => ({ kind: 'store', key: `s-${s.entity_id ?? i}`, data: s }))
    : [];
  const shown = searchable && !q ? browse : results;

  return (
    <View style={styles.root}>
      <ScreenBackground />

      {/* Header: profile (left), title, then scan + messages (right). */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <HeaderProfileButton />
        <Text style={[typography.title, styles.title]}>Search</Text>
        <View style={{ flex: 1 }} />
        {/* Scan to find someone in person. Camera isn't wired up yet (native module), button is a placeholder. */}
        <HeaderScanButton />
        <HeaderMessagesButton />
      </View>

      <View style={styles.controls}>
        <View style={styles.fieldWrap}>
          <SearchField value={query} onChangeText={setQuery} />
        </View>
        <CatalogChips value={catalog} onChange={setCatalog} />
      </View>

      <FlatGlassProvider value>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: navOccupied(insets.bottom) + spacing.lg }}
        >
          {showHome ? (
            <View style={styles.home}>
              {trendingGrids.length > 0 ? (
                <HorizontalSection
                  icon="grid"
                  title="Trending Grids"
                  data={trendingGrids}
                  keyExtractor={(g) => g.id}
                  cardWidth={CARD_W}
                  onSeeAll={() => setCatalog('grid')}
                  renderItem={(g) => <RecommendedGridCard item={g} width={CARD_W} onPress={(i) => openGridFeed(router, i.id)} />}
                />
              ) : null}
              {nearbyStores.length > 0 ? (
                <HorizontalSection
                  icon="shopping-bag"
                  title="Stores Near You"
                  data={nearbyStores}
                  keyExtractor={(s) => s.entity_id ?? s.name}
                  cardWidth={CARD_W}
                  onSeeAll={() => setCatalog('store')}
                  renderItem={(s) => (
                    <RecommendedStoreCard item={s} width={CARD_W} onPress={openStore} />
                  )}
                />
              ) : null}
              {trendingGrids.length === 0 && nearbyStores.length === 0 && !discovery.trending.loaded ? (
                <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.lg }} />
              ) : null}

              <Pressable onPress={() => navigateTab(router, 'search', 'map')} accessibilityRole="button" accessibilityLabel="Switch to map view" style={styles.mapBannerWrap}>
                <GlassSurface tone="dark" radius={radius.lg} raised contentStyle={styles.mapBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.caption, styles.mapKicker]}>VISUAL DISCOVERY</Text>
                    <Text style={[typography.cardTitle, styles.mapTitle]}>Switch to Map View</Text>
                  </View>
                  <Feather name="map" size={22} color={colors.white} />
                </GlassSurface>
              </Pressable>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={[typography.body, styles.empty, { marginTop: 0 }]}>{error}</Text>
              <GlassButton
                label="Try again"
                size="sm"
                variant="primary"
                style={{ minWidth: 140 }}
                onPress={() => (catalog === 'live' ? live.reload() : catalog === 'events' ? events.reload() : setRetry((n) => n + 1))}
              />
            </View>
          ) : busy ? (
            <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xxl }} />
          ) : catalog === 'live' ? (
            liveRows.length === 0 ? (
              <Text style={[typography.body, styles.empty]}>{q ? `No results for “${query.trim()}”.` : EMPTY_COPY.live}</Text>
            ) : (
              <View style={styles.results}>
                {liveRows.map((g) => (
                  <LiveGridRow key={g.id} item={g} onPress={(i) => openGridFeed(router, i.id)} />
                ))}
              </View>
            )
          ) : catalog === 'events' ? (
            eventRows.length === 0 ? (
              <Text style={[typography.body, styles.empty]}>{q ? `No results for “${query.trim()}”.` : EMPTY_COPY.events}</Text>
            ) : (
              <View style={styles.results}>
                {eventRows.map((e) => (
                  <EventRow key={e.event_details.id} item={e} onPress={(i) => openGridProfile(router, i.space_details.space_id)} />
                ))}
              </View>
            )
          ) : shown.length === 0 ? (
            <Text style={[typography.body, styles.empty]}>
              {q ? `No results for “${query.trim()}”.` : (EMPTY_COPY[catalog] ?? 'Type a name to search.')}
            </Text>
          ) : (
            <View style={styles.results}>
              {shown.map((r) =>
                r.kind === 'grid' ? (
                  <GridListItem key={r.key} item={r.data} onPress={(i) => openGridFeed(router, i.id)} />
                ) : r.kind === 'store' ? (
                  <StoreCard key={r.key} item={r.data} onPress={openStore} />
                ) : (
                  <UserCard key={r.key} item={r.data} onSendRequest={sendRequest} onPress={openUser} />
                ),
              )}
              {more && q ? (
                <GlassButton label={loadingMore ? 'Loading…' : 'Show more'} size="sm" variant="secondary" disabled={loadingMore} onPress={loadMore} style={styles.more} />
              ) : null}
            </View>
          )}
        </ScrollView>
      </FlatGlassProvider>

      <NavTabBar active="search" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  title: { color: colors.textPrimary, marginLeft: spacing.xs, ...typography.screenTitle },
  controls: { gap: spacing.md, marginTop: spacing.md },
  fieldWrap: { paddingHorizontal: spacing.lg },
  home: { gap: spacing.md },
  results: { paddingHorizontal: spacing.lg, gap: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl, paddingHorizontal: spacing.xl },
  more: { alignSelf: 'center', minWidth: 150 },
  errorBox: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl },
  mapBannerWrap: { paddingHorizontal: spacing.lg },
  mapBanner: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  mapKicker: { color: 'rgba(255,255,255,0.7)', letterSpacing: 0.6, fontFamily: fonts.semibold },
  mapTitle: { color: colors.white },
});
