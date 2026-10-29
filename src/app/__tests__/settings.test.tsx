import { fireEvent, render, screen } from '@testing-library/react-native';

import SettingsScreen from '@/app/settings';
import { useAds } from '@/lib/ads';
import { useProgress } from '@/store/progress';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/lib/ads', () => ({
  useAds: jest.fn(),
  showPrivacyOptions: jest.fn(() => Promise.resolve()),
}));

const mockUseAds = useAds as unknown as jest.Mock;

beforeEach(() => {
  useProgress.setState({ haptics: true, analyticsEnabled: true });
  mockUseAds.mockImplementation((select: (s: { privacyOptionsRequired: boolean }) => unknown) =>
    select({ privacyOptionsRequired: false }),
  );
});

describe('SettingsScreen', () => {
  it('toggles haptics and usage data in the saved settings', async () => {
    await render(<SettingsScreen />);

    await fireEvent(screen.getByLabelText('Haptics'), 'valueChange', false);
    await fireEvent(screen.getByLabelText('Usage and crash data'), 'valueChange', false);

    expect(useProgress.getState().haptics).toBe(false);
    expect(useProgress.getState().analyticsEnabled).toBe(false);
  });

  it('hides the privacy row outside consent regions', async () => {
    await render(<SettingsScreen />);

    expect(screen.queryByText('Privacy settings')).toBeNull();
  });

  it('shows the privacy row where consent can be changed', async () => {
    mockUseAds.mockImplementation((select: (s: { privacyOptionsRequired: boolean }) => unknown) =>
      select({ privacyOptionsRequired: true }),
    );
    await render(<SettingsScreen />);

    expect(screen.getByText('Privacy settings')).toBeTruthy();
  });
});
