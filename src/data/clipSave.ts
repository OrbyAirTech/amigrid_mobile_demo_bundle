/**
 * Saves a recorded clip to the phone's gallery (expo-media-library, loaded lazily). Asks for add-only access the
 * first time. Returns 'saved', 'denied' (no permission) or 'failed'.
 */
type Library = typeof import('expo-media-library');

export async function saveClipToGallery(uri: string): Promise<'saved' | 'denied' | 'failed'> {
  let lib: Library;
  try {
    lib = require('expo-media-library') as Library;
  } catch {
    return 'failed';
  }
  try {
    const perm = await lib.requestPermissionsAsync(true); // write-only: Amigrid never reads the gallery
    if (!perm.granted) return 'denied';
    await lib.saveToLibraryAsync(uri);
    return 'saved';
  } catch {
    return 'failed';
  }
}
