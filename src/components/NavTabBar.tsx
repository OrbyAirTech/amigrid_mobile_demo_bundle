import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUnreadCount } from '@/data/notificationStore';
import { navigateTab, type TabKey } from '@/utils/tabNav';
import { colors, glass, navBottom, radius, spacing, typography } from '@/theme';
import { CountBadge } from './CountBadge';
import { GlassSurface } from './GlassSurface';

type TabIcon = { lib: 'feather'; name: keyof typeof Feather.glyphMap } | { lib: 'ion'; name: keyof typeof Ionicons.glyphMap };

const TABS: { key: TabKey; label: string; icon: TabIcon }[] = [
  { key: 'map', label: 'Explore', icon: { lib: 'feather', name: 'map' } },
  { key: 'feed', label: 'Feed', icon: { lib: 'feather', name: 'rss' } },
  // Circled magnifier: same round, outlined look as the old "target" (Spaces) icon.
  { key: 'search', label: 'Search', icon: { lib: 'ion', name: 'search-circle-outline' } },
  { key: 'activity', label: 'Activity', icon: { lib: 'feather', name: 'bell' } },
];

type Props = { active?: string };

/**
 * Floating bottom nav: a translucent glass pill inset from both edges, like the feed's top toggle.
 * Map, Feed, Search and Activity are wired to real screens.
 * Height/position constants live in theme/layout (NAV_BAR_HEIGHT, navBottom, navOccupied).
 */
export function NavTabBar({ active = 'map' }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const unread = useUnreadCount();

  const onTab = (key: TabKey) => {
    if (key === active) return;
    navigateTab(router, active, key);
  };

  return (
    <View style={[styles.wrap, { bottom: navBottom(insets.bottom) }]} pointerEvents="box-none">
      <GlassSurface tone="floating" raised radius={radius.xl} contentStyle={styles.row}>
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const color = isActive ? colors.ink : colors.textMuted;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onTab(tab.key)}
              style={styles.tabHit}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <View style={[styles.tab, isActive && styles.tabActive]}>
                <View style={styles.iconBox}>
                  <View>
                    {tab.icon.lib === 'feather' ? (
                      <Feather name={tab.icon.name} size={22} color={color} />
                    ) : (
                      <Ionicons name={tab.icon.name} size={28} color={color} />
                    )}
                    {tab.key === 'activity' ? <CountBadge count={unread} /> : null}
                  </View>
                </View>
                <Text style={[typography.caption, styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  row: { flexDirection: 'row', padding: 6 },
  tabHit: { flex: 1 },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: 52,
    borderRadius: radius.lg,
  },
  tabActive: { backgroundColor: glass.primary.fill },
  iconBox: { height: 28, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.textMuted, fontSize: 11, lineHeight: 14 },
  labelActive: { color: colors.ink, fontFamily: typography.button.fontFamily },
});
