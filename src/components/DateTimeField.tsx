import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '@/theme';

type Props = { label: string; value: Date; onChange: (d: Date) => void; minimumDate?: Date; maximumDate?: Date };

const fmt = (d: Date) =>
  `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

/**
 * A date and time in one row. iOS shows the system's compact date and time controls in the row. Android has no
 * combined picker, so tapping the row asks for the date and then the time.
 */
export function DateTimeField({ label, value, onChange, minimumDate, maximumDate }: Props) {
  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      minimumDate,
      maximumDate,
      onChange: (e, date) => {
        if (e.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onChange: (e2, time) => {
            if (e2.type !== 'set' || !time) return;
            const next = new Date(date);
            next.setHours(time.getHours(), time.getMinutes(), 0, 0);
            onChange(next);
          },
        });
      },
    });
  };

  return (
    <View style={styles.row}>
      <Text style={[typography.caption, styles.label]}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker value={value} mode="datetime" display="compact" minimumDate={minimumDate} maximumDate={maximumDate} onChange={(_, d) => d && onChange(d)} />
      ) : (
        <Pressable onPress={openAndroid} accessibilityRole="button" accessibilityLabel={`${label}: ${fmt(value)}`} style={styles.value}>
          <Text style={styles.valueText}>{fmt(value)}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(36,22,35,0.1)' },
  label: { color: colors.textMuted },
  value: { paddingVertical: 6 },
  valueText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
});
