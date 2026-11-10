import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, glass, spacing, typography } from '@/theme';
import type { ChatMessageView } from '@/types/chat';
import { formatClock, parseTime } from '@/utils/dateFormat';
import { attachmentOf, isLabelOnly } from '@/utils/media';
import { decodeOrder, orderTokenOf } from '@/utils/orderToken';
import { AttachmentView } from './AttachmentView';

type Props = {
  message: ChatMessageView;
  mine: boolean;
  onLongPress?: (m: ChatMessageView) => void;
  onRetry?: (m: ChatMessageView) => void;
  onOpenPost?: (postId: string) => void;
  onOpenOrder?: (token: string, from: string) => void;
};

function Status({ m }: { m: ChatMessageView }) {
  if (m.state === 'failed') return <Feather name="alert-circle" size={12} color={colors.danger} />;
  if (m.state === 'pending' || m.state === 'queued') return <Feather name="clock" size={11} color="rgba(255,255,255,0.7)" />;
  return <Feather name={m.read ? 'check-circle' : 'check'} size={12} color="rgba(255,255,255,0.8)" />;
}

/**
 * One message. Mine: dark glass on the right. Theirs: light glass on the left. Plain tinted views (no blur each),
 * like the chips, so long threads stay smooth.
 */
export function MessageBubble({ message: m, mine, onLongPress, onRetry, onOpenPost, onOpenOrder }: Props) {
  const failed = m.state === 'failed';
  const att = attachmentOf(m);
  const orderToken = orderTokenOf(m.message);
  const order = orderToken ? decodeOrder(orderToken) : null;
  const showText = !order && !(att && isLabelOnly(m.message, att)); // the label ("Voice note") only exists for the server
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <Pressable
        onLongPress={() => onLongPress?.(m)}
        onPress={failed ? () => onRetry?.(m) : undefined}
        accessibilityLabel={`${mine ? 'You' : 'They'}: ${m.message}`}
        style={[styles.bubble, mine ? styles.mine : styles.theirs]}
      >
        {m.media_url ? <AttachmentView message={m} mine={mine} /> : null}
        {m.post_id ? (
          <Pressable onPress={() => onOpenPost?.(String(m.post_id))} accessibilityRole="button" accessibilityLabel="Open the shared post" style={[styles.post, mine ? styles.postMine : styles.postTheirs]}>
            <Feather name="file-text" size={13} color={mine ? colors.white : colors.ink} />
            <Text style={[styles.postText, { color: mine ? colors.white : colors.ink }]}>Shared a post</Text>
          </Pressable>
        ) : null}
        {order && orderToken ? (
          <Pressable onPress={() => onOpenOrder?.(orderToken, m.from)} accessibilityRole="button" accessibilityLabel="Open the order request" style={[styles.post, mine ? styles.postMine : styles.postTheirs]}>
            <Feather name="shopping-bag" size={13} color={mine ? colors.white : colors.ink} />
            <Text style={[styles.postText, { color: mine ? colors.white : colors.ink }]}>Order request · {order.items.reduce((n, i) => n + i.qty, 0)} {order.items.reduce((n, i) => n + i.qty, 0) === 1 ? 'item' : 'items'}</Text>
            <Feather name="chevron-right" size={13} color={mine ? colors.white : colors.ink} />
          </Pressable>
        ) : null}
        {showText ? <Text style={[typography.cardBody, styles.text, { color: mine ? colors.white : colors.textPrimary }]}>{m.message}</Text> : null}
        <View style={styles.meta}>
          {failed ? <Text style={styles.failed}>Tap to retry</Text> : m.state === 'queued' ? <Text style={styles.queued}>Queued</Text> : null}
          <Text style={[styles.time, { color: mine ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
            {formatClock(parseTime(m.timestamp))}
          </Text>
          {mine ? <Status m={m} /> : null}
        </View>
      </Pressable>
    </View>
  );
}

/** "Name is typing" bubble: three dots. */
export function TypingBubble() {
  return (
    <View style={[styles.row, styles.rowTheirs]}>
      <View style={[styles.bubble, styles.theirs, styles.typing]} accessibilityLabel="Typing">
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.typingDot, { opacity: 0.35 + i * 0.25 }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: spacing.lg },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, borderRadius: 18, borderWidth: 1, gap: 4, overflow: 'hidden' },
  mine: { backgroundColor: glass.dark.fill, borderColor: glass.dark.border, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: glass.light.fill, borderColor: glass.light.border, borderBottomLeftRadius: 6 },
  post: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 },
  postMine: { backgroundColor: 'rgba(255,255,255,0.14)' },
  postTheirs: { backgroundColor: colors.iconTile },
  postText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  text: { fontSize: 15, lineHeight: 21 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  time: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 13 },
  queued: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.semibold, fontSize: 10, lineHeight: 13 },
  failed: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 13 },
  typing: { flexDirection: 'row', gap: 4, paddingVertical: 12 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink },
});
