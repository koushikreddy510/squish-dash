import * as Haptics from 'expo-haptics';

import { feedbackFor } from '@/lib/haptics';
import { useProgress } from '@/store/progress';

beforeEach(() => {
  jest.clearAllMocks();
  useProgress.setState({ haptics: true });
});

describe('feedbackFor', () => {
  it('taps lightly for a cleared wall or a found letter', () => {
    feedbackFor({ type: 'row-clear' });
    feedbackFor({ type: 'letter' });
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
  });

  it('celebrates a finished word', () => {
    feedbackFor({ type: 'word' });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('warns on a hit or a wrong letter, and signals the end of the run', () => {
    feedbackFor({ type: 'hit' });
    feedbackFor({ type: 'bad-word' });
    feedbackFor({ type: 'over' });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
  });

  it('stays silent when haptics are off', () => {
    useProgress.setState({ haptics: false });
    feedbackFor({ type: 'hit' });
    feedbackFor({ type: 'row-clear' });
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});
