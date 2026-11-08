/**
 * field-3d-lod.js
 * Distance-based presentation LOD helpers for Three.js scenes.
 *
 * LOD is visual-only: it never changes grid, collision, exploration or game state.
 * Distances are world units measured from the active camera.
 */

export const FIELD_3D_LOD_PRESETS = Object.freeze({
  landmark: Object.freeze([
    Object.freeze({ key: "lod0", distance: 0, hysteresis: 0.08 }),
    Object.freeze({ key: "lod1", distance: 18, hysteresis: 0.08 }),
    Object.freeze({ key: "lod2", distance: 36, hysteresis: 0.08 })
  ]),
  prop: Object.freeze([
    Object.freeze({ key: "lod0", distance: 0, hysteresis: 0.08 }),
    Object.freeze({ key: "lod1", distance: 12, hysteresis: 0.08 }),
    Object.freeze({ key: "lod2", distance: 26, hysteresis: 0.08 })
  ])
});

export function createField3DLOD(THREE, levels, {
  name = "kotama-field-3d-lod",
  hysteresis = 0.08
} = {}) {
  if (!THREE?.LOD || !Array.isArray(levels) || levels.length < 2) {
    throw new TypeError("createField3DLOD: THREE.LOD and at least two levels are required.");
  }
  const normalized = levels
    .filter(level => level?.object && Number.isFinite(level.distance) && level.distance >= 0)
    .sort((a, b) => a.distance - b.distance);
  if (normalized.length < 2 || normalized[0].distance !== 0) {
    throw new RangeError("LOD levels must include a valid level at distance 0 and at least one farther level.");
  }
  const distances = new Set();
  const lod = new THREE.LOD();
  lod.name = name;
  lod.autoUpdate = true;
  for (const level of normalized) {
    if (distances.has(level.distance)) throw new RangeError("LOD distances must be unique.");
    distances.add(level.distance);
    lod.addLevel(level.object, level.distance, Number.isFinite(level.hysteresis) ? level.hysteresis : hysteresis);
  }
  lod.userData = {
    ...lod.userData,
    presentationOnly: true,
    kotama3DLOD: true,
    lodDistances: normalized.map(level => level.distance)
  };
  return lod;
}

export function getField3DLODAssetLevels(assets, keys, preset = "landmark") {
  const distances = FIELD_3D_LOD_PRESETS[preset] || FIELD_3D_LOD_PRESETS.landmark;
  return distances
    .map(level => ({ ...level, asset: assets?.[keys?.[level.key]] }))
    .filter(level => level.asset && typeof level.asset.clone === "function");
}
