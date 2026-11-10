import { View } from 'react-native';

import { BrandLogo } from './BrandLogo';

/** The app icon artwork, reused on auth and onboarding headers at smaller sizes. */
export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size * 0.22, overflow: 'hidden' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <BrandLogo variant="icon" style={{ width: size, height: size }} />
    </View>
  );
}
