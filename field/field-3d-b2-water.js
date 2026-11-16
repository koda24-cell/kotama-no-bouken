/* ============================================================
   field/field-3d-b2-water.js — 第2階層「凍てつく水源」の一人称3D表示（テーマ）
   ------------------------------------------------------------
   担当：Claude。field/field-3d-view.js から、第2階層を組み立てるときだけ dynamic import される。
   （このファイルを読めなくても、第1階層の3D表示と2D表示には影響しない）
   方針：
     ・ゲームのルール（マップ・通行判定・FOE・イベント・宝箱・採集・仕掛け・セーブ）は既存の field 系が正。
       ここでは見た目だけを作る。通行判定は従来どおりマップの文字（# が壁）で決まり、3D 側に当たり判定は持たない。
       → GLB 全体を当たり判定に使うことはなく、見た目のメッシュと通行判定は完全に分かれている。
     ・素材：assets/3d/dungeons/b2_water_source/models/floor2-water-source-quality-v3.glb（GPT 制作・222メッシュ）
       名前ごとに部品（床板・岩・結晶・荊・アーチ・水門・橋・滝・水面・波紋・鉱脈）へ分け、マスに合わせて並べる。
       宝箱・階段・採集点・NPC・灯・看板は第1階層の素材を共有する（コピーせず b1 のパスを読む）。
     ・動かない物は「区画（8×8マス）×素材」ごとに1つのメッシュへまとめて描画回数を抑える。
       まとめた後も、種類ごと（b2:floor／b2:walls／b2:crystals …）のグループ名で表示・非表示を切り替えられる。
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const B2_BASE = './assets/3d/dungeons/b2_water_source/';
export const B2_GLB = B2_BASE + 'models/floor2-water-source-quality-v3.glb';
const CHUNK = 8;                                       // まとめる区画（マス数）
const WATER_KEY = 'kotama.field3d.b2.water';           // 'opaque' で水を不透明にする（半透明が崩れる環境向けの退避）

// 第2階層の空気（第1階層の値とは別。第1階層へ戻ると field-3d-view.js が第1階層の値に戻す）
// 水源洞窟の岩肌と遠景を視認できるよう、暗部を持ち上げつつ寒色を維持。
export const ENV = { background: 0x102a36, fog: { color: 0x1b4050, density: 0.011 }, hemi: { sky: 0xb7e4ef, ground: 0x416575, high: 2.0, low: 2.1 } };

/* ------------------------------------------------------------
   素材（GLB の素材名ごとに、ゲームの描画に合わせた値で作り直す）
   ------------------------------------------------------------ */
function makeMaterials(opaqueWater) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  // 多数の白い楕円を描く旧水面を廃止。低周波の流れと微細な波を
  // 周期関数で重ね、シームレスな深水色のテクスチャにする。
  const waterTex = tileTexture(512, (c, n) => {
    const img = c.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = x / n * Math.PI * 2, v = y / n * Math.PI * 2;
      const swell = Math.sin(u * 3 + Math.sin(v * 2) * 0.65) * 0.5
        + Math.cos(v * 4 - Math.sin(u * 2) * 0.55) * 0.28;
      const micro = Math.sin(u * 17 + Math.sin(v * 11) * 0.8)
        * Math.cos(v * 19 - Math.sin(u * 7)) * 0.13;
      const nval = Math.max(-1, Math.min(1, swell + micro));
      const i = (y * n + x) * 4;
      img.data[i] = 42 + nval * 12;
      img.data[i + 1] = 104 + nval * 17;
      img.data[i + 2] = 129 + nval * 19;
      img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  });
  // 直線的な縦ストライプの滝を、ゆらぐ流線と細かな飛沫へ変更。
  const fallTex = tileTexture(256, (c, n) => {
    const img = c.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = x / n * Math.PI * 2, v = y / n * Math.PI * 2;
      const flow = Math.sin(u * 13 + Math.sin(v * 3) * 1.8)
        + 0.38 * Math.cos(u * 31 - v * 2 + Math.sin(v * 5));
      const foam = Math.max(0, flow - 0.7);
      const i = (y * n + x) * 4;
      img.data[i] = 100 + foam * 46;
      img.data[i + 1] = 160 + foam * 37;
      img.data[i + 2] = 186 + foam * 33;
      img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  });
  fallTex.repeat.set(2, 1.4); waterTex.repeat.set(1, 1);
  const water = std({ color: 0x7bb4bf, map: waterTex, roughness: 0.09, metalness: 0.08, emissive: 0x061c29, emissiveIntensity: 0.12, side: THREE.DoubleSide });
  const fall = std({ color: 0xb5dce5, map: fallTex, roughness: 0.19, metalness: 0.0, emissive: 0x17495d, emissiveIntensity: 0.3, side: THREE.DoubleSide });
  if (opaqueWater) { water.color.setHex(0x0f4a68); fall.color.setHex(0x2f7fa8); }
  else for (const m of [water, fall]) { m.transparent = true; m.opacity = m === water ? 0.83 : 0.72; m.depthWrite = false; }
  const foam = std({ color: 0xaee8ff, roughness: 0.5, emissive: 0x1f4a59, emissiveIntensity: 1.0, transparent: true, opacity: 0.8, depthWrite: false });
  // UVのないGLB部品にも使える、繰り返し可能な微細石材テクスチャ。
  // 大きなGLBを追加せずに床・壁・天井の表面情報を増やす。
  const rockTex = stoneTexture(512, 13, false);
  const slateTex = stoneTexture(512, 37, true);
  const paleTex = stoneTexture(512, 71, false);
  const rockBump = rockTex.clone(), slateBump = slateTex.clone(), paleBump = paleTex.clone();
  for (const t of [rockBump, slateBump, paleBump]) { t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; }
  // 天井：同じ岩肌でも細かく繰り返し、大きなぼやけた斑点に見えないようにする
  const ceilTex = rockTex.clone(), ceilBump = rockBump.clone();
  for (const t of [ceilTex, ceilBump]) { t.repeat.set(2.2, 2.2); t.needsUpdate = true; }
  // 壁の石積み：1個ずつの石材（ジオメトリ）に、細かな花崗岩の粒を重ねる
  const granite = graniteTexture(512, 91);
  // 床：不揃いな敷石（ボロノイ）。格子状の継ぎ目を出さない
  const flag = flagstoneTextures(512, 6, 57);
  // 滝の手前の水膜：奥の帯より明るく速く流れる
  const fallFrontTex = fallTex.clone(); fallFrontTex.repeat.set(3, 1); fallFrontTex.needsUpdate = true;
  const foamTex = foamNoiseTexture(128, 23);
  const foamDiskTex = foamDiskTexture(256, 41);
  const fallFront = std({ color: 0xd8f4fb, map: fallFrontTex, roughness: 0.15, emissive: 0x2a6f86, emissiveIntensity: 0.45, side: THREE.DoubleSide });
  const foamWhite = std({ color: 0xeefcff, map: foamTex, alphaMap: foamTex, roughness: 0.6, emissive: 0x3d7f94, emissiveIntensity: 0.55 });
  const foamDisk = std({ color: 0xe6fbff, map: foamDiskTex, roughness: 0.55, emissive: 0x2c6a80, emissiveIntensity: 0.5, side: THREE.DoubleSide });
  if (opaqueWater) { fallFront.color.setHex(0x5aa6c4); }
  else { fallFront.transparent = true; fallFront.opacity = 0.5; fallFront.depthWrite = false; }
  for (const m of [foamWhite, foamDisk]) { m.transparent = true; m.depthWrite = false; m.opacity = m === foamWhite ? 0.92 : 0.85; }
  return {
    masonry: std({ color: 0xb9b8b2, map: granite.map, bumpMap: granite.bump, bumpScale: 0.03, roughness: 0.74, metalness: 0.02, vertexColors: true }),
    mortar: std({ color: 0x1f2a30, roughness: 0.95, metalness: 0.0 }),
    flagstone: std({ color: 0xb3bfc2, map: flag.map, bumpMap: flag.bump, bumpScale: 0.06, roughness: 0.58, metalness: 0.03, vertexColors: true }),
    waterfallFront: fallFront,
    foamWhite, foamDisk,
    'Wet slate stone': std({ color: 0xa7b8b8, map: slateTex, bumpMap: slateBump, bumpScale: 0.045, roughness: 0.48, metalness: 0.04, vertexColors: true }),   // 濡れた暗い石板
    'Ancient inlay': std({ color: 0xad8c4a, roughness: 0.42, metalness: 0.55, emissive: 0x2a1c06, emissiveIntensity: 0.6 }),
    'Deep cavern rock': std({ color: 0xb0b4af, map: rockTex, bumpMap: rockBump, bumpScale: 0.065, roughness: 0.96, metalness: 0.0, vertexColors: true }),
    'Pale mineral stone': std({ color: 0xc3c9c5, map: paleTex, bumpMap: paleBump, bumpScale: 0.055, roughness: 0.57, metalness: 0.02, vertexColors: true }),  // 淡い鉱物の石
    'Glowing cyan crystal': std({ color: 0x6ad0e7, roughness: 0.18, metalness: 0.1, emissive: 0x1aa6e0, emissiveIntensity: 0.75 }),  // 控えめな発光
    'Deep blue crystal': std({ color: 0x3863e0, roughness: 0.2, metalness: 0.1, emissive: 0x1a2f8a, emissiveIntensity: 0.6 }),
    'Violet danger crystal': std({ color: 0x735ba4, roughness: 0.25, metalness: 0.05, emissive: 0x5a1a90, emissiveIntensity: 0.9 }), // 紫＝危険
    'Clear blue water': water,
    'Water foam': foam,
    'Aquatic dark teal': std({ color: 0x1d7563, roughness: 0.62, metalness: 0.0 }),
    ceiling: std({ color: 0x98a6a6, map: ceilTex, bumpMap: ceilBump, bumpScale: 0.05, roughness: 0.95, metalness: 0.0, emissive: 0x253f4a, emissiveIntensity: 0.12, vertexColors: true, side: THREE.DoubleSide }),   // 下向きの面は環境光が弱いので少し自発光
    bed: std({ color: 0x122a3a, roughness: 0.6, metalness: 0.0 }),                                // 水底・床板のすき間
    waterfall: fall,
  };
}
// タイル境界で繰り返せる周期関数と決定論的な粒子を合成する。
// 周期境界を持つ多段の値ノイズ。正弦波だけの規則的な岩肌模様を避ける。
function periodicNoise(x, y, period, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const h = (a, b) => rnd((((a % period) + period) % period) * 173
    + (((b % period) + period) % period) * 379 + seed * 109);
  const a = h(ix, iy) * (1 - sx) + h(ix + 1, iy) * sx;
  const b = h(ix, iy + 1) * (1 - sx) + h(ix + 1, iy + 1) * sx;
  return a * (1 - sy) + b * sy;
}
function stoneTexture(size, seed, slate) {
  const tex = tileTexture(size, (c, n) => {
    const image = c.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = x / n, v = y / n;
      const macro = periodicNoise(u * 4, v * 4, 4, seed);
      const middle = periodicNoise(u * 16, v * 16, 16, seed + 17);
      const fine = periodicNoise(u * 64, v * 64, 64, seed + 29);
      const strata = slate
        ? Math.sin(v * Math.PI * 24 + (macro - 0.5) * 4) * 8
        : Math.sin(v * Math.PI * 10 + (middle - 0.5) * 2) * 3;
      const value = Math.max(70, Math.min(225,
        145 + (macro - 0.5) * 76 + (middle - 0.5) * 37
        + (fine - 0.5) * 16 + strata));
      const damp = Math.max(0, Math.min(1, (macro - 0.42) * 2));
      const i = (y * n + x) * 4;
      image.data[i] = value * (slate ? 0.78 : 0.85);
      image.data[i + 1] = value * (0.88 + damp * 0.06);
      image.data[i + 2] = value * (0.93 + damp * 0.05);
      image.data[i + 3] = 255;
    }
    c.putImageData(image, 0, 0);
  });
  tex.anisotropy = 4;
  return tex;
}
// 石材の表面：細かい粒・斑点・薄い霜。1枚 2.4m を細かく繰り返す前提の高周波テクスチャ
function graniteTexture(n, seed) {
  const values = new Float32Array(n * n);
  const map = tileTexture(n, (c) => {
    const img = c.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = x / n, v = y / n;
      const m = periodicNoise(u * 6, v * 6, 6, seed), f = periodicNoise(u * 24, v * 24, 24, seed + 5);
      const ff = periodicNoise(u * 96, v * 96, 96, seed + 9);
      const sp = rnd(x * 7.13 + y * 131.7 + seed), speck = sp > 0.982 ? 34 : sp < 0.02 ? -26 : 0;
      const val = Math.max(60, Math.min(235, 150 + (m - 0.5) * 22 + (f - 0.5) * 30 + (ff - 0.5) * 38 + speck));
      const frost = Math.max(0, (m - 0.62) * 2.2);
      values[y * n + x] = val;
      const i = (y * n + x) * 4;
      img.data[i] = val * (0.9 + frost * 0.1); img.data[i + 1] = val * (0.95 + frost * 0.08); img.data[i + 2] = val * (1.0 + frost * 0.1); img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  });
  map.repeat.set(2.2, 2.2); map.anisotropy = 4;
  const bump = map.clone(); bump.colorSpace = THREE.NoColorSpace; bump.needsUpdate = true;
  return { map, bump };
}
// 不揃いな敷石（周期境界つきボロノイ）。G×G 個の石が 1 枚（2.4m）に入る
function flagstoneTextures(n, G, seed) {
  const pts = [];
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) pts.push([(i + 0.18 + 0.64 * rnd(seed + i * 31 + j * 57)) / G, (j + 0.18 + 0.64 * rnd(seed + i * 91 + j * 13 + 7)) / G, rnd(seed + i * 7 + j * 131), rnd(seed + i * 17 + j * 37 + 3)]);
  const hmap = new Uint8ClampedArray(n * n);
  const map = tileTexture(n, (c) => {
    const img = c.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = x / n, v = y / n, ci = Math.floor(u * G), cj = Math.floor(v * G);
      let d1 = 9, d2 = 9, best = null;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = ci + di, jj = cj + dj, wi = ((ii % G) + G) % G, wj = ((jj % G) + G) % G, p = pts[wj * G + wi];
        const px = p[0] + (ii - wi) / G, py = p[1] + (jj - wj) / G, d = Math.hypot(u - px, v - py);
        if (d < d1) { d2 = d1; d1 = d; best = p; } else if (d < d2) d2 = d;
      }
      const e = (d2 - d1) * G;                                      // 継ぎ目からの距離（石1個分を1とする）
      const stone = THREE.MathUtils.smoothstep(e, 0.025, 0.11);
      const grain = periodicNoise(u * 48, v * 48, 48, seed + 11) - 0.5, broad = periodicNoise(u * 8, v * 8, 8, seed + 19) - 0.5;
      const tone = 0.74 + best[2] * 0.3 + grain * 0.14 + broad * 0.1;
      const val = Math.max(30, Math.min(235, (78 + stone * (tone * 165 - 78))));
      const wet = best[3] > 0.78 ? 0.86 : 1;                      // ところどころ濡れて暗い石
      const i = (y * n + x) * 4;
      img.data[i] = val * 0.9 * wet; img.data[i + 1] = val * 0.97 * wet; img.data[i + 2] = val * 1.02 * wet; img.data[i + 3] = 255;
      hmap[y * n + x] = 40 + stone * 170 + grain * 40;
    }
    c.putImageData(img, 0, 0);
  });
  map.anisotropy = 4;
  const bump = tileTexture(n, (c) => { const img = c.createImageData(n, n); for (let k = 0; k < n * n; k++) { img.data[k * 4] = img.data[k * 4 + 1] = img.data[k * 4 + 2] = hmap[k]; img.data[k * 4 + 3] = 255; } c.putImageData(img, 0, 0); });
  bump.colorSpace = THREE.NoColorSpace;
  return { map, bump };
}
// 泡：まだらな白（alphaMap にも使う）
function foamNoiseTexture(n, seed) {
  return tileTexture(n, (c) => {
    const img = c.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = x / n, v = y / n;
      const a = periodicNoise(u * 8, v * 8, 8, seed) * 0.6 + periodicNoise(u * 24, v * 24, 24, seed + 3) * 0.4;
      const val = Math.round(255 * THREE.MathUtils.smoothstep(a, 0.32, 0.62));
      const i = (y * n + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = val; img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  });
}
// 滝壺の泡の輪：中心が濃く、外へ向かって放射状にほどける
function foamDiskTexture(n, seed) {
  const t = tileTexture(n, (c) => {
    const img = c.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = x / n - 0.5, dy = y / n - 0.5, r = Math.hypot(dx, dy) * 2, ang = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
      const streak = periodicNoise(ang * 24, r * 5, 24, seed) * 0.65 + periodicNoise(ang * 64, r * 12, 64, seed + 7) * 0.35;
      const fall = Math.max(0, 1 - r); const a = Math.max(0, Math.min(1, fall * 1.6 * (0.35 + streak) - 0.12));
      const i = (y * n + x) * 4; img.data[i] = 230; img.data[i + 1] = 248; img.data[i + 2] = 255; img.data[i + 3] = Math.round(a * 255);
    }
    c.putImageData(img, 0, 0);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.center.set(0.5, 0.5);
  return t;
}
// 天井の起伏（世界座標）。天井そのものと、天井に付ける氷柱・結晶の高さで共有し、浮いて見えないようにする
function ceilRelief(wx, wz) {
  return 0.52
    + 0.27 * Math.sin(wx * 0.37 + 0.7) * Math.cos(wz * 0.42 + 0.3)
    + 0.16 * Math.sin(wx * 0.83 + wz * 0.56)
    + 0.075 * Math.cos(wx * 1.91 - wz * 1.47)
    + 0.09 * Math.pow(Math.abs(Math.sin(wx * 0.72 - wz * 0.83)), 9);
}
const ceilY = (wx, wz) => 4 - ceilRelief(wx, wz);
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function blob(c, s, x, y, r, col) {
  for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
    const gr = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(x + ox, y + oy, r, 0, Math.PI * 2); c.fill();
  }
}
function tileTexture(s, draw) {
  const cv = document.createElement('canvas'); cv.width = cv.height = s; draw(cv.getContext('2d'), s);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ------------------------------------------------------------
   GLB を部品に分ける
   GLB は Z が上（trimesh の書き出し）で、頂点はシーン全体の位置に焼き込まれている。
   → Y が上に回し、部品ごとに「底面の中心」が原点になるよう移す。
   ------------------------------------------------------------ */
const Z_UP_TO_Y_UP = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
function prepGeo(geo, keepUv) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && !(keepUv && k === 'uv')) g.deleteAttribute(k);
  g.computeVertexNormals();   // 面ごとの法線（GLB には位置しか無い）
  return g;
}
// parts: [{ geo, mat }] を、底面の中心が原点になるよう移した部品にする
function makePiece(name, parts, opts = {}) {
  const box = new THREE.Box3(); for (const p of parts) { p.geo.computeBoundingBox(); box.union(p.geo.boundingBox); }
  const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const off = new THREE.Matrix4().makeTranslation(-c.x, -(opts.keepY ? 0 : box.min.y), -c.z);
  return { name, size: sz, parts: parts.map((p) => ({ geo: p.geo.clone().applyMatrix4(off), mat: p.mat, tag: p.tag })) };
}
// v8 の造形を迷宮の装飾部品として再利用する。旧GLBのマップ用キットは維持する。
// v8 は洞窟全体の座標に配置されているため、各メッシュを独立して原点に戻す。
const B2_V8_GLB = './assets/b2_cavern_v8.glb';
let v8DecorationsPromise = null;
async function loadV8Decorations() {
  // 同じセッションで階層を行き来しても5MB超のGLBを繰り返し解析しない。
  if (v8DecorationsPromise) return v8DecorationsPromise;
  v8DecorationsPromise = parseV8Decorations().catch((err) => {
    v8DecorationsPromise = null; // 一時的なネットワーク障害から再試行できる
    throw err;
  });
  return v8DecorationsPromise;
}
async function parseV8Decorations() {
  const gltf = await new GLTFLoader().loadAsync(B2_V8_GLB);
  gltf.scene.updateMatrixWorld(true);
  const result = { rocks: [], crystals: [], stalagmites: [], ceilingIce: [], erosion: [] };
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const rock = /^23_/.test(o.name), crystal = /^07_crystal_/.test(o.name);
    const stalagmite = /^04_stalagmite_/.test(o.name), ceilingIce = /^26_ceiling_ice_/.test(o.name);
    const erosion = /^06_erosion_rock_/.test(o.name);
    if (!rock && !crystal && !stalagmite && !ceilingIce && !erosion) return;
    const target = rock ? result.rocks : crystal ? result.crystals : stalagmite ? result.stalagmites : ceilingIce ? result.ceilingIce : result.erosion;
    if (target.length >= 12) return;
    const geo = o.geometry.clone().applyMatrix4(o.matrixWorld).applyMatrix4(Z_UP_TO_Y_UP);
    // 元のテクスチャ座標は保持しない。ゲーム側の既存マテリアルを適用する。
    const prepared = prepGeo(geo, false);
    if (prepared !== geo) geo.dispose();
    const piece = makePiece(o.name, [{ geo: prepared,
      mat: (crystal || ceilingIce) ? 'Glowing cyan crystal' : 'Deep cavern rock', tag: o.name }]);
    // v8の造形の個体差を残しつつ、迷宮の一マスに収まるサイズに統一する。
    const maxSide = Math.max(piece.size.x, piece.size.z, 0.01);
    const height = Math.max(piece.size.y, 0.01);
    const scale = Math.min((rock || erosion ? 1.1 : 0.65) / maxSide, (rock || erosion ? 0.85 : 1.15) / height);
    for (const p of piece.parts) p.geo.scale(scale, scale, scale);
    piece.size.multiplyScalar(scale);
    prepared.dispose(); // makePiece が複製済みのため一時ジオメトリは解放
    target.push(piece);
  });
  if (!result.rocks.length || !result.crystals.length) throw new Error('v8 装飾部品を検出できません');
  return result;
}

/* ------------------------------------------------------------
   ユーザー承認済みの第2階層素材（GPT/Blender 制作の単体GLB）
   ・柱V3（assets/models/floor2/README.md）・凍った祭壇・石造遺跡V4・橋の氷岸V11
   ・GLB は Y が上・原点が底面中央（Blender 書き出し）。素材ごとに1つへまとめ、描画回数を抑える。
   ・どれかが読めなくても、その素材を置かないだけで画面は壊さない。
   ------------------------------------------------------------ */
const B2_RUINS = './assets/3d/dungeons/b2_water_source/models/stone_ruins_v4/';
const B2_BANKS = './assets/models/floor2/ice-bridge-banks/v11/';
const B2_APPROVED = {
  pillarAncient: './assets/models/floor2/b2-ancient-pillar-v3.glb',
  pillarRuined: './assets/models/floor2/b2-ruined-pillar-v3.glb',
  pillarGlaciated: './assets/models/floor2/b2-glaciated-pillar-v3.glb',
  altar: './assets/models/floor2/b2-frozen-ancient-altar.glb',
  parapet: B2_RUINS + 'broken_parapet.glb',
  fallen: B2_RUINS + 'fallen_pillar.glb',
  spire: B2_RUINS + 'embedded_spire.glb',
  rubble: B2_RUINS + 'rubble_ice_scatter.glb',
  bankL: B2_BANKS + 'ice_bridge_left_v11_smooth_depth.glb',
  bankR: B2_BANKS + 'ice_bridge_right_v11_smooth_depth.glb',
};
let approvedPromise = null;
function loadApproved() {
  if (approvedPromise) return approvedPromise;
  approvedPromise = (async () => {
    const loader = new GLTFLoader(), out = { mats: {} };
    await Promise.all(Object.entries(B2_APPROVED).map(async ([id, url]) => {
      try { const gltf = await loader.loadAsync(url); out[id] = glbToPiece(id, gltf.scene, out.mats); }
      catch (err) { console.warn('[B2] approved asset unavailable:', id, err); out[id] = null; }
    }));
    return out;
  })();
  return approvedPromise;
}
// 透過（transmission）は描画が重いので、通常の半透明の氷に置き換える
// 素材ごとの明るさ合わせ：白いレンダー用の石色が、冷たい照明の洞窟で白く飛ばないように
const GLB_TINT = { parapet: 0.5, fallen: 0.55, spire: 0.55, rubble: 0.5, pillarAncient: 0.78, pillarRuined: 0.78, pillarGlaciated: 0.82, altar: 0.74 };
function convertGlbMaterial(src, id) {
  const c = src?.color ? src.color.clone() : new THREE.Color(0x8899aa);
  if (GLB_TINT[id] && !((src?.transmission || 0) > 0)) c.multiply(new THREE.Color(GLB_TINT[id] * 0.96, GLB_TINT[id], GLB_TINT[id] * 1.06));
  const trans = (src?.transmission || 0) > 0;
  const m = new THREE.MeshStandardMaterial({
    color: c, roughness: Math.max(0.3, Math.min(1, src?.roughness ?? 0.8)), metalness: Math.min(0.2, src?.metalness ?? 0),
    emissive: src?.emissive ? src.emissive.clone() : new THREE.Color(0), emissiveIntensity: Math.min(2.5, src?.emissiveIntensity ?? 1),
  });
  if (trans) { m.transparent = true; m.opacity = 0.84; m.roughness = 0.22; m.emissive = c.clone().multiplyScalar(0.22); m.emissiveIntensity = 1; }
  else if (m.emissive.getHex() === 0) { m.emissive = c.clone().multiplyScalar(0.07); m.emissiveIntensity = 1; }   // 暗い洞窟でも石の明るさが読めるように少しだけ
  m.name = src?.name || 'glb';
  return m;
}
function glbToPiece(id, scene, matStore) {
  scene.updateMatrixWorld(true);
  const byMat = new Map();
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const src = Array.isArray(o.material) ? o.material[0] : o.material;
    const key = `glb:${id}:${src?.name || 'm'}`;
    if (!matStore[key]) matStore[key] = convertGlbMaterial(src, id);
    const src0 = new THREE.BufferGeometry();
    if (o.geometry.index) src0.setIndex(o.geometry.index.clone());
    for (const k of ['position', 'normal']) {   // インターリーブ属性も通常の属性へ（mergeGeometries 用）
      const at = o.geometry.attributes[k]; if (!at) continue;
      src0.setAttribute(k, at.isInterleavedBufferAttribute ? at.clone() : at.clone());
    }
    const geo = src0.index ? src0.toNonIndexed() : src0;
    if (geo !== src0) src0.dispose();
    geo.morphAttributes = {};
    geo.applyMatrix4(o.matrixWorld);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!byMat.has(key)) byMat.set(key, []);
    byMat.get(key).push(geo);
  });
  const parts = [];
  for (const [key, list] of byMat) {
    const merged = list.length > 1 ? mergeGeometries(list, false) : list[0];
    if (list.length > 1) for (const gg of list) gg.dispose();
    if (merged) parts.push({ geo: merged, mat: key, tag: id });
  }
  if (!parts.length) throw new Error('empty GLB ' + id);
  const box = new THREE.Box3(); for (const p of parts) { p.geo.computeBoundingBox(); box.union(p.geo.boundingBox); }
  return { name: id, size: box.getSize(new THREE.Vector3()), min: box.min.clone(), max: box.max.clone(), parts };
}

async function loadKit() {
  const gltf = await new GLTFLoader().loadAsync(B2_GLB);
  const meshes = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => { if (o.isMesh) meshes.push({ name: o.name, geo: o.geometry.clone().applyMatrix4(o.matrixWorld).applyMatrix4(Z_UP_TO_Y_UP), mat: o.material?.name || '' }); });
  if (meshes.length < 50) throw new Error(`b2 GLB のメッシュが少なすぎる（${meshes.length}）`);
  const by = (re) => meshes.filter((m) => re.test(m.name));
  const idx = (n, re) => Number((n.match(re) || [])[1]);
  const asParts = (list, keepUv) => list.map((m) => ({ geo: prepGeo(m.geo, keepUv), mat: m.mat, tag: m.name }));
  const used = new Set();
  const take = (list) => { list.forEach((m) => used.add(m.name)); return list; };
  const kit = {};
  kit.slabs = take(by(/^Floor_Slab_/)).map((m) => makePiece(m.name, asParts([m]), { keepY: true }));     // 上面 y≈0 のまま
  kit.inlays = take(by(/^Floor_Inlay_/)).map((m) => makePiece(m.name, asParts([m])));
  kit.boulders = take(by(/^Cavern_Wall_Boulder_/)).map((m) => makePiece(m.name, asParts([m])));
  kit.rocks = take(by(/^Foreground_Rock_/)).map((m) => makePiece(m.name, asParts([m])));
  // 結晶の群れ：台座 Crystal_Base_i と 結晶 Crystal_Outcrop_i_j を i でまとめる
  const bases = take(by(/^Crystal_Base_/)), outs = take(by(/^Crystal_Outcrop_/));
  kit.crystals = bases.map((b) => { const i = idx(b.name, /^Crystal_Base_(\d+)/); return makePiece(`Crystal_Cluster_${i}`, asParts([b, ...outs.filter((o) => idx(o.name, /^Crystal_Outcrop_(\d+)_/) === i)])); });
  kit.shards = outs.map((m) => makePiece(m.name, asParts([m])));   // 天井から下がる結晶（1本ずつ）
  // 荊：茎・葉・紫のとげを i でまとめる
  const thorn = take(by(/^Thorn_(Stem|Leaf|Hazard_Spine)_/));
  const thornIds = [...new Set(thorn.map((m) => idx(m.name, /^Thorn_(?:Stem|Leaf|Hazard_Spine)_(\d+)_/)))];
  kit.thorns = thornIds.map((i) => makePiece(`Thorn_Plant_${i}`, asParts(thorn.filter((m) => idx(m.name, /^Thorn_(?:Stem|Leaf|Hazard_Spine)_(\d+)_/) === i))));
  // 鉱脈：Mineral_Vein_i_j を i でまとめる（壁の面に貼る）
  const veins = take(by(/^Mineral_Vein_/)), veinIds = [...new Set(veins.map((m) => idx(m.name, /^Mineral_Vein_(\d+)_/)))];
  kit.veins = veinIds.map((i) => makePiece(`Mineral_Vein_${i}`, asParts(veins.filter((m) => idx(m.name, /^Mineral_Vein_(\d+)_/) === i))));
  kit.arch = makePiece('Ancient_Arch', asParts(take(by(/^(Ancient_Arch_|Arch_Keystone|Arch_Central_Prism)/))));
  take(by(/^Water_Gate_/));
  { // 格子は枠と同じ原点で別に持つ（開くときに格子だけ上げる）
    const frame = asParts(by(/^Water_Gate_(Pillar|Rune)/)), bars = asParts(by(/^Water_Gate_Bar/));
    const box = new THREE.Box3(); for (const p of [...frame, ...bars]) { p.geo.computeBoundingBox(); box.union(p.geo.boundingBox); }
    const c = box.getCenter(new THREE.Vector3()), off = new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z);
    kit.gate = { frame: frame.map((p) => ({ ...p, geo: p.geo.applyMatrix4(off) })), bars: bars.map((p) => ({ ...p, geo: p.geo.applyMatrix4(off) })), size: box.getSize(new THREE.Vector3()) };
  }
  kit.bridge = makePiece('Broken_Bridge', asParts(take(by(/^(Broken_Bridge_Stone|Bridge_Support)/))), { keepY: true });
  { // 滝：水の帯（UV を付けて流す）と泡
    const sheets = take(by(/^Waterfall_Sheet/)).map((m) => ({ geo: planarUv(prepGeo(m.geo, false)), mat: 'waterfall', tag: m.name }));
    const foam = asParts(take(by(/^Waterfall_Foam/)));
    kit.waterfall = makePiece('Waterfall', [...sheets, ...foam]);
  }
  kit.ripples = take(by(/^Water_Ripple_Ring/)).map((m) => makePiece(m.name, asParts([m])));
  take(by(/^Water_Plane_Transparent/));   // 水面は水たまりの形に合わせて作るので、素材（Clear blue water）だけを使う
  kit.omitted = meshes.filter((m) => !used.has(m.name)).map((m) => m.name);
  kit.meshCount = meshes.length;
  return kit;
}
// 縦の帯に UV を付ける（x 方向＝u、高さ＝v）
function planarUv(geo) {
  geo.computeBoundingBox(); const b = geo.boundingBox, p = geo.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) - b.min.x) / Math.max(1e-3, b.max.x - b.min.x); uv[i * 2 + 1] = (p.getY(i) - b.min.y) / Math.max(1e-3, b.max.y - b.min.y); }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
}

/* ------------------------------------------------------------
   手続き型の部品（GLB に無い「迷宮の壁・天井・水底」。素材は GLB の物を使う）
   ------------------------------------------------------------ */
function makeProcedural() {
  const smoothRock = (geo) => { const src = geo.clone(); src.deleteAttribute('normal'); const g = mergeVertices(src, 1e-3); g.computeVertexNormals(); return g; };
  // 壁：石積み（1個ずつの石材）。旧版のぼやけた岩肌の大きな板を置き換える。
  // 石の段・目地の位置は「壁の平面ごとの世界座標」から決めるので、隣り合う壁マスで石積みがつながる。
  // ローカル +Z が通路側。石は壁の面から 0.03〜0.22m だけ張り出す（通行判定には関係しない）。
  const masonryWall = (ex, ez, yaw, cell) => {
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    const uc = ex * cs - ez * sn;                         // 壁に沿う向きの世界座標（マスの中心）
    const plane = Math.round((ex * sn + ez * cs) * 4) + Math.round(yaw * 10) * 1000;   // 壁の平面の番号
    const half = cell / 2 + 0.06, u0 = uc - half, u1 = uc + half;
    const blocks = [];
    let y = -0.05, r = 0;
    while (y < 4.25) {
      const rowH = r === 0 ? 0.42 : 0.40 + 0.24 * rnd(plane * 0.131 + r * 7.7);
      const W = 0.85 + 0.4 * rnd(plane * 0.033 + r * 1.9);
      const shift = rnd(plane * 0.051 + r * 11.3) * W;
      const bnd = (k) => shift + k * W + (rnd(plane * 0.173 + r * 31.7 + k * 3.71) - 0.5) * W * 0.42;
      const k0 = Math.floor((u0 - shift) / W) - 1, k1 = Math.ceil((u1 - shift) / W) + 1;
      for (let k = k0; k < k1; k++) {
        let a = bnd(k), b = bnd(k + 1);
        if (b <= u0 || a >= u1) continue;
        a = Math.max(a, u0); b = Math.min(b, u1);
        const gap = 0.045, w = b - a - gap; if (w < 0.1) continue;
        const sd = plane * 0.37 + r * 13.1 + k * 7.3;
        const recessed = r > 0 && rnd(sd + 1) < 0.05;
        const depth = r === 0 ? 0.24 : 0.07 + 0.12 * rnd(sd + 2);
        const bh = rowH - gap;
        const box = new THREE.BoxGeometry(w, bh, depth + 0.08);
        box.rotateY((rnd(sd + 5) - 0.5) * 0.05); box.rotateX((rnd(sd + 6) - 0.5) * 0.04);
        box.translate((a + b) / 2 - uc, y + rowH / 2, (depth + 0.08) / 2 - 0.08 - (recessed ? 0.06 : 0));
        // 石ごとの色の違い：青灰〜灰。下の段は濡れて暗く、ときどき霜で白い石
        let tone = 0.56 + 0.46 * rnd(sd + 3);
        if (y < 0.7) tone *= 0.82;
        const frost = rnd(sd + 4) < 0.1 && y > 0.6;
        const warm = rnd(sd + 7) < 0.3 ? 1.06 : 1;   // ところどころ鉄分で少し暖かい色の石
        const cr = tone * (frost ? 1.12 : 0.95 * warm), cg = tone * (frost ? 1.17 : 0.97), cb = tone * (frost ? 1.28 : 1.0 / warm);
        const n = box.attributes.position.count, col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) col.set([cr, cg, cb], i * 3);
        box.setAttribute('color', new THREE.BufferAttribute(col, 3));
        box.deleteAttribute('uv');
        blocks.push(box);
      }
      y += rowH; r++;
    }
    const merged = mergeGeometries(blocks, false); for (const bgeo of blocks) bgeo.dispose();
    const back = new THREE.PlaneGeometry(cell + 0.12, 4.4).translate(0, 2.1, -0.02);
    back.deleteAttribute('uv');
    return { name: 'masonry_wall', transient: true, parts: [{ geo: back, mat: 'mortar' }, { geo: merged, mat: 'masonry' }] };
  };
  // 世界座標で天井の起伏を生成し、隣接セル間で位相と高さを一致させる（ceilRelief を氷柱の高さと共有）。
  const continuousCeiling = (worldX, worldZ, cell) => {
    const geo = new THREE.PlaneGeometry(cell, cell, 16, 16).rotateX(Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, -ceilRelief(worldX + pos.getX(i), worldZ + pos.getZ(i)));
    geo.computeVertexNormals();
    return { name: 'continuous_cavern_ceiling', transient: true,
      parts: [{ geo, mat: 'ceiling' }] };
  };
  // 自然石の床：格子状の石板が無限に繰り返される印象を緩和する。
  // マス境界の高さは0に収束させ、隣接マスに隙間を作らない。
  // 水際の自然な堆積：薄い岩棚と小石を、水のあるマスに面した陸側だけに敷く。
  // 当たり判定に影響させず、石板と水面が直角に切れる見た目を緩和する。
  // 天井から下がる小さな岩の稜線。プレイヤーの視界を遮らない高所だけに配置。
  const ceilingRidge = [0, 1, 2].map((variant) => {
    const g = new THREE.ConeGeometry(0.27 + variant * 0.09, 0.65 + variant * 0.21, 7, 4);
    g.rotateX(Math.PI);
    g.translate(0, -0.33 - variant * 0.105, 0);
    return { name: 'b2_ceiling_ridge_' + variant,
      parts: [{ geo: g, mat: 'Deep cavern rock' }] };
  });
  // 天井の氷柱。円錐ではなく細長い多面体にして、冷たい水源らしい輪郭を作る。
  const iceStalactites = [0, 1, 2].map((variant) => {
    const height = 0.75 + variant * 0.25;
    const geo = new THREE.ConeGeometry(0.13 + variant * 0.035, height, 6, 1);
    geo.rotateX(Math.PI);
    geo.translate(0, -height * 0.5, 0);
    return { name: 'b2_ice_stalactite_' + variant,
      parts: [{ geo, mat: 'Pale mineral stone' }] };
  });
  // 浅瀬の壁際に張り出す氷結した岩棚。小さな多面体を組み合わせ、
  // 水面の水平線と直線的な壁の接点を自然に見せる（通行判定なし）。
  const frostLedges = [0, 1, 2].map((variant) => {
    const parts = [];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.DodecahedronGeometry(0.52 + i * 0.12 + variant * 0.035, 0);
      g.scale(1.15 + i * 0.14, 0.20 + variant * 0.035, 0.53 + i * 0.09);
      g.rotateY((i - 1) * 0.24 + variant * 0.17);
      g.translate((i - 1) * 0.68, -0.12 + i * 0.045, (i % 2) * 0.14);
      parts.push({ geo: g, mat: i === 1 ? 'Pale mineral stone' : 'Deep cavern rock' });
    }
    return { name: 'b2_frost_ledge_' + variant, parts };
  });
  // 壁の中腹に張り出す氷結岩塊。低ポリゴンの多面体を複合し、箱型通路の輪郭を崩す。
  // ローカル+Zが通路側。壁からの突出は約0.3mに抑え、歩行空間を確保する。
  const wallOutcrops = [0, 1, 2].map((variant) => {
    const parts = [];
    const count = 3 + variant;
    for (let j = 0; j < count; j++) {
      const geo = new THREE.IcosahedronGeometry(1, 1);
      const width = 0.55 + 0.16 * ((j + variant) % 3);
      const height = 0.52 + 0.18 * ((j * 2 + variant) % 3);
      geo.scale(width, height, 0.22 + 0.06 * (j % 2));
      geo.rotateZ((j % 2 ? -1 : 1) * (0.18 + 0.07 * variant));
      geo.translate((j - (count - 1) / 2) * 0.49,
        (j % 2 ? 0.12 : -0.13) + 0.08 * variant, -0.12);
      parts.push({ geo, mat: j % 3 === 0 ? 'Pale mineral stone' : 'Deep cavern rock' });
    }
    return { name: 'b2_wall_outcrop_' + variant, parts };
  });
  // 壁と天井の境界に生える氷結した岩の庇。小さな多面体を重ねて箱状の角を隠す。
  // 視界を塞がないよう上部0.7mに限定し、壁際へ寄せて配置する。
  const frostCornices = [0, 1, 2].map((variant) => {
    const parts = [];
    for (let j = 0; j < 3; j++) {
      const width = 0.40 + 0.13 * ((j + variant) % 3);
      const g = new THREE.IcosahedronGeometry(1, 0);
      g.scale(width, 0.19 + j * 0.035, 0.25 + (variant % 2) * 0.09);
      g.rotateZ(0.15 * (j - 1));
      g.translate((j - 1) * 0.52, -0.11 - j * 0.045, 0.02 + (j % 2) * 0.10);
      parts.push({ geo: g, mat: j === 1 ? 'Pale mineral stone' : 'Deep cavern rock' });
    }
    const ice = new THREE.ConeGeometry(0.13 + variant * 0.025, 0.38 + variant * 0.11, 5, 1);
    ice.rotateX(Math.PI);
    ice.translate(0.32 - variant * 0.24, -0.38, 0.15);
    parts.push({ geo: ice, mat: 'Glowing cyan crystal' });
    return { name: 'b2_frost_cornice_' + variant, parts };
  });
  // 壁面に埋まった薄い氷脈。独立した小物を増やすのではなく、
  // 不規則な鉱脈の輪郭を壁そのものに重ねて四角い壁面を崩す。
  // 薄い奥行き・低ポリゴンで、既存の静的バッチへ統合する。
  const frostVeins = [0, 1, 2].map((variant) => {
    const parts = [];
    const count = 3 + variant;
    for (let j = 0; j < count; j++) {
      const length = 0.72 + 0.24 * ((j + variant) % 3);
      const width = 0.095 + 0.035 * ((j * 2 + variant) % 3);
      const g = new THREE.OctahedronGeometry(1, 0);
      g.scale(width, length * 0.5, 0.075);
      g.rotateZ((j - count / 2) * 0.23 + variant * 0.12);
      g.translate((j - (count - 1) / 2) * 0.27, (j % 2) * 0.16, 0);
      parts.push({ geo: g, mat: j % 3 === 0 ? 'Pale mineral stone' : 'Deep cavern rock' });
    }
    return { name: 'b2_frost_vein_' + variant, parts };
  });
  // 湿った岩棚に群生する発光菌。低いシルエットで視界と移動経路を保つ。
  // 既存のメッシュ統合を利用し、個別のライトやアニメーションは追加しない。
  const glowFungi = [0, 1, 2].map((variant) => {
    const parts = [];
    for (let i = 0; i < 3; i++) {
      const height = 0.22 + ((i + variant) % 3) * 0.11;
      const offsetX = (i - 1) * 0.24;
      const offsetZ = (i === 1 ? -0.12 : 0.10);
      const stem = new THREE.CylinderGeometry(0.035, 0.06, height, 5);
      stem.translate(offsetX, height / 2, offsetZ);
      parts.push({ geo: stem, mat: 'Aquatic dark teal' });
      const cap = new THREE.SphereGeometry(0.16 + (i % 2) * 0.05, 7, 4);
      cap.scale(1, 0.32, 1);
      cap.translate(offsetX, height + 0.025, offsetZ);
      parts.push({ geo: cap, mat: 'Glowing cyan crystal' });
    }
    return { name: 'b2_glow_fungi_' + variant, parts };
  });
  const shoreline = [0, 1, 2].map((variant) => {
    const g = new THREE.PlaneGeometry(3.92, 0.84, 24, 6).rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const outer = Math.max(0, 1 - Math.abs(x) / 1.96);
      const wav = Math.sin(x * 2.7 + variant * 1.7) * 0.055
        + Math.sin(x * 6.8 + variant * 2.4) * 0.018;
      p.setY(i, -0.018 + wav * outer);
      p.setZ(i, z + Math.sin(x * 2.2 + variant) * 0.065 * outer);
    }
    g.computeVertexNormals();
    return { name: 'b2_shoreline_' + variant, parts: [{ geo: g, mat: 'Pale mineral stone' }] };
  });
  // 隣接する床マスで高さが一致する世界座標ベースの岩盤。
  // マス境界で起伏をゼロに戻さないため、正方形パッチの継ぎ目が目立たない。
  const continuousGround = (worldX, worldZ, cell) => {
    const g = new THREE.PlaneGeometry(cell, cell, 12, 12).rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const wx = worldX + p.getX(i), wz = worldZ + p.getZ(i);
      // 敷石の床なので起伏はごく小さく（旧 0.14m → 0.04m）。継ぎ目のない1枚の面として並べる
      const y = 0.022 * Math.sin(wx * 0.47) * Math.cos(wz * 0.39)
        + 0.012 * Math.sin(wx * 1.14 + wz * 0.58)
        + 0.006 * Math.cos(wx * 2.37 - wz * 1.81);
      p.setY(i, y);
    }
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    return { name: 'flagstone_ground', transient: true, parts: [{ geo: g, mat: 'flagstone' }] };
  };
  // 滝：手前の水膜。落ち口から放物線を描いて前へ出る（壁の面から最大 0.75m）。x=幅、y=高さ
  const fallCurtain = (() => {
    const H = 3.95, geo = new THREE.PlaneGeometry(2.25, H, 8, 20).translate(0, H / 2, 0);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), t = Math.max(0, 1 - y / H);
      p.setX(i, x * (1 + 0.16 * t));
      p.setZ(i, 0.16 + 0.58 * Math.sqrt(Math.max(0, t)) + 0.045 * Math.sin(x * 4.2 + y * 1.3));
    }
    geo.deleteAttribute('normal'); geo.computeVertexNormals();
    return { name: 'waterfall_curtain', parts: [{ geo: planarUv(geo), mat: 'waterfallFront' }] };
  })();
  // 落ち口の岩：水の帯の上端を隠す
  const fallLip = (() => {
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.DodecahedronGeometry(0.42 + rnd(i * 3.1) * 0.22, 0);
      g.scale(1.25, 0.6 + rnd(i * 5.3) * 0.25, 0.85);
      g.translate((i - 2) * 0.62, 0.05 + rnd(i * 7.7) * 0.12, 0.22);
      parts.push({ geo: g, mat: i % 2 ? 'Pale mineral stone' : 'Deep cavern rock' });
    }
    return { name: 'waterfall_lip', parts };
  })();
  // 滝壺のわき立つ泡（tick でゆっくり脈打たせる）
  const foamMound = (() => {
    const parts = [];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.IcosahedronGeometry(0.32 + rnd(i * 2.3 + 1) * 0.26, 1);
      g.scale(1.25, 0.5 + rnd(i * 4.1) * 0.3, 1);
      g.translate((i - 3) * 0.36 + (rnd(i * 6.7) - 0.5) * 0.15, 0.0, 0.62 + rnd(i * 8.9) * 0.35);
      parts.push({ geo: g, mat: 'foamWhite' });
    }
    return { name: 'waterfall_foam_mound', parts };
  })();
  const foamDiskPiece = { name: 'waterfall_foam_disk', parts: [{ geo: new THREE.CircleGeometry(1.45, 28).rotateX(-Math.PI / 2), mat: 'foamDisk' }] };
  const bed = { name: 'water_bed', parts: [{ geo: prepGeo(new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2), false), mat: 'bed' }] };
  const pool = (w, d) => ({ name: 'water_surface', parts: [{ geo: prepGeo(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), true), mat: 'Clear blue water' }] });
  const plaque = { name: 'wall_plaque', parts: [{ geo: prepGeo(new THREE.BoxGeometry(1.1, 0.7, 0.08).translate(0, 0, 0.04), false), mat: 'Ancient inlay' }, { geo: prepGeo(new THREE.BoxGeometry(1.3, 0.9, 0.06).translate(0, 0, 0.0), false), mat: 'Pale mineral stone' }] };
  return { masonryWall, fallCurtain, fallLip, foamMound, foamDiskPiece, continuousCeiling, continuousGround, shoreline, glowFungi, frostVeins, frostCornices, wallOutcrops, frostLedges, ceilingRidge, iceStalactites, bed, poolFull: pool(4, 4), poolHalf: pool(4, 1.9), plaque };
}

/* ------------------------------------------------------------
   動かない物をまとめる（区画×種類×素材）
   ------------------------------------------------------------ */
class Batcher {
  constructor() { this.b = new Map(); }
  add(cat, piece, matrix, tx, ty) {
    const ck = `${Math.floor(tx / CHUNK)},${Math.floor(ty / CHUNK)}`;
    for (const p of piece.parts) {
      const k = `${cat}|${p.mat}|${ck}`; let e = this.b.get(k); if (!e) { e = { cat, mat: p.mat, geos: [] }; this.b.set(k, e); }
      e.geos.push(shade(p.geo.clone().applyMatrix4(matrix)));
    }
    // Per-cell procedural source geometry is no longer needed after cloning.
    if (piece.transient) for (const p of piece.parts) p.geo.dispose();
  }
  build(root, mats) {
    const groups = new Map(), made = [];
    for (const e of this.b.values()) {
      let grp = groups.get(e.cat); if (!grp) { grp = new THREE.Group(); grp.name = `b2:${e.cat}`; groups.set(e.cat, grp); root.add(grp); }
      const uv = e.geos.every((g) => g.attributes.uv);
      if (!uv) for (const g of e.geos) if (g.attributes.uv) g.deleteAttribute('uv');
      const merged = mergeGeometries(e.geos, false); if (!merged) continue;
      for (const g of e.geos) g.dispose();
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mats[e.mat] || mats['Deep cavern rock']); mesh.name = `b2:${e.cat}:${e.mat}`;
      if (mesh.material.transparent) mesh.renderOrder = 2;
      mesh.matrixAutoUpdate = false; grp.add(mesh); made.push(merged);
    }
    this.b.clear();
    return made;
  }
}
// 面ごとに明るさを少し変える（テクスチャの無い GLB でも岩肌・石板の質感が出る）。位置から決めるので毎回同じ
function shade(geo) {
  // スムーズ法線を維持したまま頂点を展開し、三角形単位の色・UVを安全に生成。
  if (geo.index) { const expanded = geo.toNonIndexed(); geo.dispose(); geo = expanded; }
  const p = geo.attributes.position, n = p.count, col = new Float32Array(n * 3);
  const prev = geo.attributes.color;   // 石積みの石ごとの色など、元の頂点色があれば掛け合わせる
  for (let i = 0; i < n; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const big = 0.5 + 0.5 * Math.sin(cx * 0.9 + cz * 0.7) * Math.sin(cy * 1.3 + cz * 0.4);
    const v = 0.88 + 0.08 * big + 0.035 * rnd(Math.floor(cx * 7.3) * 31 + Math.floor(cy * 5.1) * 17 + Math.floor(cz * 6.7));
    for (let k = 0; k < 3 && i + k < n; k++) {
      const j = i + k;
      if (prev) col.set([prev.getX(j) * v, prev.getY(j) * v, prev.getZ(j) * v * 1.03], j * 3);
      else col.set([v, v, v * 1.03], j * 3);
    }
  }
  // 部品は読み込み時にUVを持たないことがあるため、三角形の法線から
  // 支配的な投影面を選び、ワールド座標に基づくUVを与える（床・壁・天井共通）。
  // 水面/滝の既存UVは維持する。
  if (!geo.attributes.uv) {
    const uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i += 3) {
      const ax = p.getX(i + 1) - p.getX(i), ay = p.getY(i + 1) - p.getY(i), az = p.getZ(i + 1) - p.getZ(i);
      const bx = p.getX(i + 2) - p.getX(i), by = p.getY(i + 2) - p.getY(i), bz = p.getZ(i + 2) - p.getZ(i);
      const nx = Math.abs(ay * bz - az * by), ny = Math.abs(az * bx - ax * bz), nz = Math.abs(ax * by - ay * bx);
      for (let k = 0; k < 3 && i + k < n; k++) {
        const j = i + k;
        uv[j * 2] = (ny >= nx && ny >= nz ? p.getX(j) : nx >= nz ? p.getZ(j) : p.getX(j)) / 2.4;
        uv[j * 2 + 1] = (ny >= nx && ny >= nz ? p.getZ(j) : p.getY(j)) / 2.4;
      }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const M4 = (x, y, z, ry = 0, s = 1, rx = 0) => {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0, 'YXZ'));
  const sv = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, sv);
};
// 部品を three の Group にする（動く物・状態で変わる物用）
function pieceGroup(piece, mats, name) {
  const grp = new THREE.Group(); grp.name = name || piece.name;
  for (const p of piece.parts) { const m = new THREE.Mesh(shade(p.geo.clone()), mats[p.mat] || mats['Deep cavern rock']); m.name = p.tag || p.mat; if (m.material.transparent) m.renderOrder = 2; grp.add(m); }
  return grp;
}

/* ------------------------------------------------------------
   テーマ本体
   api：field-3d-view.js から渡される共通の道具（place・load・g など）
   ------------------------------------------------------------ */
export async function createTheme(api) {
  const opaqueWater = (() => { try { return localStorage.getItem(WATER_KEY) === 'opaque'; } catch (_) { return false; } })();
  // v8・承認済み素材は任意の見た目拡張。読み込み失敗時も旧B2キットで遊べる（並行して読む）。
  const [kit, v8, approved] = await Promise.all([
    loadKit(),
    loadV8Decorations().catch((err) => { console.warn('[B2] v8 decoration unavailable; using legacy kit', err); return null; }),
    loadApproved().catch((err) => { console.warn('[B2] approved assets unavailable', err); return { mats: {} }; }),
  ]);
  const proc = makeProcedural();
  const mats = Object.assign(makeMaterials(opaqueWater), approved.mats);
  const { CELL, DIR_VEC, DIR_ORDER, FACE_YAW, hash, g } = api;
  let made = [], anim = { ripples: [], mists: [], fishes: [], caustics: [], foams: [] }, root = null, last = { falls: [], bridge: null, props: {} };

  const light = (x, y, z, color, intensity, range) => g.lights.push({ pos: [x, y, z], color, intensity, range, world: new THREE.Vector3(x, y, z), off: false });
  const pick = (arr, r) => arr[Math.min(arr.length - 1, Math.floor(r * arr.length))];

  // 結晶・アーチの光（place() が拾えるよう、テンプレートに extras と同じ形で書く）
  const crystalTpl = (piece, col, inten) => { const grp = pieceGroup(piece, mats); grp.userData.b1 = { lights: [{ pos: [0, piece.size.y * 0.55, 0], color: col, intensity: inten, range: 4.5 }] }; return grp; };
  const tpl = {
    arch: (() => { const grp = pieceGroup(kit.arch, mats); grp.userData.b1 = { lights: [{ pos: [0, kit.arch.size.y * 0.8, 0], color: 0x6fe0ff, intensity: 1.0, range: 5 }] }; return grp; })(),
    switchStone: crystalTpl(kit.crystals[1] || kit.crystals[0], 0x7fdcff, 1.5),
    plaque: pieceGroup(proc.plaque, mats),
    gate: (danger) => {
      const grp = new THREE.Group(); grp.name = danger ? 'Water_Gate_Boss' : 'Water_Gate';
      for (const p of kit.gate.frame) { const m = new THREE.Mesh(shade(p.geo.clone()), mats[p.mat]); m.name = p.tag; grp.add(m); }
      const bars = new THREE.Group(); bars.name = 'Water_Gate_Bars';
      for (const p of kit.gate.bars) { const m = new THREE.Mesh(shade(p.geo.clone()), mats[p.mat]); m.name = p.tag; bars.add(m); }
      grp.add(bars);
      grp.userData.b1 = { lights: [{ pos: [0, 2.6, 0.6], color: danger ? 0xb46cff : 0x7fdcff, intensity: danger ? 1.8 : 1.2, range: 5 }] };
      return grp;
    },
  };
  tpl.gateNormal = tpl.gate(false); tpl.gateBoss = tpl.gate(true);

  function dispose() {
    for (const geo of made) geo.dispose(); made = [];
    for (const r of anim.ripples) r.mesh.material.dispose();
    for (const m of anim.mists) { m.points.geometry.dispose(); }
    for (const f of anim.fishes) f.geometry.dispose();
    for (const c of anim.caustics) { c.mesh.geometry.dispose(); c.mesh.material.dispose(); c.texture.dispose(); }
    for (const f of anim.foams) f.traverse((m) => { if (m.isMesh) m.geometry.dispose(); });
    anim = { ripples: [], mists: [], fishes: [], caustics: [], foams: [] }; root = null;
  }

  async function build(a, S, info) {
    dispose();
    const { ch, def, wallCell, facing } = info;
    const X = (tx) => tx * CELL, Z = (ty) => ty * CELL;
    const objAt = new Map(a.objects.map((o) => [`${o.tx},${o.ty}`, o]));
    const B = new Batcher();
    root = new THREE.Group(); root.name = 'b2_water_source'; g.world.add(root);
    const isWet = (tx, ty) => !wallCell(tx, ty) && ch(tx, ty) === '*' && !objAt.has(`${tx},${ty}`);

    // 壊れた橋：浅瀬（*）が横か縦に3マス以上続く最初の場所に1つだけ（足場の見た目。通行は変えない）
    let bridge = null;
    for (let ty = 1; ty < a.h - 1 && !bridge; ty++) for (let tx = 1; tx < a.w - 3 && !bridge; tx++) if (isWet(tx, ty) && isWet(tx + 1, ty) && isWet(tx + 2, ty)) bridge = { tx: tx + 1, ty, ry: 0 };
    for (let tx = 1; tx < a.w - 1 && !bridge; tx++) for (let ty = 1; ty < a.h - 3 && !bridge; ty++) if (isWet(tx, ty) && isWet(tx, ty + 1) && isWet(tx, ty + 2)) bridge = { tx, ty: ty + 1, ry: Math.PI / 2 };
    const onBridge = (tx, ty) => bridge && (bridge.ry === 0 ? (ty === bridge.ty && Math.abs(tx - bridge.tx) <= 1) : (tx === bridge.tx && Math.abs(ty - bridge.ty) <= 1));
    // 滝：行き止まり（三方が壁）のマスの奥の壁に。多すぎると重いので4か所まで
    const falls = new Map();
    {
      const cands = [];
      for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
        if (wallCell(tx, ty) || objAt.has(`${tx},${ty}`) || '<>'.includes(ch(tx, ty))) continue;
        const ws = DIR_ORDER.filter((d) => wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]));
        if (ws.length !== 3) continue;
        const openD = DIR_ORDER.find((d) => !ws.includes(d)), back = DIR_ORDER[(DIR_ORDER.indexOf(openD) + 2) % 4];
        cands.push({ tx, ty, back, r: hash(tx, ty, 41) });
      }
      cands.sort((p, q) => p.r - q.r).slice(0, 4).forEach((c) => falls.set(`${c.tx},${c.ty}`, c.back));
    }

    // 天井の吹き抜け：3×3 の歩行可能な広場を優先して、各フロア最大1か所だけ選ぶ。
    // マップ文字・通行判定・イベントには触れず、見た目だけのランドマークにする。
    const openCells = new Set();
    const skylightCandidates = [];
    for (let cy = 2; cy < a.h - 2; cy++) for (let cx = 2; cx < a.w - 2; cx++) {
      let valid = true, waterCount = 0;
      for (let dz = -1; dz <= 1 && valid; dz++) for (let dx = -1; dx <= 1; dx++) {
        const tx = cx + dx, ty = cy + dz, cell = ch(tx, ty);
        if (wallCell(tx, ty) || objAt.has(`${tx},${ty}`)
            || cell === '>' || cell === '<' || falls.has(`${tx},${ty}`)) valid = false;
        if (cell === '*') waterCount++;
      }
      // 参考画像に合わせ、浅瀬がある広間を優先。候補がなければ通常の広間。
      if (valid) skylightCandidates.push({
        cx, cy, score: (waterCount > 0 ? -1 : 0) + hash(cx, cy, 205) * 0.5
      });
    }
    skylightCandidates.sort((a, b) => a.score - b.score);
    // 3×3の安全な広間だけに巨大な水源遺跡の吹き抜けを1か所設ける。
    // 小規模な迷宮や適切な広間がない場合は従来の洞窟天井を維持する。
    const sky = skylightCandidates.length ? skylightCandidates[0] : null;
    if (sky) {
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) openCells.add(`${sky.cx + dx},${sky.cy + dz}`);
      addAtrium(sky.cx * CELL, sky.cy * CELL);
    }

    /* ---- 承認済み素材の配置計画（見た目だけ。マップ・通行判定・イベントには触れない） ---- */
    const P = approved, propCells = new Set();
    const placed = { altar: 0, pillars: 0, ruins: 0, banks: 0, parapets: 0 };
    const vec = (d) => DIR_VEC[d];
    const yawAlong = (vx, vz) => Math.atan2(-vz, vx);   // ローカル +X を世界の (vx, vz) へ向ける回転
    const blockedCell = (tx, ty) => { const k = `${tx},${ty}`, c = ch(tx, ty); return wallCell(tx, ty) || objAt.has(k) || c === '<' || c === '>' || falls.has(k) || openCells.has(k) || onBridge(tx, ty); };
    const wallsOf = (tx, ty) => DIR_ORDER.filter((d) => wallCell(tx + vec(d)[0], ty + vec(d)[1]));
    const nearProp = (tx, ty, rad) => { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (propCells.has(`${tx + dx},${ty + dy}`)) return true; return false; };
    const addProp = (cat, piece, x, y, z, ry, s, tx, ty, count) => { if (!piece) return false; B.add(cat, piece, M4(x, y, z, ry, s), tx, ty); if (count) placed[count]++; return true; };
    // 祭壇の祠：通路に1面だけ接する壁マス（#）を、見た目だけ奥行きのある祠にする（入れない。口に崩れた欄干を置く）
    let alcove = null;
    if (P.altar) {
      const cands = [];
      for (let ty = 1; ty < a.h - 1; ty++) for (let tx = 1; tx < a.w - 1; tx++) {
        if (ch(tx, ty) !== '#') continue;
        const opens = DIR_ORDER.filter((d) => !wallCell(tx + vec(d)[0], ty + vec(d)[1]));
        if (opens.length !== 1) continue;
        if (DIR_ORDER.some((d) => d !== opens[0] && ch(tx + vec(d)[0], ty + vec(d)[1]) !== '#')) continue;
        const d = opens[0], nx = tx + vec(d)[0], ny = ty + vec(d)[1];
        if (blockedCell(nx, ny) || ch(nx, ny) === '*') continue;
        cands.push({ tx, ty, d: DIR_ORDER[(DIR_ORDER.indexOf(d) + 2) % 4], open: d, nx, ny, score: wallsOf(nx, ny).length + hash(tx, ty, 501) * 0.9 });
      }
      cands.sort((p, q) => p.score - q.score);
      if (cands.length) { alcove = cands[0]; propCells.add(`${alcove.nx},${alcove.ny}`); }
    }
    const isAlcove = (tx, ty) => !!alcove && alcove.tx === tx && alcove.ty === ty;
    // 柱V3：二方が壁の角。石造遺跡V4：一方だけ壁のマス（広間のふち）と、細い通路のわき
    {
      const corners = [], edges = [], corridors = [];
      for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
        if (blockedCell(tx, ty) || propCells.has(`${tx},${ty}`)) continue;
        const ws = wallsOf(tx, ty), r = hash(tx, ty, 520);
        if (ws.some((d) => isAlcove(tx + vec(d)[0], ty + vec(d)[1]))) continue;
        if (ws.length === 2 && (DIR_ORDER.indexOf(ws[1]) - DIR_ORDER.indexOf(ws[0])) % 2) corners.push({ tx, ty, ws, r });
        else if (ws.length === 2) corridors.push({ tx, ty, ws, r });
        else if (ws.length === 1) {
          // 広間のふちだけ（T字路の突き当たりに置くと、来た道の正面をふさいで見える）
          const v = vec(ws[0]), opp = [-v[0], -v[1]], side = [Math.abs(v[1]), Math.abs(v[0])];
          const room = !wallCell(tx + opp[0] + side[0], ty + opp[1] + side[1]) && !wallCell(tx + opp[0] - side[0], ty + opp[1] - side[1]);
          if (room) edges.push({ tx, ty, ws, r });
        }
      }
      const byR = (p, q) => p.r - q.r;
      corners.sort(byR); edges.sort(byR); corridors.sort(byR);
      for (const cn of corners) {
        if (placed.pillars >= 6) break;
        if (nearProp(cn.tx, cn.ty, 2)) continue;
        const v0 = vec(cn.ws[0]), v1 = vec(cn.ws[1]), x = X(cn.tx), z = Z(cn.ty), wy = ch(cn.tx, cn.ty) === '*' ? -0.08 : 0;
        const kind = hash(cn.tx, cn.ty, 521), px = x + (v0[0] + v1[0]) * 1.22, pz = z + (v0[1] + v1[1]) * 1.22;
        let ok = false;
        if (kind < 0.36) ok = addProp('props_pillars', P.pillarAncient, px, wy, pz, Math.floor(hash(cn.tx, cn.ty, 522) * 4) * Math.PI / 2, 0.6, cn.tx, cn.ty, 'pillars');
        else if (kind < 0.7) ok = addProp('props_pillars', P.pillarGlaciated, px, wy, pz, hash(cn.tx, cn.ty, 522) * 6.28, 0.56, cn.tx, cn.ty, 'pillars');
        else ok = addProp('props_pillars', P.pillarRuined, px, wy, pz, yawAlong(-v1[0], -v1[1]), 0.6, cn.tx, cn.ty, 'pillars');   // 倒れた破片を壁ぞいへ
        if (ok) propCells.add(`${cn.tx},${cn.ty}`);
      }
      let ruinsEdge = 0;
      for (const ed of edges) {
        if (ruinsEdge >= 6) break;
        if (nearProp(ed.tx, ed.ty, 1)) continue;
        const v = vec(ed.ws[0]), along = [Math.abs(v[1]), Math.abs(v[0])], x = X(ed.tx), z = Z(ed.ty), wy = ch(ed.tx, ed.ty) === '*' ? -0.08 : 0;
        const kind = hash(ed.tx, ed.ty, 531), lat = (hash(ed.tx, ed.ty, 532) - 0.5) * 1.2;
        let ok = false;
        if (kind < 0.4) ok = addProp('props_ruins', P.fallen, x + v[0] * 1.0 + along[0] * lat, wy, z + v[1] * 1.0 + along[1] * lat, yawAlong(along[0], along[1]) + (hash(ed.tx, ed.ty, 533) < 0.5 ? Math.PI : 0), 0.55, ed.tx, ed.ty, 'ruins');
        else if (kind < 0.75) ok = addProp('props_ruins', P.rubble, x + v[0] * 1.1 + along[0] * lat, wy, z + v[1] * 1.1 + along[1] * lat, hash(ed.tx, ed.ty, 534) * 6.28, 0.5, ed.tx, ed.ty, 'ruins');
        else ok = addProp('props_ruins', P.spire, x + v[0] * 1.25 + along[0] * lat, wy, z + v[1] * 1.25 + along[1] * lat, hash(ed.tx, ed.ty, 535) * 6.28, 0.6, ed.tx, ed.ty, 'ruins');
        if (ok) { propCells.add(`${ed.tx},${ed.ty}`); ruinsEdge++; }
      }
      let ruinsCorr = 0;
      for (const co of corridors) {
        if (ruinsCorr >= 3) break;
        if (nearProp(co.tx, co.ty, 2)) continue;
        const v = vec(co.ws[hash(co.tx, co.ty, 541) < 0.5 ? 0 : 1]), x = X(co.tx), z = Z(co.ty), wy = ch(co.tx, co.ty) === '*' ? -0.08 : 0;
        if (addProp('props_ruins', P.rubble, x + v[0] * 1.3, wy, z + v[1] * 1.3, hash(co.tx, co.ty, 542) * 6.28, 0.38, co.tx, co.ty, 'ruins')) { propCells.add(`${co.tx},${co.ty}`); ruinsCorr++; }
      }
    }

    for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
      if (wallCell(tx, ty)) continue;
      const c = ch(tx, ty), x = X(tx), z = Z(ty), key = `${tx},${ty}`;
      const fall = falls.get(key), isProp = propCells.has(key);
      // 床：濡れた石板の下の暗い水底（すき間・水面の下）
      B.add('floor', proc.bed, M4(x, -0.3, z), tx, ty);
      if (c === '>') { /* 階段の素材が床を兼ねる */ }
      else if (c === '*') {   // 浅瀬：床板の代わりに水面（見た目だけ。通行と歩数の扱いは従来どおり）
        B.add('water', proc.poolFull, M4(x, -0.07, z), tx, ty);
        if (!onBridge(tx, ty)) {
          // 足もとに沈んだ石を1枚
          B.add('floor', pick(kit.slabs, hash(tx, ty, 2)), M4(x + (hash(tx, ty, 3) - 0.5) * 1.2, -0.12, z + (hash(tx, ty, 4) - 0.5) * 1.2, hash(tx, ty, 5) * 6, 0.7), tx, ty);
          // 荊（紫のとげ＝危険の目印）を壁ぎわに
          const side = DIR_ORDER.find((d) => wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]) && !isAlcove(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]));
          if (side && !isProp && hash(tx, ty, 6) < 0.6) { const [dx, dy] = DIR_VEC[side]; B.add('thorns', pick(kit.thorns, hash(tx, ty, 7)), M4(x + dx * 1.45 + (hash(tx, ty, 8) - 0.5) * (dy ? 2 : 0), -0.08, z + dy * 1.45 + (hash(tx, ty, 8) - 0.5) * (dx ? 2 : 0), hash(tx, ty, 9) * 6, 0.75 + hash(tx, ty, 10) * 0.3), tx, ty); }
        }
        if (anim.ripples.length < 8 && hash(tx, ty, 11) < 0.10) addRipple(x + (hash(tx, ty, 12) - 0.5) * 2, z + (hash(tx, ty, 13) - 0.5) * 2, hash(tx, ty, 14));
      } else if (fall) {   // 滝のマス：滝つぼ側を空けて石板を2枚
        for (const [ox, oz] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]]) {
          const [bx, bz] = DIR_VEC[fall]; if (ox * bx + oz * bz > 0) continue;
          const r = hash(tx * 2 + (ox > 0), ty * 2 + (oz > 0), 15);
          B.add('floor', pick(kit.slabs, r), M4(x + ox, -0.035 + hash(tx, ty, 150) * 0.035, z + oz, Math.floor(hash(tx * 2 + (ox > 0), ty * 2 + (oz > 0), 16) * 4) * Math.PI / 2), tx, ty);
        }
      } else {
        // 敷石の床（継ぎ目のない1枚の面。旧版の2×2の石板の格子線をなくす）
        B.add('floor', proc.continuousGround(x, z, CELL), M4(x, -0.025, z), tx, ty);
        if (c === ',' || c === '_' || c === 'P') {   // 道（, _）には古い象嵌を一筋
          const run = (ch(tx - 1, ty) === c || ch(tx + 1, ty) === c) ? 0 : Math.PI / 2;
          B.add('floor', pick(kit.inlays, hash(tx, ty, 17)), M4(x, 0.006, z, run, [3.2, 1, 3.2]), tx, ty);
        }
      }
      // 水際の岩棚：陸と浅瀬の境目だけに生成。水路を横切る橋や階段は除外。
      if (c !== '*' && c !== '>' && c !== '<' && !objAt.has(key)) {
        for (const d of DIR_ORDER) {
          const [dx, dz] = DIR_VEC[d];
          if (ch(tx + dx, ty + dz) !== '*') continue;
          const rx = x + dx * (CELL / 2 - 0.38);
          const rz = z + dz * (CELL / 2 - 0.38);
          B.add('shoreline', pick(proc.shoreline, hash(tx, ty, 220 + DIR_ORDER.indexOf(d))),
            M4(rx, 0, rz, Math.atan2(dx, dz)), tx, ty);
        }
      }
      // 水際の壁ぎわに発光菌。階段・橋・イベント・滝・素材の置き場は回避
      if (c !== '*' && c !== '>' && c !== '<' && !objAt.has(key) && !fall && !onBridge(tx, ty) && !isProp) {
        const edge = DIR_ORDER.find((d) => wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]) && !isAlcove(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]));
        const nearWater = DIR_ORDER.some((d) => ch(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]) === '*');
        if (edge && nearWater && hash(tx, ty, 351) < 0.38) {
          const [dx, dz] = DIR_VEC[edge];
          B.add('glow_fungi', pick(proc.glowFungi, hash(tx, ty, 352)),
            M4(x + dx * 1.5, 0.015, z + dz * 1.5, hash(tx, ty, 353) * Math.PI * 2,
              0.75 + hash(tx, ty, 354) * 0.35), tx, ty);
        }
      }
      if (c === '*' && !onBridge(tx, ty) && !objAt.has(key) && !falls.has(key) && !isProp) {
        for (const d of DIR_ORDER) {
          const [dx, dz] = DIR_VEC[d], di = DIR_ORDER.indexOf(d);
          if (!wallCell(tx + dx, ty + dz) || isAlcove(tx + dx, ty + dz) || hash(tx, ty, 340 + di) >= 0.52) continue;
          const along = (hash(tx, ty, 345 + di) - 0.5) * 0.95;
          B.add('frost_ledge', pick(proc.frostLedges, hash(tx, ty, 350 + di)),
            M4(x + dx * (CELL / 2 - 0.3) + dz * along, -0.015,
              z + dz * (CELL / 2 - 0.3) + dx * along,
              Math.atan2(dx, dz), 0.78 + hash(tx, ty, 355 + di) * 0.22), tx, ty);
        }
      }
      // 天井
      if (!openCells.has(key)) B.add('ceiling', proc.continuousCeiling(x, z, CELL), M4(x, 4, z), tx, ty);
      // 天井の小さな鍾乳状の稜線：根元を天井の起伏の高さに合わせる（浮かせない）
      if (!openCells.has(key) && !objAt.has(key) && c !== '>' && c !== '<' && hash(tx, ty, 230) < 0.24) {
        const px = x + (hash(tx, ty, 231) - 0.5) * 2.2, pz = z + (hash(tx, ty, 232) - 0.5) * 2.2;
        B.add('ceiling_details', pick(proc.ceilingRidge, hash(tx, ty, 233)),
          M4(px, ceilY(px, pz) + 0.1, pz, hash(tx, ty, 234) * Math.PI * 2), tx, ty);
      }
      // 通路中央を避けて、天井の氷柱群（根元は天井に埋める）
      if (!openCells.has(key) && !objAt.has(key) && c !== '>' && c !== '<' && hash(tx, ty, 240) < 0.34) {
        const side = hash(tx, ty, 241) < 0.5 ? -1 : 1;
        const px = x + side * (1.12 + hash(tx, ty, 242) * 0.42), pz = z + (hash(tx, ty, 243) - 0.5) * 2.4;
        B.add('ice_stalactites', pick(proc.iceStalactites, hash(tx, ty, 244)),
          M4(px, ceilY(px, pz) + 0.12, pz, hash(tx, ty, 245) * Math.PI * 2), tx, ty);
      }
      // v8 の石筍・侵食岩を通路の端に控えめに（床に接地）。天井の氷塊（浮いて見えた）は置かない
      if (v8 && !objAt.has(key) && c !== '>' && c !== '<' && !falls.has(key) && !isProp) {
        const side = DIR_ORDER.find((d) => wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]) && !isAlcove(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]));
        if (side) {
          const [dx, dz] = DIR_VEC[side];
          if (v8.stalagmites.length && hash(tx, ty, 301) < 0.22) {
            B.add('v8_stalagmites', pick(v8.stalagmites, hash(tx, ty, 302)),
              M4(x + dx * 1.3, -0.05, z + dz * 1.3, hash(tx, ty, 303) * 6.28), tx, ty);
          }
          if (v8.erosion.length && hash(tx, ty, 304) < 0.16) {
            B.add('v8_erosion', pick(v8.erosion, hash(tx, ty, 305)),
              M4(x + dx * 1.35, -0.08, z + dz * 1.35, hash(tx, ty, 306) * 6.28), tx, ty);
          }
        }
      }
      // 壁と、壁ぎわの岩・鉱脈・壁付きの物
      for (const d of DIR_ORDER) {
        const [dx, dy] = DIR_VEC[d]; if (!wallCell(tx + dx, ty + dy)) continue;
        if (isAlcove(tx + dx, ty + dy)) continue;   // 祭壇の祠の口：壁を作らない（祠は下でまとめて作る）
        const ex = x + dx * CELL / 2, ez = z + dy * CELL / 2, k = hash(tx * 4 + DIR_ORDER.indexOf(d), ty, 5), ry = FACE_YAW[d] + Math.PI;
        const along = [dy ? 1 : 0, dx ? 1 : 0];   // 壁に沿う向き（x, z）
        B.add('walls', proc.masonryWall(ex, ez, ry, CELL), M4(ex, 0, ez, ry), tx, ty);
        // 壁と天井の境目の氷結した庇：根元を天井の高さに合わせる
        if (!openCells.has(key) && !objAt.has(key) && !falls.has(key)
            && c !== '>' && c !== '<' && hash(tx, ty, 400 + DIR_ORDER.indexOf(d)) < 0.4) {
          const offset = (hash(tx, ty, 405 + DIR_ORDER.indexOf(d)) - 0.5) * 1.5;
          const px = ex - dx * 0.22 + along[0] * offset, pz = ez - dy * 0.22 + along[1] * offset;
          B.add('frost_cornices', pick(proc.frostCornices, hash(tx, ty, 410 + DIR_ORDER.indexOf(d))),
            M4(px, ceilY(px, pz) + 0.05, pz, ry), tx, ty);
        }
        // 壁の根元に小さな岩くず（石積みの基礎の段に寄せる）
        if (!objAt.has(key) && !isProp && c !== '>' && c !== '<' && k < 0.3) {
          const rim = pick(v8?.rocks?.length ? v8.rocks : kit.rocks, hash(tx, ty, 180 + DIR_ORDER.indexOf(d)));
          const offset = (hash(tx, ty, 184 + DIR_ORDER.indexOf(d)) - 0.5) * 2.0;
          const scale = 0.2 + hash(tx, ty, 188 + DIR_ORDER.indexOf(d)) * 0.12;
          B.add('rock_seams', rim, M4(ex - dx * 0.4 + along[0] * offset, -0.1,
            ez - dy * 0.4 + along[1] * offset, ry + hash(tx, ty, 192) * 0.8, scale), tx, ty);
        }
        const n = def(ch(tx + dx, ty + dy));
        const o = n && n.onWall ? a.objects.find((q) => q.tx === tx + dx && q.ty === ty + dy) : null;
        if (o && o.kind === 'switch') {   // 合図石：壁に埋まった結晶。解くと光が消える（第1階層のレバーと同じ扱い）
          const stone = api.place(g.world, tpl.switchStone, ex - dx * 0.4, 0.5, ez - dy * 0.4, ry, 0.45);
          g.entries.push({ o, kind: 'switch', obj: stone, state: null, at: new THREE.Vector3(ex - dx * 0.5, 1.4, ez - dy * 0.5) });
          continue;
        }
        if (o && o.kind === 'sign') {     // 壁の立て札：石積みの面に石板
          const pl = api.place(g.world, tpl.plaque, ex - dx * 0.24, 1.55, ez - dy * 0.24, ry);
          g.entries.push({ o, kind: 'sign', obj: pl, state: null, at: new THREE.Vector3(ex - dx * 0.3, 1.5, ez - dy * 0.3) });
          continue;
        }
        if (fall === d) {
          addWaterfall(ex, ez, ry, tx, ty, B);
          light(ex - dx * 0.55, 2.5, ez - dy * 0.55, 0x80cde6, 0.85, 6.5);
          continue;
        }
        if (objAt.has(key) || c === '>' || c === '<' || isProp) continue;
        if (k > 0.8) {   // 壁の根元の岩（通路へのはみ出しは0.6m以内）
          const s = 0.45 + hash(tx, ty + 7 * DIR_ORDER.indexOf(d), 19) * 0.25, t = (hash(tx, ty, 20 + DIR_ORDER.indexOf(d)) - 0.5) * 2.2;
          const piece = pick(kit.boulders, hash(tx, ty, 24 + DIR_ORDER.indexOf(d)));
          const inward = 0.25 + piece.size.z * s * 0.5;
          B.add('rocks', piece, M4(ex + along[0] * t - dx * inward, -0.12, ez + along[1] * t - dy * inward, ry + (hash(tx, ty, 28) - 0.5) * 0.5, s), tx, ty);
        }
        if (k < 0.12) {    // 光る鉱脈（石積みの面に貼る）
          const t = (hash(tx, ty, 29) - 0.5) * 2.4, y = 1.0 + hash(tx, ty, 30) * 1.6;
          B.add('crystals', pick(kit.veins, hash(tx, ty, 31)), M4(ex + along[0] * t - dx * 0.1, y, ez + along[1] * t - dy * 0.1, ry, 0.9), tx, ty);
          light(ex - dx * 0.5, y, ez - dy * 0.5, 0x83ddf1, 0.85, 5.2);
        }
      }
      // 角の結晶の群れ（二方が壁の角だけ。通路の正面をふさがない）
      if (!objAt.has(key) && !fall && c !== '*' && !isProp) {
        for (let i = 0; i < 4; i++) {
          const d1 = DIR_ORDER[i], d2 = DIR_ORDER[(i + 1) % 4];
          if (!wallCell(tx + DIR_VEC[d1][0], ty + DIR_VEC[d1][1]) || !wallCell(tx + DIR_VEC[d2][0], ty + DIR_VEC[d2][1])) continue;
          if (hash(tx, ty, 32 + i) > 0.2) continue;
          const px = x + (DIR_VEC[d1][0] + DIR_VEC[d2][0]) * 1.3, pz = z + (DIR_VEC[d1][1] + DIR_VEC[d2][1]) * 1.3;
          const piece = pick(kit.crystals, hash(tx, ty, 36 + i)), s = 0.45 + hash(tx, ty, 40) * 0.15;
          B.add('crystals', piece, M4(px, -0.05, pz, hash(tx, ty, 37) * 6, s), tx, ty);
          light(px, piece.size.y * s * 0.6, pz, 0x79d6e8, 1.65, 5.7);
          break;
        }
        // 開けた場所の小岩（壁が1つもないマスのふち）
        if (DIR_ORDER.every((d) => !wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1])) && hash(tx, ty, 42) < 0.12) {
          B.add('rocks', pick(kit.rocks, hash(tx, ty, 43)), M4(x + (hash(tx, ty, 44) > 0.5 ? 1.5 : -1.5), -0.1, z + (hash(tx, ty, 45) - 0.5) * 2.4, hash(tx, ty, 46) * 6, 0.7), tx, ty);
        }
      }
      // 天井から下がる結晶（まれに、壁ぎわ）。根元を天井に埋める
      if (!openCells.has(key) && hash(tx, ty, 47) < 0.08) {
        const d = DIR_ORDER.find((q) => wallCell(tx + DIR_VEC[q][0], ty + DIR_VEC[q][1]));
        if (d) { const [dx, dy] = DIR_VEC[d], px = x + dx * 1.3, pz = z + dy * 1.3; B.add('crystals', pick(kit.shards, hash(tx, ty, 48)), M4(px, ceilY(px, pz) + 0.08, pz, hash(tx, ty, 49) * 6, 0.24 + hash(tx, ty, 194) * 0.22, Math.PI), tx, ty); }
      }
    }
    // 祭壇の祠（見た目だけ。マップ上は壁のまま）
    if (alcove) {
      const { tx, ty, open, nx, ny } = alcove, x = X(tx), z = Z(ty), toN = vec(open), lat = [Math.abs(toN[1]), Math.abs(toN[0])];
      B.add('floor', proc.bed, M4(x, -0.3, z), tx, ty);
      B.add('floor', proc.continuousGround(x, z, CELL), M4(x, -0.025, z), tx, ty);
      B.add('ceiling', proc.continuousCeiling(x, z, CELL), M4(x, 4, z), tx, ty);
      for (const wd of DIR_ORDER) {
        if (wd === open) continue;
        const [dx, dy] = vec(wd), ex = x + dx * CELL / 2, ez = z + dy * CELL / 2, ry = FACE_YAW[wd] + Math.PI;
        B.add('walls', proc.masonryWall(ex, ez, ry, CELL), M4(ex, 0, ez, ry), tx, ty);
      }
      const ry = FACE_YAW[open];   // 祭壇の正面（+Z）を通路へ向ける
      addProp('props_altar', P.altar, x - toN[0] * 0.32, 0, z - toN[1] * 0.32, ry, 0.31, tx, ty, 'altar');
      light(x + toN[0] * 0.3, 1.4, z + toN[1] * 0.3, 0x86e2ff, 1.7, 6.5);
      light(x - toN[0] * 1.2, 2.6, z - toN[1] * 1.2, 0x5fb8ff, 1.0, 5);
      const bx = x + toN[0] * CELL / 2, bz = z + toN[1] * CELL / 2, sh = (hash(tx, ty, 502) - 0.5) * 1.0;
      addProp('props_ruins', P.parapet, bx - toN[0] * 0.35 + lat[0] * sh, -0.04, bz - toN[1] * 0.35 + lat[1] * sh, yawAlong(lat[0], lat[1]) + (hash(tx, ty, 503) < 0.5 ? Math.PI : 0), 0.6, tx, ty, 'parapets');
      for (const sg of [-1, 1]) addProp('props_pillars', P.pillarAncient, bx + lat[0] * sg * 1.5, 0, bz + lat[1] * sg * 1.5, ry, 0.5, nx, ny, 'pillars');
    }
    if (bridge) {   // 壊れた橋（6.6m）を3マスに合わせて少し伸ばす。上面が水面のすぐ上に来る高さ
      const sx = (CELL * 3 - 0.6) / kit.bridge.size.x;
      B.add('landmarks', kit.bridge, M4(X(bridge.tx), -0.42, Z(bridge.ty), bridge.ry, [sx, 1, 1.15]), bridge.tx, bridge.ty);
      // 橋のたもとの氷岸V11（左右）と、崩れた欄干V4。足場の両わきだけに置き、渡る道はふさがない
      const ax = bridge.ry === 0 ? 1 : 0, az = 1 - ax, ryA = yawAlong(ax, az), lz = [Math.sin(ryA), Math.cos(ryA)];
      const cx = X(bridge.tx), cz = Z(bridge.ty);
      for (const end of [-1, 1]) {
        const ex = cx + ax * end * 5.2, ez = cz + az * end * 5.2;
        addProp('props_banks', P.bankL, ex + lz[0] * 2.1, -0.12, ez + lz[1] * 2.1, ryA, 0.9, bridge.tx, bridge.ty, 'banks');
        addProp('props_banks', P.bankR, ex - lz[0] * 2.1, -0.12, ez - lz[1] * 2.1, ryA, 0.9, bridge.tx, bridge.ty, 'banks');
      }
      addProp('props_ruins', P.parapet, cx - ax * 2.0 + lz[0] * 1.6, -0.2, cz - az * 2.0 + lz[1] * 1.6, ryA, 0.5, bridge.tx, bridge.ty, 'parapets');
      addProp('props_ruins', P.parapet, cx + ax * 2.3 - lz[0] * 1.6, -0.2, cz + az * 2.3 - lz[1] * 1.6, ryA + Math.PI, 0.5, bridge.tx, bridge.ty, 'parapets');
    }

    // 物（宝箱・採集・灯・NPC・イベント・仕掛け・階段・出口・ボス門）
    const s = S;
    for (const o of a.objects) {
      if (o.onWall && (o.kind === 'switch' || o.kind === 'sign')) continue;   // 壁の面に置いた
      const x = X(o.tx), z = Z(o.ty), f = facing(o.tx, o.ty), ry = FACE_YAW[f];
      const e = { o, kind: o.kind, obj: null, state: null, at: new THREE.Vector3(x, 1.2, z) };
      switch (o.kind) {
        case 'stairs':
          if (o.dir === 'down') e.obj = api.place(g.world, s.stairsDown, x, 0, z, ry);
          else e.obj = api.place(g.world, s.stairsUp, x, 0, z, ry + Math.PI, 0.75);
          break;
        case 'save': api.place(g.world, s.seal, x, 0.005, z, 0, 0.8); e.obj = api.place(g.world, s.torch, x, 0, z); e.at.y = 1.9; break;
        case 'chest': case 'cache': case 'gather': case 'event': e.ry = ry; break;   // 状態に応じて sync で置く
        case 'sign': e.obj = api.place(g.world, s.sign, x, 0, z, ry); e.at.y = 1.8; break;
        case 'gate': {   // ボス門：紫の光を帯びた水門（マスの奥側）
          const sc = (CELL - 0.2) / kit.gate.size.x;
          e.obj = api.place(g.world, tpl.gateBoss, x - DIR_VEC[f][0] * 1.7, 0, z - DIR_VEC[f][1] * 1.7, ry, Math.min(sc, 3.95 / kit.gate.size.y));
          break;
        }
        case 'exit': {   // 出口：古いアーチ（天井4mに収まるよう高さを詰める）
          const sy = 3.9 / kit.arch.size.y, sx = 3.7 / kit.arch.size.x;
          // マスの奥（通路と反対側）の壁ぎわに立て、壁に開いた出口に見せる（立ったマスの正面をふさがない）
          const axp = x - DIR_VEC[f][0] * 1.6, azp = z - DIR_VEC[f][1] * 1.6;
          const arch = api.place(g.world, tpl.arch, axp, 0, azp, (f === 'up' || f === 'down') ? 0 : Math.PI / 2, 1);
          arch.scale.set(sx, sy, sx); arch.updateMatrix(); arch.updateMatrixWorld(true);
          for (const L of arch.userData.lights) L.world.set(axp + DIR_VEC[f][0] * 0.8, 3.0, azp + DIR_VEC[f][1] * 0.8);
          e.obj = arch; break;
        }
        case 'npc': e.obj = api.place(g.world, await api.load(api.npcFile(o)), x, 0, z, ry); e.at.y = 2.2; break;
        case 'door': if (!o.hidden) { const pass = info.open(o.tx, o.ty - 1) || info.open(o.tx, o.ty + 1); e.ry = pass ? 0 : Math.PI / 2; } break;
        default: break;
      }
      g.entries.push(e);
    }
    made = B.build(root, mats);
    last = { falls: [...falls].map(([k, d]) => ({ cell: k, wall: d })), bridge, alcove: alcove ? { cell: `${alcove.tx},${alcove.ty}`, from: `${alcove.nx},${alcove.ny}`, dir: alcove.d } : null, props: { ...placed, loaded: Object.keys(B2_APPROVED).filter((id) => P[id]) } };
  }

  // 大空洞の縦方向の景観。天井を抜いた3×3マスに高い石造壁と冷光を加える。
  // 3D表示の装飾のみ。通路、壁判定、カメラ、マップイベントは変更しない。
  function addAtrium(x, z) {
    const atrium = new THREE.Group(); atrium.name = 'b2:open_ceiling_atrium'; root.add(atrium);
    const stone = mats['Pale mineral stone'], dark = mats['Deep cavern rock'];
    const trim = mats['Ancient inlay'];
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x9beaff, transparent: true, opacity: 0.19, depthWrite: false, side: THREE.DoubleSide });
    const fishMat = new THREE.MeshBasicMaterial({ color: 0x174a65, side: THREE.DoubleSide, transparent: true, opacity: 0.7, depthWrite: false });
    // 天井4mより上の縦穴を囲む壁。内側が空洞になるよう4面に配置する。
    // 通路内に柱を立てず、3×3マスの外周だけを装飾する。
    for (let side = 0; side < 4; side++) {
      const axis = side % 2 === 0;
      const sign = side < 2 ? -1 : 1;
      // 下端を周囲の天井（2.9〜4m）より下まで伸ばし、外の通路から縦穴の外の暗い隙間が見えないようにする
      const wall = new THREE.Mesh(new THREE.BoxGeometry(axis ? 12.4 : 0.9, 20.2, axis ? 0.9 : 12.4), dark);
      wall.position.set(x + (axis ? 0 : sign * 6.1), 12.4, z + (axis ? sign * 6.1 : 0));
      atrium.add(wall);
      // 高い遺跡壁の石造リブと横梁。視線が上へ向かうように縦方向を強調。
      for (const p of [-4.4, 0, 4.4]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(axis ? 0.46 : 0.72, 17, axis ? 0.72 : 0.46), stone);
        rib.position.set(x + (axis ? p : sign * 5.55), 13, z + (axis ? sign * 5.55 : p)); atrium.add(rib);
      }
      for (const h of [8, 14, 20]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(axis ? 12.1 : 0.52, 0.36, axis ? 0.52 : 12.1), trim);
        band.position.set(x + (axis ? 0 : sign * 5.56), h, z + (axis ? sign * 5.56 : 0)); atrium.add(band);
      }
    }
    // 岩盤の縦長シルエットで四角い遺跡壁を崩す。壁の内側ではなく外周に固定。
    for (let i = 0; i < 12; i++) {
      const side = i % 4, axis = side % 2 === 0;
      const sign = side < 2 ? -1 : 1;
      const along = (hash(i, 8, 252) - 0.5) * 9.6;
      const height = 5 + hash(i, 9, 253) * 9;
      const rock = new THREE.Mesh(
        new THREE.ConeGeometry(0.65 + hash(i, 10, 254) * 0.7, height, 6),
        dark);
      rock.position.set(x + (axis ? along : sign * 5.6), 4.2 + height / 2,
        z + (axis ? sign * 5.6 : along));
      rock.rotation.z = (hash(i, 11, 255) - 0.5) * 0.15;
      atrium.add(rock);
    }
    // 岩壁の中腹に自然な層状の張り出しを重ね、円錐だけの単純な輪郭を緩和する。
    // 壁の内周側には0.5m程度だけ突出させ、3×3マスの探索空間には置かない。
    const ledgeGeo = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 28; i++) {
      const side = i % 4, axis = side % 2 === 0;
      const sign = side < 2 ? -1 : 1;
      const along = (hash(i, 61, 721) - 0.5) * 9.4;
      const height = 7.0 + hash(i, 62, 722) * 13.0;
      const ledge = new THREE.Mesh(ledgeGeo, i % 6 === 0 ? stone : dark);
      ledge.position.set(x + (axis ? along : sign * 5.65), height,
        z + (axis ? sign * 5.65 : along));
      ledge.scale.set(axis ? 0.65 + hash(i, 63, 723) * 1.0 : 0.42 + hash(i, 64, 724) * 0.45,
        0.30 + hash(i, 65, 725) * 0.52,
        axis ? 0.42 + hash(i, 64, 724) * 0.45 : 0.65 + hash(i, 63, 723) * 1.0);
      ledge.rotation.y = hash(i, 66, 726) * 0.35;
      atrium.add(ledge);
    }
    // 高所の岩壁に自然侵食でできた半円状の石橋を重ね、縦穴の奥行きを強調する。
    // 床から12m以上の装飾。通路やイベントの判定には影響しない。
    const archRockGeo = new THREE.IcosahedronGeometry(1, 1);
    for (let arch = 0; arch < 4; arch++) {
      const side = arch, axis = side % 2 === 0, sign = side < 2 ? -1 : 1;
      const center = (hash(arch, 70, 811) - 0.5) * 3.4;
      const baseY = 13.4 + hash(arch, 71, 812) * 2.5;
      const radius = 1.65 + hash(arch, 72, 813) * 0.65;
      for (let segment = 0; segment < 9; segment++) {
        const angle = Math.PI * segment / 8;
        const along = center + Math.cos(angle) * radius;
        const rise = Math.sin(angle) * radius;
        const stonePiece = new THREE.Mesh(archRockGeo, segment % 4 === 0 ? stone : dark);
        stonePiece.position.set(x + (axis ? along : sign * 5.4), baseY + rise,
          z + (axis ? sign * 5.4 : along));
        stonePiece.scale.set(axis ? 0.55 : 0.42, 0.42 + hash(arch, segment, 814) * 0.22,
          axis ? 0.42 : 0.55);
        stonePiece.rotation.z = (hash(arch, segment, 815) - 0.5) * 0.45;
        atrium.add(stonePiece);
      }
    }
    // 角の崩れた支柱と礎石。上方には段差を付け、直方体の箱に見えにくくする。
    for (const [dx, dz] of [[-5.6,-5.6],[5.6,-5.6],[-5.6,5.6],[5.6,5.6]]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.88, 18, 8), stone);
      pillar.position.set(x + dx, 13, z + dz); atrium.add(pillar);
      for (const h of [5.5, 11.5, 17.5, 21.5]) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.4, 8), dark);
        cap.position.set(x + dx, h, z + dz); atrium.add(cap);
      }
    }
    // 天頂を岩盤の縁で囲み、明るい水源が暗い矩形の穴に見えないようにする。
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(5.65, 0.62, 7, 28),
      stone);
    rim.rotation.x = Math.PI / 2; rim.position.set(x, 22.35, z); atrium.add(rim);
    // 円形の人工的な輪郭を、氷に侵食された不規則な岩塊で部分的に隠す。
    // すべて天井付近に置き、通路・FOE・イベントの当たり判定には触れない。
    const rimRockGeo = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 22; i++) {
      const angle = (i + hash(i, 51, 610) * 0.45) * Math.PI * 2 / 22;
      const radius = 5.5 + (hash(i, 52, 611) - 0.5) * 0.85;
      const rock = new THREE.Mesh(rimRockGeo, i % 5 === 0 ? stone : dark);
      rock.position.set(x + Math.cos(angle) * radius,
        22.12 + (hash(i, 53, 612) - 0.5) * 0.55,
        z + Math.sin(angle) * radius);
      rock.scale.set(0.55 + hash(i, 54, 613) * 0.75,
        0.42 + hash(i, 55, 614) * 0.6,
        0.58 + hash(i, 56, 615) * 0.85);
      rock.rotation.set(hash(i, 57, 616) * 0.5, angle, hash(i, 58, 617) * 0.4);
      atrium.add(rock);
    }
    // 高所から落ちる細い発光水流。通行範囲には降ろさず水源の高さを演出。
    const streamMat = new THREE.MeshBasicMaterial({
      color: 0x65d8f4, transparent: true, opacity: 0.27,
      depthWrite: false, side: THREE.DoubleSide
    });
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5 + 0.3;
      const radius = 3.3 + hash(i, 2, 271) * 1.2;
      const h = 10 + hash(i, 3, 272) * 5;
      const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.13, h, 6, 1, true), streamMat);
      stream.position.set(x + Math.cos(angle) * radius, 22 - h / 2, z + Math.sin(angle) * radius);
      atrium.add(stream);
    }
    // 吹き抜け上部の輪郭を不規則な氷の歯で崩す。床面から十分離し、移動判定には影響しない。
    // 個別ライトを増やさず、既存の結晶マテリアルで冷光を表現する。
    const iceGeo = new THREE.ConeGeometry(0.7, 1, 5);
    const iceMat = mats['Glowing cyan crystal'];
    for (let i = 0; i < 18; i++) {
      const angle = (i + hash(i, 31, 402) * 0.32) * Math.PI * 2 / 18;
      const radius = 4.75 + hash(i, 32, 403) * 0.75;
      const height = 1.4 + hash(i, 33, 404) * 3.6;
      const ice = new THREE.Mesh(iceGeo, i % 4 === 0 ? mats['Deep blue crystal'] : iceMat);
      ice.scale.set(0.55 + hash(i, 34, 405) * 0.75, height, 0.55 + hash(i, 35, 406) * 0.75);
      ice.rotation.z = Math.PI + (hash(i, 36, 407) - 0.5) * 0.25;
      ice.position.set(x + Math.cos(angle) * radius, 21.9 - height / 2, z + Math.sin(angle) * radius);
      ice.name = 'Atrium_Hanging_Ice';
      atrium.add(ice);
    }
    // 空洞上部の明るい水色。全体の背景色ではなく、吹き抜け内部だけの光源。
    const opening = new THREE.Mesh(new THREE.CircleGeometry(5.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x6bcde5, side: THREE.DoubleSide, fog: false }));
    opening.rotation.x = Math.PI / 2; opening.position.set(x, 22.65, z); atrium.add(opening);
    // 光の筒の下端は縦穴の中（4.6m）に。周囲の天井より下に出ると、外から皿状の板が浮いて見えていた
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.6, 17.4, 16, 1, true), lightMat);
    beam.position.set(x, 13.3, z); beam.renderOrder = 3; atrium.add(beam);
    // 水面下の床に淡い揺れる光の筋を重ねる。GPU反射を使わない軽量表現。
    const causticTex = tileTexture(128, (ctx, n) => {
      ctx.clearRect(0, 0, n, n);
      for (let i = 0; i < 32; i++) {
        const px = rnd(i * 13 + 4) * n, py = rnd(i * 17 + 2) * n;
        ctx.strokeStyle = `rgba(177,245,255,${0.08 + rnd(i * 31) * 0.16})`;
        ctx.lineWidth = 1 + rnd(i * 7) * 2;
        ctx.beginPath(); ctx.ellipse(px, py, 6 + rnd(i * 11) * 15, 2 + rnd(i * 19) * 5, rnd(i * 23) * 6, 0, Math.PI * 2); ctx.stroke();
      }
    });
    causticTex.repeat.set(2, 2);
    const causticMat = new THREE.MeshBasicMaterial({ map: causticTex, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 });
    const causticMesh = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 10.5).rotateX(-Math.PI / 2), causticMat);
    causticMesh.position.set(x, 0.022, z); causticMesh.renderOrder = 3; atrium.add(causticMesh);
    anim.caustics.push({ mesh: causticMesh, texture: causticTex });
    // 高所に浮かぶ魚影。装飾のみで移動・当たり判定なし。
    const fishShape = new THREE.Shape();
    fishShape.moveTo(-0.75, 0); fishShape.quadraticCurveTo(-0.15, 0.33, 0.55, 0.08);
    fishShape.lineTo(0.92, 0.32); fishShape.lineTo(0.78, 0);
    fishShape.lineTo(0.92, -0.32); fishShape.lineTo(0.55, -0.08);
    fishShape.quadraticCurveTo(-0.15, -0.33, -0.75, 0);
    const fishGeo = new THREE.ShapeGeometry(fishShape);
    for (let i = 0; i < 7; i++) {
      const f = new THREE.Mesh(fishGeo, fishMat);
      f.position.set(x + (hash(i, 1, 210) - 0.5) * 8, 10 + hash(i, 2, 211) * 9, z + (hash(i, 3, 212) - 0.5) * 8);
      f.rotation.y = hash(i, 4, 213) * Math.PI * 2; f.scale.setScalar(0.55 + hash(i, 5, 214) * 0.8);
      // 初期位置と向きを固定しておき、時間積分による漂流を防ぐ。
      f.userData.b2Swim = { x: f.position.x, y: f.position.y, z: f.position.z, yaw: f.rotation.y };
      atrium.add(f);
      anim.fishes.push(f);
    }
    light(x, 3.4, z, 0x89e8ff, 2.4, 13);
    light(x, 9.0, z, 0x6acfff, 1.7, 16);
  }

  function addRipple(x, z, r) {
    const piece = kit.ripples[Math.floor(r * kit.ripples.length) % kit.ripples.length];
    const mat = mats['Water foam'].clone(); mat.opacity = 0;
    const mesh = new THREE.Mesh(piece.parts[0].geo, mat); mesh.position.set(x, -0.05, z); mesh.renderOrder = 3; mesh.name = piece.name;
    root.add(mesh); anim.ripples.push({ mesh, phase: r, speed: 0.22 + r * 0.12, base: 1.6 / Math.max(0.5, piece.size.x) });
  }
  function addWaterfall(ex, ez, ry, tx, ty, B) {
    // 滝：奥の水の帯（GLB）＋手前に放物線を描く水膜（厚み）＋落ち口の岩＋滝壺の泡の輪とわき立つ泡＋しぶき
    const sy = 3.85 / kit.waterfall.size.y, sx = 2.4 / kit.waterfall.size.x;
    const fwd = [Math.sin(ry), Math.cos(ry)];   // 壁から通路へ向かう向き
    B.add('water', kit.waterfall, M4(ex + fwd[0] * 0.26, 0, ez + fwd[1] * 0.26, ry, [sx, sy, 1]), tx, ty);
    B.add('water', proc.fallCurtain, M4(ex + fwd[0] * 0.1, 0, ez + fwd[1] * 0.1, ry), tx, ty);
    const top = Math.min(3.8, ceilY(ex + fwd[0] * 0.4, ez + fwd[1] * 0.4));
    B.add('rocks', proc.fallLip, M4(ex, top - 0.12, ez, ry), tx, ty);
    B.add('water', proc.poolHalf, M4(ex + fwd[0] * 0.95, -0.07, ez + fwd[1] * 0.95, ry), tx, ty);
    B.add('water_foam', proc.foamDiskPiece, M4(ex + fwd[0] * 0.95, -0.045, ez + fwd[1] * 0.95, hash(tx, ty, 209) * 6.28), tx, ty);
    const mound = pieceGroup(proc.foamMound, mats, 'Waterfall_Foam_Mound');
    mound.position.set(ex + fwd[0] * 0.1, -0.07, ez + fwd[1] * 0.1); mound.rotation.y = ry;
    mound.userData.b2Foam = { phase: hash(tx, ty, 52) * 6.28 };
    root.add(mound); anim.foams.push(mound);
    B.add('rocks', pick(kit.rocks, hash(tx, ty, 50)), M4(ex + fwd[0] * 0.8 + fwd[1] * 1.6, -0.2, ez + fwd[1] * 0.8 - fwd[0] * 1.6, ry, 0.6), tx, ty);
    light(ex + fwd[0] * 1.2, 1.2, ez + fwd[1] * 1.2, 0x6fd4ff, 1.6, 6);
    addMist(ex + fwd[0] * 0.75, ez + fwd[1] * 0.75, ry);
  }
  let mistTex = null;
  function addMist(x, z, ry) {
    mistTex = mistTex || tileTexture(64, (c, s) => { c.clearRect(0, 0, s, s); const gr = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(220,245,255,0.9)'); gr.addColorStop(1, 'rgba(220,245,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, s, s); });
    const N = 64, pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) seed[i] = rnd(i + x * 3 + z * 7);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: mistTex, size: 0.42, transparent: true, opacity: 0.17, depthWrite: false, color: 0xcff2ff, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat); pts.name = 'Waterfall_Mist'; pts.frustumCulled = false; pts.renderOrder = 4; root.add(pts);
    anim.mists.push({ points: pts, seed, x, z, ax: Math.cos(ry), az: -Math.sin(ry), fx: Math.sin(ry), fz: Math.cos(ry) });
  }

  // 毎フレーム：水面と滝の UV を流す、波紋を広げる、しぶきを漂わせる
  let t = 0;
  function tick(dt, now, camPos) {
    t += dt;
    const w = mats['Clear blue water'].map, f = mats.waterfall.map;
    if (w) { w.offset.x = (t * 0.012) % 1; w.offset.y = (t * 0.022) % 1; }
    if (f) f.offset.y = (t * 0.9) % 1;
    const ff = mats.waterfallFront.map; if (ff) { ff.offset.y = (t * 1.5) % 1; ff.offset.x = Math.sin(t * 0.7) * 0.02; }
    const fd = mats.foamDisk.map; if (fd) fd.rotation = (t * 0.12) % (Math.PI * 2);
    const fw = mats.foamWhite.map; if (fw) { fw.offset.x = (t * 0.05) % 1; fw.offset.y = (t * 0.21) % 1; }
    for (const fm of anim.foams) {
      const ph = fm.userData.b2Foam.phase + t * 2.3;
      fm.scale.set(1 + Math.sin(ph) * 0.06, 1 + Math.sin(ph * 1.7) * 0.22, 1 + Math.cos(ph * 1.3) * 0.05);
    }
    for (const c of anim.caustics) {
      c.texture.offset.x = (t * 0.009) % 1;
      c.texture.offset.y = (t * 0.014) % 1;
      c.mesh.material.opacity = 0.28 + 0.07 * Math.sin(t * 0.8);
    }
    for (let i = 0; i < anim.fishes.length; i++) {
      const fish = anim.fishes[i];
      const origin = fish.userData.b2Swim;
      if (!origin) continue;
      // 基準位置を中心に緩やかに周回。長時間放置しても吹き抜けから逸脱しない。
      const phase = t * (0.16 + i * 0.009) + i * 1.7;
      fish.position.set(origin.x + Math.sin(phase) * 0.75,
        origin.y + Math.sin(phase * 0.7) * 0.16,
        origin.z + Math.cos(phase) * 0.55);
      fish.rotation.y = origin.yaw + Math.sin(phase + Math.PI / 2) * 0.22;
    }
    for (const r of anim.ripples) {
      if (camPos && r.mesh.position.distanceToSquared(camPos) > 400) { r.mesh.visible = false; continue; }
      r.mesh.visible = true;
      const p = (r.phase + t * r.speed) % 1, s = (0.35 + p * 0.9) * r.base;
      r.mesh.scale.set(s, 1, s); r.mesh.material.opacity = (1 - p) * 0.16;
    }
    for (const m of anim.mists) {
      if (camPos && (m.x - camPos.x) ** 2 + (m.z - camPos.z) ** 2 > 400) { m.points.visible = false; continue; }
      m.points.visible = true;
      const pos = m.points.geometry.attributes.position;
      for (let i = 0; i < m.seed.length; i++) {
        const sd = m.seed[i], p = (sd * 7 + t * (0.25 + sd * 0.2)) % 1;
        const side = (rnd(i * 3.1 + sd) - 0.5) * (1.8 + p * 1.2), out = p * 1.5 * (0.6 + sd * 0.6);
        pos.setXYZ(i, m.x + m.ax * side + m.fx * out, 0.05 + p * (1.2 + sd * 1.6), m.z + m.az * side + m.fz * out);
      }
      pos.needsUpdate = true;
    }
  }

  // 状態の反映（門の格子・イベントの見た目）。扱ったら true を返し、残りは field-3d-view.js の共通処理に任せる
  async function sync(e, st) {
    const o = e.o, x = o.tx * CELL, z = o.ty * CELL;
    if (o.kind === 'door' && !o.hidden) {
      if (!e.obj) {
        const sc = Math.min((CELL - 0.2) / kit.gate.size.x, 3.95 / kit.gate.size.y);
        e.obj = api.place(g.world, tpl.gateNormal, x, 0, z, e.ry, sc);
        e.bars = e.obj.getObjectByName('Water_Gate_Bars');
      }
      if (e.bars) { e.bars.position.y = st === 'open' ? 3.0 : 0; e.bars.updateMatrix(); e.bars.updateMatrixWorld(true); }
      return true;
    }
    if (o.kind === 'event') {
      if (!e.obj) {
        if (o.hidden) e.obj = api.place(g.world, kit.thorns.length ? pieceGroup(kit.thorns[0], mats) : await api.load(api.FILES.roots), x, 0, z, e.ry, 0.5);
        else e.obj = api.place(g.world, await api.load('props/abandoned_mine_cart.glb'), x, 0, z, e.ry, 0.7);   // 壊れた木箱の代わり（専用素材が無いので仮）
      }
      if (!o.hidden) api.dimObj(e.obj, st === 'done');
      return true;
    }
    return false;
  }

  return { area: 2, env: ENV, build, sync, tick, dispose, kit, info: () => ({ meshCount: kit.meshCount, v8Decorations: v8 ? { rocks: v8.rocks.length, crystals: v8.crystals.length, stalagmites: v8.stalagmites.length, ceilingIce: v8.ceilingIce.length, erosion: v8.erosion.length } : null, omitted: kit.omitted, drawGroups: root ? root.children.map((c) => `${c.name}:${c.children.length}`) : [], ripples: anim.ripples.length, mists: anim.mists.length, ...last }) };
}
