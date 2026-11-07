/**
 * field-3d-asset-qa.js
 * Read-only validation for a 3D asset manifest and its load result.
 * Does not fetch files, mutate gameplay state, or modify loaded assets.
 */

const VALID_CATEGORIES = new Set(["environment", "nature", "ruins", "props", "character", "foe", "ui"]);
const VALID_LOD = new Set(["lod0", "lod1", "lod2"]);

export function inspectField3DManifest(manifest, { requireGlbExtension = true } = {}) {
  const issues = [];
  const assets = manifest?.assets && typeof manifest.assets === "object" ? manifest.assets : null;
  if (!manifest || typeof manifest !== "object") {
    return Object.freeze({ ok: false, total: 0, required: 0, issues: Object.freeze([{ code: "manifest.invalid", message: "Manifest must be an object." }]) });
  }
  if (!assets) issues.push({ code: "assets.missing", message: "Manifest.assets must be an object." });

  const entries = Object.entries(assets || {});
  for (const [key, descriptor] of entries) {
    const path = descriptor?.url;
    if (!key.trim()) issues.push({ code: "key.empty", key, message: "Asset key is empty." });
    if (typeof path !== "string" || !path.trim()) {
      issues.push({ code: "url.missing", key, message: "Asset URL is missing." });
    } else {
      if (/^(?:https?:|data:|blob:)/i.test(path)) {
        issues.push({ code: "url.absolute", key, message: "Use repository-relative asset paths in the manifest." });
      }
      if (requireGlbExtension && !/\.glb(?:[?#].*)?$/i.test(path)) {
        issues.push({ code: "url.extension", key, message: "Asset URL must point to a .glb file." });
      }
      if (path.split("/").includes("..")) {
        issues.push({ code: "url.traversal", key, message: "Asset URL must not traverse outside its asset directory." });
      }
    }
    if (!VALID_CATEGORIES.has(descriptor?.category)) {
      issues.push({ code: "category.invalid", key, message: "Asset category is missing or unsupported." });
    }
    if (typeof descriptor?.required !== "boolean") {
      issues.push({ code: "required.invalid", key, message: "required must be explicitly true or false." });
    }
    if (descriptor?.scale != null) {
      const scale = descriptor.scale;
      const valid = typeof scale === "number"
        ? Number.isFinite(scale) && scale > 0
        : scale && ["x", "y", "z"].every(axis => Number.isFinite(scale[axis] ?? 1) && (scale[axis] ?? 1) > 0);
      if (!valid) issues.push({ code: "scale.invalid", key, message: "Scale must contain positive finite values." });
    }
    if (descriptor?.lod != null && (!Array.isArray(descriptor.lod) || descriptor.lod.some(level => !VALID_LOD.has(level)))) {
      issues.push({ code: "lod.invalid", key, message: "LOD must be an array containing lod0, lod1, or lod2." });
    }
  }

  const required = entries.filter(([, descriptor]) => descriptor?.required === true).length;
  return Object.freeze({
    ok: issues.length === 0,
    total: entries.length,
    required,
    optional: entries.length - required,
    issues: Object.freeze(issues.map(issue => Object.freeze(issue)))
  });
}

export function inspectField3DAssetLoad(manifestReport, loadResult) {
  const issues = [...(manifestReport?.issues || [])];
  const assets = loadResult?.assets || {};
  const errors = loadResult?.errors || [];
  for (const error of errors) {
    const descriptorRequired = false;
    issues.push({
      code: "asset.load-failed",
      key: error.key,
      required: descriptorRequired,
      message: error.error?.message || "Asset failed to load."
    });
  }
  const requiredMissing = (loadResult?.errors || []).filter(error => {
    return manifestReport?.requiredKeys?.includes?.(error.key);
  }).length;
  return Object.freeze({
    ok: issues.length === 0,
    loaded: Object.keys(assets).length,
    failed: errors.length,
    total: loadResult?.totalCount ?? Object.keys(assets).length + errors.length,
    requiredMissing,
    issues: Object.freeze(issues.map(issue => Object.freeze(issue)))
  });
}
