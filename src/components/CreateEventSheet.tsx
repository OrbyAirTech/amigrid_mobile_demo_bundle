import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/data/api/client';
import { createEvent } from '@/data/eventsApi';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import { DateTimeField } from './DateTimeField';
import { GlassButton } from './GlassButton';
import { GlassSheet } from './GlassSheet';

const HOUR = 3_600_000;
const nextHour = () => {
  const d = new Date(Date.now() + HOUR);
  d.setMinutes(0, 0, 0);
  return d;
};

type Props = { visible: boolean; onClose: () => void; spaceId: string; gridName: string; onCreated: () => void };

/** Owner and admins only (the server refuses anyone else). The server also limits events to 7 days and 1 year ahead. */
export function CreateEventSheet({ visible, onClose, spaceId, gridName, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [starts, setStarts] = useState(nextHour);
  const [ends, setEnds] = useState(() => new Date(nextHour().getTime() + 2 * HOUR));
  const [busy, setBusy] = useState(false);

  // Catch what the server would refuse, so the message appears before a round trip.
  const problem = !title.trim()
    ? null
    : ends <= starts
      ? 'The end has to be after the start.'
      : ends.getTime() - starts.getTime() > 7 * 24 * HOUR
        ? 'An event can last 7 days at most.'
        : ends.getTime() < Date.now()
          ? 'That end time has already passed.'
          : starts.getTime() > Date.now() + 365 * 24 * HOUR
            ? 'Events can be planned up to a year ahead.'
            : null;

  const reset = () => {
    setTitle('');
    const s = nextHour();
    setStarts(s);
    setEnds(new Date(s.getTime() + 2 * HOUR));
  };

  const create = async () => {
    if (!title.trim() || problem || busy) return;
    setBusy(true);
    try {
      await createEvent(spaceId, title.trim(), starts, ends);
      reset();
      onClose();
      onCreated();
    } catch (e) {
      Alert.alert('Couldn’t create the event', e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassSheet visible={visible} onClose={onClose} title={`New event in ${gridName}`}>
      <View style={styles.body}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Event title"
          placeholderTextColor={colors.textMuted}
          maxLength={120}
          style={styles.input}
          accessibilityLabel="Event title"
        />
        <DateTimeField
          label="Starts"
          value={starts}
          onChange={(d) => {
            // Keep the length when the start moves.
            setEnds(new Date(d.getTime() + (ends.getTime() - starts.getTime())));
            setStarts(d);
          }}
        />
        <DateTimeField label="Ends" value={ends} onChange={setEnds} />
        {problem ? <Text style={[typography.caption, styles.problem]}>{problem}</Text> : null}
        <GlassButton label={busy ? 'Creating…' : 'Create event'} variant="dark" size="md" disabled={!title.trim() || !!problem || busy} onPress={create} />
      </View>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm + 2 },
  input: { height: 44, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(36,22,35,0.1)', color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 14 },
  problem: { color: colors.danger },
});
