import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

type Variant = 'icon' | 'startup' | 'web';

// PNGs, exported once from the brand SVGs (no build step). Light variants only for now; when dark mode lands,
// export the dark ones as icon-dark.png, splash-icon-dark.png and logo-web-dark.png and pick by theme here.
const LOGOS: Record<Variant, number> = {
  icon: require('../../assets/images/icon.png'),
  startup: require('../../assets/images/splash-icon.png'),
  web: require('../../assets/images/logo-web.png'),
};

type Props = {
  /** icon: the app icon artwork. startup: the splash logo. web: logo with the amigrid wordmark attached. */
  variant: Variant;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

/** One place that knows which brand image is used where. Give it a width and height through `style`. */
export function BrandLogo({ variant, style, accessibilityLabel = 'Amigrid' }: Props) {
  return <Image source={LOGOS[variant]} style={style} contentFit="contain" accessibilityLabel={accessibilityLabel} />;
}
