import type { UserProfile } from '@/types/profile';
import { api, ApiError, stripBearer } from './api/client';
import { uploadFile } from './uploadApi';
import { deviceInfo } from './authApi';
import { clearSession, setAccessToken, setTokens } from './sessionStore';

/** The server's account settings row (GET /user/get_settings). */
export type AccountSettings = {
  is_profile_public: boolean;
  show_email: boolean;
  show_phone: boolean;
  show_birthday: boolean;
  broadcast_location: boolean;
  notify_email: boolean;
  notify_sms: boolean;
  notify_push: boolean;
  two_factor_enabled: boolean;
  login_alerts: boolean;
  theme: string;
  language: string;
};

// ---- reading ------------------------------------------------------------------------------------------------------

/** GET /user: the signed-in user's full profile. */
export const getMyProfile = async () => (await api.get<UserProfile>('/user')).data;

/** GET /user/get_settings. */
export const getSettings = async () => (await api.get<AccountSettings>('/user/get_settings')).data;

/**
 * GET /user/users?id=. Someone else's profile. The server records a "profile viewed" notification for them
 * on every call, so callers should open it once per visit rather than refetching in the background.
 */
export const getUserProfile = async (id: string) => (await api.get<UserProfile>('/user/users', { id })).data;

// ---- editing --------------------------------------------------------------------------------------------------------

export type ProfileFields = { username: string; display_name: string; bio: string; links: string[]; profile_pic_url: string };

/**
 * PUT /user/update. The server reads every field, so an edit always sends the complete set
 * (the unchanged ones taken from the current profile). Limits: username 3-30, display name 1-60, bio up to 300.
 */
export const updateProfile = (fields: ProfileFields) => api.put('/user/update', fields);

/** Uploads a profile photo and returns the URL to store as `profile_pic_url`. */
export const uploadProfilePhoto = (uri: string, filename: string, mime = 'image/jpeg') => uploadFile('PROFILE_PHOTO', uri, filename, mime);

// ---- visibility -----------------------------------------------------------------------------------------------------

/** The settings the user can change. `two_factor_enabled` has no edit route (it needs its own set-up flow). */
export type SettingsPatch = Partial<Omit<AccountSettings, 'two_factor_enabled'>>;

/** PUT /user/settings. Only the keys sent change; the server answers with the full stored row. */
export const updateSettings = async (patch: SettingsPatch) =>
  (await api.put<AccountSettings>('/user/settings', patch)).data;

// ---- changing the password ------------------------------------------------------------------------------------------

/**
 * Three calls, all carrying the short-lived token the first one returns:
 *   1. forgot-password -> emails a code and returns the token
 *   2. verifyOTP (code) -> checks it
 *   3. reset-password (new password) -> the server rotates this device's session and returns new tokens
 */
export async function startPasswordChange(): Promise<string> {
  const { headers } = await api.post('/session/forgot-password', {});
  const token = stripBearer(headers.get('authorization'));
  if (!token) throw new ApiError('Could not send the code. Try again in a moment.', 500);
  return token;
}

export const verifyPasswordCode = (code: string, token: string) => api.post('/session/verifyOTP', { otp: code }, { token });

export async function finishPasswordChange(newPassword: string, token: string) {
  const { headers } = await api.post('/session/reset-password', { newPassword, deviceInfo }, { token });
  const at = stripBearer(headers.get('authorization'));
  const rt = stripBearer(headers.get('x-refresh-token'));
  if (at && rt) await setTokens(at, rt);
}

// ---- changing email or phone ----------------------------------------------------------------------------------------

export type ContactKind = 'email' | 'phone';

/**
 * Two calls. The server refuses while the account has other signed-in devices ("Close All Sessions And Try Again").
 *   1. change_email / change_phone (password + new value) -> texts a code to the phone on file, returns a token
 *   2. toggle_token (code + device) with that token -> applies the change and returns a fresh access token
 */
export async function requestContactChange(kind: ContactKind, value: string, password: string): Promise<string> {
  const { headers } = await api.post(
    kind === 'email' ? '/user/change_email' : '/user/change_phone',
    kind === 'email' ? { password, newEmail: value } : { password, newPhone: value },
  );
  const token = stripBearer(headers.get('authorization'));
  if (!token) throw new ApiError('Could not start the change. Try again.', 500);
  return token;
}

export async function confirmContactChange(code: string, token: string) {
  const { headers } = await api.post('/user/toggle_token', { token: code, deviceInfo }, { token });
  const at = stripBearer(headers.get('authorization'));
  if (at) await setAccessToken(at);
}

// ---- leaving ----------------------------------------------------------------------------------------------------------

/** DELETE /user/delete_account. The account enters a 30 day grace period. */
export async function deleteAccount() {
  await api.del('/user/delete_account');
  await clearSession();
}
