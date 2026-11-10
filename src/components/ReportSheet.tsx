import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/data/api/client';
import { reportGrid, reportUser, USER_REASONS, type UserReason } from '@/data/safetyApi';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import { GlassButton } from './GlassButton';
import { GlassSheet } from './GlassSheet';

const GRID_REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'Scam', 'Something else'];

type Props = {
  visible: boolean;
  onClose: () => void;
  kind: 'user' | 'grid';
  targetId: string;
  targetName: string;
};

/** Pick a reason, add a line if you want, send. Used for people and for grids. */
export function ReportSheet({ visible, onClose, kind, targetId, targetName }: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const options = kind === 'user' ? USER_REASONS.map((r) => ({ key: r.key as string, label: r.label })) : GRID_REASONS.map((r) => ({ key: r, label: r }));

  const close = () => {
    setReason(null);
    setDetails('');
    onClose();
  };

  const send = async () => {
    if (!reason || busy) return;
    setBusy(true);
    try {
      if (kind === 'user') await reportUser(targetId, reason as UserReason, details);
      else await reportGrid(targetId, targetName, reason, details);
      close();
      Alert.alert('Report sent', 'Thanks for telling us. We’ll look into it.');
    } catch (e) {
      Alert.alert('Couldn’t send report', e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassSheet visible={visible} onClose={close} title={`Report ${targetName}`}>
      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[typography.caption, styles.hint]}>What’s wrong?</Text>
        <View style={styles.chips}>
          {options.map((o) => (
            <Pressable
              key={o.key}
              onPress={() => setReason(o.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: reason === o.key }}
              style={[styles.chip, reason === o.key && styles.chipOn]}
            >
              <Text style={[styles.chipText, reason === o.key && styles.chipTextOn]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={details}
          onChangeText={setDetails}
          placeholder="Anything else we should know? (optional)"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1500}
          style={styles.input}
          accessibilityLabel="Details"
        />
        <GlassButton label={busy ? 'Sending…' : 'Send report'} variant="dark" size="md" disabled={!reason || busy} onPress={send} />
      </ScrollView>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  body: { maxHeight: 420 },
  hint: { color: colors.textMuted, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(36,22,35,0.1)' },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  chipTextOn: { color: colors.white },
  input: { minHeight: 64, maxHeight: 110, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(36,22,35,0.1)', color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, textAlignVertical: 'top', marginBottom: spacing.md },
});
