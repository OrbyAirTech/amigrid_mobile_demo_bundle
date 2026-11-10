import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from '@/utils/locationPermission'; // TEMP stub, see file
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { GlassButton } from '@/components/GlassButton';
import { GlassSurface } from '@/components/GlassSurface';
import { ScreenBackground } from '@/components/ScreenBackground';
import { StepProgress } from '@/components/StepProgress';
import { Wordmark } from '@/components/Wordmark';
import { colors, fonts, radius, spacing, typography } from '@/theme';

export default function LocationPermissionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // This is the last onboarding step — both "allowed" and "skip" land on the map.
  const goNext = () => router.replace('/map');
  const onSkip = () => goNext();
  const onTerms = () => console.log('Terms of Service');
  const onPrivacy = () => console.log('Privacy Policy');

  const onContinue = async () => {
    setBusy(true);
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setBlocked(false);
        goNext();
      } else {
        // Denied. If the OS won't ask again, the only way in is Settings.
        setBlocked(!canAskAgain);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <View style={styles.header}>
          <BrandMark size={40} />
          <StepProgress total={3} current={3} variant="dots" />
          <Text style={[typography.body, styles.skip]} onPress={onSkip} accessibilityRole="button">
            Skip
          </Text>
        </View>

        <View style={styles.photoShadow}>
          <Image
            source={require('../../assets/images/onboarding-location-light.png')}
            style={styles.photo}
            contentFit="cover"
            accessibilityLabel="View Of Active Events"
          />
        </View>

        <GlassSurface tone="primary" radius={radius.pill} style={styles.stepPill} contentStyle={styles.stepPillInner}>
          <Text style={[typography.caption, styles.stepText]}>Step 01: Core Setup</Text>
        </GlassSurface>

        <Text style={[typography.title, styles.title]}>Find Your Grid</Text>
        <Text style={[typography.body, styles.body]}>
          <Wordmark size={16} /> is a map-first platform. We use your location to show you nearby grid, events,
          and friends in real-time.
        </Text>

        <GlassSurface tone="light" radius={radius.lg} raised style={styles.card} contentStyle={styles.cardRow}>
          <View style={styles.tile}>
            <Feather name="map-pin" size={20} color={colors.ink} />
          </View>
          <View style={styles.cardCopy}>
            <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>Precise Location</Text>
            <Text style={[typography.cardBody, { color: colors.textMuted }]}>
              Allowing “Always” helps us alert you when you enter a Grid or an Amigo is
              nearby.
            </Text>
          </View>
        </GlassSurface>

        {blocked ? (
          <View style={styles.notice} accessibilityLiveRegion="polite">
            <Text style={[typography.caption, styles.noticeText]}>
              Location is turned off for <Wordmark size={13} />. You can switch it on in your phone settings.
            </Text>
            <GlassButton
              label="Open Settings"
              variant="secondary"
              size="md"
              onPress={() => Linking.openSettings()}
            />
          </View>
        ) : null}

        <View style={styles.spacer} />

        <GlassButton
          label={busy ? 'Requesting…' : 'Continue'}
          icon="arrow-right"
          disabled={busy}
          onPress={onContinue}
        />

        <Text style={[typography.caption, styles.legal]}>
          By continuing, you agree to <Wordmark size={13} />’s{' '}
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
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skip: { color: colors.textMuted, fontFamily: fonts.semibold },
  photoShadow: {
    marginTop: spacing.xl,
    borderRadius: radius.xl,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  stepPill: { alignSelf: 'flex-start', marginTop: spacing.xl },
  stepPillInner: { paddingHorizontal: 14, paddingVertical: 6 },
  stepText: { color: colors.ink, fontFamily: fonts.semibold },
  title: { color: colors.textPrimary, marginTop: spacing.md },
  body: { color: colors.textMuted, marginTop: spacing.sm },
  card: { marginTop: spacing.xl },
  cardRow: { flexDirection: 'row', gap: 14, padding: 16 },
  tile: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.iconTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: { flex: 1, gap: 4 },
  notice: { gap: spacing.sm, marginTop: spacing.lg },
  noticeText: { color: colors.textMuted },
  spacer: { flex: 1, minHeight: spacing.xl },
  legal: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  link: { color: colors.textPrimary, textDecorationLine: 'underline' },
});
