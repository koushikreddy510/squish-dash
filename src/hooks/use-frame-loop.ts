import { useEffect, useRef } from 'react';

/** Calls `onFrame` with the seconds since the previous frame, once per animation frame. */
export function useFrameLoop(onFrame: (dt: number) => void) {
  const callback = useRef(onFrame);
  useEffect(() => {
    callback.current = onFrame;
  });

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (last) callback.current((t - last) / 1000);
      last = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}
