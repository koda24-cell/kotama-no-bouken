// Pure policy module for offline Actions testing. NOT wired into gameplay yet.
// All thresholds are experimental. Keep collision/navigation independent of render LOD.
export function chooseLOD({ projectedPixels, previous = 0, important = false, hysteresis = 0.12 } = {}) {
  if (!Number.isFinite(projectedPixels) || projectedPixels < 0) throw new TypeError('projectedPixels must be nonnegative');
  if (![0, 1, 2].includes(previous)) throw new TypeError('previous LOD invalid');
  if (hysteresis < 0 || hysteresis >= 0.49) throw new TypeError('invalid hysteresis');
  // For offscreen/not loaded assets, render visibility is decided elsewhere.
  // Never convert unseen object into removed gameplay/collision object.
  const px = important ? projectedPixels * 1.5 : projectedPixels;
  const high = 200;
  const mid = 70;
  if (previous === 0) {
    if (px < high * (1 - hysteresis)) return px < mid * (1 - hysteresis) ? 2 : 1;
    return 0;
  }
  if (previous === 1) {
    if (px >= high * (1 + hysteresis)) return 0;
    if (px < mid * (1 - hysteresis)) return 2;
    return 1;
  }
  if (px >= high * (1 + hysteresis)) return 0;
  if (px >= mid * (1 + hysteresis)) return 1;
  return 2;
}
export function classifyCells({ x, y, radius = 3, prefetchRing = 1 } = {}) {
  if (![x, y, radius, prefetchRing].every(Number.isInteger) || radius < 0 || prefetchRing < 0) throw new TypeError('invalid grid inputs');
  const visible = [], prefetch = [];
  for (let dy = -radius-prefetchRing; dy <= radius+prefetchRing; dy++) {
    for (let dx = -radius-prefetchRing; dx <= radius+prefetchRing; dx++) {
      const dst = Math.max(Math.abs(dx),Math.abs(dy));
      const tile = { x:x+dx, y:y+dy };
      if (dst <= radius) visible.push(tile);
      else prefetch.push(tile);
    }
  }
  return { visible, prefetch };
}
