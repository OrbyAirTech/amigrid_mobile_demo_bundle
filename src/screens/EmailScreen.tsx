import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { GlassButton } from '@/components/GlassButton';
import { GlassIconButton } from '@/components/GlassIconButton';
import { GlassInput } from '@/components/GlassInput';
import { ApiError } from '@/data/api/client';
import { startEmailVerification } from '@/data/authApi';
import { signupFlow } from '@/data/signupFlow';
import { ScreenBackground } from '@/components/ScreenBackground';
import { StepProgress } from '@/components/StepProgress';
import { colors, spacing, typography } from '@/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { flow } = useLocalSearchParams<{ flow?: string }>();
  const isLogin = flow === 'login';
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const valid = EMAIL_RE.test(email.trim());

  // Login goes straight to a password. Signup emails a verification code first.
  const onContinue = async () => {
    if (busy) return;
    const trimmed = email.trim();
    if (isLogin) {
      router.push({ pathname: '/password', params: { email: trimmed } });
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      signupFlow.reset();
      signupFlow.setVerifyToken(await startEmailVerification(trimmed));
      router.push({ pathname: '/verify', params: { email: trimmed } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send the code. Try again.');
    } finally {
      setBusy(false);
    }
  };
  const onGoogle = () => console.log('Google sign-in');
  const onApple = () => console.log('Apple sign-in');
  const onTerms = () => console.log('Terms of Service');
  const onPrivacy = () => console.log('Privacy Policy');

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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

          <View style={styles.progress}>
            <StepProgress total={3} current={0} />
          </View>

          <Text style={[typography.body, styles.intro]}>
            {isLogin
              ? 'Welcome back. Enter your email to continue.'
              : 'Enter your email to start your geo-social journey.'}
          </Text>

          <View style={styles.form}>
            <GlassInput
              label="Email Address"
              icon="mail"
              placeholder="name@example.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError(undefined);
              }}
              error={error}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              textContentType="emailAddress"
              returnKeyType="go"
              onSubmitEditing={() => valid && onContinue()}
            />
            <GlassButton label={busy ? 'Sending code…' : 'Continue'} icon="arrow-right" disabled={!valid || busy} onPress={onContinue} />
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={[typography.caption, styles.dividerText]}>OR CONTINUE WITH</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.socialRow}>
            <GlassButton
              label="Google"
              variant="secondary"
              size="md"
              style={styles.flex}
              onPress={onGoogle}
              leading={<Ionicons name="logo-google" size={18} color={colors.ink} />}
            />
            <GlassButton
              label="Apple"
              variant="secondary"
              size="md"
              style={styles.flex}
              onPress={onApple}
              leading={<Ionicons name="logo-apple" size={20} color={colors.ink} />}
            />
          </View>

          <View style={styles.spacer} />

          <Text style={[typography.caption, styles.legal]}>
            By continuing, you agree to our{' '}
            <Text style={styles.link} onPress={onTerms}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={styles.link} onPress={onPrivacy}>
              Privacy Policy
            </Text>
            .
          </Text>
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
  progress: { marginTop: spacing.lg },
  intro: { color: colors.textMuted, marginTop: 64 },
  form: { gap: spacing.lg, marginTop: spacing.xl },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 28 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(36,22,35,0.25)' },
  dividerText: { color: colors.textMuted, letterSpacing: 0.8 },
  socialRow: { flexDirection: 'row', gap: spacing.md, marginTop: 28 },
  spacer: { flex: 1, minHeight: spacing.xl },
  legal: { color: colors.textMuted, textAlign: 'center' },
  link: { color: colors.textPrimary, textDecorationLine: 'underline' },
});
