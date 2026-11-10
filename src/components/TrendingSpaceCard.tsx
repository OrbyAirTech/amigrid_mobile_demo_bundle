import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import type { TrendingSpace } from '@/types/trending';
import { GlassSurface } from './GlassSurface';
import { Pill } from './Pill';

type Props = { item: TrendingSpace; onPress?: (item: TrendingSpace) => void };

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

/** Fully-hydrated trending space card: banner, avatar, name, description, badges, participants. */
export function TrendingSpaceCard({ item, onPress }: Props) {
  return (
    <GlassSurface tone="light" radius={radius.lg} raised>
      <View>
        <View style={styles.bannerWrap}>
          {item.profile_banner_url ? (
            <Image source={{ uri: item.profile_banner_url }} style={styles.banner} contentFit="cover" />
          ) : (
            <View style={[styles.banner, styles.bannerFallback]} />
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            {item.profile_url ? (
              <Image source={{ uri: item.profile_url }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Feather name="users" size={18} color={colors.textMuted} />
              </View>
            )}
            <Text
              style={[typography.cardTitle, styles.name]}
              numberOfLines={1}
              onPress={() => onPress?.(item)}
            >
              {item.name}
            </Text>
          </View>

          {item.description ? (
            <Text style={[typography.cardBody, styles.description]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.badgeRow}>
            <Pill
              icon={item.visibility === 'public' ? 'globe' : 'eye-off'}
              label={item.visibility === 'public' ? 'Public' : 'Private'}
            />
            {item.is_explicit ? <Pill icon="alert-circle" label="Explicit" tone="muted" /> : null}
            <View style={styles.spacer} />
            <View style={styles.metaRow}>
              <Feather name="users" size={13} color={colors.textMuted} />
              <Text style={[typography.caption, styles.meta]}>{formatCount(item.participant_count)}</Text>
            </View>
          </View>
        </View>
      </View>
    </GlassSurface>
  );
}

const AVATAR = 32;

const styles = StyleSheet.create({
  bannerWrap: { height: 84, overflow: 'hidden', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  banner: { width: '100%', height: '100%' },
  bannerFallback: { backgroundColor: colors.iconTile },
  body: { padding: spacing.sm + 2, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  avatarFallback: { backgroundColor: colors.iconTile, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, color: colors.textPrimary, ...typography.rowTitle },
  description: { color: colors.textMuted, ...typography.rowMeta },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  spacer: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { color: colors.textMuted },
});
