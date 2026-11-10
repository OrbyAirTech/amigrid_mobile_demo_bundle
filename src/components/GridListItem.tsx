import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import type { SpaceListSkeleton } from '@/types/feed';
import { formatCount } from '@/utils/time';
import { Avatar } from './Avatar';
import { GlassSurface } from './GlassSurface';
import { GlassButton } from './GlassButton';
import { Pill } from './Pill';

const ACCESS: Record<string, { label: string; icon: keyof typeof Feather.glyphMap }> = {
  open: { label: 'Open', icon: 'unlock' },
  invite_only: { label: 'Invite Only', icon: 'mail' },
  approval_required: { label: 'Approval Required', icon: 'clock' },
  closed: { label: 'Closed', icon: 'lock' },
  secure: { label: 'Secure', icon: 'shield' },
};

type Props = {
  item: SpaceListSkeleton;
  onPress?: (item: SpaceListSkeleton) => void;
  /** When given, a small "Join Grid" button replaces the chevron. */
  onJoin?: (item: SpaceListSkeleton) => void;
  joined?: boolean;
};

/** A row in the Grid Feed list. Tap to open that grid's feed. */
export function GridListItem({ item, onPress, onJoin, joined = false }: Props) {
  const access = ACCESS[item.access_mode] ?? { label: item.access_mode, icon: 'lock' as const };
  return (
    <Pressable onPress={() => onPress?.(item)} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
      <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.row}>
        <Avatar uri={item.profile_url} name={item.name} size={44} />
        <View style={styles.body}>
          <Text style={[typography.cardTitle, styles.name]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={[typography.cardBody, styles.desc]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.meta}>
            {item.access_mode ? <Pill icon={access.icon} label={access.label} /> : null}
            {item.participant_count != null ? (
              <View style={styles.count}>
                <Feather name="users" size={13} color={colors.textMuted} />
                <Text style={[typography.caption, { color: colors.textMuted }]}>{formatCount(item.participant_count)}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {onJoin ? (
          joined ? (
            <Pill icon="check" label="Joined" tone="success" />
          ) : (
            <GlassButton label="Join Grid" size="sm" variant="secondary" onPress={() => onJoin(item)} />
          )
        ) : (
          <Feather name="chevron-right" size={18} color={colors.textMuted} />
        )}
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, padding: spacing.sm + 2 },
  body: { flex: 1, gap: 3 },
  name: { color: colors.textPrimary, ...typography.rowTitle },
  desc: { color: colors.textMuted, ...typography.rowMeta },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  count: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
