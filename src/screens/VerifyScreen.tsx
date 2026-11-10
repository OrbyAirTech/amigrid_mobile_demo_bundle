import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { GlassButton } from '@/components/GlassButton';
import { GlassIconButton } from '@/components/GlassIconButton';
import { OtpInput } from '@/components/OtpInput';
import { ApiError } from '@/data/api/client';
import { startEmailVerification, verifyEmailCode } from '@/data/authApi';
import { signupFlow } from '@/data/signupFlow';
import { ScreenBackground } from '@/components/ScreenBackground';
import { StepProgress } from '@/components/StepProgress';
import { colors, spacing, typography } from '@/theme';

const CODE_LENGTH = 5;
// The code is valid for 3 minutes and the server will not accept a new one for that email until it has expired,
// so resend is only offered once the first code has run out.
const RESEND_SECONDS = 180;

export default function VerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (secondsLeft === 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const submit = async (fullCode: string) => {
    if (navigatedRef.current || busy) return;
    const token = signupFlow.getVerifyToken();
    if (!token) {
      setError('This step expired. Go back and enter your email again.');
      return;
    }
    setBusy(true);
    try {
      signupFlow.setSignupToken(await verifyEmailCode(fullCode, token));
      navigatedRef.current = true;
      router.push({ pathname: '/signup', params: { email } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not check the code. Try again.');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const onChange = (value: string) => {
    setCode(value);
    if (error) setError(undefined);
  };

  const onResend = async () => {
    if (secondsLeft > 0 || !email) return;
    try {
      signupFlow.setVerifyToken(await startEmailVerification(email));
      setError(undefined);
      setCode('');
      setSecondsLeft(RESEND_SECONDS);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not resend the code. Try again.');
    }
  };

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <View
        style={[
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
          <StepProgress total={3} current={1} />
        </View>

        <Text style={[typography.title, styles.title]}>Check your inbox</Text>
        <Text style={[typography.body, styles.subtitle]}>
          Enter the {CODE_LENGTH}-digit code we sent to{' '}
          <Text style={{ fontFamily: typography.cardTitle.fontFamily }}>{email}</Text>
        </Text>

        <View style={styles.otp}>
          <OtpInput length={CODE_LENGTH} value={code} onChange={onChange} onComplete={submit} error={error} />
        </View>

        <Text
          style={[typography.cardBody, styles.resend, secondsLeft === 0 && styles.resendActive]}
          onPress={onResend}
          accessibilityRole="button"
        >
          {secondsLeft > 0 ? `Resend code in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : 'Resend code'}
        </Text>

        <View style={styles.spacer} />

        <GlassButton
          label={busy ? 'Verifying…' : 'Continue'}
          icon="arrow-right"
          disabled={code.length < CODE_LENGTH || busy}
          onPress={() => submit(code)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 44 },
  progress: { marginTop: spacing.lg },
  title: { color: colors.textPrimary, marginTop: 40 },
  subtitle: { color: colors.textMuted, marginTop: spacing.sm },
  otp: { marginTop: spacing.xl },
  resend: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  resendActive: { color: colors.textPrimary, textDecorationLine: 'underline' },
  spacer: { flex: 1, minHeight: spacing.xl },
});
