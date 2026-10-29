import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameView } from '@/components/game-view';
import { Hud } from '@/components/hud';
import { PillButton } from '@/components/pill-button';
import { Colors } from '@/constants/theme';
import type { Mode } from '@/engine/blob';
import { GameSession } from '@/engine/session';
import { useFrameLoop } from '@/hooks/use-frame-loop';
import { shouldShowInterstitial } from '@/lib/ad-policy';
import { showInterstitial, showRewarded, useAds } from '@/lib/ads';
import { feedbackFor } from '@/lib/haptics';
import { useProgress } from '@/store/progress';

export default function PlayScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const m: Mode = mode === 'word' ? 'word' : 'endless';
  const router = useRouter();

  const [session] = useState(() => new GameSession(m));
  const [snap, setSnap] = useState(() => session.snap());
  const [newBest, setNewBest] = useState(false);
  const [busy, setBusy] = useState(false);
  const roundsEnded = useRef(0);
  const lastInterstitialAt = useRef<number | null>(null);

  const best = useProgress((s) => (m === 'endless' ? s.bestEndless : s.bestWord));
  const recordScore = useProgress((s) => s.recordScore);
  const rewardedReady = useAds((s) => s.rewardedReady);

  useFrameLoop((dt) => {
    if (session.status !== 'playing') return;
    session.tick(dt).forEach(feedbackFor);
    const next = session.snap();
    setSnap(next);
    if (next.status === 'over') {
      roundsEnded.current += 1;
      setNewBest(recordScore(m, session.score));
    }
  });

  const start = () => {
    session.start();
    setSnap(session.snap());
  };

  const playAgain = async () => {
    if (busy) return;
    setBusy(true);
    const now = Date.now();
    if (shouldShowInterstitial({ roundsEnded: roundsEnded.current, lastShownAt: lastInterstitialAt.current, now })) {
      await showInterstitial();
      lastInterstitialAt.current = Date.now();
    }
    setBusy(false);
    setNewBest(false);
    session.restart();
    setSnap(session.snap());
  };

  const continueRun = async () => {
    if (busy) return;
    setBusy(true);
    const earned = await showRewarded();
    setBusy(false);
    if (earned && session.continueRun()) setSnap(session.snap());
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>Menu</Text>
        </Pressable>
      </View>
      <Hud snap={snap} />
      <GameView snap={snap} onTouch={(x, y) => session.touch(x, y)} />

      {snap.status === 'ready' ? (
        <View style={styles.overlay}>
          <Text style={styles.title}>{m === 'word' ? 'Word mode' : 'Endless'}</Text>
          <Text style={styles.sub}>
            {m === 'word'
              ? 'Squeeze through the gap with the next letter'
              : 'Drag to move. Drag up to squeeze thin, down to flatten.'}
          </Text>
          <PillButton primary label="Start" onPress={start} />
        </View>
      ) : null}

      {snap.status === 'over' ? (
        <View style={styles.overlay}>
          <Text style={styles.title}>{newBest ? 'New best' : 'Round over'}</Text>
          <Text style={styles.big}>{snap.score}</Text>
          <Text style={styles.sub}>Best {best}</Text>
          {session.canContinue && rewardedReady ? (
            <PillButton primary label="Continue, watch an ad" onPress={continueRun} disabled={busy} />
          ) : null}
          <PillButton primary={!(session.canContinue && rewardedReady)} label="Play again" onPress={playAgain} disabled={busy} />
          <PillButton label="Menu" onPress={() => router.back()} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  top: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 2 },
  back: { color: Colors.muted, fontSize: 14 },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(22,27,46,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: { color: Colors.text, fontSize: 28, fontWeight: '500' },
  big: { color: Colors.blob, fontSize: 64, fontWeight: '500' },
  sub: { color: Colors.muted, fontSize: 15, textAlign: 'center', maxWidth: 280 },
});
