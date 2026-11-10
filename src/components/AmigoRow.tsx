import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import type { AmigoUser } from '@/types/grid';
import { Avatar } from './Avatar';
import { GlassSurface } from './GlassSurface';

type Props = {
  user: AmigoUser;
  /** Small element after the username (e.g. an Admin pill). */
  badge?: ReactNode;
  /** Trailing action (a button, a menu icon). */
  right?: ReactNode;
  onPress?: (user: AmigoUser) => void;
};

/** A person row: avatar, username, one-line bio, optional badge and trailing action. */
export function AmigoRow({ user, badge, right, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress?.(user)}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={user.username}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.row}>
        <Avatar uri={user.profile_pic_url} name={user.username} size={44} />
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={[typography.cardTitle, styles.name]} numberOfLines={1}>
              {user.username}
            </Text>
            {badge}
          </View>
          {user.bio ? (
            <Text style={[typography.caption, styles.bio]} numberOfLines={1}>
              {user.bio}
            </Text>
          ) : null}
        </View>
        {right}
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, padding: spacing.sm + 2 },
  body: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.textPrimary, ...typography.rowTitle, flexShrink: 1 },
  bio: { color: colors.textMuted, ...typography.rowMeta },
});
