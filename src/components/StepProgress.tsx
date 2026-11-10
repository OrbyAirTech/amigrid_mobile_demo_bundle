import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

type Props = {
  total: number;
  /** 0-based index of the current step. */
  current: number;
  /** segments = equal bars (auth flow). dots = long active pill + small dots (onboarding). */
  variant?: 'segments' | 'dots';
};

/** Progress indicator for multi-step flows. */
export function StepProgress({ total, current, variant = 'segments' }: Props) {
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const active = variant === 'dots' ? i === current : i <= current;
        return (
          <View
            key={i}
            style={[
              variant === 'dots' ? (i === current ? styles.pill : styles.dot) : styles.seg,
              active ? styles.active : styles.inactive,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seg: { height: 4, width: 28, borderRadius: 2 },
  pill: { height: 6, width: 36, borderRadius: 3 },
  dot: { height: 6, width: 6, borderRadius: 3 },
  active: { backgroundColor: colors.ink },
  inactive: { backgroundColor: 'rgba(36, 22, 35, 0.16)' },
});
