import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { create } from 'zustand';

/**
 * Ads for Squish Dash. AdMob IDs are client-side identifiers, not secrets.
 *
 * Debug builds always use Google's test units. Release builds use the real
 * Squish Dash units, which EXPO_PUBLIC_ADMOB_* variables can override.
 * The App ID lives in app.json under the react-native-google-mobile-ads plugin.
 *
 * Placement rules: a banner on menu screens only, a rewarded ad to continue a
 * lost round, and an interstitial at round ends (see ad-policy.ts). Nothing
 * ever appears while the blob is moving.
 */
const env = process.env;
export const adUnits = {
  banner: __DEV__ ? TestIds.ADAPTIVE_BANNER : (env.EXPO_PUBLIC_ADMOB_BANNER_ID ?? 'ca-app-pub-1830143198859206/9192365164'),
  interstitial: __DEV__ ? TestIds.INTERSTITIAL : (env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID ?? 'ca-app-pub-1830143198859206/8811549224'),
  rewarded: __DEV__ ? TestIds.REWARDED : (env.EXPO_PUBLIC_ADMOB_REWARDED_ID ?? 'ca-app-pub-1830143198859206/4712522110'),
};

type AdsState = {
  /** True once consent is resolved and the Mobile Ads SDK is initialised. */
  ready: boolean;
  /** True where the user must be able to reopen their consent choice (EEA/UK/CH). */
  privacyOptionsRequired: boolean;
  /** True once the consent status for this launch is known (even if ads are off). */
  consentResolved: boolean;
  /** A rewarded ad is loaded and can be shown. */
  rewardedReady: boolean;
};

export const useAds = create<AdsState>(() => ({
  ready: false,
  privacyOptionsRequired: false,
  consentResolved: false,
  rewardedReady: false,
}));

let started = false;

async function initializeIfAllowed() {
  const { canRequestAds, privacyOptionsRequirementStatus } = await AdsConsent.getConsentInfo();
  useAds.setState({
    privacyOptionsRequired:
      privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    consentResolved: true,
  });
  // Re-check after the await: another call may have started the SDK meanwhile.
  if (!canRequestAds || started) return;
  started = true;
  await mobileAds().initialize();
  useAds.setState({ ready: true });
  loadRewarded();
  loadInterstitial();
}

/**
 * Gathers UMP consent (Google's form where required, e.g. EEA/UK), then
 * initialises the SDK and preloads full-screen ads. Failures leave ads off.
 */
export function startAds() {
  AdsConsent.gatherConsent()
    .catch(() => {})
    // Even when gathering fails, the UMP SDK may hold last session's consent.
    .then(initializeIfAllowed)
    .catch(() => {});
}

/** Reopens Google's consent form so the user can change or withdraw their choice. */
export async function showPrivacyOptions() {
  await AdsConsent.showPrivacyOptionsForm();
  await initializeIfAllowed();
}

let rewarded: RewardedAd | null = null;
let interstitial: InterstitialAd | null = null;
let interstitialReady = false;

export function loadRewarded() {
  useAds.setState({ rewardedReady: false });
  try {
    rewarded = RewardedAd.createForAdRequest(adUnits.rewarded);
    rewarded.addAdEventListener(RewardedAdEventType.LOADED, () =>
      useAds.setState({ rewardedReady: true }),
    );
    rewarded.addAdEventListener(AdEventType.ERROR, () => useAds.setState({ rewardedReady: false }));
    rewarded.load();
  } catch {
    rewarded = null;
  }
}

export function loadInterstitial() {
  interstitialReady = false;
  try {
    interstitial = InterstitialAd.createForAdRequest(adUnits.interstitial);
    interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitialReady = true;
    });
    interstitial.addAdEventListener(AdEventType.ERROR, () => {
      interstitialReady = false;
    });
    interstitial.load();
  } catch {
    interstitial = null;
  }
}

/** Shows the rewarded ad. Resolves true only if the player earned the reward. */
export function showRewarded(): Promise<boolean> {
  const ad = rewarded;
  if (!ad || !useAds.getState().rewardedReady) return Promise.resolve(false);
  return new Promise((resolve) => {
    let earned = false;
    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      resolve(earned);
      loadRewarded();
    });
    ad.addAdEventListener(AdEventType.ERROR, () => resolve(false));
    ad.show().catch(() => resolve(false));
  });
}

/** Shows an interstitial if one is loaded. Resolves when it closes, or at once if none is ready. */
export function showInterstitial(): Promise<void> {
  const ad = interstitial;
  if (!ad || !interstitialReady) return Promise.resolve();
  return new Promise((resolve) => {
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      resolve();
      loadInterstitial();
    });
    ad.addAdEventListener(AdEventType.ERROR, () => resolve());
    ad.show().catch(() => resolve());
  });
}
