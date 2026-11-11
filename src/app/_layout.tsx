import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// TEMP: Mapbox disabled (native-only). Re-add: import '@/config/mapbox';
import { PushBanner } from '@/components/PushBanner';
import { startChat, stopChat } from '@/data/chatStore';
import { registerBackgroundHandler, startPush, stopPush } from '@/data/pushService';
import { clearStreams } from '@/data/streamStore';
import { clearSessionUser, refreshMyProfile } from '@/data/currentUserStore';
import { clearMyGrids } from '@/data/myGridsStore';
import { clearNotifications } from '@/data/notificationStore';
import { clearSession, hydrateSession, useSession } from '@/data/sessionStore';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { DEMO } from '@/config/env';
import { installDemo } from '@/demo';
import { colors } from '@/theme';

installDemo();
SplashScreen.preventAutoHideAsync();

/** Screens reachable without a session: the welcome screen (no segment) and the log-in / sign-up steps. */
const PUBLIC_SCREENS = new Set(['email', 'password', 'verify', 'signup']);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const session = useSession();
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  // Read the saved tokens once. The splash stays up until both fonts and the session are known, so someone
  // who is already signed in never sees the welcome screen flash by.
  // Demo mode always starts signed out, on the welcome screen.
  useEffect(() => {
    if (DEMO) void clearSession();
    else hydrateSession();
  }, []);

  const ready = (loaded || !!error) && session.status !== 'loading';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Load the signed-in user's profile for the header; drop it again on sign-out.
  useEffect(() => {
    if (session.status === 'signedIn') {
      refreshMyProfile();
      startChat();
      void startPush();
    } else if (session.status === 'signedOut') {
      clearSessionUser();
      clearMyGrids();
      clearNotifications();
      stopChat();
      void stopPush();
      clearStreams();
    }
  }, [session.status]);

  // Session routing.
  //  - Signed in and sitting on the welcome screen: go straight to the map.
  //  - Signed out anywhere but the welcome / log-in / sign-up screens (logged out, or the refresh token was
  //    rejected): back to welcome.
  useEffect(() => {
    if (!ready || !navState?.key) return;
    const first = (segments as string[])[0];
    if (session.status === 'signedIn' && !first) router.replace('/map');
    if (session.status === 'signedOut' && first && !PUBLIC_SCREENS.has(first)) router.replace('/');
  }, [ready, navState?.key, session.status, segments, router]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      {/* Demo mode animates screen changes (slide for pushed screens, fade between the main tabs); the real app keeps them off. */}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: DEMO ? 'slide_from_right' : 'none',
          animationDuration: 260,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ animation: DEMO ? 'fade' : 'none' }} />
        <Stack.Screen name="profile" options={{ animation: DEMO ? 'fade' : 'none', animationDuration: 180 }} />
        <Stack.Screen name="map" options={{ animation: DEMO ? 'fade' : 'none', animationDuration: 180 }} />
        <Stack.Screen name="feed" options={{ animation: DEMO ? 'fade' : 'none', animationDuration: 180 }} />
        <Stack.Screen name="search" options={{ animation: DEMO ? 'fade' : 'none', animationDuration: 180 }} />
        <Stack.Screen name="activity" options={{ animation: DEMO ? 'fade' : 'none', animationDuration: 180 }} />
        <Stack.Screen name="location" options={{ animation: DEMO ? 'fade' : 'none' }} />
        <Stack.Screen name="go-live" options={{ animation: DEMO ? 'slide_from_bottom' : 'none' }} />
        <Stack.Screen name="add-product" options={{ animation: DEMO ? 'slide_from_bottom' : 'none' }} />
        <Stack.Screen name="order" options={{ animation: DEMO ? 'slide_from_bottom' : 'none' }} />
        {/* Swiping back from the left edge closes replies. */}
        <Stack.Screen name="replies" options={{ gestureEnabled: true }} />
      </Stack>
      <PushBanner />
      {DEMO ? <AnimatedSplash /> : null}
    </GestureHandlerRootView>
  );
}

registerBackgroundHandler();

const styles = StyleSheet.create({
  root: { flex: 1 },
});
