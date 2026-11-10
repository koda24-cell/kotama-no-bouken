/* B4 scenery occupies solid cells only. This module never writes gameplay state. */
import * as THREE from 'three';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const faceKey = (tx, ty, dx, dz) => `${tx},${ty}:${dx},${dz}`;

export function planB4Scenery(map, ch, wallCell, hash) {
  // Reserve wall controls, hidden passages, events, stairs and their approaches.
  const reserved = (map.objects || []).map(o => [o.tx, o.ty]);
  const safe = (x, y) => reserved.every(([tx, ty]) => Math.abs(tx - x) + Math.abs(ty - y) > 1);
  const candidates = [];
  for (let ty = 1; ty < map.h - 1; ty++) for (let tx = 1; tx < map.w - 1; tx++) {
    if (ch(tx, ty) !== '.' || !safe(tx, ty)) continue;
    for (const [dx, dz] of DIRS) {
      const wx = tx + dx, wy = ty + dz;
      // A plain rock cell, not an interactive/hidden wall, and never the outer edge.
      if (wx < 1 || wy < 1 || wx >= map.w - 1 || wy >= map.h - 1 || ch(wx, wy) !== '#' || !wallCell(wx, wy) || !safe(wx, wy)) continue;
      candidates.push({ tx, ty, dx, dz, wx, wy, key: faceKey(tx, ty, dx, dz) });
    }
  }
  // Stable ordering plus spatial separation avoids rows of identical props and shared cells.
  candidates.sort((a, b) => hash(a.tx, a.ty, 609) - hash(b.tx, b.ty, 609));
  const mines = [];
  for (const c of candidates) {
    if (mines.every(s => Math.hypot(s.wx - c.wx, s.wy - c.wy) >= 5)) mines.push(c);
    if (mines.length === 4) break;
  }
  // One north-facing, physically blocked overlook; the parapet communicates no passage.
  let vista = null;
  for (let ty = 1; ty < map.h - 1 && !vista; ty++) {
    const row = [];
    for (let tx = 2; tx < map.w - 2; tx++) {
      if (![-1,0,1].every(offset => ch(tx+offset,ty)==='.' && safe(tx+offset,ty) && safe(tx+offset,ty-1) && Array.from({length:ty},(_,y)=>ch(tx+offset,y)==='#').every(Boolean))) continue;
      if (mines.some(s => Math.hypot(s.wx - tx, s.wy - (ty - 1)) < 5)) continue;
      row.push({tx, ty, dx: 0, dz: -1, wx: tx, wy: ty - 1, key: faceKey(tx, ty, 0, -1)});
    }
    row.sort((a, b) => Math.abs(a.tx - map.w / 2) - Math.abs(b.tx - map.w / 2));
    vista = row[0] || null;
  }
  return { mines, vista };
}

// Keep +Z facing the corridor. Fit uniformly before rotating, then anchor the front
// behind the wall plane; even the largest wreckage cannot reach the camera/FOE lane.
export function fitB4Recess(model, site, cellSize, limits = [3.35, 3.65, 3.25]) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
  const scale = Math.min(...limits.map((n, i) => n / size.getComponent(i)));
  const center = bounds.getCenter(new THREE.Vector3());
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, .03 - bounds.min.y * scale, -.15 - bounds.max.z * scale);
  const slot = new THREE.Group(); slot.name = 'b4:recess'; slot.userData.site = site;
  slot.position.set((site.tx + site.dx / 2) * cellSize, 0, (site.ty + site.dz / 2) * cellSize);
  slot.rotation.y = Math.atan2(-site.dx, -site.dz);
  slot.add(model);
  return slot;
}

// Flatten only owned, static scenery. World transforms include nested carts and rigs.
export function batchB4Scenery(group) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert(), buckets = new Map(), meshes = [];
  group.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.visible && !Array.isArray(o.material)) meshes.push(o); });
  for (const mesh of meshes) {
    const key = mesh.geometry.uuid + ':' + mesh.material.uuid;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(mesh);
  }
  for (const items of buckets.values()) {
    if (items.length < 2) continue;
    const batch = new THREE.InstancedMesh(items[0].geometry, items[0].material, items.length);
    batch.name = 'b4:scenery-batch';
    items.forEach((o, i) => { batch.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(inverse, o.matrixWorld)); o.removeFromParent(); });
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingBox(); batch.computeBoundingSphere(); group.add(batch);
  }
}

// Only call on an exclusively owned subtree; cached B1/gameplay assets are excluded.
export function disposeB4Owned(group) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  group.traverse(o => {
    if (o.isInstancedMesh) o.dispose();
    if (o.geometry) geometries.add(o.geometry);
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m) materials.add(m);
  });
  for (const m of materials) {
    for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
    m.dispose();
  }
  geometries.forEach(g => g.dispose());
  const bitmaps = new Set();
  textures.forEach(t => { t.dispose(); if (typeof ImageBitmap !== 'undefined' && t.source?.data instanceof ImageBitmap) bitmaps.add(t.source.data); });
  bitmaps.forEach(b => b.close());
}
