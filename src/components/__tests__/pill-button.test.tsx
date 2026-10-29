import { fireEvent, render, screen } from '@testing-library/react-native';

import { PillButton } from '@/components/pill-button';

it('calls onPress when pressed', async () => {
  const onPress = jest.fn();
  await render(<PillButton label="Play again" onPress={onPress} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Play again' }));

  expect(onPress).toHaveBeenCalledTimes(1);
});

it('does nothing while disabled', async () => {
  const onPress = jest.fn();
  await render(<PillButton label="Play again" onPress={onPress} disabled />);

  await fireEvent.press(screen.getByRole('button', { name: 'Play again' }));

  expect(onPress).not.toHaveBeenCalled();
});
