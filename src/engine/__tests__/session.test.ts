import { WORLD } from '@/engine/blob';
import { GameSession } from '@/engine/session';

describe('GameSession', () => {
  it('begins ready and only moves once started', () => {
    const s = new GameSession('endless', () => 1);
    expect(s.status).toBe('ready');
    expect(s.tick(1)).toEqual([]);
    s.start();
    s.tick(1);
    expect(s.game.rows.length).toBeGreaterThan(0);
  });

  it('turns a touch into position and squeeze, clamped to the world', () => {
    const s = new GameSession('endless', () => 1);
    s.touch(150, WORLD.height / 2);
    expect(s.input.x).toBe(150);
    expect(s.input.squeeze).toBeCloseTo(0.5);
    s.touch(-50, -10);
    expect(s.input.x).toBe(0);
    expect(s.input.squeeze).toBe(0);
    s.touch(999, 9999);
    expect(s.input.x).toBe(WORLD.width);
    expect(s.input.squeeze).toBe(1);
  });

  it('restarts into a new run that is already playing', () => {
    let seed = 1;
    const s = new GameSession('word', () => seed++);
    s.start();
    s.game.score = 7;
    s.restart();
    expect(s.score).toBe(0);
    expect(s.status).toBe('playing');
    expect(s.game.seed).toBe(2);
  });

  it('offers one continue after the run is over, and no more', () => {
    const s = new GameSession('endless', () => 1);
    expect(s.canContinue).toBe(false);
    s.start();
    s.game.status = 'over';
    s.game.hearts = 0;
    expect(s.canContinue).toBe(true);
    expect(s.continueRun()).toBe(true);
    expect(s.status).toBe('playing');
    s.game.status = 'over';
    expect(s.canContinue).toBe(false);
    expect(s.continueRun()).toBe(false);
  });

  it('gives the same walls for the same seed', () => {
    const a = new GameSession('word', () => 11);
    const b = new GameSession('word', () => 11);
    a.start();
    b.start();
    a.tick(2);
    b.tick(2);
    expect(a.snap().rows).toEqual(b.snap().rows);
  });
});
