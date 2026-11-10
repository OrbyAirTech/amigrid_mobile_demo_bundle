import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
};

/** Bottom sheet on frosted glass: blurred backdrop + a sliding glass panel. Used for the birthday picker. */
export function GlassSheet({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(220)}
        exiting={SlideOutDown.duration(180)}
        style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.fill]} />
        <View style={styles.handle} />
        {title ? <Text style={[typography.cardTitle, styles.title]}>{title}</Text> : null}
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  fill: { backgroundColor: 'rgba(243, 241, 244, 0.88)' },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(36, 22, 35, 0.2)',
    marginBottom: spacing.md,
  },
  title: { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.md },
});
