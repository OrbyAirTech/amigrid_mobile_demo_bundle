import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dismissPushBanner, openFromPush, usePushBanner } from '@/data/pushService';
import { colors, radius, spacing, typography } from '@/theme';
import { GlassSurface } from './GlassSurface';

/** A push that arrives while the app is open: a small glass card at the top. Tap to open, it fades after a few seconds. */
export function PushBanner() {
  const insets = useSafeAreaInsets();
  const b = usePushBanner();

  useEffect(() => {
    if (!b) return;
    const t = setTimeout(dismissPushBanner, 4500);
    return () => clearTimeout(t);
  }, [b?.id]);

  if (!b) return null;
  return (
    <View style={[styles.wrap, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
      <Pressable
        onPress={() => {
          dismissPushBanner();
          openFromPush(b.data);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${b.title}. ${b.body}`}
      >
        <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.card}>
          <Feather name="bell" size={16} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.rowTitle, styles.title]} numberOfLines={1}>{b.title}</Text>
            {b.body ? <Text style={[typography.rowMeta, styles.body]} numberOfLines={2}>{b.body}</Text> : null}
          </View>
        </GlassSurface>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, zIndex: 50 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingHorizontal: spacing.md, paddingVertical: 10 },
  title: { color: colors.textPrimary },
  body: { color: colors.textMuted },
});
