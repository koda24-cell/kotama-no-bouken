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
const DEST = process.env.F1_LAYOUT_OUTPUT ? path.resolve(ROOT, process.env.F1_LAYOUT_OUTPUT) : path.join(OUT, 'scene/game-layout-candidate.json');
const BASELINE = process.env.F1_LAYOUT_BASELINE || 'ae7995ae9ab7c36a547c6dbd7a5d601d3fc4bea5';
if (!/^[0-9a-f]{40}$/i.test(BASELINE)) throw new Error('F1_LAYOUT_BASELINE must name an explicit full commit SHA.');
const EXISTING = 'assets/3d/dungeons/b1_ancient_forest/';
const CANDIDATE = 'assets/3d/dungeons/b1_sacred_forest_candidates/';
const LEGACY_CEILING_FILE = EXISTING + 'modules/mod_ceiling_vault_4m.glb';
const LEGACY_CEILING_SHA256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, LEGACY_CEILING_FILE))).digest('hex');
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
    reuseExisting: true, file: LEGACY_CEILING_FILE, sourceSha256: LEGACY_CEILING_SHA256,
    sourceDomain: 'legacy_b1_asset_outside_candidate_17_manifest',
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

// The altar must be visible from the actual route. Retain both barriers and
// their footprints, but use the collapsed kit as a low sacred enclosure.
const altarFrontWallIds = new Set(['wall_13_4_up','wall_14_3_left']);
const altarFrontWalls = walls.filter(wall=>altarFrontWallIds.has(wall.id));
if (altarFrontWalls.length !== 2) throw new Error('Review the altar enclosure against the changed source map.');
for (const wall of altarFrontWalls) {
  if (wall.assetId !== 'mod_sacred_collapsed_wall_4m') throw new Error('Altar enclosure requires the reviewed collapsed-wall kit.');
  wall.scale=[1,.32,1];
  wall.artVariant='low_altar_enclosure';
  wall.navigationSolidUnchanged=true;
  wall.collisionSource='unchanged blocked island and wall footprint; low stone enclosure reveals the shrine, no new passage';
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
function glbGeometry(assetId, selection = null) {
  const cacheKey = assetId + (selection ? '::' + selection.node + '::' + selection.material : '');
  if (actual.has(cacheKey)) return actual.get(cacheKey);
  const file = path.join(OUT, assetId.startsWith('mod_') ? 'modules' : 'props', assetId + '.glb');
  if (!fs.existsSync(file)) { actual.set(cacheKey, null); return null; }
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
    if (node.mesh !== undefined && (!selection || node.name === selection.node)) for (const primitive of j.meshes[node.mesh].primitives) {
      if (selection && j.materials[primitive.material]?.name !== selection.material) continue;
      if (primitive.mode !== undefined && primitive.mode !== 4) throw new Error('Nontriangle geometry in ' + assetId);
      const p = accessor(primitive.attributes.POSITION).map(p => point(matrix, p));
      for (const v of p) positions.push(v);
      const indices = primitive.indices === undefined ? p.map((_, i) => i) : accessor(primitive.indices).map(v => v[0]);
      for (let i = 0; i < indices.length; i += 3) triangles.push([p[indices[i]], p[indices[i + 1]], p[indices[i + 2]]]);
    }
    for (const c of node.children || []) visit(c, matrix);
  }
  for (const root of j.scenes[j.scene || 0].nodes) visit(root, identity());
  if (!positions.length) throw new Error('No geometry matched the required source selection: ' + assetId);
  const result = { assetId, selection, triangles, bounds: boundsOf(positions), file: path.relative(ROOT, file), sha256: sha(bytes) };
  actual.set(cacheKey, result);
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
const prop = (assetId, name, tile, offset = [0, 0, 0], scale = 1, rotationY = 0, role = 'dressing', pocketId = null) => {
  proposed.push({ id: name, assetId, file: CANDIDATE + 'props/' + assetId + '.glb', tile,
    position: [tile[0] * 4 + offset[0], offset[1], tile[1] * 4 + offset[2]],
    rotationY, scale: [scale, scale, scale], zone: zone(...tile).id, role,
    ...(pocketId ? { pocketId, respectReservedNeighbourhoods: true } : {}) });
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

// Density revision: authored ecological pockets, not a map-wide scatter pass.
// Keep the original proposals above (including their two unsafe omissions) so
// density work cannot silently rewrite previously reviewed placement records.
const artPockets = [
  { id: 'approach_root_banks', nameJa: '鳥居参道の根際', zone: 'root_approach',
    intent: 'Tall outer cedars frame the torii; ferns and flowers sit along the wall-side margins, with a quiet central axis.' },
  { id: 'votive_cedar_islands', nameJa: '石碑と小祠の杜', zone: 'sacred_courtyard',
    intent: 'Cedar crowns behind blocked islands and a restrained shrine foreground, with no new obstacles on the route.' },
  { id: 'lake_root_pockets', nameJa: '水際の根と岩', zone: 'sunken_grove',
    intent: 'Dry-shore corner plants and blocked-island roots only; do not cover or turn source water into ground.' },
  { id: 'sealed_outer_grove', nameJa: '封印回廊の外縁林', zone: 'sealed_corridor',
    intent: 'A broken outer tree line and attached wall vines support the entrance silhouette without filling the gate.' },
];
const authoredCedars = [
  ['north_west_interior',10,2,.90,.31, .12,-.16,'votive_cedar_islands'],
  ['north_east_interior',12,2,1.02,1.73, .15,-.20,'votive_cedar_islands'],
  ['western_inner_island',10,7,.96,2.61, -.22,.12,'votive_cedar_islands'],
  ['approach_west_island',5,13,.98,.82, -.15,.18,'approach_root_banks'],
  ['approach_east_island',14,14,1.08,2.18, .12,-.10,'approach_root_banks'],
  ['lake_east_upper',24,6,.94,1.13, .15,-.18,'lake_root_pockets'],
  ['lake_east_lower',26,10,1.05,2.84, .25,.10,'lake_root_pockets'],
  ['western_bank_upper',0,6,1.12,.48, -.35,.18,'votive_cedar_islands'],
  ['western_bank_lower',0,12,1.03,1.94, -.25,-.20,'approach_root_banks'],
  ['northern_bank_west',5,0,1.18,2.43, -.15,-.30,'votive_cedar_islands'],
  ['northern_bank_centre',13,0,1.07,.97, .12,-.26,'votive_cedar_islands'],
  ['northern_seal_bank',24,0,1.10,2.03, 1.10,-.30,'sealed_outer_grove'],
  ['eastern_bank_upper',27,5,1.15,.27, .38,-.16,'sealed_outer_grove'],
  ['eastern_bank_lower',27,13,1.09,1.54, .27,.20,'lake_root_pockets'],
  ['southern_bank_east',22,17,1.12,2.72, .16,.36,'approach_root_banks'],
  ['southern_bank_centre',14,17,1.22,.69, -.20,.28,'approach_root_banks'],
  ['southern_bank_west',6,17,1.08,2.35, .15,.32,'approach_root_banks'],
  ['outer_west_north',-2,3,1.24,1.28, -.20,.25,'votive_cedar_islands'],
  ['outer_west_south',-2,14,1.15,.15, .18,-.28,'approach_root_banks'],
  ['outer_east_north',30,3,1.26,2.22, .24,-.12,'sealed_outer_grove'],
  ['outer_east_south',30,14,1.17,1.66, -.18,.26,'lake_root_pockets'],
];
for (const [id,x,y,scale,yaw,ox,oz,pocket] of authoredCedars) {
  if (charAt(x,y) !== '#') throw new Error('Authored cedar anchor must remain in a blocked island or outside the map: '+id);
  prop('sacred_cedar_tree','density_cedar_'+id,[x,y],[ox,0,oz],scale,yaw,'authored_cedar',pocket);
}
// Each tuple is an individual placement decision: asset, anchor tile, local
// offset, scale and yaw. Offsets never alter navigation or source tile letters.
const pocketProps = [
  ['approach_root_banks','forest_fern_cluster',[6,15],[-.7,0,-1.80],.92,.06],
  ['approach_root_banks','white_wildflower_patch',[6,15],[1.65,0,1.70],.90,.28],
  ['approach_root_banks','forest_fern_cluster',[10,15],[.4,0,1.82],.88,3.08],
  ['approach_root_banks','forest_fern_cluster',[14,15],[-.2,0,-1.84],1.02,.04],
  ['approach_root_banks','white_wildflower_patch',[16,15],[1.70,0,1.72],.88,1.14],
  ['approach_root_banks','forest_shrub_cluster',[14,14],[-1.15,0,-.72],.94,.37],
  ['approach_root_banks','forest_fern_cluster',[14,14],[1.32,0,.90],1.04,2.09],
  ['approach_root_banks','mossy_granite_boulder',[6,13],[.0,-.02,-.15],.95,.42],
  ['approach_root_banks','fallen_cedar_log',[12,16],[.1,0,.0],1.0,.16],
  ['approach_root_banks','forest_shrub_cluster',[5,13],[-.95,0,1.05],.98,1.70],
  ['approach_root_banks','forest_fern_cluster',[6,17],[1.15,0,-.85],1.06,2.56],
  ['approach_root_banks','white_wildflower_patch',[13,15],[-1.72,0,-1.72],.92,.50],
  ['votive_cedar_islands','forest_fern_cluster',[8,4],[1.72,0,-1.78],.82,.12],
  ['votive_cedar_islands','white_wildflower_patch',[8,4],[1.73,0,1.75],.92,.32],
  ['votive_cedar_islands','white_wildflower_patch',[13,4],[-1.75,0,-1.72],1.0,2.12],
  ['votive_cedar_islands','forest_fern_cluster',[13,4],[1.76,0,-1.78],.84,3.09],
  ['votive_cedar_islands','forest_shrub_cluster',[12,2],[1.10,0,.90],1.03,.71],
  ['votive_cedar_islands','forest_fern_cluster',[10,2],[-1.10,0,-1.05],.98,1.36],
  ['votive_cedar_islands','mossy_granite_boulder',[9,3],[-.15,-.03,.12],.90,1.65],
  ['votive_cedar_islands','forest_shrub_cluster',[9,3],[1.40,0,-.65],1.10,2.31],
  ['votive_cedar_islands','mossy_granite_boulder',[10,9],[.15,-.02,.12],1.02,.18],
  ['votive_cedar_islands','forest_fern_cluster',[10,7],[-1.24,0,-.85],1.0,2.04],
  ['votive_cedar_islands','forest_shrub_cluster',[10,7],[1.18,0,.85],1.08,.55],
  ['votive_cedar_islands','white_wildflower_patch',[7,8],[-1.73,0,1.76],.91,1.62],
  ['votive_cedar_islands','fallen_cedar_log',[1,4],[0,0,0],.95,1.48],
  ['lake_root_pockets','forest_fern_cluster',[13,11],[-1.74,0,1.78],.86,.04],
  ['lake_root_pockets','white_wildflower_patch',[14,11],[1.76,0,-1.74],.98,2.18],
  ['lake_root_pockets','forest_fern_cluster',[18,11],[-1.78,0,-1.78],.82,3.11],
  ['lake_root_pockets','white_wildflower_patch',[20,11],[1.75,0,-1.76],1.05,1.66],
  ['lake_root_pockets','forest_fern_cluster',[19,7],[-1.78,0,-1.77],.84,.02],
  ['lake_root_pockets','white_wildflower_patch',[20,8],[1.73,0,-1.73],.93,.88],
  ['lake_root_pockets','mossy_granite_boulder',[24,7],[0,-.04,.05],1.12,.77],
  ['lake_root_pockets','forest_shrub_cluster',[24,7],[-1.10,0,1.05],1.10,2.62],
  ['lake_root_pockets','forest_fern_cluster',[24,6],[1.15,0,-1.10],1.03,.23],
  ['lake_root_pockets','mossy_granite_boulder',[26,10],[-.85,-.03,-.80],.92,2.39],
  ['lake_root_pockets','forest_shrub_cluster',[26,10],[1.05,0,1.12],1.08,1.43],
  ['lake_root_pockets','fallen_cedar_log',[25,7],[.25,0,-.15],.96,1.20],
  ['lake_root_pockets','forest_fern_cluster',[27,13],[-1.12,0,-.92],1.10,2.85],
  ['sealed_outer_grove','forest_shrub_cluster',[26,1],[.55,0,-.55],1.04,.65],
  ['sealed_outer_grove','forest_fern_cluster',[27,5],[-1.12,0,.85],1.12,2.09],
  ['sealed_outer_grove','mossy_granite_boulder',[27,2],[-.15,-.03,.25],1.20,1.28],
  ['sealed_outer_grove','white_wildflower_patch',[24,0],[-1.25,0,.90],.94,2.33],
];
for (const [index,[pocket,asset,tile,offset,scale,yaw]] of pocketProps.entries()) {
  prop(asset,'pocket_'+pocket+'_'+String(index).padStart(2,'0'),tile,offset,scale,yaw,'authored_pocket',pocket);
}
// Vines attach to real boundary planes. Their top-origin and rotation follow
// the actual wall front; any frond reaching the clear sweep will be omitted.
for (const [index,tile,side,pocket,scale] of [
  [0,[9,4],'up','votive_cedar_islands',1.0],
  [1,[10,4],'up','votive_cedar_islands',.92],
  [2,[11,11],'up','lake_root_pockets',.95],
  [3,[14,15],'down','approach_root_banks',1.05],
  [4,[17,15],'down','approach_root_banks',.90],
  [5,[20,2],'up','sealed_outer_grove',.98],
]) {
  const direction=directions.find(d=>d.id===side);
  if(!visualWall(tile[0]+direction.dx,tile[1]+direction.dz))throw new Error('A vine attachment requires an actual boundary wall.');
  prop('hanging_forest_vines','pocket_wall_vines_'+index,tile,
    [direction.dx*1.94,3.88,direction.dz*1.94],scale,direction.yaw,'wall_attached_vines',pocket);
}

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
  mossy_granite_boulder: { min: [-1.35, -.03, -.90], max: [1.14, 1.50, .90] },
  fallen_cedar_log: { min: [-2.16, 0, -.50], max: [2.16, 1.15, .47] },
  hanging_forest_vines: { min: [-.69, -2.49, -.07], max: [.65, .01, .18] },
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
const reservedRectangles = [...reserved].map(key=>{
  const [x,y]=key.split(',').map(Number);
  return { tile:[x,y], min:[x*4-2,0,y*4-2], max:[x*4+2,3,y*4+2],
    protected:'fixed-object and FOE neighbourhood' };
});
function clearanceConflicts(p,geometry){
  const matrix=placementMatrix(p);
  for(const triangle of geometry.triangles){
    const box=boundsOf(triangle.map(v=>point(matrix,v)));
    if(box.max[1]<=.03||box.min[1]>=3)continue;
    const route=walkRectangles.find(rect=>intersectsXZ(box,rect));
    if(route)return [{...route,kind:'route_clearance'}];
    if(p.respectReservedNeighbourhoods){
      const neighbourhood=reservedRectangles.find(rect=>intersectsXZ(box,rect));
      if(neighbourhood)return [{...neighbourhood,kind:'reserved_neighbourhood'}];
    }
  }
  if(p.pocketId&&charAt(...p.tile)==='~')return [{kind:'source_water_cell',tile:p.tile}];
  return [];
}
for (const p of proposed) {
  const geometry = glbGeometry(p.assetId), matrix = placementMatrix(p);
  let conflicts = [];
  if (geometry) {
    // Triangle AABB testing is intentionally conservative: a positive result
    // rejects a decorative placement rather than promising exact collision.
    conflicts=clearanceConflicts(p,geometry);
    p.sourceSha256=geometry.sha256;
    p.clearance = { status: conflicts.length ? 'rejected' : 'passed_conservative_triangle_aabb',
      measuredFrom: geometry.file, sourceSha256: geometry.sha256,
      assetBounds: geometry.bounds, worldBounds: boundsOf(corners(geometry.bounds).map(v => point(matrix, v))),
      reservedNeighbourhoodsChecked:!!p.respectReservedNeighbourhoods,
      method: 'Every imported glTF triangle overlapping 0.03m < Y < 3m tested against all 2m route sweeps; new authored pockets also protect fixed-object/FOE neighbourhoods. Conservative triangle AABB, not physics.' };
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
  if (conflicts.length) rejected.push({ ...p, reason: 'Would intrude into unchanged route, reserved neighbourhood or source water; omit without shrinking.',
    firstConflict: conflicts[0] });
  else accepted.push(p);
}

// Soil-only support is local to the actual blocked islands / authored outer
// pockets. It never fills water or changes the 274 original walk-floor rows.
const groundTiles=new Set();
for(const placement of accepted.filter(p=>p.pocketId||p.assetId==='sacred_cedar_tree')){
  const radius=placement.assetId==='sacred_cedar_tree'?1:0;
  for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
    const x=placement.tile[0]+dx,y=placement.tile[1]+dz;
    if(charAt(x,y)!=='#'||reserved.has(`${x},${y}`))continue;
    groundTiles.add(`${x},${y}`);
  }
}
const dressingGroundPlacements=[],omittedGroundPlacements=[];
const soilGeometry=glbGeometry('mod_root_soil_floor_4m',floorRenderProfiles.soil_surface_only.selection);
for(const key of [...groundTiles].sort((a,b)=>{
  const [ax,ay]=a.split(',').map(Number),[bx,by]=b.split(',').map(Number);return ay-by||ax-bx;
})){
  const tile=key.split(',').map(Number),[x,y]=tile;
  const row={id:`island_soil_${x}_${y}`,assetId:'mod_root_soil_floor_4m',
    file:soilGeometry.file,sourceSha256:soilGeometry.sha256,renderProfile:'soil_surface_only',
    tile,position:[x*4,0,y*4],rotationY:0,scale:[1,1,1],zone:zone(x,y).id,
    role:'non_navigation_dressing_ground',gameTraversable:false,navigationSolidUnchanged:true,
    mapBoundsExpanded:false,sourceCharUnchanged:charAt(x,y)};
  const conflicts=clearanceConflicts(row,soilGeometry);
  row.clearance={status:conflicts.length?'rejected':'passed_conservative_triangle_aabb',
    sourceSha256:soilGeometry.sha256,selection:'soil_surface_only',
    method:'Every actual selected soil triangle tested against all unchanged 2m x 3m movement sweeps; ground top remains Y=0.'};
  if(conflicts.length)omittedGroundPlacements.push({...row,firstConflict:conflicts[0]});
  else dressingGroundPlacements.push(row);
}

const costCache=new Map();
function renderCost(file,renderProfile=null){
  const key=file+'::'+(renderProfile||'all');if(costCache.has(key))return costCache.get(key);
  const bytes=fs.readFileSync(path.join(ROOT,file)),j=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
  const selection=renderProfile?floorRenderProfiles[renderProfile].selection:null;
  let triangles=0,drawCalls=0;
  function visit(index){const node=j.nodes[index];
    if(node.mesh!==undefined&&(!selection||selection.mode==='all'||node.name===selection.node))for(const primitive of j.meshes[node.mesh].primitives){
      if(selection?.mode==='node_and_material_exact'&&j.materials[primitive.material]?.name!==selection.material)continue;
      const accessor=j.accessors[primitive.indices??primitive.attributes.POSITION];triangles+=accessor.count/3;drawCalls++;
    }
    for(const child of node.children||[])visit(child);
  }
  for(const node of j.scenes[j.scene||0].nodes)visit(node);
  const cost={file,sourceSha256:sha(bytes),sourceBytes:bytes.length,triangles,estimatedDrawCalls:drawCalls};costCache.set(key,cost);return cost;
}
const zoneCosts=Object.fromEntries(zoneDefinitions.map(z=>[z.id,{zone:z.id,nameJa:z.nameJa,instances:0,cedars:0,triangles:0,estimatedDrawCalls:0}]));
for(const row of [...floors,...walls,...accepted,...dressingGroundPlacements,...ceilings]){
  const cost=renderCost(row.file,row.renderProfile),z=zoneCosts[row.zone];
  z.instances++;z.cedars+=row.assetId==='sacred_cedar_tree'?1:0;z.triangles+=cost.triangles;z.estimatedDrawCalls+=cost.estimatedDrawCalls;
}
const totals=Object.values(zoneCosts).reduce((a,z)=>({instances:a.instances+z.instances,cedars:a.cedars+z.cedars,
  triangles:a.triangles+z.triangles,estimatedDrawCalls:a.estimatedDrawCalls+z.estimatedDrawCalls}),
  {instances:0,cedars:0,triangles:0,estimatedDrawCalls:0});
const uniqueCostSources=[...new Map([...costCache.values()].map(c=>[c.file,{file:c.file,sourceSha256:c.sourceSha256,sourceBytes:c.sourceBytes}])).values()];
const performanceEstimate={method:'Whole-map instance triangle / material-primitive count from actual GLBs, including disabled ceilings; no batching/culling assumption.',
  isFpsApproval:false,scope:'candidate full map, separate from hero scene',totals,byZone:Object.values(zoneCosts),
  uniqueSources:uniqueCostSources,uniqueSourceBytes:uniqueCostSources.reduce((n,s)=>n+s.sourceBytes,0),
  reviewBudget:{targetCedars:[20,30],wholeMapTriangleReviewThreshold:5000000,
    wholeMapDrawReviewThreshold:2200,behaviour:'review required above threshold; never claim real-device performance'},
  thresholdExceeded:totals.triangles>5000000||totals.estimatedDrawCalls>2200,
  limitations:['Worst-case full-map display estimate, not a measured FPS or GPU time.',
    'Material primitives are counted per visible instance; renderer culling, transparency and draw grouping can change actual costs.',
    'Trees are individually authored GLB instances; no LOD or game integration is introduced.']};

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
  presentationRevision: 'soil_surface_v2_authored_forest_pockets',
  requiredCapabilities: ['explicit_floor_render_profiles_v1', 'gltf_node_material_selection_v1',
    'non_navigation_dressing_ground_v1', 'source_sha256_pins_v1'],
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
  dressingGroundPlacements, omittedUnsafeDressingGroundPlacements:omittedGroundPlacements,
  dressingGroundPolicy:{gameTraversable:false,navigationSolidUnchanged:true,mapBoundsExpanded:false,
    selectionProfile:'soil_surface_only',capability:'non_navigation_dressing_ground_v1',
    placementDomain:'Only blocked # cells and authored outer pockets. Existing walking floors and water are excluded.',
    note:'This is scenery supporting roots, not expanded map/save/exploration area.'},
  fixedObjects,
  preservedFoes: { definitions: clean(area.floor.foes),
    rendererPolicy: 'Use existing FOE sprite/foot ring system; do not replace patrols, sight, IDs, battle or turn logic.' },
  preservedWaterPresentation: { file: null, source: 'field/field-3d-view.js:addWater',
    policy: 'Reuse existing runtime water. No solid floor, shrub, tree or new walkable mesh over water cells.' },
  candidatePropPlacements: accepted,
  omittedUnsafePropPlacements: rejected,
  authoredArtPockets:artPockets,
  authoredForestDensity:{originalCedarCount:5,additionalCedarProposals:authoredCedars.length,
    acceptedCedarCount:accepted.filter(p=>p.assetId==='sacred_cedar_tree').length,
    targetCedarCount:[20,30],uniformMapScatterAdded:false,assetsGenerated:false,
    scalePolicy:'New cedars retain authored natural scales. Conflicting instances are omitted, never shrunk to fit.'},
  performanceEstimate,
  assetGeometryVerification: { pendingAssets: [...pendingAssets].sort(),
    actualGlbAssets: [...actual.values()].filter(Boolean).map(g=>({assetId:g.assetId,file:g.file,sha256:g.sha256,
      ...(g.selection?{selection:g.selection}: {})})),
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
    'non_navigation_dressing_ground_v1 is mandatory: render the selected soil-only island/pocket support, but never expand map/save/visibility or movement into it.',
    'All new cedar/pocket/dressing-ground placements use actual triangle-AABB clearance checks. Authored pockets additionally protect original fixed-object/FOE neighbourhoods.',
    'Whole-map triangle/draw estimates are review data, not FPS approval. Keep the candidate separate from the frozen hero-scene renders.',
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
for(const id of ['solid_cell_shrub_0','solid_cell_shrub_1'])if(!rejected.some(p=>p.id===id))throw new Error('Previously unsafe placement must remain omitted: '+id);
if (requireAssets && pendingAssets.size) throw new Error('Missing actual GLBs: ' + [...pendingAssets].join(', '));
fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.writeFileSync(DEST, JSON.stringify(layout, (_key, value) => typeof value === 'number' ? round(value) : value, 2) + '\n');
console.log(JSON.stringify({ output: path.relative(ROOT, DEST), mapSha256: layout.beforeFingerprint.mapSha256,
  walkableTiles: layout.navigation.walkableTileCount, floors: floors.length, ceilings: ceilings.length, walls: walls.length,
  acceptedProps: accepted.length, rejectedProps: rejected.length, pendingAssets: [...pendingAssets],
  floorRenderProfiles: floors.reduce((counts, floor) => ((counts[floor.renderProfile] = (counts[floor.renderProfile] || 0) + 1), counts), {}),
  cedars:layout.authoredForestDensity.acceptedCedarCount,dressingGround:dressingGroundPlacements.length,
  estimatedFullMapTriangles:totals.triangles,estimatedFullMapDrawCalls:totals.estimatedDrawCalls,
  fixedObjects: fixedObjects.length, scope: layout.scope }, null, 2));
