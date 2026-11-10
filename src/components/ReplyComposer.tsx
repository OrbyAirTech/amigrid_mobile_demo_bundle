import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, navOccupied, radius, spacing, typography } from '@/theme';
import type { PostReturner } from '@/types/feed';
import { GlassSurface } from './GlassSurface';

export type ReplyMode = 'dm' | 'post';

type Props = {
  target: PostReturner;
  /** 'dm' = private message to the author (local feed). 'post' = public standalone comment post (grid). */
  mode: ReplyMode;
  /** Omit to hide the close button (e.g. when the target can't be changed). */
  onCancel?: () => void;
  /** Distance from the screen bottom when the keyboard is closed. Defaults to just above the floating nav bar. */
  bottomOffset?: number;
  autoFocus?: boolean;
  onSend: (text: string) => void;
};

export function useKeyboardHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setH(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setH(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return h;
}

/** Telegram-style reply bar: a quoted preview of the post being answered, then the input. */
export function ReplyComposer({ target, mode, onCancel, bottomOffset, autoFocus = true, onSend }: Props) {
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0;
  const resting = bottomOffset ?? navOccupied(insets.bottom) + spacing.sm;
  const bottom = kb > 0 ? kb + spacing.sm : resting;

  return (
    <View style={[styles.wrap, { bottom }]}>
      <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.card}>
        <View style={styles.quote}>
          <View style={styles.accent} />
          <View style={styles.quoteBody}>
            <View style={styles.quoteTitleRow}>
              <Feather name={mode === 'dm' ? 'lock' : 'corner-up-left'} size={12} color={colors.ink} />
              <Text style={[typography.caption, styles.quoteTitle]} numberOfLines={1}>
                {mode === 'dm' ? `Private reply to ${target.author_display_name}` : `Replying to ${target.author_display_name}`}
              </Text>
            </View>
            <Text style={[typography.caption, styles.quoteText]} numberOfLines={1}>
              {target.content || 'Photo'}
            </Text>
          </View>
          {onCancel ? (
            <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancel reply">
              <Feather name="x" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            autoFocus={autoFocus}
            value={text}
            onChangeText={setText}
            placeholder={mode === 'dm' ? 'Send a private message…' : 'Add your reply…'}
            placeholderTextColor={colors.textMuted}
            multiline
            style={[typography.cardBody, styles.input]}
          />
          <Pressable
            disabled={!canSend}
            onPress={() => {
              onSend(text.trim());
              setText('');
            }}
            accessibilityRole="button"
            accessibilityLabel="Send reply"
            style={[styles.send, { opacity: canSend ? 1 : 0.45 }]}
          >
            <Feather name="arrow-up" size={18} color={colors.white} />
          </Pressable>
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md },
  card: { padding: spacing.sm + 2, gap: spacing.xs + 2 },
  quote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  accent: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.ink },
  quoteBody: { flex: 1, gap: 2 },
  quoteTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  quoteTitle: { color: colors.ink, fontFamily: typography.cardTitle.fontFamily },
  quoteText: { color: colors.textMuted },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: { flex: 1, color: colors.textPrimary, maxHeight: 96, paddingVertical: 4, paddingHorizontal: 4 },
  send: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
