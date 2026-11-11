import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useBackgroundIndex } from '@/data/backgroundStore';
import { colors } from '@/theme';

/**
 * Add background images here, one `require` per file (portrait, soft light tones work best with the glass).
 * "Switch background" in the profile menu cycles through this list in order.
 */
export const BACKGROUNDS = [
  require('../../assets/images/neumorphic-bg.jpg'),
  require('../../assets/images/neumorphic2-bg.png'),
];

/**
 * Neumorphic backdrop on the app's background colour. Glass reads against it through its edge, sheen and
 * shadow, so every screen should still sit on this. The base colour shows while the image decodes.
 */
export function ScreenBackground() {
  const index = useBackgroundIndex();
  const source = BACKGROUNDS[index % BACKGROUNDS.length];
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} pointerEvents="none">
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="right center" />
    </View>
  );
}
