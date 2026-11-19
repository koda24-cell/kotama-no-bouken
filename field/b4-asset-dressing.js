/* B4 asset dressing: places the Claude B4 prop GLBs (docs/3d/B4_PROPS_DESIGN.md) along corridor walls.
 * Never writes gameplay state: props sit beside walls on walkable '.' tiles, away from objects/stairs,
 * and never block the corridor centre line used by the camera/FOEs.
 * Story gradient: near the entrance human traces dominate (mine gear); towards the boss / later floors
 * dragon traces take over (bones, scales, claw marks). One warning sign marks the border. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const BASE = './assets/models/floor4/props/';
// side: how far from tile centre towards the wall (m). human: 0 = dragon trace, 1 = human trace.
export const B4_PROP_REGISTRY = {
  b4p_brazier_cage: { human: 1, weight: 1.0, side: 1.25, scale: [0.95, 1.08], light: { y: 0.6, color: 0xff7a2e, intensity: 1.6, range: 4.5 } },
  // hung from a nail in the rock at head height
  b4p_mine_lantern: { human: 1, weight: 1.3, side: 1.82, y: 1.55, scale: [0.95, 1.05], light: { y: 0.2, color: 0xffb070, intensity: 0.9, range: 3.2 } },
};

// Approved GPT models reused as-is (docs/3d/B4_GPT_MODEL_INVENTORY.md).
export const B4_GPT_MODELS = {
  // V32's packed metal/roughness images are a magenta placeholder (G=0 -> mirror-like roughness 0 in three.js).
  // Ignore those maps and use the material factors with a matte floor instead (reported to GPT in the handoff).
  minecart_v32: { url: './assets/models/floor4/b4-minecart-v32.glb', length: 1.7, fixRoughness: 0.82 },
};

const cache = new Map();
const loader = new GLTFLoader();
// Load once; bake node transforms into geometry and merge per material so a 192-mesh model costs one draw per material.
function loadModel(key, url, opts = {}) {
  if (!cache.has(key)) cache.set(key, loader.loadAsync(url).then(gltf => {
    gltf.scene.updateMatrixWorld(true);
    const byMat = new Map();
    gltf.scene.traverse(o => {
      if (!o.isMesh || Array.isArray(o.material)) return;
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(geo);
    });
    const meshes = [];
    for (const [material, geos] of byMat) {
      if (opts.fixRoughness) {
        material.roughnessMap = null; material.metalnessMap = null;
        material.roughness = Math.max(material.roughness ?? 1, opts.fixRoughness);
        material.metalness = Math.min(material.metalness ?? 0, 0.55);
        material.needsUpdate = true;
      }
      if (material.emissiveMap) material.emissiveIntensity = Math.max(material.emissiveIntensity, 2.2);
      material.userData.b4PropCached = true;
      let merged = null;
      if (geos.length > 1) {
        const keys = g => Object.keys(g.attributes).sort().join(',') + '|' + !!g.index;
        const k0 = keys(geos[0]);
        if (geos.every(g => keys(g) === k0)) { try { merged = mergeGeometries(geos, false); } catch (e) { merged = null; } }
      }
      if (merged) { geos.forEach(g => g.dispose()); meshes.push({ geometry: merged, material, matrix: new THREE.Matrix4() }); }
      else for (const g of geos) meshes.push({ geometry: g, material, matrix: new THREE.Matrix4() });
    }
    const box = new THREE.Box3();
    for (const m of meshes) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); }
    return { meshes, box };
  }).catch(err => { console.warn('[b4-dressing] missing', key, err?.message); return null; }));
  return cache.get(key);
}
const loadProp = id => loadModel(id, `${BASE}${id}.glb`);

function instance(group, owned, asset, matrices, name) {
  for (const m of asset.meshes) {
    const inst = new THREE.InstancedMesh(m.geometry, m.material, matrices.length);
    inst.name = name;
    matrices.forEach((M, i) => inst.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(M, m.matrix)));
    inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere();
    group.add(inst); owned.push(inst);
  }
}

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export async function addB4AssetDressing({ root, map, ch, wallCell, hash, CELL, lights, gLights, reserved = new Set(), mines = [], isStale = () => false, maxProps = 22 }) {
  const ids = Object.keys(B4_PROP_REGISTRY);
  const group = new THREE.Group(); group.name = 'b4:asset-dressing'; group.userData.b4Cached = true;
  const owned = [];
  const info = { placed: 0, byId: {}, missing: [], list: [] };

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
      const y0 = (R.y || 0) * (0.95 + 0.1 * hash(c.tx, c.ty, 816));
      tmp.position.set(x, y0, z); tmp.rotation.set(0, yaw, 0); tmp.scale.setScalar(s); tmp.updateMatrix();
      if (R.light && lights.length < 30) {
        const L = { world: new THREE.Vector3(x, y0 + R.light.y * s, z), color: R.light.color, intensity: R.light.intensity, range: R.light.range, off: false };
        lights.push(L); gLights.push(L);
      }
      return tmp.matrix.clone();
    });
    instance(group, owned, asset, mats, `b4:prop:${id}`);
    info.byId[id] = list.length; info.placed += list.length;
    for (const c of list) info.list.push({ id, tx: c.tx, ty: c.ty, dx: c.dx, dz: c.dz, t: +c.t.toFixed(2) });
  }
  // ---- mine recesses: the user-approved GPT minecart V32 replaces the procedural cart ----
  if (mines.length) {
    const cart = await loadModel('minecart_v32', B4_GPT_MODELS.minecart_v32.url, B4_GPT_MODELS.minecart_v32);
    if (isStale()) return { group, dispose() { owned.forEach(i => i.dispose()); }, info: () => info };
    if (cart) {
      const size = cart.box.getSize(new THREE.Vector3()), centre = cart.box.getCenter(new THREE.Vector3());
      const s = B4_GPT_MODELS.minecart_v32.length / Math.max(size.x, size.z);
      const alongX = size.x >= size.z;
      const mats = mines.map(site => {
        const yaw = Math.atan2(-site.dx, -site.dz);
        const slot = new THREE.Matrix4().compose(
          new THREE.Vector3((site.tx + site.dx / 2) * CELL, 0, (site.ty + site.dz / 2) * CELL),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1));
        // inside the recess (local -Z is into the wall), cart parallel to the wall, slightly skewed
        const local = new THREE.Matrix4().compose(
          new THREE.Vector3(0, 0.03, -1.7),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (alongX ? 0 : Math.PI / 2) + (hash(site.tx, site.ty, 820) - 0.5) * 0.5, 0)),
          new THREE.Vector3(s, s, s));
        const recentre = new THREE.Matrix4().makeTranslation(-centre.x, -cart.box.min.y, -centre.z);
        return slot.multiply(local).multiply(recentre);
      });
      instance(group, owned, cart, mats, 'b4:gpt-minecart-v32');
      // broken timber set against the back of each recess (mine team #3)
      const timber = await loadProp('b4p_timber_set_broken');
      if (timber && !isStale()) {
        const tm = mines.map(site => new THREE.Matrix4().compose(
          new THREE.Vector3((site.tx + site.dx / 2) * CELL, 0, (site.ty + site.dz / 2) * CELL),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(-site.dx, -site.dz), 0)), new THREE.Vector3(1, 1, 1))
          .multiply(new THREE.Matrix4().compose(new THREE.Vector3((hash(site.tx, site.ty, 821) - 0.5) * 0.4, 0, -3.2),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (hash(site.tx, site.ty, 822) - 0.5) * 0.25, 0)), new THREE.Vector3(1.2, 1.2, 1.2))));
        instance(group, owned, timber, tm, 'b4:prop:b4p_timber_set_broken');
        info.byId.b4p_timber_set_broken = tm.length;
      }
      const proc = root.getObjectByName('b4:abandoned-mine');
      if (proc) proc.visible = false;                         // procedural stand-in no longer needed
      info.mineCarts = mats.length;
    } else info.missing.push('minecart_v32');
  }
  root.add(group);
  return {
    group,
    dispose() { owned.forEach(i => i.dispose()); group.removeFromParent(); },   // cached geometry/material stay for reuse
    info: () => info,
  };
}
