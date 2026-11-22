import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';
import VoiceInput from '@/modules/voice-input/src/VoiceInputModule';
import { useTranslation } from '@/i18n';
import { Alert } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';

interface QuickAddBarProps {
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad';
  onSubmit: (value: string) => void;
  onClose: () => void;
  /** Close the bar after one item is added (tasks) instead of staying open for the next. */
  closeOnSubmit?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Inline single-field capture row — revealed by long-pressing a screen's FAB for a faster path
 * than opening the full editor. Submitting keeps focus so multiple items can be added in a row;
 * closing (✕ or blur) dismisses it. */
export function QuickAddBar({ placeholder, keyboardType = 'default', onSubmit, onClose, closeOnSubmit = false, style }: QuickAddBarProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const [value, setValue] = useState('');
  const voice = keyboardType === 'default' && !!VoiceInput;
  const voiceSetting = useSettingsStore((s) => s.settings.voiceLanguage);
  const appLang = tr.localeCode.startsWith('uk') ? 'uk-UA' : tr.localeCode.startsWith('ru') ? 'ru-RU' : 'en-US';
  // The language Android will listen for — shown on the chip next to the mic.
  const voiceLang = voiceSetting === 'app' ? appLang : voiceSetting;
  const LANGS = ['uk-UA', 'ru-RU', 'pl-PL', 'en-US'] as const;
  const LABEL: Record<string, string> = { 'uk-UA': 'UA', 'ru-RU': 'RU', 'pl-PL': 'PL', 'en-US': 'EN' };
  function cycleLanguage() {
    haptics.tap();
    const i = LANGS.indexOf(voiceLang as (typeof LANGS)[number]);
    useSettingsStore.getState().updateSettings({ voiceLanguage: LANGS[(i + 1) % LANGS.length] });
  }
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    haptics.success();
    onSubmit(trimmed);
    setValue('');
    if (closeOnSubmit) {
      onClose();
      return;
    }
    // Stay open for the next one: keep focus (and the keyboard) on the field.
    inputRef.current?.focus();
    setTimeout(() => inputRef.current?.focus(), 60);
  }

  /** Android's own speech dialog; the words land in the field to check before saving. */
  async function listen() {
    if (!VoiceInput) return;
    haptics.tap();
    const chosen = useSettingsStore.getState().settings.voiceLanguage;
    const lang = chosen !== 'app' ? chosen : appLang;
    const text = await VoiceInput.recognize(lang, placeholder).catch(() => null);
    if (text) setValue((v) => (v.trim() ? `${v.trim()} ${text}` : text));
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  /** Long-press the mic: which language Android should listen for. */
  function pickLanguage() {
    const set = (voiceLanguage: 'app' | 'uk-UA' | 'ru-RU' | 'pl-PL' | 'en-US') => {
      useSettingsStore.getState().updateSettings({ voiceLanguage });
      setTimeout(listen, 150);
    };
    Alert.alert(tr.quickAdd.voiceLanguage, undefined, [
      { text: 'Українська', onPress: () => set('uk-UA') },
      { text: 'Русский', onPress: () => set('ru-RU') },
      { text: 'Polski', onPress: () => set('pl-PL') },
      { text: 'English', onPress: () => set('en-US') },
      { text: tr.quickAdd.voiceAppLanguage, onPress: () => set('app') },
    ], { cancelable: true });
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }, style]}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboardType}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={submit}
        style={[styles.input, { color: theme.colors.text }]}
      />
      {voice ? (
        <Pressable onPress={cycleLanguage} hitSlop={6} style={[styles.lang, { borderColor: theme.colors.primary }]} accessibilityLabel={tr.quickAdd.voiceLanguage}>
          <Text style={[styles.langText, { color: theme.colors.primary }]}>{LABEL[voiceLang] ?? 'EN'}</Text>
        </Pressable>
      ) : null}
      {voice ? (
        <Pressable onPress={listen} onLongPress={pickLanguage} hitSlop={8} style={styles.button} accessibilityLabel={tr.quickAdd.voice} accessibilityHint={tr.quickAdd.voiceLanguage}>
          <Ionicons name="mic" size={24} color={theme.colors.primary} />
        </Pressable>
      ) : null}
      <Pressable onPress={submit} hitSlop={8} style={styles.button}>
        <Ionicons name="checkmark-circle" size={26} color={theme.colors.success} />
      </Pressable>
      <Pressable onPress={onClose} hitSlop={8} style={styles.button}>
        <Ionicons name="close-circle" size={26} color={theme.colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 4 },
  button: { padding: 2 },
  lang: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, minWidth: 30, alignItems: 'center' },
  langText: { fontSize: 11, fontWeight: '800' },
});
