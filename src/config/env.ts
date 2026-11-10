import Constants from 'expo-constants';

/**
 * Core server base URL.
 *
 * Set EXPO_PUBLIC_API_URL in `.env` to point at a real host (e.g. https://api.example.com).
 * When it isn't set we assume the Core server runs on the same machine as Metro, so a phone on the
 * same Wi-Fi reaches it through the dev machine's LAN address (a bare `localhost` would resolve to the
 * phone itself). The server port is EXPO_PUBLIC_API_PORT (default 8080).
 */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const port = process.env.EXPO_PUBLIC_API_PORT ?? '8080';
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:${port}`;
}

/**
 * Demo mode is ON by default: the app runs on built-in sample data and needs no servers (see src/demo).
 * Put EXPO_PUBLIC_DEMO=0 in `.env` to use the real Core and chat servers instead.
 */
export const DEMO = process.env.EXPO_PUBLIC_DEMO !== '0';

export const API_URL = DEMO ? 'https://core.amigrid.demo' : resolveBaseUrl();

/**
 * Chat server (a separate Node service, default port 5222). Same rule as the Core server: set EXPO_PUBLIC_CHAT_URL
 * for a real host, otherwise it is the dev machine's LAN address with EXPO_PUBLIC_CHAT_PORT.
 * The WebSocket lives on the same host and port.
 */
function resolveChatUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_CHAT_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const port = process.env.EXPO_PUBLIC_CHAT_PORT ?? '5222';
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:${port}`;
}

export const CHAT_URL = DEMO ? 'https://chat.amigrid.demo' : resolveChatUrl();
export const CHAT_WS_URL = CHAT_URL.replace(/^http/i, 'ws');

/** Per-request timeout. The engine routes do real PostGIS work on a cold cache, so keep some headroom. */
export const REQUEST_TIMEOUT_MS = 20_000;
