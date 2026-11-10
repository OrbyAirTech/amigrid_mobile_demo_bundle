import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { colors } from '@/theme';
import { GlassInput } from './GlassInput';

type Props = Omit<
  React.ComponentProps<typeof GlassInput>,
  'secureTextEntry' | 'rightElement' | 'icon'
>;

/** GlassInput preset for passwords: lock icon + a show/hide eye toggle. */
export function PasswordInput(props: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <GlassInput
      icon="lock"
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="password"
      rightElement={
        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          onPress={() => setVisible((v) => !v)}
        >
          <Feather name={visible ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
        </Pressable>
      }
      {...props}
    />
  );
}
