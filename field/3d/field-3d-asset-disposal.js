/**
 * field-3d-asset-disposal.js
 * Explicitly releases source GLTF resources owned by a loadField3DAssets result.
 *
 * Call only after every scene instance/clone made from the result has been
 * removed from every rendered scene. This function does not dispose clones
 * independently and must not be used for shared assets still in use.
 */
export function disposeField3DAssets(loadResult) {
  const assets = loadResult?.assets || {};
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  let meshCount = 0;

  for (const asset of Object.values(assets)) {
    asset?.scene?.traverse?.(node => {
      if (!node.isMesh) return;
      meshCount += 1;
      if (node.geometry) geometries.add(node.geometry);
      const list = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of list) {
        if (!material || materials.has(material)) continue;
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value?.isTexture) textures.add(value);
        }
        // Shader uniforms may also hold textures outside standard material slots.
        for (const uniform of Object.values(material.uniforms || {})) {
          const value = uniform?.value;
          if (value?.isTexture) textures.add(value);
          else if (Array.isArray(value)) value.filter(item => item?.isTexture).forEach(texture => textures.add(texture));
        }
      }
    });
  }

  textures.forEach(texture => texture.dispose?.());
  materials.forEach(material => material.dispose?.());
  geometries.forEach(geometry => geometry.dispose?.());

  return Object.freeze({
    meshCount,
    geometryCount: geometries.size,
    materialCount: materials.size,
    textureCount: textures.size
  });
}
