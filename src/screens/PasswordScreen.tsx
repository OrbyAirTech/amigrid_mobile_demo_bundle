import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { GlassButton } from '@/components/GlassButton';
import { GlassIconButton } from '@/components/GlassIconButton';
import { PasswordInput } from '@/components/PasswordInput';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ApiError } from '@/data/api/client';
import { login } from '@/data/authApi';
import { colors, spacing, typography } from '@/theme';

export default function PasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  // Login continues into the location step, same as a fresh signup (it returns straight to the map when
  // location is already allowed).
  const onContinue = async () => {
    if (busy) return;
    if (!password) {
      setError('Enter your password.');
      return;
    }
    if (!email) {
      setError('Go back and enter your email first.');
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      await login(email, password);
      router.replace('/location');
    } catch (e) {
      // 401 is the server's answer to a wrong email/password.
      setError(e instanceof ApiError && e.status === 401 ? 'Wrong email or password.' : e instanceof ApiError ? e.message : 'Could not log in. Try again.');
    } finally {
      setBusy(false);
    }
  };
  const onForgotPassword = () => console.log('Forgot password for', email);

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
          ]}
        >
          <View style={styles.header}>
            <GlassIconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />
            <BrandMark size={40} />
            <View style={styles.headerSpacer} />
          </View>

          <Text style={[typography.title, styles.title]}>Welcome back</Text>
          <Text style={[typography.body, styles.subtitle]}>
            Enter the password for{' '}
            <Text style={{ fontFamily: typography.cardTitle.fontFamily }}>{email}</Text>
          </Text>

          <View style={styles.form}>
            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError(undefined);
              }}
              error={error}
              returnKeyType="go"
              onSubmitEditing={onContinue}
              autoFocus
            />
            <Text style={styles.forgot} onPress={onForgotPassword} accessibilityRole="button">
              Forgot password?
            </Text>
          </View>

          <View style={styles.spacer} />

          <GlassButton
            label={busy ? 'Logging in…' : 'Log In'}
            icon="arrow-right"
            disabled={busy}
            onPress={onContinue}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 44 },
  title: { color: colors.textPrimary, marginTop: 48 },
  subtitle: { color: colors.textMuted, marginTop: spacing.sm },
  form: { gap: spacing.md, marginTop: spacing.xl },
  forgot: {
    ...typography.cardBody,
    color: colors.textPrimary,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
  spacer: { flex: 1, minHeight: spacing.xl },
});
