import {
  getAnalytics,
  logEvent,
  logScreenView,
  setAnalyticsCollectionEnabled,
} from '@react-native-firebase/analytics';
import {
  getCrashlytics,
  recordError,
  setCrashlyticsCollectionEnabled,
} from '@react-native-firebase/crashlytics';
import { AdsConsent } from 'react-native-google-mobile-ads';

/**
 * Usage and crash reporting (Firebase Analytics + Crashlytics).
 *
 * Collection is off at launch (see firebase.json) and only switched on here,
 * once the user has not opted out and, where consent law applies
 * (EEA/UK/Switzerland), has agreed to storing information on the device.
 * Every call is a silent no-op on failure: telemetry must never break the app.
 */

let enabled = false;

/** Runs a reporting call, swallowing both sync throws and rejected promises. */
function safely(call: () => unknown) {
  try {
    Promise.resolve(call()).catch(() => {});
  } catch {
    // Reporting must never throw.
  }
}

/** Whether collection is permitted for this user right now. */
export async function isTelemetryAllowed(
  userEnabled: boolean,
  consentRequired: boolean,
): Promise<boolean> {
  if (!userEnabled) return false;
  if (!consentRequired) return true;
  try {
    const { storeAndAccessInformationOnDevice } = await AdsConsent.getUserChoices();
    return storeAndAccessInformationOnDevice;
  } catch {
    return false;
  }
}

/** Turns Firebase collection on or off to match the given decision. */
export async function setTelemetryEnabled(value: boolean) {
  enabled = value;
  try {
    await Promise.all([
      setAnalyticsCollectionEnabled(getAnalytics(), value),
      setCrashlyticsCollectionEnabled(getCrashlytics(), value),
    ]);
  } catch {
    enabled = false;
  }
}

/** Records a screen view. `name` is a route pattern, never user content. */
export function trackScreen(name: string) {
  if (!enabled) return;
  safely(() => logScreenView(getAnalytics(), { screen_name: name, screen_class: name }));
}

/** Records a named event with small, non-identifying parameters. */
export function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (!enabled) return;
  safely(() => logEvent(getAnalytics(), name, params));
}

/** Reports a caught error that the app recovered from. */
export function reportError(error: unknown) {
  if (!enabled) return;
  try {
    recordError(getCrashlytics(), error instanceof Error ? error : new Error(String(error)));
  } catch {
    // Reporting must never throw.
  }
}

/** Collapses a route's segments into a stable screen name, e.g. "play". */
export function screenNameFromSegments(segments: readonly string[]): string {
  const visible = segments.filter((segment) => !segment.startsWith('('));
  return visible.length ? visible.join('/') : 'home';
}
