import {
  BLOB,
  advance,
  bankWord,
  clearTray,
  blobHeight,
  createGame,
  revive,
  snapshot,
  speedFor,
  startGame,
  step,
  widthFromSqueeze,
  type Game,
  type GameEvent,
  type Input,
  type Row,
  WORLD,
} from '@/engine/blob';
import { TRAY_SIZE, gapWidthForLetter } from '@/engine/words';

const FRAME = 1 / 60;

function started(mode: 'endless' | 'word', seed = 1): Game {
  const g = createGame(mode, seed);
  startGame(g);
  return g;
}

/** Spawn exactly one real row, then stop more from spawning. */
function oneRow(game: Game): Row {
  step(game, FRAME, { x: game.blob.x, squeeze: 0.1 });
  game.grace = 999;
  return game.rows[0];
}

/** Put the blob (width 40) and the row so the blob will cross at gap index `gi`. */
function aim(game: Game, row: Row, gi: number): Input {
  game.blob.w = 40;
  row.y = BLOB.y - 120;
  const cx = row.gaps[gi].cx;
  game.blob.x = cx;
  return { x: cx, squeeze: (40 - 34) / (120 - 34) };
}

function runUntilResolved(game: Game, row: Row, input: Input): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < 2000 && !row.resolved && game.status === 'playing'; i++) {
    events.push(...step(game, FRAME, input));
  }
  return events;
}

describe('blob shape', () => {
  it('maps squeeze to a width inside the allowed range', () => {
    expect(widthFromSqueeze(-5)).toBe(BLOB.minWidth);
    expect(widthFromSqueeze(5)).toBe(BLOB.maxWidth);
    expect(widthFromSqueeze(0.5)).toBeCloseTo((BLOB.minWidth + BLOB.maxWidth) / 2);
  });

  it('keeps the same area whatever the width, so thin means tall', () => {
    for (const w of [34, 60, 90, 120]) {
      expect(w * blobHeight(w)).toBeCloseTo(BLOB.area);
    }
    expect(blobHeight(34)).toBeGreaterThan(blobHeight(120));
  });
});

describe('difficulty', () => {
  it('speeds up with score but never beyond the cap', () => {
    expect(speedFor(10)).toBeGreaterThan(speedFor(0));
    expect(speedFor(10000)).toBe(280);
  });
});

describe('determinism', () => {
  it('spawns the same walls for the same seed', () => {
    const a = started('endless', 42);
    const b = started('endless', 42);
    const input = { x: 150, squeeze: 0.3 };
    advance(a, 3, input);
    advance(b, 3, input);
    expect(snapshot(a).rows).toEqual(snapshot(b).rows);
  });

  it('spawns different walls for different seeds', () => {
    const a = started('word', 1);
    const b = started('word', 2);
    advance(a, 1, { x: 150, squeeze: 0.3 });
    advance(b, 1, { x: 150, squeeze: 0.3 });
    expect(snapshot(a).rows).not.toEqual(snapshot(b).rows);
  });

  it('simulates in fixed steps so the frame rate does not change the result', () => {
    const a = started('endless', 7);
    const b = started('endless', 7);
    const input = { x: 150, squeeze: 0.3 };
    advance(a, 0.1, input);
    for (let i = 0; i < 6; i++) advance(b, 1 / 60, input);
    expect(a.time).toBeCloseTo(b.time, 5);
  });
});

describe('endless mode', () => {
  it('does nothing until the game is started', () => {
    const g = createGame('endless', 1);
    expect(step(g, FRAME, { x: 150, squeeze: 0.3 })).toEqual([]);
    expect(g.rows).toHaveLength(0);
  });

  it('scores a row the blob fits through', () => {
    const g = started('endless');
    const row = oneRow(g);
    row.gaps[0].w = 100;
    const events = runUntilResolved(g, row, aim(g, row, 0));
    expect(events).toContainEqual({ type: 'row-clear' });
    expect(g.score).toBe(1);
    expect(g.hearts).toBe(3);
  });

  it('costs a heart when the blob is too wide for the gap', () => {
    const g = started('endless');
    const row = oneRow(g);
    row.gaps[0].w = 30;
    const events = runUntilResolved(g, row, aim(g, row, 0));
    expect(events).toContainEqual({ type: 'hit' });
    expect(g.hearts).toBe(2);
    expect(g.score).toBe(0);
  });

  it('ends the run after three misses and reports it once', () => {
    const g = started('endless');
    let over = 0;
    for (let i = 0; i < 3; i++) {
      g.rows = [];
      g.grace = 0;
      const row = oneRow(g);
      row.gaps[0].w = 30;
      const events = runUntilResolved(g, row, aim(g, row, 0));
      over += events.filter((e) => e.type === 'over').length;
    }
    expect(g.hearts).toBe(0);
    expect(g.status).toBe('over');
    expect(over).toBe(1);
  });
});

describe('revive', () => {
  function overGame(): Game {
    const g = started('endless');
    g.hearts = 0;
    g.status = 'over';
    g.rows = [];
    return g;
  }

  it('gives one free continue with two hearts and a clear screen', () => {
    const g = overGame();
    expect(revive(g)).toBe(true);
    expect(g.status).toBe('playing');
    expect(g.hearts).toBe(2);
    expect(g.rows).toHaveLength(0);
  });

  it('refuses a second continue in the same run', () => {
    const g = overGame();
    revive(g);
    g.status = 'over';
    expect(revive(g)).toBe(false);
  });

  it('refuses to revive a run that is still going', () => {
    const g = started('endless');
    expect(revive(g)).toBe(false);
  });

  it('waits a moment before the next wall after reviving', () => {
    const g = overGame();
    revive(g);
    step(g, FRAME, { x: 150, squeeze: 0.3 });
    expect(g.rows).toHaveLength(0);
  });
});

describe('word mode', () => {
  it('builds rows of three distinct letters whose gaps match the letter shapes', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = started('word', seed);
      const row = oneRow(g);
      expect(row.gaps).toHaveLength(3);
      expect(new Set(row.gaps.map((x) => x.letter)).size).toBe(3);
      for (const gap of row.gaps) {
        expect(gap.w).toBe(gapWidthForLetter(gap.letter));
        expect(gap.cx - gap.w / 2).toBeGreaterThan(0);
        expect(gap.cx + gap.w / 2).toBeLessThan(WORLD.width);
      }
    }
  });

  it('gives thin letters tight gaps and M or W roomy ones', () => {
    expect(gapWidthForLetter('I')).toBeLessThan(gapWidthForLetter('A'));
    expect(gapWidthForLetter('W')).toBeGreaterThan(gapWidthForLetter('A'));
    expect(gapWidthForLetter('M')).toBeGreaterThan(gapWidthForLetter('A'));
  });

  it('collects the letter of the gap the blob goes through', () => {
    const g = started('word', 5);
    const row = oneRow(g);
    const events = runUntilResolved(g, row, aim(g, row, 1));
    expect(events).toContainEqual({ type: 'letter' });
    expect(g.tray).toEqual([row.gaps[1].letter]);
    expect(g.hearts).toBe(3);
  });

  it('costs a heart and collects nothing when the blob hits a wall', () => {
    const g = started('word', 5);
    const row = oneRow(g);
    g.blob.w = 40;
    row.y = BLOB.y - 120;
    const wallX = (row.gaps[0].cx + row.gaps[1].cx) / 2;
    g.blob.x = wallX;
    const events = runUntilResolved(g, row, { x: wallX, squeeze: 0.07 });
    expect(events).toContainEqual({ type: 'hit' });
    expect(g.hearts).toBe(2);
    expect(g.tray).toEqual([]);
  });

  it('keeps only the newest letters when the tray is full', () => {
    const g = started('word', 5);
    g.tray = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const row = oneRow(g);
    runUntilResolved(g, row, aim(g, row, 0));
    expect(g.tray).toHaveLength(TRAY_SIZE);
    expect(g.tray[0]).toBe('B');
    expect(g.tray[TRAY_SIZE - 1]).toBe(row.gaps[0].letter);
  });

  it('banks a real word for length squared and empties the tray', () => {
    const g = started('word', 5);
    g.tray = ['S', 'U', 'N'];
    expect(bankWord(g)).toEqual([{ type: 'word' }]);
    expect(g.score).toBe(9);
    expect(g.tray).toEqual([]);

    g.tray = ['S', 'T', 'A', 'R'];
    bankWord(g);
    expect(g.score).toBe(9 + 16);
  });

  it('keeps the tray when it is not a word', () => {
    const g = started('word', 5);
    g.tray = ['Q', 'Z', 'X'];
    expect(bankWord(g)).toEqual([{ type: 'bad-word' }]);
    expect(g.score).toBe(0);
    expect(g.tray).toEqual(['Q', 'Z', 'X']);
    g.tray = ['A', 'T'];
    expect(bankWord(g)).toEqual([{ type: 'bad-word' }]);
  });

  it('does not bank outside word mode or after the run ends', () => {
    const e = started('endless', 1);
    e.tray = ['S', 'U', 'N'];
    expect(bankWord(e)).toEqual([]);
    const g = started('word', 1);
    g.tray = ['S', 'U', 'N'];
    g.status = 'over';
    expect(bankWord(g)).toEqual([]);
    expect(g.score).toBe(0);
  });

  it('clears the tray on request', () => {
    const g = started('word', 1);
    g.tray = ['A', 'B'];
    clearTray(g);
    expect(g.tray).toEqual([]);
  });
});

describe('snapshot', () => {
  it('describes the tray in word mode and whether it spells a word', () => {
    const g = started('word', 5);
    expect(snapshot(g).word).toEqual({ tray: [], valid: false });
    g.tray = ['C', 'A', 'T'];
    expect(snapshot(g).word).toEqual({ tray: ['C', 'A', 'T'], valid: true });
  });

  it('has no word in endless mode', () => {
    expect(snapshot(started('endless')).word).toBeNull();
  });

  it('is a copy, so rendering cannot change the game', () => {
    const g = started('endless', 4);
    advance(g, 1, { x: 150, squeeze: 0.3 });
    const snap = snapshot(g);
    snap.rows[0].gaps[0].cx = -999;
    expect(g.rows[0].gaps[0].cx).not.toBe(-999);
  });
});
