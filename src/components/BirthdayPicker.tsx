import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/theme';
import { formatLongDate } from '@/utils/date';
import { GlassButton } from './GlassButton';
import { GlassSheet } from './GlassSheet';
import { GlassSurface } from './GlassSurface';

const TODAY = new Date();
const MIN_DATE = new Date(TODAY.getFullYear() - 100, 0, 1);
// Land the wheel on a plausible adult birth year rather than today's date.
const DEFAULT_DATE = new Date(TODAY.getFullYear() - 18, TODAY.getMonth(), TODAY.getDate());

type Props = {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  error?: string;
};

/**
 * Birthday field backed by the native date-picker wheel.
 * iOS: opens a glass bottom sheet with the inline spinner (a true scroll wheel) + Cancel/Done.
 * Android: opens the OS picker directly in "spinner" style (its own scrollable wheel), no sheet needed.
 */
export function BirthdayPicker({ label = 'Birthday', value, onChange, error }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? DEFAULT_DATE);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value ?? DEFAULT_DATE,
        mode: 'date',
        display: 'spinner',
        maximumDate: TODAY,
        minimumDate: MIN_DATE,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(date);
        }
      });
      return;
    }
    setDraft(value ?? DEFAULT_DATE);
    setSheetOpen(true);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[typography.caption, styles.label]} accessibilityElementsHidden>
        {label}
      </Text>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={label}>
        <GlassSurface
          tone="light"
          radius={radius.md}
          borderColor={error ? colors.danger : undefined}
          contentStyle={styles.row}
        >
          <Feather name="calendar" size={20} color={colors.textMuted} />
          <Text style={[typography.body, styles.value, !value && styles.placeholder]}>
            {value ? formatLongDate(value) : 'Select your birthday'}
          </Text>
          <Feather name="chevron-down" size={18} color={colors.textMuted} />
        </GlassSurface>
      </Pressable>
      {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

      {Platform.OS === 'ios' && (
        <GlassSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Select your birthday">
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            maximumDate={TODAY}
            minimumDate={MIN_DATE}
            onChange={(_, date) => date && setDraft(date)}
            style={styles.wheel}
            textColor={colors.ink}
          />
          <View style={styles.sheetActions}>
            <GlassButton
              label="Cancel"
              variant="secondary"
              size="md"
              style={styles.flex}
              onPress={() => setSheetOpen(false)}
            />
            <GlassButton
              label="Done"
              size="md"
              style={styles.flex}
              onPress={() => {
                onChange(draft);
                setSheetOpen(false);
              }}
            />
          </View>
        </GlassSheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: colors.textPrimary, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 56 },
  value: { flex: 1, color: colors.textPrimary },
  placeholder: { color: colors.textMuted },
  error: { color: colors.danger, fontSize: 13 },
  wheel: { height: 190, width: '100%' },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 4 },
  flex: { flex: 1 },
});
