#!/usr/bin/env node
'use strict';
/** Generate a review-only F1 3F layout from the actual development map.
 *
 * node tools/f1-sacred-forest/build_game_layout.cjs
 * node tools/f1-sacred-forest/build_game_layout.cjs --require-assets
 *
 * This does not patch game code, alter the map, or apply a candidate layout.
 * It evaluates the existing fieldArea() implementation in an isolated VM so
 * IDs and object/save keys are copied rather than reimplemented.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'assets/3d/dungeons/b1_sacred_forest_candidates');
const DEST = path.join(OUT, 'scene/game-layout-candidate.json');
const BASELINE = 'ae7995ae9ab7c36a547c6dbd7a5d601d3fc4bea5';
const EXISTING = 'assets/3d/dungeons/b1_ancient_forest/';
const CANDIDATE = 'assets/3d/dungeons/b1_sacred_forest_candidates/';
const SOIL_SURFACE_SOURCE_SHA256 = 'a8a52193f076a3926f25f28acdf7ba9726a87e2f9366c7c00138cf2f4a52b788';
// Adding a full root-and-slab module is an explicit art decision, not a fallback
// for a loader that cannot select the soil-only node. Any future entry must be
// checked against all unchanged movement sweeps, including its low roots.
const fullRootsoilTileWhitelist = [];
const requireAssets = process.argv.includes('--require-assets');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = name => fs.readFileSync(path.join(ROOT, name), 'utf8');
const clean = value => JSON.parse(JSON.stringify(value));
const stable = value => JSON.stringify(sort(value));
function sort(value) {
  if (Array.isArray(value)) return value.map(sort);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, sort(value[k])]));
  return value;
}
const round = v => Math.round(v * 1e6) / 1e6;

const context = {};
vm.createContext(context);
vm.runInContext(read('data/field-maps.js') + '\n' + read('field.js') + `
this.sourceArea = fieldArea(1, 2);
this.sourceSolid = (x, y) => fieldCharSolid(this.sourceArea, fieldTileAt(this.sourceArea, x, y));
this.sourceVisualWall = (x, y) => {
  const c = fieldTileAt(this.sourceArea, x, y), d = fieldLetterDef(this.sourceArea, c);
  return c === '#' || !!(d && (d.onWall || (d.kind === 'door' && d.hidden && !fieldDoorOpen(d))));
};
`, context, { timeout: 3000 });
const area = clean(context.sourceArea);
const map = [...area.floor.map];
const w = area.w, h = area.h;
if (map.some(row => row.length !== w)) throw new Error('Nonrectangular source map; do not infer missing cells.');
const charAt = (x, y) => map[y]?.[x] ?? '#';
const walk = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !context.sourceSolid(x, y);
const visualWall = (x, y) => !!context.sourceVisualWall(x, y);
const directions = [
  { id: 'up', dx: 0, dz: -1, yaw: 0 },
  { id: 'right', dx: 1, dz: 0, yaw: -Math.PI / 2 },
  { id: 'down', dx: 0, dz: 1, yaw: Math.PI },
  { id: 'left', dx: -1, dz: 0, yaw: Math.PI / 2 },
];

const zoneDefinitions = [
  { id: 'root_approach', nameJa: '根の参道', priority: 20, ceiling: false,
    mask: { yMin: 13, yMax: 17 }, wallPolicy: 'collapsed alternating with standing stone',
    intent: 'Preserve the starting NPC and stairs; a single torii marks the east-west approach.' },
  { id: 'sunken_grove', nameJa: '水際の根庭', priority: 30, ceiling: false,
    mask: { xMin: 12, xMax: 21, yMin: 6, yMax: 11 }, wallPolicy: 'mossy collapsed wall',
    intent: 'Keep every source water cell impassable. White flowers occupy dry walking-cell corners only.' },
  { id: 'sealed_corridor', nameJa: '地下封印回廊', priority: 40, ceiling: true,
    mask: { xMin: 20, xMax: 27, yMin: 0, yMax: 4 }, wallPolicy: 'standing stone wall',
    intent: 'A compressed stone sanctuary before the unchanged boss gate; reuse original gate and lamp.' },
  { id: 'sacred_courtyard', nameJa: '天蓋の裂けた祭祀庭', priority: 0, ceiling: false,
    mask: { default: true }, wallPolicy: 'irregular standing and collapsed fragments',
    intent: 'A clear sky opening and tall cedar silhouettes replace repetitive overhead vaults.' },
];
function zone(x, y) {
  return [...zoneDefinitions].sort((a, b) => b.priority - a.priority).find(z => {
    const m = z.mask;
    return m.default || (x >= (m.xMin ?? 0) && x <= (m.xMax ?? w - 1) && y >= (m.yMin ?? 0) && y <= (m.yMax ?? h - 1));
  });
}

// Every row run and column run is a swept 2m wide movement envelope. Their
// union includes cell centres and every legal cardinal movement edge.
const walkRectangles = [];
for (const axis of ['row', 'column']) {
  const outer = axis === 'row' ? h : w, inner = axis === 'row' ? w : h;
  for (let a = 0; a < outer; a++) {
    let start = null;
    for (let b = 0; b <= inner; b++) {
      const ok = b < inner && (axis === 'row' ? walk(b, a) : walk(a, b));
      if (ok && start === null) start = b;
      if (!ok && start !== null) {
        const end = b - 1;
        walkRectangles.push({ axis, startTile: axis === 'row' ? [start, a] : [a, start],
          endTile: axis === 'row' ? [end, a] : [a, end],
          min: axis === 'row' ? [start * 4 - 1, 0, a * 4 - 1] : [a * 4 - 1, 0, start * 4 - 1],
          max: axis === 'row' ? [end * 4 + 1, 3, a * 4 + 1] : [a * 4 + 1, 3, end * 4 + 1] });
        start = null;
      }
    }
  }
}
const solidRectangles = [];
for (let y = 0; y < h; y++) {
  let start = null;
  for (let x = 0; x <= w; x++) {
    const blocked = x < w && !walk(x, y);
    if (blocked && start === null) start = x;
    if (!blocked && start !== null) {
      solidRectangles.push({ startTile: [start, y], endTile: [x - 1, y],
        min: [start * 4 - 2, 0, y * 4 - 2], max: [(x - 1) * 4 + 2, 4, y * 4 + 2],
        source: 'navigation-solid tile union; includes water and fixed nonwalkable interactables' });
      start = null;
    }
  }
}

const cells = [], floors = [], ceilings = [], walls = [];
const floorId = c => c === '*' ? 'mod_root_soil_floor_4m' : 'mod_sacred_stone_floor_4m';
const hash = (x, y) => ((Math.imul(x + 37, 374761393) ^ Math.imul(y + 19, 668265263)) >>> 0) / 4294967296;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const c = charAt(x, y), z = zone(x, y);
  cells.push({ tile: [x, y], sourceChar: c, worldCenter: [x * 4, 0, y * 4],
    navigationSolid: !walk(x, y), visualWall: visualWall(x, y),
    water: c === '~', zone: z.id, ceiling: !visualWall(x, y) && z.ceiling });
  if (visualWall(x, y)) continue;
  if (c !== '~') floors.push({ id: `floor_${x}_${y}`, assetId: floorId(c),
    file: CANDIDATE + 'modules/' + floorId(c) + '.glb', tile: [x, y],
    renderProfile: c === '*' ? 'soil_surface_only' : 'stone_full_asset',
    position: [x * 4, 0, y * 4], rotationY: ((x + y) % 4) * Math.PI / 2,
    scale: [1, 1, 1], zone: z.id, sourceCharUnchanged: c });
  if (z.ceiling) ceilings.push({ id: `ceiling_${x}_${y}`,
    reuseExisting: true, file: EXISTING + 'modules/mod_ceiling_vault_4m.glb',
    tile: [x, y], position: [x * 4, 4, y * 4], rotationY: ((x + y) % 4) * Math.PI / 2,
    scale: [1, 1, 1], zone: z.id, undersideHeight: 4 });
  for (const d of directions) if (visualWall(x + d.dx, y + d.dz)) {
    const collapsed = z.id !== 'sealed_corridor' && (z.id === 'sunken_grove' || hash(x * 5 + d.dx, y * 5 + d.dz) < .47);
    const assetId = collapsed ? 'mod_sacred_collapsed_wall_4m' : 'mod_sacred_wall_4m';
    walls.push({ id: `wall_${x}_${y}_${d.id}`, assetId,
      file: CANDIDATE + 'modules/' + assetId + '.glb',
      openTile: [x, y], blockedTile: [x + d.dx, y + d.dz], boundary: d.id,
      position: [x * 4 + d.dx * 2, 0, y * 4 + d.dz * 2],
      rotationY: d.yaw, scale: [1, 1, 1], zone: z.id,
      frontDirection: [-d.dx, 0, -d.dz], thicknessDirection: [d.dx, 0, d.dz],
      collisionSource: 'unchanged source map; visual damage creates no new passage' });
  }
}

// Reproduce only the existing presentation orientation lookup; object identity
// and game data are taken verbatim from fieldArea(), never created here.
function facingFor(tx, ty) {
  for (const name of ['down', 'up', 'right', 'left']) {
    const d = directions.find(d => d.id === name);
    if (walk(tx + d.dx, ty + d.dz) && charAt(tx + d.dx, ty + d.dz) !== '~') return name;
  }
  for (const d of directions) if (!visualWall(tx + d.dx, ty + d.dz) && charAt(tx + d.dx, ty + d.dz) !== '~') return d.id;
  return 'down';
}
const faceYaw = { up: Math.PI, right: Math.PI / 2, down: 0, left: -Math.PI / 2 };
const fixedObjects = area.objects.map(object => {
  const facing = facingFor(object.tx, object.ty), d = directions.find(d => d.id === facing);
  const result = { identity: clean(object), reuseExisting: true, position: [object.tx * 4, 0, object.ty * 4],
    rotationY: faceYaw[facing], scale: [1, 1, 1],
    interactionAnchor: [object.tx * 4, object.kind === 'npc' ? 2.2 : object.kind === 'save' ? 1.9 : object.kind === 'sign' ? 1.8 : 1.2, object.ty * 4],
    sourceRuntime: 'field/field-3d-view.js:284-305,321-355',
    stateSync: 'existing g.entries and syncEntry; integration must preserve them' };
  if (object.kind === 'npc') result.file = EXISTING + 'props/' + (object.id === 'woodcutter' ? 'npc_woodcutter' : object.id === 'herb-girl' ? 'npc_herb_girl' : 'npc_traveler') + '.glb';
  else if (object.kind === 'stairs') {
    result.file = EXISTING + (object.dir === 'up' ? 'props/broken_stone_stairs.glb' : 'modules/mod_stairs_down.glb');
    if (object.dir === 'up') { result.rotationY += Math.PI; result.scale = [.75, .75, .75]; }
  } else if (object.kind === 'gate') {
    result.file = EXISTING + 'modules/gimmick_sealed_rune_door.glb';
    result.position[0] -= d.dx * 1.9; result.position[2] -= d.dz * 1.9;
  } else if (object.kind === 'chest' || object.kind === 'cache') {
    result.file = EXISTING + 'props/sealed_treasure_chest.glb';
    result.stateFiles = { closed: result.file, open: EXISTING + 'props/sealed_treasure_chest_open.glb' };
  } else if (object.kind === 'sign') result.file = EXISTING + 'props/ancient_stone_signpost.glb';
  else if (object.kind === 'save') {
    result.file = EXISTING + 'props/blue_wisp_torch.glb';
    result.rotationY = 0;
    result.additions = [{ file: EXISTING + 'props/ancient_rune_floor_seal.glb',
      position: [object.tx * 4, .005, object.ty * 4], rotationY: 0, scale: [.8, .8, .8] }];
  }
  if (!result.file) throw new Error('Unsupported fixed object; do not silently drop: ' + object.kind);
  if (!fs.existsSync(path.join(ROOT, result.file))) throw new Error('Existing GLB missing: ' + result.file);
  return result;
});

// Mesh-space bounds are read from the actual GLB whenever present. The same
// matrix conversion used by glTF is applied before clearance tests.
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a, b) {
  const out = Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}
function nodeMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1], [sx, sy, sz] = node.scale || [1, 1, 1], t = node.translation || [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    t[0], t[1], t[2], 1];
}
const point = (m, p) => [0, 1, 2].map(r => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);
function boundsOf(points) {
  const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const p of points) for (let i = 0; i < 3; i++) {
    box.min[i] = Math.min(box.min[i], p[i]); box.max[i] = Math.max(box.max[i], p[i]);
  }
  return box;
}
const actual = new Map();
function glbGeometry(assetId) {
  if (actual.has(assetId)) return actual.get(assetId);
  const file = path.join(OUT, 'props', assetId + '.glb');
  if (!fs.existsSync(file)) { actual.set(assetId, null); return null; }
  const bytes = fs.readFileSync(file);
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw new Error('Bad GLB: ' + file);
  const jsonLen = bytes.readUInt32LE(12), j = JSON.parse(bytes.subarray(20, 20 + jsonLen));
  const binaryStart = 20 + jsonLen + 8;
  const triangles = [], positions = [];
  function accessor(id) {
    const a = j.accessors[id], b = j.bufferViews[a.bufferView];
    if (a.sparse) throw new Error('Sparse accessor is unsupported by this candidate validator.');
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const componentBytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
    const getter = { 5121: 'readUInt8', 5123: 'readUInt16LE', 5125: 'readUInt32LE', 5126: 'readFloatLE' }[a.componentType];
    if (!size || !getter) throw new Error('Unsupported accessor component: ' + a.componentType);
    const stride = b.byteStride || componentBytes * size, start = binaryStart + (b.byteOffset || 0) + (a.byteOffset || 0);
    return Array.from({ length: a.count }, (_, i) => Array.from({ length: size }, (_, c) => bytes[getter](start + i * stride + c * componentBytes)));
  }
  function visit(id, parent) {
    const node = j.nodes[id], matrix = mul(parent, nodeMatrix(node));
    if (node.mesh !== undefined) for (const primitive of j.meshes[node.mesh].primitives) {
      if (primitive.mode !== undefined && primitive.mode !== 4) throw new Error('Nontriangle geometry in ' + assetId);
      const p = accessor(primitive.attributes.POSITION).map(p => point(matrix, p));
      for (const v of p) positions.push(v);
      const indices = primitive.indices === undefined ? p.map((_, i) => i) : accessor(primitive.indices).map(v => v[0]);
      for (let i = 0; i < indices.length; i += 3) triangles.push([p[indices[i]], p[indices[i + 1]], p[indices[i + 2]]]);
    }
    for (const c of node.children || []) visit(c, matrix);
  }
  for (const root of j.scenes[j.scene || 0].nodes) visit(root, identity());
  const result = { triangles, bounds: boundsOf(positions), file: path.relative(ROOT, file), sha256: sha(bytes) };
  actual.set(assetId, result);
  return result;
}

function checkedFloorAsset(assetId) {
  const file = path.join(OUT, 'modules', assetId + '.glb');
  const bytes = fs.readFileSync(file);
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length || bytes.readUInt32LE(16) !== 0x4e4f534a) {
    throw new Error('Invalid source GLB for mandatory floor render profile: ' + file);
  }
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
  return { file: path.relative(ROOT, file), sha256: sha(bytes), json };
}
const soilSource = checkedFloorAsset('mod_root_soil_floor_4m');
if (soilSource.sha256 !== SOIL_SURFACE_SOURCE_SHA256) {
  throw new Error('Soil profile source hash changed; review the source and selector before updating the candidate.');
}
const stoneSource = checkedFloorAsset('mod_sacred_stone_floor_4m');
const soilNodeName = 'sacred_damp_forest_soil_surface';
const soilMaterialName = 'sacred_damp_forest_soil';
const matchedSoilNodes = soilSource.json.nodes.map((node, nodeIndex) => ({ node, nodeIndex }))
  .filter(({ node }) => node.name === soilNodeName);
if (matchedSoilNodes.length !== 1) throw new Error('Expected exactly one named soil surface node.');
const { node: soilNode, nodeIndex: soilNodeIndex } = matchedSoilNodes[0];
if (soilNode.mesh === undefined || soilNode.children?.length) throw new Error('Soil-only node must contain one mesh without children.');
const soilPrimitives = soilSource.json.meshes[soilNode.mesh].primitives;
const matchedSoilPrimitives = soilPrimitives.map((primitive, primitiveIndex) => ({ primitive, primitiveIndex }))
  .filter(({ primitive }) => soilSource.json.materials[primitive.material]?.name === soilMaterialName);
if (soilPrimitives.length !== 1 || matchedSoilPrimitives.length !== 1) {
  throw new Error('The named soil surface must resolve to exactly one primitive with the exact soil material.');
}
const soilPrimitive = matchedSoilPrimitives[0].primitive;
if (soilPrimitive.attributes.NORMAL === undefined || soilPrimitive.attributes.TEXCOORD_0 === undefined || soilPrimitive.attributes.COLOR_0 !== undefined) {
  throw new Error('Selected soil primitive must retain normals/UV and must not use vertex colour.');
}
let selectedSoilWorldBounds = null;
function inspectSoilNode(index, parent) {
  const node = soilSource.json.nodes[index], matrix = mul(parent, nodeMatrix(node));
  if (index === soilNodeIndex) {
    const position = soilSource.json.accessors[soilPrimitive.attributes.POSITION];
    if (!position.min || !position.max) throw new Error('Missing soil position bounds.');
    selectedSoilWorldBounds = boundsOf(corners({ min: position.min, max: position.max }).map(p => point(matrix, p)));
  }
  for (const child of node.children || []) inspectSoilNode(child, matrix);
}
for (const root of soilSource.json.scenes[soilSource.json.scene || 0].nodes) inspectSoilNode(root, identity());
if (!selectedSoilWorldBounds || Math.abs(selectedSoilWorldBounds.max[1]) > 1e-5 ||
    Math.abs(selectedSoilWorldBounds.max[0] - selectedSoilWorldBounds.min[0] - 4) > 1e-5 ||
    Math.abs(selectedSoilWorldBounds.max[2] - selectedSoilWorldBounds.min[2] - 4) > 1e-5) {
  throw new Error('Selected soil surface must retain its original ancestor transform, 4m footprint and level Y=0 top.');
}
const floorRenderProfiles = {
  stone_full_asset: {
    sourceAssetId: 'mod_sacred_stone_floor_4m', sourceFile: stoneSource.file, sourceSha256: stoneSource.sha256,
    selection: { mode: 'all', preserveAncestorTransforms: true },
    onMismatch: 'reject_candidate', uvScale: [1, 1], walkSurfaceY: 0,
  },
  soil_surface_only: {
    sourceAssetId: 'mod_root_soil_floor_4m', sourceFile: soilSource.file, sourceSha256: soilSource.sha256,
    selection: { mode: 'node_and_material_exact', node: soilNodeName, material: soilMaterialName,
      expectedNodeMatches: 1, expectedPrimitiveMatches: 1, includeDescendants: false,
      preserveAncestorTransforms: true },
    onMismatch: 'reject_candidate', uvScale: [1, 1], walkSurfaceY: 0,
    excludedComponents: ['sacred_old_leaf_litter_surface', 'sacred_root_bark_surface',
      'sacred_velvet_moss_surface', 'sacred_weathered_stone_surface'],
    validation: { status: 'verified_actual_glb_json', sourceSha256: soilSource.sha256,
      nodeIndex: soilNodeIndex, meshIndex: soilNode.mesh,
      primitiveIndex: matchedSoilPrimitives[0].primitiveIndex, materialIndex: soilPrimitive.material,
      nodeMatches: matchedSoilNodes.length, primitiveMatches: matchedSoilPrimitives.length,
      originalWorldBounds: selectedSoilWorldBounds,
      indicesAreEvidenceOnly: true,
      note: 'Select by exact names and source hash; retain node/ancestor transforms. Do not render the entire GLB.' },
  },
  full_rootsoil_local: {
    sourceAssetId: 'mod_root_soil_floor_4m', sourceFile: soilSource.file, sourceSha256: soilSource.sha256,
    selection: { mode: 'all', preserveAncestorTransforms: true },
    onMismatch: 'reject_candidate', uvScale: [1, 1], walkSurfaceY: 0,
    requireExplicitTileWhitelist: true, whitelistField: 'fullRootsoilTileWhitelist',
    requiresRouteClearanceRecheck: true,
    note: 'Local root/slab accents only after explicit placement and low-detail clearance review; not a fallback profile.',
  },
};
for (const floor of floors) {
  const profile = floorRenderProfiles[floor.renderProfile];
  if (!profile || floor.assetId !== profile.sourceAssetId || floor.file !== profile.sourceFile) {
    throw new Error('Every floor must resolve its explicit source-compatible render profile: ' + floor.id);
  }
  if (charAt(...floor.tile) === '~') throw new Error('Do not place any soil or stone floor on source water.');
  if (floor.renderProfile === 'full_rootsoil_local' && !fullRootsoilTileWhitelist.some(tile => stable(tile) === stable(floor.tile))) {
    throw new Error('Full rootsoil module not explicitly whitelisted: ' + floor.id);
  }
}

const proposed = [];
const prop = (assetId, name, tile, offset = [0, 0, 0], scale = 1, rotationY = 0, role = 'dressing') => {
  proposed.push({ id: name, assetId, file: CANDIDATE + 'props/' + assetId + '.glb', tile,
    position: [tile[0] * 4 + offset[0], offset[1], tile[1] * 4 + offset[2]],
    rotationY, scale: [scale, scale, scale], zone: zone(...tile).id, role });
};

// The sole gateway sits on an existing straight east-west corridor. Its
// pillars occupy the two wall-side margins; the 2x3m centre stays open.
prop('weathered_torii_gate', 'root_approach_torii', [7, 15], [0, 0, 0], 1, -Math.PI / 2, 'gateway');

// Cedars live inside existing blocked islands. The green crowns may overhang
// the route above 3m, but the actual low-height triangle bounds must stay out.
for (const [name, x, y, scale, yaw] of [
  ['cedar_western_court', 11, 3, .76, .38],
  ['cedar_central_island', 10, 10, .74, 2.15],
  ['cedar_root_approach', 7, 13, .72, 1.1],
  ['cedar_eastern_outer', 25, 7, .98, 2.7],
  ['cedar_rear_skyline', 18, 0, .72, .9],
]) prop('sacred_cedar_tree', name, [x, y], [0, 0, 0], scale, yaw, 'solid_island_landmark');

// The shrine markers occupy corner pockets rather than a cell centre. Their
// final inclusion is conditional on a conservative actual-GLB clearance test.
prop('broken_votive_stele', 'courtyard_votive_stele', [8, 4], [-1.65, 0, -1.65], .72, .17, 'marker');
prop('broken_votive_stele', 'water_edge_votive_stele', [20, 11], [1.65, 0, 1.65], .65, -.23, 'marker');
prop('moss_stone_lantern', 'approach_lantern', [9, 15], [1.65, 0, -1.65], .7, -.3, 'marker');
prop('moss_stone_lantern', 'sanctuary_lantern', [21, 4], [-1.65, 0, 1.65], .68, .4, 'marker');
prop('ofuda_seal_cluster', 'sanctuary_ofuda', [21, 2], [0, .8, 1.90], .67, 0, 'solid_wall_attachment');
prop('sacred_hokora_shrine', 'courtyard_hokora_shrine', [13, 3], [0, 0, 0], 1, 0,
  'solid_island_landmark');

const reserved = new Set();
for (const object of area.objects) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) reserved.add(`${object.tx + dx},${object.ty + dy}`);
for (const foe of area.floor.foes || []) for (const [x, y] of foe.path) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) reserved.add(`${x + dx},${y + dy}`);
for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
  if (!walk(x, y) || reserved.has(`${x},${y}`) || hash(x, y) > .22) continue;
  const corner = Math.floor(hash(x + 31, y + 17) * 4), ox = corner & 1 ? 1.58 : -1.58, oz = corner & 2 ? 1.58 : -1.58;
  const asset = charAt(x, y) === '*' ? 'forest_fern_cluster' : zone(x, y).id === 'sunken_grove' ? 'white_wildflower_patch' : 'forest_shrub_cluster';
  prop(asset, `corner_${asset}_${x}_${y}`, [x, y], [ox, 0, oz], asset === 'forest_shrub_cluster' ? .43 : .49,
    hash(x + 7, y + 13) * Math.PI * 2);
}
// Distant vegetation remains inside the map's blocked cells, not the water.
for (const [i, x, y, scale] of [
  [0, 7, 3, .95], [1, 12, 4, .88], [2, 15, 13, 1.0], [3, 24, 7, .89], [4, 5, 13, .92],
]) prop('forest_shrub_cluster', `solid_cell_shrub_${i}`, [x, y], [0, 0, 0], scale, i * .73, 'solid_island_dressing');

// Fallbacks are only design envelopes, never claimed to be measured geometry.
// They allow a useful preliminary JSON while other individual assets finish.
const fallback = {
  sacred_cedar_tree: { min: [-2.8, 0, -2.8], max: [2.8, 3, 2.8] },
  weathered_torii_gate: { min: [-1.92, 0, -.2], max: [1.92, 3.85, .2] },
  broken_votive_stele: { min: [-.70, 0, -.40], max: [.70, 2.4, .40] },
  moss_stone_lantern: { min: [-.50, 0, -.50], max: [.50, 1.8, .50] },
  ofuda_seal_cluster: { min: [-.65, 0, -.12], max: [.65, 1.0, .12] },
  sacred_hokora_shrine: { min: [-1.15, 0, -.95], max: [1.15, 2.45, .95] },
  forest_shrub_cluster: { min: [-1.0, 0, -1.0], max: [1.0, 1.2, 1.0] },
  forest_fern_cluster: { min: [-.85, 0, -.85], max: [.85, 1.0, .85] },
  white_wildflower_patch: { min: [-.75, 0, -.75], max: [.75, .6, .75] },
};
function placementMatrix(p) {
  const c = Math.cos(p.rotationY), s = Math.sin(p.rotationY), [sx, sy, sz] = p.scale;
  return [c * sx, 0, -s * sx, 0, 0, sy, 0, 0, s * sz, 0, c * sz, 0, ...p.position, 1];
}
function corners(b) {
  const out = [];
  for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) out.push([x, y, z]);
  return out;
}
function intersectsXZ(a, b, margin = .015) {
  return a.max[0] > b.min[0] + margin && a.min[0] < b.max[0] - margin &&
    a.max[2] > b.min[2] + margin && a.min[2] < b.max[2] - margin;
}
const accepted = [], rejected = [], pendingAssets = new Set();
for (const p of proposed) {
  const geometry = glbGeometry(p.assetId), matrix = placementMatrix(p);
  let conflicts = [];
  if (geometry) {
    // Triangle AABB testing is intentionally conservative: a positive result
    // rejects a decorative placement rather than promising exact collision.
    for (const triangle of geometry.triangles) {
      const box = boundsOf(triangle.map(v => point(matrix, v)));
      if (box.max[1] <= .03 || box.min[1] >= 3) continue;
      const hit = walkRectangles.find(r => intersectsXZ(box, r));
      if (hit) { conflicts.push(hit); break; }
    }
    p.clearance = { status: conflicts.length ? 'rejected' : 'passed_conservative_triangle_aabb',
      measuredFrom: geometry.file, sourceSha256: geometry.sha256,
      assetBounds: geometry.bounds, worldBounds: boundsOf(corners(geometry.bounds).map(v => point(matrix, v))),
      method: 'Every imported glTF triangle overlapping 0.03m < Y < 3m tested against all 2m route sweeps; conservative triangle AABB, not physics.' };
  } else {
    pendingAssets.add(p.assetId);
    const bounds = fallback[p.assetId];
    if (!bounds) throw new Error('Missing declared design envelope for ' + p.assetId);
    if (p.role === 'gateway') {
      // Only a provisional design contract. A real gateway must be retested
      // with its mesh, because its full bbox necessarily spans the route.
      p.clearance = { status: 'pending_actual_glb_gateway_test', designOpeningMeters: [2, 3],
        method: 'Source model opening contract; not measured and not collision-verified.' };
    } else {
      const box = boundsOf(corners(bounds).map(v => point(matrix, v)));
      conflicts = walkRectangles.filter(r => intersectsXZ(box, r));
      p.clearance = { status: conflicts.length ? 'rejected' : 'passed_design_envelope_pending_actual_glb',
        assetBounds: bounds, worldBounds: box, method: 'Conservative provisional authoring bounds, not measured GLB.' };
    }
  }
  if (conflicts.length) rejected.push({ ...p, reason: 'Would intrude into unchanged route clearance; omit rather than block movement.',
    firstConflict: conflicts[0] });
  else accepted.push(p);
}

// Fingerprint both semantic save-critical data and the relevant source files.
// Baseline is explicit even when the candidate branch has new documentation
// commits. No files are written until these source bytes are checked again.
const sourceFiles = ['data/field-maps.js', 'field.js', 'field/field-movement-foe.js',
  'field/field-interactions.js', 'field/field-persistence.js', 'field/field-puzzles.js',
  'field/field-3d-view.js'];
const sourceFingerprints = sourceFiles.map(file => {
  const current = fs.readFileSync(path.join(ROOT, file));
  let baselineSha256 = null;
  try { baselineSha256 = sha(cp.execFileSync('git', ['show', `${BASELINE}:${file}`], { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 })); }
  catch (_) { /* Shallow clones may lack the original baseline object. */ }
  const hash = sha(current);
  if (baselineSha256 && hash !== baselineSha256) throw new Error('Runtime differs from requested baseline: ' + file);
  return { file, sha256: hash, expectedBaselineSha256: baselineSha256,
    baselineMatch: baselineSha256 === null ? 'unavailable' : true };
});
const saveCritical = { area: 1, floor: 2, floorKey: area.key, width: w, height: h, map,
  objects: area.objects, foes: area.floor.foes, chests: area.floor.chests, gathers: area.floor.gathers,
  encounter: area.floor.encounter, start: area.start, up: area.up, down: area.down,
  areaStage: area.def.stage, enterScene: area.def.enterScene, bossScene: area.def.bossScene, signScene: area.def.signScene,
  objectDefinitions: area.def.objects };
const layout = {
  schemaVersion: 2,
  presentationRevision: 'soil_surface_v2',
  requiredCapabilities: ['explicit_floor_render_profiles_v1', 'gltf_node_material_selection_v1'],
  consumerContract: { runtimeImplementation: 'not_implemented_by_this_candidate',
    onUnsupportedSchema: 'reject_candidate', onUnsupportedCapability: 'reject_candidate',
    onUnknownRenderProfile: 'reject_candidate', onSelectionMismatch: 'reject_candidate',
    implicitFullAssetFallback: false, defaultFloorRenderProfile: null,
    sourceHashVerification: 'required_before_geometry_selection' },
  scope: 'candidate_not_applied', approvalStatus: 'pending_user_review',
  runtimeModified: false, mapModified: false, saveMigrationRequired: false,
  expectedSourceBaseline: { branch: 'development', commit: BASELINE,
    checkedOutCommit: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    sourceFingerprintSha256: sha(stable(sourceFingerprints.map(({ file, sha256 }) => ({ file, sha256 })))),
    sourceFiles: sourceFingerprints },
  beforeFingerprint: { algorithm: 'SHA-256 over recursively key-sorted JSON',
    mapSha256: sha(stable(map)), saveCriticalDataSha256: sha(stable(saveCritical)), saveCriticalData: clean(saveCritical) },
  target: { area: 1, floor: 2, floorLabel: '3F', floorKey: area.key, widthTiles: w, heightTiles: h },
  conventions: { unit: 'metre', up: '+Y', front: '+Z', tileMeters: 4, walkHeight: 0,
    eyeHeight: 1.6, cameraBackwardOffset: 1.1, passageClearanceMeters: [2, 3],
    boundaryWallThickness: .8, wallHeight: 4 },
  zones: zoneDefinitions, cells, navigation: { source: 'fieldCanEnter / fieldCharSolid from unchanged field.js',
    walkableTileCount: cells.filter(c => !c.navigationSolid).length,
    navigationSolidTiles: cells.filter(c => c.navigationSolid).map(c => c.tile),
    navigationSolidRectangles: solidRectangles,
    preservedWaterTiles: cells.filter(c => c.water).map(c => c.tile),
    reservedObjectAndFoeNeighbourhoods: [...reserved].sort().map(k => k.split(',').map(Number)),
    clearanceSweptRectangles: walkRectangles },
  floorRenderProfiles, fullRootsoilTileWhitelist,
  floorPlacements: floors, ceilingPlacements: ceilings, boundaryWallPlacements: walls,
  fixedObjects,
  preservedFoes: { definitions: clean(area.floor.foes),
    rendererPolicy: 'Use existing FOE sprite/foot ring system; do not replace patrols, sight, IDs, battle or turn logic.' },
  preservedWaterPresentation: { file: null, source: 'field/field-3d-view.js:addWater',
    policy: 'Reuse existing runtime water. No solid floor, shrub, tree or new walkable mesh over water cells.' },
  candidatePropPlacements: accepted,
  omittedUnsafePropPlacements: rejected,
  assetGeometryVerification: { pendingAssets: [...pendingAssets].sort(),
    actualGlbAssets: [...actual].filter(([, g]) => g).map(([assetId, g]) => ({ assetId, file: g.file, sha256: g.sha256 })),
    allProposedPropsMeasured: pendingAssets.size === 0,
    method: 'Actual glTF node transforms + per-triangle AABB versus 2x3m route sweeps. Missing meshes use explicitly provisional envelopes.' },
  integrationHandoff: [
    'This file is a placement candidate, not a runtime feature or a completed game integration.',
    'Compare all beforeFingerprint/sourceFiles hashes before applying; abort if runtime or map changed.',
    'Reuse fixed object identity keys, IDs, source files and existing state synchronization exactly.',
    'Do not apply the independent 24x32m hero scene as a replacement for this 28x18-cell gameplay map.',
    'Re-run with --require-assets after all individual GLBs finish. Review omitted unsafe placements; never bypass clearance.',
    'Schema 2 floor render profiles are mandatory. Reject unsupported selection capabilities; never silently render the full rootsoil GLB.',
    'For soil_surface_only, verify the source hash, select the exact node AND material once, and retain ancestor transforms and original metre-scale UVs.',
    'Full rootsoil modules require an explicit tile whitelist and a fresh low-detail route clearance check; the initial whitelist is empty.',
    'Use soil-only copies per non-water 4m tile. Do not carry the independent scene giant earth backdrop across gameplay water cells.',
    'Ceiling flags are zone-specific. Omit ceilings in gardens; reuse the existing 4m vault in sealed_corridor.',
    'Visual wall damage never grants passage through source navigation-solid cells.',
    'Preserve grass encounter factors, safe tiles, chest rewards, NPCs, stairs, boss and FOE turn behaviour.',
    'Run the existing B1 gameplay regression and inspect both high/low quality before user approval.',
  ],
};
for (const { file, sha256 } of sourceFingerprints) if (sha(fs.readFileSync(path.join(ROOT, file))) !== sha256) throw new Error('Source mutated during generation: ' + file);
if (stable(fixedObjects.map(object => object.identity)) !== stable(area.objects)) throw new Error('Fixed object identities changed.');
if (stable(layout.preservedFoes.definitions) !== stable(area.floor.foes)) throw new Error('FOE definitions changed.');
if (stable(layout.beforeFingerprint.saveCriticalData.map) !== stable(map)) throw new Error('Source map changed.');
if (requireAssets && pendingAssets.size) throw new Error('Missing actual GLBs: ' + [...pendingAssets].join(', '));
fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.writeFileSync(DEST, JSON.stringify(layout, (_key, value) => typeof value === 'number' ? round(value) : value, 2) + '\n');
console.log(JSON.stringify({ output: path.relative(ROOT, DEST), mapSha256: layout.beforeFingerprint.mapSha256,
  walkableTiles: layout.navigation.walkableTileCount, floors: floors.length, ceilings: ceilings.length, walls: walls.length,
  acceptedProps: accepted.length, rejectedProps: rejected.length, pendingAssets: [...pendingAssets],
  floorRenderProfiles: floors.reduce((counts, floor) => ((counts[floor.renderProfile] = (counts[floor.renderProfile] || 0) + 1), counts), {}),
  fixedObjects: fixedObjects.length, scope: layout.scope }, null, 2));
