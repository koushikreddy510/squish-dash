import { GAP_WIDTH, LETTERS, LETTER_POOL, WORDS, isWord, letterSize } from '@/engine/words';
import { createRng, randInt, shuffled } from '@/engine/rng';

describe('word list', () => {
  it('is upper case letters only, 3 to 7 long', () => {
    for (const w of WORDS) expect(w).toMatch(/^[A-Z]{3,7}$/);
  });

  it('has no duplicates', () => {
    expect(new Set(WORDS).size).toBe(WORDS.length);
  });

  it('only uses letters that can appear as decoys', () => {
    for (const w of WORDS) for (const ch of w) expect(LETTERS).toContain(ch);
  });
});

describe('isWord', () => {
  it('accepts words in any case and rejects short or unknown strings', () => {
    expect(isWord('sun')).toBe(true);
    expect(isWord('GARDEN')).toBe(true);
    expect(isWord('at')).toBe(false);
    expect(isWord('QZX')).toBe(false);
  });

  it('can spell at least one word longer than five letters', () => {
    expect(WORDS.some((w) => w.length >= 6)).toBe(true);
  });
});

describe('letters', () => {
  it('draws gap letters only from A to Z', () => {
    for (const ch of LETTER_POOL) expect(LETTERS).toContain(ch);
  });

  it('sizes thin, normal and wide letters', () => {
    expect(letterSize('I')).toBe('narrow');
    expect(letterSize('E')).toBe('medium');
    expect(letterSize('W')).toBe('wide');
    expect(GAP_WIDTH.narrow).toBeLessThan(GAP_WIDTH.medium);
    expect(GAP_WIDTH.medium).toBeLessThan(GAP_WIDTH.wide);
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
