import * as Haptics from 'expo-haptics';

import type { GameEvent } from '@/engine/blob';
import { useProgress } from '@/store/progress';

/** Gentle feedback for what just happened; silent when the player turned haptics off. */
export function feedbackFor(event: GameEvent): void {
  if (!useProgress.getState().haptics) return;
  const run = (p: Promise<void>) => p.catch(() => {});
  switch (event.type) {
    case 'row-clear':
    case 'letter':
      run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      break;
    case 'word':
      run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      break;
    case 'hit':
    case 'wrong-letter':
      run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
      break;
    case 'over':
      run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
      break;
  }
}
