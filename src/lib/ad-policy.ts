/**
 * When a full-screen ad may appear. Pure, so the rules can be tested.
 *
 * Ads only ever come at the end of a round, never during play: an interstitial
 * on every third round end, never twice within a minute.
 */
export const INTERSTITIAL_EVERY = 3;
export const INTERSTITIAL_MIN_GAP_MS = 60_000;

export function shouldShowInterstitial(args: {
  roundsEnded: number;
  lastShownAt: number | null;
  now: number;
}): boolean {
  const { roundsEnded, lastShownAt, now } = args;
  if (roundsEnded < INTERSTITIAL_EVERY || roundsEnded % INTERSTITIAL_EVERY !== 0) return false;
  return lastShownAt === null || now - lastShownAt >= INTERSTITIAL_MIN_GAP_MS;
}
