import React from 'react';
import { Image, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Button, Screen, SubScreenHeader } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { TymofiiFace } from '@/components/mascot/Tymofii';
import { playRealPurr } from '@/lib/sounds';

const PHOTOS = [
  require('@/assets/tymofii/photo1.jpg'),
  require('@/assets/tymofii/photo2.jpg'),
  require('@/assets/tymofii/photo3.jpg'),
  require('@/assets/tymofii/photo4.jpg'),
  require('@/assets/tymofii/photo5.jpg'),
  require('@/assets/tymofii/photo6.jpg'),
  require('@/assets/tymofii/photo7.jpg'),
  require('@/assets/tymofii/photo8.jpg'),
  require('@/assets/tymofii/photo9.jpg'),
  require('@/assets/tymofii/photo10.jpg'),
];
const TILT = [-3, 2.5, -1.5, 3, -2.5, 1.5, -3, 2, -2, 2.5];
const PAPER = '#FBF8F2';
const INK = '#2A2433';

/**
 * Easter egg (Settings → the cat peeking at the bottom): the real Тимофій — the developer's cat the
 * mascot is drawn from. Polaroids with funny captions, his real purr and a "passport" consent.
 */
export function RealTymofiiScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const t = tr.realTymofii;
  // Explicit sizes: a % width + aspectRatio on <Image> let the photo grow to its own pixel size.
  const { width } = useWindowDimensions();
  const cardW = Math.floor((width - 32 - 8 - 16) / 2);
  const photoW = cardW - 16;

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={t.header} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.hero}>
          <TymofiiFace mood="happy" prop="coin" size={110} />
          <Text style={[styles.title, { color: theme.colors.text }]}>{t.title}</Text>
          <Text style={[styles.lead, { color: theme.colors.textMuted }]}>{t.lead}</Text>
        </View>

        <Button title={`▶  ${t.listen}`} onPress={playRealPurr} />
        <Text style={[styles.note, { color: theme.colors.textMuted }]}>{t.listenNote}</Text>

        <View style={styles.grid}>
          {PHOTOS.map((src, i) => (
            <View key={i} style={[styles.polaroid, { width: cardW, transform: [{ rotate: `${TILT[i]}deg` }] }]}>
              <Image source={src} style={[styles.photo, { width: photoW, height: photoW }]} resizeMode="cover" accessibilityLabel={t.captions[i]} />
              <Text style={styles.caption}>{t.captions[i]}</Text>
            </View>
          ))}
        </View>

        <View style={styles.passport}>
          <Text style={styles.passportKicker}>{t.passportTitle}</Text>
          <View style={styles.passportRow}>
            <View style={styles.pawBox}>
              <Image source={require('@/assets/tymofii/paw.png')} style={styles.paw} accessibilityLabel={t.pawLabel} />
            </View>
            <Text style={styles.consent}>{t.consent}</Text>
          </View>
          <View style={styles.passportFoot}>
            <Text style={styles.footSmall}>{t.signed}</Text>
            <Text style={styles.signature}>{t.signature}</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 14 },
  hero: { alignItems: 'center', gap: 8, paddingTop: 4 },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'center' },
  lead: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  note: { fontSize: 12, textAlign: 'center', marginTop: -6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 20, paddingVertical: 8, paddingHorizontal: 4 },
  polaroid: {
    backgroundColor: PAPER,
    borderRadius: 6,
    padding: 8,
    paddingBottom: 0,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  photo: { borderRadius: 2 },
  caption: { color: INK, fontSize: 15, fontStyle: 'italic', fontWeight: '700', textAlign: 'center', paddingVertical: 10 },
  passport: { backgroundColor: '#F3ECDD', borderRadius: 14, padding: 16, gap: 12, elevation: 6, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10 },
  passportKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', color: '#7A6A55' },
  passportRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pawBox: { width: 104, height: 104, borderRadius: 10, borderWidth: 1, borderColor: '#D8CBB3', backgroundColor: '#FBF6EA', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  paw: { width: 84, height: 84 },
  consent: { flex: 1, color: INK, fontSize: 15, fontStyle: 'italic', lineHeight: 21 },
  passportFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  footSmall: { fontSize: 12, color: '#7A6A55' },
  signature: { fontSize: 20, fontStyle: 'italic', fontWeight: '800', color: INK },
});
