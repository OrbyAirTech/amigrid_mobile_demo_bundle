import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { GlassSurface } from '@/components/GlassSurface';
import { BACKGROUNDS, ScreenBackground } from '@/components/ScreenBackground';
import { ApiError } from '@/data/api/client';
import { logout } from '@/data/authApi';
import { nextBackground } from '@/data/backgroundStore';
import { useBroadcasting } from '@/data/broadcastStore';
import { saveSettings, useMyProfile } from '@/data/currentUserStore';
import { deleteAccount, type AccountSettings } from '@/data/profileApi';
import { colors, fonts, radius, spacing, typography } from '@/theme';

function LinkRow({ icon, label, note, onPress, danger }: { icon: ComponentProps<typeof Feather>['name']; label: string; note?: string; onPress: () => void; danger?: boolean }) {
  const color = danger ? colors.danger : colors.ink;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <Feather name={icon} size={18} color={color} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[typography.cardBody, styles.rowLabel, { color }]}>{label}</Text>
        {note ? <Text style={[typography.caption, styles.note]}>{note}</Text> : null}
      </View>
      {!danger ? <Feather name="chevron-right" size={16} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

type BoolKey = Exclude<{ [K in keyof AccountSettings]: AccountSettings[K] extends boolean ? K : never }[keyof AccountSettings], 'two_factor_enabled' | 'broadcast_location'>;

const GROUPS: { title: string; items: { key: BoolKey; label: string; note?: string }[] }[] = [
  {
    title: 'PRIVACY',
    items: [
      { key: 'is_profile_public', label: 'Public profile', note: 'Anyone can open your profile' },
      { key: 'show_email', label: 'Show email on profile' },
      { key: 'show_phone', label: 'Show phone on profile' },
      { key: 'show_birthday', label: 'Show birthday on profile' },
    ],
  },
  {
    title: 'NOTIFICATIONS',
    items: [
      { key: 'notify_push', label: 'Push notifications' },
      { key: 'notify_email', label: 'Email notifications' },
      { key: 'notify_sms', label: 'SMS notifications' },
    ],
  },
  { title: 'SECURITY', items: [{ key: 'login_alerts', label: 'Login alerts', note: 'Get told when a new device signs in' }] },
];

/** Account settings: visibility, sign-in details, appearance, log out and account deletion. */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const broadcasting = useBroadcasting();
  const { settings } = useMyProfile();
  const [busy, setBusy] = useState(false);

  const change = async (patch: Parameters<typeof saveSettings>[0]) => {
    try {
      await saveSettings(patch);
    } catch (e) {
      Alert.alert('Couldn’t save that setting', e instanceof ApiError ? e.message : 'Please try again.');
    }
  };

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You’ll need to sign in again to use Amigrid.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);

  const confirmDelete = () =>
    Alert.alert('Delete your account?', 'Your account is scheduled for deletion and removed after 30 days. Signing in again before then cancels it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (busy) return;
          setBusy(true);
          try {
            await deleteAccount();
          } catch (e) {
            Alert.alert('Couldn’t delete account', e instanceof ApiError ? e.message : 'Please try again.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader title="Settings" fallback="/profile" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
        <Text style={[typography.caption, styles.section]}>VISIBILITY</Text>
        <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[typography.cardBody, styles.rowLabel, { color: colors.textPrimary }]}>Broadcast my location</Text>
              <Text style={[typography.caption, styles.note]}>Lets people nearby find you. Your exact spot is never shown.</Text>
            </View>
            <Switch
              value={broadcasting}
              onValueChange={(v) => change({ broadcast_location: v })}
              trackColor={{ false: 'rgba(110, 102, 112, 0.3)', true: colors.ink }}
              thumbColor={colors.white}
              accessibilityLabel="Broadcast my location"
            />
          </View>
        </GlassSurface>

        {settings
          ? GROUPS.map((g) => (
              <View key={g.title} style={{ gap: spacing.md }}>
                <Text style={[typography.caption, styles.section]}>{g.title}</Text>
                <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.card}>
                  {g.items.map((t, i) => (
                    <View key={t.key} style={[styles.row, i > 0 && styles.divider]}>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={[typography.cardBody, styles.rowLabel, { color: colors.textPrimary }]}>{t.label}</Text>
                        {t.note ? <Text style={[typography.caption, styles.note]}>{t.note}</Text> : null}
                      </View>
                      <Switch
                        value={settings[t.key]}
                        onValueChange={(v) => change({ [t.key]: v })}
                        trackColor={{ false: 'rgba(110, 102, 112, 0.3)', true: colors.ink }}
                        thumbColor={colors.white}
                        accessibilityLabel={t.label}
                      />
                    </View>
                  ))}
                </GlassSurface>
              </View>
            ))
          : null}

        <Text style={[typography.caption, styles.section]}>SIGN-IN</Text>
        <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.card}>
          <LinkRow icon="mail" label="Change email" onPress={() => router.push({ pathname: '/change-contact', params: { kind: 'email' } })} />
          <View style={styles.divider} />
          <LinkRow icon="phone" label="Change phone number" onPress={() => router.push({ pathname: '/change-contact', params: { kind: 'phone' } })} />
          <View style={styles.divider} />
          <LinkRow icon="lock" label="Change password" onPress={() => router.push('/change-password')} />
        </GlassSurface>

        <Text style={[typography.caption, styles.section]}>APPEARANCE</Text>
        <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.card}>
          <LinkRow icon="image" label="Switch background" onPress={() => nextBackground(BACKGROUNDS.length)} />
        </GlassSurface>

        <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.card}>
          <LinkRow icon="log-out" label="Log out" onPress={confirmLogout} danger />
          <View style={styles.divider} />
          <LinkRow icon="trash-2" label="Delete my account" onPress={confirmDelete} danger />
        </GlassSurface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  card: { paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: 11 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(36, 22, 35, 0.1)' },
  rowLabel: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  note: { color: colors.textMuted, ...typography.rowMeta },
  section: { color: colors.textMuted, letterSpacing: 0.6, fontFamily: fonts.semibold, paddingHorizontal: spacing.xs },
});
