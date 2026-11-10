import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/theme';

type Tone = 'neutral' | 'success' | 'muted';

type Props = {
  icon?: ComponentProps<typeof Feather>['name'];
  label: string;
  tone?: Tone;
};

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: 'rgba(219, 217, 219, 0.6)', fg: colors.ink },
  success: { bg: 'rgba(58, 138, 92, 0.16)', fg: '#2F6B48' },
  muted: { bg: 'rgba(110, 102, 112, 0.14)', fg: colors.textMuted },
};

/** Small status chip, e.g. "Member", "Amigos", "Open Now", "Closed". */
export function Pill({ icon, label, tone = 'neutral' }: Props) {
  const t = TONE_STYLES[tone];
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }]}>
      {icon ? <Feather name={icon} size={11} color={t.fg} /> : null}
      <Text style={[typography.caption, styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  text: { fontSize: 11, lineHeight: 15 },
});
