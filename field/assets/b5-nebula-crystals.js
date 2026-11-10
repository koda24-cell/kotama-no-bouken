/* Optional B5 visual assets: distant star-cloud ribbons and crystal clusters.
 * Visual-only. No collision, FOE, events, save state or map edits.
 * createB5NebulaCrystals(THREE, scene).dispose() when leaving B5.
 */
export function createB5NebulaCrystals(THREE, scene, options = {}) {
  const root = new THREE.Group();
  root.name = 'b5:nebula-crystal-backdrop';
  root.userData.visualOnly = true;
  const geometries = [], materials = [];
  const geometry = g => (geometries.push(g), g);
  const material = m => (materials.push(m), m);
  let seed = (options.seed ?? 517) >>> 0;
  const random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
  const bandCount = Math.max(0, Math.min(4, options.bands ?? 3));
  const crystalClusters = Math.max(0, Math.min(18, options.clusters ?? 9));
  // Soft luminous ribbons: no lights or texture downloads, additive transparency.
  for (let b = 0; b < bandCount; b++) {
    const segments = 48, width = 1.5 + b * 0.8;
    const vertices = [], colors = [], indices = [];
    const tint = new THREE.Color([0x6551c9, 0x4385b2, 0x9b66c4][b % 3]);
    const phase = b * 2.1;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments, x = (t - 0.5) * 75;
      const z = -42 - b * 6 + Math.sin(t * Math.PI * 2 + phase) * 4;
      const y = -6 + b * 3 + Math.sin(t * Math.PI * 3 + phase) * 3;
      for (const edge of [-1, 1]) {
        vertices.push(x, y + edge * width, z);
        const intensity = Math.sin(t * Math.PI) * (edge < 0 ? 0.1 : 0.26);
        colors.push(tint.r * intensity, tint.g * intensity, tint.b * intensity);
      }
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = geometry(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mat = material(new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      depthWrite: false, fog: false
    }));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'b5:nebula-ribbon-' + b;
    root.add(mesh);
  }
  const crystalGeo = geometry(new THREE.OctahedronGeometry(1, 0));
  const crystalMat = material(new THREE.MeshStandardMaterial({
    color: 0x7569c8, emissive: 0x4235a4, emissiveIntensity: 0.65,
    roughness: 0.3, metalness: 0.1, flatShading: true
  }));
  const count = crystalClusters * 5;
  const crystals = new THREE.InstancedMesh(crystalGeo, crystalMat, count);
  crystals.name = 'b5:abyss-crystal-clusters';
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let c = 0; c < crystalClusters; c++) {
    const angle = c * Math.PI * 2 / Math.max(crystalClusters, 1) + random() * 0.3;
    const radius = 25 + random() * 18;
    const cx = Math.cos(angle) * radius, cz = Math.sin(angle) * radius;
    const cy = -12 - random() * 11;
    for (let j = 0; j < 5; j++) {
      dummy.position.set(cx + (random() - 0.5) * 3, cy + random() * 2, cz + (random() - 0.5) * 3);
      dummy.rotation.set(random() * 0.3, random() * 6.28, random() * 0.4);
      const s = 0.35 + random() * 1.1;
      dummy.scale.set(s * 0.6, s * (1.5 + random()), s * 0.6);
      dummy.updateMatrix();
      crystals.setMatrixAt(n++, dummy.matrix);
    }
  }
  crystals.instanceMatrix.needsUpdate = true;
  crystals.frustumCulled = false;
  root.add(crystals);
  scene.add(root);
  let disposed = false;
  return { group: root, dispose() {
    if (disposed) return;
    disposed = true;
    scene.remove(root);
    root.clear();
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
  }};
}
