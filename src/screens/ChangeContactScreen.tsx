import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { GlassButton } from '@/components/GlassButton';
import { GlassInput } from '@/components/GlassInput';
import { OtpInput } from '@/components/OtpInput';
import { PasswordInput } from '@/components/PasswordInput';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ApiError } from '@/data/api/client';
import { refreshMyProfile } from '@/data/currentUserStore';
import { confirmContactChange, requestContactChange, type ContactKind } from '@/data/profileApi';
import { colors, spacing, typography } from '@/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

/** Change the account's email or phone: password + new value, then the code texted to the phone on file. */
export default function ChangeContactScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { kind: raw } = useLocalSearchParams<{ kind?: string }>();
  const kind: ContactKind = raw === 'phone' ? 'phone' : 'email';

  const [value, setValue] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const trimmed = value.trim();
  const valueError = kind === 'email' ? (EMAIL_RE.test(trimmed) ? '' : 'Enter a valid email') : PHONE_RE.test(trimmed) ? '' : 'Use international format, e.g. +233201234567';

  const send = async () => {
    setTouched(true);
    if (valueError || !password || busy) return;
    setBusy(true);
    setError('');
    try {
      setToken(await requestContactChange(kind, trimmed, password));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (c: string) => {
    if (!token || busy) return;
    setBusy(true);
    setError('');
    try {
      await confirmContactChange(c, token);
      await refreshMyProfile();
      Alert.alert(kind === 'email' ? 'Email updated' : 'Phone number updated', undefined, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      setCode('');
      setError(e instanceof ApiError ? e.message : 'That code didn’t work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader title={kind === 'email' ? 'Change email' : 'Change phone number'} fallback="/profile" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
          {token ? (
            <>
              <Text style={[typography.cardBody, styles.lead]}>Enter the 5-digit code we texted to the phone number on your account.</Text>
              <OtpInput value={code} onChange={setCode} onComplete={confirm} error={error || undefined} />
            </>
          ) : (
            <>
              <Text style={[typography.cardBody, styles.lead]}>
                Confirm your password, then we’ll text a code to the phone number on your account. Other signed-in devices must be logged out first.
              </Text>
              <GlassInput
                label={kind === 'email' ? 'New email' : 'New phone number'}
                icon={kind === 'email' ? 'mail' : 'phone'}
                value={value}
                onChangeText={setValue}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={kind === 'email' ? 'email-address' : 'phone-pad'}
                error={touched ? valueError : undefined}
              />
              <PasswordInput label="Current password" value={password} onChangeText={setPassword} error={touched && !password ? 'Enter your password' : undefined} />
              {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
              <GlassButton label={busy ? 'Sending…' : 'Send code'} variant="dark" size="md" disabled={busy} onPress={send} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  lead: { color: colors.textMuted },
  error: { color: colors.danger },
});
