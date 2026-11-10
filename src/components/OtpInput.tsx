import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, typography } from '@/theme';
import { GlassSurface } from './GlassSurface';

type Props = {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  error?: string;
};

export function OtpInput({ length = 5, value, onChange, onComplete, error }: Props) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.padEnd(length, ' ').split('').slice(0, length);
  const activeIndex = Math.min(value.length, length - 1);

  // Auto-focus once the push transition has settled — focusing immediately on
  // mount is what gets swallowed mid-animation and silently drops the keyboard.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  return (
    <View>
      <Pressable onPress={() => inputRef.current?.focus()} style={styles.row}>
        {digits.map((char, i) => {
          const filled = char !== ' ';
          const active = i === activeIndex;
          return (
            <GlassSurface
              key={i}
              tone="light"
              radius={radius.md}
              raised={active}
              borderColor={error ? colors.danger : active ? colors.ink : undefined}
              contentStyle={styles.box}
            >
              <Text style={[typography.title, styles.digit]}>{filled ? char : ''}</Text>
            </GlassSurface>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        accessibilityLabel={`${length}-digit verification code`}
        style={styles.hiddenInput}
        caretHidden
      />

      {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
    </View>
  );
}

const BOX = 56;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  box: { width: BOX, height: BOX + 8, alignItems: 'center', justifyContent: 'center' },
  digit: { color: colors.textPrimary },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
    top: 0,
    left: 0,
  },
  error: { color: colors.danger, marginTop: 10, textAlign: 'center' },
});