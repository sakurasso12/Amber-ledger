import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { SPRING } from '@/theme/motion';
import { useSettingsStore } from '@/store/useSettingsStore';
import { deletePersistedImage, pickAndPersistImage } from '@/lib/imagePicker';
import { MIN_PASSWORD_LENGTH, setProfilePassword } from '@/lib/password';
import { haptics } from '@/lib/haptics';
import { Button, PressableScale, Text, TextField, useKeyboardHeight } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { AppLanguage } from '@/types';
import { TourCards } from './TourCards';

type Step = 'language' | 'profile' | 'tour';
const STEPS: Step[] = ['language', 'profile', 'tour'];

/** Each language names itself, so the list reads right before anything is picked. */
const LANGUAGES: { value: AppLanguage; label: string; code: string }[] = [
  { value: 'en', label: 'English', code: 'EN' },
  { value: 'ru', label: 'Русский', code: 'RU' },
  { value: 'uk', label: 'Українська', code: 'UK' },
];

const AVATAR_SIZE = 104;

/**
 * First launch: pick a language → create the profile → a short tour of the app.
 * The first two steps cover the app; the tour sits over it, dimmed. Ends by setting
 * settings.onboardingDone (Settings → Welcome tour brings it back).
 */
export function Onboarding() {
  const done = useSettingsStore((s) => s.settings.onboardingDone);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('language');
  const tourBack = useRef<(() => boolean) | null>(null);
  const router = useRouter();

  // Start from the first step every time it opens.
  useEffect(() => {
    if (!done) setStep('language');
  }, [done]);

  // Steps slide in from the side and fade, with the app's spring.
  const enter = useRef(new Animated.Value(1)).current;
  function go(next: Step) {
    haptics.tap();
    enter.setValue(0);
    setStep(next);
    Animated.spring(enter, { toValue: 1, ...SPRING, useNativeDriver: true }).start();
  }

  // Whatever screen it was started from, you land on Tasks.
  function finish() {
    updateSettings({ onboardingDone: true });
    router.navigate('/');
  }

  function back() {
    if (step === 'tour' && tourBack.current?.()) return;
    const i = STEPS.indexOf(step);
    if (i > 0) go(STEPS[i - 1]);
  }

  const isTour = step === 'tour';

  return (
    <Modal visible={!done} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={back}>
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
          // Language and profile cover the app; the tour shows it dimmed behind the cards.
          { backgroundColor: isTour ? 'rgba(0,0,0,0.62)' : theme.colors.background },
        ]}
      >
        <Animated.View
          style={[
            styles.flex,
            {
              opacity: enter,
              transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            },
          ]}
        >
          {step === 'language' ? <LanguageStep onNext={() => go('profile')} /> : null}
          {step === 'profile' ? <ProfileStep onBack={() => go('language')} onNext={() => go('tour')} /> : null}
          {isTour ? <TourCards backRef={tourBack} onFinish={finish} /> : null}
        </Animated.View>

        {!isTour ? <StepDots step={STEPS.indexOf(step)} /> : null}
      </View>
    </Modal>
  );
}

function StepDots({ step }: { step: number }) {
  const theme = useTheme();
  return (
    <View style={styles.stepDots}>
      {STEPS.map((_, i) => (
        <View
          key={i}
          style={[styles.stepDot, { backgroundColor: i === step ? theme.colors.primary : theme.colors.border }, i === step && styles.stepDotActive]}
        />
      ))}
    </View>
  );
}

function LanguageStep({ onNext }: { onNext: () => void }) {
  const theme = useTheme();
  const tr = useTranslation();
  const language = useSettingsStore((s) => s.settings.language);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <View style={styles.step}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}22` }]}>
          <Ionicons name="language" size={38} color={theme.colors.primary} />
        </View>
        {/* Before a language is chosen, ask in all three. */}
        <Text style={[styles.title, { color: theme.colors.text }]}>Language · Язык · Мова</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Amber Ledger</Text>
      </View>

      <View style={styles.options}>
        {LANGUAGES.map((lang) => {
          const selected = language === lang.value;
          return (
            <PressableScale
              key={lang.value}
              scaleTo={0.97}
              onPress={() => {
                haptics.tap();
                updateSettings({ language: lang.value });
              }}
              style={[styles.option, cardSurface(theme), selected && { borderColor: theme.colors.primary, borderWidth: 2 }]}
            >
              <View style={[styles.code, { backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAlt }]}>
                <Text style={{ color: selected ? theme.colors.primaryText : theme.colors.textMuted, fontWeight: '800', fontSize: 13 }}>
                  {lang.code}
                </Text>
              </View>
              <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{lang.label}</Text>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? theme.colors.primary : theme.colors.textMuted}
              />
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.flex} />
      <Button title={tr.onboarding.continue} onPress={onNext} />
    </View>
  );
}

function ProfileStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const theme = useTheme();
  const tr = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const keyboardHeight = useKeyboardHeight();
  const [name, setName] = useState(settings.profileName);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePickAvatar() {
    const uri = await pickAndPersistImage({ aspect: [1, 1] });
    if (!uri) return;
    if (settings.profileAvatarUri) await deletePersistedImage(settings.profileAvatarUri);
    updateSettings({ profileAvatarUri: uri });
  }

  async function handleNext() {
    setError(null);
    // The password is optional, but if one is typed it has to be valid.
    if (password || repeat) {
      if (password.length < MIN_PASSWORD_LENGTH) return setError(tr.profileSettings.tooShort(MIN_PASSWORD_LENGTH));
      if (password !== repeat) return setError(tr.profileSettings.mismatch);
      setBusy(true);
      await setProfilePassword(password);
      setBusy(false);
      updateSettings({ profilePasswordSet: true });
    }
    updateSettings({ profileName: name.trim() });
    onNext();
  }

  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <View style={[styles.flex, { marginBottom: keyboardHeight }]}>
      <ScrollView contentContainerStyle={styles.profileContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{tr.onboarding.profileTitle}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{tr.onboarding.profileSubtitle}</Text>
        </View>

        <Pressable onPress={handlePickAvatar} style={[styles.avatar, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.primary }]}>
          {settings.profileAvatarUri ? (
            <Image source={{ uri: settings.profileAvatarUri }} style={styles.avatarImage} resizeMode="cover" />
          ) : initial ? (
            <Text style={[styles.avatarInitial, { color: theme.colors.primary }]}>{initial}</Text>
          ) : (
            <Ionicons name="person" size={44} color={theme.colors.textMuted} />
          )}
          <View style={[styles.avatarBadge, { backgroundColor: theme.colors.primary, borderColor: theme.colors.background }]}>
            <Ionicons name="camera" size={15} color={theme.colors.primaryText} />
          </View>
        </Pressable>

        <TextField value={name} onChangeText={setName} placeholder={tr.profileSettings.namePlaceholder} maxLength={40} />

        <View style={[styles.passwordCard, cardSurface(theme)]}>
          <Text style={[styles.passwordTitle, { color: theme.colors.text }]}>{tr.onboarding.passwordTitle}</Text>
          {settings.profilePasswordSet ? (
            <Text style={{ color: theme.colors.success, fontSize: 13, fontWeight: '600' }}>{tr.onboarding.passwordAlreadySet}</Text>
          ) : (
            <>
              <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.onboarding.passwordHint}</Text>
              <TextField value={password} onChangeText={setPassword} placeholder={tr.onboarding.passwordPlaceholder} secureTextEntry />
              <TextField value={repeat} onChangeText={setRepeat} placeholder={tr.onboarding.repeatPlaceholder} secureTextEntry />
            </>
          )}
          {error ? <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={styles.buttons}>
        <Button title={tr.onboarding.back} variant="secondary" onPress={onBack} style={styles.flex} />
        {busy ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.flex} />
        ) : (
          <Button title={tr.onboarding.continue} onPress={handleNext} disabled={!name.trim()} style={styles.flex} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },
  step: { flex: 1, paddingHorizontal: 24, gap: 24 },
  header: { alignItems: 'center', gap: 10, paddingTop: 24 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  options: { gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  code: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { flex: 1, fontSize: 17, fontWeight: '700' },
  profileContent: { paddingHorizontal: 24, gap: 20, paddingBottom: 16, alignItems: 'stretch' },
  avatar: {
    alignSelf: 'center',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: AVATAR_SIZE - 4, height: AVATAR_SIZE - 4, borderRadius: (AVATAR_SIZE - 4) / 2 },
  avatarInitial: { fontSize: 40, fontWeight: '800' },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordCard: { padding: 16, gap: 10 },
  passwordTitle: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17 },
  buttons: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingTop: 8 },
  stepDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 18 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  stepDotActive: { width: 22 },
});
