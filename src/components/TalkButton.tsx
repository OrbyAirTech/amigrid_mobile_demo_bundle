import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { dropExpiredWith, chatIdFor, meId, useTalkState } from '@/data/chatStore';
import { GlassButton } from './GlassButton';

/** Opens the conversation with this person. With no live chat it opens an empty one: the first message is the talk request. */
export function openTalk(router: ReturnType<typeof useRouter>, userId: string) {
  dropExpiredWith(userId);
  router.push({ pathname: '/chat', params: { chatId: 'none', userId } });
}

const LABEL = { none: 'Request talk', expired: 'Request talk', chat: 'Message', pending: 'Requested', incoming: 'Respond', declined: 'Declined' } as const;

/** Small button for people lists (amigos, grid members): asks to talk, or opens the chat you already have. */
export function TalkButton({ userId }: { userId: string }) {
  const router = useRouter();
  const st = useTalkState(userId);
  if (!userId || userId === meId()) return null;

  const press = () => {
    if (st === 'chat' || st === 'pending') router.push({ pathname: '/chat', params: { chatId: chatIdFor(meId(), userId), userId } });
    else if (st === 'incoming') router.push('/chat-requests');
    else if (st !== 'declined') openTalk(router, userId);
  };

  return (
    <GlassButton
      label={LABEL[st]}
      size="sm"
      variant={st === 'none' || st === 'expired' ? 'primary' : 'secondary'}
      disabled={st === 'declined'}
      onPress={press}
      style={styles.btn}
    />
  );
}

const styles = StyleSheet.create({ btn: { minWidth: 0, paddingHorizontal: 10 } });
