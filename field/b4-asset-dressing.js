/* B4 asset dressing: places the Claude B4 prop GLBs (docs/3d/B4_PROPS_DESIGN.md) along corridor walls.
 * Never writes gameplay state: props sit beside walls on walkable '.' tiles, away from objects/stairs,
 * and never block the corridor centre line used by the camera/FOEs.
 * Story gradient: near the entrance human traces dominate (mine gear); towards the boss / later floors
 * dragon traces take over (bones, scales, claw marks). One warning sign marks the border. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildTemplePass } from './b4-temple-fx.js?v=20261122-k2';

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
  b4p_dragon_ore_cluster: { ready: true, themes: { deposit: 2.2, dragon: 0.5 }, radius: 0.75, height: 1.3, scale: [0.8, 1.25], tris: 5804, light: { y: 0.35, color: 0xff3a12, intensity: 1.4, range: 3.6 } },
  b4p_ore_vein_wall: { ready: true, wall: true, themes: { deposit: 2.0, dragon: 0.4 }, radius: 1.25, height: 2.1, y: 0.15, scale: [0.9, 1.1], tris: 7728, light: { y: 1.0, z: 0.4, color: 0xff4a18, intensity: 1.3, range: 3.5 } },
  b4p_rock_rubble: { ready: true, themes: { deposit: 1.4, dragon: 0.8, plain: 0.9, mine: 0.4 }, radius: 0.8, height: 0.55, scale: [0.8, 1.2], tris: 5290 },
  b4p_basalt_columns: { ready: true, themes: { deposit: 1.0, plain: 1.0, dragon: 0.4 }, radius: 0.8, height: 2.2, scale: [0.85, 1.15], tris: 3116 },
  b4p_claw_rock: { ready: true, wall: true, themes: { dragon: 1.8, deposit: 0.2 }, radius: 1.0, height: 1.3, scale: [0.95, 1.2], tris: 4004, light: { y: 0.6, z: 0.6, color: 0xff3a10, intensity: 0.8, range: 2.8 } },
  b4p_dragon_scale: { ready: false, themes: { dragon: 1.2, deposit: 0.3 }, radius: 0.4, height: 0.15, scale: [0.9, 1.1] },
  b4p_charred_stump: { ready: true, themes: { dragon: 1.0, plain: 0.3 }, radius: 0.48, height: 1.2, scale: [0.9, 1.15], tris: 4918, light: { y: 0.4, color: 0xff5a1a, intensity: 1.0, range: 3 } },
  b4p_egg_shells: { ready: true, themes: { dragon: 0.9 }, radius: 0.7, height: 0.6, scale: [0.9, 1.1], tris: 4300, light: { y: 0.2, color: 0xff4a14, intensity: 0.9, range: 2.6 } },
  b4p_chain_anchor: { ready: false, wall: true, y: 0.6, themes: { dragon: 0.6, mine: 0.3 }, radius: 0.2, height: 1.8, scale: [0.95, 1.05] },
};
const ZONE_FILL = { deposit: 0.62, mine: 0.55, dragon: 0.45, plain: 0.1 };
const ZONE_OVERLAY = { deposit: 0.42, dragon: 0.36, mine: 0.16, plain: 0.5 };   // V33 rock-face overlays per wall face

// Approved GPT models reused as-is (docs/3d/B4_GPT_MODEL_INVENTORY.md).
export const B4_GPT_MODELS = {
  // V32's packed metal/roughness images are a magenta placeholder (G=0 -> mirror-like roughness 0 in three.js).
  // Ignore those maps and use the material factors with a matte floor instead (reported to GPT in the handoff).
  minecart_v32: { url: './assets/models/floor4/b4-minecart-v32.glb', length: 1.7, fixRoughness: 0.82, tint: 0.3 },  // its albedo is a light tan; darken to the B4 soot-wood range
};

// Fragments closer than `near` metres to the camera are discarded, so a prop or wall panel beside the player never
// fills the screen when the player turns their back to it or brushes past it (user feedback 2026-11-21).
function nearCull(material, near) {
  if (material.userData.b4NearCull) return;
  material.userData.b4NearCull = near;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.uniforms.uB4Near = { value: near };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vB4World;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n{ vec4 b4w = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n b4w = instanceMatrix * b4w;\n#endif\n vB4World = (modelMatrix * b4w).xyz; }');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vB4World;\nuniform float uB4Near;')
      .replace('void main() {', 'void main() {\n  if (distance(vB4World, cameraPosition) < uB4Near) discard;');
  };
  material.customProgramCacheKey = () => 'b4near' + near;
  material.needsUpdate = true;
}

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
      if (material.emissiveMap) material.emissiveIntensity = opts.emissive ?? Math.max(material.emissiveIntensity, 2.2);
      if (opts.tintRGB && material.color) material.color.multiply(new THREE.Color(...opts.tintRGB));
      material.userData.b4PropCached = true;
      nearCull(material, opts.near ?? 1.6);   // 2026-11-22 背中側の物が視界をふさがない
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
const loadProp = (id, opts) => loadModel(id, `${BASE}${id}.glb`, opts);

function instance(group, owned, asset, matrices, name) {
  for (const m of asset.meshes) {
    const inst = new THREE.InstancedMesh(m.geometry, m.material, matrices.length);
    inst.name = name;
    matrices.forEach((M, i) => inst.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(M, m.matrix)));
    inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere();
    group.add(inst); owned.push(inst);
  }
}

const ORE_READY = true;
// Basalt wall panels (lead asset, blueprint docs/3d/b4-props/blueprints/b4p_basalt_wall_panel.md) over the plain wall boxes.
// (The GPT V33 rock wall was tried as an LOD first: its basalt exports white and the shape reads as a box at game scale.)
const OVERLAY_IDS = ['b4p_basalt_wall_panel_a', 'b4p_basalt_wall_panel_b'];
const OVERLAY_READY = true;
const OVERLAY_MAX = 40;
const OVERLAY_FRONT_Z = 1;     // glTF +Z faces the corridor (Blender -Y)   // flips to true when the dragon team's ore cluster GLB is promoted
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
const sideFor = (R, lateral = 0) => R.side ?? (R.wall ? 1.58 : wallSkinDistance(R.y || 0, (R.y || 0) + R.height, lateral) - R.radius - 0.04);   // wall pieces sink into the displaced skin rather than float off it

export async function addB4AssetDressing({ root, map, ch, wallCell, hash, CELL, lights, gLights, reserved = new Set(), mines = [], oreSites = [], lavaSites = [], deepTiles = [], crystalGeo = null, extraEmbers = [], rockMaterial = null, isTempleFace = null, openFaces = new Set(), isStale = () => false, maxProps = 22 }) {
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
  // ---- which wall faces get a basalt panel (decided first so props/torches avoid them) ----
  const panelPrio = { deposit: 0, dragon: 1, plain: 2, mine: 3 };
  const panelFaces = [];
  if (OVERLAY_READY) {
    for (let ty = 1; ty < H - 1; ty++) for (let tx = 1; tx < W - 1; tx++) {
      if (!walk(tx, ty)) continue;
      const theme = themeAt(tx, ty);
      for (const [dx, dz] of DIRS) if (ch(tx + dx, ty + dz) === '#' && !(isTempleFace && isTempleFace(tx, ty, dx, dz)) && hash(tx * 5 + dx, ty * 5 + dz, 830) <= ZONE_OVERLAY[theme] * 1.6) panelFaces.push({ tx, ty, dx, dz, theme });   // basalt panels only on the cave-rock faces
    }
    panelFaces.sort((p, q) => panelPrio[p.theme] - panelPrio[q.theme] || hash(p.tx, p.ty, 834) - hash(q.tx, q.ty, 834));
    panelFaces.length = Math.min(panelFaces.length, OVERLAY_MAX);
  }
  const paneled = new Set(panelFaces.map(f => `${f.tx},${f.ty},${f.dx},${f.dz}`));
  const chosen = [], faces = [];
  let triBudget = 260000;
  for (let ty = 1; ty < H - 1; ty++) for (let tx = 1; tx < W - 1; tx++) {
    if (!walk(tx, ty)) continue;
    const theme = themeAt(tx, ty);
    for (const [dx, dz] of DIRS) {
      if (ch(tx + dx, ty + dz) !== '#') continue;
      if (openFaces.has(`${tx},${ty},${dx},${dz}`)) continue;   // parapet over a chasm: nothing on it
      faces.push({ tx, ty, dx, dz, theme });
      if (blocked(tx, ty)) continue;
      if (paneled.has(`${tx},${ty},${dx},${dz}`)) continue;   // that face gets a rock panel instead
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
        const lz = R.light.z || 0;
        const L = { world: new THREE.Vector3(x - c.dx * lz, y0 + R.light.y * s, z - c.dz * lz), color: R.light.color, intensity: R.light.intensity, range: R.light.range, off: false };
        lights.push(L); gLights.push(L);
      }
      return tmp.matrix.clone();
    });
    // wall-mounted pieces: put the flat back (glTF min z) on the instance origin so it sits on the wall skin
    if (R.wall) { const back = new THREE.Matrix4().makeTranslation(0, 0, -asset.box.min.z); mats.forEach(M => M.multiply(back)); }
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
    const pool = await loadProp('b4lod_lava_pool_v3', { emissive: 0.5, tintRGB: [0.8, 0.7, 0.65] });
    if (pool && !isStale()) {
      const size = pool.box.getSize(new THREE.Vector3()), centre = pool.box.getCenter(new THREE.Vector3());
      const base = 4.6 / Math.max(size.x, size.z);
      const isLava = (x, y) => { const c = ch(x, y); return c === '*' || c === '~'; };
      const sites = lavaSites.filter(({ tx, ty }) => DIRS.some(([dx, dz]) => !isLava(tx + dx, ty + dz)) || hash(tx, ty, 844) < 0.25)
        .sort((p, q) => hash(p.tx, p.ty, 845) - hash(q.tx, q.ty, 845)).slice(0, 40);
      const pm = sites.map(({ tx, ty }) => new THREE.Matrix4().compose(
        new THREE.Vector3(tx * CELL + (hash(tx, ty, 840) - 0.5) * 0.6, 0.02, ty * CELL + (hash(tx, ty, 841) - 0.5) * 0.6),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hash(tx, ty, 842) * Math.PI * 2, 0)),
        new THREE.Vector3().setScalar(base * (0.92 + 0.2 * hash(tx, ty, 843))))
        .multiply(new THREE.Matrix4().makeTranslation(-centre.x, -pool.box.min.y, -centre.z)));
      instance(group, owned, pool, pm, 'b4:gpt-lava-pool-v3');
      info.lavaPools = pm.length;
    }
  }
  // ---- impassable lava (~): GPT magma river V16 / banks P1–P3 (user-approved; LOD by Claude), one per cell.
  // 8.5 m piece → 4.15 m. The 3.3 m ledge (local −z) turns toward the neighbouring wall so lava pours off it into the channel.
  if (deepTiles.length) {
    const ids = ['b4lod_magma_river_v16', 'b4lod_magma_bank_p1', 'b4lod_magma_bank_p2', 'b4lod_magma_bank_p3'];
    const pieces = await Promise.all(ids.map(id => loadProp(id, { emissive: 7, near: 0.6, tintRGB: [1.25, 1.0, 0.9] })));
    if (pieces.every(Boolean) && !isStale()) {
      const per = ids.map(() => []);
      const deep = new Set(deepTiles.map(t => t.tx + ',' + t.ty)), used = new Set();
      const isDeep = (x, y) => deep.has(x + ',' + y) && !used.has(x + ',' + y);
      const walkC = c => c && c !== '#' && c !== '~';
      // score a ledge direction for a set of cells: walls behind it good, walkway behind it bad
      const ledgeDir = (cells, salt) => {
        let best = DIRS[0], bs = -1e9;
        DIRS.forEach(([dx, dz], di) => {
          let sc = 0;
          for (const [x, y] of cells) { const nx = x + dx, ny = y + dz; if (deep.has(nx + ',' + ny)) continue; const c = ch(nx, ny); sc += c === '#' ? 2 : (c === ',' || c === '_') ? -5 : walkC(c) ? -1 : 0; }
          sc += hash(cells[0][0], cells[0][1], salt + di) * 0.5;
          if (sc > bs) { bs = sc; best = [dx, dz]; }
        });
        return best;
      };
      const place = (cx, cz, [ox, oz], sc, seedX, seedY) => {
        const theta = Math.atan2(-ox, -oz);   // R_y(θ)·(0,0,−1) = (ox,0,oz)
        const k = hash(seedX, seedY, 852) < 0.45 ? 0 : 1 + Math.floor(hash(seedX, seedY, 853) * 3);
        per[k].push(new THREE.Matrix4().compose(new THREE.Vector3(cx, -0.5, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, theta, 0)), new THREE.Vector3(sc, sc * (0.92 + hash(seedX, seedY, 855) * 0.16), sc)));
      };
      // 参道（,）に接する溶岩の塊だけ原寸の 2×2 を使う。広間の穴などは欄干で囲うので、段差の低い小さい版にする（裏が見えない）
      const nearPath = new Set();
      { const seen = new Set(); for (const t of deepTiles) { const k0 = t.tx + ',' + t.ty; if (seen.has(k0)) continue;
          const comp = [], q = [[t.tx, t.ty]]; seen.add(k0); let touch = false;
          while (q.length) { const [x, y] = q.pop(); comp.push(x + ',' + y); for (const [dx, dz] of DIRS) { const nk = (x + dx) + ',' + (y + dz); if (ch(x + dx, y + dz) === ',') touch = true; if (deep.has(nk) && !seen.has(nk)) { seen.add(nk); q.push([x + dx, y + dz]); } } }
          if (touch) comp.forEach(k => nearPath.add(k)); } }
      // 2×2 blocks first at the piece's native scale (8.5 m ≈ two cells)
      const sorted = deepTiles.slice().sort((a, b) => a.ty - b.ty || a.tx - b.tx);
      for (const { tx, ty } of sorted) {
        if (!isDeep(tx, ty) || !isDeep(tx + 1, ty) || !isDeep(tx, ty + 1) || !isDeep(tx + 1, ty + 1) || !nearPath.has(tx + ',' + ty)) continue;
        const cells = [[tx, ty], [tx + 1, ty], [tx, ty + 1], [tx + 1, ty + 1]];
        cells.forEach(([x, y]) => used.add(x + ',' + y));
        place((tx + 0.5) * CELL, (ty + 0.5) * CELL, ledgeDir(cells, 856), 8.3 / 8.5, tx, ty);
      }
      for (const { tx, ty } of deepTiles) {
        if (!isDeep(tx, ty)) continue;
        used.add(tx + ',' + ty);
        place(tx * CELL, ty * CELL, ledgeDir([[tx, ty]], 850), 4.15 / 8.5 * (1 + hash(tx, ty, 854) * 0.04), tx, ty);
      }
      per.forEach((ms, k) => { if (ms.length) instance(group, owned, pieces[k], ms, 'b4:gpt-magma-' + ids[k]); });
      info.gptMagma = deepTiles.length;
    } else info.missing.push('gpt_magma_v16');
  }
  // ---- rock-face overlays: GPT V33 magma basalt (LOD) on part of the wall faces, denser in deposit/dragon zones ----
  if (OVERLAY_READY && panelFaces.length) {
    // panels sit right beside the camera: warmer albedo to match the volcanic wall boxes, joint lava kept modest
    const rocks = (await Promise.all(OVERLAY_IDS.map(id => loadProp(id, { tintRGB: [0.95, 0.72, 0.6], emissive: 0.35, near: 1.15 })))).filter(Boolean);
    if (rocks.length && !isStale()) {
      const per = rocks.map(() => []);
      for (const f of panelFaces) {
        const k = Math.floor(hash(f.tx, f.ty * 7 + f.dx, 833) * rocks.length), rock = rocks[k];
        const size = rock.box.getSize(new THREE.Vector3()), centre = rock.box.getCenter(new THREE.Vector3());
        const sx = 4.15 / size.x, sz = Math.min(1, 0.45 / size.z), sy = 4.0 / size.y;   // max 0.45 m into the corridor
        const skin = 2 - 0.325 - 0.12;
        per[k].push(new THREE.Matrix4().compose(
          new THREE.Vector3(f.tx * CELL + f.dx * skin, -0.05, f.ty * CELL + f.dz * skin),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(-f.dx, -f.dz) + (OVERLAY_FRONT_Z > 0 ? 0 : Math.PI), 0)),
          new THREE.Vector3(1, 1, 1))
          .multiply(new THREE.Matrix4().makeScale(sx, sy * (0.94 + 0.12 * hash(f.tx, f.ty, 832)), sz))
          .multiply(new THREE.Matrix4().makeTranslation(-centre.x, -rock.box.min.y, -(OVERLAY_FRONT_Z > 0 ? rock.box.min.z : rock.box.max.z))));
      }
      info.overlays = 0;
      rocks.forEach((rock, k) => { if (per[k].length) { instance(group, owned, rock, per[k], `b4:wall-panel-${k}`); info.overlays += per[k].length; } });
    }
  }
  // ---- wall crystal sites: the dragon team's ore cluster replaces the cone placeholders ----
  if (oreSites.length && ORE_READY) {
    const ore = await loadProp('b4p_dragon_ore_cluster');
    if (ore && !isStale()) {
      const tileOf = o => [Math.round(o.x / CELL), Math.round(o.z / CELL)];
      const picked = oreSites.filter(o => { const [x, y] = tileOf(o); const th = themeAt(x, y); return th === 'deposit' || (th === 'dragon' && o.k < 0.09); }).slice(0, 24);
      const om = picked.map(o => new THREE.Matrix4().compose(
        new THREE.Vector3(o.x - o.dx * 0.25, 0, o.z - o.dz * 0.25),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(-o.dx, -o.dz) + Math.PI + (o.k - 0.08) * 3, 0)),
        new THREE.Vector3().setScalar(0.9 + o.k * 2.2)));
      instance(group, owned, ore, om, 'b4:prop:b4p_dragon_ore_cluster');
      info.oreSites = om.length;
      if (crystalGeo) for (const ch of root.children) if (ch.geometry === crystalGeo) ch.visible = false;
    }
  }
  // ---- temple pass: torches, floor glyphs, rune bands, light shafts, rockfall, embers ----
  const temple = buildTemplePass({ root: group, map, ch, wallCell, hash, CELL, lights, gLights, reserved, faces, paneled, extraEmbers, rockMaterial });
  info.temple = temple.info();
  root.add(group);
  return {
    update: now => temple.update(now),
    group,
    dispose() { temple.dispose(); owned.forEach(i => i.dispose()); group.removeFromParent(); },   // cached geometry/material stay for reuse
    info: () => info,
  };
}
