import { LETTERS, WORDS } from '@/engine/words';
import { createRng, randInt, shuffled } from '@/engine/rng';

describe('word list', () => {
  it('is upper case letters only, 3 to 5 long', () => {
    for (const w of WORDS) expect(w).toMatch(/^[A-Z]{3,5}$/);
  });

  it('has no duplicates', () => {
    expect(new Set(WORDS).size).toBe(WORDS.length);
  });

  it('only uses letters that can appear as decoys', () => {
    for (const w of WORDS) for (const ch of w) expect(LETTERS).toContain(ch);
  });
});

describe('rng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(5);
    const b = createRng(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('gives integers in range', () => {
    const r = createRng(1);
    for (let i = 0; i < 200; i++) {
      const n = randInt(r, 5);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(5);
    }
  });

  it('shuffles without losing or adding items', () => {
    const out = shuffled(createRng(3), [1, 2, 3, 4, 5, 6]);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
