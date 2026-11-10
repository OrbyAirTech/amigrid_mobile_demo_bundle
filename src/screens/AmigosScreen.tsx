import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmigoRow } from '@/components/AmigoRow';
import { BackHeader } from '@/components/BackHeader';
import { FilterChips } from '@/components/FilterChips';
import { GlassButton } from '@/components/GlassButton';
import { FlatGlassProvider } from '@/components/GlassSurface';
import { NavTabBar } from '@/components/NavTabBar';
import { TalkButton } from '@/components/TalkButton';
import { meId } from '@/data/chatStore';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ApiError } from '@/data/api/client';
import { acceptRequest, declineRequest, fetchAmigoRequests, fetchAmigos, unfriend, type AmigoRequest } from '@/data/amigosApi';
import { refreshMyProfile, useMyProfile } from '@/data/currentUserStore';
import { colors, navOccupied, spacing, typography } from '@/theme';
import type { AmigoUser } from '@/types/grid';
import { usePagedList } from '@/utils/usePagedList';

type Tab = 'amigos' | 'requests';

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const failed = (title: string, e: unknown) => Alert.alert(title, e instanceof ApiError ? e.message : 'Something went wrong. Try again.');

/** Profile -> Amigos counter: your amigos (with remove) and the requests waiting for you (accept / decline). */
export default function AmigosScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useMyProfile();
  const [tab, setTab] = useState<Tab>('amigos');
  const [busy, setBusy] = useState<string | null>(null);

  const { userId, name } = useLocalSearchParams<{ userId?: string; name?: string }>();
  const theirs = !!userId && userId !== meId(); // someone else's amigos: no requests, no removing, just talk
  const amigos = usePagedList<AmigoUser>(useCallback((offset: number) => fetchAmigos(offset, theirs ? userId : undefined), [theirs, userId]), userId ?? '');
  const requests = usePagedList<AmigoRequest>(fetchAmigoRequests);
  const list = tab === 'amigos' || theirs ? amigos : requests;

  const confirmRemove = (u: AmigoUser) =>
    Alert.alert(`Remove @${u.username}?`, 'You’ll no longer be amigos. You can send a new request later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await unfriend(u.user_id);
            amigos.setItems((cur) => cur.filter((x) => x.user_id !== u.user_id));
            refreshMyProfile();
          } catch (e) {
            failed('Couldn’t remove amigo', e);
          }
        },
      },
    ]);

  const respond = async (r: AmigoRequest, accept: boolean) => {
    if (busy) return;
    setBusy(r.request_id);
    try {
      await (accept ? acceptRequest(r.request_id) : declineRequest(r.request_id));
      requests.setItems((cur) => cur.filter((x) => x.request_id !== r.request_id));
      if (accept) {
        amigos.reload();
        refreshMyProfile();
      }
    } catch (e) {
      failed(accept ? 'Couldn’t accept' : 'Couldn’t decline', e);
    } finally {
      setBusy(null);
    }
  };

  const total = theirs ? amigos.items.length : (profile?.amigos_count ?? amigos.items.length);

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader title={theirs ? (name ? `${name}’s amigos` : 'Amigos') : 'Amigos'} caption={`${total} ${total === 1 ? 'amigo' : 'amigos'}`} fallback="/profile" />

      {theirs ? null : <View style={styles.filters}>
        <FilterChips<Tab>
          options={[
            { key: 'amigos', label: 'Amigos' },
            { key: 'requests', label: 'Requests', count: requests.items.length || undefined },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>}

      <FlatGlassProvider value>
        <FlatList<AmigoUser | AmigoRequest>
          data={list.items}
          keyExtractor={(u) => ('request_id' in u ? u.request_id : u.user_id)}
          renderItem={({ item }) =>
            'request_id' in item ? (
              <AmigoRow
                user={item}
                right={
                  <View style={styles.reqActions}>
                    <GlassButton label="Accept" size="sm" variant="primary" disabled={busy === item.request_id} onPress={() => respond(item, true)} style={styles.btn} />
                    <Pressable
                      onPress={() => respond(item, false)}
                      disabled={busy === item.request_id}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Decline ${item.username}`}
                      style={styles.iconBtn}
                    >
                      <Feather name="x" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                }
              />
            ) : (
              <AmigoRow
                user={item}
                onPress={theirs ? (u) => router.push({ pathname: '/user', params: { id: u.user_id } }) : undefined}
                right={
                  <View style={styles.reqActions}>
                    <TalkButton userId={item.user_id} />
                    {theirs ? null : (
                      <Pressable onPress={() => confirmRemove(item)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Options for ${item.username}`} style={styles.iconBtn}>
                        <Feather name="more-vertical" size={18} color={colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                }
              />
            )
          }
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
                <GlassButton label="Try again" size="sm" variant="primary" onPress={list.reload} style={styles.retry} />
              </View>
            ) : (
              <Text style={[typography.body, styles.emptyText, styles.empty]}>{tab === 'amigos' ? 'No amigos yet.' : 'No pending requests.'}</Text>
            )
          }
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.ink} style={{ marginVertical: spacing.md }} /> : null}
          contentContainerStyle={{ paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: navOccupied(insets.bottom) + spacing.lg }}
          showsVerticalScrollIndicator={false}
        />
      </FlatGlassProvider>

      <NavTabBar active="amigos" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  filters: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  empty: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  retry: { minWidth: 140 },
  btn: { minWidth: 74 },
  reqActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
});
