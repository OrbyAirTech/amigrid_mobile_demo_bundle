import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { BackHeader } from '@/components/BackHeader';
import { GlassButton } from '@/components/GlassButton';
import { OrderSheet } from '@/components/OrderSheet';
import { FlatGlassProvider, GlassSurface } from '@/components/GlassSurface';
import { Pill } from '@/components/Pill';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ApiError } from '@/data/api/client';
import { meId } from '@/data/chatStore';
import { orderCount, useOrder } from '@/data/orderStore';
import { fetchProducts, fetchStore, getProductsVersion, PRODUCT_PAGE } from '@/data/storeApi';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import type { StoreProduct, StoreProfile } from '@/types/store';
import { formatCount } from '@/utils/time';

const GAP = spacing.sm;

const money = (p: StoreProduct) => `${p.currency ? p.currency + ' ' : ''}${Number.isInteger(p.price) ? p.price : p.price.toFixed(2)}`;

/** A store opened from search or the map: who runs it, when it is open and what it sells. Browsing only. */
export default function StoreScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<StoreProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState<StoreProduct[]>([]);
  const [moreBusy, setMoreBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const seenVersion = useRef(getProductsVersion());
  const order = useOrder(id);
  const count = orderCount(order);

  const load = useCallback(
    async (pull: boolean) => {
      if (!id) return;
      if (pull) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const d = await fetchStore(id);
        setData(d);
        setMore([]);
        setDone(d.products.length < PRODUCT_PAGE);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Couldn’t load this store.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  // Coming back from "Add a product": fetch the list again so the new product shows (without counting another visit).
  useFocusEffect(
    useCallback(() => {
      const v = getProductsVersion();
      if (!id || v === seenVersion.current) return;
      seenVersion.current = v;
      fetchProducts(id, 0)
        .then((list) => {
          setData((cur) => (cur ? { ...cur, products: list } : cur));
          setMore([]);
          setDone(list.length < PRODUCT_PAGE);
        })
        .catch(() => {});
    }, [id]),
  );

  const shown = data ? [...data.products, ...more] : [];
  const showMore = async () => {
    if (!id || moreBusy) return;
    setMoreBusy(true);
    try {
      const next = await fetchProducts(id, shown.length);
      const seen = new Set(shown.map((x) => x.id));
      const fresh = next.filter((x) => !seen.has(x.id));
      setMore((cur) => [...cur, ...fresh]);
      if (fresh.length < PRODUCT_PAGE) setDone(true);
    } catch {
      /* leave the button for another try */
    } finally {
      setMoreBusy(false);
    }
  };

  const s = data?.store;
  const hours = s && s.opens_at && s.closes_at ? `${s.opens_at.slice(0, 5)} – ${s.closes_at.slice(0, 5)}` : null;

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader title={s?.name ?? 'Store'} caption={s?.category} />

      <FlatGlassProvider value>
        {data && s ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.ink} />}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}
          >
            {s.banner_url ? <Image source={{ uri: s.banner_url }} style={styles.banner} contentFit="cover" /> : null}

            <View style={styles.identity}>
              <Avatar uri={s.logo_url} name={s.name} size={56} ring />
              <View style={styles.names}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {s.name}
                  </Text>
                  {s.is_verified ? <Feather name="check-circle" size={15} color={colors.ink} /> : null}
                </View>
                <Text style={[typography.caption, styles.muted]} numberOfLines={1}>
                  {s.category}
                </Text>
              </View>
              <Pill icon={s.is_open ? 'check-circle' : 'x-circle'} label={s.is_open ? 'Open Now' : 'Closed'} tone={s.is_open ? 'success' : 'muted'} />
            </View>

            <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.stats}>
              <Stat icon="star" value={s.rating_count > 0 ? s.rating.toFixed(1) : '–'} label={`${formatCount(s.rating_count)} ratings`} />
              <View style={styles.divider} />
              <Stat icon="shopping-bag" value={formatCount(s.total_sales)} label="sales" />
              <View style={styles.divider} />
              <Stat icon="clock" value={hours ?? '–'} label={s.days_open.length ? s.days_open.join(' · ') : 'hours'} small />
            </GlassSurface>

            {s.description ? <Text style={[typography.cardBody, styles.desc]}>{s.description}</Text> : null}

            {s.tags.length > 0 ? (
              <View style={styles.tags}>
                {s.tags.map((t) => (
                  <Pill key={t} label={t} />
                ))}
              </View>
            ) : null}

            {data.owner.id ? (
              <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.owner}>
                <Avatar uri={data.owner.profile_pic_url} name={data.owner.username} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.caption, styles.muted]}>Run by</Text>
                  <Text style={[typography.cardTitle, styles.ownerName]} numberOfLines={1}>
                    @{data.owner.username}
                  </Text>
                </View>
              </GlassSurface>
            ) : null}

            <View style={styles.sectionHead}>
              <Feather name="package" size={17} color={colors.ink} />
              <Text style={[typography.cardTitle, styles.sectionText]}>Products</Text>
              {data.owner.id === meId() ? (
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <GlassButton label="Add product" size="sm" variant="secondary" icon="plus" onPress={() => router.push({ pathname: '/add-product', params: { storeId: s.id, storeName: s.name } })} />
                </View>
              ) : null}
            </View>
            {shown.length === 0 ? (
              <Text style={[typography.cardBody, styles.muted]}>Nothing listed yet.</Text>
            ) : (
              <View style={styles.grid}>
                {shown.map((p) => (
                  <Pressable key={p.id} style={styles.product} accessibilityRole="button" accessibilityLabel={p.name} onPress={() => router.push({ pathname: '/product', params: { storeId: s.id, productId: p.id, ownerId: data.owner.id, storeName: s.name } })}>
                  <GlassSurface tone="light" radius={radius.lg} raised>
                    <View style={styles.thumbWrap}>
                      {p.thumbnail_url ? <Image source={{ uri: p.thumbnail_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                    </View>
                    <View style={styles.productBody}>
                      <Text style={[typography.cardTitle, styles.productName]} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={[typography.caption, styles.price]}>{money(p)}</Text>
                      {!p.in_stock ? <Text style={[typography.caption, styles.muted]}>Out of stock</Text> : null}
                    </View>
                  </GlassSurface>
                  </Pressable>
                ))}
              </View>
            )}
            {!done && shown.length > 0 ? <GlassButton label={moreBusy ? 'Loading…' : 'Show more'} size="sm" variant="secondary" onPress={showMore} disabled={moreBusy} /> : null}
          </ScrollView>
        ) : (
          <View style={styles.state}>
            {loading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <>
                <Text style={[typography.body, styles.errorText]}>{error ?? 'Couldn’t load this store.'}</Text>
                <GlassButton label="Try again" size="sm" variant="primary" onPress={() => load(false)} style={{ minWidth: 140 }} />
              </>
            )}
          </View>
        )}
      </FlatGlassProvider>

      {count > 0 && s && data?.owner.id !== meId() ? (
        <View style={[styles.orderBar, { bottom: insets.bottom + spacing.md }]}>
          <GlassButton label={`Review order · ${count} ${count === 1 ? 'item' : 'items'}`} icon="shopping-bag" variant="dark" size="md" onPress={() => setOrderOpen(true)} />
        </View>
      ) : null}
      {s ? <OrderSheet visible={orderOpen} onClose={() => setOrderOpen(false)} storeId={s.id} /> : null}
    </View>
  );
}

function Stat({ icon, value, label, small }: { icon: keyof typeof Feather.glyphMap; value: string; label: string; small?: boolean }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statTop}>
        <Feather name={icon} size={13} color={icon === 'star' ? '#C99A2E' : colors.ink} />
        <Text style={[styles.statValue, small && { fontSize: 13 }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={[typography.caption, styles.muted]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  banner: { height: 120, borderRadius: radius.lg, backgroundColor: colors.iconTile },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  names: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontFamily: fonts.extrabold, fontSize: 19, lineHeight: 25, letterSpacing: -0.3, color: colors.textPrimary, flexShrink: 1 },
  muted: { color: colors.textMuted },
  stats: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 2 },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: spacing.xs },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.textMuted, opacity: 0.35 },
  desc: { color: colors.textPrimary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  owner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, padding: spacing.sm + 2 },
  ownerName: { color: colors.textPrimary },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  sectionText: { color: colors.textPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  product: { width: '48.5%' },
  thumbWrap: { height: 110, backgroundColor: colors.iconTile },
  productBody: { padding: spacing.sm, gap: 1 },
  productName: { color: colors.textPrimary },
  price: { color: colors.ink, fontFamily: fonts.semibold },
  orderBar: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  state: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl },
  errorText: { color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
});
