/**
 * field-3d-quality-presets.js
 * Conservative renderer presets for desktop and mobile browser testing.
 * These are starting points, not measured device guarantees.
 */

export const FIELD_3D_QUALITY_PRESETS = Object.freeze({
  high: Object.freeze({
    pixelRatioCap: 1.75,
    shadows: true,
    shadowMapSize: 1024,
    maxVisibleLandmarks: 24,
    maxDecorationPerKind: 420,
    fogDensity: 0.043,
    antialias: true
  }),
  balanced: Object.freeze({
    pixelRatioCap: 1.35,
    shadows: false,
    shadowMapSize: 512,
    maxVisibleLandmarks: 16,
    maxDecorationPerKind: 260,
    fogDensity: 0.048,
    antialias: true
  }),
  mobile: Object.freeze({
    pixelRatioCap: 1,
    shadows: false,
    shadowMapSize: 256,
    maxVisibleLandmarks: 10,
    maxDecorationPerKind: 140,
    fogDensity: 0.052,
    antialias: false
  })
});

export function resolveField3DQualityPreset({
  profile = "balanced",
  devicePixelRatio = 1,
  maxTextureSize = 4096,
  reducedMotion = false
} = {}) {
  const base = FIELD_3D_QUALITY_PRESETS[profile] || FIELD_3D_QUALITY_PRESETS.balanced;
  const textureLimit = Math.max(1, Number(maxTextureSize) || 4096);
  const textureScale = textureLimit < 2048 ? 0.72 : textureLimit < 4096 ? 0.88 : 1;
  const pixelRatio = Math.min(
    Math.max(1, Number(devicePixelRatio) || 1),
    base.pixelRatioCap
  );
  return Object.freeze({
    ...base,
    pixelRatio,
    shadowMapSize: Math.min(base.shadowMapSize, textureLimit),
    maxVisibleLandmarks: Math.max(4, Math.floor(base.maxVisibleLandmarks * textureScale)),
    maxDecorationPerKind: Math.max(40, Math.floor(base.maxDecorationPerKind * textureScale)),
    fogDensity: base.fogDensity,
    reducedMotion: !!reducedMotion
  });
}

export function applyField3DQualityPreset(renderer, preset) {
  if (!renderer || !preset) throw new TypeError("renderer and preset are required.");
  renderer.setPixelRatio?.(preset.pixelRatio);
  if (renderer.shadowMap) renderer.shadowMap.enabled = !!preset.shadows;
  return renderer;
}
