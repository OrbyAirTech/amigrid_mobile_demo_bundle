import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';

import { FlatGlassProvider } from '@/components/GlassSurface';
import { GlassSheet } from '@/components/GlassSheet';
import { HeaderMenuButton } from '@/components/HeaderMenuButton';
import { HeaderMessagesButton } from '@/components/HeaderMessagesButton';
import { HeaderProfileButton } from '@/components/HeaderProfileButton';
import { NavTabBar } from '@/components/NavTabBar';
import { NotificationRow } from '@/components/NotificationRow';
import { ScreenBackground } from '@/components/ScreenBackground';
import { GlassButton } from '@/components/GlassButton';
import { loadNotifications, markAllRead, markRead, useNotifications } from '@/data/notificationStore';
import { colors, navOccupied, spacing, typography } from '@/theme';
import type { AppNotification } from '@/types/notification';
import { openGridProfile } from '@/utils/gridNav';
import { groupNotifications } from '@/utils/notificationGroups';

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, loading, loaded, error, done } = useNotifications();
  const [pulling, setPulling] = useState(false);
  const unread = items.filter((n) => !n.isRead).length;
  const sections = useMemo(() => groupNotifications(items), [items]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    loadNotifications(true);
  }, []);

  const onRefresh = async () => {
    setPulling(true);
    await loadNotifications(true);
    setPulling(false);
  };

  // The server sends only a reference (what it points at + its id), so the row takes you to that thing.
  const open = (n: AppNotification) => {
    markRead(n.id);
    const { ref_table, ref_id } = n.ref;
    if (ref_table === 'post' && ref_id !== '0') router.push({ pathname: '/replies', params: { postId: ref_id } });
    else if (ref_table === 'spaces' && ref_id !== '0') openGridProfile(router, ref_id);
    else if (ref_table === 'users' && /request|accepted/i.test(n.message)) router.push('/amigos');
    // "Someone peaked your profile": the ref is that person, so open their profile.
    else if (ref_table === 'users' && ref_id !== '0') router.push({ pathname: '/user', params: { id: ref_id } });
  };

  return (
    <View style={styles.root}>
      <ScreenBackground />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <HeaderProfileButton />
        <Text style={[typography.title, styles.title]}>Activity</Text>
        <View style={{ flex: 1 }} />
        <HeaderMessagesButton />
        <HeaderMenuButton onPress={() => setMenuOpen(true)} label="Activity menu" />
      </View>

      <FlatGlassProvider value>
        <SectionList
          sections={sections}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NotificationRow item={item} onOpen={open} />}
          renderSectionHeader={({ section }) => (
            <Text style={[typography.cardTitle, styles.sectionTitle]}>{section.title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={Separator}
          refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={colors.ink} />}
          onEndReached={() => loaded && !done && loadNotifications(false)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !loaded || (loading && items.length === 0) ? (
              <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xxl }} />
            ) : error ? (
              <View style={styles.caughtUp}>
                <Text style={[typography.body, styles.caughtText]}>{error}</Text>
                <GlassButton label="Try again" size="sm" variant="primary" onPress={() => loadNotifications(true)} style={{ minWidth: 140, marginTop: spacing.md }} />
              </View>
            ) : null
          }
          ListFooterComponent={
            loaded && !error ? (
              <View style={styles.caughtUp}>
                <View style={styles.check}>
                  <Feather name="check" size={20} color={colors.textMuted} />
                </View>
                <Text style={[typography.cardTitle, styles.caughtTitle]}>{items.length === 0 ? 'Nothing here yet' : 'You’re all caught up!'}</Text>
                <Text style={[typography.caption, styles.caughtText]}>
                  {items.length === 0 ? 'Updates from your grids and amigos will show up here.' : 'Notifications are kept for 30 days.'}
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{
            paddingTop: spacing.sm,
            paddingHorizontal: spacing.lg,
            paddingBottom: navOccupied(insets.bottom) + spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        />
      </FlatGlassProvider>

      <GlassSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="Activity">
        <Pressable
          disabled={unread === 0}
          onPress={() => {
            markAllRead();
            setMenuOpen(false);
          }}
          accessibilityRole="button"
          accessibilityLabel="Mark all as read"
          style={({ pressed }) => [styles.menuRow, { opacity: unread === 0 ? 0.45 : pressed ? 0.7 : 1 }]}
        >
          <Feather name="check-circle" size={20} color={colors.ink} />
          <Text style={[typography.cardTitle, styles.menuText]}>Mark all as read</Text>
        </Pressable>
      </GlassSheet>

      <NavTabBar active="activity" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  title: { color: colors.textPrimary, marginLeft: spacing.xs, ...typography.screenTitle },
  sectionTitle: { color: colors.textPrimary, paddingTop: spacing.md, paddingBottom: spacing.sm, paddingHorizontal: spacing.xs },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  menuText: { color: colors.textPrimary },
  caughtUp: { alignItems: 'center', gap: 4, paddingVertical: spacing.xl },
  check: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.iconTile,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  caughtTitle: { color: colors.textPrimary },
  caughtText: { color: colors.textMuted, textAlign: 'center' },
});
