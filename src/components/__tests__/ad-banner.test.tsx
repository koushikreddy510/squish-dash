/** The banner must stay out of the way until ads are allowed and ready. */

import { render, screen } from '@testing-library/react-native';

import { AdBanner } from '@/components/ad-banner';
import { useAds } from '@/lib/ads';

jest.mock('react-native-google-mobile-ads', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories run before imports
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => ({ initialize: jest.fn() }),
    AdsConsent: { gatherConsent: jest.fn(), getConsentInfo: jest.fn() },
    AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED' },
    AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
    RewardedAdEventType: { LOADED: 'rewarded_loaded', EARNED_REWARD: 'rewarded_earned_reward' },
    RewardedAd: { createForAdRequest: jest.fn() },
    InterstitialAd: { createForAdRequest: jest.fn() },
    TestIds: { ADAPTIVE_BANNER: 'test-unit', INTERSTITIAL: 'i', REWARDED: 'r' },
    BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
    BannerAd: ({ unitId, size }: { unitId: string; size: string }) => (
      <Text testID="banner">{`${unitId}|${size}`}</Text>
    ),
  };
});

beforeEach(() => {
  useAds.setState({ ready: false });
});

it('renders nothing before consent and SDK start finish', async () => {
  await render(<AdBanner />);

  expect(screen.queryByTestId('banner')).toBeNull();
});

it('shows the banner once ads are ready', async () => {
  useAds.setState({ ready: true });

  await render(<AdBanner />);

  expect(screen.getByTestId('banner')).toHaveTextContent('test-unit|ANCHORED_ADAPTIVE_BANNER');
});
