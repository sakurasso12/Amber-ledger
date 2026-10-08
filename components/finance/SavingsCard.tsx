import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurTargetView, BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button, CustomizableCard, PressableScale, Text, TextField } from '@/components/ui';
import { projectSavings } from '@/lib/savings';
import { todayKey } from '@/lib/dateRanges';
import { useTranslation } from '@/i18n';

/**
 * Savings cushion at the bottom of Finance. First shown blurred with a question (the user opts in);
 * once on, it shows the balance and — in muted text — roughly what it grows to by the account's
 * next anniversary. Tapping it opens the editor.
 */
export function SavingsCard() {
  const mode = useSettingsStore((s) => s.settings.savingsCard);
  const [editing, setEditing] = useState(false);

  if (mode === 'off') return null;
  return (
    <>
      {mode === 'ask' ? <AskCard /> : <ProjectionCard onPress={() => setEditing(true)} />}
      <SavingsEditor visible={editing} onClose={() => setEditing(false)} />
    </>
  );
}

function ProjectionCard({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const tr = useTranslation();
  const { savingsBalance, savingsRatePercent, savingsOpenedAt, currency } = useSettingsStore((s) => s.settings);
  const money = (n: number) => `${n.toFixed(0)} ${currency}`;
  const projection = savingsOpenedAt ? projectSavings(savingsBalance, savingsRatePercent, savingsOpenedAt) : null;
  const month = projection?.yearEnds.toLocaleDateString(tr.localeCode, { month: 'long', year: 'numeric' });

  return (
    <PressableScale onPress={onPress} scaleTo={0.98}>
      <CustomizableCard widgetId="finance-savings">
        <View style={styles.titleRow}>
          <Ionicons name="shield-checkmark" size={18} color={theme.colors.success} />
          <Text style={[styles.title, { color: theme.colors.text }]}>{tr.savings.title}</Text>
          {savingsRatePercent > 0 ? (
            <Text style={[styles.rate, { color: theme.colors.textMuted }]}>{savingsRatePercent}%</Text>
          ) : null}
        </View>
        <Text style={[styles.balance, { color: theme.colors.success }]} numberOfLines={1} adjustsFontSizeToFit>
          {money(savingsBalance)}
        </Text>
        {projection && month ? (
          <>
            <Text style={[styles.line, { color: theme.colors.text }]}>{tr.savings.yearEnds(month)}</Text>
            <Text style={[styles.line, { color: theme.colors.textMuted }]}>
              {tr.savings.projection(money(projection.projected), money(projection.interest))}
            </Text>
            <Text style={[styles.note, { color: theme.colors.textMuted }]}>{tr.savings.afterTax}</Text>
          </>
        ) : (
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>{tr.savings.notConfigured}</Text>
        )}
      </CustomizableCard>
    </PressableScale>
  );
}

/** The opt-in question over a blurred preview of the card. */
function AskCard() {
  const theme = useTheme();
  const tr = useTranslation();
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const target = useRef<View>(null);

  return (
    <View style={[styles.askWrap, cardSurface(theme)]}>
      <BlurTargetView ref={target} style={styles.askPreview} pointerEvents="none">
        <View style={styles.titleRow}>
          <Ionicons name="shield-checkmark" size={18} color={theme.colors.success} />
          <Text style={[styles.title, { color: theme.colors.text }]}>{tr.savings.title}</Text>
        </View>
        <Text style={[styles.balance, { color: theme.colors.success }]}>10 000</Text>
        <Text style={[styles.line, { color: theme.colors.textMuted }]}>≈ 10 400 · 12.2027</Text>
      </BlurTargetView>
      <BlurView
        blurTarget={target}
        blurMethod="dimezisBlurViewSdk31Plus"
        intensity={40}
        tint={theme.dark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.askOverlay, { backgroundColor: `${theme.colors.surface}99` }]}>
        <Text style={[styles.askTitle, { color: theme.colors.text }]}>{tr.savings.askTitle}</Text>
        <Text style={[styles.askSubtitle, { color: theme.colors.textMuted }]}>{tr.savings.askSubtitle}</Text>
        <View style={styles.askButtons}>
          <Button title={tr.savings.no} variant="secondary" onPress={() => updateSettings({ savingsCard: 'off' })} style={styles.flex} />
          <Button title={tr.savings.yes} onPress={() => updateSettings({ savingsCard: 'on' })} style={styles.flex} />
        </View>
      </View>
    </View>
  );
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function SavingsEditor({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const tr = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [balance, setBalance] = useState('');
  const [rate, setRate] = useState('');
  const [opened, setOpened] = useState('');
  const [dateError, setDateError] = useState(false);
  const insets = useSafeAreaInsets();

  // Fill the fields from settings every time the sheet opens.
  function handleShow() {
    setBalance(settings.savingsBalance ? String(settings.savingsBalance) : '');
    setRate(settings.savingsRatePercent ? String(settings.savingsRatePercent) : '');
    setOpened(settings.savingsOpenedAt ?? todayKey());
    setDateError(false);
  }

  const toNumber = (text: string) => {
    const n = parseFloat(text.replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  function handleSave() {
    const validDate = DATE_RE.test(opened) && !Number.isNaN(new Date(`${opened}T00:00:00`).getTime()) && opened <= todayKey();
    if (!validDate) {
      setDateError(true);
      return;
    }
    updateSettings({ savingsBalance: toNumber(balance), savingsRatePercent: toNumber(rate), savingsOpenedAt: opened });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onShow={handleShow} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, paddingBottom: insets.bottom + 20 }]}>
          <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{tr.savings.editTitle}</Text>
          <TextField label={`${tr.savings.balance} (${settings.currency})`} value={balance} onChangeText={setBalance} keyboardType="decimal-pad" placeholder="0" />
          <TextField label={tr.savings.rate} value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="5" />
          <TextField
            label={tr.savings.openedAt}
            value={opened}
            onChangeText={(t) => {
              setOpened(t);
              setDateError(false);
            }}
            placeholder="2026-01-31"
            maxLength={10}
          />
          <Text style={[styles.note, { color: dateError ? theme.colors.danger : theme.colors.textMuted }]}>
            {dateError ? tr.savings.invalidDate : tr.savings.openedAtHint}
          </Text>
          <View style={styles.askButtons}>
            <Button title={tr.savings.cancel} variant="secondary" onPress={onClose} style={styles.flex} />
            <Button title={tr.savings.save} onPress={handleSave} style={styles.flex} />
          </View>
          <Pressable
            hitSlop={8}
            onPress={() => {
              updateSettings({ savingsCard: 'off' });
              onClose();
            }}
          >
            <Text style={[styles.hideLink, { color: theme.colors.danger }]}>{tr.savings.hideCard}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', flex: 1 },
  rate: { fontSize: 13, fontWeight: '700' },
  balance: { fontSize: 30, fontWeight: '800', marginTop: 6 },
  line: { fontSize: 14, marginTop: 4 },
  note: { fontSize: 11, lineHeight: 15, marginTop: 6 },
  askWrap: { overflow: 'hidden', minHeight: 190 },
  askPreview: { padding: 16 },
  askOverlay: { padding: 16, justifyContent: 'center', gap: 8 },
  askTitle: { fontSize: 16, fontWeight: '800' },
  askSubtitle: { fontSize: 13, lineHeight: 18 },
  askButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  hideLink: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 4 },
});
