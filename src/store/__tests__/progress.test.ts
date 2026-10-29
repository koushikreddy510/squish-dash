import { useProgress } from '@/store/progress';

beforeEach(() => {
  useProgress.setState({ bestEndless: 0, bestWord: 0, haptics: true, analyticsEnabled: true });
});

describe('recordScore', () => {
  it('saves a first score as a new best', () => {
    expect(useProgress.getState().recordScore('endless', 5)).toBe(true);
    expect(useProgress.getState().bestEndless).toBe(5);
  });

  it('keeps the higher score and reports no new best', () => {
    useProgress.getState().recordScore('endless', 9);
    expect(useProgress.getState().recordScore('endless', 4)).toBe(false);
    expect(useProgress.getState().recordScore('endless', 9)).toBe(false);
    expect(useProgress.getState().bestEndless).toBe(9);
  });

  it('tracks endless and word mode separately', () => {
    useProgress.getState().recordScore('endless', 12);
    useProgress.getState().recordScore('word', 3);
    expect(useProgress.getState().bestEndless).toBe(12);
    expect(useProgress.getState().bestWord).toBe(3);
  });
});

describe('preferences', () => {
  it('starts with haptics and analytics on', () => {
    expect(useProgress.getState().haptics).toBe(true);
    expect(useProgress.getState().analyticsEnabled).toBe(true);
  });

  it('can turn each off', () => {
    useProgress.getState().setHaptics(false);
    useProgress.getState().setAnalyticsEnabled(false);
    expect(useProgress.getState().haptics).toBe(false);
    expect(useProgress.getState().analyticsEnabled).toBe(false);
  });
});
