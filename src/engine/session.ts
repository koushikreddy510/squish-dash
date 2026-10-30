/**
 * One play session: the game, the player's touch, and restart/continue.
 * The screens talk to this, so they hold no game logic of their own.
 */
import {
  WORLD,
  advance,
  bankWord,
  clearTray,
  createGame,
  revive,
  snapshot,
  startGame,
  type Game,
  type GameEvent,
  type Input,
  type Mode,
  type Snapshot,
  type Status,
} from './blob';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class GameSession {
  game: Game;
  readonly input: Input = { x: WORLD.width / 2, squeeze: 0.3 };

  constructor(
    readonly mode: Mode,
    private readonly seed: () => number = Date.now,
  ) {
    this.game = createGame(mode, this.seed());
  }

  get status(): Status {
    return this.game.status;
  }

  get score(): number {
    return this.game.score;
  }

  get canContinue(): boolean {
    return this.game.status === 'over' && !this.game.revived;
  }

  /** Touch position in world units: x moves the blob, lower on screen means wider. */
  touch(worldX: number, worldY: number): void {
    this.input.x = clamp(worldX, 0, WORLD.width);
    this.input.squeeze = clamp(worldY / WORLD.height, 0, 1);
  }

  start(): void {
    startGame(this.game);
  }

  tick(elapsedSeconds: number): GameEvent[] {
    return advance(this.game, elapsedSeconds, this.input);
  }

  /** Bank the tray if it spells a word. */
  bank(): GameEvent[] {
    return bankWord(this.game);
  }

  clearTray(): void {
    clearTray(this.game);
  }

  /** A fresh run that starts at once. */
  restart(): void {
    this.game = createGame(this.mode, this.seed());
    this.start();
  }

  /** The one free continue per run. Returns false if it isn't allowed. */
  continueRun(): boolean {
    return revive(this.game);
  }

  snap(): Snapshot {
    return snapshot(this.game);
  }
}
