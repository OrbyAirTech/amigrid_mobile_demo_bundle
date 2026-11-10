import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { GlassButton } from '@/components/GlassButton';
import { FlatGlassProvider, GlassSurface } from '@/components/GlassSurface';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ensureUsers, userOf } from '@/data/chatStore';
import { fetchProduct } from '@/data/storeApi';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import type { ProductDetail } from '@/types/store';
import { formatMoney, totalsOf } from '@/utils/money';
import { decodeOrder } from '@/utils/orderToken';

type Row = { id: string; qty: number; product: ProductDetail | null };

/**
 * An order request opened from a chat message. The message only holds product ids and quantities, so the names and
 * prices shown here are the store's current ones. The owner handles the rest in the chat.
 */
export default function OrderScreen() {
  const insets = useSafeAreaInsets();
  const { token, from, chatId } = useLocalSearchParams<{ token?: string; from?: string; chatId?: string }>();
  const order = token ? decodeOrder(token) : null;
  const [rows, setRows] = useState<Row[] | null>(null);
  const buyer = from ? userOf(from) : null;

  useEffect(() => {
    if (from) void ensureUsers([from]);
  }, [from]);

  useEffect(() => {
    if (!order) return;
    let live = true;
    void Promise.all(order.items.map(async (it): Promise<Row> => ({ ...it, product: await fetchProduct(order.store, it.id).catch(() => null) }))).then((r) => live && setRows(r));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const priced = (rows ?? []).filter((r) => r.product).map((r) => ({ price: r.product!.price, currency: r.product!.currency, qty: r.qty }));
  const missing = (rows ?? []).some((r) => !r.product);

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader title="Order request" caption={buyer ? `From ${buyer.display_name}` : undefined} />
      <FlatGlassProvider value>
        {!order ? (
          <View style={styles.state}>
            <Text style={[typography.body, styles.muted, styles.center]}>This order code isn’t valid.</Text>
          </View>
        ) : !rows ? (
          <View style={styles.state}><ActivityIndicator color={colors.ink} /></View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.sm }}>
            {rows.map((r) => (
              <GlassSurface key={r.id} tone="light" radius={radius.lg} raised contentStyle={styles.row}>
                <View style={styles.thumb}>
                  {r.product?.media_url[0] ? <Image source={{ uri: r.product.media_url[0] }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Feather name="package" size={16} color={colors.ink} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.rowTitle, styles.title]} numberOfLines={1}>{r.product?.name ?? 'Product no longer available'}</Text>
                  <Text style={[typography.rowMeta, styles.muted]}>
                    {r.product ? `${formatMoney(r.product.price, r.product.currency)} × ${r.qty}` : `Quantity ${r.qty}`}
                    {r.product && !r.product.in_stock ? ' · out of stock' : ''}
                  </Text>
                </View>
                {r.product ? <Text style={styles.line}>{formatMoney(r.product.price * r.qty, r.product.currency)}</Text> : null}
              </GlassSurface>
            ))}

            <View style={styles.totalRow}>
              <Text style={[typography.cardBody, styles.muted]}>Total</Text>
              <Text style={styles.total}>{priced.length ? totalsOf(priced) : '–'}</Text>
            </View>
            {missing ? <Text style={[typography.caption, styles.muted]}>Some items couldn’t be looked up, so the total leaves them out.</Text> : null}

            {order.note ? (
              <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.note}>
                <Text style={[typography.caption, styles.muted]}>Note from the buyer</Text>
                <Text style={[typography.cardBody, styles.title]}>{order.note}</Text>
              </GlassSurface>
            ) : null}

            <GlassButton
              label="Reply in chat"
              icon="message-circle"
              size="md"
              variant="primary"
              onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/chat', params: { chatId: chatId ?? 'none', userId: from } }))}
            />
            <GlassButton label="Open the store" size="md" variant="secondary" onPress={() => router.push({ pathname: '/store', params: { id: order.store } })} />
            <Text style={[typography.caption, styles.muted, styles.center]}>Nothing has been charged. Agree payment and delivery with the buyer in the chat.</Text>
          </ScrollView>
        )}
      </FlatGlassProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  state: { alignItems: 'center', marginTop: spacing.xxl },
  muted: { color: colors.textMuted },
  center: { textAlign: 'center' },
  title: { color: colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, padding: spacing.sm + 2 },
  thumb: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.iconTile, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  line: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4, marginTop: spacing.xs },
  total: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 17 },
  note: { padding: spacing.md, gap: 2 },
});
