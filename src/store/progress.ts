/**
 * Scores and preferences, saved on the device so they survive a restart.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Mode } from '@/engine/blob';

type ProgressState = {
  bestEndless: number;
  bestWord: number;
  haptics: boolean;
  /** User's choice to share anonymous usage and crash data. */
  analyticsEnabled: boolean;
  /** False until AsyncStorage has been read. */
  hydrated: boolean;

  /** Records a finished round; returns true when it is a new best. */
  recordScore: (mode: Mode, score: number) => boolean;
  setHaptics: (value: boolean) => void;
  setAnalyticsEnabled: (value: boolean) => void;
  setHydrated: (value: boolean) => void;
};

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      bestEndless: 0,
      bestWord: 0,
      haptics: true,
      analyticsEnabled: true,
      hydrated: false,

      recordScore: (mode, score) => {
        const key = mode === 'endless' ? 'bestEndless' : 'bestWord';
        if (score <= get()[key]) return false;
        set({ [key]: score } as Pick<ProgressState, 'bestEndless' | 'bestWord'>);
        return true;
      },
      setHaptics: (haptics) => set({ haptics }),
      setAnalyticsEnabled: (analyticsEnabled) => set({ analyticsEnabled }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'squish-progress',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // `hydrated` is runtime state; persisting it would come back as `true`
      // before storage has actually been read on the next launch.
      partialize: ({ hydrated: _hydrated, ...rest }) => rest,
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
