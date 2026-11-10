import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { ChatComposer } from '@/components/ChatComposer';
import { GlassButton } from '@/components/GlassButton';
import { GlassIconButton } from '@/components/GlassIconButton';
import { GlassSheet } from '@/components/GlassSheet';
import { MessageBubble, TypingBubble } from '@/components/MessageBubble';
import { ScreenBackground } from '@/components/ScreenBackground';
import { SheetAction } from '@/components/SheetAction';
import {
  acceptRequest,
  blockUser,
  clearTyping,
  declineRequest,
  deleteChat,
  dropExpiredWith,
  isExpired,
  deleteMessage,
  editMessage,
  enterChat,
  ensureUsers,
  leaveChat,
  loadHistory,
  markChatRead,
  meId,
  muteUser,
  notifyTyping,
  otherOf,
  pinChat,
  retryMessage,
  sendAttachment,
  sendMessage,
  startChatWith,
  unblockUser,
  unmuteUser,
  unpinChat,
  useChat,
  userOf,
} from '@/data/chatStore';
import { colors, fonts, glass, radius, spacing, typography } from '@/theme';
import type { ChatMessageView } from '@/types/chat';
import type { PickedFile } from '@/utils/media';
import { dayKey, dayLabel, expiresIn, parseTime } from '@/utils/dateFormat';

type Item = { kind: 'message'; message: ChatMessageView } | { kind: 'day'; key: string; label: string };

/** Newest first (the list is inverted). A day label goes after the oldest message of each day, so it shows above it. */
function buildItems(desc: ChatMessageView[]): Item[] {
  const items: Item[] = [];
  desc.forEach((m, i) => {
    items.push({ kind: 'message', message: m });
    const t = parseTime(m.timestamp);
    const older = desc[i + 1];
    if (!older || dayKey(parseTime(older.timestamp)) !== dayKey(t)) {
      items.push({ kind: 'day', key: `d-${dayKey(t)}`, label: dayLabel(t) });
    }
  });
  return items;
}

export default function ConversationScreen() {
  const { chatId: chatParam, userId } = useLocalSearchParams<{ chatId: string; userId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const chat = useChat();

  const [chatId, setChatId] = useState(chatParam ?? 'none');
  const [editing, setEditing] = useState<ChatMessageView | null>(null);
  const [msgMenu, setMsgMenu] = useState<ChatMessageView | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [peer, setPeer] = useState<string | null>(null); // who to talk to again after an expired chat is dropped

  const session = chat.sessions.find((s) => s.chat_id === chatId) ?? null;
  const otherId = session ? otherOf(session) : (userId ?? peer ?? '');
  const other = userOf(otherId);
  const all = chat.messages[chatId] ?? [];
  const typing = !!chat.typing[chatId];
  const blocked = chat.blocked.some((u) => u.user_id === otherId);
  const muted = chat.muted.some((u) => u.user_id === otherId);
  const incomingRequest = session?.status === 'requested' && session.requested_by !== meId();
  const outgoingPending = session?.status === 'requested' && session.requested_by === meId();
  const declined = session?.status === 'rejected';
  const expired = !!session && isExpired(session);
  const canCompose = !blocked && !declined && !incomingRequest && !expired;
  const requestAgain = () => {
    setPeer(otherId);
    dropExpiredWith(otherId);
    setChatId('none');
  };

  const desc = useMemo(() => [...all].reverse(), [all]);
  const items = useMemo(() => buildItems(desc), [desc]);
  const hasMore = !!chat.hasMore[chatId];
  const loading = chat.loading && !chat.loaded;

  // Coming from a profile or the new-chat picker there may already be a session with this person.
  useEffect(() => {
    if (chatId !== 'none' || !userId) return;
    const mine = meId();
    const existing = chat.sessions.find((s) => s.participants.includes(userId) && s.participants.includes(mine));
    if (existing) setChatId(existing.chat_id);
  }, [chatId, userId, chat.sessions]);

  useEffect(() => {
    void ensureUsers([otherId]);
  }, [otherId]);
  useEffect(() => {
    if (chatId === 'none') return;
    enterChat(chatId);
    return () => leaveChat(chatId);
  }, [chatId]);

  // Opening the thread marks what they sent as read; the typing hint fades after a few seconds.
  useEffect(() => {
    if (session && session.status !== 'rejected') markChatRead(chatId);
  }, [chatId, all.length, session]);
  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => clearTyping(chatId), 4000);
    return () => clearTimeout(t);
  }, [chatId, typing]);

  const send = (text: string) => {
    if (editing) {
      editMessage(chatId, editing._id, text);
      setEditing(null);
    } else if (chatId === 'none') {
      setChatId(startChatWith(otherId, text)); // first message creates the talk request
    } else {
      sendMessage(chatId, text);
    }
  };

  const sendFile = (file: PickedFile) => {
    if (chatId === 'none') setChatId(startChatWith(otherId, '', file));
    else sendAttachment(chatId, file);
  };

  const confirmDelete = () =>
    Alert.alert('Delete chat?', `This deletes the conversation with ${other.display_name} and all its messages.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteChat(chatId);
          router.canGoBack() ? router.back() : router.replace('/chats');
        },
      },
    ]);

  const left = session && !session.pinned ? expiresIn(session.expires_at) : null;
  const caption = typing
    ? 'typing…'
    : expired
      ? 'Chat expired'
    : declined
      ? 'Request declined'
      : outgoingPending || incomingRequest
        ? 'Talk request pending'
        : session?.pinned
          ? 'Pinned'
        : left?.label
          ? `Disappears in ${left.label.replace(' left', '')}`
          : 'New chat';

  return (
    <View style={styles.root}>
      <ScreenBackground />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <GlassIconButton icon="arrow-left" label="Back" size={40} onPress={() => (router.canGoBack() ? router.back() : router.replace('/chats'))} />
        <Avatar uri={other.profile_image_url} name={other.display_name} size={36} />
        <View style={styles.titles}>
          <Text style={[typography.cardTitle, styles.name]} numberOfLines={1}>
            {other.display_name}
          </Text>
          <Text style={[typography.caption, styles.caption, typing && styles.captionTyping]} numberOfLines={1}>
            {caption}
          </Text>
        </View>
        {session ? <GlassIconButton icon="more-vertical" label="Chat options" size={40} onPress={() => setMenuOpen(true)} /> : null}
      </View>

      {/* State banners */}
      {expired ? (
        <Banner icon="clock" text="This chat expired. Ask again to start a new one." />
      ) : outgoingPending ? (
        <Banner icon="clock" text={`Delivered once ${other.display_name} accepts. Your messages are queued.`} />
      ) : declined ? (
        <Banner icon="x-circle" text={`${other.display_name} declined your request.`} />
      ) : blocked ? (
        <Banner icon="slash" text={`You blocked ${other.display_name}.`} action="Unblock" onAction={() => unblockUser(otherId)} />
      ) : null}

      <FlatList
        data={items}
        inverted
        keyExtractor={(it) => (it.kind === 'day' ? it.key : it.message._id)}
        renderItem={({ item }) =>
          item.kind === 'day' ? (
            <View style={styles.dayWrap}>
              <View style={styles.dayChip}>
                <Text style={styles.dayText}>{item.label}</Text>
              </View>
            </View>
          ) : (
            <MessageBubble
              message={item.message}
              mine={item.message.from === meId()}
              onLongPress={(m) => m.from === meId() && !m.preview && setMsgMenu(m)}
              onRetry={(m) => retryMessage(chatId, m._id)}
              onOpenPost={(id) => router.push({ pathname: '/replies', params: { postId: id } })}
              onOpenOrder={(token, from) => router.push({ pathname: '/order', params: { token, from, chatId } })}
            />
          )
        }
        ListHeaderComponent={typing ? <TypingBubble /> : null}
        ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
        onEndReached={() => hasMore && void loadHistory(chatId, true).catch(() => {})}
        onEndReachedThreshold={0.3}
        ListFooterComponent={hasMore ? <Text style={[typography.caption, styles.older]}>Loading older messages…</Text> : null}
        ListEmptyComponent={
          <Text style={[typography.caption, styles.emptyText]}>
            {loading ? 'Loading…' : chatId === 'none' ? `Say hi to ${other.display_name}. They’ll need to accept before they see it.` : 'No messages yet.'}
          </Text>
        }
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {incomingRequest ? (
        <View style={[styles.requestBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Text style={[typography.caption, styles.requestText]}>{other.display_name} wants to talk to you.</Text>
          <View style={styles.requestBtns}>
            <GlassButton label="Decline" size="sm" variant="secondary" style={styles.flex} onPress={() => declineRequest(chatId)} />
            <GlassButton label="Accept" size="sm" variant="primary" style={styles.flex} onPress={() => acceptRequest(chatId)} />
          </View>
        </View>
      ) : expired ? (
        <View style={[styles.requestBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <GlassButton label="Request talk" size="md" variant="primary" onPress={requestAgain} />
        </View>
      ) : canCompose ? (
        <ChatComposer
          onSend={send}
          onAttach={sendFile}
          editing={editing ? editing.message : null}
          onCancelEdit={() => setEditing(null)}
          onTyping={() => notifyTyping(chatId)}
          placeholder={outgoingPending || chatId === 'none' ? 'Write your first message…' : 'Message…'}
        />
      ) : (
        <View style={{ height: insets.bottom + spacing.md }} />
      )}

      {/* Options for the whole chat */}
      <GlassSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={other.display_name}>
        {session?.status === 'active' ? (
          <SheetAction
            icon="bookmark"
            label={session.pinned ? 'Unpin chat' : 'Pin chat'}
            divider={false}
            onPress={() => { (session.pinned ? unpinChat : pinChat)(chatId); setMenuOpen(false); }}
          />
        ) : null}
        <SheetAction
          icon={muted ? 'bell' : 'bell-off'}
          label={muted ? 'Unmute notifications' : 'Mute notifications'}
          divider={session?.status === 'active'}
          onPress={() => { (muted ? unmuteUser : muteUser)(otherId); setMenuOpen(false); }}
        />
        <SheetAction
          icon="slash"
          label={blocked ? `Unblock ${other.display_name}` : `Block ${other.display_name}`}
          onPress={() => { (blocked ? unblockUser : blockUser)(otherId); setMenuOpen(false); }}
        />
        <SheetAction icon="trash-2" label="Delete chat" danger onPress={() => { setMenuOpen(false); confirmDelete(); }} />
      </GlassSheet>

      {/* Options for one of my messages */}
      <GlassSheet visible={!!msgMenu} onClose={() => setMsgMenu(null)} title="Message">
        {msgMenu ? (
          <>
            <SheetAction
              icon="edit-2"
              label="Edit message"
              divider={false}
              onPress={() => { setEditing(msgMenu); setMsgMenu(null); }}
            />
            <SheetAction icon="trash-2" label="Delete message" danger onPress={() => { deleteMessage(chatId, msgMenu._id); setMsgMenu(null); }} />
          </>
        ) : null}
      </GlassSheet>
    </View>
  );
}

function Banner({ icon, text, action, onAction }: { icon: React.ComponentProps<typeof Feather>['name']; text: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.banner}>
      <Feather name={icon} size={14} color={colors.ink} />
      <Text style={[typography.caption, styles.bannerText]}>{text}</Text>
      {action ? (
        <Text style={[typography.caption, styles.bannerAction]} onPress={onAction} accessibilityRole="button">
          {action}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  titles: { flex: 1 },
  name: { color: colors.textPrimary, ...typography.rowTitle },
  caption: { color: colors.textMuted, ...typography.rowMeta },
  captionTyping: { color: colors.ink, fontFamily: fonts.semibold },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: glass.light.fill,
    borderWidth: 1,
    borderColor: glass.light.border,
  },
  bannerText: { flex: 1, color: colors.ink, ...typography.rowMeta },
  bannerAction: { color: colors.ink, fontFamily: fonts.bold },
  list: { paddingVertical: spacing.sm },
  dayWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  dayChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: glass.light.fill, borderWidth: 1, borderColor: glass.light.border },
  dayText: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
  older: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl, transform: [{ scaleY: -1 }], marginTop: spacing.xxl },
  requestBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  requestText: { color: colors.textMuted, textAlign: 'center' },
  requestBtns: { flexDirection: 'row', gap: spacing.sm },
});
