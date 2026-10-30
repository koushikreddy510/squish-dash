import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { MAX_HEARTS, type Snapshot } from '@/engine/blob';

export function Hud({ snap }: { snap: Snapshot }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.score} accessibilityLabel={`Score ${snap.score}`}>
          {snap.score}
        </Text>
        <View style={styles.hearts} accessibilityLabel={`${snap.hearts} hearts left`}>
          {Array.from({ length: MAX_HEARTS }, (_, i) => (
            <View
              key={i}
              style={[styles.heart, { backgroundColor: i < snap.hearts ? Colors.heart : Colors.heartOff }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  score: { color: Colors.text, fontSize: 32, fontWeight: '500' },
  hearts: { flexDirection: 'row', gap: 6 },
  heart: { width: 14, height: 14, borderRadius: 7 },
});
