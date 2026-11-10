import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { GlassButton } from '@/components/GlassButton';
import { OtpInput } from '@/components/OtpInput';
import { PasswordInput } from '@/components/PasswordInput';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ApiError } from '@/data/api/client';
import { finishPasswordChange, startPasswordChange, verifyPasswordCode } from '@/data/profileApi';
import { colors, spacing, typography } from '@/theme';

type Step = 'code' | 'password';

/** Change password while signed in: a code is emailed, then the new password is set. */
export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const started = useRef(false);

  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  // The code is emailed as soon as the screen opens.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startPasswordChange()
      .then((t) => {
        tokenRef.current = t;
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not send the code. Please try again.'))
      .finally(() => setBusy(false));
  }, []);

  const verify = async (c: string) => {
    if (!tokenRef.current || busy) return;
    setBusy(true);
    setError('');
    try {
      await verifyPasswordCode(c, tokenRef.current);
      setStep('password');
    } catch (e) {
      setCode('');
      setError(e instanceof ApiError ? e.message : 'That code didn’t work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const passwordError = password.length < 8 ? 'Use at least 8 characters' : '';
  const confirmError = confirm !== password ? 'Passwords don’t match' : '';

  const save = async () => {
    setTouched(true);
    if (passwordError || confirmError || !tokenRef.current || busy) return;
    setBusy(true);
    setError('');
    try {
      await finishPasswordChange(password, tokenRef.current);
      Alert.alert('Password updated', undefined, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader title="Change password" fallback="/profile" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
          {step === 'code' ? (
            <>
              <Text style={[typography.cardBody, styles.lead]}>We emailed a 5-digit code to your account email. Enter it to continue.</Text>
              <OtpInput value={code} onChange={setCode} onComplete={verify} error={error || undefined} />
            </>
          ) : (
            <>
              <PasswordInput label="New password" value={password} onChangeText={setPassword} error={touched ? passwordError : undefined} />
              <PasswordInput label="Confirm new password" value={confirm} onChangeText={setConfirm} error={touched ? confirmError : undefined} />
              {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
              <GlassButton label={busy ? 'Saving…' : 'Update password'} variant="dark" size="md" disabled={busy} onPress={save} />
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
