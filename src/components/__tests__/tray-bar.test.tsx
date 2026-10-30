import { fireEvent, render, screen } from '@testing-library/react-native';

import { TrayBar } from '@/components/tray-bar';

describe('TrayBar', () => {
  it('shows the collected letters', async () => {
    await render(<TrayBar tray={['C', 'A', 'T']} valid onBank={jest.fn()} onClear={jest.fn()} />);
    expect(screen.getByLabelText('Tray: CAT')).toBeTruthy();
  });

  it('says when the tray is empty', async () => {
    await render(<TrayBar tray={[]} valid={false} onBank={jest.fn()} onClear={jest.fn()} />);
    expect(screen.getByLabelText('Tray is empty')).toBeTruthy();
  });

  it('calls bank and clear', async () => {
    const onBank = jest.fn();
    const onClear = jest.fn();
    await render(<TrayBar tray={['A']} valid={false} onBank={onBank} onClear={onClear} />);
    await fireEvent.press(screen.getByText('Bank'));
    await fireEvent.press(screen.getByText('Clear'));
    expect(onBank).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
