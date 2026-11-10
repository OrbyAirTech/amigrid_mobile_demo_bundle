import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, glass, radius, spacing, typography } from '@/theme';
import type { SearchCatalog } from '@/types/search';

type IconName = ComponentProps<typeof Feather>['name'];

const CATALOGS: { key: SearchCatalog; label: string; icon: IconName }[] = [
  { key: 'all', label: 'All', icon: 'compass' },
  { key: 'live', label: 'Live', icon: 'radio' },
  { key: 'events', label: 'Events', icon: 'calendar' },
  { key: 'amigos', label: 'Amigos', icon: 'heart' },
  { key: 'users', label: 'Users', icon: 'user' },
  { key: 'grid', label: 'Grid', icon: 'grid' },
  { key: 'store', label: 'Store', icon: 'shopping-bag' },
];

type Props = { value: SearchCatalog; onChange: (c: SearchCatalog) => void };

/**
 * One inline, swipeable row of catalog chips. Chips are glass-styled (tint + edge) without a live blur each:
 * seven stacked blurs in a scroller aren't worth the cost. The active chip uses the dark glass recipe.
 */
export function CatalogChips({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {CATALOGS.map((c) => {
        const active = c.key === value;
        return (
          <Pressable
            key={c.key}
            onPress={() => onChange(c.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={c.label}
          >
            <View style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}>
              <Feather name={c.icon} size={14} color={active ? colors.white : colors.ink} />
              <Text style={[typography.caption, styles.label, { color: active ? colors.white : colors.ink }]}>{c.label}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipIdle: { backgroundColor: glass.light.fill, borderColor: glass.light.border },
  chipActive: { backgroundColor: glass.dark.fill, borderColor: glass.dark.border },
  label: { fontFamily: fonts.semibold },
});
