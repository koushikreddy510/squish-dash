/**
 * Squish Dash rules. Pure TypeScript: no React, no timers, no native modules.
 *
 * The blob keeps a constant area, so squeezing it narrower makes it taller.
 * Walls scroll down with gaps; the blob must fit through one. In word mode each
 * gap holds a letter, thin letters have tight gaps, and the letters the blob
 * passes through land in a tray that can be banked once they spell a word.
 */
import { createRng, randInt, type Rng } from './rng';
import { LETTER_POOL, TRAY_SIZE, gapWidthForLetter, isWord, MIN_WORD } from './words';

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
  | { type: 'bad-word' }
  | { type: 'hit' }
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
  /** Letters collected in word mode, oldest first. */
  tray: string[];
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
    tray: [],
  };
}

export function startGame(game: Game): void {
  game.status = 'playing';
}

const WORD_GAPS = 3;
/** Widest total of gaps allowed on a row, so walls never shrink to slivers. */
const MAX_GAP_TOTAL = 232;

function pickLetters(rng: Rng): string[] {
  for (;;) {
    const letters: string[] = [];
    while (letters.length < WORD_GAPS) {
      const c = LETTER_POOL[randInt(rng, LETTER_POOL.length)];
      if (!letters.includes(c)) letters.push(c);
    }
    if (!letters.some((c) => 'AEIOU'.includes(c)) && rng() < 0.7) continue;
    const total = letters.reduce((sum, c) => sum + gapWidthForLetter(c), 0);
    if (total <= MAX_GAP_TOTAL) return letters;
  }
}

function wordGaps(rng: Rng): Gap[] {
  const letters = pickLetters(rng);
  const widths = letters.map(gapWidthForLetter);
  const wall = (WORLD.width - widths.reduce((a, b) => a + b, 0)) / (letters.length + 1);
  let x = wall;
  return letters.map((letter, i) => {
    const gap = { cx: x + widths[i] / 2, w: widths[i], letter };
    x += widths[i] + wall;
    return gap;
  });
}

function spawnRow(game: Game): void {
  const idx = game.rowsSpawned++;
  const rng = game.rng;
  let gaps: Gap[];
  if (game.mode === 'endless') {
    const w = gapWidthFor(idx) * (0.85 + rng() * 0.3);
    const cx = w / 2 + 10 + rng() * (WORLD.width - w - 20);
    gaps = [{ cx, w, letter: '' }];
  } else {
    gaps = wordGaps(rng);
  }
  game.rows.push({ id: game.nextRowId++, y: -16, gaps, resolved: false, hit: false, entered: -1 });
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
      if (row.hit || row.entered < 0) {
        events.push({ type: 'hit' });
        loseHeart(game, events);
        if (game.hearts <= 0) return events;
      } else if (game.mode === 'endless') {
        game.score++;
        events.push({ type: 'row-clear' });
      } else {
        game.tray.push(row.gaps[row.entered].letter);
        if (game.tray.length > TRAY_SIZE) game.tray.shift();
        events.push({ type: 'letter' });
      }
    }
  }

  game.rows = game.rows.filter((r) => r.y < WORLD.height + 20);
  return events;
}

/** Cash in the tray if it spells a word: longer words are worth far more. */
export function bankWord(game: Game): GameEvent[] {
  if (game.mode !== 'word' || game.status !== 'playing') return [];
  const letters = game.tray.join('');
  if (letters.length < MIN_WORD || !isWord(letters)) return [{ type: 'bad-word' }];
  game.score += letters.length * letters.length;
  game.tray = [];
  return [{ type: 'word' }];
}

export function clearTray(game: Game): void {
  game.tray = [];
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
  word: { tray: string[]; valid: boolean } | null;
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
    word: game.mode === 'word' ? { tray: [...game.tray], valid: isWord(game.tray.join('')) } : null,
  };
}
