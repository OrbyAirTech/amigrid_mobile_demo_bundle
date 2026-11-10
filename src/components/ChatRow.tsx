import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { isExpired, isUnread, meId, otherOf, useChat, userOf } from '@/data/chatStore';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import type { ChatSession } from '@/types/chat';
import { expiresIn } from '@/utils/dateFormat';
import { orderPreview } from '@/utils/orderToken';
import { timeAgo } from '@/utils/time';
import { Avatar } from './Avatar';
import { GlassButton } from './GlassButton';
import { GlassSurface } from './GlassSurface';
import { openTalk } from './TalkButton';

type Props = { session: ChatSession; onPress: (s: ChatSession) => void; onLongPress?: (s: ChatSession) => void };

/** One conversation: avatar, name, last message, time, unread dot, pin and a time-left tag (chats expire after 24h). */
export function ChatRow({ session, onPress, onLongPress }: Props) {
  const { settings } = useChat();
  const other = userOf(otherOf(session));
  const last = session.last_message;
  const router = useRouter();
  const expired = isExpired(session);
  const unread = isUnread(session);
  const left = expiresIn(session.expires_at);

  const preview = !last
    ? 'No messages yet'
    : unread && !settings.show_message_preview
      ? 'New message'
      : `${last.from === meId() ? 'You: ' : ''}${orderPreview(last.message)}`;

  return (
    <Pressable
      onPress={() => onPress(session)}
      onLongPress={() => onLongPress?.(session)}
      accessibilityRole="button"
      accessibilityLabel={`${other.display_name}${unread ? ', unread' : ''}. ${preview}`}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.row}>
        <Avatar uri={other.profile_image_url} name={other.display_name} size={44} />
        <View style={styles.body}>
          <View style={styles.line}>
            <Text style={[typography.cardTitle, styles.name]} numberOfLines={1}>
              {other.display_name}
            </Text>
            {session.pinned ? <Feather name="bookmark" size={12} color={colors.textMuted} /> : null}
            <Text style={[typography.caption, styles.time, unread && styles.timeUnread]}>
              {last ? timeAgo(last.timestamp) : ''}
            </Text>
          </View>
          <View style={styles.line}>
            <Text style={[typography.caption, styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
              {preview}
            </Text>
            {unread ? <View style={styles.dot} /> : null}
          </View>
          {left.label && !session.pinned ? (
            <View style={styles.expiry}>
              <Feather name="clock" size={10} color={left.hours < 3 ? colors.danger : colors.textMuted} />
              <Text style={[styles.expiryText, left.hours < 3 && { color: colors.ink }]}>{left.label}</Text>
            </View>
          ) : null}
        </View>
        {expired ? <GlassButton label="Request talk" size="sm" variant="primary" onPress={() => openTalk(router, otherOf(session))} style={{ minWidth: 0, paddingHorizontal: 10 }} /> : null}
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, padding: spacing.sm + 2 },
  body: { flex: 1, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, color: colors.textPrimary, ...typography.rowTitle },
  time: { color: colors.textMuted, ...typography.rowMeta },
  timeUnread: { color: colors.ink, fontFamily: fonts.semibold },
  preview: { flex: 1, color: colors.textMuted, ...typography.rowMeta },
  previewUnread: { color: colors.ink, fontFamily: fonts.semibold },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.ink },
  expiry: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expiryText: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 10, lineHeight: 13 },
});
