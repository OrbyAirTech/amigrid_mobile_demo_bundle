import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '@/theme';
import type { GrandFinalEvent } from '@/types/events';
import { dateTile, formatClock, parseTime, startsIn } from '@/utils/dateFormat';
import { timeAgo } from '@/utils/time';
import { Avatar } from './Avatar';
import { GlassSurface } from './GlassSurface';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function duration(start: number, end: number): string {
  const min = Math.max(0, Math.round((end - start) / 60_000));
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

type Props = { item: GrandFinalEvent; onPress?: (item: GrandFinalEvent) => void };

/**
 * One event. Top: date tile, title, time range and duration, live / starts-in tag. Bottom, side by side:
 * the hosting grid (profile picture, name, blurb) and the event's creator (larger picture, name, handle).
 * The event creator is a different person from the grid's creator. Tap opens the grid's profile.
 */
export function EventRow({ item, onPress }: Props) {
  const { event_details: e, space_details: s, creator_details: c } = item;
  const start = parseTime(e.starts_at);
  const end = parseTime(e.ends_at);
  const now = Date.now();
  const live = start <= now && now < end;
  const soon = startsIn(start, now);
  const tile = dateTile(start);

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      accessibilityRole="button"
      accessibilityLabel={`${e.title}, ${s.space_name}, hosted by ${c.creator_display_name}`}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.card}>
        <View style={styles.top}>
          <View style={styles.tile}>
            <Text style={styles.month}>{tile.month}</Text>
            <Text style={styles.day}>{tile.day}</Text>
          </View>
          <View style={styles.topBody}>
            <Text style={[typography.cardTitle, styles.title]} numberOfLines={1}>
              {e.title}
            </Text>
            <View style={styles.line}>
              <Feather name="clock" size={12} color={colors.textMuted} />
              <Text style={[typography.caption, styles.meta]} numberOfLines={1}>
                {formatClock(start)} – {formatClock(end)} · {duration(start, end)}
              </Text>
            </View>
          </View>
          {live ? (
            <View style={styles.liveBadge}>
              <View style={styles.dot} />
              <Text style={styles.liveText}>Live now</Text>
            </View>
          ) : soon ? (
            <Text style={[typography.caption, styles.soon]}>{soon}</Text>
          ) : null}
        </View>

        <View style={styles.people}>
          <View style={styles.person}>
            <Avatar uri={s.space_profile_url} name={s.space_name} size={40} />
            <View style={styles.personText}>
              <Text style={[typography.caption, styles.label]}>GRID</Text>
              <Text style={[typography.cardTitle, styles.personName]} numberOfLines={1}>
                {s.space_name}
              </Text>
              <Text style={[typography.caption, styles.meta]} numberOfLines={1}>
                {cap(s.space_type)} · {cap(s.visibility)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.person}>
            <Avatar uri={c.creator_profile_pic_url} name={c.creator_display_name} size={40} ring />
            <View style={styles.personText}>
              <Text style={[typography.caption, styles.label]}>HOSTED BY</Text>
              <Text style={[typography.cardTitle, styles.personName]} numberOfLines={1}>
                {c.creator_display_name}
              </Text>
              <Text style={[typography.caption, styles.meta]} numberOfLines={1}>
                @{c.creator_username}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[typography.caption, styles.posted]}>Posted {timeAgo(e.created_at)}</Text>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.sm + 2, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  tile: { width: 44, height: 48, borderRadius: radius.sm, backgroundColor: colors.iconTile, alignItems: 'center', justifyContent: 'center' },
  month: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 10, lineHeight: 12, letterSpacing: 0.6 },
  day: { color: colors.textPrimary, fontFamily: fonts.extrabold, fontSize: 18, lineHeight: 22 },
  topBody: { flex: 1, gap: 3 },
  title: { color: colors.textPrimary, ...typography.rowTitle },
  line: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { color: colors.textMuted, ...typography.rowMeta, flexShrink: 1 },
  soon: { color: colors.ink, ...typography.rowMeta, fontFamily: fonts.semibold },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: 'rgba(249, 128, 128, 0.16)' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },
  liveText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
  people: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(36, 22, 35, 0.1)',
  },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  personText: { flex: 1, gap: 1 },
  label: { color: colors.textMuted, fontSize: 10, lineHeight: 13, letterSpacing: 0.6, fontFamily: fonts.semibold },
  personName: { color: colors.textPrimary, ...typography.rowTitle },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(36, 22, 35, 0.1)' },
  posted: { color: colors.textMuted, fontSize: 11, lineHeight: 14 },
});
