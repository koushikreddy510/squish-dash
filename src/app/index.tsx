import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/components/ad-banner';
import { Colors, Radius } from '@/constants/theme';
import type { Mode } from '@/engine/blob';
import { useProgress } from '@/store/progress';

function ModeCard({ mode, title, blurb, best }: { mode: Mode; title: string; blurb: string; best: number }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${blurb}. Best ${best}`}
      onPress={() => router.push({ pathname: '/play', params: { mode } })}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardBlurb}>{blurb}</Text>
      </View>
      <View style={styles.best}>
        <Text style={styles.bestLabel}>Best</Text>
        <Text style={styles.bestValue}>{best}</Text>
      </View>
    </Pressable>
  );
}

export default function MenuScreen() {
  const router = useRouter();
  const bestEndless = useProgress((s) => s.bestEndless);
  const bestWord = useProgress((s) => s.bestWord);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.logoBlob}>
          <View style={styles.eye} />
          <View style={[styles.eye, { marginLeft: 16 }]} />
        </View>
        <Text style={styles.title}>Squish Dash</Text>
        <Text style={styles.tagline}>Squeeze through every gap</Text>
      </View>

      <View style={styles.cards}>
        <ModeCard mode="endless" title="Endless" blurb="Fit through the gaps. How far can you go?" best={bestEndless} />
        <ModeCard mode="word" title="Word mode" blurb="Collect letters from the gaps and bank words" best={bestWord} />
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} style={styles.settings}>
        <Text style={styles.settingsLabel}>Settings</Text>
      </Pressable>

      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'space-between' },
  hero: { alignItems: 'center', paddingTop: 36, gap: 10 },
  logoBlob: {
    width: 120,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.blob,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eye: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.blobDark },
  title: { color: Colors.text, fontSize: 36, fontWeight: '500' },
  tagline: { color: Colors.muted, fontSize: 15 },
  cards: { paddingHorizontal: 20, gap: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardEdge,
    padding: 18,
    gap: 12,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cardTitle: { color: Colors.text, fontSize: 20, fontWeight: '500' },
  cardBlurb: { color: Colors.muted, fontSize: 13, marginTop: 4 },
  best: { alignItems: 'center', minWidth: 48 },
  bestLabel: { color: Colors.muted, fontSize: 11 },
  bestValue: { color: Colors.text, fontSize: 22, fontWeight: '500' },
  settings: { alignSelf: 'center', padding: 12 },
  settingsLabel: { color: Colors.muted, fontSize: 14 },
});
