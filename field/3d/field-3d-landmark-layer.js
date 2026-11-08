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

function createFallback(THREE, kind, config) {
  const [w, h, d] = config.size;
  if (kind === "ancientArch") {
    const group = new THREE.Group();
    const post = new THREE.BoxGeometry(w * 0.16, h, d);
    const lintel = new THREE.BoxGeometry(w, h * 0.16, d);
    const material = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.94 });
    const left = new THREE.Mesh(post, material);
    const right = new THREE.Mesh(post, material);
    const top = new THREE.Mesh(lintel, material);
    left.position.x = -w * 0.42;
    right.position.x = w * 0.42;
    top.position.y = h * 0.42;
    group.add(left, right, top);
    group.userData.generatedResources = { geometries: [post, lintel], materials: [material] };
    return group;
  }
  const geometry = kind === "canopy"
    ? new THREE.IcosahedronGeometry(1, 1)
    : kind === "rootCurtain"
      ? new THREE.CylinderGeometry(0.06, 0.2, 1, 5, 1)
      : kind === "brokenColumn"
        ? new THREE.CylinderGeometry(0.32, 0.46, 1, 7, 1)
        : new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.94 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.generatedResources = { geometries: [geometry], materials: [material] };
  return mesh;
}

export function buildField3DLandmarkLayer(THREE, placements = [], {
  assets = {},
  definitions = {},
  maxCount = 80,
  floorY = 0,
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
      node = asset?.clone ? asset.clone() : createFallback(THREE, kind, config);
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
      if (node.userData.generatedResources) owned.push(node.userData.generatedResources);
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
