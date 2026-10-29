import { WORLD } from '@/engine/blob';

/** The solid stretches of a wall, given its gaps: [from, to] in world x. */
export function wallSegments(gaps: readonly { cx: number; w: number }[]): [number, number][] {
  const sorted = [...gaps].sort((a, b) => a.cx - b.cx);
  const out: [number, number][] = [];
  let x = 0;
  for (const g of sorted) {
    const left = g.cx - g.w / 2;
    if (left > x) out.push([x, left]);
    x = Math.max(x, g.cx + g.w / 2);
  }
  if (x < WORLD.width) out.push([x, WORLD.width]);
  return out;
}
