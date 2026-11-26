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
import {resolveFirstLayerCameraV6} from './f1-camera-clearance-v6.js';
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
// Phone-only view budget. Desktop retains its per-theme far plane.
const PHONE_VIEW = /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(navigator.userAgent) || (navigator.maxTouchPoints>0 && matchMedia('(pointer:coarse)').matches && Math.min(screen.width,screen.height)<=600);
const PHONE_FAR = 24, PHONE_LIGHT_RANGE = 16;
const PHONE_FPS = 30, PHONE_MAX_PIXELS = 900000;
// Adjust resolution only after sustained slow frames, never on every camera turn.
const perfBudget={scale:1,frames:0,sum:0,good:0,last:0};
function observeFrame(now){
  const dt=perfBudget.last?now-perfBudget.last:0;perfBudget.last=now;
  if(dt<=0||dt>250)return;
  perfBudget.sum+=dt;perfBudget.frames++;
  if(perfBudget.frames<30)return;
  const average=perfBudget.sum/perfBudget.frames, target=1000/(g.maxFps||60);
  perfBudget.frames=0;perfBudget.sum=0;
  const old=perfBudget.scale;
  if(average>target*1.3){perfBudget.scale=Math.max(.65,old-.1);perfBudget.good=0;}
  else if(average<target*1.12){if(++perfBudget.good>=4){perfBudget.scale=Math.min(1,old+.05);perfBudget.good=0;}}
  else perfBudget.good=0;
  if(old!==perfBudget.scale)g.size=[0,0];
}
function phonePixelRatio(w,h){return Math.min(1,devicePixelRatio||1,Math.sqrt(PHONE_MAX_PIXELS/Math.max(1,w*h)));}
function viewFar(distance){return PHONE_VIEW?Math.min(distance,PHONE_FAR):distance;}
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
  builtKey: '', buildingKey: '', buildToken: 0, sig: '', retryRequested:false,
  cache: new Map(), lights: [], pool: [], entries: [], foes: new Map(), texCache: new Map(),
  cam: { pos: new THREE.Vector3(), yaw: 0, ready: false, bump: 0, bumpDir: [0, 0] },
  lastT: 0, lastRender: 0, lastLightKey: '', size: [0, 0], high: !PHONE_VIEW && readQuality(), near: null, maxFps: PHONE_VIEW ? Math.min(PHONE_FPS,readMaxFps() || PHONE_FPS) : readMaxFps(),
  hemi: null, envArea: 1, theme: null, themePromise: null, themeFailed: false, floorFailures: new Map(), preview: readPreview(),
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
const areaOn = (n) => AREAS_3D.has(n) && !g.floorFailures.has(curKey());
function writePref(on) { try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch (_) {} }
const hash = (x, z, s = 0) => { let h = (x * 374761393 + z * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const fieldOk = () => typeof fieldState !== 'undefined' && typeof fieldArea === 'function';
// 第1階層は3D専用。設定保存値にかかわらず3Dを優先し、WebGL等の利用不能時だけ既存2Dへフォールバックする。
const eligible = () => fieldOk() && (g.pref || AREAS_3D.has(Number(fieldState.area))) && !g.failed && g.webgl && areaOn(Number(fieldState.area));
const curKey = () => (fieldOk() ? (fieldArea()?.buildKey || fieldArea()?.key) : '') || '';   // [RANDOM-MAZE] ランダム階は迷宮ごとのキー（同じフロアでも形が変われば作り直す）

/* ------------------------------------------------------------
   描画の土台
   ------------------------------------------------------------ */
function ensureRenderer() {
  if (g.renderer) return true;
  try {
    const r = new THREE.WebGLRenderer({ antialias: !PHONE_VIEW, powerPreference: PHONE_VIEW ? 'low-power' : 'high-performance' });
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.3; r.outputColorSpace = THREE.SRGBColorSpace;
    r.setPixelRatio(PHONE_VIEW ? 1 : g.high ? Math.min(2, devicePixelRatio || 1) : Math.min(1.25, devicePixelRatio || 1));
    r.info.autoReset = false;
    g.renderer = r; g.canvas = r.domElement; g.canvas.className = 'field-3d-canvas'; g.canvas.setAttribute('aria-hidden', 'true');
    g.canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault(); g.webgl=false; g.lastT=0;
      applyMode();
      if(document.body.dataset.screen==='field')window.Kotama3DLoading?.fail('GPUの描画が停止しました。復旧後に再試行できます。');
    });
    g.canvas.addEventListener('webglcontextrestored',()=>{
      g.webgl=true; g.lastT=0; g.lastRender=0; g.size=[0,0];
      if(document.body.dataset.screen==='field'&&!g.buildingKey){applyMode();build();}
    });
    g.scene = new THREE.Scene();
    g.scene.background = new THREE.Color(0x070d11); g.scene.fog = new THREE.FogExp2(0x0c1a20, 0.042);
    g.hemi = new THREE.HemisphereLight(0x7aa8c4, 0x1c241c, g.high ? 1.25 : 1.7); g.scene.add(g.hemi);   // 暗所でも形が読める明るさ（点光源の少ない低画質では強め）
    g.camera = new THREE.PerspectiveCamera(68, 1, 0.05, viewFar(48));
    g.world = new THREE.Group(); g.dyn = new THREE.Group(); g.scene.add(g.world, g.dyn);
    setPool(PHONE_VIEW ? 4 : g.high ? 14 : 6);   // 点光源は多いほど重い（1画素ごとに全部を計算する）ため、近いものだけ
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
    g.size = [w, h]; const baseRatio=PHONE_VIEW?phonePixelRatio(w,h):g.high?Math.min(2,devicePixelRatio||1):Math.min(1.25,devicePixelRatio||1); g.renderer.setPixelRatio(baseRatio*perfBudget.scale); g.renderer.setSize(w, h, false); g.canvas.style.width = w + 'px'; g.canvas.style.height = h + 'px';
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
  const list = g.lights.filter((L) => !L.off).map((L) => ({ L, d: L.world.distanceToSquared(center) })).filter(e=>!PHONE_VIEW||e.d<=PHONE_LIGHT_RANGE**2).sort((a, b) => a.d - b.d);
  g.pool.forEach((p, i) => { const e = list[i]; if (!e) { p.intensity = 0; return; } p.position.copy(e.L.world); p.color.setHex(e.L.color); p.intensity = e.L.intensity * 2.4; p.distance = e.L.range * 2.0; });
}

/* ------------------------------------------------------------
   素材の読み込みと配置
   ------------------------------------------------------------ */
const loader = new GLTFLoader();
async function retryLoad(job){let last;for(let i=0;i<3;i++){try{return await job(i);}catch(e){last=e;if(i<2)await new Promise(resolve=>setTimeout(resolve,350*(i+1)));}}throw last;}
async function boundedAsset(file){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);try{const url=new URL(BASE+file,document.baseURI);const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status+' '+file);const data=await response.arrayBuffer();return await loader.parseAsync(data,new URL('.',url).href);}finally{clearTimeout(timer);}}
// Downscale ordinary shared GLB image textures before GPU upload on phones. Keep original files intact.
function limitPhoneTextures(scene){
  if(!PHONE_VIEW)return scene;
  const seen=new Set();
  scene.traverse(obj=>{for(const mat of [].concat(obj.material||[]))for(const tex of Object.values(mat)){
    if(!tex?.isTexture||seen.has(tex)||tex.isCompressedTexture||tex.isDataTexture||tex.isCubeTexture||tex.isVideoTexture)continue;
    seen.add(tex);const img=tex.image,w=img?.naturalWidth||img?.width,h=img?.naturalHeight||img?.height;
    if(!w||!h||Math.max(w,h)<=1024)continue;
    try{const canvas=document.createElement('canvas'),scale=1024/Math.max(w,h);canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));const ctx=canvas.getContext('2d');if(!ctx)continue;ctx.drawImage(img,0,0,canvas.width,canvas.height);tex.image=canvas;tex.needsUpdate=true;}catch(error){console.warn('[field-3d] texture resize skipped',error);}
  }});return scene;
}
function load(file) {
  if (!g.cache.has(file)) g.cache.set(file, retryLoad(()=>boundedAsset(file)).then(x=>limitPhoneTextures(x.scene)).catch(e=>{g.cache.delete(file);throw e;}));
  return g.cache.get(file);
}
// 階層ごとの空気（背景・霧・環境光）。第1階層は ENV_B1（元の値のまま）
function applyEnv(area, env) {
  const review=area===1&&(window.KotamaSacredPlaytest===true||new URLSearchParams(location.search).get('f1sacred')==='1');
  const E = review?{...(env||ENV_B1),hemi:{sky:0xbac6b4,ground:0x626f58,high:1.9,low:2.2}}:(env||ENV_B1);
  if(review&&!g.reviewFill){g.reviewFill=new THREE.AmbientLight(0xbac6ac,.32);g.scene.add(g.reviewFill);}
  if(g.reviewFill)g.reviewFill.intensity=review?.32:0;
  g.renderer.toneMappingExposure=review?1.48:1.3;
  g.scene.background.setHex(E.background); g.scene.fog.color.setHex(E.fog.color); g.scene.fog.density = PHONE_VIEW ? Math.max(E.fog.density,0.085) : E.fog.density;
  if (g.hemi) { g.hemi.color.setHex(E.hemi.sky); g.hemi.groundColor.setHex(E.hemi.ground); g.hemi.intensity = g.high ? E.hemi.high : E.hemi.low; }
  g.camera.far = viewFar(area === 5 ? 180 : 48);
  g.camera.updateProjectionMatrix();
  g.envArea = area;
}
// 第2階層のテーマ（別ファイル）を読み込む。失敗したら第2階層だけ2D表示に戻す
function loadTheme2() {
  // 以前の階層から戻った場合にも、破棄済みのテーマを再利用しない。
  if (g.theme?.area === 2) return Promise.resolve(g.theme);
  return import('./field-3d-b2-water.js?v=20261126-asset-organized').then((m) => m.createTheme({ CELL, DIR_VEC, DIR_ORDER, FACE_YAW, hash, g, place, load, dimObj, removeObj, npcFile, FILES }));
}
function loadTheme3() {
  if (g.theme?.area === 3) return Promise.resolve(g.theme);
  return import('./field-3d-b3-city.js?v=20261110-quality-1').then(m => m.createTheme({ CELL, DIR_VEC, DIR_ORDER, FACE_YAW, hash, g, place, load, npcFile }));
}
async function loadTheme45(area) {
  if (area !== 4 && g.theme?.area === area) return g.theme;
  const m = await import('./field-3d-b4-b5-map.js?v=20261122-n2');
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

// Keep the full terrain kit; only request props that this floor can use.
function firstFloorSharedKeys(a){
  const keys=new Set(['floor','floorBroken','floorSoil','wall','wallMossy','wallCollapsed','ceil','ceilRoots','fern','crystalVein','vines','mushrooms','mossPatch']);
  for(const o of a.objects){
    switch(o.kind){
      case 'stairs':keys.add(o.dir==='down'?'stairsDown':'stairsUp');break;
      case 'save':keys.add('seal');keys.add('torch');break;
      case 'chest':case 'cache':keys.add('chest');keys.add('chestOpen');break;
      case 'gather':{const kind=gatherDef(o).kind;keys.add(kind==='chop'?'logging':kind==='mine'?'mining':'herb');break;}
      case 'sign':keys.add('sign');break;
      case 'gate':keys.add('runeDoor');break;
      case 'switch':keys.add('lever');break;
      case 'exit':keys.add('rootArch');break;
      case 'npc':keys.add(o.id==='woodcutter'?'npcWood':o.id==='herb-girl'?'npcHerb':'npcTraveler');break;
      case 'door':if(!o.hidden)keys.add('gate');break;
      case 'event':keys.add(o.hidden?'roots':o.sprite==='ev-stump'?'stump':'mushrooms');break;
    }
  }
  return [...keys];
}
// Rolling workers avoid waiting for the slowest item in every batch. On phones,
// keep the previous single-load budget to avoid another memory-related reload.
async function loadSharedAssets(files,limit,onDone){
  let next=0,error=null;
  async function worker(){
    while(!error&&next<files.length){
      const file=files[next++];
      try{await load(file);onDone();}catch(e){error=e;}
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,files.length)},worker));
  if(error)throw error;
}
async function buildFloor() {
  const a = fieldArea(); if (!a) return;
  const key = a.buildKey || a.key, token = ++g.buildToken;   // [RANDOM-MAZE]
  g.buildingKey = key;
  const report=(n,label)=>{if(token===g.buildToken&&curKey()===key)window.Kotama3DLoading?.progress(n,label);};
  report(5,'3Dテーマ準備');
  showBadge('3D表示を準備中…');
  const area = Number(fieldState.area);
  // Release the previous stratum before loading another one, avoiding peak overlap.
  if(g.envArea!==area){await releaseFloorResources();if(token!==g.buildToken||curKey()!==key)return;}
  let th = null;
  if (area === 2 || area === 3 || area === 4 || area === 5) {
    try { th = await retryLoad(()=>area === 2 ? loadTheme2() : area === 3 ? loadTheme3() : loadTheme45(area)); }
    catch (e) { throw e; }
  }
  try {
    // Later strata own their terrain kit; only load shared props actually used by their builders.
    const sharedKeys=area===1?firstFloorSharedKeys(a):area===2?[]:area===3?['stairsDown','stairsUp','seal','torch','sign','lever','runeDoor']:['sign','stairsDown','stairsUp','seal','torch','runeDoor','rootArch','npcTraveler'];
    const list=sharedKeys.map(k=>FILES[k]); let done=0;
    g.requiredSharedKeys=sharedKeys;
    report(20,'共通素材読み込み');
    const concurrency=PHONE_VIEW?1:g.high?6:1;
    const started=performance.now(), uncached=list.filter(f=>!g.cache.has(f)).length;
    await loadSharedAssets(list,concurrency,()=>{done++;report(20+50*done/list.length,`素材 ${done}/${list.length}`);showBadge(`3D表示を準備中… ${done}/${list.length}`);});
    g.sharedLoadReport={area,total:list.length,uncached,concurrency,elapsedMs:Math.round(performance.now()-started)};
    if(area===1||area===3)for (const o of a.objects) if (o.kind === 'npc') await load(npcFile(o));
  } catch (e) {
    if(th&&th!==g.theme)try{th.dispose({final:true});}catch(_){} throw e;
  }
  if (token !== g.buildToken || curKey() !== key) {
    if (th && th !== g.theme) th.dispose({ final: true });
    if (token === g.buildToken) g.buildingKey = '';
    return;
  }   // 待っている間にフロアが変わった
  report(75,'マップ組み立て');
  const S = {}; for (const k of g.requiredSharedKeys) S[k] = await load(FILES[k]);
  // The URL-only sacred trial owns no save or interaction state.
  g.natureV6?.dispose();g.natureV6=null;g.natureV6Error=null;g.cameraPortals=[]; g.firstLayerDress?.dispose(); g.firstLayerDress=null; g.sacredTrial?.dispose(); g.sacredTrial = null; g.sacredTrialError = null;
  // 片付け
  for (const c of [...g.world.children]) g.world.remove(c);
  for (const c of [...g.dyn.children]) if (c !== g.near) g.dyn.remove(c);
  for (const foe of g.foes.values()) disposeFoe(foe);
  g.lights = []; g.entries = []; g.foes.clear(); pruneFoeTextures();
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
      throw e;
    }
  }
  else {                                // 第1階層：ここから下は従来の組み立て（変更なし）
  let sacred = false;
  if (area === 1 && a.f === 2 && (new URLSearchParams(location.search).get('f1sacred') === '1' || window.KotamaSacredPlaytest === true)) {
    try {
      const { buildSacredForestTrial } = await import('./field-3d-b1-sacred-trial.js?v=20261117-1');
      const trial = await buildSacredForestTrial({ world: g.world, area: a, renderer:g.renderer,
        layoutUrl: new URL('../assets/3d/dungeons/b1_sacred_forest_candidates/scene/game-layout-v6.json', import.meta.url).href });
      if (token !== g.buildToken || curKey() !== key) { trial.dispose(); if (token === g.buildToken) g.buildingKey = ''; return; }
      g.sacredTrial = trial; sacred = true;
      applyEnv(area, trial.env); g.camera.far = viewFar(trial.far); g.camera.updateProjectionMatrix();
    } catch (error) {
      if (token !== g.buildToken || curKey() !== key) return;
      g.sacredTrialError = String(error.message || error);
      console.warn('[field-3d] 神域の試験表示を読み込めないため従来表示を使います:', error);
    }
  }
  if (!sacred) {
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
      const wall=place(g.world, k < 0.08 ? S.wallCollapsed : k < 0.36 ? S.wallMossy : S.wall, ex, 0, ez, ry);
      wall.userData.firstStratumNativeWall=area===1;wall.userData.firstStratumNativeTile=[tx,ty];
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
  } else {
    // Keep the existing water presentation and interaction objects.
    for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) if (ch(tx,ty) === '~') addWater(X(tx),Z(ty));
    try { if (['closed_ruins_v3','closed_ruins_v4'].includes(g.sacredTrial.info().presentationRevision)) await g.sacredTrial.attachWater?.(g.world.children.filter(o => o.isMesh && o.geometry === waterGeo)); }
    catch (error) { console.warn('[field-3d] 地下水の試験材を読めないため従来の水面を使います:', error); }
    if (token !== g.buildToken || curKey() !== key) return;
  }
  if(area===1&&a.f<2&&(new URLSearchParams(location.search).get('f1sacred')==='1'||window.KotamaSacredPlaytest===true)){
    try{const {buildFirstLayerProgression}=await import('./f1-layer-progression-v4.js');
      const dressing=await buildFirstLayerProgression({world:g.world,area:{...a,reviewOpenTiles:Array.from({length:a.h},(_,z)=>Array.from({length:a.w},(_,x)=>[x,z])).flat().filter(([x,z])=>!wallCell(x,z)),reviewWalkableTiles:Array.from({length:a.h},(_,z)=>Array.from({length:a.w},(_,x)=>[x,z])).flat().filter(([x,z])=>!fieldCharSolid(a,ch(x,z)))}});
      if(token!==g.buildToken||curKey()!==key){dressing.dispose();return;}
      g.firstLayerDress=dressing;applyEnv(area,dressing.env);
    }catch(error){console.warn('[field-3d] 一層の段階装飾を読み込めません:',error);}
  }
  if(area===1&&(new URLSearchParams(location.search).get('f1sacred')==='1'||window.KotamaSacredPlaytest===true)){
    try{const {buildFirstLayerNatureV6}=await import('./f1-nature-v6.js');
      const tiles=Array.from({length:a.h},(_,z)=>Array.from({length:a.w},(_,x)=>[x,z])).flat();
      const nature=await buildFirstLayerNatureV6({world:g.world,area:a,openTiles:tiles.filter(([x,z])=>!wallCell(x,z)),walkTiles:tiles.filter(([x,z])=>!fieldCharSolid(a,ch(x,z)))});
      if(token!==g.buildToken||curKey()!==key){nature.dispose();return;}g.natureV6=nature;
    }catch(error){g.natureV6Error=String(error.message||error);console.warn('[field-3d] V6の自然装飾を読み込めません:',error);}
  }
  g.cameraPortals=[...(g.sacredTrial?.cameraPortals?.()||[]),...(g.firstLayerDress?.cameraPortals?.()||[])];
  // 物（宝箱・採集・灯・NPC・イベント・仕掛け・階段など）
  for (const o of a.objects) {
    const x = X(o.tx), z = Z(o.ty), f = facing(o.tx, o.ty), ry = FACE_YAW[f];
    const e = { o, kind: o.kind, obj: null, state: null, at: new THREE.Vector3(x, 1.2, z) };
    switch (o.kind) {
      case 'stairs':
        if (o.dir === 'down') e.obj = place(g.world, S.stairsDown, x, 0, z, ry);
        else { if (!sacred) place(g.world, S.floor, x, 0, z); e.obj = place(g.world, S.stairsUp, x, 0, z - 0, (area===1&&(window.KotamaSacredPlaytest===true||new URLSearchParams(location.search).get('f1sacred')==='1'))?ry:ry + Math.PI, 0.75); }
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
  report(95,'初回描画待ち');
  g.sig = doorSig(a);
  for (const e of g.entries) await scheduleEntrySync(e, S);
  if(token!==g.buildToken||curKey()!==key)return;
  g.builtKey = key; g.buildingKey = ''; g.lastThemeTick=0; g.cam.ready = false; g.lastLightKey = '';g.lastEntrySync=0;
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
  if (!g.texCache.has(src)) {
    const t = new THREE.TextureLoader().load(src, texture => {
      if (g.texCache.get(src)!==texture) { texture.dispose(); return; }
      const svg=/\.svg(?:$|[?#])/i.test(src);
      if (!svg && !PHONE_VIEW) return;
      // DOM SVG images can fail WebGL2 immutable texture upload. Rasterize
      // synchronously in onLoad, before the first render can upload the SVG.
      const image = texture.image, width = image.naturalWidth || image.width || 512;
      const height = image.naturalHeight || image.height || 512;
      const scale = PHONE_VIEW ? Math.min(1,768/Math.max(width,height)) : Math.min(2048 / Math.max(width,height), Math.max(1,512 / Math.max(width,height)));
      if(!svg&&scale===1)return;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1,Math.round(width*scale)); canvas.height = Math.max(1,Math.round(height*scale));
      const ctx=canvas.getContext('2d'); if(!ctx)return; ctx.drawImage(image,0,0,canvas.width,canvas.height);
      texture.image = canvas; texture.userData.svgRasterized = svg; texture.needsUpdate = true;
    });
    t.colorSpace = THREE.SRGBColorSpace; g.texCache.set(src,t);
  }
  return g.texCache.get(src);
}
// Only retain FOE texture entries referenced by current sprites.
function pruneFoeTextures(){
  const used=new Set([...g.foes.values()].map(v=>v.sp.material.map));
  for(const [src,texture] of g.texCache) if(!used.has(texture)){g.texCache.delete(src);texture.dispose();}
}
function releaseFoeImages(){
  if(PHONE_VIEW)queueIdleRelease();
  if(PHONE_VIEW&&g.renderer&&!g.buildingKey){g.renderer.setSize(1,1,false);g.size=[0,0];}
  for(const v of g.foes.values())disposeFoe(v);
  g.foes.clear();pruneFoeTextures();
}
// FOE visuals own their material and geometry; shared textures are pruned separately.
function disposeFoe(v) {
  g.dyn.remove(v.grp);
  v.ring.geometry.dispose(); v.ring.material.dispose(); v.sp.material.dispose();
  v.light.dispose();
}
function syncFoes(t) {
  const seen = new Set();
  for (const f of fieldState.foes || []) {
    if(f.defeated)continue;
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
  for (const [k, v] of g.foes) if (!seen.has(k)) { disposeFoe(v); g.foes.delete(k); }
  pruneFoeTextures();
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
  if (!c.ready) { c.pos.copy(t.pos); c.yaw = t.yaw; c.ready = true; c.tileKey=Math.floor(fieldState.x/FIELD_TILE)+','+Math.floor(fieldState.y/FIELD_TILE);c.walkUntil=0; }
  const kp = 1 - Math.exp(-dt * 13), ky = 1 - Math.exp(-dt * 18);
  c.pos.lerp(t.pos, kp);
  let dyaw = t.yaw - c.yaw; while (dyaw > Math.PI) dyaw -= Math.PI * 2; while (dyaw < -Math.PI) dyaw += Math.PI * 2;
  c.yaw += dyaw * ky;
  const tileKey=Math.floor(fieldState.x/FIELD_TILE)+','+Math.floor(fieldState.y/FIELD_TILE);
  if(c.tileKey!==tileKey){c.tileKey=tileKey;c.walkUntil=performance.now()+STEP_MS;}
  const moving = performance.now()<(c.walkUntil||0)&&c.pos.distanceTo(t.pos) > 0.05;
  const bob = moving ? Math.sin(performance.now() / 85) * 0.035 : 0;
  let bx = 0, bz = 0;
  if (c.bump > 0) { c.bump = Math.max(0, c.bump - dt); const s = Math.sin((1 - c.bump / 0.18) * Math.PI) * 0.14; bx = c.bumpDir[0] * s; bz = c.bumpDir[1] * s; }
  const eye=resolveFirstLayerCameraV6(c.pos.x+bx,c.pos.z+bz,g.cameraPortals||[]);
  g.lastCameraClearanceAdjustments=eye.adjusted;
  g.camera.position.set(eye.x, c.pos.y + bob, eye.z);
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
  const failedHere=g.floorFailures.has(curKey());
  btn.hidden = !failedHere && (!can || AREAS_3D.has(area));
  btn.textContent = failedHere?'3D再試行':g.pref ? '2D表示' : '3D表示';
  btn.title = g.pref ? '見下ろしの2D表示に切り替える' : '一人称の3D表示に切り替える';
}
function toggle(force) {
  if (fieldOk() && AREAS_3D.has(Number(fieldState.area))) { g.floorFailures.delete(curKey()); g.pref = true; window.Kotama3DLoading?.show(); build(); return; }
  g.pref = typeof force === 'boolean' ? force : !g.pref; writePref(g.pref);
  if (typeof fieldInput !== 'undefined') { fieldInput.keys.clear(); fieldInput.pad.clear(); fieldInput.tap = null; }
  if (g.pref) build(); else applyMode();
}
function showBadge(text) { if (!g.badge) return; g.badge.textContent = text; g.badge.hidden = !text; }

async function releaseFloorResources(){
  await Promise.allSettled([...pendingEntrySync]);
  g.natureV6?.dispose();g.natureV6=null;g.firstLayerDress?.dispose();g.firstLayerDress=null;g.sacredTrial?.dispose();g.sacredTrial=null;g.cameraPortals=[];
  if(g.theme){g.theme.dispose({final:true});g.theme=null;}
  for(const obj of [...g.world.children])g.world.remove(obj);
  for(const foe of g.foes.values())disposeFoe(foe);g.foes.clear();pruneFoeTextures();
  for(const obj of [...g.dyn.children])if(obj!==g.near)g.dyn.remove(obj);
  const models=await Promise.allSettled([...g.cache.values()]);g.cache.clear();
  const geos=new Set(),mats=new Set(),textures=new Set();
  for(const result of models)if(result.status==='fulfilled')result.value.traverse(obj=>{if(obj.geometry)geos.add(obj.geometry);for(const mat of [].concat(obj.material||[])){mats.add(mat);for(const tex of Object.values(mat))if(tex?.isTexture)textures.add(tex);}});
  textures.forEach(t=>t.dispose());mats.forEach(m=>m.dispose());geos.forEach(geo=>geo.dispose());
  g.entries=[];g.lights=[];g.lastLightKey='';g.builtKey='';g.cam.ready=false;g.renderer?.renderLists.dispose();
}
const pendingEntrySync=new Set();
function scheduleEntrySync(e,S){const job=syncEntry(e,S);pendingEntrySync.add(job);job.catch(error=>console.warn('[field-3d] object sync',error)).finally(()=>pendingEntrySync.delete(job));return job;}
let idleReleaseTimer=null;
function queueIdleRelease(){
  clearTimeout(idleReleaseTimer);idleReleaseTimer=setTimeout(()=>{
    if(document.body.dataset.screen!=='home'||g.buildingKey||!g.renderer||!g.builtKey)return;
    const key=g.builtKey;g.buildingKey=key;g.builtKey='';
    releaseFloorResources().catch(error=>console.warn('[field-3d] idle release',error)).finally(()=>{if(g.buildingKey===key)g.buildingKey='';if(document.body.dataset.screen==='field')build();});
  },1500);
}
function recoverFloor(key,error){
 console.error('[field-3d] floor failed:',key,error);
 if(g.buildingKey===key)g.buildingKey='';
 g.floorFailures.set(key,String(error?.message||error));
 g.builtKey='';
 try{g.theme?.dispose({final:true});}catch(_){} g.theme=null;
 showBadge('');applyMode();
 if(curKey()===key&&document.body.dataset.screen==='field'){window.Kotama3DLoading?.fail('3Dマップの読み込みに失敗しました');showBadge('');}
}
function startFloorBuild(){const key=curKey();buildFloor().catch(e=>recoverFloor(key,e)).finally(()=>{if(g.buildingKey===key)g.buildingKey='';if(g.retryRequested){g.retryRequested=false;if(document.body.dataset.screen==='field'&&curKey()===key&&!active()){g.floorFailures.delete(key);g.failed=false;window.Kotama3DLoading?.show();build();}}});}
function build() {
  if (!fieldOk() || document.body.dataset.screen!=='field') return;
  clearTimeout(idleReleaseTimer);
  if (!eligible()) { applyMode(); if(document.body.dataset.screen==='field')window.Kotama3DLoading?.fail('3D表示を利用できません。再試行してください'); return; }
  if (!ensureRenderer()) { applyMode(); window.Kotama3DLoading?.fail('3D描画を初期化できません'); return; }
  mount();
  const key = curKey();
  if (g.builtKey === key && doorSig(fieldArea()) === g.sig) { g.cam.ready = false; applyMode(); window.Kotama3DLoading?.hide(); return; }
  // Serialize async builds: a floor change is picked up by frame() afterwards.
  if (g.buildingKey) return;
  g.builtKey = '';
  applyMode();
  startFloorBuild();
}

function frame() {
  if (!fieldOk() || document.hidden || document.body.dataset.screen!=='field') return;
  if (!active()) { if (g.canvas && !g.canvas.hidden) applyMode(); if (eligible() && !g.buildingKey && g.builtKey !== curKey()) build(); return; }
  const now = performance.now();
  if (g.maxFps && now - g.lastRender < 1000 / g.maxFps - .5) return;
  g.lastRender = now;
  observeFrame(now);
  const dt = g.lastT ? Math.min(PHONE_VIEW ? 0.1 : g.maxFps ? 1 : 0.1, (now - g.lastT) / 1000) : 0.016; g.lastT = now;
  mount();
  const a = fieldArea();
  if (doorSig(a) !== g.sig && !g.buildingKey) { g.builtKey = ''; startFloorBuild(); return; }
  if(!g.lastEntrySync||now-g.lastEntrySync>=100){g.lastEntrySync=now;for (const e of g.entries) scheduleEntrySync(e);}
  syncFoes(now);
  updateCamera(dt);
  g.natureV6?.update(g.camera.position.x,g.camera.position.z);
  g.sacredTrial?.update?.(now / 1000);
  // The camera frustum excludes remote geometry without changing movement, collision or asset data.
  const themeStep=!PHONE_VIEW||!g.lastThemeTick||now-g.lastThemeTick>=1000/20;
  const themeDt=PHONE_VIEW?Math.min(.15,g.lastThemeTick?(now-g.lastThemeTick)/1000:dt):dt;
  if(themeStep)g.lastThemeTick=now;
  if (themeStep && g.theme?.area === 4 && g.envArea === 4) g.theme.tick(themeDt, now, g.camera.position);
  updatePool(g.camera.position, g.envArea === 4);
  if (themeStep && g.theme && g.envArea === g.theme.area && g.envArea !== 4) g.theme.tick(themeDt, now, g.camera.position);
  // 正面の調べられる物に目印
  const nk = fieldState.lock ? '' : fieldState.nearKey;
  const ne = nk && g.entries.find((e) => e.o.key === nk);
  if (ne) { g.near.visible = true; g.near.position.set(ne.at.x, ne.at.y + 0.9 + Math.sin(now / 300) * 0.08, ne.at.z); g.near.rotation.y = now / 600; }
  else g.near.visible = false;
  g.renderer.info.reset();   // 後処理（ブルーム）の分も含めて1フレームの描画数を数える
  try{if (g.composer) g.composer.render(); else g.renderer.render(g.scene, g.camera);}catch(e){recoverFloor(curKey(),e);return;}
  // Only dismiss the full-screen loading state after the first actual 3D frame.
  window.Kotama3DLoading?.ready();

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
function gameReviewState() {
  return { builtKey:g.builtKey, buildingKey:g.buildingKey, phoneView:PHONE_VIEW, adaptiveResolutionScale:perfBudget.scale, sharedCacheSize:g.cache.size, sharedLoadReport:g.sharedLoadReport||null, drawDistance:g.camera?.far, floorFailures:Object.fromEntries(g.floorFailures),
    environment:{area:g.envArea,background:g.scene?.background?.getHex?.(),fogDensity:g.scene?.fog?.density,far:g.camera?.far,exposure:g.renderer?.toneMappingExposure,hemisphereIntensity:g.hemi?.intensity,fillIntensity:g.reviewFill?.intensity||0},
    cameraClearanceAdjustments:g.lastCameraClearanceAdjustments||0,camera:g.camera?{position:g.camera.position.toArray(),rotation:g.camera.rotation.toArray().slice(0,3)}:null,
    entries:g.entries.map(e=>({key:e.o.key,kind:e.kind,state:e.state,at:e.at.toArray(),objectId:e.o.id||null,sprite:e.o.sprite,hasObject:!!e.obj,modelName:e.obj?.name||null,objectUuid:e.obj?.uuid||null,modelRotationY:e.obj?.rotation.y??null,modelBounds:e.obj?new THREE.Box3().setFromObject(e.obj).getSize(new THREE.Vector3()).toArray():null,childNames:e.obj?e.obj.children.map(c=>c.name):[]})),
    waterMeshCount:g.world?.children.filter(o=>o.isMesh&&o.geometry===waterGeo).length??0,
    foes:[...g.foes].map(([key,v])=>({key,visible:v.grp.visible,meshOrSprite:v.sp.type,textureLoaded:!!v.sp.material.map?.image,textureRasterized:!!v.sp.material.map?.userData.svgRasterized,textureSize:v.sp.material.map?.image?[v.sp.material.map.image.width,v.sp.material.map.image.height]:null})),
    natureV6Info:g.natureV6?.info()||null,natureV6Error:g.natureV6Error||null,firstLayerProgressionInfo:g.firstLayerDress?.info()||null,staticTrialInfo:g.sacredTrial?.info()||null,trialFallback:g.sacredTrialError||null };
}
window.KotamaField3D = { active, input, build, frame, toggle, releaseFoeImages, retryLoad:()=>{if(document.body.dataset.screen!=='field')return;if(g.renderer?.getContext().isContextLost()){window.Kotama3DLoading?.fail('GPUの復旧を待ってから再試行してください');return;}if(g.buildingKey){g.retryRequested=true;window.Kotama3DLoading?.waiting?.('現在の読み込みを完了後に再試行します');return;}g.floorFailures.delete(curKey());g.failed=false;g.webgl=true;g.pref=true;window.Kotama3DLoading?.show();build();}, gameReviewState, natureGeometryReview:()=>g.natureV6?.geometryReview()||null, sacredTrialInfo: () => g.sacredTrial?.info() || (g.sacredTrialError ? {active:false,fallbackReason:g.sacredTrialError} : null), isEnabled: () => g.pref, setPreview, previewOn: (n) => g.preview.has(n), themeInfo: () => g.theme?.info(), renderInfo: () => ({ calls: g.renderer?.info.render.calls, triangles: g.renderer?.info.render.triangles, memory: { ...g.renderer?.info.memory } }),
  // 診断用：直近の描画の回数・三角形数と、GPU に残っているジオメトリ・テクスチャの数（後処理の分も含めて1フレーム）
  stats: () => (g.renderer ? { calls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles, geometries: g.renderer.info.memory.geometries, textures: g.renderer.info.memory.textures, lights: g.lights.length } : null) };
// 読み込みが探索画面の開始より遅れた場合に備えて、いまの状態で一度組み立てる
if (fieldOk() && typeof state !== 'undefined' && state.screen === 'field') build();
else applyModeSafe();
function applyModeSafe() { try { if (document.getElementById('field')) applyMode(); } catch (_) {} }
