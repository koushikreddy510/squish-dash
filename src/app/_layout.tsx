import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { startAds, useAds } from '@/lib/ads';
import { isTelemetryAllowed, screenNameFromSegments, setTelemetryEnabled, trackScreen } from '@/lib/analytics';
import { useProgress } from '@/store/progress';

export default function RootLayout() {
  const hydrated = useProgress((state) => state.hydrated);
  const analyticsEnabled = useProgress((state) => state.analyticsEnabled);
  const consentResolved = useAds((state) => state.consentResolved);
  const consentRequired = useAds((state) => state.privacyOptionsRequired);
  const screenName = screenNameFromSegments(useSegments());

  useEffect(() => {
    startAds();
  }, []);

  // Telemetry stays off until consent for this launch is known.
  useEffect(() => {
    if (!hydrated || !consentResolved) return;
    let cancelled = false;
    isTelemetryAllowed(analyticsEnabled, consentRequired).then((allowed) => {
      if (!cancelled) setTelemetryEnabled(allowed);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, consentResolved, consentRequired, analyticsEnabled]);

  useEffect(() => {
    if (hydrated) trackScreen(screenName);
  }, [hydrated, screenName]);

  // Hold the first frame until saved scores and settings are read.
  if (!hydrated) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
          animation: 'fade',
        }}
      />
    </>
  );
}
