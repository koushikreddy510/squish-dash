import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { BLOB, ROW_HALF_THICKNESS, WORLD, type Snapshot } from '@/engine/blob';
import { wallSegments } from '@/components/wall-segments';

type Props = {
  snap: Snapshot;
  /** Touch position in world units. */
  onTouch: (worldX: number, worldY: number) => void;
};

/** Draws the world scaled to fit, and turns touches back into world units. */
export function GameView({ snap, onTouch }: Props) {
  const [size, setSize] = useState<{ w: number; h: number }>({ w: WORLD.width, h: WORLD.height });
  const scale = Math.min(size.w / WORLD.width, size.h / WORLD.height);
  const ox = (size.w - WORLD.width * scale) / 2;
  const oy = (size.h - WORLD.height * scale) / 2;

  const handleTouch = (e: GestureResponderEvent) =>
    onTouch((e.nativeEvent.locationX - ox) / scale, (e.nativeEvent.locationY - oy) / scale);
  const onLayout = (e: LayoutChangeEvent) =>
    setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const { blob } = snap;
  const eye = 6 * scale;

  return (
    <View
      testID="game-view"
      style={styles.root}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: ox, top: oy, width: WORLD.width * scale, height: WORLD.height * scale }}>
        {snap.rows.map((row) => (
          <View key={row.id}>
            {wallSegments(row.gaps).map(([from, to]) => (
              <View
                key={from}
                style={{
                  position: 'absolute',
                  left: from * scale,
                  top: (row.y - ROW_HALF_THICKNESS) * scale,
                  width: (to - from) * scale,
                  height: ROW_HALF_THICKNESS * 2 * scale,
                  borderRadius: 6 * scale,
                  backgroundColor: row.resolved ? Colors.wallDone : Colors.wall,
                }}
              />
            ))}
            {snap.mode === 'word' &&
              row.gaps.map((g) => (
                <Text
                  key={g.cx}
                  style={{
                    position: 'absolute',
                    left: (g.cx - 24) * scale,
                    top: (row.y - ROW_HALF_THICKNESS - 34) * scale,
                    width: 48 * scale,
                    textAlign: 'center',
                    fontSize: 24 * scale,
                    fontWeight: '500',
                    color: row.resolved ? Colors.muted : Colors.text,
                  }}>
                  {g.letter}
                </Text>
              ))}
          </View>
        ))}
        <View
          style={{
            position: 'absolute',
            left: (blob.x - blob.w / 2) * scale,
            top: (BLOB.y - blob.h / 2) * scale,
            width: blob.w * scale,
            height: blob.h * scale,
            borderRadius: (Math.min(blob.w, blob.h) / 2) * scale,
            backgroundColor: Colors.blob,
            overflow: 'hidden',
          }}>
          <View
            style={{
              position: 'absolute',
              left: blob.w * scale * 0.18,
              top: blob.h * scale * 0.1,
              width: blob.w * scale * 0.3,
              height: Math.min(blob.h, 30) * scale * 0.4,
              borderRadius: 12 * scale,
              backgroundColor: Colors.blobShine,
            }}
          />
          <View style={[styles.eye, { width: eye, height: eye, borderRadius: eye / 2, left: (blob.w * scale) / 2 - eye * 1.6, top: (blob.h * scale) / 2 - eye }]} />
          <View style={[styles.eye, { width: eye, height: eye, borderRadius: eye / 2, left: (blob.w * scale) / 2 + eye * 0.6, top: (blob.h * scale) / 2 - eye }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg, overflow: 'hidden' },
  eye: { position: 'absolute', backgroundColor: Colors.blobDark },
});
