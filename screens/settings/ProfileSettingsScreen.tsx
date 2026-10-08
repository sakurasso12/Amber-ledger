import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button, Screen, SubScreenHeader, Text, TextField } from '@/components/ui';
import { deletePersistedImage, pickAndPersistImage } from '@/lib/imagePicker';
import { checkProfilePassword, MIN_PASSWORD_LENGTH, setProfilePassword } from '@/lib/password';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';

const AVATAR_SIZE = 112;

/** Settings → Profile: name, round avatar and the profile password. */
export function ProfileSettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  async function handlePickAvatar() {
    const uri = await pickAndPersistImage({ aspect: [1, 1] });
    if (!uri) return;
    if (settings.profileAvatarUri) await deletePersistedImage(settings.profileAvatarUri);
    updateSettings({ profileAvatarUri: uri });
  }

  async function handleRemoveAvatar() {
    if (settings.profileAvatarUri) await deletePersistedImage(settings.profileAvatarUri);
    updateSettings({ profileAvatarUri: null });
  }

  const initial = settings.profileName.trim().charAt(0).toUpperCase();

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.profileSettings.title} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarBlock}>
          <Pressable onPress={handlePickAvatar} style={[styles.avatar, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.primary }]}>
            {settings.profileAvatarUri ? (
              // The picker already crops to a square; borderRadius turns it into a circle.
              <Image source={{ uri: settings.profileAvatarUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : initial ? (
              <Text style={[styles.avatarInitial, { color: theme.colors.primary }]}>{initial}</Text>
            ) : (
              <Ionicons name="person" size={48} color={theme.colors.textMuted} />
            )}
            <View style={[styles.avatarBadge, { backgroundColor: theme.colors.primary, borderColor: theme.colors.background }]}>
              <Ionicons name="camera" size={16} color={theme.colors.primaryText} />
            </View>
          </Pressable>
          {settings.profileAvatarUri ? (
            <Pressable onPress={handleRemoveAvatar} hitSlop={8}>
              <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: '600' }}>{tr.profileSettings.removePhoto}</Text>
            </Pressable>
          ) : null}
        </View>

        <TextField
          value={settings.profileName}
          onChangeText={(profileName) => updateSettings({ profileName })}
          placeholder={tr.profileSettings.namePlaceholder}
          maxLength={40}
        />

        <PasswordSection />
      </ScrollView>
    </Screen>
  );
}

function PasswordSection() {
  const theme = useTheme();
  const tr = useTranslation();
  const passwordSet = useSettingsStore((s) => s.settings.profilePasswordSet);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setError(null);
    setSaved(false);
    if (next.length < MIN_PASSWORD_LENGTH) return setError(tr.profileSettings.tooShort(MIN_PASSWORD_LENGTH));
    if (next !== repeat) return setError(tr.profileSettings.mismatch);
    setBusy(true);
    if (passwordSet && !(await checkProfilePassword(current))) {
      setBusy(false);
      haptics.warning();
      return setError(tr.profileSettings.wrongPassword);
    }
    await setProfilePassword(next);
    updateSettings({ profilePasswordSet: true });
    setBusy(false);
    haptics.success();
    setCurrent('');
    setNext('');
    setRepeat('');
    setSaved(true);
  }

  return (
    <View style={[styles.section, cardSurface(theme)]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{tr.profileSettings.passwordSection}</Text>
        <Text style={{ color: passwordSet ? theme.colors.success : theme.colors.textMuted, fontSize: 12, fontWeight: '600' }}>
          {passwordSet ? tr.profileSettings.passwordSet : tr.profileSettings.passwordNotSet}
        </Text>
      </View>
      <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.profileSettings.passwordHint}</Text>

      {passwordSet ? (
        <TextField value={current} onChangeText={setCurrent} placeholder={tr.profileSettings.currentPassword} secureTextEntry />
      ) : null}
      <TextField value={next} onChangeText={setNext} placeholder={tr.profileSettings.newPassword} secureTextEntry />
      <TextField value={repeat} onChangeText={setRepeat} placeholder={tr.profileSettings.repeatPassword} secureTextEntry />

      {error ? <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text> : null}
      {saved ? <Text style={{ color: theme.colors.success, fontSize: 13 }}>✓ {tr.profileSettings.saved}</Text> : null}

      {busy ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <Button
          title={passwordSet ? tr.profileSettings.changePassword : tr.profileSettings.setPassword}
          onPress={handleSave}
          disabled={!next || !repeat || (!!passwordSet && !current)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 16 },
  avatarBlock: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: AVATAR_SIZE - 4, height: AVATAR_SIZE - 4, borderRadius: (AVATAR_SIZE - 4) / 2 },
  avatarInitial: { fontSize: 44, fontWeight: '800' },
  avatarBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17 },
});
