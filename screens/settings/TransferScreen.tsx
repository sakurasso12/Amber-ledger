import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { Button, PressableScale, Screen, SubScreenHeader, Text, useAuthPrompt } from '@/components/ui';
import { onTransferEvents, readQr, receiveAndRestore, startSending, stopSending, transferAvailable } from '@/lib/transfer';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';

type Mode = 'choose' | 'send' | 'receive';

/** Settings → Security & storage → Move data: send from this phone (QR) or receive (scan). */
export function TransferScreen() {
  const tr = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('choose');
  const { ask, prompt } = useAuthPrompt();

  async function startSend() {
    // Whoever holds this phone shouldn't be able to beam its data away without the password.
    if (!(await ask('profile'))) return;
    setMode('send');
  }

  let body: React.ReactNode;
  if (!transferAvailable) {
    body = <Text style={[styles.note, { color: theme.colors.textMuted }]}>{tr.transfer.needsApp}</Text>;
  } else if (mode === 'send') {
    body = <SendPanel />;
  } else if (mode === 'receive') {
    body = <ReceivePanel />;
  } else {
    body = (
      <View style={styles.choices}>
        <Choice icon="qr-code-outline" title={tr.transfer.sendTitle} hint={tr.transfer.sendHint} onPress={startSend} />
        <Choice icon="scan-outline" title={tr.transfer.receiveTitle} hint={tr.transfer.receiveHint} onPress={() => setMode('receive')} />
      </View>
    );
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.transfer.title} />
      <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>{body}</View>
      {prompt}
    </Screen>
  );
}

function Choice({ icon, title, hint, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; hint: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} style={[styles.choice, cardSurface(theme)]}>
      <View style={[styles.choiceIcon, { backgroundColor: `${theme.colors.primary}22` }]}>
        <Ionicons name={icon} size={26} color={theme.colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.choiceTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.note, { color: theme.colors.textMuted }]}>{hint}</Text>
      </View>
    </PressableScale>
  );
}

/** Shows the QR and waits for the other phone; the code dies after it's used or times out. */
function SendPanel() {
  const theme = useTheme();
  const tr = useTranslation();
  const [qr, setQr] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [state, setState] = useState<'preparing' | 'waiting' | 'sent' | 'expired' | 'noNetwork'>('preparing');
  const [now, setNow] = useState(Date.now());
  const sentRef = useRef(false);
  // The port of the code on screen; events from an older code are ignored.
  const portRef = useRef(0);

  async function open() {
    setState('preparing');
    sentRef.current = false;
    try {
      const { qr: code, ticket } = await startSending();
      portRef.current = ticket.port;
      setQr(code);
      setExpiresAt(ticket.expiresAt);
      setState('waiting');
    } catch (error) {
      setState(String(error).includes('NO_NETWORK') ? 'noNetwork' : 'expired');
    }
  }

  useEffect(() => {
    const unsubscribe = onTransferEvents(
      (port) => {
        if (port !== portRef.current) return;
        sentRef.current = true;
        haptics.success();
        setState('sent');
      },
      (port) => {
        if (port !== portRef.current || sentRef.current) return;
        setState((s) => (s === 'waiting' ? 'expired' : s));
      }
    );
    open();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
      unsubscribe();
      stopSending();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'preparing') return <Status spinner text={tr.transfer.preparing} />;
  if (state === 'sent') return <Status icon="checkmark-circle" color={theme.colors.success} text={tr.transfer.sent} />;
  if (state === 'noNetwork' || state === 'expired') {
    return (
      <View style={styles.center}>
        <Status icon="time-outline" color={theme.colors.textMuted} text={state === 'noNetwork' ? tr.transfer.noNetwork : tr.transfer.expired} />
        <Button title={tr.transfer.again} onPress={open} />
      </View>
    );
  }

  const secondsLeft = Math.max(0, Math.round((expiresAt - now) / 1000));
  const time = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
  return (
    <View style={styles.center}>
      {/* White square with a margin around the code: cameras read it best that way, in any theme. */}
      <View style={styles.qrBox}>{qr ? <QRCode value={qr} size={240} backgroundColor="#FFFFFF" color="#000000" /> : null}</View>
      <Text style={[styles.timer, { color: theme.colors.text }]}>{tr.transfer.expiresIn(time)}</Text>
      <Text style={[styles.note, styles.centerText, { color: theme.colors.textMuted }]}>{tr.transfer.scanHint(tr.transfer.where)}</Text>
    </View>
  );
}

/**
 * Camera behind an explanation first; one scan → confirm → password → pull the data.
 * Also the first step of the first launch (components/onboarding), with `onDone` there.
 */
export function ReceivePanel({ onDone }: { onDone?: () => void } = {}) {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<'scanning' | 'receiving' | 'done'>('scanning');
  const busy = useRef(false);
  const { ask, prompt } = useAuthPrompt();

  function scanned(text: string) {
    if (busy.current) return;
    const result = readQr(text);
    if ('problem' in result) {
      busy.current = true;
      haptics.warning();
      Alert.alert(result.problem === 'expired' ? tr.transfer.codeExpired : tr.transfer.notOurCode, undefined, [
        { text: 'OK', onPress: () => (busy.current = false) },
      ]);
      return;
    }
    busy.current = true;
    haptics.tap();
    Alert.alert(tr.transfer.confirmTitle, tr.transfer.confirmText, [
      { text: tr.transfer.cancel, style: 'cancel', onPress: () => (busy.current = false) },
      {
        text: tr.transfer.replace,
        style: 'destructive',
        onPress: async () => {
          if (!(await ask('profile'))) {
            busy.current = false;
            return;
          }
          setState('receiving');
          try {
            await receiveAndRestore(result.ticket);
            haptics.success();
            setState('done');
          } catch (error) {
            console.warn('[transfer] receive failed:', error);
            haptics.warning();
            setState('scanning');
            Alert.alert(tr.transfer.failed, undefined, [{ text: 'OK', onPress: () => (busy.current = false) }]);
          }
        },
      },
    ]);
  }

  if (state === 'receiving') return <Status spinner text={tr.transfer.receiving} />;
  if (state === 'done') {
    return (
      <View style={styles.center}>
        <Status icon="checkmark-circle" color={theme.colors.success} text={tr.transfer.received} />
        <Button title="OK" onPress={() => (onDone ? onDone() : router.navigate('/'))} />
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={[styles.cameraGate, cardSurface(theme)]}>
        <Ionicons name="camera-outline" size={36} color={theme.colors.primary} />
        <Text style={[styles.choiceTitle, { color: theme.colors.text }]}>{tr.transfer.cameraTitle}</Text>
        <Text style={[styles.note, styles.centerText, { color: theme.colors.textMuted }]}>{tr.transfer.cameraText}</Text>
        <Button title={tr.transfer.cameraGrant} onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.cameraWrap}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => scanned(data)}
      />
      <View pointerEvents="none" style={[styles.frame, { borderColor: theme.colors.primary }]} />
      <Text style={styles.cameraHint}>{tr.transfer.pointCamera}</Text>
      {prompt}
    </View>
  );
}

function Status({ text, spinner, icon, color }: { text: string; spinner?: boolean; icon?: keyof typeof Ionicons.glyphMap; color?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.status}>
      {spinner ? <ActivityIndicator size="large" color={theme.colors.primary} /> : icon ? <Ionicons name={icon} size={56} color={color} /> : null}
      <Text style={[styles.statusText, { color: theme.colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  content: { flex: 1, paddingHorizontal: 16, gap: 16 },
  choices: { gap: 12 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  choiceIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  choiceTitle: { fontSize: 17, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 19 },
  centerText: { textAlign: 'center' },
  center: { alignItems: 'center', gap: 16, paddingTop: 8 },
  qrBox: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 20 },
  timer: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  status: { alignItems: 'center', gap: 14, paddingVertical: 32 },
  statusText: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  cameraGate: { alignItems: 'center', gap: 12, padding: 20 },
  cameraWrap: { flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderWidth: 3, borderRadius: 24 },
  cameraHint: { position: 'absolute', bottom: 24, left: 24, right: 24, color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
