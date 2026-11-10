/* Visual-only B5 integration. The boss marker selects the cathedral floor;
 * all other B5 floors remain war ruins. Never writes map or field state. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createB5WarProp } from './assets/b5-war-props.js';
import { createB5ThroneProp } from './assets/b5-throne-props.js';
import { createAbyssBackdrop } from './assets/b5-abyss-backdrop.js';
import { createAbyssRuinSilhouettes } from './assets/b5-abyss-ruin-silhouettes.js';

export function isB5Hall(a, ch) {
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (ch(x, y) === 'B') return true;
  return false;
}

export function createB5Dressing({ root, a, ch, wallCell, hash, CELL, hall }) {
  const assets = [], merged = [], placements = [];
  const dressing = new THREE.Group(); dressing.name = hall ? 'b5:cathedral' : 'b5:war-ruins'; root.add(dressing);
  const keyLight = new THREE.DirectionalLight(hall ? 0xffd7ab : 0xaabaff, 2.4);
  keyLight.position.set(a.w * CELL / 2 - 12, 30, a.h * CELL / 2 + 15);
  keyLight.target.position.set(a.w * CELL / 2, 0, a.h * CELL / 2);
  const fill = new THREE.HemisphereLight(hall ? 0xd6c6bb : 0xacb9dc, 0x333344, 1.4);
  dressing.add(keyLight, keyLight.target, fill);
  // The libraries reuse materials but contain hundreds of separate meshes.
  // Bake static transforms and merge by material *within each prop* so spatial
  // culling still works and no new PointLights enter the existing light pool.
  function prop(kind, x, z, width, depth, bottom = 0, yaw = 0) {
    const asset = hall ? createB5ThroneProp(THREE, kind, { seed: 505, detail: 'low' })
      : createB5WarProp(THREE, kind, { seed: Math.round(hash(x, z, 505) * 1e6) });
    assets.push(asset);
    const group = asset.group; dressing.add(group); merged.push(...compactB5Static(group));
    group.rotation.y = yaw;
    const box = new THREE.Box3().setFromObject(group), size = box.getSize(new THREE.Vector3());
    const scale = Math.min(width / size.x, depth / size.z);
    const height = hall ? (kind === 'ruinedPillar' ? 11 : kind === 'hangingBanner' ? 9 : 8.5)
      : width < 4 ? (kind === 'swordField' ? 2.6 : kind === 'brokenWarMachine' ? 2.1 : 1.8) : 0;
    const vertical = height ? height / size.y : scale;
    group.scale.set(scale, vertical, scale);
    const center = box.getCenter(new THREE.Vector3());
    group.position.set(x - center.x * scale, bottom - box.min.y * vertical, z - center.z * scale);
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group);
    placements.push({ kind, x, z, bottom, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() } });
  }
  // Only solid, unoccupied wall cells: the complete bounding box stays inside
  // the cell. Exclude nearby interaction markers, including wall-mounted ones.
  const spots = [];
  for (let y = 1; y < a.h - 1; y++) for (let x = 1; x < a.w - 1; x++) {
    if (ch(x, y) !== '#' || a.objects.some(o => Math.abs(o.tx - x) <= 1 && Math.abs(o.ty - y) <= 1)) continue;
    if (![[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => !wallCell(x + dx, y + dy))) continue;
    spots.push({ x, y, rank: hash(x, y, 511) });
  }
  spots.sort((a, b) => a.rank - b.rank);
  const selected = [];
  for (const s of spots) {
    if (selected.some(p => Math.hypot(p.x - s.x, p.y - s.y) < (hall ? 4 : 3))) continue;
    selected.push(s);
    if (selected.length >= (hall ? 6 : 12)) break;
  }
  selected.forEach((s, i) => prop(hall ? (i % 2 ? 'hangingBanner' : 'ruinedPillar')
    : ['swordField', 'brokenWarMachine', 'brokenBridge'][i % 3], s.x * CELL, s.y * CELL, 3.25, 3.25,
    hall && i % 2 ? 3.8 : 0, hall ? 0 : hash(s.x, s.y, 512) * Math.PI));
  if (hall) {
    // Two chandeliers over the longitudinal approach; nothing below eye level.
    for (const y of [4, a.h - 4]) prop('grandChandelier', 13 * CELL, y * CELL, 6, 6, 5.2);
  } else {
    // Monumental wreckage sits wholly outside the map, with smaller debris
    // at its edges inside wall cells. No navigation surface is implied.
    prop('brokenBridge', -12, (a.h - 5) * CELL, 22, 9, -5, 0.3);
    prop('brokenWarMachine', (a.w + 2) * CELL, 6 * CELL, 18, 10, -2, -0.4);
    const backdrop = createAbyssBackdrop(THREE, dressing, { starCount: 220, rockCount: 10 });
    const ruins = createAbyssRuinSilhouettes(THREE, dressing, { clusters: 6 });
    assets.push(backdrop, ruins);
    // Anchor the remote ring to the map, not the origin or the moving camera.
    for (const item of [backdrop, ruins]) {
      item.group.position.set((a.w - 1) * CELL / 2, 0, (a.h - 1) * CELL / 2);
      item.group.scale.setScalar(1.7);
    }
  }
  let disposed = false;
  return {
    info: () => ({ hall, placements, mergedDraws: merged.length }),
    dispose() {
      if (disposed) return; disposed = true;
      assets.forEach(a => a.dispose()); merged.forEach(g => g.dispose()); dressing.removeFromParent();
    }
  };
}

export function compactB5Static(group) {
  const merged = [];
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert(), byMaterial = new Map(), old = [];
  group.traverse(m => {
    if (!m.isMesh || Array.isArray(m.material)) return;
    const geo = m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, m.matrixWorld));
    // Indexed and non-indexed primitives must share the same layout.
    const flat = geo.index ? geo.toNonIndexed() : geo;
    if (flat !== geo) geo.dispose();
    flat.deleteAttribute('uv'); flat.deleteAttribute('normal'); flat.computeVertexNormals();
    if (!byMaterial.has(m.material)) byMaterial.set(m.material, []);
    byMaterial.get(m.material).push(flat); old.push(m);
  });
  for (const [material, parts] of byMaterial) {
    const geo = mergeGeometries(parts); parts.forEach(p => p.dispose());
    if (!geo) throw new Error('B5 static geometry merge failed');
    merged.push(geo); group.add(new THREE.Mesh(geo, material));
  }
  old.forEach(m => m.removeFromParent());
  return merged;
}
