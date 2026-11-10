import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { api, ApiError, stripBearer } from './api/client';
import { clearSession, setTokens } from './sessionStore';

/** Sent with login, sign-up and logout so the server can tie the session to this device. */
export const deviceInfo = `${Device.modelName ?? Platform.OS}-${Platform.OS}${Platform.Version}`;

export type LoginSettings = { is_profile_public?: boolean; theme?: string; language?: string };

/** Login and sign-up both answer with the new token pair in the Authorization / X-Refresh-Token headers. */
async function storeTokensFrom(headers: Headers) {
  const at = stripBearer(headers.get('authorization'));
  const rt = stripBearer(headers.get('x-refresh-token'));
  if (!at || !rt) return false;
  await setTokens(at, rt);
  return true;
}

/** POST /auth/login. A 401 means wrong email or password. */
export async function login(email: string, password: string): Promise<LoginSettings | undefined> {
  const { data, headers } = await api.post<{ message?: string; settings?: LoginSettings }>(
    '/auth/login',
    { email, password, deviceInfo },
    { auth: false },
  );
  if (!(await storeTokensFrom(headers))) throw new ApiError('Login succeeded but the server sent no session. Try again.', 500);
  return data?.settings;
}

/**
 * Sign-up is three calls, each handing back a short-lived token for the next:
 *   1. verify_email  (email)            -> token A, and a 5-digit code is emailed (valid 3 minutes)
 *   2. verify_email_otp (code, token A) -> token B
 *   3. sign-up (profile, token B)       -> the real session
 * The server answers step 1 the same way whether or not the email already has an account, so an existing
 * email only shows up as a rejected code in step 2.
 */
export async function startEmailVerification(email: string): Promise<string> {
  const { headers } = await api.post('/auth/verify_email', { email }, { auth: false });
  const token = stripBearer(headers.get('authorization'));
  if (!token) throw new ApiError('Could not start verification. Try again in a moment.', 500);
  return token;
}

export async function verifyEmailCode(code: string, verifyToken: string): Promise<string> {
  const { headers } = await api.post('/session-based/verify_email_otp', { otp: code }, { token: verifyToken });
  const token = stripBearer(headers.get('authorization'));
  if (!token) throw new ApiError('That code was not accepted.', 409);
  return token;
}

export type SignUpFields = {
  fullName: string;
  username: string;
  phone: string;
  birthday: string; // YYYY-MM-DD
  password: string;
};

export async function signUp(fields: SignUpFields, signupToken: string): Promise<void> {
  const { headers } = await api.post(
    '/temp_session/sign-up',
    {
      deviceInfo,
      fullName: fields.fullName,
      username: fields.username,
      phone: fields.phone,
      birthday: fields.birthday,
      password: fields.password,
      // The server reads every one of these keys and fails the whole request if one is missing.
      // Sign-up does not use the coordinates (the engine learns the location from the first ping).
      latitude: '0',
      longitude: '0',
      display_name: '', // empty: the server uses the first word of the full name
      bio: '',
      links: [],
      language: 'en',
    },
    { token: signupToken },
  );
  // On a failure the server still answers 200, just without tokens. The usual cause is a username that is taken.
  if (!(await storeTokensFrom(headers))) {
    throw new ApiError('Could not create the account. That username may already be taken.', 409);
  }
}

/** Ends this device's session on the server, then always clears it locally, even if the call fails. */
export async function logout() {
  // Stop chat pushes to this device first, while the chat token still works. Core drops its token with the session.
  // (Loaded here rather than at the top: the push module imports the chat client, which imports this file.)
  await (require('./pushService') as typeof import('./pushService')).stopPush().catch(() => {});
  try {
    await api.post('/session/logout', { deviceInfo });
  } catch {
    // Signing out must work offline or with a dead token.
  } finally {
    await clearSession();
  }
}
