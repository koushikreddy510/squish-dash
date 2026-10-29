import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { startAds } from '@/lib/ads';
import { useProgress } from '@/store/progress';

export default function RootLayout() {
  const hydrated = useProgress((state) => state.hydrated);

  useEffect(() => {
    startAds();
  }, []);

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
