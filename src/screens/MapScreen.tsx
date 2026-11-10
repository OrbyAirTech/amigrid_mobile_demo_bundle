import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiscoverySheet } from '@/components/DiscoverySheet';
import { HeaderMessagesButton } from '@/components/HeaderMessagesButton';
import { HeaderProfileButton } from '@/components/HeaderProfileButton';
import { DiscoveryStatCard } from '@/components/DiscoveryStatCard';
import { GlassButton } from '@/components/GlassButton';
import { LivePin } from '@/components/LivePin';
import { MapCanvas, type MapPin } from '@/components/MapCanvas';
import { NavTabBar } from '@/components/NavTabBar';
import { SegmentedToggle } from '@/components/SegmentedToggle';
import { SpaceCard } from '@/components/SpaceCard';
import { StoreCard } from '@/components/StoreCard';
import { TrendingSpaceCard } from '@/components/TrendingSpaceCard';
import { UserCard } from '@/components/UserCard';
import { ApiError } from '@/data/api/client';
import { joinDiscoveredSpace, refreshDiscovery, refreshTrending, requestAmigo, useDiscovery } from '@/data/discoveryStore';
import { colors, fonts, spacing, typography } from '@/theme';
import type { DiscoveryItem, SpaceItem, StoreItem, UserItem } from '@/types/discovery';
import type { TrendingSpace } from '@/types/trending';
import { requestForegroundPermissionsAsync } from '@/utils/locationPermission';
import { getCoords } from '@/utils/discoveryCoords';
import { openGridProfile } from '@/utils/gridNav';

const COLLAPSED_HEIGHT = 300;
const WINDOW_HEIGHT = Dimensions.get('window').height;

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const REPING_MS = 5 * 60_000;
const actionError = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Try again.');

function Notice({ title, body, action }: { title: string; body: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.notice}>
      <Text style={[typography.cardTitle, styles.noticeTitle]}>{title}</Text>
      <Text style={[typography.rowMeta, styles.noticeBody]}>{body}</Text>
      {action ? <GlassButton label={action.label} size="sm" variant="secondary" onPress={action.onPress} style={styles.noticeBtn} /> : null}
    </View>
  );
}

type Tab = 'space' | 'user' | 'store';
type Section = 'trending' | 'nearby';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const expandedHeight = WINDOW_HEIGHT - insets.top - 64;

  // Trending is always the default section whenever this screen is opened.
  const [section, setSection] = useState<Section>('trending');
  const [tab, setTab] = useState<Tab>('space');

  const discovery = useDiscovery();
  const list = discovery[tab];

  // Load as soon as the map is on screen (the sheet starts collapsed), and keep this user's position
  // fresh on the engine while they stay here.
  useEffect(() => {
    refreshDiscovery();
    refreshTrending();
    const id = setInterval(() => refreshDiscovery({ force: true }), REPING_MS);
    return () => clearInterval(id);
  }, []);

  // Plot whatever list is on screen: trending spaces carry their own coordinates, the nearby lists carry them
  // once the server includes them in resolve_many. Anything without a position is simply not plotted.
  const pins: MapPin[] =
    section === 'trending'
      ? discovery.trending.items.flatMap((t) =>
          typeof t.latitude === 'number' && typeof t.longitude === 'number'
            ? [{ key: `trending-${t.id}`, kind: 'space' as const, image: t.profile_url || undefined, at: { latitude: t.latitude, longitude: t.longitude } }]
            : [],
        )
      : list.items.flatMap((item) => {
          const at = getCoords(item);
          const image = item.type === 'space' ? item.profile_url : item.type === 'user' ? item.profile_pic_url : item.logo_url;
          return at ? [{ key: `${item.type}-${item.entity_id}`, kind: item.type, image: image || undefined, at }] : [];
        });

  // The sheet dropping back down reveals the map again: refresh what's plotted (throttled in the store).
  const onSheetSettle = useCallback((expanded: boolean) => {
    if (!expanded) refreshDiscovery();
  }, []);

  const onAllowLocation = async () => {
    const { status } = await requestForegroundPermissionsAsync();
    if (status === 'granted') refreshDiscovery({ force: true });
    else Alert.alert('Location is off', 'Turn on location for Amigrid in your phone settings to see what is nearby.');
  };

  const onOpenTrending = (item: TrendingSpace) => openGridProfile(router, item.id);
  const onOpenSpace = (item: SpaceItem) => openGridProfile(router, item.entity_id);
  const onJoinSpace = (item: SpaceItem) =>
    joinDiscoveredSpace(item).catch((e) => {
      const msg = actionError(e);
      // Private grids want a code from an admin, which is entered on the grid's own page.
      if (/security code/i.test(msg)) {
        Alert.alert('This grid needs a code', 'Ask a grid admin for the join code, then enter it on the grid page.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open grid', onPress: () => openGridProfile(router, item.entity_id) },
        ]);
      } else Alert.alert('Could not join', msg);
    });
  const onSendRequest = (item: UserItem) => requestAmigo(item).catch((e) => Alert.alert('Could not send request', actionError(e)));
  const onOpenStore = (item: StoreItem) => item.entity_id && router.push({ pathname: '/store', params: { id: item.entity_id } });

  const renderItem = ({ item }: { item: DiscoveryItem }) => {
    if (item.type === 'space') return <SpaceCard item={item} onJoin={onJoinSpace} onPress={onOpenSpace} />;
    if (item.type === 'user') return <UserCard item={item} onSendRequest={onSendRequest} />;
    return <StoreCard item={item} onPress={onOpenStore} />;
  };

  return (
    <View style={styles.root}>
      {/* Mapbox draws the discovered items. Where the native module is missing (Expo Go) the static
          placeholder below is shown instead. */}
      <MapCanvas
        center={discovery.fix}
        pins={pins}
        bottomInset={COLLAPSED_HEIGHT}
        fallback={
          <View style={[StyleSheet.absoluteFill, styles.mapPlaceholder]}>
            <View style={styles.pinA}>
              <LivePin variant="live" />
            </View>
            <View style={styles.pinB}>
              <LivePin variant="activity" count={12} />
            </View>
          </View>
        }
      />

      <DiscoverySheet
        collapsedHeight={COLLAPSED_HEIGHT}
        expandedHeight={expandedHeight}
        onSettle={onSheetSettle}
        header={
          <View>
            <SegmentedToggle<Section>
              segments={[
                { key: 'trending', label: 'Trending' },
                { key: 'nearby', label: 'Discovery nearby' },
              ]}
              value={section}
              onChange={setSection}
            />

            {section === 'trending' ? (
              <View style={styles.statsRow}>
                <DiscoveryStatCard
                  icon="radio"
                  label="WATCH LIVE"
                  value={discovery.counters?.live_grid_count ?? 0}
                  caption="Grid on Live"
                  live
                  onPress={() => router.push('/live')}
                />
                <DiscoveryStatCard
                  icon="calendar"
                  label="EVENTS"
                  value={discovery.counters?.active_events_count ?? 0}
                  caption="Live & upcoming"
                  onPress={() => router.push('/events')}
                />
              </View>
            ) : (
              <View>
                <View style={[styles.headerRow, styles.nearbyHeader]}>
                  <Text style={[typography.title, styles.headerTitle]}>Discovery nearby</Text>
                  <Text style={styles.viewAll} onPress={() => refreshDiscovery({ force: true })}>
                    Refresh
                  </Text>
                </View>
                <View style={styles.toggleWrap}>
                  <SegmentedToggle<Tab>
                    segments={[
                      { key: 'space', label: 'Grid' },
                      { key: 'user', label: 'People' },
                      { key: 'store', label: 'Stores' },
                    ]}
                    value={tab}
                    onChange={setTab}
                  />
                </View>
              </View>
            )}
          </View>
        }
      >
        {section === 'trending' ? (
          <FlatList
            data={discovery.trending.items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TrendingSpaceCard item={item} onPress={onOpenTrending} />}
            ItemSeparatorComponent={Separator}
            contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xl }}
            showsVerticalScrollIndicator={false}
            onRefresh={() => refreshTrending()}
            refreshing={false}
            ListEmptyComponent={
              !discovery.trending.loaded ? (
                <ActivityIndicator style={styles.loader} color={colors.ink} />
              ) : discovery.trending.error ? (
                <Notice title="Couldn’t load trending" body={discovery.trending.error} action={{ label: 'Try again', onPress: () => refreshTrending() }} />
              ) : (
                <Notice title="Nothing trending yet" body="Grids will show up here as people post and join." />
              )
            }
          />
        ) : (
          <FlatList
            data={list.items}
            keyExtractor={(item, i) => `${item.type}-${item.entity_id ?? i}`}
            renderItem={renderItem}
            ItemSeparatorComponent={Separator}
            contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xl }}
            showsVerticalScrollIndicator={false}
            refreshing={discovery.refreshing}
            onRefresh={() => refreshDiscovery({ force: true })}
            ListEmptyComponent={
              discovery.phase === 'loading' || discovery.phase === 'idle' ? (
                <ActivityIndicator style={styles.loader} color={colors.ink} />
              ) : discovery.phase === 'no-location' ? (
                <Notice
                  title="Turn on location"
                  body="Amigrid needs your location to show the grids, people and stores around you."
                  action={{ label: 'Allow location', onPress: onAllowLocation }}
                />
              ) : list.error ? (
                <Notice title="Couldn’t load this list" body={list.error} action={{ label: 'Try again', onPress: () => refreshDiscovery({ force: true }) }} />
              ) : (
                <Notice title="Nothing nearby yet" body="No one has anything within 1.5 km of you right now. Pull down to refresh." />
              )
            }
          />
        )}
      </DiscoverySheet>

      {/* Profile (top-left, with notification + settings count) and messages (top-right, with unread count). */}
      <View style={[styles.corners, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <HeaderProfileButton />
        <HeaderMessagesButton />
      </View>

      <NavTabBar active="map" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  corners: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapPlaceholder: { backgroundColor: '#E8ECF2' },
  pinA: { position: 'absolute', top: '22%', left: '45%' },
  pinB: { position: 'absolute', top: '28%', left: '60%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: colors.textPrimary, ...typography.screenTitle },
  viewAll: { ...typography.cardBody, color: colors.ink, fontFamily: fonts.semibold },
  nearbyHeader: { marginTop: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  toggleWrap: { marginTop: spacing.lg },
  loader: { marginTop: spacing.xl },
  notice: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
  noticeTitle: { color: colors.textPrimary, ...typography.rowTitle },
  noticeBody: { color: colors.textMuted, textAlign: 'center' },
  noticeBtn: { marginTop: spacing.sm, minWidth: 140 },
});
