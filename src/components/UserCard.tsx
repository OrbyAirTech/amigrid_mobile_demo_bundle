import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import type { UserItem } from '@/types/discovery';
import { GlassButton } from './GlassButton';
import { GlassSurface } from './GlassSurface';
import { Pill } from './Pill';

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}

type Props = { item: UserItem; onSendRequest?: (item: UserItem) => void; onPress?: (item: UserItem) => void };

export function UserCard({ item, onSendRequest, onPress }: Props) {
  return (
    <Pressable onPress={() => onPress?.(item)} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
    <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.row}>
      <Image source={{ uri: item.profile_pic_url }} style={styles.avatar} contentFit="cover" />

      <View style={styles.body}>
        <Text style={[typography.cardTitle, styles.name]} numberOfLines={1}>
          {item.display_name}
        </Text>
        <Text style={[typography.caption, styles.handle]} numberOfLines={1}>
          @{item.username}
          {item.distance_meters != null ? ` · ${formatDistance(item.distance_meters)}` : ''}
        </Text>
        {item.shared_space_count != null ? (
          <View style={styles.metaRow}>
            <Feather name="layers" size={12} color={colors.textMuted} />
            <Text style={[typography.caption, styles.meta]}>
              {item.shared_space_count} shared {item.shared_space_count === 1 ? 'space' : 'spaces'}
            </Text>
          </View>
        ) : item.bio ? (
          <Text style={[typography.caption, styles.meta]} numberOfLines={1}>
            {item.bio}
          </Text>
        ) : null}
      </View>

      <View style={styles.action}>
        {item.is_amigo || item.are_amigos ? (
          <Pill icon="check" label="Amigos" tone="success" />
        ) : item.request_sent ? (
          <Pill icon="clock" label="Requested" tone="muted" />
        ) : (
          <GlassButton
            label="Send Request"
            size="sm"
            variant="secondary"
            onPress={() => onSendRequest?.(item)}
            style={styles.requestBtn}
          />
        )}
      </View>
    </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm + 2, padding: spacing.sm + 2, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  body: { flex: 1, gap: 2 },
  name: { color: colors.textPrimary, ...typography.rowTitle },
  handle: { color: colors.textMuted, ...typography.rowMeta },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { color: colors.textMuted, ...typography.rowMeta },
  action: { alignItems: 'flex-end' },
  requestBtn: { minWidth: 88 },
});
