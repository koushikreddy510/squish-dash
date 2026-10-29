import {
  BLOB,
  advance,
  blobHeight,
  createGame,
  revive,
  snapshot,
  speedFor,
  startGame,
  step,
  upcomingLetter,
  widthFromSqueeze,
  type Game,
  type GameEvent,
  type Input,
  type Row,
} from '@/engine/blob';

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
  it('puts the needed letter in the correct gap and a different letter in the other', () => {
    const g = started('word', 5);
    const row = oneRow(g);
    const need = upcomingLetter(g, 0);
    expect(row.gaps).toHaveLength(2);
    expect(row.gaps[row.correct].letter).toBe(need);
    expect(row.gaps[1 - row.correct].letter).not.toBe(need);
  });

  it('advances the word when the right gap is taken', () => {
    const g = started('word', 5);
    const row = oneRow(g);
    const events = runUntilResolved(g, row, aim(g, row, row.correct));
    expect(events).toContainEqual({ type: 'letter' });
    expect(g.letterIndex).toBe(1);
    expect(g.hearts).toBe(3);
  });

  it('costs a heart for the wrong letter without moving on', () => {
    const g = started('word', 5);
    const row = oneRow(g);
    const events = runUntilResolved(g, row, aim(g, row, 1 - row.correct));
    expect(events).toContainEqual({ type: 'wrong-letter' });
    expect(g.hearts).toBe(2);
    expect(g.letterIndex).toBe(0);
  });

  it('scores a word and starts the next once every letter is found', () => {
    const g = started('word', 5);
    const length = g.words[0].length;
    g.letterIndex = length - 1;
    const row = oneRow(g);
    const events = runUntilResolved(g, row, aim(g, row, row.correct));
    expect(events).toContainEqual({ type: 'word' });
    expect(g.score).toBe(1);
    expect(g.wordIndex).toBe(1);
    expect(g.letterIndex).toBe(0);
  });

  it('keeps later rows consistent with the order of letters still needed', () => {
    const g = started('word', 9);
    advance(g, 2, { x: 150, squeeze: 0.3 });
    const pending = g.rows.filter((r) => !r.resolved);
    pending.forEach((row, k) => {
      expect(row.gaps[row.correct].letter).toBe(upcomingLetter(g, k));
    });
  });

  it('wraps to the next word when looking ahead', () => {
    const g = started('word', 3);
    const first = g.words[0];
    g.letterIndex = first.length - 1;
    expect(upcomingLetter(g, 1)).toBe(g.words[1][0]);
  });
});

describe('snapshot', () => {
  it('describes the word to show in word mode', () => {
    const g = started('word', 5);
    const snap = snapshot(g);
    expect(snap.word?.letters.join('')).toBe(g.words[0]);
    expect(snap.word?.done).toBe(0);
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
