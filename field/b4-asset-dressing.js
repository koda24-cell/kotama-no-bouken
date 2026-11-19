/* B4 asset dressing: places the Claude B4 prop GLBs (docs/3d/B4_PROPS_DESIGN.md) along corridor walls.
 * Never writes gameplay state: props sit beside walls on walkable '.' tiles, away from objects/stairs,
 * and never block the corridor centre line used by the camera/FOEs.
 * Story gradient: near the entrance human traces dominate (mine gear); towards the boss / later floors
 * dragon traces take over (bones, scales, claw marks). One warning sign marks the border. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE = './assets/models/floor4/props/';
// side: how far from tile centre towards the wall (m). human: 0 = dragon trace, 1 = human trace.
export const B4_PROP_REGISTRY = {
  b4p_brazier_cage: { human: 1, weight: 1.0, side: 1.25, scale: [0.95, 1.08], light: { y: 0.6, color: 0xff7a2e, intensity: 1.6, range: 4.5 } },
};

const cache = new Map();
const loader = new GLTFLoader();
function loadProp(id) {
  if (!cache.has(id)) cache.set(id, loader.loadAsync(`${BASE}${id}.glb`).then(gltf => {
    const meshes = [];
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(o => { if (o.isMesh) meshes.push({ geometry: o.geometry, material: o.material, matrix: o.matrixWorld.clone() }); });
    for (const m of meshes) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        if (mat.emissiveMap) mat.emissiveIntensity = Math.max(mat.emissiveIntensity, 2.2);
        mat.userData.b4PropCached = true;
      }
    }
    return { meshes };
  }).catch(err => { console.warn('[b4-dressing] missing', id, err?.message); return null; }));
  return cache.get(id);
}

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export async function addB4AssetDressing({ root, map, ch, wallCell, hash, CELL, lights, gLights, reserved = new Set(), isStale = () => false, maxProps = 22 }) {
  const ids = Object.keys(B4_PROP_REGISTRY);
  const group = new THREE.Group(); group.name = 'b4:asset-dressing'; group.userData.b4Cached = true;
  const owned = [];
  const info = { placed: 0, byId: {}, missing: [], list: [] };
  if (!ids.length) return { group, dispose() {}, info: () => info };

  // ---- progress along the floor (BFS from the entrance) ----
  const W = map.w, H = map.h, idx = (x, y) => y * W + x;
  const walk = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !wallCell(x, y);
  let start = null, boss = null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = ch(x, y);
    if (!start && (c === 'E' || c === '<' || c === 'S')) start = [x, y];
    if (c === 'B') boss = [x, y];
  }
  const dist = new Int32Array(W * H).fill(-1);
  if (start) {
    const q = [start]; dist[idx(...start)] = 0;
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of DIRS) if (walk(x + dx, y + dy) && dist[idx(x + dx, y + dy)] < 0) { dist[idx(x + dx, y + dy)] = dist[idx(x, y)] + 1; q.push([x + dx, y + dy]); }
    }
  }
  let maxD = 1; for (const d of dist) maxD = Math.max(maxD, d);
  const floorBias = Math.min(1, (map.f || 0) / 2);           // later floors lean towards dragon traces

  // ---- candidate wall faces ----
  const blocked = (x, y) => {
    const c = ch(x, y);
    return c !== '.' || reserved.has(x + ',' + y) || (map.objects || []).some(o => Math.abs(o.tx - x) + Math.abs(o.ty - y) <= 1);
  };
  const cands = [];
  for (let ty = 1; ty < H - 1; ty++) for (let tx = 1; tx < W - 1; tx++) {
    if (!walk(tx, ty) || blocked(tx, ty)) continue;
    const walls = DIRS.filter(([dx, dz]) => ch(tx + dx, ty + dz) === '#');
    if (!walls.length || walls.length === 4) continue;
    const [dx, dz] = walls[Math.floor(hash(tx, ty, 811) * walls.length)];
    const t = dist[idx(tx, ty)] >= 0 ? dist[idx(tx, ty)] / maxD : 0.5;
    cands.push({ tx, ty, dx, dz, t: Math.min(1, t * 0.7 + floorBias * 0.5), r: hash(tx, ty, 812) });
  }
  cands.sort((a, b) => a.r - b.r);
  const chosen = [];
  for (const c of cands) {
    if (chosen.length >= maxProps) break;
    if (chosen.some(o => Math.abs(o.tx - c.tx) + Math.abs(o.ty - c.ty) < 3)) continue;
    // human weight fades with progress; dragon weight grows
    let total = 0; const pool = ids.map(id => { const R = B4_PROP_REGISTRY[id]; const w = R.weight * (R.human ? 1 - c.t * 0.85 : 0.15 + c.t); total += w; return [id, w]; });
    let pick = hash(c.tx, c.ty, 813) * total, id = pool[0][0];
    for (const [pid, w] of pool) { if ((pick -= w) <= 0) { id = pid; break; } }
    chosen.push({ ...c, id });
  }

  // ---- load and instance ----
  const byId = new Map();
  for (const c of chosen) { if (!byId.has(c.id)) byId.set(c.id, []); byId.get(c.id).push(c); }
  const tmp = new THREE.Object3D();
  for (const [id, list] of byId) {
    const asset = await loadProp(id);
    if (isStale()) return { group, dispose() {}, info: () => info };
    if (!asset) { info.missing.push(id); continue; }
    const R = B4_PROP_REGISTRY[id];
    const mats = list.map(c => {
      const x = c.tx * CELL + c.dx * R.side, z = c.ty * CELL + c.dz * R.side;
      const yaw = Math.atan2(-c.dx, -c.dz) + (hash(c.tx, c.ty, 814) - 0.5) * 0.9;
      const s = R.scale[0] + (R.scale[1] - R.scale[0]) * hash(c.tx, c.ty, 815);
      tmp.position.set(x, 0, z); tmp.rotation.set(0, yaw, 0); tmp.scale.setScalar(s); tmp.updateMatrix();
      if (R.light && lights.length < 30) {
        const L = { world: new THREE.Vector3(x, R.light.y * s, z), color: R.light.color, intensity: R.light.intensity, range: R.light.range, off: false };
        lights.push(L); gLights.push(L);
      }
      return tmp.matrix.clone();
    });
    for (const m of asset.meshes) {
      const inst = new THREE.InstancedMesh(m.geometry, m.material, mats.length);
      inst.name = `b4:prop:${id}`;
      mats.forEach((M, i) => inst.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(M, m.matrix)));
      inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere();
      group.add(inst); owned.push(inst);
    }
    info.byId[id] = list.length; info.placed += list.length;
    for (const c of list) info.list.push({ id, tx: c.tx, ty: c.ty, dx: c.dx, dz: c.dz, t: +c.t.toFixed(2) });
  }
  root.add(group);
  return {
    group,
    dispose() { owned.forEach(i => i.dispose()); group.removeFromParent(); },   // cached geometry/material stay for reuse
    info: () => info,
  };
}
