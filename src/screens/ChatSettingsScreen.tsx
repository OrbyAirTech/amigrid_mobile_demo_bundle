import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { GlassSurface } from '@/components/GlassSurface';
import { ScreenBackground } from '@/components/ScreenBackground';
import { SegmentedToggle } from '@/components/SegmentedToggle';
import { updateSettings, useChat } from '@/data/chatStore';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import type { ChatSettings, ThemePreference } from '@/types/chat';

type Bool = Exclude<keyof ChatSettings, 'theme_preference'>;

const TOGGLES: { key: Bool; label: string; note?: string }[] = [
  { key: 'show_message_preview', label: 'Message previews', note: 'Show message text in the chat list and notifications' },
  { key: 'mute_all_notifications', label: 'Mute all notifications' },
  { key: 'allow_read_receipts', label: 'Read receipts', note: 'Saved to your account. Not enforced by the server yet.' },
  { key: 'show_online_status', label: 'Online status', note: 'Saved to your account. Not enforced by the server yet.' },
];

function LinkRow({ icon, label, value, onPress, danger }: { icon: ComponentProps<typeof Feather>['name']; label: string; value?: string; onPress: () => void; danger?: boolean }) {
  const color = danger ? colors.danger : colors.ink;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <Feather name={icon} size={18} color={color} />
      <Text style={[typography.cardBody, styles.rowLabel, { color }]}>{label}</Text>
      {value ? <Text style={[typography.caption, styles.value]}>{value}</Text> : null}
      {!danger ? <Feather name="chevron-right" size={16} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

/** Chat settings: the five server settings, plus blocked / muted lists and deleting chat data. */
export default function ChatSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, blocked, muted } = useChat();

  const deleteData = () =>
    Alert.alert('Delete your chat data?', 'This removes your chat account, chats and messages from the chat server. It can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Are you sure?', 'This is permanent.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete everything', style: 'destructive', onPress: () => console.log('Delete chat data') },
          ]),
      },
    ]);

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader title="Chat settings" fallback="/map" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
        <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.card}>
          {TOGGLES.map((t, i) => (
            <View key={t.key} style={[styles.row, i > 0 && styles.divider]}>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[typography.cardBody, styles.rowLabel, { color: colors.textPrimary }]}>{t.label}</Text>
                {t.note ? <Text style={[typography.caption, styles.note]}>{t.note}</Text> : null}
              </View>
              <Switch
                value={settings[t.key]}
                onValueChange={(v) => updateSettings({ [t.key]: v })}
                trackColor={{ false: 'rgba(110, 102, 112, 0.3)', true: colors.ink }}
                thumbColor={colors.white}
                accessibilityLabel={t.label}
              />
            </View>
          ))}
        </GlassSurface>

        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.caption, styles.section]}>THEME</Text>
          <SegmentedToggle<ThemePreference>
            compact
            tone="light"
            segments={[
              { key: 'light', label: 'Light', icon: 'sun' },
              { key: 'dark', label: 'Dark', icon: 'moon' },
              { key: 'system', label: 'System', icon: 'smartphone' },
            ]}
            value={settings.theme_preference}
            onChange={(v) => updateSettings({ theme_preference: v })}
          />
          <Text style={[typography.caption, styles.note]}>Saved now. Applies once dark mode is added to the app.</Text>
        </View>

        <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.card}>
          <LinkRow icon="slash" label="Blocked users" value={String(blocked.length)} onPress={() => router.push({ pathname: '/chat-people', params: { kind: 'blocked' } })} />
          <View style={styles.divider} />
          <LinkRow icon="bell-off" label="Muted users" value={String(muted.length)} onPress={() => router.push({ pathname: '/chat-people', params: { kind: 'muted' } })} />
        </GlassSurface>

        <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.card}>
          <LinkRow icon="trash-2" label="Delete my chat data" danger onPress={deleteData} />
        </GlassSurface>

        <Text style={[typography.caption, styles.note, { textAlign: 'center' }]}>Chats and messages disappear 24 hours after they start.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  card: { paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: 11 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(36, 22, 35, 0.1)' },
  rowLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  note: { color: colors.textMuted, ...typography.rowMeta },
  value: { color: colors.textMuted, ...typography.rowMeta },
  section: { color: colors.textMuted, letterSpacing: 0.6, fontFamily: fonts.semibold, paddingHorizontal: spacing.xs },
});
