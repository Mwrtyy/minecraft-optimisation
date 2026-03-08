import { Vector2 } from "../../shared/types.js";

export function distance(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function weightedPick<T>(items: T[], weightOf: (i: T) => number): T {
  const total = items.reduce((sum, i) => sum + weightOf(i), 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const item of items) {
    acc += weightOf(item);
    if (r <= acc) {
      return item;
    }
  }
  return items[items.length - 1];
}
