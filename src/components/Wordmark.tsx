import { StyleProp, Text, TextStyle } from 'react-native';

import { colors, fonts } from '@/theme';

type Props = {
  /** Font size in px. Letter spacing is -0.02em of it, as the typography strategy asks. */
  size?: number;
  style?: StyleProp<TextStyle>;
};

/**
 * The platform name as text, set in the brand typography strategy:
 *   "ami"  Plus Jakarta Sans Medium (500), muted plum-slate #6E6670: social warmth and accessibility
 *   "grid" Plus Jakarta Sans Bold (700), ink #241623: the solid infrastructure
 *   tracking -0.02em
 * Use it wherever the name is written out in the UI. It is a <Text>, so it also nests inside a sentence.
 */
export function Wordmark({ size = 20, style }: Props) {
  return (
    <Text
      accessibilityLabel="Amigrid"
      style={[{ fontSize: size, lineHeight: Math.round(size * 1.3), letterSpacing: size * -0.02 }, style]}
    >
      <Text style={{ fontFamily: fonts.medium, color: colors.textMuted }}>ami</Text>
      <Text style={{ fontFamily: fonts.bold, color: colors.ink }}>grid</Text>
    </Text>
  );
}
