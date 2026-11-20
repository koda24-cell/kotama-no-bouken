/* B4 asset dressing: places the Claude B4 prop GLBs (docs/3d/B4_PROPS_DESIGN.md) along corridor walls.
 * Never writes gameplay state: props sit beside walls on walkable '.' tiles, away from objects/stairs,
 * and never block the corridor centre line used by the camera/FOEs.
 * Story gradient: near the entrance human traces dominate (mine gear); towards the boss / later floors
 * dragon traces take over (bones, scales, claw marks). One warning sign marks the border. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const BASE = './assets/models/floor4/props/';
// Zone themes (user 2026-11-20: cluster things that naturally gather — ore deposits, old mine workings, pickaxes):
//   deposit = 鉱床（炎竜鉱・鉱脈・崩れ岩・柱状節理・つるはし）  mine = 炭鉱跡地（支保工・木箱・樽・ランタン・火鉢・工具）
//   dragon  = 竜の痕跡（爪痕・鱗・骨・卵殻・焼け木・鎖）      plain = 余白（何も置かない区間も必要）
// themes: weight per zone theme. radius/height: footprint for wall clearance. y: mount height. ready: GLB promoted.
export const B4_PROP_REGISTRY = {
  b4p_brazier_cage: { ready: true, themes: { mine: 0.8, deposit: 0.25 }, radius: 0.34, height: 0.9, scale: [0.95, 1.08], tris: 9770, light: { y: 0.6, color: 0xff7a2e, intensity: 1.8, range: 5 } },
  b4p_mine_lantern: { ready: true, themes: { mine: 1.0, deposit: 0.5 }, radius: 0.1, height: 0.4, y: 1.55, scale: [0.95, 1.05], tris: 2480, light: { y: 0.2, color: 0xffb070, intensity: 2.2, range: 4.5 } },
  b4p_crate_set: { ready: false, themes: { mine: 1.2 }, radius: 0.75, height: 0.9, scale: [0.95, 1.05] },
  b4p_barrel_broken: { ready: false, themes: { mine: 0.9 }, radius: 0.45, height: 0.9, scale: [0.95, 1.05] },
  b4p_tools_scatter: { ready: false, themes: { mine: 1.0, deposit: 1.1 }, radius: 0.55, height: 0.3, scale: [0.95, 1.05] },
  b4p_dragon_ore_cluster: { ready: false, themes: { deposit: 2.2, dragon: 0.5 }, radius: 0.7, height: 1.6, scale: [0.8, 1.25] },
  b4p_ore_vein_wall: { ready: false, wall: true, themes: { deposit: 2.0 }, radius: 0.3, height: 2.2, scale: [0.9, 1.1] },
  b4p_rock_rubble: { ready: false, themes: { deposit: 1.4, dragon: 0.7, plain: 0.5 }, radius: 0.9, height: 0.8, scale: [0.8, 1.2] },
  b4p_basalt_columns: { ready: false, themes: { deposit: 1.0, plain: 0.6 }, radius: 0.7, height: 2.2, scale: [0.85, 1.15] },
  b4p_claw_rock: { ready: false, wall: true, themes: { dragon: 1.6 }, radius: 0.35, height: 1.4, scale: [0.9, 1.1] },
  b4p_dragon_scale: { ready: false, themes: { dragon: 1.2, deposit: 0.3 }, radius: 0.4, height: 0.15, scale: [0.9, 1.1] },
  b4p_charred_stump: { ready: false, themes: { dragon: 0.9 }, radius: 0.45, height: 1.2, scale: [0.9, 1.1] },
  b4p_egg_shells: { ready: false, themes: { dragon: 0.8 }, radius: 0.5, height: 0.5, scale: [0.9, 1.1] },
  b4p_chain_anchor: { ready: false, wall: true, y: 0.6, themes: { dragon: 0.6, mine: 0.3 }, radius: 0.2, height: 1.8, scale: [0.95, 1.05] },
};
const ZONE_FILL = { deposit: 0.62, mine: 0.55, dragon: 0.45, plain: 0.1 };
const ZONE_OVERLAY = { deposit: 0.55, dragon: 0.45, mine: 0.22, plain: 0.38 };   // V33 rock-face overlays per wall face

// Approved GPT models reused as-is (docs/3d/B4_GPT_MODEL_INVENTORY.md).
export const B4_GPT_MODELS = {
  // V32's packed metal/roughness images are a magenta placeholder (G=0 -> mirror-like roughness 0 in three.js).
  // Ignore those maps and use the material factors with a matte floor instead (reported to GPT in the handoff).
  minecart_v32: { url: './assets/models/floor4/b4-minecart-v32.glb', length: 1.7, fixRoughness: 0.82, tint: 0.42 },  // its albedo is a light tan; darken to the B4 soot-wood range
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
      if (opts.tint && material.color) material.color.multiplyScalar(opts.tint);
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

const ORE_READY = false;
const OVERLAY_URL = './assets/models/floor4/props/b4lod_v33_rockwall_3k.glb';
const OVERLAY_READY = false;  // GPT V33 magma rock face (LOD by Claude) over the plain wall boxes
const OVERLAY_FRONT_Z = 1;     // which local axis of the LOD faces the corridor (+1: +Z, -1: -Z)   // flips to true when the dragon team's ore cluster GLB is promoted
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Distance from the tile centre to the B4 volcanic wall skin at lateral offset 0, for heights y0..y1.
// Mirrors wallGeo + volcanicWallGeo displacement in field-3d-b4-b5-map.js (wall centre 2.0, half thickness 0.325).
function wallSkinDistance(y0, y1, lateral = 0) {
  let minD = Infinity;
  for (const xs of lateral ? [lateral, -lateral] : [0]) for (let h = y0; h <= y1 + 1e-6; h += 0.05) {
    const x = xs, y = h - 2;
    const d = Math.sin(x * 2.6 + y * 1.7) * Math.cos(y * 3.3 - x * 1.4) * 0.12 + Math.sin(x * 6.2 + y * 4.3) * 0.045;
    const edge = THREE.MathUtils.smoothstep(2.04 - Math.abs(x), 0, 0.5), height = THREE.MathUtils.smoothstep(2.1 - Math.abs(y), 0, 0.48);
    const large = Math.sin(x * 1.19 + y * 0.63) * Math.cos(y * 0.94 - x * 0.36), small = Math.sin(x * 3.45 - y * 2.18) * Math.cos(y * 1.83 + x * 1.22);
    const fracture = Math.pow(Math.abs(Math.sin(x * 2.2 + y * 0.7)), 10);
    const over = (large * 0.26 + small * 0.11 - fracture * 0.07) * edge * height;
    minD = Math.min(minD, 2 - 0.325 - d - over);
  }
  return minD;
}
const sideFor = (R, lateral = 0) => R.side ?? (wallSkinDistance(R.y || 0, (R.y || 0) + R.height, lateral) - (R.wall ? 0.02 : R.radius + 0.04));

export async function addB4AssetDressing({ root, map, ch, wallCell, hash, CELL, lights, gLights, reserved = new Set(), mines = [], oreSites = [], lavaSites = [], crystalGeo = null, isStale = () => false, maxProps = 22 }) {
  const ids = Object.keys(B4_PROP_REGISTRY).filter(id => B4_PROP_REGISTRY[id].ready);
  const group = new THREE.Group(); group.name = 'b4:asset-dressing'; group.userData.b4Cached = true;
  const owned = [];
  const info = { placed: 0, byId: {}, missing: [], list: [], zones: {} };

  // ---- progress along the floor (BFS from the entrance) ----
  const W = map.w, H = map.h, idx = (x, y) => y * W + x;
  const walk = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !wallCell(x, y);
  let start = null;
  for (let y = 0; y < H && !start; y++) for (let x = 0; x < W; x++) { const c = ch(x, y); if (c === 'E' || c === '<' || c === 'S') { start = [x, y]; break; } }
  const bfs = (sources) => {
    const dist = new Int32Array(W * H).fill(-1), owner = new Int32Array(W * H).fill(-1), q = [];
    sources.forEach(([x, y], k) => { dist[idx(x, y)] = 0; owner[idx(x, y)] = k; q.push([x, y]); });
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of DIRS) if (walk(x + dx, y + dy) && dist[idx(x + dx, y + dy)] < 0) { dist[idx(x + dx, y + dy)] = dist[idx(x, y)] + 1; owner[idx(x + dx, y + dy)] = owner[idx(x, y)]; q.push([x + dx, y + dy]); }
    }
    return { dist, owner };
  };
  const { dist } = start ? bfs([start]) : { dist: new Int32Array(W * H).fill(0) };
  let maxD = 1; for (const d of dist) maxD = Math.max(maxD, d);
  const floorBias = Math.min(1, (map.f || 0) / 2);
  const progress = (x, y) => Math.min(1, (dist[idx(x, y)] >= 0 ? dist[idx(x, y)] / maxD : 0.5) * 0.7 + floorBias * 0.45);

  // ---- zones: seeds ~8 tiles apart, each owns its nearest tiles; one theme per zone ----
  const tiles = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (walk(x, y)) tiles.push([x, y]);
  tiles.sort((a, b) => hash(a[0], a[1], 801) - hash(b[0], b[1], 801));
  const seeds = [];
  for (const t of tiles) if (seeds.every(s => Math.abs(s[0] - t[0]) + Math.abs(s[1] - t[1]) >= 8)) seeds.push(t);
  const { owner } = bfs(seeds.length ? seeds : [[1, 1]]);
  const zoneTheme = seeds.map(([x, y], k) => {
    const t = progress(x, y), w = { mine: 1.25 * (1 - t), deposit: 1.0 + 0.35 * t, dragon: 1.5 * t * t + 0.05, plain: 0.32 };
    let total = 0; for (const v of Object.values(w)) total += v;
    let r = hash(x, y, 802) * total;
    for (const [k2, v] of Object.entries(w)) { if ((r -= v) <= 0) return k2; }
    return 'plain';
  });
  zoneTheme.forEach(z => { info.zones[z] = (info.zones[z] || 0) + 1; });
  const themeAt = (x, y) => zoneTheme[owner[idx(x, y)]] || 'plain';

  // ---- slots: every wall face of a free tile offers a centre slot and two lateral slots ----
  const blocked = (x, y) => {
    const c = ch(x, y);
    return c !== '.' || reserved.has(x + ',' + y) || (map.objects || []).some(o => Math.abs(o.tx - x) + Math.abs(o.ty - y) <= 1);
  };
  const chosen = [], faces = [];
  let triBudget = 260000;
  for (let ty = 1; ty < H - 1; ty++) for (let tx = 1; tx < W - 1; tx++) {
    if (!walk(tx, ty)) continue;
    const theme = themeAt(tx, ty);
    for (const [dx, dz] of DIRS) {
      if (ch(tx + dx, ty + dz) !== '#') continue;
      faces.push({ tx, ty, dx, dz, theme });
      if (blocked(tx, ty)) continue;
      for (const lateral of [-1.05, 0, 1.05]) {
        const r = hash(tx * 3 + dx + 7, ty * 3 + dz + 7, 803 + Math.round(lateral * 10));
        if (r > ZONE_FILL[theme] / 2.2) continue;          // ~ZONE_FILL of faces get something, 1–2 props each
        const pool = ids.map(id => [id, B4_PROP_REGISTRY[id].themes[theme] || 0]).filter(([, w]) => w > 0);
        if (!pool.length) continue;
        let total = pool.reduce((a, [, w]) => a + w, 0), pick = hash(tx + lateral * 5, ty, 813 + dx * 3 + dz) * total, id = pool[0][0];
        for (const [pid, w] of pool) { if ((pick -= w) <= 0) { id = pid; break; } }
        const R = B4_PROP_REGISTRY[id];
        if (lateral && R.radius > 0.55) continue;           // big props only in the centre slot
        if (chosen.some(o => o.tx === tx && o.ty === ty && o.dx === dx && o.dz === dz && (Math.abs(o.lateral - lateral) < 1 || R.radius > 0.55 || B4_PROP_REGISTRY[o.id].radius > 0.55))) continue;
        if ((triBudget -= (R.tris || 4000)) < 0) continue;
        chosen.push({ tx, ty, dx, dz, lateral, id, t: progress(tx, ty), theme });
      }
    }
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
      const side = sideFor(R, c.lateral), lx = -c.dz * c.lateral, lz = c.dx * c.lateral;
      const x = c.tx * CELL + c.dx * side + lx, z = c.ty * CELL + c.dz * side + lz;
      const yaw = Math.atan2(-c.dx, -c.dz) + (R.wall ? 0 : (hash(c.tx + c.lateral, c.ty, 814) - 0.5) * 0.9);
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
    for (const c of list) info.list.push({ id, tx: c.tx, ty: c.ty, dx: c.dx, dz: c.dz, t: +c.t.toFixed(2), x: c.tx * CELL + c.dx * sideFor(R, c.lateral) - c.dz * c.lateral, y: R.y || 0, z: c.ty * CELL + c.dz * sideFor(R, c.lateral) + c.dx * c.lateral, theme: c.theme });
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
  // ---- lava tiles: GPT lava pool V3 (user-approved, LOD by Claude) breaks up the square lava planes ----
  if (lavaSites.length) {
    const pool = await loadProp('b4lod_lava_pool_v3');
    if (pool && !isStale()) {
      const size = pool.box.getSize(new THREE.Vector3()), centre = pool.box.getCenter(new THREE.Vector3());
      const base = 4.6 / Math.max(size.x, size.z);
      const pm = lavaSites.map(({ tx, ty }) => new THREE.Matrix4().compose(
        new THREE.Vector3(tx * CELL + (hash(tx, ty, 840) - 0.5) * 0.6, 0.02, ty * CELL + (hash(tx, ty, 841) - 0.5) * 0.6),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hash(tx, ty, 842) * Math.PI * 2, 0)),
        new THREE.Vector3().setScalar(base * (0.92 + 0.2 * hash(tx, ty, 843))))
        .multiply(new THREE.Matrix4().makeTranslation(-centre.x, -pool.box.min.y, -centre.z)));
      instance(group, owned, pool, pm, 'b4:gpt-lava-pool-v3');
      info.lavaPools = pm.length;
    }
  }
  // ---- rock-face overlays: GPT V33 magma basalt (LOD) on part of the wall faces, denser in deposit/dragon zones ----
  if (OVERLAY_READY && faces.length) {
    const rock = await loadModel('v33_overlay', OVERLAY_URL);
    if (rock && !isStale()) {
      const size = rock.box.getSize(new THREE.Vector3()), centre = rock.box.getCenter(new THREE.Vector3());
      const sx = 4.15 / size.x, sz = Math.min(1, 0.85 / size.z), sy = 4.0 / size.y;
      const om = [];
      for (const f of faces) {
        if (hash(f.tx * 5 + f.dx, f.ty * 5 + f.dz, 830) > ZONE_OVERLAY[f.theme]) continue;
        const flip = 1;   // no mirroring: negative instance scale would turn the faces inside out
        const skin = 2 - 0.325 - 0.12;
        const M = new THREE.Matrix4().compose(
          new THREE.Vector3(f.tx * CELL + f.dx * skin, -0.05, f.ty * CELL + f.dz * skin),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(-f.dx, -f.dz) + (OVERLAY_FRONT_Z > 0 ? 0 : Math.PI), 0)),
          new THREE.Vector3(1, 1, 1))
          .multiply(new THREE.Matrix4().makeScale(sx * flip, sy * (0.92 + 0.16 * hash(f.tx, f.ty, 832)), sz))
          .multiply(new THREE.Matrix4().makeTranslation(-centre.x, -rock.box.min.y, -(OVERLAY_FRONT_Z > 0 ? rock.box.min.z : rock.box.max.z)));
        om.push(M);
      }
      if (om.length) { instance(group, owned, rock, om, 'b4:v33-rock-overlay'); info.overlays = om.length; }
    }
  }
  // ---- wall crystal sites: the dragon team's ore cluster replaces the cone placeholders ----
  if (oreSites.length && ORE_READY) {
    const ore = await loadProp('b4p_dragon_ore_cluster');
    if (ore && !isStale()) {
      const om = oreSites.map(o => new THREE.Matrix4().compose(
        new THREE.Vector3(o.x - o.dx * 0.25, 0, o.z - o.dz * 0.25),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(-o.dx, -o.dz) + Math.PI + (o.k - 0.08) * 3, 0)),
        new THREE.Vector3().setScalar(0.9 + o.k * 2.2)));
      instance(group, owned, ore, om, 'b4:prop:b4p_dragon_ore_cluster');
      info.byId.b4p_dragon_ore_cluster = om.length;
      if (crystalGeo) for (const ch of root.children) if (ch.geometry === crystalGeo) ch.visible = false;
    }
  }
  root.add(group);
  return {
    group,
    dispose() { owned.forEach(i => i.dispose()); group.removeFromParent(); },   // cached geometry/material stay for reuse
    info: () => info,
  };
}
