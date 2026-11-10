/* Optional visual-only assets for B5's abyss/star theme.
 * Does not modify map cells, collision, FOE, events, or saves.
 * Caller owns lifecycle: const backdrop = createAbyssBackdrop(THREE, scene);
 * On leaving B5: backdrop.dispose().
 */
export function createAbyssBackdrop(THREE, scene, options = {}) {
  const seed = options.seed ?? 507;
  const starCount = Math.max(0, Math.min(1200, options.starCount ?? 340));
  const rockCount = Math.max(0, Math.min(36, options.rockCount ?? 14));
  const group = new THREE.Group();
  group.name = 'b5:abyss-distant-backdrop';
  group.userData.visualOnly = true;
  scene.add(group);
  const geometries = [];
  const materials = [];
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const palette = [new THREE.Color(0x8d99ff), new THREE.Color(0xd3c5ff), new THREE.Color(0x8dd9ec)];
  for (let i = 0; i < starCount; i++) {
    const a = random() * Math.PI * 2;
    const h = (random() - 0.5) * 28;
    const radius = 38 + random() * 38;
    starPositions[i * 3] = Math.cos(a) * radius;
    starPositions[i * 3 + 1] = h;
    starPositions[i * 3 + 2] = Math.sin(a) * radius;
    const color = palette[Math.floor(random() * palette.length)];
    starColors[i * 3] = color.r;
    starColors[i * 3 + 1] = color.g;
    starColors[i * 3 + 2] = color.b;
  }
  const starsGeo = new THREE.BufferGeometry();
  starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starsGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  geometries.push(starsGeo);
  const starsMat = new THREE.PointsMaterial({
    size: 0.15, sizeAttenuation: true, vertexColors: true,
    transparent: true, opacity: 0.84, depthWrite: false,
    fog: false
  });
  materials.push(starsMat);
  const stars = new THREE.Points(starsGeo, starsMat);
  stars.frustumCulled = false;
  group.add(stars);

  // Distant silhouettes only: all fragments are far outside the 4-unit walkable cells.
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x25243b, roughness: 0.96, flatShading: true,
    metalness: 0.08
  });
  geometries.push(rockGeo);
  materials.push(rockMat);
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rocks.name = 'b5:abyss-floating-rock-silhouettes';
  const dummy = new THREE.Object3D();
  for (let i = 0; i < rockCount; i++) {
    const a = random() * Math.PI * 2;
    const radius = 27 + random() * 23;
    const size = 1.1 + random() * 3.5;
    dummy.position.set(Math.cos(a) * radius, -9 - random() * 15, Math.sin(a) * radius);
    dummy.rotation.set(random() * 3, random() * 6, random() * 3);
    dummy.scale.set(size, size * (0.35 + random() * 0.65), size * (0.7 + random() * 0.8));
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  rocks.instanceMatrix.needsUpdate = true;
  rocks.frustumCulled = false;
  group.add(rocks);
  let disposed = false;
  return {
    group,
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(group);
      group.clear();
      geometries.forEach(geo => geo.dispose());
      materials.forEach(mat => mat.dispose());
    }
  };
}
