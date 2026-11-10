import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { useChatBadge } from '@/data/chatStore';
import { CountBadge } from './CountBadge';
import { GlassSurface } from './GlassSurface';
import { HEADER_BUTTON_SIZE } from './HeaderProfileButton';

type Props = { count?: number; onPress?: () => void };

/** Top-right corner button: messages, with the unread count. */
export function HeaderMessagesButton({ count, onPress }: Props) {
  const router = useRouter();
  const badge = useChatBadge();
  const shown = count ?? badge; // unread chats + incoming requests, unless a caller passes its own
  return (
    <Pressable
      onPress={onPress ?? (() => router.push('/chats'))}
      accessibilityRole="button"
      accessibilityLabel={shown > 0 ? `Messages, ${shown} unread` : 'Messages'}
      hitSlop={6}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <View>
        <GlassSurface tone="floating" radius={HEADER_BUTTON_SIZE / 2} raised contentStyle={styles.center}>
          <Feather name="message-circle" size={22} color={colors.ink} />
        </GlassSurface>
        <CountBadge count={shown} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { width: HEADER_BUTTON_SIZE - 2, height: HEADER_BUTTON_SIZE - 2, alignItems: 'center', justifyContent: 'center' },
});
