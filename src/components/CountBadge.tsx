import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

/** Small count bubble pinned to the top-right of its (relatively positioned) parent. Hidden at 0. */
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <View style={styles.badge} pointerEvents="none">
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: colors.white, fontFamily: fonts.bold, fontSize: 11, lineHeight: 14 },
});
