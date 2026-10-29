/**
 * Consent must be resolved before the SDK starts, and full-screen ads must
 * resolve safely whatever the ad network does.
 */

const mockInitialize = jest.fn(() => Promise.resolve([]));
const mockGatherConsent = jest.fn();
const mockGetConsentInfo = jest.fn();
const mockShowPrivacyOptionsForm = jest.fn();

type Listener = () => void;
function mockMakeAd() {
  const listeners: Record<string, Listener[]> = {};
  return {
    listeners,
    addAdEventListener: jest.fn((type: string, fn: Listener) => {
      (listeners[type] ??= []).push(fn);
      return () => {};
    }),
    load: jest.fn(),
    show: jest.fn(() => Promise.resolve()),
    emit(type: string) {
      (listeners[type] ?? []).forEach((fn) => fn());
    },
  };
}
let mockRewarded: ReturnType<typeof mockMakeAd>;
let mockInterstitial: ReturnType<typeof mockMakeAd>;

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({ initialize: mockInitialize }),
  AdsConsent: {
    gatherConsent: (...args: unknown[]) => mockGatherConsent(...args),
    getConsentInfo: (...args: unknown[]) => mockGetConsentInfo(...args),
    showPrivacyOptionsForm: () => mockShowPrivacyOptionsForm(),
  },
  AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED', NOT_REQUIRED: 'NOT_REQUIRED' },
  AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
  RewardedAdEventType: { LOADED: 'rewarded_loaded', EARNED_REWARD: 'rewarded_earned_reward' },
  RewardedAd: { createForAdRequest: () => (mockRewarded = mockMakeAd()) },
  InterstitialAd: { createForAdRequest: () => (mockInterstitial = mockMakeAd()) },
  TestIds: {
    ADAPTIVE_BANNER: 'test-banner',
    INTERSTITIAL: 'test-interstitial',
    REWARDED: 'test-rewarded',
  },
}));

type AdsModule = typeof import('@/lib/ads');

function loadAds(dev = true): AdsModule {
  let mod!: AdsModule;
  const g = globalThis as unknown as { __DEV__: boolean };
  const previous = g.__DEV__;
  g.__DEV__ = dev;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolateModules is synchronous
    mod = require('@/lib/ads');
  });
  g.__DEV__ = previous;
  return mod;
}

/** startAds is fire-and-forget; let its promise chain settle. */
const flush = () => new Promise<void>((resolve) => setImmediate(() => resolve()));

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.EXPO_PUBLIC_ADMOB_BANNER_ID;
  delete process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID;
  delete process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID;
  mockGatherConsent.mockResolvedValue({});
  mockGetConsentInfo.mockResolvedValue({ canRequestAds: true });
});

describe('ad units', () => {
  it('uses Google test units in development', () => {
    const { adUnits } = loadAds(true);
    expect(adUnits).toEqual({
      banner: 'test-banner',
      interstitial: 'test-interstitial',
      rewarded: 'test-rewarded',
    });
  });

  it('falls back to test units in release until real ones are configured', () => {
    expect(loadAds(false).adUnits.rewarded).toBe('test-rewarded');
  });

  it('uses configured units in release builds', () => {
    process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID = 'ca-app-pub-1/2';
    expect(loadAds(false).adUnits.rewarded).toBe('ca-app-pub-1/2');
  });
});

describe('startAds', () => {
  it('gathers consent before initialising the SDK', async () => {
    const order: string[] = [];
    mockGatherConsent.mockImplementation(async () => void order.push('consent'));
    mockInitialize.mockImplementationOnce(async () => {
      order.push('init');
      return [];
    });
    const ads = loadAds();

    ads.startAds();
    await flush();

    expect(order).toEqual(['consent', 'init']);
    expect(ads.useAds.getState().ready).toBe(true);
  });

  it('does not initialise when consent forbids requesting ads', async () => {
    mockGetConsentInfo.mockResolvedValue({ canRequestAds: false });
    const ads = loadAds();

    ads.startAds();
    await flush();

    expect(mockInitialize).not.toHaveBeenCalled();
    expect(ads.useAds.getState().ready).toBe(false);
    expect(ads.useAds.getState().consentResolved).toBe(true);
  });

  it('still starts from stored consent when gathering fails', async () => {
    mockGatherConsent.mockRejectedValue(new Error('offline'));
    const ads = loadAds();

    ads.startAds();
    await flush();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('initialises only once however often it is called', async () => {
    const ads = loadAds();

    ads.startAds();
    ads.startAds();
    await flush();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('stays off, without throwing, when initialisation fails', async () => {
    mockInitialize.mockRejectedValueOnce(new Error('sdk'));
    const ads = loadAds();

    expect(() => ads.startAds()).not.toThrow();
    await flush();

    expect(ads.useAds.getState().ready).toBe(false);
  });

  it('preloads the rewarded ad once ads are ready', async () => {
    const ads = loadAds();

    ads.startAds();
    await flush();
    mockRewarded.emit('rewarded_loaded');

    expect(mockRewarded.load).toHaveBeenCalled();
    expect(ads.useAds.getState().rewardedReady).toBe(true);
  });
});

describe('privacy options', () => {
  it('flags the entry point as required where the regulation applies', async () => {
    mockGetConsentInfo.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'REQUIRED',
    });
    const ads = loadAds();

    ads.startAds();
    await flush();

    expect(ads.useAds.getState().privacyOptionsRequired).toBe(true);
  });

  it('shows the form, then starts ads if the new choice allows them', async () => {
    mockGetConsentInfo.mockResolvedValue({ canRequestAds: false });
    const ads = loadAds();
    ads.startAds();
    await flush();

    mockGetConsentInfo.mockResolvedValue({ canRequestAds: true });
    await ads.showPrivacyOptions();

    expect(mockShowPrivacyOptionsForm).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });
});

describe('showRewarded', () => {
  it('resolves false at once when no ad is loaded', async () => {
    const ads = loadAds();
    expect(await ads.showRewarded()).toBe(false);
  });

  it('resolves true only if the reward was earned before the ad closed', async () => {
    const ads = loadAds();
    ads.loadRewarded();
    mockRewarded.emit('rewarded_loaded');
    const ad = mockRewarded;

    const result = ads.showRewarded();
    ad.emit('rewarded_earned_reward');
    ad.emit('closed');

    expect(await result).toBe(true);
  });

  it('resolves false when the player closes the ad early', async () => {
    const ads = loadAds();
    ads.loadRewarded();
    mockRewarded.emit('rewarded_loaded');
    const ad = mockRewarded;

    const result = ads.showRewarded();
    ad.emit('closed');

    expect(await result).toBe(false);
  });

  it('resolves false when the ad fails to show', async () => {
    const ads = loadAds();
    ads.loadRewarded();
    mockRewarded.emit('rewarded_loaded');
    mockRewarded.show.mockRejectedValueOnce(new Error('no fill'));

    expect(await ads.showRewarded()).toBe(false);
  });
});

describe('showInterstitial', () => {
  it('resolves at once when no ad is loaded, so play is never blocked', async () => {
    const ads = loadAds();
    ads.loadInterstitial();
    await expect(ads.showInterstitial()).resolves.toBeUndefined();
    expect(mockInterstitial.show).not.toHaveBeenCalled();
  });

  it('waits for the ad to close, then preloads the next one', async () => {
    const ads = loadAds();
    ads.loadInterstitial();
    mockInterstitial.emit('loaded');
    const ad = mockInterstitial;
    let done = false;

    const result = ads.showInterstitial().then(() => {
      done = true;
    });
    await flush();
    expect(done).toBe(false);
    ad.emit('closed');
    await result;

    expect(done).toBe(true);
    expect(mockInterstitial).not.toBe(ad);
  });
});
