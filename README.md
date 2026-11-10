# Amigrid

Expo (SDK 57) + TypeScript + Expo Router.

## Run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go for a quick look. Once we add native-only libraries (maps, push, etc.), switch to a development build:

```bash
npx expo run:ios      # or run:android
```

## Structure

```
src/
  app/          Expo Router routes (thin: each file re-exports a screen)
  screens/      Screen components
  components/   Shared UI (GlassSurface, GlassButton, FeatureCard, ...)
  theme/        Colors, glass recipes, typography, spacing
assets/images/  Images (hero-globe.jpg is a low-res placeholder, replace with the Visily export)
```
# Amigrid_mobile
