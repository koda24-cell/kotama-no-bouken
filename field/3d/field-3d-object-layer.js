import { createField3DProceduralModel } from "./field-3d-procedural-models.js";

/**
 * field-3d-object-layer.js
 * Presentation-only placement layer for objects in a field-3d-grid-adapter snapshot.
 *
 * It never changes field state, discovery flags, rewards, doors, puzzles or collision.
 * Hidden objects are omitted when the adapter's existing isObjectHidden callback says so.
 */

const DEFAULT_ASSET_KEYS = Object.freeze({
  stairs: "stairs",
  save: "savePoint",
  chest: "chest",
  gather: "gatherPoint",
  sign: "sign",
  gate: "gate",
  door: "door",
  exit: "exit",
  npc: "npc",
  event: "event",
  cache: "cache"
});

const DEFAULT_SIZES = Object.freeze({
  stairs: [1.25, 0.55, 1.25],
  save: [0.42, 1.25, 0.42],
  chest: [0.9, 0.65, 0.65],
  gather: [0.72, 0.9, 0.72],
  sign: [0.22, 1.1, 0.22],
  gate: [1.5, 2.2, 0.24],
  door: [1.45, 2.35, 0.22],
  exit: [0.85, 1.4, 0.85],
  npc: [0.55, 1.5, 0.55],
  event: [0.48, 0.9, 0.48],
  cache: [0.8, 0.6, 0.6],
  unknown: [0.55, 0.8, 0.55]
});

const DEFAULT_COLORS = Object.freeze({
  stairs: 0x8a826d,
  save: 0x65c8a2,
  chest: 0xb58a4f,
  gather: 0x6d9d65,
  sign: 0x9b8058,
  gate: 0x596c62,
  door: 0x75634b,
  exit: 0x8dc7b1,
  npc: 0x8293ad,
  event: 0x8e79b5,
  cache: 0xb58a4f,
  unknown: 0x7b827a
});

export function buildField3DObjectLayer(THREE, snapshot, {
  assets = {},
  assetKeys = {},
  floorY = 0,
  fallback = true,
  fallbackColors = {},
  fallbackSizes = {},
  hideConcealed = true,
  yOffset = 0,
  proceduralTextures = {}
} = {}) {
  if (!THREE?.Group || !THREE?.Mesh || !snapshot?.objects) {
    throw new TypeError("buildField3DObjectLayer: Three.js and a valid snapshot are required.");
  }

  const group = new THREE.Group();
  group.name = "kotama-field-3d-objects";
  const keyMap = { ...DEFAULT_ASSET_KEYS, ...assetKeys };
  const colors = { ...DEFAULT_COLORS, ...fallbackColors };
  const sizes = { ...DEFAULT_SIZES, ...fallbackSizes };
  const geometries = new Map();
  const materials = new Map();
  const placed = [];
  const skipped = [];
  const ownedResources = [];

  function placeholder(kind) {
    const proceduralKind = kind === "chest" || kind === "cache" ? "chest"
      : kind === "save" ? "saveLamp"
      : kind === "gather" ? "gather"
      : kind === "door" ? "door"
      : kind === "gate" ? "gate"
      : kind === "stairs" ? "stairs"
      : kind === "sign" ? "sign" : null;
    if (proceduralKind) {
      const model = createField3DProceduralModel(THREE, proceduralKind, { detail: 0, textures: proceduralTextures });
      if (model.userData.generatedResources) ownedResources.push(model.userData.generatedResources);
      model.userData.kotama3dPlaceholder = kind;
      return model;
    }
    const size = sizes[kind] || sizes.unknown;
    const geometryKey = size.join(",");
    if (!geometries.has(geometryKey)) {
      geometries.set(geometryKey, new THREE.BoxGeometry(size[0], size[1], size[2]));
    }
    const color = colors[kind] ?? colors.unknown;
    const materialKey = String(color);
    if (!materials.has(materialKey)) {
      materials.set(materialKey, new THREE.MeshStandardMaterial({
        color, roughness: 0.78, metalness: 0.04
      }));
    }
    const mesh = new THREE.Mesh(geometries.get(geometryKey), materials.get(materialKey));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.kotama3dPlaceholder = kind;
    return mesh;
  }

  for (const object of snapshot.objects) {
    if (hideConcealed && object.hidden) {
      skipped.push({ key: object.key, reason: "hidden-by-game-state" });
      continue;
    }

    const assetKey = keyMap[object.kind];
    const asset = assetKey ? assets[assetKey] : null;
    let instance = null;
    if (asset && typeof asset.clone === "function") {
      instance = asset.clone();
    } else if (fallback) {
      instance = placeholder(object.kind);
    }

    if (!instance) {
      skipped.push({ key: object.key, reason: "asset-unavailable" });
      continue;
    }

    const scale = snapshot.scale || 1;
    const x = object.world?.x ?? (object.tx + 0.5) * scale;
    const z = object.world?.z ?? (object.ty + 0.5) * scale;
    instance.position.set(x, floorY + yOffset, z);
    if (object.onWall) {
      // Wall-mounted props are lifted slightly and offset toward the cell's far edge.
      instance.position.y += 0.65;
    }
    if (object.kind === "door" && object.doorOpen) {
      // Visual hint only; actual passage state remains owned by the game.
      instance.rotation.y += Math.PI / 2;
    }
    instance.userData.kotamaFieldObject = Object.freeze({
      key: object.key,
      id: object.id,
      kind: object.kind,
      presentationClass: object.presentationClass,
      doorOpen: object.doorOpen,
      puzzleSolved: object.puzzleSolved,
      lootState: object.lootState,
      gatherKind: object.gatherKind,
      remaining: object.remaining
    });
    group.add(instance);
    placed.push(object.key);
  }

  function dispose() {
    // Asset instances may share geometry/material with the loader's source scene.
    // Only fallback resources created by this layer are disposed here.
    for (const geometry of geometries.values()) geometry.dispose?.();
    for (const material of materials.values()) material.dispose?.();
    for (const resource of ownedResources) {
      resource.geometries.forEach(item => item.dispose?.());
      resource.materials.forEach(item => item.dispose?.());
    }
    group.clear();
  }

  return Object.freeze({
    group,
    placedKeys: Object.freeze(placed),
    skipped: Object.freeze(skipped),
    dispose
  });
}
