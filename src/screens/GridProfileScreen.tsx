import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { GlassButton } from '@/components/GlassButton';
import { GlassIconButton } from '@/components/GlassIconButton';
import { GlassSheet } from '@/components/GlassSheet';
import { CreateEventSheet } from '@/components/CreateEventSheet';
import { GridEventsSection } from '@/components/GridEventsSection';
import { ReportSheet } from '@/components/ReportSheet';
import { FlatGlassProvider, GlassSurface } from '@/components/GlassSurface';
import { NavTabBar } from '@/components/NavTabBar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { SegmentedToggle } from '@/components/SegmentedToggle';
import { SheetAction } from '@/components/SheetAction';
import { GlassInput } from '@/components/GlassInput';
import { ApiError } from '@/data/api/client';
import { useSessionUser } from '@/data/currentUserStore';
import { fetchGridEventCount } from '@/data/exploreApi';
import { fetchAdmins, fetchGrid, joinSpace, leaveGrid } from '@/data/gridsApi';
import { forgetGrid, refreshMyGrids, useMyGrids } from '@/data/myGridsStore';
import type { SpaceData } from '@/types/grid';
import { colors, fonts, navOccupied, radius, spacing, typography } from '@/theme';
import { formatMonthYear } from '@/utils/dateFormat';
import { openGridFeed, openGridMembers } from '@/utils/gridNav';
import { formatCount } from '@/utils/time';

const BANNER_H = 186;
type Tab = 'overview' | 'feed' | 'members';
type IconName = ComponentProps<typeof Feather>['name'];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function BannerPill({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.bannerPill}>
      <Feather name={icon} size={11} color={colors.white} />
      <Text style={styles.bannerPillText}>{label}</Text>
    </View>
  );
}

function StatTile({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.stat} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${label}, ${value}`}>
      <GlassSurface tone="light" radius={radius.lg} contentStyle={styles.statBody}>
        <View style={styles.statLabel}>
          <Feather name={icon} size={13} color={colors.ink} />
          <Text style={[typography.caption, styles.statLabelText]}>{label}</Text>
        </View>
        <Text style={styles.statValue}>{value}</Text>
      </GlassSurface>
    </Pressable>
  );
}

/** Grid profile (Visily p.7). Opened from an event, and from the grid feed's header. */
export default function GridProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const me = useSessionUser()?.id;
  const { items: myGrids } = useMyGrids();
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventsKey, setEventsKey] = useState(0);
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const member = !!id && myGrids.some((g) => g.id === id);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setSpace(await fetchGrid(id));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'This grid is unavailable.');
    } finally {
      setLoading(false);
    }
    fetchGridEventCount(id)
      .then(setEventCount)
      .catch(() => {});
    fetchAdmins(id)
      .then((a) => setIsAdmin(!!me && a.some((x) => x.user_id === me)))
      .catch(() => setIsAdmin(false));
  }, [id, me]);

  useEffect(() => {
    load();
    refreshMyGrids();
  }, [load]);

  if (!space) {
    return (
      <View style={styles.root}>
        <ScreenBackground />
        <View style={[styles.floatBar, { top: insets.top + spacing.sm }]}>
          <GlassIconButton icon="arrow-left" label="Back" tone="floating" size={40} onPress={() => (router.canGoBack() ? router.back() : router.replace('/map'))} />
        </View>
        <View style={[styles.state, { marginTop: insets.top + 120 }]}>
          {loading ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <>
              <Text style={[typography.body, styles.error]}>{error ?? 'This grid is unavailable.'}</Text>
              <GlassButton label="Try again" size="sm" variant="primary" onPress={() => { setLoading(true); load(); }} style={{ minWidth: 140 }} />
            </>
          )}
        </View>
      </View>
    );
  }

  const join = async (security?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await joinSpace(space.id, security);
      setCodeOpen(false);
      setCode('');
      await Promise.all([refreshMyGrids(), load()]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Something went wrong. Try again.';
      // Private grids want a code from an admin.
      if (!security && /security code/i.test(msg)) setCodeOpen(true);
      else Alert.alert('Could not join', msg);
    } finally {
      setBusy(false);
    }
  };

  const confirmLeave = () => {
    setMenuOpen(false);
    Alert.alert(`Leave ${space.name}?`, 'You can join again later if the grid allows it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveGrid(space.id);
            forgetGrid(space.id);
            setIsAdmin(false);
            load();
          } catch (e) {
            Alert.alert('Could not leave', e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
          }
        },
      },
    ]);
  };

  const share = async () => {
    try {
      await Share.share({ message: `${space.name} is on Amigrid. ${Linking.createURL(`grid/${space.id}`)}` });
    } catch {
      // dismissed
    }
  };

  const onTab = (t: Tab) => {
    if (t === 'feed') openGridFeed(router, space.id);
    else if (t === 'members') openGridMembers(router, space.id);
  };

  const place = space.radius_meters ? `Within ${formatCount(space.radius_meters)} m` : space.location ? 'Location pinned' : null;

  return (
    <View style={styles.root}>
      <ScreenBackground />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: navOccupied(insets.bottom) + spacing.lg }}>
        {/* Banner with the grid's identity over a dark fade. */}
        <View style={{ height: BANNER_H + insets.top }}>
          <Image source={{ uri: space.profile_banner_url || space.profile_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['rgba(36,22,35,0.35)', 'rgba(36,22,35,0)', 'rgba(36,22,35,0.78)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.bannerInfo}>
            {/* The profile picture is the grid's identity; the banner behind it is the cover. */}
            <Avatar uri={space.profile_url} name={space.name} size={60} ring />
            <View style={styles.bannerText}>
              <View style={styles.pills}>
                <BannerPill icon="tag" label={cap(space.type)} />
                <BannerPill icon={space.visibility === 'public' ? 'globe' : 'eye-off'} label={cap(space.visibility)} />
                <BannerPill icon={space.access_mode === 'open' ? 'unlock' : 'lock'} label={cap(space.access_mode)} />
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {space.name}
              </Text>
              {place ? (
                <View style={styles.place}>
                  <Feather name="map-pin" size={12} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.placeText}>{place}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Sheet overlapping the banner. */}
        <View style={styles.sheetWrap}>
          <GlassSurface tone="light" radius={radius.xl} raised contentStyle={styles.sheet}>
            <FlatGlassProvider value>
              <SegmentedToggle<Tab>
                tone="light"
                segments={[
                  { key: 'overview', label: 'Overview', icon: 'info' },
                  { key: 'feed', label: 'Feed', icon: 'rss' },
                  { key: 'members', label: 'Members', icon: 'users' },
                ]}
                value="overview"
                onChange={onTab}
              />

              <View style={styles.statsRow}>
                <StatTile icon="users" label="MEMBERS" value={formatCount(space.space_participant_count)} onPress={() => openGridMembers(router, space.id)} />
                {eventCount != null ? <StatTile icon="calendar" label="EVENTS" value={eventCount === 1 ? '1 Event' : `${eventCount} Events`} /> : null}
              </View>

              <GlassButton
                label={member ? 'Joined' : 'Join Grid'}
                size="sm"
                variant={member ? 'secondary' : 'primary'}
                selected={member}
                leading={<Feather name={member ? 'check' : 'plus'} size={15} color={colors.ink} />}
                disabled={busy || member}
                onPress={() => join()}
              />

              <View style={styles.block}>
                <Text style={[typography.cardTitle, styles.heading]}>About this Grid</Text>
                <Text style={[typography.cardBody, styles.about]}>{space.description}</Text>
              </View>

              <GridEventsSection spaceId={space.id} canManage={isAdmin} onCreate={() => setEventOpen(true)} reloadKey={eventsKey} />

              <View style={styles.creator}>
                <Avatar uri={space.creator_info.profile_pic_url} name={space.creator_info.username} size={32} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.caption, styles.creatorName]} numberOfLines={1}>
                    Created by @{space.creator_info.username}
                  </Text>
                  <Text style={[typography.caption, styles.creatorBio]} numberOfLines={1}>
                    {space.creator_info.bio}
                  </Text>
                </View>
                <Text style={[typography.caption, styles.creatorBio]}>{formatMonthYear(space.created_at)}</Text>
              </View>

              {isAdmin ? (
                <GlassSurface tone="light" radius={radius.lg} contentStyle={styles.admin}>
                  <View style={styles.adminIcon}>
                    <Feather name="shield" size={16} color={colors.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.cardTitle, styles.adminTitle]}>Admin Dashboard</Text>
                    <Text style={[typography.caption, styles.creatorBio]} numberOfLines={1}>
                      Manage grid settings & roles
                    </Text>
                  </View>
                  <GlassButton label="Manage" size="sm" variant="secondary" onPress={() => openGridMembers(router, space.id)} />
                </GlassSurface>
              ) : null}
            </FlatGlassProvider>
          </GlassSurface>
        </View>
      </ScrollView>

      {/* Floating glass controls over the banner. */}
      <View style={[styles.floatBar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <GlassIconButton icon="arrow-left" label="Back" tone="floating" size={40} onPress={() => (router.canGoBack() ? router.back() : router.replace('/map'))} />
        <View style={{ flex: 1 }} />
        <GlassIconButton icon="share-2" label="Share grid" tone="floating" size={40} onPress={share} />
        <GlassIconButton icon="more-vertical" label="Grid menu" tone="floating" size={40} onPress={() => setMenuOpen(true)} />
      </View>

      <GlassSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={space.name}>
        <SheetAction icon="share-2" label="Share grid" divider={false} onPress={() => { setMenuOpen(false); share(); }} />
        <SheetAction icon="flag" label="Report grid" onPress={() => { setMenuOpen(false); setReportOpen(true); }} />
        <SheetAction icon="log-out" label="Leave grid" danger disabled={!member} onPress={confirmLeave} />
      </GlassSheet>
      <CreateEventSheet visible={eventOpen} onClose={() => setEventOpen(false)} spaceId={space.id} gridName={space.name} onCreated={() => setEventsKey((k) => k + 1)} />
      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} kind="grid" targetId={space.id} targetName={space.name} />

      <GlassSheet visible={codeOpen} onClose={() => setCodeOpen(false)} title="Enter join code">
        <View style={styles.codeBody}>
          <Text style={[typography.caption, styles.creatorBio]}>This grid is private. Ask an admin for its code.</Text>
          <GlassInput label="Join code" icon="key" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} />
          <GlassButton label={busy ? 'Joining…' : 'Join Grid'} variant="dark" size="md" disabled={busy || !code.trim()} onPress={() => join(code.trim())} />
        </View>
      </GlassSheet>

      <NavTabBar active="grid-profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  error: { color: colors.textMuted, textAlign: 'center' },
  state: { alignItems: 'center', gap: spacing.md },
  codeBody: { gap: spacing.sm + 2, paddingBottom: spacing.sm },
  floatBar: { position: 'absolute', left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bannerInfo: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: 34, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm + 2 },
  bannerText: { flex: 1, gap: 4 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  bannerPillText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
  title: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 27, letterSpacing: -0.3 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  placeText: { color: 'rgba(255,255,255,0.9)', ...typography.rowMeta },
  sheetWrap: { marginTop: -22, paddingHorizontal: spacing.md },
  sheet: { padding: spacing.md, gap: spacing.sm + 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1 },
  statBody: { paddingHorizontal: 12, paddingVertical: 9, gap: 2 },
  statLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabelText: { color: colors.ink, fontSize: 11, lineHeight: 14, letterSpacing: 0.5, fontFamily: fonts.semibold },
  statValue: { color: colors.textPrimary, fontFamily: fonts.extrabold, fontSize: 19, lineHeight: 24 },
  block: { gap: 3, marginTop: 2 },
  heading: { color: colors.textPrimary, ...typography.rowTitle },
  about: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  creator: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm + 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(36, 22, 35, 0.1)' },
  creatorName: { color: colors.ink, ...typography.rowMeta, fontFamily: fonts.semibold },
  creatorBio: { color: colors.textMuted, ...typography.rowMeta },
  admin: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, padding: spacing.sm + 2 },
  adminIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.iconTile, alignItems: 'center', justifyContent: 'center' },
  adminTitle: { color: colors.textPrimary, fontSize: 14, lineHeight: 19 },
});
