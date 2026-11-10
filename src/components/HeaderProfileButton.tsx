import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSessionUser } from '@/data/currentUserStore';
import type { CurrentUserSummary } from '@/types/user';
import { navigateTab } from '@/utils/tabNav';
import { Avatar } from './Avatar';
import { CountBadge } from './CountBadge';
import { GlassSurface } from './GlassSurface';

export const HEADER_BUTTON_SIZE = 50;
const EMPTY_USER = { profile_image: null, display_name: '', notification_count: 0, settings_prompt_count: 0 };

type HeaderUser = Pick<CurrentUserSummary, 'profile_image' | 'display_name' | 'notification_count' | 'settings_prompt_count'>;
type Props = { user?: HeaderUser; onPress?: () => void };

/** Top-left corner button: the user's profile picture, with notification + settings-prompt count. Opens the profile screen. */
export function HeaderProfileButton({ user: userProp, onPress }: Props) {
  // The signed-in user once GET /user has loaded; an empty avatar until then.
  const loaded = useSessionUser();
  const user: HeaderUser = userProp ?? loaded ?? EMPTY_USER;
  const router = useRouter();
  const pathname = usePathname(); // "/feed" -> "feed", so the profile slides in from the left of wherever we are
  const count = user.notification_count + user.settings_prompt_count;
  return (
    <Pressable
      onPress={onPress ?? (() => navigateTab(router, pathname.split('/')[1] ?? '', 'profile'))}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Profile, ${count} updates` : 'Profile'}
      hitSlop={6}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <View>
        <GlassSurface tone="floating" radius={HEADER_BUTTON_SIZE / 2} raised contentStyle={styles.center}>
          <Avatar uri={user.profile_image} name={user.display_name} size={HEADER_BUTTON_SIZE - 10} />
        </GlassSurface>
        <CountBadge count={count} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { width: HEADER_BUTTON_SIZE - 2, height: HEADER_BUTTON_SIZE - 2, alignItems: 'center', justifyContent: 'center' },
});
