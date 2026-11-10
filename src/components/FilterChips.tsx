import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, glass, radius, spacing, typography } from '@/theme';

type Props<K extends string> = {
  options: { key: K; label: string; count?: number }[];
  value: K;
  onChange: (key: K) => void;
};

/** Small glass filter chips (30px). Active chip uses the dark glass recipe, like the Search chips. */
export function FilterChips<K extends string>({ options, value, onChange }: Props<K>) {
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
          >
            <View style={[styles.chip, active ? styles.active : styles.idle]}>
              <Text style={[typography.caption, styles.label, { color: active ? colors.white : colors.ink }]}>
                {o.label}
                {o.count != null ? `  ${o.count}` : ''}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: { height: 30, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
  idle: { backgroundColor: glass.light.fill, borderColor: glass.light.border },
  active: { backgroundColor: glass.dark.fill, borderColor: glass.dark.border },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
});
