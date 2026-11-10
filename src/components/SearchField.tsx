import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { GlassSurface } from './GlassSurface';

type Props = { value: string; onChangeText: (t: string) => void; placeholder?: string };

/** Compact (44px) glass search field with a clear button. */
export function SearchField({ value, onChangeText, placeholder = 'Search grids, events, stores…' }: Props) {
  return (
    <GlassSurface tone="light" radius={radius.pill} contentStyle={styles.row}>
      <Feather name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.ink}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel="Search"
        style={[typography.cardBody, styles.input]}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
          <Feather name="x-circle" size={17} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, height: 44 },
  input: { flex: 1, color: colors.textPrimary, paddingVertical: 0 },
});
