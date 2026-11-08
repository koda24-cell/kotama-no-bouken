/**
 * field-3d-atmosphere.js
 * Reusable B1F lighting/fog rig. Visual-only; no game-state dependencies.
 */

export function buildField3DAtmosphere(THREE, scene, {
  fogColor = 0x14251d,
  fogDensity = 0.045,
  ambientColor = 0xa9c6a5,
  ambientIntensity = 0.42,
  keyColor = 0xd6e8c3,
  keyIntensity = 1.25,
  fillColor = 0x477d78,
  fillIntensity = 0.48,
  keyPosition = [8, 12, 5],
  fillPosition = [-7, 5, -10],
  maxPixelRatio = 1.5
} = {}) {
  if (!THREE?.FogExp2 || !scene?.add) {
    throw new TypeError("buildField3DAtmosphere: Three.js and a scene are required.");
  }
  scene.fog = new THREE.FogExp2(fogColor, fogDensity);
  const ambient = new THREE.HemisphereLight(ambientColor, 0x182018, ambientIntensity);
  const key = new THREE.DirectionalLight(keyColor, keyIntensity);
  key.position.set(...keyPosition);
  key.castShadow = false;
  const fill = new THREE.DirectionalLight(fillColor, fillIntensity);
  fill.position.set(...fillPosition);
  fill.castShadow = false;
  scene.add(ambient, key, fill);

  const beams = new THREE.Group();
  beams.name = "b1f-atmospheric-light-shafts";
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0xb8d8b4,
    transparent: true,
    opacity: 0.055,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const beamGeometry = new THREE.ConeGeometry(1, 1, 12, 1, true);
  for (let i = 0; i < 3; i += 1) {
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set((i - 1) * 3.4, 2.5, -8 - i * 5);
    beam.rotation.z = Math.PI;
    beam.scale.set(1.4 + i * 0.35, 5.2 + i * 0.6, 1.4 + i * 0.35);
    beam.renderOrder = 2;
    beams.add(beam);
  }
  scene.add(beams);

  function applyRendererQuality(renderer, pixelRatio = maxPixelRatio) {
    if (!renderer?.setPixelRatio) return;
    const ratio = Math.min(Number(pixelRatio) || 1, maxPixelRatio);
    renderer.setPixelRatio(ratio);
  }

  function dispose() {
    scene.remove(ambient, key, fill, beams);
    beamGeometry.dispose();
    beamMaterial.dispose();
    if (scene.fog) scene.fog = null;
  }

  return Object.freeze({
    ambient,
    key,
    fill,
    beams,
    applyRendererQuality,
    setFogDensity(value) {
      scene.fog.density = Math.max(0, Math.min(0.15, Number(value) || 0));
    },
    dispose
  });
}
