import { Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { BackHeader } from '@/components/BackHeader';
import { GlassButton } from '@/components/GlassButton';
import { GlassIconButton } from '@/components/GlassIconButton';
import { ReportSheet } from '@/components/ReportSheet';
import { Pill } from '@/components/Pill';
import { ProfileCounters } from '@/components/ProfileCounters';
import { ProfilePostsGrid } from '@/components/ProfilePostsGrid';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ApiError } from '@/data/api/client';
import { sendAmigoRequest } from '@/data/discoveryApi';
import { getSessionUser } from '@/data/currentUserStore';
import { getUserProfile } from '@/data/profileApi';
import { colors, fonts, spacing, typography } from '@/theme';
import type { UserProfile } from '@/types/profile';

const AVATAR = 72;

const prettyLink = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
const openLink = (url: string) =>
  Linking.openURL(/^https?:\/\//i.test(url) ? url : `https://${url}`).catch(() => console.log('Could not open link', url));

/**
 * Someone else's profile, opened by tapping their card in search. Opening it tells them you looked (the server
 * allows that once a day per viewer), so it loads once per visit and only refreshes when you pull down.
 */
export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, amigo } = useLocalSearchParams<{ id: string; amigo?: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requested, setRequested] = useState(false);
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const asked = useRef('');

  const load = useCallback(async (pull: boolean) => {
    if (!id) return;
    if (pull) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setProfile(await getUserProfile(id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t load this profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!id || asked.current === id) return;
    asked.current = id;
    // Your own profile has its own screen (and the server would notify you about yourself).
    if (String(getSessionUser()?.id) === id) {
      router.replace('/profile');
      return;
    }
    load(false);
  }, [id, load, router]);

  const them = profile?.basicInitial;
  const isAmigo = amigo === '1';

  const sendRequest = async () => {
    if (!id || sending) return;
    setSending(true);
    try {
      await sendAmigoRequest(id);
      setRequested(true);
    } catch (e) {
      Alert.alert('Could not send request', e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader
        title={them?.display_name ?? 'Profile'}
        caption={them ? `@${them.username}` : undefined}
        right={them ? <GlassIconButton icon="flag" label="Report" size={40} onPress={() => setReportOpen(true)} /> : undefined}
      />
      {them && id ? <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} kind="user" targetId={id} targetName={them.display_name} /> : null}

      {profile && them ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.ink} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}
        >
          <View style={styles.identity}>
            <Avatar uri={them.profile_pic_url} name={them.display_name} size={AVATAR} ring />
            <View style={styles.names}>
              <Text style={styles.name} numberOfLines={1}>
                {them.display_name}
              </Text>
              <Text style={[typography.caption, styles.handle]} numberOfLines={1}>
                @{them.username}
              </Text>
            </View>
          </View>

          {them.bio || them.links.length > 0 ? (
            <View style={styles.about}>
              {them.bio ? <Text style={[typography.cardBody, styles.bio]}>{them.bio}</Text> : null}
              {them.links.length > 0 ? (
                <View style={styles.links}>
                  {them.links.map((l) => (
                    <Pressable key={l} onPress={() => openLink(l)} accessibilityRole="link" accessibilityLabel={prettyLink(l)} hitSlop={6} style={styles.link}>
                      <Feather name="link" size={13} color={colors.ink} />
                      <Text style={[typography.caption, styles.linkText]} numberOfLines={1}>
                        {prettyLink(l)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <ProfileCounters amigos={profile.amigos_count} grid={profile.space_count} store={profile.business_count} onPressAmigos={() => router.push({ pathname: '/amigos', params: { userId: id, name: profile.basicInitial.display_name } })} onPressStore={() => router.push({ pathname: '/stores', params: { userId: id, name: profile.basicInitial.display_name } })} />

          <View style={styles.actions}>
            {isAmigo ? (
              <Pill icon="check" label="Amigos" tone="success" />
            ) : requested ? (
              <Pill icon="clock" label="Requested" tone="muted" />
            ) : (
              <GlassButton label={sending ? 'Sending…' : 'Send Request'} size="sm" variant="primary" disabled={sending} onPress={sendRequest} style={{ minWidth: 150 }} />
            )}
            <GlassButton label="Message" size="sm" variant="secondary" onPress={() => router.push({ pathname: '/chat', params: { chatId: 'none', userId: id } })} style={{ minWidth: 110 }} />
          </View>

          <View style={styles.sectionHead}>
            <Feather name="image" size={17} color={colors.ink} />
            <Text style={[typography.cardTitle, styles.sectionText]}>Posts</Text>
            <View style={{ flex: 1 }} />
            <Text style={[typography.caption, styles.handle]}>{profile.posts.length} posts</Text>
          </View>
          <ProfilePostsGrid posts={profile.posts} />
        </ScrollView>
      ) : (
        <View style={styles.state}>
          {loading ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <>
              <Text style={[typography.body, styles.errorText]}>{error ?? 'Couldn’t load this profile.'}</Text>
              <GlassButton label="Try again" size="sm" variant="primary" onPress={() => load(false)} style={{ minWidth: 140 }} />
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  names: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.extrabold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: colors.textPrimary },
  handle: { color: colors.textMuted },
  about: { gap: spacing.sm },
  bio: { color: colors.textPrimary },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xs },
  link: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
  linkText: { color: colors.ink, fontFamily: fonts.semibold, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  sectionText: { color: colors.textPrimary },
  state: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl },
  errorText: { color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
});
