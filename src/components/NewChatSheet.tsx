import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchAmigos } from '@/data/amigosApi';
import { meId } from '@/data/chatStore';
import { searchUsers } from '@/data/searchApi';
import { colors, spacing, typography } from '@/theme';
import { Avatar } from './Avatar';
import { GlassSheet } from './GlassSheet';
import { SearchField } from './SearchField';

type Person = { id: string; username: string; name: string; pic: string };

/** Pick someone to message: your amigos to start with, or anyone you search for. */
export function NewChatSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    const q = term.trim();
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const list: Person[] = q
          ? (await searchUsers(q)).map((u) => ({ id: String(u.entity_id), username: u.username, name: u.display_name, pic: u.profile_pic_url }))
          : (await fetchAmigos(0)).map((u) => ({ id: String(u.user_id), username: u.username, name: u.username, pic: u.profile_pic_url }));
        if (live) setPeople(list.filter((p) => p.id !== meId()));
      } catch {
        if (live) setPeople([]);
      } finally {
        if (live) setBusy(false);
      }
    }, q ? 350 : 0);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [visible, term]);

  const pick = (p: Person) => {
    onClose();
    router.push({ pathname: '/chat', params: { chatId: 'none', userId: p.id } });
  };

  return (
    <GlassSheet visible={visible} onClose={onClose} title="New chat">
      <SearchField value={term} onChangeText={setTerm} placeholder="Search people…" />
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {busy && people.length === 0 ? <ActivityIndicator color={colors.ink} style={styles.pad} /> : null}
        {!busy && people.length === 0 ? (
          <Text style={[typography.caption, styles.empty]}>{term.trim() ? 'No one found.' : 'Your amigos show up here. Search to message anyone.'}</Text>
        ) : null}
        {people.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => pick(p)}
            accessibilityRole="button"
            accessibilityLabel={`Message ${p.name}`}
            style={[styles.person, i > 0 && styles.divider]}
          >
            <Avatar uri={p.pic} name={p.name} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.cardTitle, styles.name]} numberOfLines={1}>{p.name}</Text>
              {p.name !== p.username ? <Text style={[typography.caption, styles.handle]}>@{p.username}</Text> : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 320, marginTop: spacing.sm },
  pad: { paddingVertical: spacing.lg },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: 9 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(36, 22, 35, 0.1)' },
  name: { color: colors.textPrimary, ...typography.rowTitle },
  handle: { color: colors.textMuted, ...typography.rowMeta },
});
