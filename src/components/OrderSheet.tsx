import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { clearOrder, setQty, useOrder } from '@/data/orderStore';
import { startChatWith } from '@/data/chatStore';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import { formatMoney, totalsOf } from '@/utils/money';
import { MAX_NOTE, orderMessage } from '@/utils/orderToken';
import { GlassButton } from './GlassButton';
import { GlassSheet } from './GlassSheet';

type Props = { visible: boolean; onClose: () => void; storeId: string };

/**
 * What you have picked from one store. "Send" puts an order request in a chat with the owner; tapping it there opens the
 * list for them. Nothing is charged: payment and delivery are settled in the chat.
 */
export function OrderSheet({ visible, onClose, storeId }: Props) {
  const order = useOrder(storeId);
  const [note, setNote] = useState('');

  if (!order) return visible ? <GlassSheet visible onClose={onClose} title="Your order"><Text style={[typography.cardBody, styles.muted]}>Nothing picked yet.</Text></GlassSheet> : null;

  const send = () => {
    const chatId = startChatWith(order.ownerId, orderMessage({ store: order.storeId, items: order.lines.map((l) => ({ id: l.id, qty: l.qty })), note: note.trim() }));
    clearOrder(storeId);
    setNote('');
    onClose();
    router.push({ pathname: '/chat', params: { chatId, userId: order.ownerId } });
  };

  return (
    <GlassSheet visible={visible} onClose={onClose} title={`Order from ${order.storeName}`}>
      <View style={styles.body}>
        {order.lines.map((l) => (
          <View key={l.id} style={styles.line}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.rowTitle, styles.name]} numberOfLines={1}>{l.name}</Text>
              <Text style={[typography.rowMeta, styles.muted]}>{formatMoney(l.price, l.currency)}</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable onPress={() => setQty(storeId, l.id, l.qty - 1)} hitSlop={6} accessibilityRole="button" accessibilityLabel={l.qty === 1 ? `Remove ${l.name}` : `One less ${l.name}`} style={styles.step}>
                <Feather name={l.qty === 1 ? 'trash-2' : 'minus'} size={14} color={colors.ink} />
              </Pressable>
              <Text style={styles.qty}>{l.qty}</Text>
              <Pressable onPress={() => setQty(storeId, l.id, l.qty + 1)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`One more ${l.name}`} style={styles.step}>
                <Feather name="plus" size={14} color={colors.ink} />
              </Pressable>
            </View>
          </View>
        ))}
        <TextInput value={note} onChangeText={setNote} placeholder="Note for the store (optional)" placeholderTextColor={colors.textMuted} maxLength={MAX_NOTE} style={styles.input} accessibilityLabel="Note for the store" />
        <View style={styles.totalRow}>
          <Text style={[typography.cardBody, styles.muted]}>Total</Text>
          <Text style={styles.total}>{totalsOf(order.lines)}</Text>
        </View>
        <GlassButton label="Send to the store owner" icon="send" variant="dark" size="md" onPress={send} />
        <Text style={[typography.caption, styles.muted, styles.fine]}>Sent as a chat message. You’ll agree payment and delivery there.</Text>
      </View>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm + 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { color: colors.textPrimary },
  muted: { color: colors.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.iconTile, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 18, textAlign: 'center', color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 14 },
  input: { height: 44, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(36,22,35,0.1)', color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  total: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 16 },
  fine: { textAlign: 'center' },
});
