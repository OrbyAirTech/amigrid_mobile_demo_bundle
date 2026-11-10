import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { BackHeader } from '@/components/BackHeader';
import { GlassButton } from '@/components/GlassButton';
import { GlassInput } from '@/components/GlassInput';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ApiError } from '@/data/api/client';
import { refreshMyProfile, useMyProfile } from '@/data/currentUserStore';
import { updateProfile, uploadProfilePhoto } from '@/data/profileApi';
import { colors, fonts, spacing, typography } from '@/theme';

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/;
const MAX_LINKS = 3;

/** Edit display name, username, bio, links and photo. The server takes the full set on every save. */
export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useMyProfile();
  const me = profile?.basicInitial;

  const [displayName, setDisplayName] = useState(me?.display_name ?? '');
  const [username, setUsername] = useState(me?.username ?? '');
  const [bio, setBio] = useState(me?.bio ?? '');
  const [links, setLinks] = useState<string[]>(me?.links?.length ? me.links : ['']);
  const [photo, setPhoto] = useState<{ uri: string; name: string; mime: string } | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!me) return null;

  const cleanLinks = links.map((l) => l.trim()).filter(Boolean);
  const errors = {
    displayName: displayName.trim().length < 1 ? 'Enter a name' : displayName.trim().length > 60 ? 'Up to 60 characters' : '',
    username: USERNAME_RE.test(username.trim()) ? '' : '3 to 30 letters, numbers, _ or -',
    bio: bio.length > 300 ? 'Up to 300 characters' : '',
  };
  const invalid = Boolean(errors.displayName || errors.username || errors.bio);
  const changed =
    !!photo ||
    displayName.trim() !== me.display_name ||
    username.trim() !== me.username ||
    bio.trim() !== (me.bio ?? '') ||
    cleanLinks.join('\n') !== (me.links ?? []).join('\n');

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos are off', 'Allow photo access in Settings to choose a profile picture.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const ext = (a.uri.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    setPhoto({ uri: a.uri, name: `profile-${Date.now()}.${ext}`, mime: a.mimeType ?? (ext === 'png' ? 'image/png' : 'image/jpeg') });
  };

  const save = async () => {
    setTouched(true);
    if (invalid || busy) return;
    setBusy(true);
    try {
      const pic = photo ? await uploadProfilePhoto(photo.uri, photo.name, photo.mime) : me.profile_pic_url ?? '';
      await updateProfile({
        username: username.trim(),
        display_name: displayName.trim(),
        bio: bio.trim(),
        links: cleanLinks,
        profile_pic_url: pic,
      });
      await refreshMyProfile();
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t save', e instanceof ApiError ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const setLink = (i: number, v: string) => setLinks((cur) => cur.map((l, idx) => (idx === i ? v : l)));

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackHeader title="Edit profile" fallback="/profile" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}
        >
          <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel="Change profile photo" style={styles.photo}>
            <Avatar uri={photo?.uri ?? me.profile_pic_url} name={displayName || me.username} size={88} ring />
            <Text style={[typography.caption, styles.photoLabel]}>Change photo</Text>
          </Pressable>

          <GlassInput
            label="Display name"
            icon="user"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={60}
            error={touched ? errors.displayName : undefined}
          />
          <GlassInput
            label="Username"
            icon="at-sign"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
            error={touched ? errors.username : undefined}
          />
          <GlassInput
            label="Bio"
            icon="edit-3"
            value={bio}
            onChangeText={setBio}
            maxLength={300}
            hint={`${bio.length}/300`}
            error={touched ? errors.bio : undefined}
          />

          <View style={styles.linksHead}>
            <Text style={[typography.caption, styles.section]}>LINKS</Text>
            {links.length < MAX_LINKS ? (
              <Pressable onPress={() => setLinks((c) => [...c, ''])} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add link">
                <Feather name="plus" size={18} color={colors.ink} />
              </Pressable>
            ) : null}
          </View>
          {links.map((l, i) => (
            <GlassInput
              key={i}
              label={`Link ${i + 1}`}
              icon="link"
              value={l}
              onChangeText={(v) => setLink(i, v)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="example.com"
              rightElement={
                <Pressable
                  onPress={() => setLinks((c) => (c.length > 1 ? c.filter((_, idx) => idx !== i) : ['']))}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove link ${i + 1}`}
                >
                  <Feather name="x" size={18} color={colors.textMuted} />
                </Pressable>
              }
            />
          ))}

          <GlassButton
            label={busy ? 'Saving…' : 'Save changes'}
            variant="dark"
            size="md"
            disabled={busy || !changed}
            onPress={save}
            style={{ marginTop: spacing.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  photo: { alignItems: 'center', gap: spacing.xs },
  photoLabel: { color: colors.ink, fontFamily: fonts.semibold },
  linksHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  section: { color: colors.textMuted, letterSpacing: 0.6, fontFamily: fonts.semibold },
});
