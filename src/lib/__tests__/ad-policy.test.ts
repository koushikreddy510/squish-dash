import {
  INTERSTITIAL_EVERY,
  INTERSTITIAL_MIN_GAP_MS,
  shouldShowInterstitial,
} from '@/lib/ad-policy';

const base = { lastShownAt: null as number | null, now: 1_000_000 };

describe('shouldShowInterstitial', () => {
  it('never shows during the first rounds', () => {
    expect(shouldShowInterstitial({ ...base, roundsEnded: 1 })).toBe(false);
    expect(shouldShowInterstitial({ ...base, roundsEnded: 2 })).toBe(false);
  });

  it('shows at the end of every third round', () => {
    expect(INTERSTITIAL_EVERY).toBe(3);
    expect(shouldShowInterstitial({ ...base, roundsEnded: 3 })).toBe(true);
    expect(shouldShowInterstitial({ ...base, roundsEnded: 6 })).toBe(true);
  });

  it('skips the rounds in between', () => {
    expect(shouldShowInterstitial({ ...base, roundsEnded: 4 })).toBe(false);
    expect(shouldShowInterstitial({ ...base, roundsEnded: 5 })).toBe(false);
  });

  it('holds back when another full-screen ad ran less than a minute ago', () => {
    const now = 1_000_000;
    expect(
      shouldShowInterstitial({ roundsEnded: 3, lastShownAt: now - (INTERSTITIAL_MIN_GAP_MS - 1), now }),
    ).toBe(false);
    expect(
      shouldShowInterstitial({ roundsEnded: 3, lastShownAt: now - INTERSTITIAL_MIN_GAP_MS, now }),
    ).toBe(true);
  });
});
