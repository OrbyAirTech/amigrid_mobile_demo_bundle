import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmigoRow } from '@/components/AmigoRow';
import { BackHeader } from '@/components/BackHeader';
import { GlassButton } from '@/components/GlassButton';
import { FlatGlassProvider } from '@/components/GlassSurface';
import { ScreenBackground } from '@/components/ScreenBackground';
import { unblockUser, unmuteUser, useChat } from '@/data/chatStore';
import { colors, spacing, typography } from '@/theme';

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

/** Blocked users or muted users (?kind=blocked | muted), each with a one-tap undo. */
export default function ChatPeopleScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const insets = useSafeAreaInsets();
  const { blocked, muted } = useChat();
  const isBlocked = kind !== 'muted';
  const list = isBlocked ? blocked : muted;

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader title={isBlocked ? 'Blocked users' : 'Muted users'} caption={isBlocked ? 'They can’t message you' : 'No notifications, messages still arrive'} fallback="/map" />

      <FlatGlassProvider value>
        <FlatList
          data={list}
          keyExtractor={(u) => u.user_id}
          renderItem={({ item }) => (
            <AmigoRow
              user={{ user_id: item.user_id, username: item.display_name, profile_pic_url: item.profile_image_url ?? '', bio: `@${item.username}` }}
              right={
                <GlassButton
                  label={isBlocked ? 'Unblock' : 'Unmute'}
                  size="sm"
                  variant="secondary"
                  onPress={() => (isBlocked ? unblockUser : unmuteUser)(item.user_id)}
                />
              }
            />
          )}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={<Text style={[typography.body, styles.empty]}>{isBlocked ? 'You haven’t blocked anyone.' : 'You haven’t muted anyone.'}</Text>}
          contentContainerStyle={{ paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          showsVerticalScrollIndicator={false}
        />
      </FlatGlassProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
});
