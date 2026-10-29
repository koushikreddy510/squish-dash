import { fireEvent, render, screen } from '@testing-library/react-native';

import { GameView } from '@/components/game-view';
import { advance, createGame, snapshot, startGame } from '@/engine/blob';

function wordSnap() {
  const g = createGame('word', 3);
  startGame(g);
  advance(g, 1, { x: 150, squeeze: 0.3 });
  return { g, snap: snapshot(g) };
}

describe('GameView touches', () => {
  it('passes touches through as world units at normal size', async () => {
    const onTouch = jest.fn();
    await render(<GameView snap={snapshot(createGame('endless', 1))} onTouch={onTouch} />);

    await fireEvent(screen.getByTestId('game-view'), 'responderGrant', {
      nativeEvent: { locationX: 120, locationY: 200 },
    });

    expect(onTouch).toHaveBeenCalledWith(120, 200);
  });

  it('scales touches back to world units when the screen is larger', async () => {
    const onTouch = jest.fn();
    await render(<GameView snap={snapshot(createGame('endless', 1))} onTouch={onTouch} />);
    const view = screen.getByTestId('game-view');

    await fireEvent(view, 'layout', { nativeEvent: { layout: { width: 600, height: 1040 } } });
    await fireEvent(view, 'responderMove', { nativeEvent: { locationX: 300, locationY: 520 } });

    expect(onTouch).toHaveBeenLastCalledWith(150, 260);
  });
});

describe('GameView drawing', () => {
  it('prints the letter above each gap in word mode', async () => {
    const { snap } = wordSnap();
    const row = snap.rows[0];

    await render(<GameView snap={snap} onTouch={jest.fn()} />);

    for (const gap of row.gaps) expect(screen.getAllByText(gap.letter).length).toBeGreaterThan(0);
  });

  it('prints no letters in endless mode', async () => {
    const g = createGame('endless', 3);
    startGame(g);
    advance(g, 1, { x: 150, squeeze: 0.3 });

    await render(<GameView snap={snapshot(g)} onTouch={jest.fn()} />);

    expect(screen.queryByText(/^[A-Z]$/)).toBeNull();
  });
});
