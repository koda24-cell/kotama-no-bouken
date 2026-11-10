/* B5 optional, visual-only distant ruin silhouettes.
 * No gameplay collision, navigation, FOE, events or save data.
 * Caller: const asset = createAbyssRuinSilhouettes(THREE, scene);
 * Dispose when leaving B5. Do not attach to walkable map cells.
 */
export function createAbyssRuinSilhouettes(THREE, scene, options = {}) {
  const group = new THREE.Group();
  group.name = 'b5:abyss-distant-ruins';
  group.userData.visualOnly = true;
  const geometries = [];
  const materials = [];
  const makeGeo = geo => (geometries.push(geo), geo);
  const makeMat = mat => (materials.push(mat), mat);
  const stone = makeMat(new THREE.MeshStandardMaterial({
    color: 0x302e49, roughness: 0.94, metalness: 0.05, flatShading: true
  }));
  const rim = makeMat(new THREE.MeshStandardMaterial({
    color: 0x69628d, emissive: 0x3b2679, emissiveIntensity: 0.32, roughness: 0.72
  }));
  const columnGeo = makeGeo(new THREE.CylinderGeometry(0.5, 0.8, 6, 7));
  const capGeo = makeGeo(new THREE.BoxGeometry(2.0, 0.35, 1.8));
  const blockGeo = makeGeo(new THREE.BoxGeometry(2.7, 1.2, 1.4));
  const ringGeo = makeGeo(new THREE.TorusGeometry(2.4, 0.16, 5, 18, Math.PI * 1.25));
  const crystalGeo = makeGeo(new THREE.OctahedronGeometry(0.4, 0));
  let state = (options.seed ?? 591) >>> 0;
  const rnd = () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296);
  const clusters = Math.max(0, Math.min(12, options.clusters ?? 6));
  const make = (geo, mat, parent, x, y, z, sx=1, sy=1, sz=1) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz);
    parent.add(mesh);
    return mesh;
  };
  for (let i = 0; i < clusters; i++) {
    const angle = (i + 0.35 * rnd()) * Math.PI * 2 / Math.max(clusters, 1);
    const radius = 32 + rnd() * 17;
    const cluster = new THREE.Group();
    cluster.name = 'b5:ruin-cluster-' + i;
    cluster.position.set(Math.cos(angle) * radius, -12 - rnd() * 7, Math.sin(angle) * radius);
    cluster.rotation.y = rnd() * Math.PI * 2;
    group.add(cluster);
    const count = 2 + Math.floor(rnd() * 3);
    for (let c = 0; c < count; c++) {
      const x = (c - (count - 1) / 2) * 2.6;
      const height = 0.55 + rnd() * 0.65;
      const col = make(columnGeo, stone, cluster, x, 3 * height, rnd() * 1.4 - 0.7, 1, height, 1);
      col.rotation.z = (rnd() - 0.5) * 0.2;
      make(capGeo, stone, cluster, x, 6 * height + 0.2, col.position.z, 1, 1, 1);
      if (rnd() > 0.5) make(crystalGeo, rim, cluster, x, 6 * height + 0.8, col.position.z);
    }
    const fallen = make(blockGeo, stone, cluster, -1.5 + rnd() * 3, 0.2, 2.1);
    fallen.rotation.z = 0.2 + rnd() * 0.4;
    if (i % 2 === 0) {
      const arc = make(ringGeo, rim, cluster, 0, 5.5, -1.3);
      arc.rotation.y = rnd() * 0.8;
    }
  }
  scene.add(group);
  let disposed = false;
  return {group, dispose() {
    if (disposed) return;
    disposed = true;
    scene.remove(group);
    group.clear();
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
  }};
}
