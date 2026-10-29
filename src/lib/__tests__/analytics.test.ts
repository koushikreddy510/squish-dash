/**
 * Telemetry must stay off unless the user and (where required) consent allow it,
 * and must never throw into the app.
 */

import {
  getAnalytics,
  logEvent,
  logScreenView,
  setAnalyticsCollectionEnabled,
} from '@react-native-firebase/analytics';
import { recordError, setCrashlyticsCollectionEnabled } from '@react-native-firebase/crashlytics';

import {
  isTelemetryAllowed,
  reportError,
  screenNameFromSegments,
  setTelemetryEnabled,
  trackEvent,
  trackScreen,
} from '@/lib/analytics';

const mockGetUserChoices = jest.fn();

jest.mock('react-native-google-mobile-ads', () => ({
  AdsConsent: { getUserChoices: () => mockGetUserChoices() },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('isTelemetryAllowed', () => {
  it('is off when the user opted out, whatever consent says', async () => {
    mockGetUserChoices.mockResolvedValue({ storeAndAccessInformationOnDevice: true });

    expect(await isTelemetryAllowed(false, false)).toBe(false);
    expect(await isTelemetryAllowed(false, true)).toBe(false);
  });

  it('is on outside consent regions when the user has not opted out', async () => {
    expect(await isTelemetryAllowed(true, false)).toBe(true);
    expect(mockGetUserChoices).not.toHaveBeenCalled();
  });

  it('follows the consent choice where consent is required', async () => {
    mockGetUserChoices.mockResolvedValue({ storeAndAccessInformationOnDevice: true });
    expect(await isTelemetryAllowed(true, true)).toBe(true);

    mockGetUserChoices.mockResolvedValue({ storeAndAccessInformationOnDevice: false });
    expect(await isTelemetryAllowed(true, true)).toBe(false);
  });

  it('fails closed when consent cannot be read', async () => {
    mockGetUserChoices.mockRejectedValue(new Error('no consent module'));

    expect(await isTelemetryAllowed(true, true)).toBe(false);
  });
});

describe('collection switch', () => {
  it('drives both Analytics and Crashlytics', async () => {
    await setTelemetryEnabled(true);

    expect(setAnalyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), true);
    expect(setCrashlyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), true);
  });

  it('sends nothing while disabled', async () => {
    await setTelemetryEnabled(false);

    trackScreen('home');
    trackEvent('round_end', { score: 12 });
    reportError(new Error('boom'));

    expect(logScreenView).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
    expect(recordError).not.toHaveBeenCalled();
  });

  it('sends screens, events and errors once enabled', async () => {
    await setTelemetryEnabled(true);

    trackScreen('play');
    trackEvent('round_end', { score: 12 });
    reportError('plain string');

    expect(logScreenView).toHaveBeenCalledWith(getAnalytics(), {
      screen_name: 'play',
      screen_class: 'play',
    });
    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'round_end', { score: 12 });
    expect(recordError).toHaveBeenCalledWith(expect.anything(), expect.any(Error));
  });

  it('never throws when Firebase fails', async () => {
    await setTelemetryEnabled(true);
    (logEvent as jest.Mock).mockImplementationOnce(() => {
      throw new Error('native down');
    });

    expect(() => trackEvent('x')).not.toThrow();
  });

  it('turns itself off if the native switch fails', async () => {
    (setAnalyticsCollectionEnabled as jest.Mock).mockRejectedValueOnce(new Error('native down'));
    await setTelemetryEnabled(true);

    trackEvent('x');

    expect(logEvent).not.toHaveBeenCalled();
  });
});

describe('screenNameFromSegments', () => {
  it('drops route groups and keeps the route name', () => {
    expect(screenNameFromSegments(['(group)', 'settings'])).toBe('settings');
    expect(screenNameFromSegments(['play'])).toBe('play');
  });

  it('names the index screen "home"', () => {
    expect(screenNameFromSegments(['(group)'])).toBe('home');
    expect(screenNameFromSegments([])).toBe('home');
  });
});
