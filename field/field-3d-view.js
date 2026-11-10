/* ============================================================
   field/field-3d-view.js — 迷宮の一人称3D表示（第1階層のみ）
   ------------------------------------------------------------
   担当：Claude。ES module（three.js r180 を index.html の importmap 経由で CDN から読む）。
   方針：
     ・ゲームのルール（マップ・通行判定・FOE・イベント・宝箱・採集・仕掛け・セーブ）は既存の field 系が正。
       この表示は fieldState／fieldArea() を読むだけで、状態を書き換えない（向きの変更と移動は既存の fieldTryStep を通す）。
     ・three.js の読み込みや WebGL に失敗したら、何もせず従来の2D表示のまま動く。
     ・3D表示のオン／オフは localStorage（kotama.field3d）に保存。セーブデータには入れない。
   既存コードとの接点（field 側の短いフック）：
     ・field/field-render.js  fieldBuildDom() の最後 → KotamaField3D.build()／fieldRender() の最後 → KotamaField3D.frame()
     ・field/field-movement-foe.js  fieldUpdate() の入力 → 3D表示中は KotamaField3D.input()（前後＝進む、左右＝向きを変える）
   素材：assets/3d/dungeons/b1_ancient_forest/（tools/b1-3d で生成した GLB）
   第2階層（凍てつく水源）：試験表示のみ。field/field-3d-b2-water.js を組み立て時に dynamic import する。
     有効にする方法：URL に ?f3d=b2、または localStorage kotama.field3d.preview に "2"（管理パネルの「3D表示の試験」）。
     通常の進行では第2階層は従来の2D表示のまま。第2階層の素材を読めなくても第1階層の3D表示は止めない。
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const BASE = './assets/3d/dungeons/b1_ancient_forest/';
const AREAS_3D = new Set([1, 2, 3, 4, 5]); // 第1〜第5階層の探索は3Dを標準表示
const PREVIEW_KEY = 'kotama.field3d.preview';   // 試験表示する階層（例 "2"）。セーブデータには入れない
// 第1階層の空気（ensureRenderer で使っている値と同じ。第2階層から戻ったときに戻す）
const ENV_B1 = { background: 0x070d11, fog: { color: 0x0c1a20, density: 0.042 }, hemi: { sky: 0x7aa8c4, ground: 0x1c241c, high: 1.25, low: 1.7 } };
const CELL = 4, EYE = 1.6, BACK = 1.1;    // 1マス4m、目の高さ、マスの後ろ寄りに立つ距離
const STEP_MS = 230, TURN_MS = 210;       // 3D表示中の1歩・1回の旋回にかける時間
const PREF_KEY = 'kotama.field3d', QUALITY_KEY = 'kotama.field3d.quality';
const DIR_ORDER = ['up', 'right', 'down', 'left'];             // 時計回り
const DIR_VEC = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const DIR_YAW = { up: 0, right: -Math.PI / 2, down: Math.PI, left: Math.PI / 2 };
// 物が「開いている側（通路）」を向くための回転（+Z が正面の素材を、その方向の隣へ向ける）
const FACE_YAW = { up: Math.PI, right: Math.PI / 2, down: 0, left: -Math.PI / 2 };
const M = (id) => `modules/${id}.glb`, Pr = (id) => `props/${id}.glb`;
const FILES = {
  floor: M('mod_floor_stone_4m'), floorBroken: M('mod_floor_stone_broken_4m'), floorSoil: M('mod_floor_root_soil_4m'),
  wall: M('mod_wall_4m'), wallMossy: M('mod_wall_mossy_roots_4m'), wallCollapsed: M('mod_wall_collapsed_4m'),
  ceil: M('mod_ceiling_vault_4m'), ceilRoots: M('mod_ceiling_roots_4m'), stairsDown: M('mod_stairs_down'),
  herb: M('gather_herb_point'), mining: M('gather_mining_point'), logging: M('gather_logging_point'), lever: M('gimmick_root_lever'), runeDoor: M('gimmick_sealed_rune_door'),
  crystalVein: M('crystal_wall_vein'),
  chest: Pr('sealed_treasure_chest'), chestOpen: Pr('sealed_treasure_chest_open'), sign: Pr('ancient_stone_signpost'),
  npcWood: Pr('npc_woodcutter'), npcHerb: Pr('npc_herb_girl'), npcTraveler: Pr('npc_traveler'),
  stump: Pr('hollow_tree_stump'), roots: Pr('spreading_root_cluster'), gate: Pr('ancient_iron_gate'), torch: Pr('blue_wisp_torch'), seal: Pr('ancient_rune_floor_seal'),
  stairsUp: Pr('broken_stone_stairs'), rootArch: Pr('living_root_arch'), fern: Pr('fern_cluster'), mushrooms: Pr('glow_mushroom_cluster'), vines: Pr('hanging_glow_vines'),
  boulders: Pr('moss_boulder_cluster'), mossPatch: Pr('glow_moss_floor_patch'),
};

const g = {
  pref: readPref(), failed: false, webgl: true,
  renderer: null, composer: null, scene: null, camera: null, world: null, dyn: null, canvas: null, badge: null,
  builtKey: '', buildingKey: '', buildToken: 0, sig: '',
  cache: new Map(), lights: [], pool: [], entries: [], foes: new Map(), texCache: new Map(),
  cam: { pos: new THREE.Vector3(), yaw: 0, ready: false, bump: 0, bumpDir: [0, 0] },
  lastT: 0, lastRender: 0, lastLightKey: '', size: [0, 0], high: readQuality(), near: null, maxFps: readMaxFps(),
  hemi: null, envArea: 1, theme: null, themePromise: null, themeFailed: false, preview: readPreview(),
};

function readPref() { try { return localStorage.getItem(PREF_KEY) !== 'off'; } catch (_) { return true; } }
function readQuality() { try { const q = localStorage.getItem(QUALITY_KEY); if (q) return q !== 'low'; } catch (_) {} return !matchMedia('(pointer:coarse)').matches; }
// 描画の上限（1秒あたりの回数）。既定は上限なし。検証・省電力用に localStorage kotama.field3d.maxFps で指定できる
function readMaxFps() { try { return Math.max(0, Number(localStorage.getItem('kotama.field3d.maxFps')) || 0); } catch (_) { return 0; } }
// 試験表示の階層：URL の ?f3d=b2（その場だけ）か localStorage（管理パネルで切り替え）
function readPreview() {
  const set = new Set();
  try { const q = new URLSearchParams(location.search).get('f3d'); if (q) for (const v of q.split(',')) { const n = Number(String(v).replace(/^b/, '')); if (n) set.add(n); } } catch (_) {}
  try { for (const v of String(localStorage.getItem(PREVIEW_KEY) || '').split(',')) { const n = Number(v); if (n) set.add(n); } } catch (_) {}
  return set;
}
// 3D表示できる階層：第1階層と、試験表示を有効にした第2階層
const areaOn = (n) => AREAS_3D.has(n) && (n !== 2 || !g.themeFailed);
function writePref(on) { try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch (_) {} }
const hash = (x, z, s = 0) => { let h = (x * 374761393 + z * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const fieldOk = () => typeof fieldState !== 'undefined' && typeof fieldArea === 'function';
// 第1階層は3D専用。設定保存値にかかわらず3Dを優先し、WebGL等の利用不能時だけ既存2Dへフォールバックする。
const eligible = () => fieldOk() && (g.pref || AREAS_3D.has(Number(fieldState.area))) && !g.failed && g.webgl && areaOn(Number(fieldState.area));
const curKey = () => (fieldOk() ? fieldArea()?.key : '') || '';

/* ------------------------------------------------------------
   描画の土台
   ------------------------------------------------------------ */
function ensureRenderer() {
  if (g.renderer) return true;
  try {
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.3; r.outputColorSpace = THREE.SRGBColorSpace;
    r.setPixelRatio(g.high ? Math.min(2, devicePixelRatio || 1) : Math.min(1.25, devicePixelRatio || 1));
    g.renderer = r; g.canvas = r.domElement; g.canvas.className = 'field-3d-canvas'; g.canvas.setAttribute('aria-hidden', 'true');
    g.scene = new THREE.Scene();
    g.scene.background = new THREE.Color(0x070d11); g.scene.fog = new THREE.FogExp2(0x0c1a20, 0.042);
    g.hemi = new THREE.HemisphereLight(0x7aa8c4, 0x1c241c, g.high ? 1.25 : 1.7); g.scene.add(g.hemi);   // 暗所でも形が読める明るさ（点光源の少ない低画質では強め）
    g.camera = new THREE.PerspectiveCamera(68, 1, 0.05, 48);
    g.world = new THREE.Group(); g.dyn = new THREE.Group(); g.scene.add(g.world, g.dyn);
    setPool(g.high ? 14 : 6);   // 点光源は多いほど重い（1画素ごとに全部を計算する）ため、近いものだけ
    if (g.high) {
      g.composer = new EffectComposer(r); g.composer.addPass(new RenderPass(g.scene, g.camera));
      g.composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.5, 0.84)); g.composer.addPass(new OutputPass());
    }
    // 話しかけられる物の目印（ゆっくり回るひし形）
    const nm = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), new THREE.MeshBasicMaterial({ color: 0xbff4ff }));
    nm.visible = false; g.near = nm; g.dyn.add(nm);
    return true;
  } catch (e) { console.warn('[field-3d] WebGL を使えないため2D表示を続けます:', e); g.webgl = false; return false; }
}
function mount() {
  const vp = document.getElementById('field-viewport'); if (!vp || !g.canvas) return;
  if (g.canvas.parentNode !== vp) vp.prepend(g.canvas);
  if (!g.badge) { g.badge = document.createElement('div'); g.badge.className = 'field-3d-badge'; g.badge.hidden = true; vp.appendChild(g.badge); }
  const w = vp.clientWidth, h = vp.clientHeight;
  if (w && h && (w !== g.size[0] || h !== g.size[1])) {
    g.size = [w, h]; g.renderer.setSize(w, h, false); g.canvas.style.width = w + 'px'; g.canvas.style.height = h + 'px';
    g.camera.aspect = w / h; g.camera.updateProjectionMatrix();
    if (g.composer) { g.composer.setSize(w, h); g.composer.setPixelRatio(g.renderer.getPixelRatio()); }
  }
}
function setPool(n) {
  for (const l of g.pool) g.scene.remove(l);
  g.pool = Array.from({ length: n }, () => { const l = new THREE.PointLight(0x7fe6ff, 0, 8, 2); g.scene.add(l); return l; });
}
function updatePool(center, force) {
  const key = `${Math.round(center.x / 2)},${Math.round(center.z / 2)}`;
  if (!force && key === g.lastLightKey) return; g.lastLightKey = key;
  const list = g.lights.filter((L) => !L.off).map((L) => ({ L, d: L.world.distanceToSquared(center) })).sort((a, b) => a.d - b.d);
  g.pool.forEach((p, i) => { const e = list[i]; if (!e) { p.intensity = 0; return; } p.position.copy(e.L.world); p.color.setHex(e.L.color); p.intensity = e.L.intensity * 2.4; p.distance = e.L.range * 2.0; });
}

/* ------------------------------------------------------------
   素材の読み込みと配置
   ------------------------------------------------------------ */
const loader = new GLTFLoader();
function load(file) {
  if (!g.cache.has(file)) g.cache.set(file, loader.loadAsync(BASE + file).then((x) => x.scene));
  return g.cache.get(file);
}
// 階層ごとの空気（背景・霧・環境光）。第1階層は ENV_B1（元の値のまま）
function applyEnv(area, env) {
  const E = env || ENV_B1;
  g.scene.background.setHex(E.background); g.scene.fog.color.setHex(E.fog.color); g.scene.fog.density = E.fog.density;
  if (g.hemi) { g.hemi.color.setHex(E.hemi.sky); g.hemi.groundColor.setHex(E.hemi.ground); g.hemi.intensity = g.high ? E.hemi.high : E.hemi.low; }
  g.camera.far = area === 5 ? 180 : 48;
  g.camera.updateProjectionMatrix();
  g.envArea = area;
}
// 第2階層のテーマ（別ファイル）を読み込む。失敗したら第2階層だけ2D表示に戻す
function loadTheme2() {
  // 以前の階層から戻った場合にも、破棄済みのテーマを再利用しない。
  if (g.theme?.area === 2) return Promise.resolve(g.theme);
  return import('./field-3d-b2-water.js?v=20261109-b2').then((m) => m.createTheme({ CELL, DIR_VEC, DIR_ORDER, FACE_YAW, hash, g, place, load, dimObj, removeObj, npcFile, FILES }));
}
async function loadTheme45(area) {
  if (area !== 4 && g.theme?.area === area) return g.theme;
  const m = await import('./field-3d-b4-b5-map.js?v=20261110-b4-b5-integrated');
  return m.createTheme({ CELL, DIR_VEC, DIR_ORDER, FACE_YAW, hash, g, place, load, npcFile, FILES }, area);
}
function place(parent, src, x, y, z, ry = 0, s = 1) {
  const o = src.clone(true); o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(s);
  parent.add(o); o.updateMatrixWorld(true);
  const ls = [];
  o.traverse((m) => {
    m.matrixAutoUpdate = false;
    const b1 = m.userData && m.userData.b1;
    if (b1 && b1.lights) for (const L of b1.lights) { const e = { ...L, world: new THREE.Vector3(...L.pos).applyMatrix4(m.matrixWorld), off: false }; g.lights.push(e); ls.push(e); }
  });
  o.userData.lights = ls;
  return o;
}
function removeObj(o) { if (!o) return; o.parent?.remove(o); for (const L of o.userData.lights || []) L.off = true; }
// 使い終わった採集点などを暗くする（素材は複製して、この1体だけ変える）
function dimObj(o, on) {
  o.traverse((m) => {
    if (!m.isMesh) return;
    if (!m.userData.baseMat) m.userData.baseMat = m.material;
    if (on) { const c = m.userData.baseMat.clone(); c.emissiveIntensity = (c.emissiveIntensity || 0) * 0.08; c.color = c.color.clone().multiplyScalar(0.7); m.material = c; }
    else m.material = m.userData.baseMat;
  });
  for (const L of o.userData.lights || []) L.off = on;
}

// マスの種類（3D の組み立て用）
function cellInfo(a) {
  const W = a.w, H = a.h;
  const ch = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '#' : fieldTileAt(a, x, y);
  const def = (c) => fieldLetterDef(a, c);
  // 壁として作るマス：# と、壁に付いた物のマス、閉じている隠し通路
  const wallCell = (x, y) => {
    const c = ch(x, y); if (c === '#') return true;
    const o = def(c); if (!o) return false;
    if (o.onWall) return true;
    if (o.kind === 'door' && o.hidden) return !fieldDoorOpen(o);
    return false;
  };
  const open = (x, y) => !wallCell(x, y) && ch(x, y) !== '~';
  // 物が向く方向：最初に見つかった「通れる隣」
  const facing = (x, y) => { for (const d of ['down', 'up', 'right', 'left']) { const [dx, dy] = DIR_VEC[d]; if (open(x + dx, y + dy) && !fieldCharSolid(a, ch(x + dx, y + dy))) return d; } for (const d of DIR_ORDER) { const [dx, dy] = DIR_VEC[d]; if (open(x + dx, y + dy)) return d; } return 'down'; };
  return { ch, def, wallCell, open, facing };
}
// 隠し通路の開閉が変わったら作り直す
function doorSig(a) { return a.objects.filter((o) => o.kind === 'door' && o.hidden).map((o) => (fieldDoorOpen(o) ? 1 : 0)).join(''); }

async function buildFloor() {
  const a = fieldArea(); if (!a) return;
  const key = a.key, token = ++g.buildToken;
  g.buildingKey = key;
  showBadge('3D表示を準備中…');
  const area = Number(fieldState.area);
  let th = null;
  if (area === 2 || area === 3 || area === 4 || area === 5) {
    try { th = area === 2 ? await loadTheme2() : await loadTheme45(area); }
    catch (e) { console.warn('[field-3d] 3Dテーマの読み込みに失敗しました:', area, e); if (area === 2) g.themeFailed = true; else g.failed = true; g.buildingKey = ''; showBadge(''); applyMode(); return; }
  }
  try {
    const list = Object.values(FILES); let done = 0;
    await Promise.all(list.map((f) => load(f).then(() => { done++; showBadge(`3D表示を準備中… ${done}/${list.length}`); })));
    for (const o of a.objects) if (o.kind === 'npc') await load(npcFile(o));
  } catch (e) {
    console.warn('[field-3d] 素材を読めなかったため2D表示に戻します:', e); g.failed = true; showBadge(''); applyMode(); return;
  }
  if (token !== g.buildToken || curKey() !== key) {
    if (th && th !== g.theme) th.dispose({ final: true });
    if (token === g.buildToken) g.buildingKey = '';
    return;
  }   // 待っている間にフロアが変わった
  const S = {}; for (const [k, f] of Object.entries(FILES)) S[k] = await load(f);
  // 片付け
  for (const c of [...g.world.children]) g.world.remove(c);
  for (const c of [...g.dyn.children]) if (c !== g.near) g.dyn.remove(c);
  g.lights = []; g.entries = [];
  // FOE textures belong to texCache; only each floor's sprite/ring is owned here.
  for (const v of g.foes.values()) v.grp.traverse(o => {
    if (!o.isSprite) o.geometry?.dispose();
    if (o.material) o.material.dispose();
  });
  g.foes.clear();
  if (g.theme && g.theme !== th) g.theme.dispose({ final: true });
  g.theme = th;
  applyEnv(area, th && th.env);
  const info = cellInfo(a), { ch, def, wallCell, open, facing } = info;
  const X = (tx) => tx * CELL, Z = (ty) => ty * CELL;
  const objAt = new Map(a.objects.map((o) => [`${o.tx},${o.ty}`, o]));
  if (th) {
    try {
      await th.build(a, S, info);
      if (curKey() !== key) { th.dispose(); g.buildingKey = ''; return; }
    }
    catch (e) {
      console.error('[field-3d] 3Dマップの組み立てに失敗:', area, e);
      g.failed = true; g.buildingKey = ''; showBadge(''); applyMode(); return;
    }
  }
  else {                                // 第1階層：ここから下は従来の組み立て（変更なし）
  // 床・天井・壁
  for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
    if (wallCell(tx, ty)) continue;
    const c = ch(tx, ty), r = hash(tx, ty), rot = Math.floor(hash(tx, ty, 1) * 4) * Math.PI / 2, x = X(tx), z = Z(ty);
    if (c === '~') addWater(x, z);
    else if (c === '>') { /* 階段のマスは階段の素材が床を兼ねる */ }
    else if (c === '*') { place(g.world, S.floorSoil, x, 0, z, rot); place(g.world, S.fern, x + (r - 0.5) * 1.8, 0, z + (hash(tx, ty, 2) - 0.5) * 1.8, r * 6, 0.85); }
    else if (c === '.') place(g.world, r < 0.14 ? S.floorBroken : r < 0.26 ? S.floorSoil : S.floor, x, 0, z, rot);
    else place(g.world, S.floor, x, 0, z, rot);
    place(g.world, hash(tx, ty, 3) < 0.3 ? S.ceilRoots : S.ceil, x, 4, z, rot);
    for (const d of DIR_ORDER) {
      const [dx, dy] = DIR_VEC[d]; if (!wallCell(tx + dx, ty + dy)) continue;
      const ex = x + dx * CELL / 2, ez = z + dy * CELL / 2, k = hash(tx * 4 + DIR_ORDER.indexOf(d), ty, 5), ry = FACE_YAW[d] + Math.PI;
      place(g.world, k < 0.08 ? S.wallCollapsed : k < 0.36 ? S.wallMossy : S.wall, ex, 0, ez, ry);
      const n = def(ch(tx + dx, ty + dy));
      if (n && n.onWall && n.kind === 'switch') {
        const o = a.objects.find((q) => q.tx === tx + dx && q.ty === ty + dy);
        const lever = place(g.world, S.lever, ex - dx * 0.45, 0, ez - dy * 0.45, ry);
        if (o) g.entries.push({ o, kind: 'switch', obj: lever, state: null, at: new THREE.Vector3(ex - dx * 0.5, 1.4, ez - dy * 0.5) });
      } else if (!objAt.has(`${tx},${ty}`) && c !== '>' && c !== '<') {
        if (k > 0.965) place(g.world, S.crystalVein, ex, 0, ez, ry);
        else if (k > 0.92) place(g.world, S.vines, x + dx * 1.5, 4, z + dy * 1.5, ry, 0.5);
      }
    }
    // 空いている床に少しだけ飾り（視界をふさがない壁際）
    if (c === '.' && !objAt.has(`${tx},${ty}`)) {
      const k = hash(tx, ty, 9);
      if (k > 0.95) place(g.world, S.mushrooms, x + (hash(tx, ty, 7) > 0.5 ? 1.4 : -1.4), 0, z + (hash(tx, ty, 8) - 0.5) * 2, k * 6, 0.6);
      else if (k > 0.91) place(g.world, S.mossPatch, x, 0.01, z, k * 6, 0.8);
    }
  }
  // 物（宝箱・採集・灯・NPC・イベント・仕掛け・階段など）
  for (const o of a.objects) {
    const x = X(o.tx), z = Z(o.ty), f = facing(o.tx, o.ty), ry = FACE_YAW[f];
    const e = { o, kind: o.kind, obj: null, state: null, at: new THREE.Vector3(x, 1.2, z) };
    switch (o.kind) {
      case 'stairs':
        if (o.dir === 'down') e.obj = place(g.world, S.stairsDown, x, 0, z, ry);
        else { place(g.world, S.floor, x, 0, z); e.obj = place(g.world, S.stairsUp, x, 0, z - 0, ry + Math.PI, 0.75); }
        break;
      case 'save': place(g.world, S.seal, x, 0.005, z, 0, 0.8); e.obj = place(g.world, S.torch, x, 0, z); e.at.y = 1.9; break;
      case 'chest': case 'cache': e.ry = ry; break;   // 開閉に応じて sync で置く
      case 'gather': e.ry = ry; break;
      case 'sign': e.obj = place(g.world, S.sign, x, 0, z, ry); e.at.y = 1.8; break;
      case 'gate': e.obj = place(g.world, S.runeDoor, x - DIR_VEC[f][0] * 1.9, 0, z - DIR_VEC[f][1] * 1.9, ry); break;
      case 'exit': e.obj = place(g.world, S.rootArch, x, 0, z, (f === 'up' || f === 'down') ? 0 : Math.PI / 2, 0.92); break;
      case 'npc': e.obj = place(g.world, await load(npcFile(o)), x, 0, z, ry); e.at.y = 2.2; break;
      case 'event': e.ry = ry; break;
      case 'door': if (!o.hidden) { const pass = open(o.tx, o.ty - 1) || open(o.tx, o.ty + 1); e.ry = pass ? 0 : Math.PI / 2; } break;
      default: break;
    }
    if (o.kind !== 'switch') g.entries.push(e);
  }
  }   // 第1階層の組み立てここまで
  g.sig = doorSig(a);
  g.builtKey = key; g.buildingKey = ''; g.cam.ready = false; g.lastLightKey = '';
  for (const e of g.entries) syncEntry(e, S);
  showBadge('');
  applyMode();
}
function npcFile(o) { return o.id === 'woodcutter' ? FILES.npcWood : o.id === 'herb-girl' ? FILES.npcHerb : FILES.npcTraveler; }
let waterGeo = null, waterMat = null;
function addWater(x, z) {
  waterGeo = waterGeo || new THREE.PlaneGeometry(CELL, CELL).rotateX(-Math.PI / 2);
  waterMat = waterMat || new THREE.MeshStandardMaterial({ color: 0x0b2a36, roughness: 0.08, metalness: 0.2, emissive: 0x0a4a66, emissiveIntensity: 0.35 });
  const m = new THREE.Mesh(waterGeo, waterMat); m.position.set(x, -0.15, z); g.world.add(m);
}

// 物の状態（開けた・採り尽くした・解いた・開いた）を見た目に反映する
async function syncEntry(e, S) {
  const o = e.o, x = o.tx * CELL, z = o.ty * CELL;
  let st = '';
  if (o.kind === 'chest') st = fieldState.flags[o.key] ? 'open' : 'closed';
  else if (o.kind === 'cache') st = fieldState.flags[`puzzle:${o.puzzle}:reward`] ? 'open' : 'closed';
  else if (o.kind === 'gather') { const d = gatherDef(o); st = `${d.kind}:${(fieldState.gatherUsed[o.key] || 0) >= d.uses ? 'empty' : 'ok'}`; }
  else if (o.kind === 'switch') st = typeof fieldPuzzleSolved === 'function' && fieldPuzzleSolved(o.puzzle) ? 'solved' : 'idle';
  else if (o.kind === 'door' && !o.hidden) st = fieldDoorOpen(o) ? 'open' : 'closed';
  else if (o.kind === 'event') st = (typeof fieldSideDone === 'function' && fieldSideDone(o.event)) ? 'done' : 'todo';
  else return;
  if (st === e.state) return;
  const first = e.state === null; e.state = st;
  S = S || {};
  if (g.theme && Number(fieldState.area) === g.theme.area && await g.theme.sync(e, st)) { if (!first) g.lastLightKey = ''; return; }
  const get = async (k) => S[k] || load(FILES[k]);
  if (o.kind === 'chest' || o.kind === 'cache') { removeObj(e.obj); e.obj = place(g.world, await get(st === 'open' ? 'chestOpen' : 'chest'), x, 0, z, e.ry); }
  else if (o.kind === 'gather') {
    if (!e.obj) { const kind = gatherDef(o).kind, k = kind === 'chop' ? 'logging' : kind === 'mine' ? 'mining' : 'herb'; e.obj = place(g.world, await get(k), x, 0, z, e.ry, 0.8); }
    dimObj(e.obj, st.endsWith('empty'));
  }
  else if (o.kind === 'switch') { for (const L of e.obj?.userData.lights || []) L.off = st === 'solved'; }
  else if (o.kind === 'door') {
    if (!e.obj) e.obj = place(g.world, await get('gate'), x, 0, z, e.ry, 1.15);
    const y = st === 'open' ? 3.3 : 0;
    e.obj.position.y = y; e.obj.updateMatrix(); e.obj.updateMatrixWorld(true);   // matrixAutoUpdate=false なので行列を作り直す
  }
  else if (o.kind === 'event') {
    if (!e.obj) {
      if (o.hidden) e.obj = place(g.world, await get('roots'), x, 0, z, e.ry, 0.45);
      else e.obj = place(g.world, await get(o.sprite === 'ev-stump' ? 'stump' : 'mushrooms'), x, 0, z, e.ry, o.sprite === 'ev-stump' ? 0.6 : 0.8);
    }
    if (!o.hidden) dimObj(e.obj, st === 'done');
  }
  if (!first) g.lastLightKey = '';
}
function gatherDef(o) { try { return fieldGatherPointDef(fieldArea(), o); } catch (_) { return { kind: 'take', uses: FIELD_GATHER_USES }; } }

/* ------------------------------------------------------------
   FOE（モンスターの画像を立て札のように表示＋足元の光）
   ------------------------------------------------------------ */
function foeTexture(src) {
  if (!g.texCache.has(src)) { const t = new THREE.TextureLoader().load(src); t.colorSpace = THREE.SRGBColorSpace; g.texCache.set(src, t); }
  return g.texCache.get(src);
}
function disposeB4FoeVisual(v) {
  // The sprite texture and THREE's shared Sprite geometry belong to the cache.
  // Only this FOE's ring geometry and per-instance materials belong to this floor.
  v.ring.geometry.dispose(); v.ring.material.dispose(); v.sp.material.dispose();
}
function syncFoes(t) {
  const seen = new Set();
  for (const f of fieldState.foes || []) {
    seen.add(f.key);
    let v = g.foes.get(f.key);
    if (!v) {
      const grp = new THREE.Group();
      const tex = foeTexture(f.enemy?.image || 'assets/monsters/ookami.png');
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, alphaTest: 0.25, fog: true }));
      sp.center.set(0.5, 0); sp.scale.set(2.6, 2.6, 1); sp.position.y = 0.15; grp.add(sp);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.3, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.55, depthWrite: false }));
      ring.position.y = 0.03; grp.add(ring);
      const light = new THREE.PointLight(0xff7a2a, 3, 7, 2); light.position.y = 1.4; grp.add(light);
      g.dyn.add(grp); v = { grp, sp, ring, light, aspectSet: false, pos: null }; g.foes.set(f.key, v);
    }
    if (!v.aspectSet && v.sp.material.map.image) { const im = v.sp.material.map.image; const k = (im.width || 1) / (im.height || 1); v.sp.scale.set(2.6 * k, 2.6, 1); v.aspectSet = true; }
    const inB5Vision = Number(fieldState.area) !== 5 || fieldState.visible?.has(`${Math.floor(f.x / FIELD_TILE)},${Math.floor(f.y / FIELD_TILE)}`);
    v.grp.visible = !f.defeated && !!inB5Vision;
    const p = f.view || f, target = new THREE.Vector3(p.x / FIELD_TILE * CELL - CELL / 2, 0, (p.y - 4) / FIELD_TILE * CELL - CELL / 2);
    if (!v.pos) v.pos = target.clone(); else v.pos.lerp(target, 0.25);
    v.grp.position.copy(v.pos);
    const chase = f.mode === 'chase', pulse = 0.5 + 0.5 * Math.sin(t / (chase ? 140 : 380));
    const col = chase ? 0xff2a2a : 0xff8a30;
    v.ring.material.color.setHex(col); v.light.color.setHex(col);
    v.light.intensity = (chase ? 5 : 3) * (0.7 + 0.3 * pulse); v.ring.scale.setScalar(0.92 + 0.12 * pulse);
    v.sp.material.color.setHex(chase ? 0xffc0c0 : 0xffffff);
  }
  for (const [k, v] of g.foes) if (!seen.has(k)) { if (g.envArea === 4) disposeB4FoeVisual(v); g.dyn.remove(v.grp); g.foes.delete(k); }
}

/* ------------------------------------------------------------
   カメラ（論理位置 fieldState.x/y と向き fieldState.dir を、なめらかに追う）
   ------------------------------------------------------------ */
function camTarget() {
  const tx = Math.floor(fieldState.x / FIELD_TILE), ty = Math.floor(fieldState.y / FIELD_TILE), [dx, dy] = DIR_VEC[fieldState.dir] || DIR_VEC.down;
  return { pos: new THREE.Vector3(tx * CELL - dx * BACK, EYE, ty * CELL - dy * BACK), yaw: DIR_YAW[fieldState.dir] ?? Math.PI };
}
function updateCamera(dt) {
  const t = camTarget(), c = g.cam;
  if (!c.ready) { c.pos.copy(t.pos); c.yaw = t.yaw; c.ready = true; }
  const kp = 1 - Math.exp(-dt * 13), ky = 1 - Math.exp(-dt * 15);
  c.pos.lerp(t.pos, kp);
  let dyaw = t.yaw - c.yaw; while (dyaw > Math.PI) dyaw -= Math.PI * 2; while (dyaw < -Math.PI) dyaw += Math.PI * 2;
  c.yaw += dyaw * ky;
  const moving = c.pos.distanceTo(t.pos) > 0.05;
  const bob = moving ? Math.sin(performance.now() / 85) * 0.035 : 0;
  let bx = 0, bz = 0;
  if (c.bump > 0) { c.bump = Math.max(0, c.bump - dt); const s = Math.sin((1 - c.bump / 0.18) * Math.PI) * 0.14; bx = c.bumpDir[0] * s; bz = c.bumpDir[1] * s; }
  g.camera.position.set(c.pos.x + bx, c.pos.y + bob, c.pos.z + bz);
  g.camera.rotation.set(-0.035, c.yaw, 0, 'YXZ');
}

/* ------------------------------------------------------------
   入力（3D表示中だけ）：前後＝進む・下がる、左右＝向きを変える、Q/E＝横に動く
   ------------------------------------------------------------ */
function heldAction() {
  const k = fieldInput.keys, p = fieldInput.pad;
  if (k.has('ArrowUp') || k.has('w') || p.has('up')) return 'fwd';
  if (k.has('ArrowDown') || k.has('s') || p.has('down')) return 'back';
  if (k.has('ArrowLeft') || k.has('a') || p.has('left')) return 'turnL';
  if (k.has('ArrowRight') || k.has('d') || p.has('right')) return 'turnR';
  if (k.has('q')) return 'strafeL';
  if (k.has('e')) return 'strafeR';
  return null;
}
const TAP_ACTION = { up: 'fwd', down: 'back', left: 'turnL', right: 'turnR' };
function input(a, now) {
  const tap = fieldInput.tap; fieldInput.tap = null;
  const act = (tap && TAP_ACTION[tap]) || heldAction();
  if (!act) return;
  const dir = fieldState.dir, i = DIR_ORDER.indexOf(dir);
  if (act === 'turnL' || act === 'turnR') {
    fieldState.dir = DIR_ORDER[(i + (act === 'turnL' ? 3 : 1)) % 4];
    fieldState.stepUntil = now + TURN_MS;
    if (typeof fieldMiniDirty !== 'undefined') fieldMiniDirty = true;
    return;
  }
  const rel = { fwd: 0, strafeR: 1, back: 2, strafeL: 3 }[act];
  const moveDir = DIR_ORDER[(i + rel) % 4];
  const before = `${fieldState.x},${fieldState.y}`;
  const moved = fieldTryStep(a, moveDir, now);
  // 下がる・横に動くときは向きを変えない（fieldTryStep は進む方向を向くため、元に戻す）
  if (rel !== 0 && fieldState.dir === moveDir) fieldState.dir = dir;
  if (moved) { fieldState.stepUntil = Math.max(fieldState.stepUntil, now + STEP_MS); }
  else if (before === `${fieldState.x},${fieldState.y}`) {
    fieldState.stepUntil = now + 180;
    g.cam.bump = 0.18; g.cam.bumpDir = DIR_VEC[moveDir];
  }
}

/* ------------------------------------------------------------
   表示の切り替え・毎フレーム
   ------------------------------------------------------------ */
function active() { return eligible() && g.builtKey === curKey() && !!g.renderer; }
function applyMode() {
  const scr = document.getElementById('field'); if (!scr) return;
  const on = active();
  scr.classList.toggle('is-3d', on);
  if (g.canvas) g.canvas.hidden = !on;
  // ヒントとパッドの表示
  const hint = document.getElementById('field-hint');
  if (hint) {
    if (!hint.dataset.hint2d) hint.dataset.hint2d = hint.textContent;
    hint.textContent = on ? '前進/後退：↑↓・W/S　向き：←→・A/D　横移動：Q/E　調べる：Z/Enter・A' : hint.dataset.hint2d;
  }
  document.querySelectorAll('#field-pad [data-dir="left"], #field-pad [data-dir="right"]').forEach((b) => {
    if (!b.dataset.label2d) b.dataset.label2d = b.textContent;
    b.textContent = on ? (b.dataset.dir === 'left' ? '↶' : '↷') : b.dataset.label2d;
    b.setAttribute('aria-label', on ? (b.dataset.dir === 'left' ? '左を向く' : '右を向く') : (b.dataset.dir === 'left' ? '左' : '右'));
  });
  ensureToggle();
}
function ensureToggle() {
  let btn = document.getElementById('field-3d-toggle');
  if (!btn) {
    const mapBtn = document.getElementById('field-map-button') || document.getElementById('field-home-button'); if (!mapBtn) return;
    btn = document.createElement('button'); btn.id = 'field-3d-toggle'; btn.type = 'button'; btn.className = 'field-map-button field-3d-toggle';
    btn.addEventListener('click', () => { toggle(); btn.blur(); });
    mapBtn.before(btn);
  }
  const area = fieldOk() ? Number(fieldState.area) : 0;
  const can = fieldOk() && areaOn(area) && g.webgl && !g.failed;
  // 第1〜第5階層では3D表示を固定し、2D/3D切り替えボタンを出さない。
  // ほかの階層で3Dを解放した場合は、従来どおり切り替えられる。
  btn.hidden = !can || AREAS_3D.has(area);
  btn.textContent = g.pref ? '2D表示' : '3D表示';
  btn.title = g.pref ? '見下ろしの2D表示に切り替える' : '一人称の3D表示に切り替える';
}
function toggle(force) {
  if (fieldOk() && AREAS_3D.has(Number(fieldState.area))) { g.pref = true; build(); return; }
  g.pref = typeof force === 'boolean' ? force : !g.pref; writePref(g.pref);
  if (typeof fieldInput !== 'undefined') { fieldInput.keys.clear(); fieldInput.pad.clear(); fieldInput.tap = null; }
  if (g.pref) build(); else applyMode();
}
function showBadge(text) { if (!g.badge) return; g.badge.textContent = text; g.badge.hidden = !text; }

function build() {
  if (!fieldOk()) return;
  if (!eligible()) { applyMode(); return; }
  if (!ensureRenderer()) { applyMode(); return; }
  mount();
  const key = curKey();
  if (g.builtKey === key && doorSig(fieldArea()) === g.sig) { g.cam.ready = false; applyMode(); return; }
  // Serialize async builds: a floor change is picked up by frame() afterwards.
  if (g.buildingKey) return;
  g.builtKey = '';
  applyMode();
  buildFloor();
}

function frame() {
  if (!fieldOk()) return;
  if (!active()) { if (g.canvas && !g.canvas.hidden) applyMode(); if (eligible() && !g.buildingKey && g.builtKey !== curKey()) build(); return; }
  const now = performance.now();
  if (g.maxFps && now - g.lastRender < 1000 / g.maxFps) return;
  g.lastRender = now;
  const dt = g.lastT ? Math.min(g.maxFps ? 1 : 0.05, (now - g.lastT) / 1000) : 0.016; g.lastT = now;
  mount();
  const a = fieldArea();
  if (doorSig(a) !== g.sig && !g.buildingKey) { g.builtKey = ''; buildFloor(); return; }
  for (const e of g.entries) syncEntry(e);
  syncFoes(now);
  updateCamera(dt);
  updatePool(g.camera.position);
  if (g.theme && g.envArea === g.theme.area) g.theme.tick(dt, now, g.camera.position);
  // 正面の調べられる物に目印
  const nk = fieldState.lock ? '' : fieldState.nearKey;
  const ne = nk && g.entries.find((e) => e.o.key === nk);
  if (ne) { g.near.visible = true; g.near.position.set(ne.at.x, ne.at.y + 0.9 + Math.sin(now / 300) * 0.08, ne.at.z); g.near.rotation.y = now / 600; }
  else g.near.visible = false;
  if (g.composer) g.composer.render(); else g.renderer.render(g.scene, g.camera);
}

// 試験表示の切り替え（管理パネルから）。localStorage だけを書き、セーブデータには触れない
function setPreview(n, on) {
  g.preview = readPreview();
  const list = new Set([...String((() => { try { return localStorage.getItem(PREVIEW_KEY) || ''; } catch (_) { return ''; } })()).split(',').map(Number).filter(Boolean)]);
  if (on) list.add(n); else list.delete(n);
  try { if (list.size) localStorage.setItem(PREVIEW_KEY, [...list].join(',')); else localStorage.removeItem(PREVIEW_KEY); } catch (_) {}
  g.preview = readPreview(); if (on) g.themeFailed = false;
  if (fieldOk()) { g.builtKey = ''; build(); applyMode(); }
}
window.KotamaField3D = { active, input, build, frame, toggle, isEnabled: () => g.pref, setPreview, previewOn: (n) => g.preview.has(n), themeInfo: () => g.theme?.info(), renderInfo: () => ({ calls: g.renderer?.info.render.calls, triangles: g.renderer?.info.render.triangles, memory: { ...g.renderer?.info.memory } }) };
// 読み込みが探索画面の開始より遅れた場合に備えて、いまの状態で一度組み立てる
if (fieldOk() && typeof state !== 'undefined' && state.screen === 'field') build();
else applyModeSafe();
function applyModeSafe() { try { if (document.getElementById('field')) applyMode(); } catch (_) {} }
