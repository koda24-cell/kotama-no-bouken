/**
 * field-3d-asset-loader.js
 * Optional GLB/glTF asset loader. The caller injects GLTFLoader so this module
 * does not impose a bundler, CDN URL, or Three.js version on the game.
 *
 * Manifest example:
 * {
 *   ancientColumn: { url: "./assets/field-3d/ruins/column.glb", scale: 1 },
 *   mossCluster: { url: "./assets/field-3d/nature/moss.glb", scale: 0.8 }
 * }
 */

export async function loadField3DAssets({
  GLTFLoader,
  manifest = {},
  baseUrl = null,
  onProgress = null,
  onAssetError = null
} = {}) {
  if (typeof GLTFLoader !== "function") {
    throw new TypeError("loadField3DAssets: inject a compatible GLTFLoader constructor.");
  }

  const loader = new GLTFLoader();
  const entries = Object.entries(manifest);
  const assets = Object.create(null);
  const errors = [];
  let completedCount = 0;

  await Promise.all(entries.map(async ([key, descriptor]) => {
    const rawUrl = typeof descriptor === "string" ? descriptor : descriptor?.url;
    const url = rawUrl && baseUrl ? new URL(rawUrl, baseUrl).href : rawUrl;
    if (!url) {
      const error = new TypeError(`Asset "${key}" has no URL.`);
      errors.push({ key, url: null, error });
      onAssetError?.({ key, url: null, error });
      return;
    }

    try {
      const gltf = await loader.loadAsync(url);
      const scene = gltf.scene;
      if (!scene) throw new Error("The glTF file does not contain a scene.");

      // Keep the source scene intact; each placement receives an independent clone.
      assets[key] = Object.freeze({
        key,
        url,
        scene,
        animations: Array.isArray(gltf.animations) ? gltf.animations : [],
        clone() {
          const instance = scene.clone(true);
          const settings = typeof descriptor === "object" ? descriptor : {};
          if (settings.scale != null) {
            if (typeof settings.scale === "number") instance.scale.setScalar(settings.scale);
            else instance.scale.set(settings.scale.x ?? 1, settings.scale.y ?? 1, settings.scale.z ?? 1);
          }
          if (settings.rotation) {
            instance.rotation.set(
              settings.rotation.x ?? 0,
              settings.rotation.y ?? 0,
              settings.rotation.z ?? 0
            );
          }
          if (settings.position) {
            instance.position.set(
              settings.position.x ?? 0,
              settings.position.y ?? 0,
              settings.position.z ?? 0
            );
          }
          return instance;
        }
      });
      completedCount += 1;
      onProgress?.({ key, url, status: "loaded", completed: completedCount, loaded: Object.keys(assets).length, total: entries.length });
    } catch (error) {
      errors.push({ key, url, error });
      onAssetError?.({ key, url, error });
      completedCount += 1;
      onProgress?.({ key, url, status: "error", completed: completedCount, loaded: Object.keys(assets).length, total: entries.length });
    }
  }));

  return Object.freeze({
    assets: Object.freeze(assets),
    errors: Object.freeze(errors),
    loadedCount: Object.keys(assets).length,
    completedCount,
    totalCount: entries.length
  });
}
