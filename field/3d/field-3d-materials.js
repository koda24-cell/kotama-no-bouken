/**
 * field-3d-materials.js
 * Consistent PBR setup for imported B1F GLB scenes.
 * Does not create textures or alter gameplay state.
 */

const DEFAULT_PROFILE = Object.freeze({
  baseColorSpace: "srgb",
  maxAnisotropy: 8,
  roughnessScale: 1,
  metalnessScale: 1,
  emissiveScale: 1,
  enableShadows: true,
  castShadow: false,
  receiveShadow: true
});

const PROFILE_OVERRIDES = Object.freeze({
  stone: { roughnessScale: 1.08, metalnessScale: 0.35 },
  dirt: { roughnessScale: 1.12, metalnessScale: 0.2 },
  moss: { roughnessScale: 1.18, metalnessScale: 0.15 },
  foliage: { roughnessScale: 0.92, metalnessScale: 0.1 },
  glow: { roughnessScale: 0.58, metalnessScale: 0.12, emissiveScale: 1.35 },
  metal: { roughnessScale: 0.72, metalnessScale: 1.12 }
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function configureField3DMaterials(THREE, root, {
  profile = "stone",
  overrides = {},
  renderer = null,
  maxAnisotropy = null,
  onMaterial = null
} = {}) {
  if (!root?.traverse || !THREE?.SRGBColorSpace) {
    throw new TypeError("configureField3DMaterials: Three.js and a scene root are required.");
  }
  const settings = {
    ...DEFAULT_PROFILE,
    ...(PROFILE_OVERRIDES[profile] || {}),
    ...overrides
  };
  const rendererLimit = renderer?.capabilities?.getMaxAnisotropy?.() || 1;
  const anisotropy = clamp(
    Number(maxAnisotropy ?? settings.maxAnisotropy) || 1,
    1,
    Math.max(1, rendererLimit)
  );
  const materials = new Set();
  const textures = new Set();
  let meshCount = 0;

  root.traverse(node => {
    if (!node.isMesh) return;
    meshCount += 1;
    node.castShadow = !!settings.enableShadows && !!settings.castShadow;
    node.receiveShadow = !!settings.enableShadows && !!settings.receiveShadow;
    const list = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of list) {
      if (!material || materials.has(material)) continue;
      materials.add(material);
      if ("roughness" in material) {
        material.roughness = clamp((material.roughness ?? 1) * settings.roughnessScale, 0.04, 1);
      }
      if ("metalness" in material) {
        material.metalness = clamp((material.metalness ?? 0) * settings.metalnessScale, 0, 1);
      }
      if (material.emissiveIntensity != null) {
        material.emissiveIntensity *= settings.emissiveScale;
      }
      for (const key of ["map", "emissiveMap"]) {
        const texture = material[key];
        if (!texture) continue;
        if (key === "map") texture.colorSpace = THREE.SRGBColorSpace;
        textures.add(texture);
      }
      for (const key of ["normalMap", "roughnessMap", "metalnessMap", "aoMap", "bumpMap"]) {
        if (material[key]) textures.add(material[key]);
      }
      for (const texture of textures) {
        if ("anisotropy" in texture) texture.anisotropy = anisotropy;
      }
      material.needsUpdate = true;
      onMaterial?.(material, node);
    }
  });

  return Object.freeze({
    meshCount,
    materialCount: materials.size,
    textureCount: textures.size,
    anisotropy,
    profile,
    materials: Object.freeze([...materials]),
    textures: Object.freeze([...textures])
  });
}

export function getField3DMaterialProfile(profile = "stone") {
  return Object.freeze({
    ...DEFAULT_PROFILE,
    ...(PROFILE_OVERRIDES[profile] || {})
  });
}
