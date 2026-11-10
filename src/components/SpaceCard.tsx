import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import type { SpaceItem } from '@/types/discovery';
import { GlassButton } from './GlassButton';
import { GlassSurface } from './GlassSurface';
import { Pill } from './Pill';

const ACCESS_LABEL: Record<SpaceItem['access_mode'], string> = {
  open: 'Open',
  closed: 'Closed',
  secure: 'Join Code',
  invite_only: 'Invite Only',
  approval_required: 'Approval Required',
};
const ACCESS_ICON: Record<SpaceItem['access_mode'], keyof typeof Feather.glyphMap> = {
  open: 'unlock',
  closed: 'lock',
  secure: 'key',
  invite_only: 'mail',
  approval_required: 'clock',
};

type Props = { item: SpaceItem; onJoin?: (item: SpaceItem) => void; onPress?: (item: SpaceItem) => void };

export function SpaceCard({ item, onJoin, onPress }: Props) {
  return (
    <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.row}>
      <Image source={{ uri: item.profile_url }} style={styles.thumb} contentFit="cover" />

      <View style={styles.body}>
        <Text style={[typography.cardTitle, styles.name]} numberOfLines={1} onPress={() => onPress?.(item)}>
          {item.name}
        </Text>

        <View style={styles.badgeRow}>
          <Pill
            icon={item.visibility === 'public' ? 'globe' : 'eye-off'}
            label={item.visibility === 'public' ? 'Public' : 'Private'}
          />
          <Pill icon={ACCESS_ICON[item.access_mode] ?? 'lock'} label={ACCESS_LABEL[item.access_mode] ?? item.access_mode} />
        </View>

        <View style={styles.metaRow}>
          <Feather name="users" size={12} color={colors.textMuted} />
          <Text style={[typography.caption, styles.meta]}>
            {item.neighbour_visit_count} {item.neighbour_visit_count === 1 ? 'neighbour visited' : 'neighbours visited'}
          </Text>
        </View>
      </View>

      <View style={styles.action}>
        {item.is_member ? (
          <Pill icon="check" label="Member" tone="success" />
        ) : item.access_mode === 'closed' ? (
          <Pill icon="lock" label="Closed" tone="muted" />
        ) : item.access_mode === 'secure' ? (
          // Needs a code from an admin, which is entered on the grid's own page.
          <GlassButton label="View" size="sm" variant="secondary" onPress={() => onPress?.(item)} style={styles.joinBtn} />
        ) : (
          <GlassButton label="Join" size="sm" onPress={() => onJoin?.(item)} style={styles.joinBtn} />
        )}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm + 2, padding: spacing.sm + 2, alignItems: 'center' },
  thumb: { width: 44, height: 44, borderRadius: radius.sm },
  body: { flex: 1, gap: 3 },
  name: { color: colors.textPrimary, ...typography.rowTitle },
  badgeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { color: colors.textMuted, ...typography.rowMeta },
  action: { alignItems: 'flex-end' },
  joinBtn: { minWidth: 64 },
});
