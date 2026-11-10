import * as Location from 'expo-location';

export type PermissionResult = { status: 'granted' | 'denied'; canAskAgain: boolean };

const toResult = (r: Location.LocationPermissionResponse): PermissionResult => ({
  status: r.granted ? 'granted' : 'denied',
  canAskAgain: r.canAskAgain,
});

export async function requestForegroundPermissionsAsync(): Promise<PermissionResult> {
  return toResult(await Location.requestForegroundPermissionsAsync());
}

export async function getForegroundPermissionsAsync(): Promise<PermissionResult> {
  return toResult(await Location.getForegroundPermissionsAsync());
}

export type Fix = { latitude: number; longitude: number; accuracy: number | null };

/**
 * One position fix. Uses the last known position when there is one (instant, good enough for a
 * 1.5 km neighbourhood query) and only waits for a fresh GPS fix when the device has nothing cached.
 * Returns null if permission isn't granted or no fix could be had.
 */
export async function getCurrentFix(): Promise<Fix | null> {
  try {
    if (!(await Location.getForegroundPermissionsAsync()).granted) return null;
    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
  } catch {
    return null;
  }
}
