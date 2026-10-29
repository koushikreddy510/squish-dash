import { wallSegments } from '@/components/wall-segments';
import { WORLD } from '@/engine/blob';

describe('wallSegments', () => {
  it('leaves two solid stretches either side of one gap', () => {
    expect(wallSegments([{ cx: 100, w: 40 }])).toEqual([
      [0, 80],
      [120, WORLD.width],
    ]);
  });

  it('adds a stretch between two gaps, whatever order they come in', () => {
    expect(
      wallSegments([
        { cx: 220, w: 60 },
        { cx: 80, w: 60 },
      ]),
    ).toEqual([
      [0, 50],
      [110, 190],
      [250, WORLD.width],
    ]);
  });

  it('has no stretch where a gap touches the edge', () => {
    expect(wallSegments([{ cx: 20, w: 40 }])).toEqual([[40, WORLD.width]]);
    expect(wallSegments([{ cx: WORLD.width - 20, w: 40 }])).toEqual([[0, WORLD.width - 40]]);
  });
});
