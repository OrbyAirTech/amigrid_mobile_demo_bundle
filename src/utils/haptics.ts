/** Haptics through expo-haptics, loaded lazily so a build without the module still runs (just without the buzz). */
type Haptics = typeof import('expo-haptics');
let mod: Haptics | null | undefined;
const haptics = (): Haptics | null => {
  if (mod === undefined) {
    try {
      mod = require('expo-haptics') as Haptics;
    } catch {
      mod = null;
    }
  }
  return mod;
};

export const impactMedium = () => void haptics()?.impactAsync(haptics()!.ImpactFeedbackStyle.Medium).catch(() => {});
export const impactLight = () => void haptics()?.impactAsync(haptics()!.ImpactFeedbackStyle.Light).catch(() => {});
export const notifySuccess = () => void haptics()?.notificationAsync(haptics()!.NotificationFeedbackType.Success).catch(() => {});
export const notifyWarning = () => void haptics()?.notificationAsync(haptics()!.NotificationFeedbackType.Warning).catch(() => {});
