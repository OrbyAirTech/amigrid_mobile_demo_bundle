import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import type { AppNotification } from '@/types/notification';
import { timeAgo } from '@/utils/time';
import { Avatar } from './Avatar';
import { GlassSurface } from './GlassSurface';

type Props = { item: AppNotification; onOpen: (item: AppNotification) => void };

/**
 * One notification. The backend sends no action (accept / view wallet…), so the whole row, plus the arrow on
 * the right, opens it: the caller uses `item.ref.ref_id` to fetch the real thing. Unread rows are
 * tinted (primary glass) and carry a dot.
 */
export function NotificationRow({ item, onOpen }: Props) {
  const unread = !item.isRead;
  return (
    <Pressable
      onPress={() => onOpen(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.user.display_name}: ${item.message}`}
      accessibilityState={{ selected: unread }}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <GlassSurface tone={unread ? 'primary' : 'light'} radius={radius.lg} contentStyle={styles.row}>
        <View>
          <Avatar uri={item.user.profile_pic_url} name={item.user.display_name} size={44} />
          {unread ? <View style={styles.dot} /> : null}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text
              style={[typography.cardBody, styles.name, unread && styles.nameUnread]}
              numberOfLines={1}
            >
              {item.user.display_name}
            </Text>
            <Text style={[typography.caption, styles.time]}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={[typography.cardBody, styles.message]} numberOfLines={2}>
            {item.message}
          </Text>
        </View>

        <View style={styles.arrow}>
          <Feather name="arrow-right" size={16} color={colors.ink} />
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  dot: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.white,
  },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  name: { flex: 1, color: colors.textPrimary, fontFamily: typography.cardTitle.fontFamily },
  nameUnread: { fontFamily: typography.cardTitle.fontFamily },
  time: { color: colors.textMuted },
  message: { color: colors.textMuted },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.iconTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
