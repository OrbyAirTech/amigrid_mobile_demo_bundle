import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/data/api/client';
import { deleteEvent, fetchGridEvents, type GridEvent } from '@/data/eventsApi';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import { dateTile, formatClock, parseTime } from '@/utils/dateFormat';
import { GlassButton } from './GlassButton';

type Props = { spaceId: string; canManage: boolean; onCreate: () => void; reloadKey: number };

/** A grid's coming events on its profile. Owner and admins can add events and remove them. Nothing shows for a grid you can't see into. */
export function GridEventsSection({ spaceId, canManage, onCreate, reloadKey }: Props) {
  const [events, setEvents] = useState<GridEvent[] | null>(null);

  const load = useCallback(async () => {
    try {
      setEvents(await fetchGridEvents(spaceId, 'upcoming', 0));
    } catch (e) {
      // Private grids only show events to members; anything else reads as "none".
      setEvents(e instanceof ApiError && [403, 404, 409].includes(e.status) ? [] : null);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const remove = (ev: GridEvent) =>
    Alert.alert('Delete this event?', ev.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent(ev.event_id);
            setEvents((cur) => cur?.filter((x) => x.event_id !== ev.event_id) ?? cur);
          } catch (e) {
            Alert.alert('Couldn’t delete the event', e instanceof ApiError ? e.message : 'Try again.');
          }
        },
      },
    ]);

  if (events === null || (events.length === 0 && !canManage)) return null;

  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <Text style={[typography.cardTitle, styles.heading]}>Upcoming events</Text>
        {canManage ? <GlassButton label="New event" size="sm" variant="secondary" icon="plus" onPress={onCreate} /> : null}
      </View>
      {events.length === 0 ? <Text style={[typography.caption, styles.muted]}>No events planned yet.</Text> : null}
      {events.map((ev) => {
        const t = dateTile(parseTime(ev.starts_at));
        return (
          <View key={ev.event_id} style={styles.row}>
            <View style={styles.tile}>
              <Text style={styles.tileMonth}>{t.month}</Text>
              <Text style={styles.tileDay}>{t.day}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.rowTitle, styles.title]} numberOfLines={1}>{ev.title}</Text>
              <Text style={[typography.rowMeta, styles.muted]} numberOfLines={1}>
                {formatClock(parseTime(ev.starts_at))} to {formatClock(parseTime(ev.ends_at))}{ev.is_live ? ' · Live now' : ''}
              </Text>
            </View>
            {canManage ? (
              <Pressable onPress={() => remove(ev)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${ev.title}`}>
                <Feather name="trash-2" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { color: colors.textPrimary },
  muted: { color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: 4 },
  tile: { width: 40, height: 44, borderRadius: radius.sm, backgroundColor: colors.iconTile, alignItems: 'center', justifyContent: 'center' },
  tileMonth: { color: colors.ink, fontFamily: fonts.bold, fontSize: 9, lineHeight: 11, letterSpacing: 0.5 },
  tileDay: { color: colors.ink, fontFamily: fonts.bold, fontSize: 16, lineHeight: 19 },
  title: { color: colors.textPrimary },
});
