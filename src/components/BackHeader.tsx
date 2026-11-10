import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme';
import { GlassIconButton } from './GlassIconButton';

type Props = {
  title: string;
  caption?: string;
  /** Right-hand actions (e.g. a "+" button). */
  right?: ReactNode;
  /** Where Back goes when there is nothing to go back to (the screen was opened by a replace). */
  fallback?: '/map' | '/profile';
};

/** Compact header for pushed list screens: glass back button, two-line title, optional actions. */
export function BackHeader({ title, caption, right, fallback = '/map' }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.row, { paddingTop: insets.top + spacing.sm }]}>
      <GlassIconButton
        icon="arrow-left"
        label="Back"
        size={40}
        onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      />
      <View style={styles.titles}>
        <Text style={[typography.title, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        {caption ? (
          <Text style={[typography.caption, styles.caption]} numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  titles: { flex: 1, marginLeft: spacing.xs },
  title: { color: colors.textPrimary, ...typography.screenTitle },
  caption: { color: colors.textMuted, ...typography.rowMeta },
});
