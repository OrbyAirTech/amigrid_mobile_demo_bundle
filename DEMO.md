# Amigrid demo mode

Runs the whole app on built-in sample data: no servers, no accounts, no native build.

    npm install
    npx expo start

Scan the QR code with Expo Go (Android or iOS). On different networks use `npx expo start --tunnel`.
If install complains about peer dependencies: `npm install --legacy-peer-deps`.

- Log in with any email and password. Sign-up accepts any code.
- Internet is needed only for sample photos and live-stream clips (a bundled clip plays if offline).
- Real servers: set `EXPO_PUBLIC_DEMO=0` in `.env`.
- Sample data lives in `src/demo/db.ts`.
- Not in Expo Go: Mapbox map (fallback shown), push, hold-to-record, real camera for Go Live.
