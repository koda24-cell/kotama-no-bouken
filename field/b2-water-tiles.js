/* ============================================================
   field/b2-water-tiles.js — 第2階層「凍てつく水源」の危険な水面（非通行の水域）と床の模様の調整
   ------------------------------------------------------------
   担当：Claude（B2 v4 水面班 W）。設計：docs/3d/B2_V4_FEEDBACK_DESIGN.md の F7・F10c・F10d。
   ・危険な水面は GPT の水面タイル v0.7（16種。tools/b2-render/build-modular-water-tiles.py、
     docs/3d/B2_WATER_TILE_CLAUDE_HANDOFF.md）で描く。ファイルは assets/models/floor2/water-tiles/v07/lite/
     （Actions で再生成し、平らな格子だけを間引いた版。未承認素材）。
   ・各マスの「水がつながる方向」から N=8 / E=2 / S=1 / W=4 のビットマスクを作り、water_tile_<mask>.glb を選ぶ。
     マスクは隣どうしで同じ判定（両方が水面か）から作るので、A.E == B.W・A.S == B.N が必ず成り立つ（接合線で水と陸が食い違わない）。
     念のため組み立てごとに全ての隣接を検査し、食い違い・外周に接する水面を info() に記録する（外周に接するマスは描かない）。
   ・通行判定は従来どおりマップ側（'~' は FIELD_SOLID）。ここは見た目だけ。
   ・どのマスが危険な水面かは B2V4W_ROLES で決める（迷宮班 M の tileRoles 確定後に名前を差し替えられる）。
   ・同じ GLB は1回だけ読み、マスごとに Batcher（区画×素材でまとめる既存の仕組み）へ渡して描画回数を抑える。
   ・読み込めない場合は、従来の水面（平らな水＋暗い底）で描く（画面を壊さない）。
   ・水たまり（通れる浅瀬 '*'）は従来の浅く明るい水のまま。危険な水面は深く暗めで、縁に泡（頂点色）と濡れた岸。
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 役割名（迷宮班 M の確定後に差し替える）。hazard＝危険な水面（非通行）。chars はマップ文字で判定する場合
export const B2V4W_ROLES = { hazard: new Set(['water-hazard']), hazardChars: new Set(['~']) };
export function setB2WaterRoles({ hazard, hazardChars } = {}) {
  if (hazard) B2V4W_ROLES.hazard = new Set(hazard);
  if (hazardChars) B2V4W_ROLES.hazardChars = new Set(hazardChars);
}
// 水面の上の四角い石板（壊れた橋の飛び石）は廃止（F7）
export const B2V4W_REMOVE_STEPPING_STONES = true;

const TILE_DIR = './assets/models/floor2/water-tiles/v07/lite/';
const BIT = { up: 8, right: 2, down: 1, left: 4 };            // N=8 E=2 S=1 W=4（DIR_VEC の up は ty-1＝北）
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const WATER_Y = -0.08;                                         // タイルの原点（水面）の高さ。床（0.03前後）より少し下

// GPT の生成スクリプトと同じ海岸線（水の内側で正、陸で負）。x・y はタイル内の -0.5〜0.5（y は北が正）
function coast(x, y, mask) {
  let m = 1, any = false;
  for (const [bit, coord] of [[8, y], [1, -y], [2, x], [4, -x]]) {
    if (mask & bit) continue;
    const along = (bit === 8 || bit === 1) ? x : y;
    const wob = 0.052 * Math.sin(along * 12 + bit * 2) + 0.031 * Math.sin(along * 23 + bit) + 0.015 * Math.sin(along * 43 + bit * 0.7);
    const v = 0.32 - coord + wob; m = any ? Math.min(m, v) : v; any = true;
  }
  return any ? m : 1;
}
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function canvasTex(n, draw, srgb) {
  const cv = document.createElement('canvas'); cv.width = cv.height = n; draw(cv.getContext('2d'), n);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; return t;
}
// さざ波の法線マップ（周期的。スクロールさせて流れを出す）
function rippleNormal() {
  const n = 256, H = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n * Math.PI * 2, v = y / n * Math.PI * 2;
    H[y * n + x] = Math.sin(u * 3 + Math.sin(v * 2) * 1.1) * 0.5 + Math.sin(v * 5 + Math.sin(u * 3) * 0.9) * 0.35
      + Math.sin(u * 11 + v * 7 + Math.sin(v * 3)) * 0.14 + Math.sin(u * 19 - v * 13) * 0.06;
  }
  return canvasTex(n, (c) => {
    const img = c.createImageData(n, n), at = (x, y) => H[((y + n) % n) * n + ((x + n) % n)];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * 2.2, dy = (at(x, y + 1) - at(x, y - 1)) * 2.2, l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4;
      img.data[i] = (dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }, false);
}

/* ------------------------------------------------------------
   床の模様（F10c）：斑点（光る水たまりの楕円と、岩盤の濃淡）を小さく・低コントラストにし、水脈・岩盤の青に寄せる。消しはしない
   ------------------------------------------------------------ */
function tuneFloor(mats, proc, owned) {
  if (proc.__b2v4wFloor) return; proc.__b2v4wFloor = true;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  // 水たまり：白い楕円＋淡い石の縁 → ひと回り小さく、少し透ける青い水と、岩盤と同じ青の濡れた縁
  mats['wt:puddle'] = std({ color: 0x4fbfe0, roughness: 0.08, metalness: 0.1, emissive: 0x1a86b4, emissiveIntensity: 0.42, envMapIntensity: 1.1, transparent: true, opacity: 0.72, depthWrite: false });
  mats['wt:puddleRim'] = std({ color: 0x6c9ec0, map: mats['Wet slate stone'].map, normalMap: mats['Wet slate stone'].normalMap, roughness: 0.34, metalness: 0.02, emissive: 0x0b3a58, emissiveIntensity: 0.6, envMapIntensity: 0.8, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false });
  for (const pc of proc.puddles || []) for (const p of pc.parts) {
    p.geo.scale(0.66, 1, 0.66);
    if (p.mat === 'puddle') p.mat = 'wt:puddle';
    else if (p.mat === 'Pale mineral stone') { p.mat = 'wt:puddleRim'; p.geo.translate(0, 0.004, 0); }
  }
  // 岩盤の色テクスチャ：濃淡（大きな斑）を平均へ 45% 寄せ、少しだけ青へ。水脈（emissiveMap）はそのまま
  const fl = mats.caveFloor, src = fl && fl.map && fl.map.image;
  if (src && src.getContext) {
    const n = src.width, cv = document.createElement('canvas'); cv.width = cv.height = n;
    const c = cv.getContext('2d'); c.drawImage(src, 0, 0);
    const img = c.getImageData(0, 0, n, n), d = img.data;
    let mr = 0, mg = 0, mb = 0; for (let i = 0; i < d.length; i += 4) { mr += d[i]; mg += d[i + 1]; mb += d[i + 2]; }
    const k = d.length / 4; mr /= k; mg /= k; mb /= k;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = mr + (d[i] - mr) * 0.55 - 2; d[i + 1] = mg + (d[i + 1] - mg) * 0.55 + 2; d[i + 2] = mb + (d[i + 2] - mb) * 0.55 + 5;
    }
    c.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = fl.map.anisotropy; t.repeat.copy(fl.map.repeat);
    fl.map = t; fl.normalScale = new THREE.Vector2(0.75, 0.75); fl.needsUpdate = true;
    owned.push(t);
  }
}

/* ------------------------------------------------------------
   本体
   ctx: { CELL, DIR_VEC, DIR_ORDER, FACE_YAW, hash, M4, proc, mats, CEIL_H, ceilY }
   ------------------------------------------------------------ */
export function createB2WaterTiles(ctx) {
  const { CELL, DIR_VEC, DIR_ORDER, FACE_YAW, hash, M4, proc, mats, ceilY } = ctx;
  const owned = [];          // 階層を離れるときに破棄する物（テクスチャ・形）
  tuneFloor(mats, proc, owned);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const ripple = rippleNormal(); ripple.repeat.set(0.42, 0.42); owned.push(ripple);
  const glow = { value: 0.34 };
  // 危険な水面：深く暗めの青緑（頂点色で水深と縁の泡）。#203 の水（明るいシアン・発光）と同じ色域で、浅瀬より暗い
  const water = std({ color: 0xffffff, vertexColors: true, roughness: 0.07, metalness: 0.08, normalMap: ripple, normalScale: new THREE.Vector2(0.32, 0.32),
    envMapIntensity: 1.35, transparent: true, opacity: 0.8, depthWrite: false });
  water.onBeforeCompile = (sh) => {
    sh.uniforms.wtGlow = glow;
    sh.fragmentShader = 'uniform float wtGlow;\n' + sh.fragmentShader.replace('#include emissivemap_fragment', '#include emissivemap_fragment\n  totalEmissiveRadiance += vColor.rgb * wtGlow;');
  };
  water.customProgramCacheKey = () => 'b2v4w-water';
  Object.assign(mats, {
    'wt:water': water,
    'wt:bed': std({ color: 0x2a7ea6, map: mats['Deep cavern rock'].map, normalMap: mats['Deep cavern rock'].normalMap, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.85, emissive: 0x062c48, emissiveIntensity: 1.0, envMapIntensity: 0.4, vertexColors: true }),
    'wt:shelf': std({ color: 0x6cc4dc, map: mats['Pale mineral stone'].map, roughness: 0.72, emissive: 0x0c4460, emissiveIntensity: 0.8, envMapIntensity: 0.5, vertexColors: true }),
    'wt:film': std({ color: 0x55bedd, roughness: 0.06, metalness: 0.1, emissive: 0x157aa6, emissiveIntensity: 0.45, envMapIntensity: 1.3 }),
    'wt:fallback': std({ color: 0x3c9ec4, map: mats['Clear blue water'].map, roughness: 0.06, metalness: 0.1, emissive: 0x0b5f86, emissiveIntensity: 0.5, envMapIntensity: 1.4, transparent: true, opacity: 0.82, depthWrite: false }),
    'wt:deepbed': std({ color: 0x1a5272, roughness: 0.9, emissive: 0x04203a, emissiveIntensity: 1.0, vertexColors: true }),
  });
  const COLORS = { deep: new THREE.Color(0x0f4f74), mid: new THREE.Color(0x2a8fb8), shallow: new THREE.Color(0x6fd8f2), foam: new THREE.Color(0xe2f8ff) };

  let tiles = null, loadJob = null, mode = 'none', stats = {};
  let hz = new Set(), W = 0, Hh = 0;

  // GLB の素材名・形の名前 → このゲームの素材
  function matKey(meshName, matName) {
    const n = (meshName || '').toLowerCase(), m = (matName || '').toLowerCase();
    if (/glacial water surface|isolated flooded/.test(n) || /turquoise water/.test(m)) return 'wt:water';
    if (/riverbed/.test(n) || /riverbed/.test(m)) return 'wt:bed';
    if (/shallow mineral shelves/.test(n) || /mineral shallows/.test(m)) return 'wt:shelf';
    if (/erosion water finger/.test(n) || /water film/.test(m)) return 'wt:film';
    if (/shoreline/.test(n)) return 'Wet slate stone';
    return 'Deep cavern rock';
  }
  function prepTile(gltf, mask) {
    gltf.scene.updateMatrixWorld(true);
    const parts = [];
    gltf.scene.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material, key = matKey(o.name, mat && mat.name);
      let geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
      for (const k of Object.keys(geo.attributes)) if (k !== 'position') geo.deleteAttribute(k);
      geo.computeVertexNormals();
      if (key === 'wt:water') {   // 水面は真上向きの法線にそろえる（間引いた細い三角形の陰の筋を出さない。さざ波は法線マップで出す）
        const nm = geo.attributes.normal; for (let i = 0; i < nm.count; i++) nm.setXYZ(i, 0, 1, 0);   // 頂点色：海岸線からの距離で 水深の色＋縁の泡（タイルの外へはみ出す水たまりは浅い色）
        const p = geo.attributes.position, col = new Float32Array(p.count * 3), pool = /isolated/i.test(o.name), c = new THREE.Color();
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = -p.getZ(i), d = pool ? 0.06 : coast(x, y, mask);
          const depth = smooth(0.02, 0.26, d);
          c.copy(COLORS.shallow).lerp(COLORS.mid, smooth(0, 0.5, depth)).lerp(COLORS.deep, smooth(0.45, 1, depth));
          const foam = pool ? 0 : (1 - smooth(0.0, 0.055, d)) * (0.65 + 0.35 * Math.sin(x * 61 + y * 47) * Math.sin(y * 29 - x * 13));
          c.lerp(COLORS.foam, Math.max(0, Math.min(0.85, foam)));
          col.set([c.r, c.g, c.b], i * 3);
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      }
      parts.push({ geo, mat: key, tag: o.name });
    });
    if (!parts.length) throw new Error('empty water tile ' + mask);
    // 同じ素材の部品をまとめる（Batcher の手間を減らす）
    const by = new Map(); for (const p of parts) { if (!by.has(p.mat)) by.set(p.mat, []); by.get(p.mat).push(p.geo); }
    const merged = [];
    for (const [mat, geos] of by) {
      const ok = geos.every((g) => !!g.attributes.color === !!geos[0].attributes.color);
      if (geos.length === 1 || !ok) { for (const g of geos) merged.push({ geo: g, mat }); continue; }
      const idx = geos.map((g) => (g.index ? g.toNonIndexed() : g));
      const m = mergeSimple(idx); geos.forEach((g) => g.dispose()); idx.forEach((g) => g !== m && g.dispose && g.dispose());
      merged.push({ geo: m, mat });
    }
    let tris = 0; for (const p of merged) tris += (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count) / 3;
    return { name: 'b2_water_tile_' + mask, parts: merged, tris };
  }
  function mergeSimple(geos) {
    const out = new THREE.BufferGeometry(), names = Object.keys(geos[0].attributes);
    for (const nm of names) {
      const size = geos[0].attributes[nm].itemSize, total = geos.reduce((s, g) => s + g.attributes[nm].count, 0), arr = new Float32Array(total * size);
      let o = 0; for (const g of geos) { arr.set(g.attributes[nm].array, o); o += g.attributes[nm].count * size; }
      out.setAttribute(nm, new THREE.BufferAttribute(arr, size));
    }
    return out;
  }
  function loadTiles() {
    if (loadJob) return loadJob;
    const loader = new GLTFLoader();
    loadJob = Promise.all(Array.from({ length: 16 }, (_, m) => loader.loadAsync(`${TILE_DIR}water_tile_${String(m).padStart(2, '0')}.glb`).then((g) => prepTile(g, m))))
      .then((list) => { tiles = list; return list; })
      .catch((e) => { console.warn('[B2] 水面タイルを読めなかったため従来の水面で描きます', e); tiles = null; return null; });
    return loadJob;
  }

  // 組み立ての始め：危険な水面のマスを決め、必要ならタイルを読む
  async function begin(a, info, roles) {
    const { ch } = info; W = a.w; Hh = a.h; hz = new Set(); stats = { cells: 0, masks: {}, mismatches: 0, borderSkipped: 0, tris: 0, mode: 'none', edgesChecked: 0 };
    const role = (tx, ty) => (roles && roles[ty] && roles[ty][tx]) || '';
    for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
      if (!(B2V4W_ROLES.hazardChars.has(ch(tx, ty)) || B2V4W_ROLES.hazard.has(role(tx, ty)))) continue;
      if (tx <= 0 || ty <= 0 || tx >= a.w - 1 || ty >= a.h - 1) { stats.borderSkipped++; continue; }   // 外周に接する水面は描かない（仕様違反として記録）
      hz.add(`${tx},${ty}`);
    }
    stats.cells = hz.size;
    // 隣接の検査：A の東と B の西（南北も）が同じ種類か
    for (const k of hz) {
      const [tx, ty] = k.split(',').map(Number), m = maskAt(tx, ty);
      stats.masks[m] = (stats.masks[m] || 0) + 1;
      for (const d of ['right', 'down']) {
        const nx = tx + DIR_VEC[d][0], ny = ty + DIR_VEC[d][1];
        const mine = !!(m & BIT[d]), theirs = hz.has(`${nx},${ny}`) ? !!(maskAt(nx, ny) & BIT[OPP[d]]) : false;
        stats.edgesChecked++; if (mine !== theirs) stats.mismatches++;
      }
    }
    if (stats.mismatches) console.warn('[B2] 水面タイルの接合が食い違う', stats.mismatches);
    if (hz.size) { await loadTiles(); mode = tiles ? 'tiles' : 'fallback'; } else mode = 'none';
    stats.mode = mode;
    if (typeof window !== 'undefined') window.KotamaB2WaterTiles = { info };
  }
  const isHazard = (tx, ty) => hz.has(`${tx},${ty}`);
  function maskAt(tx, ty) {
    let m = 0; for (const d of DIR_ORDER) if (hz.has(`${tx + DIR_VEC[d][0]},${ty + DIR_VEC[d][1]}`)) m |= BIT[d];
    return m;
  }

  // 1マス：水面タイル（または従来の水面）、天井、壁、陸との境の岸
  // opts: { ch, wallCell, ceiling: bool, skipWall: (key) => bool }
  function addCell(B, tx, ty, opts) {
    const x = tx * CELL, z = ty * CELL, m = maskAt(tx, ty);
    if (tiles) { B.add('water_tiles', tiles[m], M4(x, WATER_Y, z, 0, CELL), tx, ty); stats.tris += tiles[m].tris; }
    else {
      B.add('water_tiles', { name: 'wt_fallback', parts: [{ geo: proc.poolFull.parts[0].geo, mat: 'wt:fallback' }] }, M4(x, WATER_Y - 0.04, z), tx, ty);
      B.add('water_tiles', { name: 'wt_fallback_bed', parts: [{ geo: proc.bed.parts[0].geo, mat: 'wt:deepbed' }] }, M4(x, -0.62, z), tx, ty);
    }
    if (opts.ceiling) B.add('ceiling', proc.continuousCeiling(x, z, CELL), M4(x, ctx.CEIL_H, z), tx, ty);
    for (const d of DIR_ORDER) {
      const [dx, dy] = DIR_VEC[d], nx = tx + dx, ny = ty + dy, nk = `${nx},${ny}`;
      if (hz.has(nk)) continue;
      const ex = x + dx * CELL / 2, ez = z + dy * CELL / 2, di = DIR_ORDER.indexOf(d);
      if (opts.wallCell(nx, ny)) {
        if (opts.skipWall && opts.skipWall(nk)) continue;
        const ry = FACE_YAW[d] + Math.PI;
        B.add('walls', proc.continuousWall(ex, ez, ry, CELL), M4(ex, 0, ez, ry), tx, ty);
        // 水から立ち上がる岩（石筍）と、上の鍾乳石：壁ぎわに寄せる
        const along = [dy ? 1 : 0, dx ? 1 : 0];
        if (hash(tx, ty, 880 + di) < 0.55) {
          const t = (hash(tx, ty, 884 + di) - 0.5) * 3.0, inw = 0.3 + hash(tx, ty, 888 + di) * 0.25, h = 0.7 + hash(tx, ty, 892 + di) * 1.6;
          B.add('spires', proc.stalagmites[Math.floor(hash(tx, ty, 896 + di) * proc.stalagmites.length) % proc.stalagmites.length], M4(ex + along[0] * t - dx * inw, -0.45, ez + along[1] * t - dy * inw, hash(tx, ty, 900 + di) * 6.28, [h * 0.85, h, h * 0.85]), tx, ty);
        }
        if (opts.ceiling && hash(tx, ty, 904 + di) < 0.8) {
          const t = (hash(tx, ty, 908 + di) - 0.5) * 3.2, inw = 0.2 + hash(tx, ty, 912 + di) * 0.7, h = 1.1 + hash(tx, ty, 916 + di) * 2.0;
          const sx = ex + along[0] * t - dx * inw, sz = ez + along[1] * t - dy * inw;
          B.add('spires', proc.stalactites[Math.floor(hash(tx, ty, 920 + di) * proc.stalactites.length) % proc.stalactites.length], M4(sx, ceilY(sx, sz) + 0.1, sz, hash(tx, ty, 924 + di) * 6.28, [h * 0.75, h, h * 0.75]), tx, ty);
        }
        continue;
      }
      // 歩ける床（または浅瀬）との境：濡れた岸の帯で段差とすき間を隠す
      B.add('water_tiles', bankStrip(ex, ez, d, opts.ch(nx, ny) === '*'), M4(0, 0, 0), tx, ty);
    }
  }
  // 境界線に沿った帯（世界座標で作る）。床の側は床の高さ、水の側はタイルの岸の高さへつなぐ。浅瀬の側は浅瀬の底まで下げる
  function bankStrip(ex, ez, d, shallow) {
    const [dx, dy] = DIR_VEC[d], ax = dy ? 1 : 0, az = dx ? 1 : 0, SEG = 14, ROWS = 4;
    const g = new THREE.PlaneGeometry(1, 1, SEG, ROWS), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5;                 // u：境界に沿う、v：0＝水の側 → 1＝床の側
      const s = (u - 0.5) * (CELL + 0.04), off = -0.55 + v * 1.0;   // 境界から水側 0.55m 〜 床側 0.45m
      const wx = ex + ax * s + dx * off, wz = ez + az * s + dy * off;
      const floorY = shallow ? -0.33 : groundY(wx, wz) + 0.015, waterSide = WATER_Y + 0.07;
      const bump = 0.035 * Math.sin(wx * 3.1 + wz * 2.3) + 0.02 * Math.sin(wx * 7.7 - wz * 5.9);
      const y = waterSide + (floorY - waterSide) * smooth(0, 1, v) + bump * Math.sin(v * Math.PI);
      p.setXYZ(i, wx, y, wz);
    }
    g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) { g.index.array.reverse(); g.computeVertexNormals(); }
    return { name: 'wt_bank', transient: true, parts: [{ geo: g, mat: 'Wet slate stone' }] };
  }
  // 床の高さ（field-3d-b2-water.js の groundY と同じ式）
  function groundY(wx, wz) { return 0.03 + 0.09 * Math.sin(wx * 0.47) * Math.cos(wz * 0.39) + 0.04 * Math.sin(wx * 1.14 + wz * 0.58) + 0.02 * Math.cos(wx * 2.37 - wz * 1.81); }

  let t = 0;
  function tick(dt) {
    t += dt || 0.016;
    ripple.offset.set((t * 0.011) % 1, (t * 0.017) % 1);
    glow.value = 0.32 + 0.03 * Math.sin(t * 0.9);
  }
  function dispose() {
    for (const o of owned) o.dispose && o.dispose();
    owned.length = 0;
    if (tiles) for (const tl of tiles) for (const p of tl.parts) p.geo.dispose();
    tiles = null; loadJob = null;
  }
  function info() { return { ...stats, hazard: [...B2V4W_ROLES.hazard], hazardChars: [...B2V4W_ROLES.hazardChars] }; }
  return { begin, isHazard, maskAt, addCell, tick, dispose, info };
}
