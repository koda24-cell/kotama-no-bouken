import { createField3DLOD, getField3DLODAssetLevels } from "./field-3d-lod.js";
import { createField3DProceduralModel } from "./field-3d-procedural-models.js";

/**
 * field-3d-landmark-layer.js
 * Explicit placement layer for large environmental silhouettes.
 * Placements are authored by map designers; this module never invents map logic.
 */

const DEFAULTS = Object.freeze({
  monolith: { color: 0x536052, size: [1.15, 3.7, 0.72] },
  brokenColumn: { color: 0x777767, size: [0.82, 2.35, 0.82] },
  ancientArch: { color: 0x626b5b, size: [3.25, 3.65, 0.55] },
  rootCurtain: { color: 0x493b2b, size: [2.8, 2.4, 0.32] },
  canopy: { color: 0x263f30, size: [3.8, 1.4, 3.8] }
});

function createFallback(THREE, kind, config, detail = 0) {
  // Prefer detailed, purpose-built procedural models. Unknown kinds still receive
  // a visible stone marker from the shared model factory.
  return createField3DProceduralModel(THREE, kind, { detail, definition: config });
}

export function buildField3DLandmarkLayer(THREE, placements = [], {
  assets = {},
  definitions = {},
  maxCount = 80,
  floorY = 0,
  lodDistances = [0, 18, 36],
  lodHysteresis = 0.08,
  onPlacementError = null
} = {}) {
  if (!THREE?.Group || !Array.isArray(placements)) {
    throw new TypeError("buildField3DLandmarkLayer: Three.js and a placement array are required.");
  }
  const group = new THREE.Group();
  group.name = "kotama-field-3d-landmarks";
  const counts = {};
  const owned = [];
  const errors = [];

  for (const placement of placements.slice(0, maxCount)) {
    const kind = String(placement.kind || "");
    const config = { ...(DEFAULTS[kind] || DEFAULTS.monolith), ...(definitions[kind] || {}), ...(placement.definition || {}) };
    const asset = assets[placement.assetKey || kind];
    let node;
    try {
      const variantKeys = placement.lodAssetKeys || null;
      const variantLevels = variantKeys
        ? getField3DLODAssetLevels(assets, variantKeys, "landmark")
        : [];
      if (variantLevels.length >= 2) {
        node = createField3DLOD(THREE, variantLevels.map(level => ({
          object: level.asset.clone(),
          distance: level.distance,
          hysteresis: level.hysteresis
        })), { name: placement.id || "landmark-" + kind, hysteresis: lodHysteresis });
      } else if (asset?.clone) {
        // Keep the authored high-quality GLB until matching LOD variants are supplied.
        node = asset.clone();
      } else {
        const distances = lodDistances.length >= 3 ? lodDistances : [0, 18, 36];
        const levels = [0, 1, 2].map(detail => ({
          object: createFallback(THREE, kind, config, detail),
          distance: Number(distances[detail]) || 0,
          hysteresis: lodHysteresis
        }));
        node = createField3DLOD(THREE, levels, {
          name: placement.id || "landmark-" + kind,
          hysteresis: lodHysteresis
        });
      }
      const pos = placement.position || {};
      node.position.set(Number(pos.x) || 0, Number(pos.y ?? floorY) || 0, Number(pos.z) || 0);
      const rot = placement.rotation || {};
      node.rotation.set(Number(rot.x) || 0, Number(rot.y) || 0, Number(rot.z) || 0);
      const s = placement.scale ?? 1;
      if (typeof s === "number") node.scale.setScalar(s);
      else node.scale.set(Number(s.x) || 1, Number(s.y) || 1, Number(s.z) || 1);
      node.name = placement.id || "landmark-" + kind;
      node.userData = {
        ...node.userData,
        presentationOnly: true,
        landmarkId: placement.id || null,
        landmarkKind: kind
      };
      group.add(node);
      node.traverse(child => {
        if (child.userData?.generatedResources) owned.push(child.userData.generatedResources);
      });
      counts[kind] = (counts[kind] || 0) + 1;
    } catch (error) {
      errors.push({ id: placement.id || null, kind, message: String(error?.message || error) });
      onPlacementError?.(error, placement);
    }
  }

  function dispose() {
    group.traverse(node => {
      if (node.parent) node.parent.remove(node);
    });
    for (const resource of owned) {
      resource.geometries.forEach(item => item.dispose?.());
      resource.materials.forEach(item => item.dispose?.());
    }
    group.clear();
  }

  return Object.freeze({
    group,
    counts: Object.freeze(counts),
    errors: Object.freeze(errors),
    dispose
  });
}
