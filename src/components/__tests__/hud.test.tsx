import { render, screen } from '@testing-library/react-native';

import { Hud } from '@/components/hud';
import { createGame, snapshot, startGame } from '@/engine/blob';

describe('Hud', () => {
  it('shows score and hearts but no word in endless mode', async () => {
    const g = createGame('endless', 1);
    startGame(g);
    g.score = 12;
    g.hearts = 2;

    await render(<Hud snap={snapshot(g)} />);

    expect(screen.getByLabelText('Score 12')).toBeTruthy();
    expect(screen.getByLabelText('2 hearts left')).toBeTruthy();
    expect(screen.queryByLabelText(/^Word:/)).toBeNull();
  });

  it('shows the current word in word mode', async () => {
    const g = createGame('word', 1);
    startGame(g);

    await render(<Hud snap={snapshot(g)} />);

    expect(screen.getByLabelText(`Word: ${g.words[0]}`)).toBeTruthy();
  });
});
