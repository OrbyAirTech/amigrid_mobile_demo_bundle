// app.config.js replaces app.json. The Mapbox *secret* download token is NOT
// passed through this file — @rnmapbox/maps reads it directly from the
// RNMAPBOX_MAPS_DOWNLOAD_TOKEN environment variable at build time (gradle on
// Android, CocoaPods on iOS), so it never gets written into a committed file.
// Before building natively (npx expo prebuild / run:ios / run:android), export it:
//   export RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk.xxxxxxxx
// Get this token (scope: "Downloads:Read") from https://account.mapbox.com/access-tokens/
// It is DIFFERENT from the public "pk." token used at runtime in src/config/mapbox.ts.
//
// NATIVE BUILD SWITCHES
// Every line marked "NATIVE" below needs a new dev-client build (npx expo prebuild --clean, then run:android /
// run:ios). They are commented out so the project still prebuilds without a device or Firebase files.
// When you are ready to build: uncomment the NATIVE lines, put the Firebase files in the project root
// (google-services.json for Android, GoogleService-Info.plist for iOS; never commit them), then rebuild.
// Until then the app still runs: streaming, push and frame capture are loaded lazily and simply stay off.
// The local module in modules/amigrid-frame is auto-linked and compiles on the next native build; it has no
// line here.

module.exports = {
  expo: {
    name: 'Amigrid',
    slug: 'amigrid',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'amigrid',
    userInterfaceStyle: 'light',
    ios: {
      bundleIdentifier: 'com.ajcodess.amigrid',
      // NATIVE (push): Firebase config for iOS.
      // googleServicesFile: './GoogleService-Info.plist',
      infoPlist: {
        // NATIVE (push): lets iOS wake the app for a background notification.
        // UIBackgroundModes: ['remote-notification'],
      },
    },
    android: {
      package: 'com.ajcodess.amigrid',
      adaptiveIcon: {
        backgroundColor: '#F3F1F4',
        foregroundImage: './assets/images/android-icon-foreground.png',
      },
      predictiveBackGestureEnabled: false,
      // NATIVE (push): Firebase config for Android, and the Android 13+ notification permission.
      // googleServicesFile: './google-services.json',
      // permissions: ['POST_NOTIFICATIONS'],
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#F3F1F4',
          // Exported from light_mode_startup_variant.svg. That logo carries the wordmark, so it is wider than
          // the old 76px mark.
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
        },
      ],
      // Chat attachments, voice notes, product photos and Go Live. Native modules: rebuild the dev client after adding them.
      [
        'expo-image-picker',
        {
          photosPermission: 'Amigrid uses your photos so you can send them in chat and add them to your store.',
          cameraPermission: 'Amigrid uses the camera to take photos and videos for chat.',
          microphonePermission: 'Amigrid uses the microphone for video you send in chat.',
        },
      ],
      ['expo-audio', { microphonePermission: 'Amigrid uses the microphone to record voice notes and to go live.' }],
      // Real location + the Mapbox map. Native modules: run `npx expo prebuild --clean` and rebuild the dev client
      // after changing these. No download-token field on purpose — see the note at the top of this file.
      ['expo-location', { locationWhenInUsePermission: 'Amigrid uses your location to show the grids, people and stores around you.' }],
      // '@rnmapbox/maps', // native build only; the demo map falls back in Expo Go
      'expo-secure-store',

      // ---- Live streaming (LiveKit + WebRTC) ---------------------------------------------------------------
      // NATIVE: adds the LiveKit pod source / audio setup and the WebRTC camera and microphone permissions.
      // '@livekit/react-native-expo-plugin',
      // [
      //   '@config-plugins/react-native-webrtc',
      //   {
      //     cameraPermission: 'Amigrid uses the camera so you can go live.',
      //     microphonePermission: 'Amigrid uses the microphone so you can go live.',
      //   },
      // ],

      // ---- Hold to record (clips saved to the gallery) -----------------------------------------------------
      // NATIVE: expo-media-library (permission text) and expo-haptics are new native modules; the recorder itself is in
      // modules/amigrid-frame. Uncomment, then rebuild.
      // [
      //   'expo-media-library',
      //   { savePhotosPermission: 'Amigrid saves the clips you record from live streams to your gallery.', isAccessMediaLocationEnabled: false },
      // ],

      // ---- Push notifications (Firebase Cloud Messaging) ---------------------------------------------------
      // NATIVE: needs google-services.json / GoogleService-Info.plist (see the iOS and Android blocks above).
      // '@react-native-firebase/app',
      // iOS only: React Native Firebase asks for static frameworks. Uncomment together with the line above.
      // ['expo-build-properties', { ios: { useFrameworks: 'static' } }],
    ],
    extra: {
      eas: {
        projectId: '24e54900-27e0-4851-b902-5a16d5384811',
      },
    },
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
