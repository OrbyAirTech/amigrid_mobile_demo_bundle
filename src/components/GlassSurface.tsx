import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useContext, type ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { glass, radius as radii, type GlassTone } from '@/theme';

const FlatGlassContext = createContext(false);
/**
 * Inside this provider GlassSurface skips its own BlurView (tint + sheen only). Use it for content that
 * already sits on a blurred surface (e.g. cards inside the discovery sheet): dozens of stacked live blurs
 * are the most expensive thing on screen and add nothing visually there.
 */
export const FlatGlassProvider = FlatGlassContext.Provider;

type Props = {
  tone?: GlassTone;
  radius?: number;
  /** Adds a soft drop shadow (iOS). */
  raised?: boolean;
  /** Override the glass edge colour (e.g. for a focused input). */
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * The one glass primitive. Buttons, cards, inputs, sheets and tab bars all build on this
 * so the look stays consistent across screens.
 * Note: on Android, BlurView renders a translucent tint (no live blur) unless a blur target is set up.
 */
export function GlassSurface({
  tone = 'light',
  radius = radii.lg,
  raised = false,
  borderColor,
  style,
  contentStyle,
  children,
}: Props) {
  const g = glass[tone];
  const flat = useContext(FlatGlassContext);

  return (
    <View style={[{ borderRadius: radius }, raised && g.shadow, style]}>
      <View style={[styles.clip, { borderRadius: radius, borderColor: borderColor ?? g.border }]}>
        {flat ? null : <BlurView intensity={g.blur} tint={g.tint} style={StyleSheet.absoluteFill} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: g.fill }]} />
        <LinearGradient
          colors={g.sheen}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={contentStyle}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    borderWidth: 1,
  },
});
