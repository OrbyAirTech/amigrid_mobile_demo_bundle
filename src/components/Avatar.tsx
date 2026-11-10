import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

type Props = { uri?: string | null; name: string; size?: number; ring?: boolean };

/**
 * Round avatar. Always renders a circle: a tinted tile with the name's initial sits behind the
 * image, so a missing or failed image still shows a profile icon instead of an empty gap.
 */
export function Avatar({ uri, name, size = 44, ring = false }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = !!uri && !failed;
  const box = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.circle, box, ring && styles.ring]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>
      {showImage ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onError={() => setFailed(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: colors.iconTile, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ring: { borderWidth: 2, borderColor: colors.white },
  initial: { color: colors.ink, fontFamily: fonts.bold },
});
