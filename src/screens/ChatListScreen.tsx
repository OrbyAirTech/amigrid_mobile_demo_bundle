import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { ChatRow } from '@/components/ChatRow';
import { CountBadge } from '@/components/CountBadge';
import { GlassIconButton } from '@/components/GlassIconButton';
import { GlassSheet } from '@/components/GlassSheet';
import { FlatGlassProvider } from '@/components/GlassSurface';
import { ScreenBackground } from '@/components/ScreenBackground';
import { SheetAction } from '@/components/SheetAction';
import { SearchField } from '@/components/SearchField';
import { deleteChat, isIncomingRequest, otherOf, pinChat, refreshChat, unpinChat, useChat, userOf } from '@/data/chatStore';
import { NewChatSheet } from '@/components/NewChatSheet';
import { colors, fonts, spacing, typography } from '@/theme';
import type { ChatSession } from '@/types/chat';

type Filter = 'all' | 'pinned' | 'unpinned';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All chats' },
  { key: 'pinned', label: 'Pinned' },
  { key: 'unpinned', label: 'Not pinned' },
];
import { parseTime } from '@/utils/dateFormat';

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

/** Messages: active conversations (pinned first), with shortcuts to new chat, requests and settings. */
export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sessions, error, loaded } = useChat();
  const [refreshing, setRefreshing] = useState(false);
  const [menuFor, setMenuFor] = useState<ChatSession | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const requestCount = sessions.filter(isIncomingRequest).length;

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (s: ChatSession) => {
      if (!q) return true;
      const u = userOf(otherOf(s));
      return [u.display_name, u.username, s.last_message?.message ?? ''].some((t) => t.toLowerCase().includes(q));
    };
    const active = sessions
      .filter((s) => s.status === 'active' && matches(s))
      .sort((a, b) => parseTime(b.last_activity) - parseTime(a.last_activity));
    const pinned = filter === 'unpinned' ? [] : active.filter((s) => s.pinned);
    const rest = filter === 'pinned' ? [] : active.filter((s) => !s.pinned);
    return [
      ...(pinned.length ? [{ title: 'Pinned', data: pinned }] : []),
      { title: pinned.length ? 'Recent' : '', data: rest },
    ].filter((s) => s.data.length > 0);
  }, [sessions, query, filter]);

  const open = (s: ChatSession) => router.push({ pathname: '/chat', params: { chatId: s.chat_id } });
  const refresh = () => {
    setRefreshing(true);
    void refreshChat().finally(() => setRefreshing(false));
  };
  const confirmDelete = (s: ChatSession) =>
    Alert.alert('Delete chat?', `This deletes the conversation with ${userOf(otherOf(s)).display_name} and all its messages.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteChat(s.chat_id) },
    ]);

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader
        title="Messages"
        caption={`${sections.reduce((n, s) => n + s.data.length, 0)} chats`}
        right={
          <View style={styles.actions}>
            <GlassIconButton icon="edit" label="New chat" size={40} onPress={() => setNewOpen(true)} />
            <View>
              <GlassIconButton icon="user-plus" label="Chat requests" size={40} onPress={() => router.push('/chat-requests')} />
              <CountBadge count={requestCount} />
            </View>
            <GlassIconButton icon="settings" label="Chat settings" size={40} onPress={() => router.push('/chat-settings')} />
          </View>
        }
      />

      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search chats…" />
        </View>
        <View>
          <GlassIconButton icon="filter" label="Filter chats" size={44} onPress={() => setFilterOpen(true)} />
          {filter !== 'all' ? <View style={styles.filterDot} /> : null}
        </View>
      </View>

      <FlatGlassProvider value>
        <SectionList
          sections={sections}
          keyExtractor={(s) => s.chat_id}
          renderItem={({ item }) => <ChatRow session={item} onPress={open} onLongPress={setMenuFor} />}
          renderSectionHeader={({ section }) =>
            section.title ? <Text style={[typography.caption, styles.section]}>{section.title.toUpperCase()}</Text> : null
          }
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            !loaded ? (
              <View style={styles.empty}>
                <Text style={[typography.caption, styles.emptyText]}>Loading your chats…</Text>
              </View>
            ) : error && sessions.length === 0 ? (
              <View style={styles.empty}>
                <Text style={[typography.cardTitle, styles.emptyTitle]}>Couldn’t load chats</Text>
                <Text style={[typography.caption, styles.emptyText]}>{error} Pull down to try again.</Text>
              </View>
            ) : query.trim() || filter !== 'all' ? (
              <View style={styles.empty}>
                <Text style={[typography.cardTitle, styles.emptyTitle]}>No chats found</Text>
                <Text style={[typography.caption, styles.emptyText]}>Try a different name, or change the filter.</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={[typography.cardTitle, styles.emptyTitle]}>No conversations yet</Text>
                <Text style={[typography.caption, styles.emptyText]}>Start one with the pencil above. Chats disappear after 24 hours.</Text>
              </View>
            )
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />}
          contentContainerStyle={{ paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          showsVerticalScrollIndicator={false}
        />
      </FlatGlassProvider>

      <GlassSheet visible={filterOpen} onClose={() => setFilterOpen(false)} title="Show">
        {FILTERS.map((f, i) => (
          <SheetAction
            key={f.key}
            icon={filter === f.key ? 'check-circle' : 'circle'}
            label={f.label}
            divider={i > 0}
            onPress={() => {
              setFilter(f.key);
              setFilterOpen(false);
            }}
          />
        ))}
      </GlassSheet>

      <GlassSheet visible={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor ? userOf(otherOf(menuFor)).display_name : undefined}>
        {menuFor ? (
          <>
            <SheetAction
              icon="bookmark"
              label={menuFor.pinned ? 'Unpin chat' : 'Pin chat'}
              divider={false}
              onPress={() => {
                (menuFor.pinned ? unpinChat : pinChat)(menuFor.chat_id);
                setMenuFor(null);
              }}
            />
            <SheetAction icon="trash-2" label="Delete chat" danger onPress={() => { const s = menuFor; setMenuFor(null); confirmDelete(s); }} />
          </>
        ) : null}
      </GlassSheet>

      <NewChatSheet visible={newOpen} onClose={() => setNewOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  filterDot: { position: 'absolute', top: 2, right: 2, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.ink, borderWidth: 1.5, borderColor: colors.background },
  section: { color: colors.textMuted, letterSpacing: 0.6, fontFamily: fonts.semibold, paddingBottom: spacing.xs, paddingTop: spacing.xs, paddingHorizontal: spacing.xs },
  empty: { alignItems: 'center', gap: 4, marginTop: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyTitle: { color: colors.textPrimary },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
});
