import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmigoRow } from '@/components/AmigoRow';
import { BackHeader } from '@/components/BackHeader';
import { FilterChips } from '@/components/FilterChips';
import { GlassButton } from '@/components/GlassButton';
import { GlassIconButton } from '@/components/GlassIconButton';
import { GlassSheet } from '@/components/GlassSheet';
import { FlatGlassProvider } from '@/components/GlassSurface';
import { NavTabBar } from '@/components/NavTabBar';
import { Pill } from '@/components/Pill';
import { ScreenBackground } from '@/components/ScreenBackground';
import { SheetAction } from '@/components/SheetAction';
import { TalkButton } from '@/components/TalkButton';
import { ApiError } from '@/data/api/client';
import { fetchAmigos, readAll } from '@/data/amigosApi';
import { useSessionUser } from '@/data/currentUserStore';
import { addParticipant, fetchAdmins, fetchGrid, fetchParticipants, makeAdmin, removeAdmin, removeParticipant } from '@/data/gridsApi';
import { colors, navOccupied, spacing, typography } from '@/theme';
import type { AmigoUser, GridMember, SpaceData } from '@/types/grid';
import { usePagedList } from '@/utils/usePagedList';

type Filter = 'all' | 'admins';

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const failed = (title: string, e: unknown) => Alert.alert(title, e instanceof ApiError ? e.message : 'Something went wrong. Try again.');

/** Grid participants: filter by admins; admins get a per-person menu (make admin / remove) and "+" to add an amigo. */
export default function GridMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const me = useSessionUser()?.id;

  const [grid, setGrid] = useState<SpaceData | null>(null);
  const [admins, setAdmins] = useState<AmigoUser[]>([]);
  const people = usePagedList<AmigoUser>(useCallback((offset: number) => fetchParticipants(id ?? '', offset), [id]), id ?? '');
  const [addable, setAddable] = useState<AmigoUser[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [menuFor, setMenuFor] = useState<GridMember | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadHeader = useCallback(async () => {
    if (!id) return;
    const [g, a] = await Promise.allSettled([fetchGrid(id), fetchAdmins(id)]);
    if (g.status === 'fulfilled') setGrid(g.value);
    if (a.status === 'fulfilled') setAdmins(a.value);
  }, [id]);

  useEffect(() => {
    loadHeader();
  }, [loadHeader]);

  const adminIds = useMemo(() => new Set(admins.map((a) => a.user_id)), [admins]);
  const iAmAdmin = !!me && adminIds.has(me);
  const members: GridMember[] = useMemo(() => people.items.map((m) => ({ ...m, is_admin: adminIds.has(m.user_id) })), [people.items, adminIds]);
  const shown: GridMember[] = filter === 'admins' ? admins.map((a) => ({ ...a, is_admin: true })) : members;
  const total = grid?.space_participant_count ?? members.length;

  const openAdd = async () => {
    setAddOpen(true);
    if (addable) return;
    try {
      setAddable(await readAll(fetchAmigos));
    } catch (e) {
      setAddOpen(false);
      failed('Couldn’t load your amigos', e);
    }
  };

  const toggleAdmin = async (m: GridMember) => {
    try {
      if (m.is_admin) {
        await removeAdmin(id!, m.user_id);
        setAdmins((cur) => cur.filter((a) => a.user_id !== m.user_id));
      } else {
        await makeAdmin(id!, m.user_id);
        setAdmins((cur) => [...cur, { user_id: m.user_id, username: m.username, profile_pic_url: m.profile_pic_url, bio: m.bio }]);
      }
    } catch (e) {
      failed(m.is_admin ? 'Couldn’t remove admin' : 'Couldn’t make admin', e);
    }
  };

  const confirmRemove = (m: GridMember) =>
    Alert.alert(`Remove @${m.username}?`, 'They’ll be taken out of this grid.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeParticipant(id!, m.user_id);
            people.setItems((cur) => cur.filter((x) => x.user_id !== m.user_id));
            setAdmins((cur) => cur.filter((a) => a.user_id !== m.user_id));
            setAddable((cur) => (cur ? [{ user_id: m.user_id, username: m.username, profile_pic_url: m.profile_pic_url, bio: m.bio }, ...cur] : cur));
            loadHeader();
          } catch (e) {
            failed('Couldn’t remove', e);
          }
        },
      },
    ]);

  const add = async (u: AmigoUser) => {
    try {
      await addParticipant(id!, u.user_id);
      setAddable((cur) => (cur ?? []).filter((x) => x.user_id !== u.user_id));
      people.reload();
      loadHeader();
    } catch (e) {
      failed('Couldn’t add', e);
    }
  };

  const inGrid = useMemo(() => new Set(people.items.map((p) => p.user_id)), [people.items]);
  const addList = (addable ?? []).filter((u) => !inGrid.has(u.user_id));

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader
        title="Members"
        caption={grid ? `${grid.name} · ${total} participants` : `${total} participants`}
        right={iAmAdmin ? <GlassIconButton icon="plus" label="Add to grid" size={40} onPress={openAdd} /> : undefined}
      />

      <View style={styles.filters}>
        <FilterChips<Filter>
          options={[
            { key: 'all', label: 'All', count: total },
            { key: 'admins', label: 'Admins', count: admins.length },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      <FlatGlassProvider value>
        <FlatList
          data={shown}
          keyExtractor={(m) => m.user_id}
          renderItem={({ item }) => (
            <AmigoRow
              user={item}
              badge={item.is_admin ? <Pill icon="shield" label="Admin" /> : null}
              right={
                item.user_id === me ? undefined : (
                <View style={styles.rowRight}>
                <TalkButton userId={item.user_id} />
                {iAmAdmin ? (
                <Pressable
                  onPress={() => setMenuFor(item)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Options for ${item.username}`}
                  style={styles.menuBtn}
                >
                  <Feather name="more-vertical" size={18} color={colors.textMuted} />
                </Pressable>
                ) : null}
                </View>
                )
              }
            />
          )}
          ItemSeparatorComponent={Separator}
          refreshControl={<RefreshControl refreshing={people.refreshing} onRefresh={() => { people.refresh(); loadHeader(); }} tintColor={colors.ink} />}
          onEndReached={filter === 'all' ? people.loadMore : undefined}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            people.loading ? (
              <ActivityIndicator color={colors.ink} style={styles.empty} />
            ) : people.error ? (
              <View style={styles.emptyBox}>
                <Text style={[typography.body, styles.emptyText]}>{people.error}</Text>
                <GlassButton label="Try again" size="sm" variant="primary" onPress={people.reload} style={{ minWidth: 140 }} />
              </View>
            ) : (
              <Text style={[typography.body, styles.emptyText, styles.empty]}>{filter === 'admins' ? 'No admins yet.' : 'No participants yet.'}</Text>
            )
          }
          ListFooterComponent={people.loadingMore ? <ActivityIndicator color={colors.ink} style={{ marginVertical: spacing.md }} /> : null}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: navOccupied(insets.bottom) + spacing.lg }}
          showsVerticalScrollIndicator={false}
        />
      </FlatGlassProvider>

      <GlassSheet visible={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor ? menuFor.username : undefined}>
        {menuFor ? (
          <>
            <SheetAction
              icon="shield"
              label={menuFor.is_admin ? 'Remove as admin' : 'Make admin'}
              divider={false}
              onPress={() => { toggleAdmin(menuFor); setMenuFor(null); }}
            />
            <SheetAction icon="user-minus" label="Remove from grid" danger onPress={() => { const m = menuFor; setMenuFor(null); confirmRemove(m); }} />
          </>
        ) : null}
      </GlassSheet>

      <GlassSheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add to grid">
        <ScrollView style={styles.addList} showsVerticalScrollIndicator={false}>
          {addable === null ? (
            <ActivityIndicator color={colors.ink} style={styles.empty} />
          ) : addList.length === 0 ? (
            <Text style={[typography.cardBody, styles.emptyText, styles.empty]}>All your amigos are already here.</Text>
          ) : (
            addList.map((u) => (
              <View key={u.user_id} style={styles.addRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.cardTitle, styles.addName]} numberOfLines={1}>{u.username}</Text>
                  <Text style={[typography.caption, styles.addBio]} numberOfLines={1}>{u.bio}</Text>
                </View>
                <GlassButton label="Add" size="sm" variant="secondary" onPress={() => add(u)} style={styles.addBtn} />
              </View>
            ))
          )}
        </ScrollView>
      </GlassSheet>

      <NavTabBar active="grid-members" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  filters: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  menuBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  empty: { marginTop: spacing.xl, alignItems: 'center' },
  emptyBox: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  addList: { maxHeight: 320 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 9 },
  addName: { color: colors.textPrimary, ...typography.rowTitle },
  addBio: { color: colors.textMuted, ...typography.rowMeta },
  addBtn: { minWidth: 64 },
});
