/* B5-only optional depth cues: distant, broken luminous rings.
 * No collision geometry or gameplay state. Attach only in the B5 renderer.
 */
export function createB5AbyssDepthRings(THREE, scene, options = {}) {
  const root = new THREE.Group();
  root.name = 'b5:abyss-depth-rings';
  root.userData.visualOnly = true;
  const count = Math.max(0, Math.min(8, options.count ?? 4));
  const geometry = new THREE.TorusGeometry(1, 0.025, 4, 48, Math.PI * 1.55);
  const material = new THREE.MeshBasicMaterial({
    color: 0x615aa8, transparent: true, opacity: 0.38,
    depthWrite: false, fog: false, side: THREE.DoubleSide
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'b5:depth-ring-instances';
  mesh.frustumCulled = false;
  const object = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const depth = 18 + i * 7;
    object.position.set(0, -depth, 0);
    object.rotation.set(Math.PI / 2 + i * 0.09, i * 0.37, 0);
    const radius = 8 + i * 4;
    object.scale.set(radius, radius * 0.8, 1);
    object.updateMatrix();
    mesh.setMatrixAt(i, object.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  root.add(mesh);
  scene.add(root);
  let disposed = false;
  return { group: root, dispose() {
    if (disposed) return;
    disposed = true;
    scene.remove(root);
    root.clear();
    geometry.dispose();
    material.dispose();
  }};
}
