import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { glass, navOccupied, radius, spacing } from '@/theme';
import { FlatGlassProvider } from './GlassSurface';

const SPRING = { damping: 22, stiffness: 220 };

type Props = {
  collapsedHeight: number;
  expandedHeight: number;
  /** Always visible. Can hold buttons/toggles: only dragging it moves the sheet, taps go to its controls. */
  header: ReactNode;
  /** Scrolls independently of the drag handle. */
  children: ReactNode;
  /** Fires once the sheet has come to rest, with whether it settled expanded. Lets the screen react to the map being revealed. */
  onSettle?: (expanded: boolean) => void;
};

/**
 * Glass bottom sheet that drags between a collapsed peek and an expanded view over the map.
 *
 * Gestures: the small handle bar toggles the sheet on tap and drags it; the header area only drags
 * (a pan needs a deliberate vertical move), so tapping a toggle inside the header never moves the sheet.
 * Cards inside render without their own live blur (FlatGlassProvider) since the sheet is already blurred.
 */
export function DiscoverySheet({ collapsedHeight, expandedHeight, header, children, onSettle }: Props) {
  const insets = useSafeAreaInsets();
  const maxTranslate = expandedHeight - collapsedHeight;
  const translateY = useSharedValue(maxTranslate); // starts collapsed

  const { handleGesture, headerGesture } = useMemo(() => {
    const makePan = () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10]) // ignore taps and tiny jitters
        .failOffsetX([-30, 30])
        .onChange((e) => {
          translateY.value = Math.min(maxTranslate, Math.max(0, translateY.value + e.changeY));
        })
        .onEnd((e) => {
          const shouldExpand = translateY.value < maxTranslate / 2 || e.velocityY < -300;
          translateY.value = withSpring(shouldExpand ? 0 : maxTranslate, SPRING, (done) => {
            if (done && onSettle) scheduleOnRN(onSettle, shouldExpand);
          });
        });

    const tap = Gesture.Tap().onEnd(() => {
      const isCollapsed = translateY.value > maxTranslate / 2;
      translateY.value = withSpring(isCollapsed ? 0 : maxTranslate, SPRING, (done) => {
        if (done && onSettle) scheduleOnRN(onSettle, isCollapsed);
      });
    });

    return { handleGesture: Gesture.Race(makePan(), tap), headerGesture: makePan() };
  }, [maxTranslate, translateY, onSettle]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const g = glass.light;

  return (
    <Animated.View style={[styles.sheet, { height: expandedHeight }, sheetStyle]}>
      <View style={[styles.clip, { borderColor: g.border }]}>
        <BlurView intensity={g.blur} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: g.fill }]} />
        <LinearGradient colors={g.sheen} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

        <FlatGlassProvider value>
          <GestureDetector gesture={handleGesture}>
            <View style={styles.handleHit} accessibilityRole="button" accessibilityLabel="Toggle discovery panel">
              <View style={styles.handle} />
            </View>
          </GestureDetector>

          <GestureDetector gesture={headerGesture}>
            <View style={styles.headerZone}>{header}</View>
          </GestureDetector>

          <View style={[styles.body, { paddingBottom: navOccupied(insets.bottom) + spacing.md }]}>{children}</View>
        </FlatGlassProvider>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  clip: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  handleHit: { paddingTop: spacing.sm, paddingBottom: spacing.md, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(36, 22, 35, 0.2)' },
  headerZone: { paddingHorizontal: spacing.xl },
  body: { flex: 1, paddingHorizontal: spacing.xl },
});
