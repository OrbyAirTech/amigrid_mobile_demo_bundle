import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BirthdayPicker } from '@/components/BirthdayPicker';
import { BrandMark } from '@/components/BrandMark';
import { GlassButton } from '@/components/GlassButton';
import { GlassIconButton } from '@/components/GlassIconButton';
import { GlassInput } from '@/components/GlassInput';
import { PasswordInput } from '@/components/PasswordInput';
import { ScreenBackground } from '@/components/ScreenBackground';
import { StepProgress } from '@/components/StepProgress';
import { ApiError } from '@/data/api/client';
import { signUp } from '@/data/authApi';
import { signupFlow } from '@/data/signupFlow';
import { colors, spacing, typography } from '@/theme';
import { ageInYears, toISODate } from '@/utils/date';

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;
const MIN_AGE = 13;

type Field = 'fullName' | 'username' | 'phone' | 'birthday' | 'password' | 'confirmPassword';
type Touched = Partial<Record<Field, boolean>>;

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState<Touched>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));

  const errors: Record<Field, string | undefined> = {
    // The server accepts 3 to 30 characters for the full name.
    fullName: fullName.trim().length < 3 || fullName.trim().length > 30 ? 'Enter your full name (3–30 characters).' : undefined,
    username: !USERNAME_RE.test(username) ? 'Use 3–30 letters, numbers or underscores.' : undefined,
    phone: !PHONE_RE.test(phone.trim()) ? 'Include the country code, e.g. +15551234567.' : undefined,
    birthday: !birthday
      ? 'Select your birthday.'
      : ageInYears(birthday) < MIN_AGE
        ? `You must be at least ${MIN_AGE}.`
        : undefined,
    password: password.length < 8 ? 'Use at least 8 characters.' : undefined,
    confirmPassword:
      password.length > 0 && confirmPassword !== password ? "Passwords don't match." : undefined,
  };
  const isValid = (Object.keys(errors) as Field[]).every((k) => !errors[k]);

  // The email is not sent here: the server ties the account to the address verified in the previous
  // step through the short-lived token that step returned.
  const onCreateAccount = async () => {
    if (busy) return;
    setTouched({
      fullName: true,
      username: true,
      phone: true,
      birthday: true,
      password: true,
      confirmPassword: true,
    });
    if (!isValid || !birthday) return;

    const token = signupFlow.getSignupToken();
    if (!token) {
      setFormError('This step expired. Go back and verify your email again.');
      return;
    }
    setFormError(undefined);
    setBusy(true);
    try {
      await signUp(
        {
          password,
          username: username.trim(),
          fullName: fullName.trim(),
          phone: phone.trim(),
          birthday: toISODate(birthday),
        },
        token,
      );
      signupFlow.reset();
      router.replace('/location');
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not create the account. Try again.');
    } finally {
      setBusy(false);
    }
  };

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

          <View style={styles.progress}>
            <StepProgress total={3} current={3} />
          </View>

          <Text style={[typography.title, styles.title]}>Create your account</Text>
          <Text style={[typography.body, styles.subtitle]}>
            {email ? (
              <Fragment>
                Verified <Text style={styles.emailStrong}>{email}</Text>.{' '}
              </Fragment>
            ) : null}
            A few details and you're in.
          </Text>

          <View style={styles.form}>
            <GlassInput
              label="Full Name"
              icon="user"
              placeholder="John Michael Doe"
              value={fullName}
              onChangeText={setFullName}
              onBlur={() => touch('fullName')}
              autoCapitalize="words"
              textContentType="name"
              error={touched.fullName ? errors.fullName : undefined}
            />
            <GlassInput
              label="Username"
              icon="at-sign"
              placeholder="johndoe"
              value={username}
              onChangeText={setUsername}
              onBlur={() => touch('username')}
              autoCapitalize="none"
              autoCorrect={false}
              hint={!touched.username ? 'Letters, numbers and underscores, 3–20 characters.' : undefined}
              error={touched.username ? errors.username : undefined}
            />
            <GlassInput
              label="Phone Number"
              icon="phone"
              placeholder="+15551234567"
              value={phone}
              onChangeText={setPhone}
              onBlur={() => touch('phone')}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              hint={!touched.phone ? 'Include your country code.' : undefined}
              error={touched.phone ? errors.phone : undefined}
            />
            <BirthdayPicker
              value={birthday}
              onChange={(d) => {
                setBirthday(d);
                touch('birthday');
              }}
              error={touched.birthday ? errors.birthday : undefined}
            />
            <PasswordInput
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (t.length === 0) setConfirmPassword('');
              }}
              onBlur={() => touch('password')}
              hint={!touched.password ? 'At least 8 characters.' : undefined}
              error={touched.password ? errors.password : undefined}
            />

            {password.length > 0 ? (
              <Animated.View
                entering={FadeInDown.duration(220)}
                exiting={FadeOutUp.duration(160)}
                layout={LinearTransition.duration(200)}
              >
                <PasswordInput
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onBlur={() => touch('confirmPassword')}
                  error={touched.confirmPassword ? errors.confirmPassword : undefined}
                />
              </Animated.View>
            ) : null}
          </View>

          <View style={styles.spacer} />

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <GlassButton
            label={busy ? 'Creating account…' : 'Create Account'}
            icon="arrow-right"
            disabled={busy}
            onPress={onCreateAccount}
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
  progress: { marginTop: spacing.lg },
  title: { color: colors.textPrimary, marginTop: 40 },
  subtitle: { color: colors.textMuted, marginTop: spacing.sm },
  emailStrong: { fontFamily: typography.cardTitle.fontFamily, color: colors.textPrimary },
  form: { gap: spacing.lg, marginTop: spacing.xl },
  spacer: { flex: 1, minHeight: spacing.xl },
  formError: { ...typography.rowMeta, color: colors.danger, textAlign: 'center', marginBottom: spacing.sm },
});
