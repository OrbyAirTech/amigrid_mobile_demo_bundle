import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '@/theme';
import type { SpaceInitials } from '@/types/live';
import { Avatar } from './Avatar';
import { GlassSurface } from './GlassSurface';
import { Pill } from './Pill';

const TYPE_ICON = { event: 'calendar', campus: 'book-open', organization: 'briefcase', custom: 'hash' } as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Props = { item: SpaceInitials; onPress?: (item: SpaceInitials) => void };

/**
 * One live grid, laid out like the trending grid card: banner on top (with the live count over it),
 * then the profile picture, name, one-line blurb and type / visibility pills.
 */
export function LiveGridRow({ item, onPress }: Props) {
  const icon = TYPE_ICON[item.type as keyof typeof TYPE_ICON] ?? 'hash';
  return (
    <Pressable
      onPress={() => onPress?.(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.live_stream_count} live`}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <GlassSurface tone="light" radius={radius.lg} raised>
        <View>
          <View style={styles.bannerWrap}>
            {item.profile_banner_url ? (
              <Image source={{ uri: item.profile_banner_url }} style={styles.banner} contentFit="cover" />
            ) : (
              <View style={[styles.banner, styles.bannerFallback]} />
            )}
            <View style={styles.live}>
              <View style={styles.dot} />
              <Text style={styles.liveText}>{item.live_stream_count} live</Text>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Avatar uri={item.profile_url} name={item.name} size={32} />
              <Text style={[typography.cardTitle, styles.name]} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            <Text style={[typography.cardBody, styles.desc]} numberOfLines={1}>
              {item.description}
            </Text>
            <View style={styles.pills}>
              <Pill icon={icon} label={cap(item.type)} />
              <Pill icon={item.visibility === 'public' ? 'globe' : 'eye-off'} label={cap(item.visibility)} />
              {item.is_system_generated ? <Pill icon="check-circle" label="Official" tone="success" /> : null}
            </View>
          </View>
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bannerWrap: { height: 84, overflow: 'hidden', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  banner: { width: '100%', height: '100%' },
  bannerFallback: { backgroundColor: colors.iconTile },
  live: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(36, 22, 35, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  liveText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
  body: { padding: spacing.sm + 2, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, color: colors.textPrimary, ...typography.rowTitle },
  desc: { color: colors.textMuted, ...typography.rowMeta },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
});
