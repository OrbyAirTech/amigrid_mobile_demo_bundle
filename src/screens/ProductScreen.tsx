import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { GlassButton } from '@/components/GlassButton';
import { OrderSheet } from '@/components/OrderSheet';
import { FlatGlassProvider } from '@/components/GlassSurface';
import { Pill } from '@/components/Pill';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ApiError } from '@/data/api/client';
import { meId } from '@/data/chatStore';
import { addToOrder, orderCount, useOrder } from '@/data/orderStore';
import { fetchProduct } from '@/data/storeApi';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import type { ProductDetail } from '@/types/store';

/** One product: its photos, price, stock and description. Browsing only; the server has no cart yet. */
export default function ProductScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { storeId, productId, ownerId, storeName } = useLocalSearchParams<{ storeId: string; productId: string; ownerId?: string; storeName?: string }>();
  const [orderOpen, setOrderOpen] = useState(false);
  const order = useOrder(storeId);
  const count = orderCount(order);
  const canOrder = !!ownerId && ownerId !== meId();
  const [p, setP] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    if (!storeId || !productId) return;
    setLoading(true);
    setError(null);
    try {
      setP(await fetchProduct(storeId, productId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t load this product.');
    } finally {
      setLoading(false);
    }
  }, [storeId, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const w = width - spacing.lg * 2;
  const price = p ? `${p.currency ? p.currency + ' ' : ''}${Number.isInteger(p.price) ? p.price : p.price.toFixed(2)}` : '';

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader title={p?.name ?? 'Product'} />
      <FlatGlassProvider value>
        {p ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}>
            {p.media_url.length > 0 ? (
              <View>
                <FlatList
                  data={p.media_url}
                  keyExtractor={(u, i) => `${i}-${u}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))}
                  renderItem={({ item }) => <Image source={{ uri: item }} style={{ width: w, height: w * 0.85, borderRadius: radius.lg, backgroundColor: colors.iconTile }} contentFit="cover" />}
                />
                {p.media_url.length > 1 ? (
                  <View style={styles.dots}>
                    {p.media_url.map((_, i) => (
                      <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.titleRow}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.price}>{price}</Text>
            </View>
            <View style={styles.chips}>
              <Pill icon={p.in_stock ? 'check-circle' : 'x-circle'} label={p.in_stock ? 'In stock' : 'Out of stock'} tone={p.in_stock ? 'success' : 'muted'} />
              {p.swap_allowed ? <Pill icon="repeat" label="Open to swaps" /> : null}
            </View>
            {p.description ? <Text style={[typography.cardBody, styles.desc]}>{p.description}</Text> : null}
            {canOrder && p.in_stock ? (
              <GlassButton
                label="Add to order"
                icon="plus"
                variant="dark"
                size="md"
                onPress={() => {
                  if (!addToOrder({ storeId, storeName: storeName ?? 'the store', ownerId: ownerId! }, { id: p.id, name: p.name, price: p.price, currency: p.currency, thumb: p.media_url[0] ?? '' })) Alert.alert('Order is full', 'An order can hold up to 10 different products. Send this one first.');
                }}
              />
            ) : null}
            {canOrder && count > 0 ? <GlassButton label={`Review order · ${count} ${count === 1 ? 'item' : 'items'}`} icon="shopping-bag" variant="primary" size="md" onPress={() => setOrderOpen(true)} /> : null}
            <GlassButton label="Back to store" size="md" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/store', params: { id: storeId } }))} />
          </ScrollView>
        ) : (
          <View style={styles.state}>
            {loading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <>
                <Text style={[typography.body, styles.errorText]}>{error ?? 'Couldn’t load this product.'}</Text>
                <GlassButton label="Try again" size="sm" variant="primary" onPress={load} style={{ minWidth: 140 }} />
              </>
            )}
          </View>
        )}
      </FlatGlassProvider>
      {storeId ? <OrderSheet visible={orderOpen} onClose={() => setOrderOpen(false)} storeId={storeId} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted, opacity: 0.35 },
  dotOn: { backgroundColor: colors.ink, opacity: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  name: { flex: 1, fontFamily: fonts.extrabold, fontSize: 19, lineHeight: 25, letterSpacing: -0.3, color: colors.textPrimary },
  price: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  desc: { color: colors.textPrimary },
  state: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl },
  errorText: { color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
});
