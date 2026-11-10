import { Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { BlinkingOutline } from '@/components/BlinkingOutline';
import { GlassButton } from '@/components/GlassButton';
import { CreateStoreSheet } from '@/components/CreateStoreSheet';
import { GlassIconButton } from '@/components/GlassIconButton';
import { GlassSheet } from '@/components/GlassSheet';
import { NavTabBar } from '@/components/NavTabBar';
import { ProfileCounters } from '@/components/ProfileCounters';
import { ProfileHeader, profileHeaderOffset } from '@/components/ProfileHeader';
import { ProfilePostsGrid } from '@/components/ProfilePostsGrid';
import { BACKGROUNDS, ScreenBackground } from '@/components/ScreenBackground';
import { SheetAction } from '@/components/SheetAction';
import { nextBackground } from '@/data/backgroundStore';
import { ApiError } from '@/data/api/client';
import { logout } from '@/data/authApi';
import { useBroadcasting } from '@/data/broadcastStore';
import { refreshMyProfile, saveSettings, useMyProfile } from '@/data/currentUserStore';
import { colors, fonts, navOccupied, radius, spacing, typography } from '@/theme';

const AVATAR = 72;

const prettyLink = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
const openLink = (url: string) =>
  Linking.openURL(/^https?:\/\//i.test(url) ? url : `https://${url}`).catch(() => console.log('Could not open link', url));

/** Opened from the profile picture in the top-left corner of the Map, Feed, Search and Activity screens. */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, loading, error } = useMyProfile();
  const broadcasting = useBroadcasting();
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshMyProfile();
    setRefreshing(false);
  };

  const toggleBroadcast = async () => {
    if (switching) return;
    setSwitching(true);
    try {
      await saveSettings({ broadcast_location: !broadcasting });
    } catch (e) {
      Alert.alert('Couldn’t update visibility', e instanceof ApiError ? e.message : 'Please try again.');
    } finally {
      setSwitching(false);
    }
  };

  const confirmLogout = () => {
    setMenuOpen(false);
    Alert.alert('Log out?', 'You’ll need to sign in again to use Amigrid.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const me = profile?.basicInitial;

  const shareProfile = async () => {
    if (!me) return;
    try {
      await Share.share({
        message: `${me.display_name} (@${me.username}) is on Amigrid. ${Linking.createURL(`u/${me.username}`)}`,
      });
    } catch {
      // user dismissed the sheet, nothing to do
    }
  };

  return (
    <View style={styles.root}>
      <ScreenBackground />

      {profile && me ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
          contentContainerStyle={{
            paddingTop: profileHeaderOffset(insets.top),
            paddingBottom: navOccupied(insets.bottom) + spacing.lg,
            paddingHorizontal: spacing.lg,
            gap: spacing.md,
          }}
        >
          {/* Picture in the corner, edit button on the same row. */}
          <View style={styles.identity}>
            <Avatar uri={me.profile_pic_url} name={me.display_name} size={AVATAR} ring />
            <View style={styles.names}>
              <Text style={styles.name} numberOfLines={1}>
                {me.display_name}
              </Text>
              <Text style={[typography.caption, styles.handle]} numberOfLines={1}>
                @{me.username}
              </Text>
            </View>
            <GlassIconButton
              icon="edit-2"
              label="Edit profile"
              size={40}
              onPress={() => router.push('/edit-profile')}
            />
          </View>

          {me.bio || me.links.length > 0 ? (
            <View style={styles.about}>
              {me.bio ? <Text style={[typography.cardBody, styles.bio]}>{me.bio}</Text> : null}
              {me.links.length > 0 ? (
                <View style={styles.links}>
                  {me.links.map((l) => (
                    <Pressable
                      key={l}
                      onPress={() => openLink(l)}
                      accessibilityRole="link"
                      accessibilityLabel={prettyLink(l)}
                      hitSlop={6}
                      style={styles.link}
                    >
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

          <ProfileCounters
            amigos={profile.amigos_count}
            grid={profile.space_count}
            store={profile.business_count}
            onPressAmigos={() => router.push('/amigos')}
            onPressGrid={() => router.push('/grids')}
            onPressStore={() => router.push('/stores')}
          />

          <View style={styles.actions}>
            <GlassButton
              label="Share Profile"
              size="sm"
              variant="primary"
              leading={<Feather name="share-2" size={14} color={colors.ink} />}
              onPress={shareProfile}
              style={styles.action}
            />
            {/* Same glass either way; while broadcasting a thin solid outline blinks around it (like the live stat card). */}
            <View style={styles.action}>
              <GlassButton
                label={broadcasting ? 'Broadcasting' : 'Location hidden'}
                size="sm"
                variant="secondary"
                selected={broadcasting}
                leading={
                  <Feather
                    name={broadcasting ? 'radio' : 'eye-off'}
                    size={14}
                    color={broadcasting ? colors.danger : colors.textMuted}
                  />
                }
                onPress={toggleBroadcast}
              />
              <BlinkingOutline active={broadcasting} radius={radius.md} />
            </View>
          </View>

          <GlassButton
            label="Create a store"
            size="sm"
            variant="secondary"
            leading={<Feather name="plus-circle" size={14} color={colors.ink} />}
            onPress={() => setStoreOpen(true)}
          />

          <View style={styles.sectionHead}>
            <View style={styles.sectionTitle}>
              <Feather name="image" size={17} color={colors.ink} />
              <Text style={[typography.cardTitle, styles.sectionText]}>My Posts</Text>
            </View>
            <Text style={[typography.caption, styles.sectionCount]}>{profile.posts.length} posts</Text>
          </View>

          <ProfilePostsGrid posts={profile.posts} onOpen={(p) => console.log('Open post', p.id)} />
        </ScrollView>
      ) : (
        <View style={[styles.state, { marginTop: profileHeaderOffset(insets.top) + spacing.xl }]}>
          {loading ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <>
              <Text style={[typography.body, styles.error]}>{error ?? 'Couldn’t load your profile.'}</Text>
              <GlassButton label="Try again" size="sm" variant="primary" onPress={() => refreshMyProfile()} style={styles.retry} />
            </>
          )}
        </View>
      )}

      {/* Floating glass header: declared after the list so it hovers over it while scrolling. */}
      <ProfileHeader onMenu={() => setMenuOpen(true)} />

      <GlassSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <SheetAction
          icon="settings"
          label="Settings"
          divider={false}
          onPress={() => {
            setMenuOpen(false);
            router.push('/settings');
          }}
        />
        <SheetAction
          icon="image"
          label="Switch background"
          onPress={() => {
            nextBackground(BACKGROUNDS.length);
            setMenuOpen(false);
          }}
        />
        {/* Paid wallpapers aren't built yet, so this stays unselectable. */}
        <SheetAction icon="compass" label="Explore wallpapers" badge="Premium" disabled onPress={() => {}} />
        <SheetAction icon="log-out" label="Log out" danger onPress={confirmLogout} />
      </GlassSheet>

      <CreateStoreSheet visible={storeOpen} onClose={() => setStoreOpen(false)} />
      <NavTabBar active="profile" />
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
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionText: { color: colors.textPrimary },
  sectionCount: { color: colors.textMuted },
  state: { alignItems: 'center', gap: spacing.md },
  retry: { minWidth: 140 },
  error: { color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
});
