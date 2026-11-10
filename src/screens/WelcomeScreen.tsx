import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/BrandLogo';
import { FeatureCard } from '@/components/FeatureCard';
import { GlassButton } from '@/components/GlassButton';
import { ScreenBackground } from '@/components/ScreenBackground';
import { colors, radius, spacing, typography } from '@/theme';

const FEATURES = [
  {
    icon: 'map-pin',
    title: 'Map-First Discovery',
    description: 'Explore your neighborhood through an interactive, live-presence map.',
  },
  {
    icon: 'users',
    title: 'Active Grid',
    description: 'Join local hubs, rsvp to events, and meet people with shared interests.',
  },
  {
    icon: 'compass',
    title: 'Real-time Social',
    description: "Stay updated with a location-based feed of what's happening right now.",
  },
] as const;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // TODO: Guest Mode -> tabs, once those screens exist.
  const onGetStarted = () => router.push({ pathname: '/email', params: { flow: 'signup' } });
  const onLogin = () => router.push({ pathname: '/email', params: { flow: 'login' } });
  const onGuest = () => console.log('Guest Mode');
  const onTerms = () => console.log('Terms of Service');
  const onPrivacy = () => console.log('Privacy Policy');

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <BrandLogo variant="web" style={styles.logo} />
        </View>

        <View style={styles.hero}>
          {/* Soft shadow under the badge so its edges sit on the page instead of cutting into it. */}
          <View style={styles.badgeShadow}>
            <View style={styles.badgeClip}>
              <BrandLogo variant="startup" style={styles.badgeImage} />
            </View>
          </View>
        </View>

        <Text style={[typography.display, styles.title]}>
          Connect with your <Text style={styles.highlight}>local grid.</Text>
        </Text>
        <Text style={[typography.body, styles.subtitle]}>
          Discover vibrant Grid, real-time events, and neighbors nearby. Your city is
          more alive than you think.
        </Text>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </View>

        <View style={styles.actions}>
          <GlassButton label="Get Started" icon="arrow-right" onPress={onGetStarted} />
          <View style={styles.row}>
            <GlassButton
              label="Log In"
              variant="secondary"
              size="md"
              onPress={onLogin}
              style={styles.flex}
            />
            <GlassButton
              label="Guest Mode"
              variant="secondary"
              size="md"
              onPress={onGuest}
              style={styles.flex}
            />
          </View>
        </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  brand: { alignItems: 'center' },
  logo: { width: 220, height: 76 },
  hero: { marginTop: spacing.xl, paddingVertical: spacing.md, alignItems: 'center' },
  badgeShadow: {
    width: 200,
    height: 200,
    borderRadius: 44,
    backgroundColor: colors.primary,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  badgeClip: { flex: 1, borderRadius: 44, overflow: 'hidden' },
  badgeImage: { width: '100%', height: '100%' },
  title: { color: colors.textPrimary, marginTop: 28 },
  highlight: { backgroundColor: colors.primary },
  subtitle: { color: colors.textMuted, marginTop: spacing.md },
  features: { gap: spacing.md, marginTop: spacing.xl },
  actions: { gap: spacing.md, marginTop: 28 },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  legal: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  link: { color: colors.textPrimary, textDecorationLine: 'underline' },
});
