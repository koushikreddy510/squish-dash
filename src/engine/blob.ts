/**
 * Squish Dash rules. Pure TypeScript: no React, no timers, no native modules.
 *
 * The blob keeps a constant area, so squeezing it narrower makes it taller.
 * Walls scroll down with gaps; the blob must fit through a gap and, in word
 * mode, pick the gap that holds the next letter of the current word.
 */
import { createRng, randInt, shuffled, type Rng } from './rng';
import { LETTERS, WORDS } from './words';

export const WORLD = { width: 300, height: 520 } as const;
export const BLOB = { area: 3400, minWidth: 34, maxWidth: 120, y: 430 } as const;
export const ROW_HALF_THICKNESS = 8;
export const MAX_HEARTS = 3;

export type Mode = 'endless' | 'word';
export type Status = 'ready' | 'playing' | 'over';

export type Gap = { cx: number; w: number; letter: string };
export type Row = {
  id: number;
  y: number;
  gaps: Gap[];
  /** Index of the gap that counts as correct (always 0 in endless mode). */
  correct: number;
  resolved: boolean;
  /** The blob touched solid wall while crossing this row. */
  hit: boolean;
  /** Index of the gap the blob was inside while crossing, or -1. */
  entered: number;
};

export type Input = { x: number; squeeze: number };

export type GameEvent =
  | { type: 'row-clear' }
  | { type: 'letter' }
  | { type: 'word' }
  | { type: 'hit' }
  | { type: 'wrong-letter' }
  | { type: 'over' };

export type Game = {
  mode: Mode;
  seed: number;
  rng: Rng;
  status: Status;
  time: number;
  score: number;
  hearts: number;
  revived: boolean;
  blob: { x: number; w: number };
  rows: Row[];
  rowsSpawned: number;
  nextRowId: number;
  /** Seconds during which no new row spawns (after a revive). */
  grace: number;
  words: string[];
  wordIndex: number;
  letterIndex: number;
};

export function widthFromSqueeze(squeeze: number): number {
  const s = Math.min(1, Math.max(0, squeeze));
  return BLOB.minWidth + s * (BLOB.maxWidth - BLOB.minWidth);
}

export function blobHeight(width: number): number {
  return BLOB.area / width;
}

export function speedFor(score: number): number {
  return Math.min(280, 95 + score * 5);
}

export function gapWidthFor(rowIndex: number): number {
  return Math.max(54, 130 - rowIndex * 2.5);
}

export function createGame(mode: Mode, seed: number): Game {
  const rng = createRng(seed);
  return {
    mode,
    seed,
    rng,
    status: 'ready',
    time: 0,
    score: 0,
    hearts: MAX_HEARTS,
    revived: false,
    blob: { x: WORLD.width / 2, w: 70 },
    rows: [],
    rowsSpawned: 0,
    nextRowId: 1,
    grace: 0,
    words: shuffled(rng, WORDS),
    wordIndex: 0,
    letterIndex: 0,
  };
}

export function startGame(game: Game): void {
  game.status = 'playing';
}

/** The k-th letter still needed, counting from the current progress. */
export function upcomingLetter(game: Game, k: number): string {
  let wi = game.wordIndex;
  let li = game.letterIndex;
  for (let s = 0; s < k; s++) {
    li++;
    if (li >= game.words[wi % game.words.length].length) {
      wi++;
      li = 0;
    }
  }
  return game.words[wi % game.words.length][li];
}

function decoyLetter(rng: Rng, not: string): string {
  let c = LETTERS[randInt(rng, LETTERS.length)];
  while (c === not) c = LETTERS[randInt(rng, LETTERS.length)];
  return c;
}

/** Keep the letters on pending rows in step with the player's progress. */
function relabel(game: Game): void {
  if (game.mode !== 'word') return;
  const pending = game.rows.filter((r) => !r.resolved);
  pending.forEach((row, k) => {
    const need = upcomingLetter(game, k);
    row.gaps.forEach((gap, i) => {
      if (i === row.correct) gap.letter = need;
      else if (gap.letter === '' || gap.letter === need) gap.letter = decoyLetter(game.rng, need);
    });
  });
}

function spawnRow(game: Game): void {
  const idx = game.rowsSpawned++;
  const rng = game.rng;
  let gaps: Gap[];
  let correct = 0;
  if (game.mode === 'endless') {
    const w = gapWidthFor(idx) * (0.85 + rng() * 0.3);
    const cx = w / 2 + 10 + rng() * (WORLD.width - w - 20);
    gaps = [{ cx, w, letter: '' }];
  } else {
    const jitter = randInt(rng, 21) - 10;
    gaps = [
      { cx: 78 + jitter, w: 64, letter: '' },
      { cx: 222 + jitter, w: 64, letter: '' },
    ];
    correct = randInt(rng, 2);
  }
  game.rows.push({ id: game.nextRowId++, y: -16, gaps, correct, resolved: false, hit: false, entered: -1 });
  relabel(game);
}

function loseHeart(game: Game, events: GameEvent[]): void {
  game.hearts--;
  if (game.hearts <= 0) {
    game.status = 'over';
    events.push({ type: 'over' });
  }
}

/** Advance the game by dt seconds. Returns what happened, for sound and haptics. */
export function step(game: Game, dt: number, input: Input): GameEvent[] {
  const events: GameEvent[] = [];
  if (game.status !== 'playing') return events;

  game.time += dt;
  game.grace = Math.max(0, game.grace - dt);

  const speed = speedFor(game.score);
  for (const row of game.rows) row.y += speed * dt;

  const lastRow = game.rows[game.rows.length - 1];
  if (game.grace === 0 && (!lastRow || lastRow.y > 150)) spawnRow(game);

  const targetW = widthFromSqueeze(input.squeeze);
  const k = Math.min(1, dt * 12);
  game.blob.w += (targetW - game.blob.w) * k;
  game.blob.x += (input.x - game.blob.x) * k;
  game.blob.x = Math.min(WORLD.width - game.blob.w / 2, Math.max(game.blob.w / 2, game.blob.x));

  const h = blobHeight(game.blob.w);
  const top = BLOB.y - h / 2;
  const bottom = BLOB.y + h / 2;
  const left = game.blob.x - game.blob.w / 2;
  const right = game.blob.x + game.blob.w / 2;

  for (const row of game.rows) {
    if (row.resolved) continue;
    const overlaps = row.y + ROW_HALF_THICKNESS > top && row.y - ROW_HALF_THICKNESS < bottom;
    if (overlaps) {
      const gi = row.gaps.findIndex((g) => left >= g.cx - g.w / 2 && right <= g.cx + g.w / 2);
      if (gi < 0) row.hit = true;
      else row.entered = gi;
    } else if (row.y - ROW_HALF_THICKNESS >= bottom) {
      row.resolved = true;
      if (!row.hit && row.entered === row.correct) {
        if (game.mode === 'endless') {
          game.score++;
          events.push({ type: 'row-clear' });
        } else {
          game.letterIndex++;
          events.push({ type: 'letter' });
          if (game.letterIndex >= game.words[game.wordIndex % game.words.length].length) {
            game.score++;
            game.wordIndex++;
            game.letterIndex = 0;
            events.push({ type: 'word' });
          }
        }
      } else {
        events.push({ type: row.hit ? 'hit' : 'wrong-letter' });
        loseHeart(game, events);
        if (game.hearts <= 0) return events;
      }
      relabel(game);
    }
  }

  game.rows = game.rows.filter((r) => r.y < WORLD.height + 20);
  return events;
}

/** Run the simulation in fixed 1/60 s steps so frame rate never changes the rules. */
export function advance(game: Game, elapsed: number, input: Input): GameEvent[] {
  const events: GameEvent[] = [];
  let remaining = Math.min(elapsed, 0.1);
  const dt = 1 / 60;
  while (remaining > 1e-9 && game.status === 'playing') {
    const slice = Math.min(dt, remaining);
    events.push(...step(game, slice, input));
    remaining -= slice;
  }
  return events;
}

/** One free continue per run, after the player has watched a rewarded ad. */
export function revive(game: Game): boolean {
  if (game.status !== 'over' || game.revived) return false;
  game.revived = true;
  game.hearts = 2;
  game.rows = [];
  game.grace = 0.8;
  game.status = 'playing';
  return true;
}

export type Snapshot = {
  status: Status;
  mode: Mode;
  score: number;
  hearts: number;
  blob: { x: number; w: number; h: number };
  rows: { id: number; y: number; resolved: boolean; gaps: Gap[] }[];
  word: { letters: string[]; done: number } | null;
};

/** Plain, immutable view of the game for rendering. */
export function snapshot(game: Game): Snapshot {
  return {
    status: game.status,
    mode: game.mode,
    score: game.score,
    hearts: game.hearts,
    blob: { x: game.blob.x, w: game.blob.w, h: blobHeight(game.blob.w) },
    rows: game.rows.map((r) => ({
      id: r.id,
      y: r.y,
      resolved: r.resolved,
      gaps: r.gaps.map((g) => ({ ...g })),
    })),
    word:
      game.mode === 'word'
        ? {
            letters: game.words[game.wordIndex % game.words.length].split(''),
            done: game.letterIndex,
          }
        : null,
  };
}
