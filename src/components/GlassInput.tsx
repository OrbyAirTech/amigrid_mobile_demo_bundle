import { Feather } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, radius, typography } from '@/theme';
import { GlassSurface } from './GlassSurface';

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  icon?: ComponentProps<typeof Feather>['name'];
  /** Rendered on the right inside the field, e.g. a password show/hide toggle. */
  rightElement?: ReactNode;
  /** Muted helper text under the field (hidden while `error` is set). */
  hint?: string;
  /** Error text under the field, shown in the danger colour. Also rings the field. */
  error?: string;
};

/** Glass text field with optional label, leading icon, trailing element, hint and error state. */
export function GlassInput({
  label,
  icon,
  rightElement,
  hint,
  error,
  onFocus,
  onBlur,
  ...inputProps
}: Props) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.ink : undefined;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[typography.caption, styles.label]} accessibilityElementsHidden>
          {label}
        </Text>
      ) : null}
      <GlassSurface tone="light" radius={radius.md} borderColor={borderColor} contentStyle={styles.row}>
        {icon ? <Feather name={icon} size={20} color={colors.textMuted} /> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.ink}
          style={[typography.body, styles.input]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {rightElement}
      </GlassSurface>
      {error ? (
        <Text style={[typography.caption, styles.error]}>{error}</Text>
      ) : hint ? (
        <Text style={[typography.caption, styles.hint]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: colors.textPrimary, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 56 },
  input: { flex: 1, color: colors.textPrimary, paddingVertical: 0 },
  hint: { color: colors.textMuted },
  error: { color: colors.danger },
});
