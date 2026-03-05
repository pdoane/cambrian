// utils.js -- Small math helpers used throughout the simulation.

/** Clamp a value between min and max */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Random float in [min, max) */
export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/** Squared distance between two points (avoids expensive sqrt) */
export function distSq(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}
