import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme';
import { HeaderMessagesButton } from './HeaderMessagesButton';
import { HeaderProfileButton } from './HeaderProfileButton';

type Props = { title: string; caption?: string };

/** Same header as Search / Activity (profile left, messages right) with a two-line title: name + small count. */
export function TabScreenHeader({ title, caption }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.row, { paddingTop: insets.top + spacing.sm }]}>
      <HeaderProfileButton />
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
      <HeaderMessagesButton />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  titles: { flex: 1, marginLeft: spacing.xs },
  title: { color: colors.textPrimary, ...typography.screenTitle },
  caption: { color: colors.textMuted, ...typography.rowMeta },
});
