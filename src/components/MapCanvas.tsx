import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import type { LatLng } from '@/utils/discoveryCoords';

/**
 * Mapbox is a native module, so it only exists in a development / release build. Loading it lazily lets
 * the same JS bundle still run in Expo Go (or anywhere the module is missing): `fallback` is shown instead.
 */
type MapboxModule = typeof import('@rnmapbox/maps');
let mapbox: { Mapbox: MapboxModule['default']; styleUrl: string } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MAPBOX_STYLE_URL } = require('@/config/mapbox') as typeof import('@/config/mapbox');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const lib = require('@rnmapbox/maps') as MapboxModule;
  mapbox = { Mapbox: lib.default, styleUrl: MAPBOX_STYLE_URL };
} catch {
  mapbox = null;
}

export const isMapAvailable = mapbox !== null;

const PIN = 38;
const ICON = { space: 'grid', user: 'user', store: 'shopping-bag' } as const;

/** One thing to plot. Built by the screen from whichever list is showing. */
export type MapPin = { key: string; kind: keyof typeof ICON; image?: string; at: LatLng };

function Pin({ pin }: { pin: MapPin }) {
  const uri = pin.image;
  return (
    <View style={styles.pin}>
      {uri ? (
        <Image source={{ uri }} style={styles.pinImage} contentFit="cover" />
      ) : (
        <View style={[styles.pinImage, styles.pinFallback]}>
          <Feather name={ICON[pin.kind]} size={16} color={colors.ink} />
        </View>
      )}
    </View>
  );
}

type Props = {
  /** The user's own position: where the camera first lands. */
  center: LatLng | null;
  /** Things to plot. */
  pins: MapPin[];
  /** Pixels at the bottom covered by the collapsed sheet, so the camera centres on the visible map. */
  bottomInset: number;
  fallback: ReactNode;
};

export function MapCanvas({ center, pins, bottomInset, fallback }: Props) {
  // Centre once. If the camera followed every refresh it would snap back after the user had panned away.
  const [start, setStart] = useState<LatLng | null>(null);
  useEffect(() => {
    if (!start && center) setStart(center);
  }, [center, start]);

  if (!mapbox) return <>{fallback}</>;
  const { Mapbox, styleUrl } = mapbox;

  return (
    <Mapbox.MapView
      style={StyleSheet.absoluteFill}
      styleURL={styleUrl}
      logoEnabled={false}
      scaleBarEnabled={false}
      compassEnabled={false}
      attributionPosition={{ top: 8, right: 8 }}
    >
      <Mapbox.Camera
        zoomLevel={14}
        animationMode="flyTo"
        animationDuration={900}
        padding={{ paddingBottom: bottomInset, paddingTop: 0, paddingLeft: 0, paddingRight: 0 }}
        {...(start ? { centerCoordinate: [start.longitude, start.latitude] } : null)}
      />
      <Mapbox.UserLocation visible />
      {pins.map((pin) => (
        <Mapbox.MarkerView key={pin.key} coordinate={[pin.at.longitude, pin.at.latitude]} allowOverlap>
          <Pin pin={pin} />
        </Mapbox.MarkerView>
      ))}
    </Mapbox.MapView>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.white,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pinImage: { width: '100%', height: '100%' },
  pinFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
});
