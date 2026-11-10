import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { BackHeader } from '@/components/BackHeader';
import { FilterChips } from '@/components/FilterChips';
import { GlassButton } from '@/components/GlassButton';
import { FlatGlassProvider, GlassSurface } from '@/components/GlassSurface';
import { Pill } from '@/components/Pill';
import { ScreenBackground } from '@/components/ScreenBackground';
import { acceptRequest, declineRequest, meId, otherOf, useChat, userOf } from '@/data/chatStore';
import { colors, radius, spacing, typography } from '@/theme';
import type { ChatSession } from '@/types/chat';
import { timeAgo } from '@/utils/time';

type Tab = 'incoming' | 'outgoing';

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

/** Talk requests: incoming (accept / decline) and the ones you sent (pending / declined). */
export default function ChatRequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sessions } = useChat();
  const [tab, setTab] = useState<Tab>('incoming');

  const incoming = useMemo(() => sessions.filter((s) => s.status === 'requested' && s.requested_by !== meId()), [sessions]);
  const outgoing = useMemo(() => sessions.filter((s) => (s.status === 'requested' || s.status === 'rejected') && s.requested_by === meId()), [sessions]);
  const data = tab === 'incoming' ? incoming : outgoing;

  const open = (s: ChatSession) => router.push({ pathname: '/chat', params: { chatId: s.chat_id } });

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader title="Requests" caption="People who want to talk" fallback="/map" />

      <View style={styles.filters}>
        <FilterChips<Tab>
          options={[
            { key: 'incoming', label: 'Incoming', count: incoming.length },
            { key: 'outgoing', label: 'Sent', count: outgoing.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <FlatGlassProvider value>
        <FlatList
          data={data}
          keyExtractor={(s) => s.chat_id}
          renderItem={({ item }) => {
            const other = userOf(otherOf(item));
            return (
              <Pressable onPress={() => open(item)} accessibilityRole="button" accessibilityLabel={other.display_name} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
                <GlassSurface tone="light" radius={radius.lg} raised contentStyle={styles.card}>
                  <View style={styles.top}>
                    <Avatar uri={other.profile_image_url} name={other.display_name} size={44} />
                    <View style={styles.body}>
                      <Text style={[typography.cardTitle, styles.name]} numberOfLines={1}>{other.display_name}</Text>
                      <Text style={[typography.caption, styles.meta]} numberOfLines={1}>@{other.username} · {item.last_message ? timeAgo(item.last_message.timestamp) : ''}</Text>
                    </View>
                    {tab === 'outgoing' ? (
                      item.status === 'rejected' ? <Pill icon="x-circle" label="Declined" tone="muted" /> : <Pill icon="clock" label="Pending" />
                    ) : null}
                  </View>
                  {item.last_message ? (
                    <Text style={[typography.caption, styles.preview]} numberOfLines={2}>“{item.last_message.message}”</Text>
                  ) : null}
                  {tab === 'incoming' ? (
                    <View style={styles.btns}>
                      <GlassButton label="Decline" size="sm" variant="secondary" style={styles.flex} onPress={() => declineRequest(item.chat_id)} />
                      <GlassButton label="Accept" size="sm" variant="primary" style={styles.flex} onPress={() => acceptRequest(item.chat_id)} />
                    </View>
                  ) : null}
                </GlassSurface>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={<Text style={[typography.body, styles.empty]}>{tab === 'incoming' ? 'No requests right now.' : 'You haven’t sent any requests.'}</Text>}
          contentContainerStyle={{ paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          showsVerticalScrollIndicator={false}
        />
      </FlatGlassProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  filters: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  card: { padding: spacing.sm + 2, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  body: { flex: 1, gap: 1 },
  name: { color: colors.textPrimary, ...typography.rowTitle },
  meta: { color: colors.textMuted, ...typography.rowMeta },
  preview: { color: colors.ink, ...typography.rowMeta, fontSize: 13, lineHeight: 18 },
  btns: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
});
