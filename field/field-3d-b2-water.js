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
import { makeCrystalCluster, makeCrystalMaterials } from './b2-crystals.js?v=20261117-l2';   // 結晶（ユーザー確認済みの質感）
import { createB2WaterTiles, B2V4W_REMOVE_STEPPING_STONES } from './b2-water-tiles.js?v=20261119-w4';   // [B2V4-W] 危険な水面（GPT 水面タイル）・床の模様
import { createFlora, floraMaterial, floraMaterialClass, floraTint } from './b2-flora.js?v=20261119-f4';   // [B2V4-F] 花の配置と見た目
import { createSetpieces, SP_ROLES } from './b2-setpieces.js?v=20261119-s4';   // [B2V4-S] 階段・橋・水門・柱群・背景モニュメント
import { createB2Kit } from './b2-kit.js?v=20261122-h3';   // 2層専用の配置物（セーブ・石碑・宝箱・補給の木箱）

export const B2_BASE = './assets/3d/dungeons/b2_water_source/';
export const B2_GLB = B2_BASE + 'models/floor2-water-source-quality-v3.glb';
const CHUNK = 8;                                       // まとめる区画（マス数）
const WATER_KEY = 'kotama.field3d.b2.water';           // 'opaque' で水を不透明にする（半透明が崩れる環境向けの退避）

// 第2階層の空気（第1階層の値とは別。第1階層へ戻ると field-3d-view.js が第1階層の値に戻す）
// 旧版（環境光 2.0・霧 0.011）は全体が均一に明るく、奥行きと陰影が無く平板に見えていた。
// 環境光を下げて霧で奥を沈め、近くはプレイヤーの手元の灯り、遠くは結晶・滝の光で見せる。
// 2026-11-10 改訂：イメージ画像（発光する青い鍾乳洞）に合わせ、霧を明るいシアンにして奥が光ってかすむようにする。
// 暗く沈めるのではなく、手前は濃い青、奥は明るい水色という空気遠近で奥行きを出す。
export const ENV = { background: 0x1478a0, fog: { color: 0x1b86ad, density: 0.034 }, hemi: { sky: 0x9af2ff, ground: 0x123e5c, high: 1.15, low: 1.6 } };
const EXPOSURE = 1.45;                                                  // 第2階層だけ少し明るく（第1階層へ戻るときに元へ戻す）
const BLOOM = { threshold: 0.88, strength: 0.4 };                       // [B2V4-L] F1：第2階層のにじみ（共通の値は threshold 0.84・strength 0.45）
const LANTERN = { color: 0xbff4ff, high: 6, low: 8, range: 12 };       // カメラに付いて動く手元の灯り（第2階層だけ）
// 天井の高さ。通行判定とカメラ（目の高さ1.6m）は変えず、見た目の天井だけを7mに上げて大空洞の広さを出す
export const CEIL_H = 7;

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
  const water = std({ color: 0x8eeaff, map: waterTex, roughness: 0.05, metalness: 0.1, emissive: 0x0f86b4, emissiveIntensity: 0.55, envMapIntensity: 1.6, side: THREE.DoubleSide });
  const fall = std({ color: 0x9fe6fa, map: fallTex, roughness: 0.5,   // [B2V4-L] F1：0.19 だと面ごとに点光源の白い四角い照り返しが出た
    metalness: 0.0, emissive: 0x1a8cc0, emissiveIntensity: 0.45, side: THREE.DoubleSide });
  if (opaqueWater) { water.color.setHex(0x0f4a68); fall.color.setHex(0x2f7fa8); }
  else for (const m of [water, fall]) { m.transparent = true; m.opacity = m === water ? 0.66 : 0.72; m.depthWrite = false; }   // 水底の小石と魚が透けて見える濃さ
  const foam = std({ color: 0xd8f4ff, roughness: 0.5, emissive: 0x1f4a59, emissiveIntensity: 0.6, transparent: true, opacity: 0.24, depthWrite: false, envMapIntensity: 0.3 });   // 硬い白線にならない薄さ
  // 岩肌・石板・淡い石：高さ（割れ目・層・粒）から色と法線を作る。
  // 旧版は雲のようなぼやけた濃淡だけで、近くで見ると平らな板に見えていた。
  // 法線マップで凹凸に光が当たるので、ジオメトリを細かくしなくても岩の質感が出る。
  const rock = stoneSet(512, 13, 'rock'), slate = stoneSet(512, 37, 'slate'), pale = stoneSet(256, 71, 'pale');
  const veins = veinTexture(512, 5); veins.repeat.set(0.3, 0.3);   // 床の発光する水脈の網目（約8mで一巡）
  const ice = std({ color: 0xd8f8ff, roughness: 0.42, metalness: 0.0, emissive: 0x2a9ccc, emissiveIntensity: 0.55, envMapIntensity: 0.55, vertexColors: true });   // [統合2] F9：見上げると映り込み（つや）で白く光り、天井から離れた白い欠片に見えたので、つやと映り込みを下げる
  return {
    'Wet slate stone': std({ color: 0xb6c6c8, map: slate.map, normalMap: slate.normal, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.38, metalness: 0.02, envMapIntensity: 0.9, vertexColors: true }),   // 濡れた暗い石板
    'Ancient inlay': std({ color: 0xc9a45a, roughness: 0.38, metalness: 0.7, emissive: 0x2a1c06, emissiveIntensity: 0.5, envMapIntensity: 1.2 }),
    'Deep cavern rock': std({ color: 0x74a8d4, map: rock.map, normalMap: rock.normal, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.78, metalness: 0.0, emissive: 0x041a2e, emissiveIntensity: 1.0, envMapIntensity: 0.6, vertexColors: true }),   // 青い岩（影が黒く沈まないよう少し自発光）
    caveFloor: std({ color: 0x82bcd8, map: slate.map, normalMap: rock.normal, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.42, metalness: 0.02, emissive: 0x52e2ff, emissiveMap: veins, emissiveIntensity: 1.25, envMapIntensity: 1.0, vertexColors: true }),   // 濡れた岩盤＋光る水脈
    puddle: std({ color: 0x7fe2f6, roughness: 0.05, metalness: 0.1, emissive: 0x2ab4e0, emissiveIntensity: 0.6, envMapIntensity: 1.5 }),
    stream: farFade(new THREE.MeshBasicMaterial({ color: 0x6fdcf4, vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending, fog: true })),   // [統合2] 柔らかい光の帯（頂点色で縁と上をぼかす）
    streamGlow: farFade(new THREE.MeshBasicMaterial({ map: (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(150,230,255,0.55)'); gr.addColorStop(0.45, 'rgba(110,210,245,0.22)'); gr.addColorStop(1, 'rgba(80,190,240,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })(), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: true, polygonOffset: true, polygonOffsetFactor: -2 })),   // [統合2] 光の帯の足もとの、ぼんやりした床の明るみ（円盤に見えない）   // 天井から落ちる光る細い水流（[B2V4-L] F1：霧で遠くほど消える。旧版は霧を無視して遠くから光った。[仕上げ] 近くでも白い線に見えないよう、色を水色に・薄く）
    streamPool: std({ color: 0x4fb2d2, roughness: 0.4, metalness: 0.05, emissive: 0x1a86b0, emissiveIntensity: 0.2, envMapIntensity: 0.7 }),   // [B2V4-L] F1：水流の落ちる所の水たまり（照り返しの白い円にならない）
    'Pale mineral stone': std({ color: 0xb2e2f0, map: pale.map, normalMap: pale.normal, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.6, metalness: 0.0, envMapIntensity: 0.45, vertexColors: true }),  // 淡い鉱物の石
    'Glowing cyan crystal': std({ color: 0x7fe0ff, roughness: 0.08, metalness: 0.05, emissive: 0x1cb6f0, emissiveIntensity: 1.0, envMapIntensity: 1.4, flatShading: true }),   // 白飛びしない強さ  // 控えめな発光
    'Deep blue crystal': std({ color: 0x4a76e8, roughness: 0.12, metalness: 0.05, emissive: 0x1a3596, emissiveIntensity: 0.7, envMapIntensity: 1.3 }),
    'Violet danger crystal': std({ color: 0x8a6cc4, roughness: 0.2, metalness: 0.05, emissive: 0x5a1a90, emissiveIntensity: 0.9 }), // 紫＝危険
    'Clear blue water': water,
    'Water foam': foam,
    'Aquatic dark teal': std({ color: 0x2a6f9a, roughness: 0.62, metalness: 0.0, emissive: 0x0a2c48, emissiveIntensity: 1.0 }),
    ceiling: std({ color: 0x6aa2cc, map: rock.map, normalMap: rock.normal, normalScale: new THREE.Vector2(1.0, 1.0), roughness: 0.85, metalness: 0.0, emissive: 0x0c3554, emissiveIntensity: 1.0, envMapIntensity: 0.35, vertexColors: true, side: THREE.DoubleSide }),   // 下向きの面は環境光が弱いので少し自発光
    bed: std({ color: 0x3a5560, map: rock.map, roughness: 0.75, metalness: 0.0, vertexColors: true }),   // 床板のすき間（目地）。旧版は黒い隙間で、通路の中央の目地が正面に立つ黒い棒に見えた
    shallowBed: std({ color: 0x8fd6ea, map: pale.map, roughness: 0.7, metalness: 0.0, vertexColors: true }),   // 浅瀬の底（明るい小石。水を通して青緑に見える）
    ice,                                                                                          // 氷柱
    crystalIce: std({ color: 0x86e2fb, roughness: 0.04, metalness: 0.0, emissive: 0x1898d0, emissiveIntensity: 0.55, envMapIntensity: 1.8, flatShading: true }),   // 白く飛ばず水色が残る強さ
    frost: std({ color: 0xa8ecff, roughness: 0.15, metalness: 0.0, emissive: 0x1a86b8, emissiveIntensity: 0.35, envMapIntensity: 1.2, transparent: true, opacity: 0.8, depthWrite: false }),   // 霜の花（少し透ける）   // 小さな結晶・霜の花・氷のかけら（面ごとにきらめく）
    crystalDeep: std({ color: 0x7fb6ff, roughness: 0.06, metalness: 0.0, emissive: 0x2a62e0, emissiveIntensity: 0.8, envMapIntensity: 1.6, flatShading: true }),
    fish: new THREE.MeshStandardMaterial({ color: 0x0d2c38, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide }),
    waterfall: fall,
  };
}
// 周期境界を持つ値ノイズ（タイルの継ぎ目が出ない）
function periodicNoise(x, y, period, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const h = (a, b) => rnd((((a % period) + period) % period) * 173
    + (((b % period) + period) % period) * 379 + seed * 109);
  const a = h(ix, iy) * (1 - sx) + h(ix + 1, iy) * sx;
  const b = h(ix, iy + 1) * (1 - sx) + h(ix + 1, iy + 1) * sx;
  return a * (1 - sy) + b * sy;
}
// 床の水脈：周期的なボロノイの境界（細胞の境目）を細い光の線にし、ところどころ太らせて水たまり状にする
function veinTexture(n, seed) {
  // 細胞の境目をそのまま光らせると六角形のタイルに見えるため、
  // ①座標をノイズでゆがめて線をくねらせ、②ノイズで一部の線だけを光らせて途切れた水の筋にし、③所々に小さな水たまりを置く
  const G = 5, pts = [];
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) pts.push([(i + 0.1 + rnd(seed * 31 + i * 7 + j * 13) * 0.8) / G, (j + 0.1 + rnd(seed * 17 + i * 11 + j * 5) * 0.8) / G]);
  return tileTexture(n, (c) => {
    const img = c.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u0 = x / n, v0 = y / n;
      const u = u0 + (periodicNoise(u0 * 8, v0 * 8, 8, seed + 41) - 0.5) * 0.07, v = v0 + (periodicNoise(u0 * 8, v0 * 8, 8, seed + 43) - 0.5) * 0.07;
      let d1 = 9, d2 = 9;
      for (const [px, py] of pts) {
        let dx = Math.abs(u - px) % 1, dy = Math.abs(v - py) % 1; if (dx > 0.5) dx = 1 - dx; if (dy > 0.5) dy = 1 - dy;
        const d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
      }
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      const width = 0.004 + 0.01 * periodicNoise(u0 * 6, v0 * 6, 6, seed + 3);
      const gate = THREE.MathUtils.smoothstep(periodicNoise(u0 * 3, v0 * 3, 3, seed + 21) * 0.7 + periodicNoise(u0 * 9, v0 * 9, 9, seed + 23) * 0.3, 0.42, 0.62);
      const line = Math.max(0, 1 - edge / width) * gate, glow = Math.max(0, 1 - edge / (width * 5)) * 0.22 * gate;
      const pool = THREE.MathUtils.smoothstep(periodicNoise(u0 * 7, v0 * 7, 7, seed + 9) * 0.6 + periodicNoise(u0 * 19, v0 * 19, 19, seed + 11) * 0.4, 0.72, 0.84) * 0.32;   // 淡くにじむ程度
      const val = Math.min(1, line + glow + pool);
      const i = (y * n + x) * 4;
      img.data[i] = val * 150; img.data[i + 1] = val * 235; img.data[i + 2] = val * 255; img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  });
}
// 石材の色テクスチャと法線マップを作る。kind: rock（洞窟の岩）/ slate（濡れた石板）/ pale（淡い鉱物）
function stoneSet(n, seed, kind) {
  const H = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n, v = y / n;
    const f1 = periodicNoise(u * 4, v * 4, 4, seed), f2 = periodicNoise(u * 9, v * 9, 9, seed + 7);
    const f3 = periodicNoise(u * 22, v * 22, 22, seed + 13), f4 = periodicNoise(u * 56, v * 56, 56, seed + 19);
    // 割れ目：ノイズの 0.5 付近を細い溝にする（尾根型ノイズ）
    const r1 = 1 - Math.abs(periodicNoise(u * 6, v * 6, 6, seed + 31) * 2 - 1), r2 = 1 - Math.abs(periodicNoise(u * 14, v * 14, 14, seed + 37) * 2 - 1);
    const crack = Math.pow(r1, 28) * 0.8 + Math.pow(r2, 36) * 0.45;   // 細く、まばらな割れ目
    let h = f1 * 0.42 + f2 * 0.26 + f3 * 0.2 + f4 * 0.12;
    if (kind === 'slate') h = h * 0.55 + 0.45 * (0.5 + 0.5 * Math.sin((v * 7 + f1 * 0.9) * Math.PI * 2)) * 0.6 + f4 * 0.15;   // 層状
    if (kind === 'pale') h = h * 0.8 + f4 * 0.2;
    H[y * n + x] = h - crack * (kind === 'pale' ? 0.15 : 0.3);
  }
  const map = tileTexture(n, (c) => {
    const img = c.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      const h = H[i], speck = rnd(i * 1.37 + seed) * 0.08;
      let r, g, b;
      if (kind === 'rock') { const t = Math.max(0, Math.min(1, h * 1.35 - 0.05)); r = 46 + t * 120; g = 62 + t * 128; b = 72 + t * 128; }
      else if (kind === 'slate') { const t = Math.max(0, Math.min(1, h * 1.25)); r = 50 + t * 95; g = 70 + t * 105; b = 80 + t * 108; }
      else { const t = Math.max(0, Math.min(1, h * 1.1 + 0.15)); r = 120 + t * 110; g = 138 + t * 106; b = 146 + t * 102; }
      const k = 1 - speck;
      img.data[i * 4] = r * k; img.data[i * 4 + 1] = g * k; img.data[i * 4 + 2] = b * k; img.data[i * 4 + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  });
  const strength = kind === 'pale' ? 3.0 : 5.0;
  const normal = tileTexture(n, (c) => {
    const img = c.createImageData(n, n), at = (x, y) => H[((y + n) % n) * n + ((x + n) % n)];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4;
      img.data[i] = (dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  });
  normal.colorSpace = THREE.NoColorSpace;
  map.anisotropy = normal.anisotropy = 4;
  return { map, normal };
}
// 天井（y=4）からの垂れ下がり量（0〜約0.45m）。隣のマスと同じ式なので継ぎ目が出ない
const ceilDrop = (wx, wz) => 0.45 + 0.3 * Math.sin(wx * 0.37 + 0.7) * Math.cos(wz * 0.42 + 0.3) + 0.18 * Math.sin(wx * 0.83 + wz * 0.56)
  + 0.06 * Math.cos(wx * 1.91 - wz * 1.47) + 0.12 * Math.pow(Math.abs(Math.sin(wx * 0.72 - wz * 0.83)), 9);
const ceilY = (wx, wz) => CEIL_H - ceilDrop(wx, wz);
// [B2V4-L] F9：天井から下がる物の根元の高さ。根元の広がり（半径 r）の中で一番高い天井より少し上に置き、
// 天井の起伏で根元が浮いて隙間が見えないようにする（根元は天井にめり込み、付け根の岩が天井の下に顔を出す）
const rootY = (wx, wz, r) => {
  let y = ceilY(wx, wz);
  for (let k = 0; k < 6; k++) { const a = k * 1.047; y = Math.max(y, ceilY(wx + Math.cos(a) * r, wz + Math.sin(a) * r)); }
  return y + 0.04;
};
// 壁の面の前後のずれ（+が通路側、最大0.2m）。wx, wz は壁の面上の位置、lx は壁の中心からの横位置、y は高さ。
// 壁の形と、壁に貼る霜の花の位置の両方で使う（花が壁に埋まったり浮いたりしない）
function wallZ(wx, wz, lx, y, cell) {
  const hz = wx * 0.7 + wz * 0.7;   // 壁に沿う座標（隣の壁と続く）
  const edge = THREE.MathUtils.smoothstep(cell / 2 - Math.abs(lx), 0, 0.55);
  const vertical = THREE.MathUtils.smoothstep(y, -0.1, 0.5) * (1 - THREE.MathUtils.smoothstep(y, CEIL_H - 0.9, CEIL_H + 0.1));
  const broad = 0.34 * Math.sin(wx * 0.63 + wz * 0.29 + y * 0.23) + 0.20 * Math.cos(wx * 0.24 - wz * 0.71 + y * 0.38);
  const strata = 0.12 * Math.sin(wx * 1.47 - wz * 1.05 + y * 1.24) + 0.07 * Math.cos(wx * 2.87 + wz * 1.94 - y * 2.13);
  // 縦の襞：上ほど深い（天井から垂れる鍾乳石の幕）
  const drape = Math.pow(Math.abs(Math.sin(hz * 2.3 + Math.sin(y * 0.45 + hz) * 0.6)), 2.2) * (0.25 + 0.35 * THREE.MathUtils.smoothstep(y, 1.5, CEIL_H));
  const fracture = Math.pow(Math.abs(Math.sin(wx * 1.06 + wz * 0.53 + y * 0.15)), 14);
  const relief = (broad + strata + drape - 0.2 - 0.13 * fracture) * edge * vertical;
  return Math.max(-1.0, Math.min(0.2, -relief * 1.15));
}
// 岩盤の床の高さ（-0.1〜+0.16m 程度のなだらかな起伏）。隣のマスと同じ式なので継ぎ目が出ない
const groundY = (wx, wz) => 0.03 + 0.09 * Math.sin(wx * 0.47) * Math.cos(wz * 0.39) + 0.04 * Math.sin(wx * 1.14 + wz * 0.58) + 0.02 * Math.cos(wx * 2.37 - wz * 1.81);
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function blob(c, s, x, y, r, col) {
  for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
    const gr = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(x + ox, y + oy, r, 0, Math.PI * 2); c.fill();
  }
}
// [B2V4-L] F1：加算合成の光（水流など）は、霧の色を足すと遠くで明るくなるので、霧の濃さに応じて光そのものを消す
function farFade(m) {
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG
      float fadeF = 1.0 - exp(- fogDensity * fogDensity * vFogDepth * vFogDepth * 3.0);
      gl_FragColor.rgb *= 1.0 - fadeF;
    #endif`); };
  m.customProgramCacheKey = () => 'b2farFade';
  return m;
}
// [B2V4-L] F1：光の粒（雪・きらめき）が目の前で大きな光の玉にならないよう、画面上の大きさに上限を付ける
function capPoints(m, px) {
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <logdepthbuf_vertex>', `gl_PointSize = min(gl_PointSize, ${px.toFixed(1)});\n#include <logdepthbuf_vertex>`); };
  m.customProgramCacheKey = () => 'b2capPoints' + px.toFixed(1);
  return m;
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
    // [B2V4-L] F1：面ごとの法線（平面の継ぎはぎ）だと点光源の照り返しが四角く白く光ったので、なめらかな法線にする
    const smoothSheet = (geo) => { const g0 = prepGeo(geo, false); g0.deleteAttribute('normal'); const g1 = mergeVertices(g0, 1e-3); g0.dispose(); g1.computeVertexNormals(); return g1; };
    const sheets = take(by(/^Waterfall_Sheet/)).map((m) => ({ geo: planarUv(smoothSheet(m.geo)), mat: 'waterfall', tag: m.name }));
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
  // 壁面の起伏をワールド座標から求める。隣接する壁でも同じ鉱脈が続く。
  // 端の変位はゼロに収束させ、直交する壁・天井との裂け目を抑える。
  const continuousWall = (ex, ez, yaw, cell) => {
    // 通路側の面1枚。高さは天井（7m）まで。鍾乳石のカーテンのような縦の襞（ひだ）と、
    // 大きな張り出し・層・割れ目を重ねて「とげとげ」した洞窟の壁にする。通路への張り出しは最大0.2m
    const H = CEIL_H + 0.6, geo = new THREE.PlaneGeometry(cell + 0.12, H, 16, 18);
    geo.translate(0, H / 2 - 0.4, 0);
    const p = geo.attributes.position, cs = Math.cos(yaw), sn = Math.sin(yaw);
    for (let i = 0; i < p.count; i++) {
      const lx = p.getX(i), y = p.getY(i);
      p.setZ(i, wallZ(ex + cs * lx, ez - sn * lx, lx, y, cell));
    }
    const prepared = prepGeo(geo, false);
    geo.dispose();
    const smoothed = smoothRock(prepared);
    prepared.dispose();
    return { name: 'continuous_cavern_wall', transient: true, parts: [{ geo: smoothed, mat: 'Deep cavern rock' }] };
  };
  // 旧版は最大1.1m垂れ下がり（天井が2.9mまで下がる）、黒い布のように視界の上を覆っていた。
  // 垂れ下がりは最大0.45mに抑え、氷柱などは ceilDrop() で実際の天井の高さに根元を付ける。
  const continuousCeiling = (worldX, worldZ, cell) => {
    const geo = new THREE.PlaneGeometry(cell, cell, 10, 10).rotateX(Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, -ceilDrop(worldX + pos.getX(i), worldZ + pos.getZ(i)));
    geo.computeVertexNormals();
    return { name: 'continuous_cavern_ceiling', transient: true, parts: [{ geo, mat: 'ceiling' }] };
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
  const iceStalactites = [0, 1, 2, 3].map((variant) => {
    // 長さの違う3〜5本を寄せた氷柱の房。根元（y=0）を天井に付け、下へ伸ばす
    const parts = [], count = 3 + (variant % 3);
    for (let j = 0; j < count; j++) {
      const len = 0.35 + rnd(variant * 11 + j) * (0.55 + variant * 0.12), r = 0.05 + rnd(variant * 7 + j * 3) * 0.06;
      // [仕上げ] F9：氷柱は根元ほど太く（付け根の盛り上がりに埋まる）、色も根元は天井の青、先へ行くほど氷の白
      //  （白い氷柱が天井の岩から急に始まると、霧で暗く沈む天井から切り離されて浮いて見えた）
      const geo = new THREE.ConeGeometry(r, len, 7, 4);
      geo.rotateX(Math.PI); geo.translate(0, -len / 2 + 0.03, 0);
      { const q = geo.attributes.position, col = new Float32Array(q.count * 3);
        for (let i = 0; i < q.count; i++) {
          const t = THREE.MathUtils.clamp((0.03 - q.getY(i)) / len, 0, 1), flare = 1 + 1.3 * Math.pow(1 - t, 3);
          q.setX(i, q.getX(i) * flare); q.setZ(i, q.getZ(i) * flare);
          const k = THREE.MathUtils.smoothstep(t, 0.05, 0.6);
          col.set([0.95 + 0.3 * k, 0.98 + 0.32 * k, 1.0 + 0.3 * k], i * 3);   // [統合2] 根元は天井と同じ明るさ、先へ行くほど霜で少し明るい
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); }
      geo.rotateZ((rnd(variant * 5 + j) - 0.5) * 0.18);
      geo.translate((rnd(variant * 13 + j) - 0.5) * 0.42, 0, (rnd(variant * 17 + j) - 0.5) * 0.42);
      parts.push({ geo, mat: 'ceiling' });   // [統合2] F9：氷の素材だと見上げたとき白く光って天井から離れた欠片に見えた。天井と同じ素材で、先だけ霜で明るく
    }
    // 付け根：天井と同じ素材の、でこぼこした平たい岩（房全体を包む太さ。下へ 0.2m ほど垂れ、上半分は天井の裏に隠れる）
    const root = new THREE.IcosahedronGeometry(1, 1), rp = root.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i), k = 1 + 0.22 * Math.sin(x * 5.3 + z * 3.7 + variant) * Math.cos(y * 4.9 + x * 2.3) + 0.1 * Math.sin(z * 9.1 - x * 6.7 + variant * 3);
      rp.setXYZ(i, x * k, y * k, z * k);
    }
    root.scale(0.5, 0.24, 0.46); root.computeVertexNormals();
    parts.push({ geo: root, mat: 'ceiling' });   // [B2V4-L] F9：付け根は天井と同じ素材で太く（天井となじむ）
    return { name: 'b2_ice_stalactite_' + variant, parts };
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
      parts.push({ geo: g, mat: j === 1 ? 'ceiling' : 'Deep cavern rock' });   // [仕上げ] F9：中央の石は天井と同じ素材（白っぽい石が天井の際で白い欠片に見えた）
    }
    // [仕上げ] F9：庇の下の氷のかけらは、根元を岩に埋めて天井の青から先端の氷色へ（白い欠片が宙に浮いて見えた）
    const iceLen = 0.38 + variant * 0.11, ice = new THREE.ConeGeometry(0.13 + variant * 0.025, iceLen, 5, 3);
    ice.rotateX(Math.PI);
    { const q = ice.attributes.position, col = new Float32Array(q.count * 3);
      for (let i = 0; i < q.count; i++) { const k = THREE.MathUtils.smoothstep((iceLen / 2 - q.getY(i)) / iceLen, 0.1, 0.75); col.set([0.42 + 0.5 * k, 0.6 + 0.36 * k, 0.78 + 0.2 * k], i * 3); }
      ice.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
    ice.translate(0.32 - variant * 0.24, -0.3, 0.15);
    void ice;   // [統合2] F9：見上げると庇の下の小さな氷のかけらが宙に浮いた白い欠片に見えたので置かない
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
    return { name: 'b2_shoreline_' + variant, parts: [{ geo: g, mat: 'Wet slate stone' }] };   // 旧版の淡い石は床に置いた白い紙のように見えた
  });
  // 隣接する床マスで高さが一致する世界座標ベースの岩盤。
  // マス境界で起伏をゼロに戻さないため、正方形パッチの継ぎ目が目立たない。
  const continuousGround = (worldX, worldZ, cell) => {
    const g = new THREE.PlaneGeometry(cell, cell, 10, 10).rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, groundY(worldX + p.getX(i), worldZ + p.getZ(i)));
    g.computeVertexNormals();
    return { name: 'continuous_rock_ground', transient: true, parts: [{ geo: g, mat: 'caveFloor' }] };
  };
  // 光る水たまり：楕円の浅い水面（発光）と、ふちの淡い石
  const puddles = [0, 1, 2].map((v) => {
    const w = new THREE.CircleGeometry(0.62, 18).rotateX(-Math.PI / 2); w.scale(1.25 + v * 0.25, 1, 0.8 + v * 0.1);
    const rim = new THREE.RingGeometry(0.6, 0.78, 18).rotateX(-Math.PI / 2); rim.scale(1.25 + v * 0.25, 1, 0.8 + v * 0.1); rim.translate(0, -0.01, 0);
    return { name: 'b2_puddle_' + v, parts: [{ geo: w, mat: 'puddle' }, { geo: rim, mat: 'Pale mineral stone' }] };
  });
  const shallowBed = (() => {   // 浅瀬の底：明るい小石の起伏（水を通して見える）
    const g = new THREE.PlaneGeometry(4, 4, 6, 6).rotateX(-Math.PI / 2), q = g.attributes.position;
    for (let i = 0; i < q.count; i++) q.setY(i, 0.05 * Math.sin(q.getX(i) * 2.1) * Math.cos(q.getZ(i) * 1.7));
    return { name: 'shallow_bed', parts: [{ geo: prepGeo(g, false), mat: 'shallowBed' }] };
  })();
  // 鍾乳石・石筍：ゆがんだ細い円錐。高さ1（原点は根元）で作り、置くときに大きさを決める
  const spike = (r, seed, down) => {
    const g = new THREE.ConeGeometry(r, 1, 6, 3); g.translate(0, 0.5, 0);
    const p = g.attributes.position, bend = (rnd(seed) - 0.5) * 0.25, bendZ = (rnd(seed + 1) - 0.5) * 0.25;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), k = 1 + (rnd(seed * 13 + Math.round(p.getX(i) * 50) * 7 + Math.round(y * 9) * 3) - 0.5) * 0.4;
      p.setX(i, p.getX(i) * k + bend * y * y); p.setZ(i, p.getZ(i) * k + bendZ * y * y);
    }
    if (down) g.rotateX(Math.PI);
    g.computeVertexNormals();
    return g;
  };
  const spikeCluster = (down) => [0, 1, 2, 3, 4, 5].map((v) => {
    const parts = [{ geo: spike(0.2 + rnd(v * 3 + (down ? 50 : 0)) * 0.08, v * 7 + (down ? 100 : 0), down), mat: 'Deep cavern rock' }];
    const n = 1 + (v % 3);
    for (let j = 0; j < n; j++) {
      // [B2V4-L] F3：石筍の脇の小さなとげは、自分の X 軸（置くときに壁に沿う向き）の前後へ並べる。
      // 通路側（Z）へ張り出さないので、壁ぎわに寄せても主役のとげの形が残る（鍾乳石は従来どおり全方向）
      const a = down ? rnd(v * 17 + j) * 6.28 : (j % 2 ? Math.PI : 0) + (rnd(v * 17 + j) - 0.5) * 0.8;
      const g = spike(0.14 + rnd(v * 5 + j) * 0.06, v * 11 + j * 3 + (down ? 200 : 0), down), h = 0.3 + rnd(v * 9 + j) * 0.35, d = 0.22 + rnd(v * 19 + j) * 0.25;
      g.scale(h * 1.4, h, h * 1.4); g.translate(Math.cos(a) * d, 0, Math.sin(a) * d);
      parts.push({ geo: g, mat: 'Deep cavern rock' });
    }
    // [B2V4-L] F9：鍾乳石の付け根。天井と同じ素材の、でこぼこした平たい岩の盛り上がりで房の根元を包み、
    // 天井から垂れ下がって見えるようにする（旧版は細い根元が天井の起伏の上に浮いて、天井と分かれて見えた）。
    // 上半分は天井の裏に隠れ、天井より下に出た所だけが太い付け根として見える。明るさも天井と同じになる
    if (down) {
      const m = new THREE.IcosahedronGeometry(1, 1), mp = m.attributes.position;
      for (let i = 0; i < mp.count; i++) {
        const x = mp.getX(i), y = mp.getY(i), z = mp.getZ(i);
        const k = 1 + 0.2 * Math.sin(x * 6.1 + z * 4.3 + v) * Math.cos(y * 5.7 + x * 2.9) + 0.1 * Math.sin(z * 11.3 - x * 7.7 + v * 2);
        mp.setXYZ(i, x * k, y * k, z * k);
      }
      // [仕上げ] 付け根を広く厚く（天井の起伏の低い所まで届く）
      m.scale(0.56 + rnd(v * 29 + 3) * 0.1, 0.22, 0.52 + rnd(v * 31 + 5) * 0.1); m.translate(0, 0.02, 0);
      m.computeVertexNormals();
      parts.push({ geo: m, mat: 'ceiling' });
      // [仕上げ] 主役のとげの上の部分を、天井と同じ素材の太い漏斗形の「首」で包む。
      // 天井（自発光あり）→ 首 → 岩のとげ と明るさが段階的に変わり、根元で色が急に切り替わらない
      const r0 = 0.2 + rnd(v * 3 + 50) * 0.08, collar = new THREE.CylinderGeometry(r0 * 2.0, r0 * 0.92, 0.34, 7, 2, true), cp = collar.attributes.position;
      for (let i = 0; i < cp.count; i++) { const k = 1 + (rnd(v * 37 + i * 7) - 0.5) * 0.3; cp.setX(i, cp.getX(i) * k); cp.setZ(i, cp.getZ(i) * k); }
      collar.translate(0, -0.15, 0); collar.computeVertexNormals();
      parts.push({ geo: collar, mat: 'ceiling' });
    }
    // [仕上げ] F3：石筍は面ごとの陰影（角のあるとげ）にし、根元は暗く・先へ行くほど霜で明るい色にする。
    // 壁と同じ岩の素材なので、なめらかな陰影のままだと壁の凹凸に溶けて見えなかった（とげの輪郭を壁から浮かせる）
    if (!down) for (const p of parts) {
      const g = p.geo.index ? p.geo.toNonIndexed() : p.geo; if (g !== p.geo) p.geo.dispose();
      g.computeVertexNormals();
      const q = g.attributes.position, col = new Float32Array(q.count * 3);
      for (let i = 0; i < q.count; i++) { const y = THREE.MathUtils.clamp(q.getY(i), 0, 1), k = 0.55 + 0.85 * Math.pow(y, 1.3); col.set([k * 0.92, k, k * 1.1], i * 3); }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); p.geo = g;
    }
    // [B2V4-L] F3：大きさ1のときの、根元の中心から通路側（Z）・壁に沿う向き（X）への張り出し（置くときの上限の計算に使う）
    let ex = 0, ez = 0;
    for (const p of parts) { const q = p.geo.attributes.position; for (let i = 0; i < q.count; i++) { ex = Math.max(ex, Math.abs(q.getX(i))); ez = Math.max(ez, Math.abs(q.getZ(i))); } }
    return { name: (down ? 'b2_stalactites_' : 'b2_stalagmites_') + v, parts, ext: { x: ex, z: ez } };
  });
  const stalagmites = spikeCluster(false), stalactites = spikeCluster(true);
  // 床から天井まで届く柱（石筍と鍾乳石がつながった砂時計形）
  const columns = [0, 1, 2].map((v) => {
    const pts = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14, w = Math.abs(t - 0.5) * 2; pts.push(new THREE.Vector2(0.28 + 0.75 * Math.pow(w, 2.2) + (rnd(v * 23 + i) - 0.5) * 0.12, t * (CEIL_H + 0.3) - 0.15)); }
    const g = new THREE.LatheGeometry(pts, 9);
    return { name: 'b2_column_' + v, parts: [{ geo: g, mat: 'Deep cavern rock' }] };
  });
  // 天井から落ちる光る細い水流（長さ1で作り、置くときに伸ばす）
  // [統合2] F1：天井から落ちる光は「細い白い棒」に見えたので、3枚の板を60°ずつ交差させた柔らかい光の帯にする。
  // 頂点色（加算合成なので黒＝透明）で、横は中央だけ明るく縁へぼけ、縦は上ほど薄く・下へ向かって広がる
  const stream = (() => {
    const planes = [];
    for (let k = 0; k < 3; k++) {
      const g = new THREE.PlaneGeometry(1, 1, 4, 6).translate(0, 0.5, 0), q = g.attributes.position, col = new Float32Array(q.count * 3);
      for (let i = 0; i < q.count; i++) {
        const x = q.getX(i), y = q.getY(i), w = 0.16 + 0.42 * Math.pow(1 - y, 1.4);   // 上 0.16m → 床 0.58m 幅
        q.setX(i, x * w * 2);
        const edge = Math.pow(Math.max(0, 1 - Math.abs(x) * 2), 1.6), vert = (0.08 + 0.92 * Math.pow(1 - y, 1.3)) * THREE.MathUtils.smoothstep(y, 0, 0.06 + 0.0);
        const v = edge * Math.max(vert, edge * 0.05 * (1 - y));
        col.set([v, v, v], i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.rotateY(k * Math.PI / 3); planes.push(g);
    }
    return { name: 'b2_stream', parts: [{ geo: mergeGeometries(planes, false), mat: 'stream' }] };
  })();
  // 門の上の岩（天井を7mにしたので、門の上に開いた隙間をふさぐ）。表と裏の2面
  const lintel = (() => {
    const h = CEIL_H - 3.7 + 0.3, a = new THREE.PlaneGeometry(4.2, h, 8, 4);   // 1マス4m a.translate(0, 3.7 + h / 2, 0.02);
    const b = a.clone().rotateY(Math.PI);
    return { name: 'b2_gate_lintel', parts: [{ geo: a, mat: 'Deep cavern rock' }, { geo: b, mat: 'Deep cavern rock' }] };
  })();
  const bed = { name: 'water_bed', parts: [{ geo: prepGeo(new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2), false), mat: 'bed' }] };
  const pool = (w, d) => ({ name: 'water_surface', parts: [{ geo: prepGeo(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), true), mat: 'Clear blue water' }] });
  const plaque = { name: 'wall_plaque', parts: [{ geo: prepGeo(new THREE.BoxGeometry(1.1, 0.7, 0.08).translate(0, 0, 0.04), false), mat: 'Ancient inlay' }, { geo: prepGeo(new THREE.BoxGeometry(1.3, 0.9, 0.06).translate(0, 0, 0.0), false), mat: 'Pale mineral stone' }] };
  const streamPuddle = { name: 'b2_stream_puddle', parts: [{ geo: new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2), mat: 'streamGlow' }] };   // [統合2] F1：水たまりの円盤をやめ、ぼんやりした床の明るみに   // [B2V4-L] F1：水流の落ちる所の控えめな水たまり
  return { streamPuddle, continuousWall, continuousCeiling, continuousGround, shoreline, glowFungi, frostVeins, frostCornices, wallOutcrops, frostLedges, ceilingRidge, iceStalactites, bed, shallowBed, puddles, stalagmites, stalactites, columns, stream, lintel, poolFull: pool(4, 4), poolHalf: pool(4, 1.9), plaque };
}

/* ------------------------------------------------------------
   動かない物をまとめる（区画×種類×素材）
   ------------------------------------------------------------ */
class Batcher {
  constructor() { this.b = new Map(); }
  add(cat, piece, matrix, tx, ty) {
    const cs = cat === 'flowers' ? 4 : CHUNK;   // 花は重い（1株約2万三角形）ので小さな区画でまとめ、画面外の株を描かない
    const ck = `${Math.floor(tx / cs)},${Math.floor(ty / cs)}`;
    for (const p of piece.parts) {
      const k = `${cat}|${p.mat}|${ck}`; let e = this.b.get(k); if (!e) { e = { cat, mat: p.mat, geos: [] }; this.b.set(k, e); }
      const gm = p.geo.clone().applyMatrix4(matrix);
      if (matrix.determinant() < 0) flipWinding(gm);   // 左右反転して置いた物は、三角形の向きを戻す（裏面になって消えない）
      e.geos.push(shade(gm));
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
  for (let i = 0; i < n; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const big = 0.5 + 0.5 * Math.sin(cx * 0.9 + cz * 0.7) * Math.sin(cy * 1.3 + cz * 0.4);
    let v = 0.88 + 0.08 * big + 0.035 * rnd(Math.floor(cx * 7.3) * 31 + Math.floor(cy * 5.1) * 17 + Math.floor(cz * 6.7));
    { // 壁など縦向きの面は、床に近いほど暗く（足もとの陰）。手前の岩が暗く奥が明るい、イメージ画像の立体感に寄せる
      const ax = p.getX(i + 1) - p.getX(i), ay = p.getY(i + 1) - p.getY(i), az = p.getZ(i + 1) - p.getZ(i);
      const bx = p.getX(i + 2) - p.getX(i), by = p.getY(i + 2) - p.getY(i), bz = p.getZ(i + 2) - p.getZ(i);
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, nl = Math.hypot(nx, ny, nz) || 1;
      if (Math.abs(ny / nl) < 0.6) v *= 0.5 + 0.5 * Math.min(1, Math.max(0, (cy + 0.3) / 3.2));
    }
    for (let k = 0; k < 3 && i + k < n; k++) col.set([v, v, v * 1.03], (i + k) * 3);
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
  if (!geo.attributes.color) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));   // 結晶など、自分で色を持つ形は上書きしない
  return geo;
}
function flipWinding(geo) {
  if (geo.index) { const ni = geo.toNonIndexed(); for (const k of Object.keys(ni.attributes)) geo.setAttribute(k, ni.attributes[k]); geo.setIndex(null); }
  for (const k of Object.keys(geo.attributes)) {
    const a = geo.attributes[k], n = a.itemSize;
    for (let i = 0; i + 2 < a.count; i += 3) for (let c = 0; c < n; c++) { const t = a.array[(i + 1) * n + c]; a.array[(i + 1) * n + c] = a.array[(i + 2) * n + c]; a.array[(i + 2) * n + c] = t; }
    a.needsUpdate = true;
  }
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
// 2層専用の配置物（ページ全体で1組。g.world に置かれ、読み込みキャッシュの部品と同じ扱い）
let B2_KIT = null;
const getB2Kit = () => (B2_KIT ||= createB2Kit());

export async function createTheme(api) {
  const opaqueWater = (() => { try { return localStorage.getItem(WATER_KEY) === 'opaque'; } catch (_) { return false; } })();
  const kit = await loadKit();
  // v8 は任意の見た目拡張。読み込み失敗時も旧B2キットで遊べる。
  const v8 = await loadV8Decorations().catch((err) => { console.warn('[B2] v8 decoration unavailable; using legacy kit', err); return null; });
  const proc = makeProcedural();
  const mats = makeMaterials(opaqueWater);
  // 結晶（b2-crystals.js）の素材と、色×大きさごとの型。型はここで1回だけ作り、組み立てのたびに複製して置く
  {
    const cm = makeCrystalMaterials();
    mats.crystalShell = cm.shell; mats.crystalCloudy = cm.cloudy; mats.crystalFracture = cm.fracture; mats.crystalRock = cm.rock;
  }
  const XTAL_KEY = { shell: 'crystalShell', cloudy: 'crystalCloudy', fracture: 'crystalFracture', rock: 'crystalRock' };
  const XTAL_PALS = ['cyan', 'violet', 'blue', 'white'];
  const xtal = {};
  for (const [pi, pal] of XTAL_PALS.entries()) {
    xtal[pal] = {};
    for (const [si, size] of ['massive', 'large', 'medium', 'small'].entries()) {
      xtal[pal][size] = [0, 1, 2].map((v) => {
        const c = makeCrystalCluster(1000 + pi * 97 + si * 31 + v * 7, pal, size), parts = [];
        for (const k of Object.keys(XTAL_KEY)) for (const geo of c[k]) parts.push({ geo, mat: XTAL_KEY[k] });
        return { name: `b2_crystal_${pal}_${size}_${v}`, parts };
      });
    }
  }
  const XTAL_LIGHT = { cyan: 0x52d2ff, violet: 0x9a62ff, blue: 0x5672ff, white: 0xc4e6ff };

  // ---- 追加制作された第2階層の素材（GLB）----
  // 大きなモニュメント（水車の中庭・古代の祭壇・古代の氷橋）は3Fにだけ、各1回。石柱3種は小物として各フロアに少しずつ。
  // 読み込み時に「素材ごとに1つの形」へまとめ（数百個の部品→十数個）、原点を底面の中心に移す。
  // 石の素材には洞窟と同じ岩のテクスチャと法線を足し、氷・水・灯りの素材はそのまま使う。
  const ASSET_FILES = {
    waterwheel: './assets/models/floor2/b2-frozen-waterwheel-courtyard.glb',
    altar: './assets/models/floor2/b2-frozen-ancient-altar.glb',
    bridge: './assets/3d/dungeons/b2_water_source/models/ancient_ice_bridge/ancient_ice_bridge_v04.glb',
    pillarA: './assets/models/floor2/b2-ancient-pillar-v3.glb',
    pillarR: './assets/models/floor2/b2-ruined-pillar-v3.glb',
    pillarG: './assets/models/floor2/b2-glaciated-pillar-v3.glb',
    // PR #299 で Git に保存された候補素材（承認前の扱い。巨大滝 v05 は未完成に見えるため使わない）
    aqueduct: './assets/models/floor2/candidates/ruined_aqueduct_v01.glb',
    watergate: './assets/models/floor2/candidates/frozen_watergate_v09.glb',
    shoreline: './assets/models/floor2/candidates/b2_glacial_shoreline_v04.glb',
    bridgeLite: './assets/3d/dungeons/b2_water_source/models/ancient_ice_bridge/ancient_ice_bridge_v02.glb',   // [B2V4-S] 通り道の橋（橋桁と欄干だけ切り出す。v04 と同じ形で軽い）
  };
  const assetCache = new Map();
  function adaptMaterial(m) {
    const nm = (m.name || '').toLowerCase(), hsl = m.color ? m.color.getHSL({}) : { s: 1 };
    const icy = /ice|frost|water|snow|crystal|glass|glacier/.test(nm) || m.transparent;
    const stone = !icy && (/limestone|masonry|stone|joint|carv|weather|fissure|rune|mineral/.test(nm) || hsl.s < 0.4) && !/bronze|wood/.test(nm);
    const mm = m.clone();
    mm.envMapIntensity = icy ? 1.4 : 0.8;
    if (stone) {
      mm.map = mats['Pale mineral stone'].map; mm.normalMap = mats['Deep cavern rock'].normalMap; mm.normalScale = new THREE.Vector2(0.8, 0.8);
      mm.color = m.color.clone().multiplyScalar(1.1).lerp(new THREE.Color(0x6f9cbc), 0.3);   // 白く浮かないよう明るさを抑え、洞窟の青に寄せる
    }
    return mm;
  }
  // 同じ GLB を2つの用途（6Fのモニュメントの祭壇と、5F・6Fの行き止まりの祭壇など）で使うときも、ファイルは1回だけ読む
  const gltfCache = new Map();
  function loadGltf(url) {
    if (!gltfCache.has(url)) gltfCache.set(url, new GLTFLoader().loadAsync(url).catch((e) => { gltfCache.delete(url); throw e; }));
    return gltfCache.get(url);
  }
  async function loadAsset(name) {
    if (assetCache.has(name)) return assetCache.get(name);
    const job = loadGltf(ASSET_FILES[name]).then((gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const byMat = new Map(), glow = [];
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        let geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
        if (geo.index) { const ni = geo.toNonIndexed(); geo.dispose(); geo = ni; }
        for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
        if (!geo.attributes.normal) geo.computeVertexNormals();
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        if (!byMat.has(m)) byMat.set(m, []);
        byMat.get(m).push(geo);
        if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.4) { geo.computeBoundingBox(); glow.push({ p: geo.boundingBox.getCenter(new THREE.Vector3()), c: m.emissive.clone() }); }
      });
      const parts = [], box = new THREE.Box3();
      let i = 0;
      for (const [m, geos] of byMat) {
        const merged = mergeGeometries(geos, false); geos.forEach((g2) => g2.dispose());
        const key = `asset:${name}:${i++}`; mats[key] = adaptMaterial(m);
        merged.computeBoundingBox(); box.union(merged.boundingBox);
        parts.push({ geo: merged, mat: key, src: m.name || '' });
      }
      const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      const off = new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z);
      for (const pt of parts) pt.geo.applyMatrix4(off);
      // 発光する部品（灯り・光る結晶）の位置に点光源。近い物はまとめ、最大6個
      const lights = [];
      for (const gl of glow) { const p = gl.p.clone().applyMatrix4(off); if (lights.length < 6 && !lights.some((L) => L.p.distanceTo(p) < 2.5)) lights.push({ p, c: gl.c }); }
      return { name, parts, size, lights };
    });
    assetCache.set(name, job);
    return job;
  }
  // 部品を置き、発光部の光も登録する
  let placedLog = [];   // 診断用：置いた素材の名前と位置（themeInfo().placed）
  function placeAsset(B, cat, piece, x, y, z, ry, sc, tx, ty) {
    placedLog.push({ name: piece.name, x: +(x / CELL).toFixed(2), z: +(z / CELL).toFixed(2), ry: +ry.toFixed(2) });
    B.add(cat, piece, M4(x, y, z, ry, sc), tx, ty);
    const cs = Math.cos(ry), sn = Math.sin(ry), k = typeof sc === 'number' ? [sc, sc, sc] : sc;
    for (const L of piece.lights) {
      const lx = L.p.x * k[0], lz = L.p.z * k[2];
      light(x + cs * lx + sn * lz, y + L.p.y * k[1], z - sn * lx + cs * lz, L.c.getHex() || 0x8fe0ff, 1.1, 5);
    }
  }
  // ---- 追加の素材（#203 で未使用だった GPT の第2階層素材と、Claude の花）----
  // 石造遺跡V4・氷岸V11・凍った祭壇（行き止まり用）・花3種。#203 の空気（明るいシアンの霧・鮮やかな青い岩・霜の白・控えめな発光）に
  // 合わせ、GLB の素材をそのまま使わずに「洞窟の素材の仲間」へ振り分ける（形は変えない）。
  //  ・茶色／灰色の石 → 青い岩（洞窟の岩のテクスチャ・法線）／霜色の淡い石
  //  ・透過（transmission）の氷 → #203 の結晶の氷（crystalIce・crystalDeep。透過の重い描画を使わない）
  //  ・花 → 頂点色に元の素材の色を焼き込み、緑を霜の青緑へ寄せ、ほのかに発光させる（3種で素材3つにまとめ、描画回数を抑える）
  // 読めない素材は置かないだけ（try/catch）。読み込みは1回、作り直しでは複製してまとめるだけ。
  const B2_RUINS = './assets/3d/dungeons/b2_water_source/models/stone_ruins_v4/';
  const B2_BANKS = './assets/models/floor2/ice-bridge-banks/v11/';
  const B2_FLOWERS = './assets/models/floor2/claude-flowers-candidates/';
  const EXTRA_FILES = {
    ruinFallen: B2_RUINS + 'fallen_pillar.glb', ruinSpire: B2_RUINS + 'embedded_spire.glb', ruinRubble: B2_RUINS + 'rubble_ice_scatter.glb', ruinParapet: B2_RUINS + 'broken_parapet.glb',
    bankL: B2_BANKS + 'ice_bridge_left_v11_smooth_depth.glb', bankR: B2_BANKS + 'ice_bridge_right_v11_smooth_depth.glb',
    shrine: ASSET_FILES.altar,
    snowdrop: B2_FLOWERS + 'f2_frost_snowdrop.glb', mizubasho: B2_FLOWERS + 'f2_ice_mizubasho.glb', bloom: B2_FLOWERS + 'f2_ice_crystal_bloom.glb',
  };
  const FLOWER = new Set(['snowdrop', 'mizubasho', 'bloom']);
  function extraMat(key) {
    if (mats[key]) return key;
    const std = (o) => new THREE.MeshStandardMaterial(o), rockM = mats['Deep cavern rock'], paleM = mats['Pale mineral stone'];
    const make = {
      'x:stoneDark': () => std({ color: 0x5d95c4, map: rockM.map, normalMap: rockM.normalMap, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.78, emissive: 0x08263f, emissiveIntensity: 1.0, envMapIntensity: 0.6, vertexColors: true }),
      'x:stoneMid': () => std({ color: 0x64a0d2, map: paleM.map, normalMap: rockM.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.62, emissive: 0x0a3a5e, emissiveIntensity: 1.0, envMapIntensity: 0.55, vertexColors: true }),
      'x:snow': () => std({ color: 0xd6f4ff, roughness: 0.85, emissive: 0x1a5a7a, emissiveIntensity: 0.45, envMapIntensity: 0.5, vertexColors: true }),
    };
    mats[key] = floraMaterial(key) || make[key]();   // [B2V4-F] 花の素材は b2-flora.js
    return key;
  }
  // GLB の素材名から、#203 の素材の仲間を選ぶ
  function extraClass(name, m) {
    const nm = (m.name || '').toLowerCase(), trans = (m.transmission || 0) > 0 || m.transparent;
    if (FLOWER.has(name)) return floraMaterialClass(m);   // [B2V4-F]
    if (/snow/.test(nm)) return 'x:snow';
    if (/cobalt|compressed/.test(nm)) return 'crystalDeep';
    if (trans || /ice|glacier/.test(nm)) return 'crystalIce';
    if (/dark|fissure|groove|eroded|slate|weathering/.test(nm)) return 'x:stoneDark';
    return 'x:stoneMid';
  }
  const extraCache = new Map();
  function loadExtra(name) {
    if (extraCache.has(name)) return extraCache.get(name);
    const job = loadGltf(EXTRA_FILES[name]).then((gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const flower = FLOWER.has(name), byKey = new Map(), _c = new THREE.Color();
      gltf.scene.traverse((o) => {
        if (!o.isMesh || !o.geometry?.attributes?.position) return;
        const m = Array.isArray(o.material) ? o.material[0] : o.material, key = extraMat(extraClass(name, m));
        let geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
        if (geo.index) { const ni = geo.toNonIndexed(); geo.dispose(); geo = ni; }
        const src = geo.attributes.color, n = geo.attributes.position.count;
        for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
        if (!geo.attributes.normal) geo.computeVertexNormals();
        if (flower) geo.setAttribute('color', new THREE.BufferAttribute(floraTint(src, m, n, key), 3));   // [B2V4-F] 頂点色 × 素材の色（b2-flora.js）
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push(geo);
      });
      const parts = [], box = new THREE.Box3();
      for (const [key, geos] of byKey) {
        const merged = geos.length > 1 ? mergeGeometries(geos, false) : geos[0];
        if (geos.length > 1) geos.forEach((g2) => g2.dispose());
        if (!merged) continue;
        merged.computeBoundingBox(); box.union(merged.boundingBox);
        parts.push({ geo: merged, mat: key });
      }
      if (!parts.length) throw new Error('empty GLB ' + name);
      const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      const off = new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z);
      for (const pt of parts) pt.geo.applyMatrix4(off);
      return { name, parts, size, lights: [] };
    });
    extraCache.set(name, job);
    return job;
  }
  const { CELL, DIR_VEC, DIR_ORDER, FACE_YAW, hash, g } = api;
  const wt = createB2WaterTiles({ CELL, DIR_VEC, DIR_ORDER, FACE_YAW, hash, M4, proc, mats, CEIL_H, ceilY });   // [B2V4-W]
  let made = [], anim = { ripples: [], mists: [], fishes: [], caustics: [] }, root = null, last = { falls: [], bridge: null };
  let extraGeos = [], extraMats = [];   // 組み立てごとに作る物（作り直すときに破棄する）
  let floraTick = null;                 // [B2V4-F]
  let ownedDisposed = 0;                // 診断用：作り直しで破棄した形・素材の累計（themeInfo().ownedDisposed）

  // 映り込み用の環境マップ（濡れた石・水面・結晶のつや）。小さなグラデーション画像から作るので軽い
  let envTex = null, lantern = null, motes = null, prevExposure = null, prevBloom = null;
  // 空中を漂う光の粒（カメラの周り 24m の箱の中で繰り返す）
  function addMotes() {
    const N = 300, pos = new Float32Array(N * 3), seed = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) seed[i] = rnd(i * 1.7 + 3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const tex = tileTexture(32, (c, n) => { c.clearRect(0, 0, n, n); const gr = c.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, 'rgba(220,250,255,1)'); gr.addColorStop(0.4, 'rgba(140,230,255,0.5)'); gr.addColorStop(1, 'rgba(140,230,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, n, n); });
    const mat = capPoints(new THREE.PointsMaterial({ map: tex, size: 0.09, color: 0xaef4ff, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }), 10 * (g.renderer ? g.renderer.getPixelRatio() : 1));   // [B2V4-L] F1：目の前の粒が大きな光の玉にならない
    motes = new THREE.Points(geo, mat); motes.name = 'b2_motes'; motes.frustumCulled = false; motes.renderOrder = 5; motes.userData.seed = seed; g.scene.add(motes);
    extraMats.push(tex);   // テクスチャも破棄リストへ（dispose を持つので一緒に扱う）
  }
  function ensureEnv() {
    if (envTex || !g.renderer) return;
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const c = cv.getContext('2d');
    const gr = c.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, '#5f9fb2'); gr.addColorStop(0.42, '#22566a'); gr.addColorStop(0.55, '#14394a'); gr.addColorStop(1, '#050f15');
    c.fillStyle = gr; c.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 9; i++) { const x = rnd(i + 3) * 256, y = 46 + rnd(i + 9) * 22, r = 6 + rnd(i + 5) * 14; const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(190,245,255,0.95)'); rg.addColorStop(1, 'rgba(190,245,255,0)'); c.fillStyle = rg; c.fillRect(x - r, y - r, r * 2, r * 2); }
    const eq = new THREE.CanvasTexture(cv); eq.mapping = THREE.EquirectangularReflectionMapping; eq.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(g.renderer); envTex = pm.fromEquirectangular(eq).texture; pm.dispose(); eq.dispose();
  }
  // 第1階層と共有する素材（苔むした階段・宝箱・採集点・看板など）は森の緑のままだと氷の洞窟で浮くので、
  // 第2階層に置いた複製だけ、緑を霜の青白へ寄せた素材に差し替える（元の素材・第1階層の見た目は変えない）
  const frostCache = new Map();
  function frostMat(m) {
    if (!m || (m.customProgramCacheKey && m.customProgramCacheKey() === 'b2frost')) return m;
    let f = frostCache.get(m);
    if (!f) {
      f = m.clone();
      f.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include color_fragment', `#include color_fragment
          { float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            float green = clamp((diffuseColor.g - max(diffuseColor.r, diffuseColor.b)) * 9.0, 0.0, 1.0);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lum) * vec3(0.78, 0.98, 1.14), 0.3 + 0.68 * green); }`);
      };
      f.customProgramCacheKey = () => 'b2frost';
      frostCache.set(m, f); extraMats.push(f);
    }
    return f;
  }
  // 共通処理の dimObj（採り尽くした採集点を暗くする）が素材を差し替えても、毎フレーム霜の素材に戻す
  function frostify(obj) {
    if (!obj || obj.userData.b2Kit) return obj;   // 2層専用の部品は最初から霜の素材
    obj.userData.b2Frost = true;
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map(frostMat) : frostMat(o.material);
      if (o.userData.baseMat) o.userData.baseMat = frostMat(o.userData.baseMat);
    });
    return obj;
  }
  // [B2V4-L] F1：第1階層と共有する導きの灯（青白い灯火・床のルーン）は、第2階層の明るい霧と露出の中では
  // 光る四角（灯の芯）が遠くからピカピカ光った。第2階層に置いた複製だけ、芯の発光を k 倍・点光源を lk 倍にし、
  // 芯（glow_core）の形を横に細くする（元の素材・第1階層は変えない）
  const glowCache = new Map();
  function softGlow(obj, k, lk, thin) {
    if (!obj) return obj;
    obj.traverse((o) => {
      if (!o.isMesh) return;
      const swap = (m) => {
        if (!m || !m.emissive || (m.emissiveIntensity || 0) <= 1.0) return m;
        let d = glowCache.get(m);
        if (!d) { d = m.clone(); d.emissiveIntensity = m.emissiveIntensity * k; glowCache.set(m, d); extraMats.push(d); }
        return d;
      };
      const before = o.material;
      o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
      if (thin && o.material !== before && /glow_core/.test(o.name)) {
        // 芯の中心（底面の中心）を軸に横だけ細くする
        o.geometry.computeBoundingBox(); const c = o.geometry.boundingBox.getCenter(new THREE.Vector3());
        o.position.x += c.x * (1 - thin); o.position.z += c.z * (1 - thin); o.scale.x *= thin; o.scale.z *= thin;
        o.updateMatrix(); o.updateMatrixWorld(true);
      }
    });
    for (const L of obj.userData.lights || []) L.intensity *= lk;
    return obj;
  }
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
  const SP = createSetpieces({ THREE, CELL, CEIL_H, DIR_VEC, DIR_ORDER, FACE_YAW, hash, rnd, mats, proc, kit, M4, groundY, ceilY, mergeGeometries });   // [B2V4-S]

  function dispose(opts) {
    ownedDisposed += made.length + extraGeos.length + extraMats.length;
    for (const geo of made) geo.dispose(); made = [];
    for (const r of anim.ripples) r.mesh.material.dispose();
    for (const m of anim.mists) { m.points.geometry.dispose(); }
    for (const c of anim.caustics) { c.mesh.geometry.dispose(); c.mesh.material.dispose(); c.texture.dispose(); }
    for (const geo of extraGeos) geo.dispose(); extraGeos = []; fishGeo = null;
    for (const m of extraMats) m.dispose(); extraMats = []; frostCache.clear(); glowCache.clear(); floraTick = null;   // [B2V4-F] 花の InstancedMesh・霜の斑も extraMats で破棄
    if (g.scene && envTex && g.scene.environment === envTex) g.scene.environment = null;
    if (lantern) { lantern.parent?.remove(lantern); lantern = null; }
    if (glitter) { glitter.parent?.remove(glitter); glitter = null; }
    if (motes) { motes.parent?.remove(motes); motes.geometry.dispose(); motes.material.dispose(); motes = null; }
    if (g.renderer && prevExposure !== null) { g.renderer.toneMappingExposure = prevExposure; prevExposure = null; }
    if (prevBloom) { prevBloom.pass.threshold = prevBloom.threshold; prevBloom.pass.strength = prevBloom.strength; prevBloom = null; }
    anim = { ripples: [], mists: [], fishes: [], caustics: [] }; root = null;
    // 階層を離れるとき（field-3d-view.js が final を付けて呼ぶ）は、素材・テクスチャ・部品の形もすべて破棄する
    if (opts && opts.final) {
      wt.dispose();   // [B2V4-W]
      const tex = new Set();
      for (const m of Object.values(mats)) { for (const k of ['map', 'normalMap', 'emissiveMap', 'bumpMap']) if (m[k]) tex.add(m[k]); m.dispose(); }
      for (const t of tex) t.dispose();
      if (mistTex) { mistTex.dispose(); mistTex = null; }
      if (envTex) { envTex.dispose(); envTex = null; }
      const geos = new Set(), walk = (v) => { if (!v || typeof v !== 'object') return; if (v.isBufferGeometry) { geos.add(v); return; } if (Array.isArray(v)) v.forEach(walk); else if (v.parts) v.parts.forEach((p) => geos.add(p.geo)); else for (const k of Object.keys(v)) if (k !== 'size') walk(v[k]); };
      walk(kit); walk(proc); walk(xtal);
      if (aqTrim) { aqTrim.parts.forEach((pt) => pt.geo.dispose()); aqTrim = null; }
      for (const job of assetCache.values()) job.then((pc) => pc.parts.forEach((pt) => pt.geo.dispose())).catch(() => {});
      assetCache.clear();
      for (const job of extraCache.values()) job.then((pc) => pc.parts.forEach((pt) => pt.geo.dispose())).catch(() => {});
      extraCache.clear(); gltfCache.clear();
      SP.dispose();   // [B2V4-S]
      for (const geo of geos) if (geo && geo.dispose) geo.dispose();
    }
  }

  async function build(a, S, info) {
    dispose();
    const { ch, def, wallCell, facing } = info;
    const X = (tx) => tx * CELL, Z = (ty) => ty * CELL;
    const objAt = new Map(a.objects.map((o) => [`${o.tx},${o.ty}`, o]));
    const B = new Batcher();
    root = new THREE.Group(); root.name = 'b2_water_source'; g.world.add(root);
    placedLog = [];
    ensureEnv(); if (envTex) g.scene.environment = envTex;
    if (g.renderer) { if (prevExposure === null) prevExposure = g.renderer.toneMappingExposure; g.renderer.toneMappingExposure = EXPOSURE; }
    { // [B2V4-L] F1：にじみ（ブルーム、高画質のみ）を第2階層だけ控えめに。強い光源のまわりだけがにじむ（第1階層へ戻ると元に戻す）
      const bp = g.composer && g.composer.passes.find((q) => 'threshold' in q && 'strength' in q);
      if (bp) { if (!prevBloom) prevBloom = { pass: bp, threshold: bp.threshold, strength: bp.strength }; bp.threshold = BLOOM.threshold; bp.strength = BLOOM.strength; }
    }
    addMotes(); addGlitter();
    lantern = new THREE.PointLight(LANTERN.color, g.high ? LANTERN.high : LANTERN.low, LANTERN.range, 2); lantern.name = 'b2_lantern'; g.scene.add(lantern);
    wallCellAt = wallCell; objAtB = (tx, ty) => objAt.has(`${tx},${ty}`);
    const isWet = (tx, ty) => !wallCell(tx, ty) && ch(tx, ty) === '*' && !objAt.has(`${tx},${ty}`);
    // [RANDOM-MAZE] ランダム階（5F・6F）は生成器の役割 a.tileRoles を使って見せ場の素材を足す。4F（固定）は roles=null で #203 のまま
    const roles = a.tileRoles && a.random ? a.tileRoles : null;
    const role = (tx, ty) => (roles && roles[ty] && roles[ty][tx]) || 'wall';
    const salt = roles ? ((a.random.seed >>> 0) % 100003) + 1 : 0;
    const H = (x, y, s) => hash(x, y, s + salt);   // 足した素材の乱数（同じ迷宮＝同じ seed なら同じ見た目）
    const propCells = new Set();                   // 足した大物（祭壇・遺跡・柱・氷岸）のマス。#203 の壁ぎわの石筍・根元の岩はここでは出さない（重なり防止）
    const extrasJob = Promise.all([...FLOWER, ...(roles ? ['ruinFallen', 'ruinSpire', 'ruinRubble', 'ruinParapet', 'bankL', 'bankR', 'shrine'] : ['ruinFallen', 'ruinRubble', 'bankL', 'bankR'])]   // [B2V4-S] 4F も柱群（倒れた柱・瓦礫）と橋のたもと（氷岸）に使う
      .map((nm) => loadExtra(nm).then((pc) => [nm, pc]).catch((e) => { console.warn('[field-3d] 第2階層の追加素材を読めなかったため置きません:', nm, e); return [nm, null]; })))
      .then((l) => Object.fromEntries(l));

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
    let streamCount = 0, pillarCount = 0;
    const streamLog = [];   // [B2V4-L] 診断用：天井の水流のマス（themeInfo().streams）
    keepClear = new Set();
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
      addAtrium(sky.cx * CELL, sky.cy * CELL, B, sky.cx, sky.cy);
    }

    // 結晶の溜まり場：行き止まり（優先）と部屋の角から、各フロア最大3か所（互いに7マス以上離す）
    const zones = [], zoneCells = new Set();
    {
      const cands = [];
      for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
        const key = `${tx},${ty}`, c = ch(tx, ty);
        if (wallCell(tx, ty) || objAt.has(key) || falls.has(key) || openCells.has(key) || '<>*'.includes(c)) continue;
        const ws = DIR_ORDER.filter((d) => wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]));
        if (ws.length === 3) {
          const openD = DIR_ORDER.find((d) => !ws.includes(d)), back = DIR_ORDER[(DIR_ORDER.indexOf(openD) + 2) % 4];
          cands.push({ tx, ty, bx: DIR_VEC[back][0], bz: DIR_VEC[back][1], deadEnd: true, openD, r: hash(tx, ty, 700) });
        } else if (ws.length === 2) {
          const [d1, d2] = ws; if (DIR_VEC[d1][0] + DIR_VEC[d2][0] === 0 && DIR_VEC[d1][1] + DIR_VEC[d2][1] === 0) continue;   // 向かい合う2面（通路）は除く
          cands.push({ tx, ty, bx: DIR_VEC[d1][0] + DIR_VEC[d2][0], bz: DIR_VEC[d1][1] + DIR_VEC[d2][1], deadEnd: false, r: 0.5 + hash(tx, ty, 700) });
        }
      }
      cands.sort((p, q) => p.r - q.r);
      for (const cz of cands) {
        if (zones.length >= 3) break;
        if (zones.some((z) => Math.abs(z.tx - cz.tx) + Math.abs(z.ty - cz.ty) < 7)) continue;
        cz.pal = XTAL_PALS[Math.floor(hash(cz.tx, cz.ty, 701) * XTAL_PALS.length)];
        zones.push(cz); zoneCells.add(`${cz.tx},${cz.ty}`);
      }
    }

    // ---- モニュメント（3Fだけ・各1回）：まわりを通路に囲まれた壁の塊（もともと通れない場所）の見た目を、岩の壁からモニュメントに置き換える。
    // 通れない場所に置くので、見た目と通行判定は食い違わない。塊は地図から探す（地図が変わって合う塊が無ければ置かない）
    const monuments = [], monumentCells = new Set();
    const floorNo = (() => { try { return Number(fieldState.floor); } catch (_) { return -1; } })();
    const allWall = (x0, y0, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!wallCell(x0 + i, y0 + j) || x0 + i <= 0 || y0 + j <= 0 || x0 + i >= a.w - 1 || y0 + j >= a.h - 1 || monumentCells.has(`${x0 + i},${y0 + j}`) || (roles && objAt.has(`${x0 + i},${y0 + j}`))) return false; return true; };   // [RANDOM-MAZE] 合図石・立て札の付いた壁は塊にしない
    const openRatio = (x0, y0, w, h) => { let o = 0, n = 0; for (let i = -1; i <= w; i++) for (const j of [-1, h]) { n++; if (!wallCell(x0 + i, y0 + j)) o++; } for (let j = 0; j < h; j++) for (const i of [-1, w]) { n++; if (!wallCell(x0 + i, y0 + j)) o++; } return o / n; };
    const findBlock = (sizes, minOpen) => {
      let best = null;
      for (const [w, h] of sizes) for (let y = 1; y + h < a.h; y++) for (let x = 1; x + w < a.w; x++) {
        if (!allWall(x, y, w, h)) continue;
        const r = openRatio(x, y, w, h); if (r < minOpen) continue;
        if (monuments.some((m) => x < m.x + m.w + 2 && x + w + 2 > m.x && y < m.y + m.h + 2 && y + h + 2 > m.y)) continue;   // ほかのモニュメントと2マス以上離す
        if (!best || r > best.r) best = { x, y, w, h, r };
      }
      return best;
    };
    const monumentFloor = floorNo === 2 || (roles && floorNo === 1);   // [RANDOM-MAZE] 5F（ランダム）も、合う壁の塊があれば置く
    if (monumentFloor) {
      // [B2V4-S] 大型の水路橋（古代の氷橋）・水車の中庭はマップ外の背景（sp.planBackdrops）へ移した。マップ内の塊に残すのは祭壇だけ（正面は開けた側へ）
      for (const [name, sizes, minOpen] of [['altar', [[3, 2], [2, 3]], 0.8]]) {
        const bl = findBlock(sizes, minOpen); if (!bl) continue;
        monuments.push({ name, ...bl });
        for (let j = 0; j < bl.h; j++) for (let i = 0; i < bl.w; i++) monumentCells.add(`${bl.x + i},${bl.y + j}`);
      }
    }
    // 氷結した古代水門：大広間の外壁に埋め込む（正面の1辺だけが通路に面した、奥行き2マスの壁の並び）。3Fだけ・1回
    const gateRoleCells = [];   // [B2V4-S]
    if (roles) for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) if (role(tx, ty) === SP_ROLES.watergate) gateRoleCells.push([tx, ty]);
    const mazeGates = (roles && a.b2Features && a.b2Features.watergates) || [];   // [B2V4-S] 迷宮班 M の水門の展示区画があれば、壁の塊ではなくそこへ置く
    if (monumentFloor && !mazeGates.length) {   // [B2V4-S]
      let best = null;
      for (let y = 1; y < a.h; y++) for (let x = 1; x + 4 <= a.w - 1; x++) {
        // 正面が北（y-1 の行が4マスとも通路）、奥行き2マス（y, y+1）が壁。モニュメントのマスとは重ねない
        let ok = true; for (let j = 0; j < 2 && ok; j++) for (let i = 0; i < 4; i++) { const cx = x + i, cy = y + j; if (!wallCell(cx, cy) || monumentCells.has(`${cx},${cy}`) || cx <= 0 || cx >= a.w - 1 || (roles && objAt.has(`${cx},${cy}`))) { ok = false; break; } }
        if (!ok) continue;
        let front = 0; for (let i = 0; i < 4; i++) if (!wallCell(x + i, y - 1) && !objAt.has(`${x + i},${y - 1}`)) front++;
        if (front < 4) continue;
        if (monuments.some((m) => Math.abs((m.x + m.w / 2) - (x + 2)) < 3 && Math.abs((m.y + m.h / 2) - (y + 1)) < 4)) continue;   // 水路橋の真後ろは避ける
        let score = hash(x, y, 830);
        if (gateRoleCells.length) score -= Math.min(...gateRoleCells.map(([qx, qy]) => Math.abs(qx - (x + 1.5)) + Math.abs(qy - y))) * 10;   // [B2V4-S] M の水門の区画（setpiece-watergate）に近い所を優先
        if (!best || score > best.score) best = { x, y, w: 4, h: 2, score };
      }
      if (best) { monuments.push({ name: 'watergate', niche: true, ...best }); for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) monumentCells.add(`${best.x + i},${best.y + j}`); }
    }
    // [B2V4-S] 見せ場（階段・背景・水門・橋・柱群）。背景の窓・階段の口の壁はここで決め、下の壁の処理で立てない
    const sp = SP.begin({ a, roles, ch, wallCell, objAt, B, light, placeAsset, falls, openCells, zoneCells, monumentCells });
    sp.planStairs();
    const backdrops = monumentFloor ? sp.planBackdrops(['bridge'])   /* [B2V4-S] 水車の中庭は窓越しに車輪と読めないため背景から外した */ : [];
    const assets = {};
    const wantAssets = [...monuments.map((m) => m.name), 'pillarA', 'pillarR', 'pillarG', ...backdrops.map((q) => q.name)];
    if (monuments.some((m) => m.name === 'bridge') || backdrops.some((q) => q.name === 'bridge')) wantAssets.push('aqueduct', 'shoreline');
    if (bridge || (roles && roles.some((row) => row && row.includes && row.includes(SP_ROLES.bridge)))) wantAssets.push('bridgeLite');
    if (mazeGates.length) wantAssets.push('watergate');   // [B2V4-S]
    await Promise.all([...new Set(wantAssets)].map(async (nm) => {
      try { assets[nm] = await loadAsset(nm); } catch (e) { console.warn('[field-3d] 第2階層の追加素材を読めなかったため置きません:', nm, e); }
    }));
    monumentCellsRef = monumentCells;
    for (let k = monuments.length - 1; k >= 0; k--) if (!assets[monuments[k].name]) { const m = monuments[k]; for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) monumentCells.delete(`${m.x + i},${m.y + j}`); monuments.splice(k, 1); }
    const EX = await extrasJob;
    const layout = roles ? planRandomExtras() : null;
    const flowerSpots = [];   // 花の候補（#203 の光るキノコ・荊の位置と、ランダム階の水辺・部屋の隅・結晶の脇）。最後に数を絞って置く

    // [B2V4-F] 花（霜鈴草・氷水芭蕉・氷晶花）の群れと群生地は b2-flora.js（flowerSpots は #203 の光るキノコ・荊の位置の候補）
    const flora = createFlora({ a, ch, wallCell, objAt, roles, role, H, X, Z, CELL, DIR_VEC, DIR_ORDER, groundY, falls, openCells, propCells, monumentCells, keepClear, zones, sky, onBridge, spots: flowerSpots, EX, mats, root, light });
    const placeFlowers = () => { flora.place(); extraMats.push(...flora.disposables); floraTick = flora.tick; };   // [B2V4-F]

    // [RANDOM-MAZE] ランダム階だけ：役割から見せ場の素材を置く（規則は B2_RANDOM_MAZE_SPEC.md §8.1。番号はそこと対応）
    // #203 の見せ場（滝・吹き抜け・結晶の溜まり場・モニュメント・石柱・門柱）は上の #203 の処理がそのまま選ぶ。ここでは足すだけ
    function planRandomExtras() {
      const out = { altar: null, pillars: 0, ruins: 0, ruinClusters: 0, banks: 0, cells: { pillar: [], ruin: [], bank: [] } };
      const vec = (d) => DIR_VEC[d];
      const cheb = (p, q) => Math.max(Math.abs(p.tx - q.tx), Math.abs(p.ty - q.ty));
      const yawAlong = (vx, vz) => Math.atan2(-vz, vx);   // 部品のローカル +X を世界の (vx, vz) へ向ける回転
      const wallsOf = (tx, ty) => DIR_ORDER.filter((d) => wallCell(tx + vec(d)[0], ty + vec(d)[1]));
      const blocked = (tx, ty) => { const k = `${tx},${ty}`, c = ch(tx, ty); return wallCell(tx, ty) || objAt.has(k) || c === '<' || c === '>' || falls.has(k) || openCells.has(k) || zoneCells.has(k) || role(tx, ty) === 'fixed'; };
      const nearObj = (tx, ty) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (objAt.has(`${tx + dx},${ty + dy}`)) return true; return false; };
      const nearProp = (tx, ty, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (propCells.has(`${tx + dx},${ty + dy}`) || monumentCells.has(`${tx + dx},${ty + dy}`) || keepClear.has(`${tx + dx},${ty + dy}`)) return true; return false; };
      const isCorner = (ws) => ws.length === 2 && (DIR_ORDER.indexOf(ws[1]) - DIR_ORDER.indexOf(ws[0])) % 2 !== 0;
      const sightOf = (tx, ty, d) => { let s = 0; for (let x = tx + vec(d)[0], y = ty + vec(d)[1]; s < 8 && !wallCell(x, y); x += vec(d)[0], y += vec(d)[1]) s++; return s; };
      // 大きさを「幅 w × 奥行き dpt × 高さ h（m）」に収める倍率
      const fit = (pc, w, dpt, h) => Math.min(w / Math.max(pc.size.x, 0.01), dpt / Math.max(pc.size.z, 0.01), h / Math.max(pc.size.y, 0.01));
      const put = (nm, x, y, z, ry, s, tx, ty) => { const pc = EX[nm]; if (!pc) return false; placeAsset(B, 'extras', pc, x, y, z, ry, s, tx, ty); return true; };
      // 部屋のまとまり（room/shore/water を1つ、template は別）
      const ROOMISH = new Set(['room', 'shore', 'water']);
      const regionOf = new Map(), regions = [];
      for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
        const r0 = role(tx, ty), k0 = `${tx},${ty}`;
        if (regionOf.has(k0) || wallCell(tx, ty) || (!ROOMISH.has(r0) && r0 !== 'template')) continue;
        const tplR = r0 === 'template', reg = { id: regions.length, cells: [] }, st = [[tx, ty]];
        regionOf.set(k0, reg.id);
        while (st.length) {
          const [x, y] = st.pop(); reg.cells.push([x, y]);
          for (const d of DIR_ORDER) {
            const nx = x + vec(d)[0], ny = y + vec(d)[1], nk = `${nx},${ny}`, nr = role(nx, ny);
            if (regionOf.has(nk) || wallCell(nx, ny) || (tplR ? nr !== 'template' : !ROOMISH.has(nr))) continue;
            regionOf.set(nk, reg.id); st.push([nx, ny]);
          }
        }
        regions.push(reg);
      }
      const regSize = (tx, ty) => { const id = regionOf.get(`${tx},${ty}`); return id === undefined ? 0 : regions[id].cells.length; };

      // 規則A1〜A3：凍った祭壇は各階1個。6Fでモニュメントの祭壇を置いた階には置かない。
      // 祭壇（約10×11m の素材）は1マスの通路には収まらないので、役割 shrine-candidate（三方が壁・一方だけ床に面した壁のマス）を「祠」にする：
      // その壁のマスの床・天井・内側の3面の壁を作り（#203 のモニュメントと同じ addMonumentGround）、マスいっぱい（3.5m角・高さ約1.6m）に祭壇を置く。
      // 祠のマスはもともと通れない壁なので、見た目（祭壇でふさがった祠）と通行判定が一致する。
      // 口（祠の前の床）が滝・結晶の溜まり場・物・階段・浅瀬・吹き抜け・固定エリア・仕掛け部屋なら不可。行き止まりの奥の祠、口から通路がまっすぐ見通せる所（長いほど・6で頭打ち）を優先。
      // 滝から3マス以内は他に候補が無いときだけ。合図石・立て札の付いた壁と、モニュメントの隣は使わない
      if (EX.shrine && !monuments.some((m) => m.name === 'altar')) {
        const cs = [];
        for (let ty = 1; ty < a.h - 1; ty++) for (let tx = 1; tx < a.w - 1; tx++) {
          if (role(tx, ty) !== 'shrine-candidate' || !wallCell(tx, ty) || objAt.has(`${tx},${ty}`) || nearProp(tx, ty, 1)) continue;
          const dF = DIR_ORDER.find((d) => !wallCell(tx + vec(d)[0], ty + vec(d)[1])); if (!dF) continue;
          if (DIR_ORDER.filter((d) => !wallCell(tx + vec(d)[0], ty + vec(d)[1])).length !== 1) continue;
          const fx = tx + vec(dF)[0], fy = ty + vec(dF)[1];
          if (blocked(fx, fy) || ch(fx, fy) === '*' || role(fx, fy) === 'template' || propCells.has(`${fx},${fy}`)) continue;
          const sight = sightOf(fx, fy, dF);
          const nearFall = [...falls.keys()].some((k) => { const [qx, qy] = k.split(',').map(Number); return cheb({ tx: qx, ty: qy }, { tx: fx, ty: fy }) <= 3; });
          cs.push({ tx, ty, fx, fy, dF, sight, score: (role(fx, fy) === 'deadend' ? 0 : 2) - Math.min(sight, 6) + (nearFall ? 100 : 0) + H(tx, ty, 501) * 0.9 });
        }
        cs.sort((p, q) => p.score - q.score);
        const al = cs[0];
        if (al) {
          const pc = EX.shrine, sc = Math.min(3.5 / pc.size.x, 3.5 / pc.size.z, 3.0 / pc.size.y), x = X(al.tx), z = Z(al.ty);
          monumentCells.add(`${al.tx},${al.ty}`);   // 口の側の壁を立てない（祠の口が開く）
          addMonumentGround({ x: al.tx, y: al.ty, w: 1, h: 1 }, B);
          put('shrine', x, 0, z, FACE_YAW[al.dF], sc, al.tx, al.ty);
          light(x + vec(al.dF)[0] * 1.6, 1.8, z + vec(al.dF)[1] * 1.6, 0x86e2ff, 1.6, 7);
          propCells.add(`${al.fx},${al.fy}`);
          out.altar = { cell: `${al.fx},${al.fy}`, niche: `${al.tx},${al.ty}`, open: DIR_ORDER[(DIR_ORDER.indexOf(al.dF) + 2) % 4], sight: al.sight };
        }
      }

      // 規則P1〜P3：部屋の本当の角（二方が壁＋その間の斜めも壁）に石柱V3。通路・道・行き止まりには置かない。
      // 1部屋2本まで・全体4本まで（#203 の「4マスが通れる角」の柱・門柱とは別に数える）。同じ部屋は同じ種類、4本目は崩れた柱。
      // 他の大物・モニュメントから2マス以上。物の8近傍・固定エリアは不可。角へ1.72m寄せる（通れるマスの中央は空ける）
      if (assets.pillarA || assets.pillarG) {
        const styles = [assets.pillarA ? 'pillarA' : 'pillarG', assets.pillarG ? 'pillarG' : 'pillarA', assets.pillarR ? 'pillarR' : 'pillarA'];
        const byRegion = new Map();
        for (let ty = 1; ty < a.h - 1; ty++) for (let tx = 1; tx < a.w - 1; tx++) {
          const r0 = role(tx, ty);
          if ((!ROOMISH.has(r0) && r0 !== 'template') || blocked(tx, ty) || propCells.has(`${tx},${ty}`) || nearObj(tx, ty)) continue;
          const ws = wallsOf(tx, ty); if (!isCorner(ws)) continue;
          const v0 = vec(ws[0]), v1 = vec(ws[1]); if (!wallCell(tx + v0[0] + v1[0], ty + v0[1] + v1[1])) continue;
          const id = regionOf.get(`${tx},${ty}`); if (id === undefined) continue;
          if (!byRegion.has(id)) byRegion.set(id, []);
          byRegion.get(id).push({ tx, ty, ws, r: H(tx, ty, 530) });
        }
        for (const [id, list] of [...byRegion].sort((p, q) => H(p[0], 3, 531) - H(q[0], 3, 531))) {
          const style = H(id, 7, 532) < 0.6 ? 0 : 1;
          let n = 0;
          for (const cn of list.sort((p, q) => p.r - q.r)) {
            // [B2V4-S] 旧：部屋の角に石柱を1本ずつ（全体4本）→ 部屋の角に遺跡群を1つ（全体2つまで。群れどうし6マス以上）
            if (out.pillars >= 2 || n >= 1) break;
            if (nearProp(cn.tx, cn.ty, 2) || ch(cn.tx, cn.ty) === '*') continue;
            const v0 = vec(cn.ws[0]), v1 = vec(cn.ws[1]), px = X(cn.tx) + (v0[0] + v1[0]) * 0.75, pz = Z(cn.ty) + (v0[1] + v1[1]) * 0.75;
            const fw = [-(v0[0] + v1[0]) / Math.SQRT2, -(v0[1] + v1[1]) / Math.SQRT2];
            if (sp.pillarCluster(px, pz, 'corner', fw, assets, EX, cn.tx, cn.ty, cn.tx * 23 + cn.ty * 41 + salt)) { propCells.add(`${cn.tx},${cn.ty}`); n++; out.pillars++; out.cells.pillar.push(`${cn.tx},${cn.ty}:${cn.ws.join('+')}`); }
          }
        }
      }

      // 規則R1〜R3：石造遺跡V4は (a) 12マス以上の部屋のふち（一方だけ壁、反対側の左右が開いている room/shore）と
      // (b) 行き止まりの手前の通路（deadend に隣接し、平行な二方が壁の corridor/road）だけ。群れで置く：中心＋仲間（部屋2・通路1、中心から2〜3マス）。
      // 群れの中心どうし6マス以上・群れは3つ・全体7個まで。中心は他の大物から2マス、仲間は1マス以上。物の8近傍・浅瀬・固定・テンプレートは不可。壁ぎわへ1.2〜1.3m
      if (EX.ruinFallen || EX.ruinSpire || EX.ruinRubble || EX.ruinParapet) {
        const cands = [];
        for (let ty = 1; ty < a.h - 1; ty++) for (let tx = 1; tx < a.w - 1; tx++) {
          const r0 = role(tx, ty);
          if (blocked(tx, ty) || propCells.has(`${tx},${ty}`) || nearObj(tx, ty) || ch(tx, ty) === '*' || r0 === 'template') continue;
          const ws = wallsOf(tx, ty);
          if ((r0 === 'room' || r0 === 'shore') && ws.length === 1 && regSize(tx, ty) >= 12) {
            const v = vec(ws[0]), side = [Math.abs(v[1]), Math.abs(v[0])];
            if (!wallCell(tx - v[0] + side[0], ty - v[1] + side[1]) && !wallCell(tx - v[0] - side[0], ty - v[1] - side[1])) cands.push({ tx, ty, ws, type: 'edge', r: H(tx, ty, 540) });
          } else if ((r0 === 'corridor' || r0 === 'road') && ws.length === 2 && !isCorner(ws)
              && DIR_ORDER.some((d) => role(tx + vec(d)[0], ty + vec(d)[1]) === 'deadend')) {
            cands.push({ tx, ty, ws, type: 'corr', r: H(tx, ty, 540) });
          }
        }
        cands.sort((p, q) => p.r - q.r);
        const placeRuin = (c, kind) => {
          const x = X(c.tx), z = Z(c.ty), v = vec(c.ws[c.type === 'corr' && H(c.tx, c.ty, 541) < 0.5 ? 1 : 0]), al = [Math.abs(v[1]), Math.abs(v[0])];
          const lat = c.type === 'corr' ? 0 : (H(c.tx, c.ty, 543) - 0.5) * 1.0;
          const pc = EX[kind] || EX.ruinRubble; if (!pc) return false;
          // 壁ぎわの帯に置く（手前の端はマスの中央から1.05m以上。奥は壁の面の裏へ少し入ってよい＝壁に半ば埋もれた遺跡）。長い物（倒れた柱・欄干）は壁に沿わせる
          const along = kind === 'ruinFallen' || kind === 'ruinParapet';
          const s = kind === 'ruinSpire' ? fit(pc, 2.0, 2.0, 4.0) : kind === 'ruinRubble' ? fit(pc, 2.6, 2.4, 1.0) : fit(pc, 3.6, 2.0, 1.8);
          const dpt = along ? pc.size.z * s : Math.hypot(pc.size.x, pc.size.z) * s * 0.8, off = Math.max(1.05 + dpt / 2, 2.15 - dpt / 2);
          const ry = along ? yawAlong(al[0], al[1]) + (H(c.tx, c.ty, 544) < 0.5 ? Math.PI : 0) : H(c.tx, c.ty, 545) * 6.28;
          return put(kind in EX && EX[kind] ? kind : 'ruinRubble', x + v[0] * off + al[0] * lat, -0.04, z + v[1] * off + al[1] * lat, ry, s, c.tx, c.ty);
        };
        const anchors = [];
        for (const c of cands) {
          if (anchors.length >= 3 || out.ruins >= 7) break;
          if (propCells.has(`${c.tx},${c.ty}`) || nearProp(c.tx, c.ty, 2) || anchors.some((q) => cheb(q, c) < 6)) continue;
          const head = c.type === 'corr' ? (H(c.tx, c.ty, 546) < 0.5 ? 'ruinParapet' : 'ruinRubble') : (H(c.tx, c.ty, 547) < 0.55 ? 'ruinFallen' : 'ruinParapet');   // [B2V4-S] F5：単独で立つ柱（埋もれた尖塔）は置かない
          if (!placeRuin(c, head)) continue;
          propCells.add(`${c.tx},${c.ty}`); anchors.push(c); out.ruins++; out.cells.ruin.push(`${c.tx},${c.ty}:${c.ws[0]}`);
          let m = 0; const maxM = c.type === 'corr' ? 1 : 2;
          for (const q of cands) {
            if (m >= maxM || out.ruins >= 7) break;
            const dd = cheb(q, c);
            if (q === c || dd < 2 || dd > 3 || propCells.has(`${q.tx},${q.ty}`) || nearProp(q.tx, q.ty, 1)) continue;
            if (c.type === 'edge' && regionOf.get(`${q.tx},${q.ty}`) !== regionOf.get(`${c.tx},${c.ty}`)) continue;
            if (placeRuin(q, m === 0 ? 'ruinRubble' : (head === 'ruinFallen' ? 'ruinParapet' : 'ruinFallen'))) { propCells.add(`${q.tx},${q.ty}`); m++; out.ruins++; }
          }
          out.ruinClusters++;
        }
      }

      // 規則W1〜W3：氷岸V11（岩の台に氷が載った約3m角・高さ1.8mの岸）は、浅瀬（*）の壁ぎわに「水から立ち上がる氷の岸」として置く。
      // 縮めて約1.6m角、水面から約0.5m。壁の面の裏へ少し入れ、手前の端はマスの中央から1.05m以上（通れるマスの中央は空ける）。
      // 塊6マス以上は2つ、2〜5マスは1つ、1マスは無し、1階4つまで。同じ塊の氷岸どうし3マス以上。橋のある塊・物・滝・大物のマスは不可
      if (EX.bankL || EX.bankR) {
        const seen = new Set();
        for (let ty = 1; ty < a.h - 1; ty++) for (let tx = 1; tx < a.w - 1; tx++) {
          if (seen.has(`${tx},${ty}`) || ch(tx, ty) !== '*' || wallCell(tx, ty)) continue;
          const cells = [], st = [[tx, ty]]; seen.add(`${tx},${ty}`);
          while (st.length) { const [x, y] = st.pop(); cells.push([x, y]); for (const d of DIR_ORDER) { const nx = x + vec(d)[0], ny = y + vec(d)[1], nk = `${nx},${ny}`; if (!seen.has(nk) && ch(nx, ny) === '*' && !wallCell(nx, ny)) { seen.add(nk); st.push([nx, ny]); } } }
          if (cells.length < 2 || cells.some(([x, y]) => onBridge(x, y))) continue;
          const edges = [];
          for (const [wx, wz] of cells) for (const d of DIR_ORDER) {
            if (!wallCell(wx + vec(d)[0], wz + vec(d)[1]) || objAt.has(`${wx},${wz}`) || falls.has(`${wx},${wz}`) || propCells.has(`${wx},${wz}`) || role(wx, wz) === 'fixed' || monumentCells.has(`${wx + vec(d)[0]},${wz + vec(d)[1]}`)) continue;
            const bd = def(ch(wx + vec(d)[0], wz + vec(d)[1])); if (bd && bd.onWall) continue;
            edges.push({ tx: wx, ty: wz, d, r: H(wx * 3 + DIR_ORDER.indexOf(d), wz, 550) });
          }
          edges.sort((p, q) => p.r - q.r);
          const cap = cells.length >= 6 ? 2 : 1, got = [];
          for (const e of edges) {
            if (got.length >= cap || out.banks >= 4) break;
            if (got.some((q) => cheb(q, e) < 3) || nearProp(e.tx, e.ty, 1)) continue;
            const v = vec(e.d), lat = [Math.abs(v[1]), Math.abs(v[0])], sh = (H(e.tx, e.ty, 551) - 0.5) * 1.2;
            const id = H(e.tx, e.ty, 552) < 0.5 ? (EX.bankL ? 'bankL' : 'bankR') : (EX.bankR ? 'bankR' : 'bankL'), pc = EX[id];
            const sc = Math.min(2.2 / Math.max(pc.size.x, pc.size.z, 0.01), 1.25 / Math.max(pc.size.y, 0.01)), half = Math.max(pc.size.x, pc.size.z) * sc / 2;
            const off = Math.max(1.05 + half, 2.2 - half);
            if (put(id, X(e.tx) + v[0] * off + lat[0] * sh, -0.45, Z(e.ty) + v[1] * off + lat[1] * sh, yawAlong(lat[0], lat[1]) + (H(e.tx, e.ty, 553) < 0.5 ? Math.PI : 0), sc, e.tx, e.ty)) {
              got.push(e); out.banks++; out.cells.bank.push(`${e.tx},${e.ty}:${e.d}`); propCells.add(`${e.tx},${e.ty}`);
            }
          }
        }
      }
      return out;
    }

    await wt.begin(a, info, roles);   // [B2V4-W]
    for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
      if (wallCell(tx, ty)) continue;
      const c = ch(tx, ty), x = X(tx), z = Z(ty), key = `${tx},${ty}`;
      const fall = falls.get(key);
      if (wt.isHazard(tx, ty)) { wt.addCell(B, tx, ty, { ch, wallCell, ceiling: !openCells.has(key), skipWall: (k) => monumentCells.has(k) }); continue; }   // [B2V4-W] 危険な水面
      // 床：濡れた石板を2×2枚。すき間から暗い水底がのぞく
      if (c === '*' || (c === '>' && !sp.ownsFloor(tx, ty))) B.add('floor', c === '*' ? proc.shallowBed : proc.bed, M4(x, c === '*' ? -0.34 : -0.3, z), tx, ty);   // [B2V4-S] 下り階段の床は sp が作る
      if (c === '>') { /* 階段の素材が床を兼ねる */ }
      else if (c === '*') {   // 浅瀬：床板の代わりに水面（見た目だけ。通行と歩数の扱いは従来どおり）
        B.add('water', proc.poolFull, M4(x, -0.07, z), tx, ty);
        if (!onBridge(tx, ty)) {
          // 足もとに沈んだ石を1枚
          // 水中の丸い石（四角い石板はタイルに見えるので使わない）
          B.add('rocks', pick(kit.rocks, hash(tx, ty, 2)), M4(x + (hash(tx, ty, 3) - 0.5) * 1.6, -0.3, z + (hash(tx, ty, 4) - 0.5) * 1.6, hash(tx, ty, 5) * 6, [0.7, 0.35, 0.7]), tx, ty);
          // 荊（紫のとげ＝危険の目印）を壁ぎわに
          const side = DIR_ORDER.find((d) => wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]));
          // 旧：荊（紫のとげの簡易な植物）→ 水の中の氷水芭蕉の候補（位置・向きはそのまま）
          if (side && hash(tx, ty, 6) < 0.6) { const [dx, dy] = DIR_VEC[side]; flowerSpots.push({ kind: 'mizubasho', water: true, x: x + dx * 1.45 + (hash(tx, ty, 8) - 0.5) * (dy ? 2 : 0), y: -0.1, z: z + dy * 1.45 + (hash(tx, ty, 8) - 0.5) * (dx ? 2 : 0), ry: hash(tx, ty, 9) * 6, r: hash(tx, ty, 10), tx, ty, d: side }); }
        }
        if (anim.ripples.length < 8 && hash(tx, ty, 11) < 0.10) addRipple(x + (hash(tx, ty, 12) - 0.5) * 2, z + (hash(tx, ty, 13) - 0.5) * 2, hash(tx, ty, 14));
        if (!onBridge(tx, ty) && anim.fishes.length < 14 && hash(tx, ty, 60) < 0.3) addFish(x, z, hash(tx, ty, 61), 1 + Math.floor(hash(tx, ty, 62) * 2));
      } else {
        // 床：石板（タイル）をやめ、隣のマスと高さが続く自然な岩盤にする。
        // 岩盤の素材に発光する水脈の網目（emissiveMap）があり、イメージ画像の光る水路のように見える
        B.add('floor', proc.continuousGround(x, z, CELL), M4(x, 0, z), tx, ty);
        if (!fall && !objAt.has(key) && c !== '<' && hash(tx, ty, 160) < 0.42) {   // 光る水たまり（見た目だけ）
          const pr = hash(tx, ty, 161), pxo = (hash(tx, ty, 162) - 0.5) * 2.2, pzo = (hash(tx, ty, 163) - 0.5) * 2.2;
          B.add('puddles', pick(proc.puddles, pr), M4(x + pxo, groundY(x + pxo, z + pzo) + 0.035, z + pzo, pr * 6.28, 0.7 + hash(tx, ty, 164) * 0.7), tx, ty);
        }
      }
      // 水際の岩棚：陸と浅瀬の境目だけに生成。水路を横切る橋や階段は除外。
      if (c !== '*' && c !== '>' && c !== '<' && !objAt.has(key)) {
        for (const d of DIR_ORDER) {
          const [dx, dz] = DIR_VEC[d];
          if (ch(tx + dx, ty + dz) !== '*') continue;
          const rx = x + dx * (CELL / 2 - 0.38);
          const rz = z + dz * (CELL / 2 - 0.38);
          const rot = Math.atan2(dx, dz);
          B.add('shoreline', pick(proc.shoreline, hash(tx, ty, 220 + DIR_ORDER.indexOf(d))),
            M4(rx, 0, rz, rot), tx, ty);
        }
      }
      // 水面と洞窟壁が直角に接する場所へ、低い氷結岩棚を追加。
      // 壁際のみ、階段・橋・イベント・滝は回避。装飾は静的バッチへ統合。
      if (c !== '*' && c !== '>' && c !== '<' && !objAt.has(key) && !fall && !onBridge(tx, ty)) {
        const edge = DIR_ORDER.find((d) => wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]));
        const nearWater = DIR_ORDER.some((d) => ch(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]) === '*');
        if (edge && nearWater && hash(tx, ty, 351) < 0.38) {
          const [dx, dz] = DIR_VEC[edge];
          // 旧：光るキノコ（簡易な手続きの形）→ 氷水芭蕉の候補（位置・向きはそのまま。数は placeFlowers で絞る）
          if (!propCells.has(key)) flowerSpots.push({ kind: 'mizubasho', x: x + dx * 1.55, y: groundY(x + dx * 1.55, z + dz * 1.55), z: z + dz * 1.55, ry: hash(tx, ty, 353) * Math.PI * 2, r: hash(tx, ty, 354), tx, ty, d: edge });
        }
      }
      if (c === '*' && !onBridge(tx, ty) && !objAt.has(key) && !falls.has(key)) {
        for (const d of DIR_ORDER) {
          const [dx, dz] = DIR_VEC[d], di = DIR_ORDER.indexOf(d);
          if (!wallCell(tx + dx, ty + dz) || hash(tx, ty, 340 + di) >= 0.52) continue;
          const along = (hash(tx, ty, 345 + di) - 0.5) * 0.95;
          B.add('frost_ledge', pick(proc.frostLedges, hash(tx, ty, 350 + di)),
            M4(x + dx * (CELL / 2 - 0.25) + dz * along, -0.015,
              z + dz * (CELL / 2 - 0.25) + dx * along,
              Math.atan2(dx, dz), 0.78 + hash(tx, ty, 355 + di) * 0.22), tx, ty);
        }
      }
      // 天井
      if (!openCells.has(key)) B.add('ceiling', proc.continuousCeiling(x, z, CELL), M4(x, CEIL_H, z), tx, ty);
      // 天井の小規模な鍾乳状の稜線。密集させず、広い空間の端に限る。
      if (!openCells.has(key) && !objAt.has(key) && c !== '>' && c !== '<'
          && hash(tx, ty, 230) < 0.24) {
        const ox = (hash(tx, ty, 231) - 0.5) * 2.2;
        const oz = (hash(tx, ty, 232) - 0.5) * 2.2;
        B.add('ceiling_details', pick(proc.ceilingRidge, hash(tx, ty, 233)),
          M4(x + ox, ceilY(x + ox, z + oz) + 0.3, z + oz, hash(tx, ty, 234) * Math.PI * 2), tx, ty);
      }
      // 通路中央を避けて、天井付近に控えめな氷柱群を配置。
      if (!openCells.has(key) && !objAt.has(key) && c !== '>' && c !== '<'
          && hash(tx, ty, 240) < 0.34) {
        const side = hash(tx, ty, 241) < 0.5 ? -1 : 1;
        const ox = side * (1.12 + hash(tx, ty, 242) * 0.42);
        const oz = (hash(tx, ty, 243) - 0.5) * 2.4;
        B.add('ice_stalactites', pick(proc.iceStalactites, hash(tx, ty, 244)),
          M4(x + ox, rootY(x + ox, z + oz, 0.35), z + oz, hash(tx, ty, 245) * Math.PI * 2, 0.85 + hash(tx, ty, 246) * 0.5), tx, ty);
      }
      // v8 の氷柱・石筍を通路の端に控えめに配置。視界とイベントマスを優先する。
      if (v8 && !objAt.has(key) && c !== '>' && c !== '<' && !falls.has(key)) {
        const side = DIR_ORDER.find((d) => wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]));
        if (side && c !== '*') {
          const [dx, dz] = DIR_VEC[side];
          if (v8.stalagmites.length && hash(tx, ty, 301) < 0.27) {
            B.add('v8_stalagmites', pick(v8.stalagmites, hash(tx, ty, 302)),
              M4(x + dx * 1.35, -0.05, z + dz * 1.35, hash(tx, ty, 303) * 6.28), tx, ty);
          }
          if (v8.erosion.length && hash(tx, ty, 304) < 0.20) {
            B.add('v8_erosion', pick(v8.erosion, hash(tx, ty, 305)),
              M4(x + dx * 1.45, -0.08, z + dz * 1.45, hash(tx, ty, 306) * 6.28), tx, ty);
          }
        }
        // v8 の天井氷（丸い塊）は、ポップコーンのように見え、天井を突き抜けて板状の底面が見えていたため使わない。
        // 代わりに壁ぎわへ細い氷柱の房を寄せる（視界の中央をふさがない）。
        if (!openCells.has(key) && side && hash(tx, ty, 307) < 0.3) {
          const [dx, dz] = DIR_VEC[side], al = (hash(tx, ty, 309) - 0.5) * 2.4;
          const ix = x + dx * 1.55 + (dz ? al : 0), iz = z + dz * 1.55 + (dx ? al : 0);
          B.add('ice_stalactites', pick(proc.iceStalactites, hash(tx, ty, 308)), M4(ix, rootY(ix, iz, 0.4), iz, hash(tx, ty, 311) * 6.28, 1.0 + hash(tx, ty, 310) * 0.6), tx, ty);
        }
      }
      // 部屋の上の長い鍾乳石（先端は4.2m以上。目の高さ1.6mの視界はふさがない）
      if (!openCells.has(key) && hash(tx, ty, 560) < 0.38) {
        const sx = x + (hash(tx, ty, 561) - 0.5) * 3.2, sz = z + (hash(tx, ty, 562) - 0.5) * 3.2, h = 0.8 + hash(tx, ty, 563) * 1.7;
        B.add('spires', pick(proc.stalactites, hash(tx, ty, 564)), M4(sx, rootY(sx, sz, h * 0.24), sz, hash(tx, ty, 565) * 6.28, [h * 0.75, h, h * 0.75]), tx, ty);
      }
      // 天井から落ちる光る水流（浅瀬に多め。フロアあたり最大10本）
      if (streamCount < 10 && !objAt.has(key) && c !== '>' && c !== '<' && !openCells.has(key) && hash(tx, ty, 570) < (c === '*' ? 0.32 : 0.05)) {
        const sx = x + (hash(tx, ty, 571) - 0.5) * 2.4, sz = z + (hash(tx, ty, 572) - 0.5) * 2.4, top = ceilY(sx, sz), base = c === '*' ? -0.07 : groundY(sx, sz);
        B.add('streams', proc.stream, M4(sx, base, sz, 0, [1, top - base, 1]), tx, ty);
        B.add('puddles', proc.streamPuddle, M4(sx, base + 0.03, sz, hash(tx, ty, 573) * 6.28, 0.8), tx, ty);   // [統合2] 約2m のぼんやりした明るみ
        streamLog.push(`${tx},${ty}`);
        light(sx, 1.4, sz, 0x7fe8ff, 0.45, 4);   // [B2V4-L] F1：真上の強い光で床の水たまりが白い円に見えたので、高く・弱く
        streamCount++;
      }
      // 光るキノコ（壁ぎわ。陸のマス）
      if (c !== '*' && c !== '>' && c !== '<' && !objAt.has(key) && !fall && hash(tx, ty, 580) < 0.26) {
        const d = DIR_ORDER.find((q) => wallCell(tx + DIR_VEC[q][0], ty + DIR_VEC[q][1]));
        if (d) {
          const [dx, dz] = DIR_VEC[d], al = (hash(tx, ty, 581) - 0.5) * 2.4, mx = x + dx * 1.45 + (dz ? al : 0), mz = z + dz * 1.45 + (dx ? al : 0);
          // 旧：光るキノコ → 霜鈴草（結晶の溜まり場の隣のマスなら氷晶花）の候補（位置・向きはそのまま）
          const nearZone = zones.some((zq) => Math.max(Math.abs(zq.tx - tx), Math.abs(zq.ty - ty)) <= 1);
          if (!propCells.has(key)) flowerSpots.push({ kind: nearZone ? 'bloom' : 'snowdrop', x: mx, y: groundY(mx, mz), z: mz, ry: hash(tx, ty, 583) * 6.28, r: hash(tx, ty, 584), tx, ty, d });
        }
      }
      // 壁と、壁ぎわの岩・鉱脈・壁付きの物
      for (const d of DIR_ORDER) {
        const [dx, dy] = DIR_VEC[d]; if (!wallCell(tx + dx, ty + dy)) continue;
        if (monumentCells.has(`${tx + dx},${ty + dy}`)) continue;   // モニュメントの面は壁を立てない
        if (sp.skipWall(tx, ty, d)) continue;   // [B2V4-S] 階段の口・背景の窓は sp が穴の開いた壁を立てる
        const ex = x + dx * CELL / 2, ez = z + dy * CELL / 2, k = hash(tx * 4 + DIR_ORDER.indexOf(d), ty, 5), ry = FACE_YAW[d] + Math.PI;
        const along = [dy ? 1 : 0, dx ? 1 : 0];   // 壁に沿う向き（x, z）
        B.add('walls', proc.continuousWall(ex, ez, ry, CELL), M4(ex, 0, ez, ry), tx, ty);
        { // 壁ぎわの石筍（床から）と鍾乳石（天井から）。大きさに幅を持たせて空洞の大きさを感じさせる
          const di = DIR_ORDER.indexOf(d), nn = def(ch(tx + dx, ty + dy));
          const wallThing = (nn && nn.onWall) || objAt.has(key) || zoneCells.has(key) || propCells.has(key);   // [RANDOM-MAZE] 足した大物のマスも（4F は常に空）   // 合図石・立て札の壁と、物（門・宝箱・NPC など）のあるマスはふさがない
          for (let q = 0; q < 2; q++) {   // 1つの壁に最大2か所ずつ
            const sd = di * 2 + q * 97;
            if (!wallThing && fall !== d && c !== '>' && c !== '<' && hash(tx, ty, 500 + sd) < (q ? 0.45 : 0.75)) {
              // [B2V4-L] F3：通路の両側の石筍が中央で重なって道が塞がって見えたので、
              //  ・向かい合う壁で前後にずらす（上・右の壁の高い石筍はマスの前半、下・左の壁は後半。もう1本は反対の半分に低く）
              //  ・壁に沿う向きに置き、通路へ向かう厚みを抑えて壁へ寄せる（通路側へは壁の面から最大約1.1m＝中央に1.6m以上の隙間）
              //  [仕上げ] 統合版は壁に貼り付いた平たい形になり、壁の凹凸に埋もれて見えなくなったので、
              //  ・壁の面から 0.3〜0.55m 離して立て（壁との間に隙間＝とげの輪郭が見える）、断面はほぼ丸いまま
              //  ・通路側への張り出し（根元の中心＋形の Z の張り出し×太さ）は壁の面から 1.3m（低い方は 1.0m）まで
              //    → 両側に出ても中央に 1.4m 以上の通り道。背の高いとげほど太さの上限で細長くなる
              const half = di < 2 ? -1 : 1, tall = q === 0;
              const t = half * (tall ? 1 : -1) * (0.3 + hash(tx, ty, 504 + sd) * 1.3);
              const h = tall ? 0.9 + Math.pow(hash(tx, ty, 512 + sd), 1.5) * 3.2 : 0.7 + hash(tx, ty, 512 + sd) * 1.1;
              const piece = pick(proc.stalagmites, hash(tx, ty, 516 + sd)), pe = piece.ext || { x: 0.6, z: 0.35 };
              const inw = 0.3 + hash(tx, ty, 508 + sd) * 0.25, reach = tall ? 1.3 : 1.0;
              const sAcross = Math.max(0.35, Math.min(h * 0.8, (reach - inw) / pe.z)), sAlong = Math.min(h * 0.8, sAcross * 1.25, (1.95 - Math.abs(t)) / pe.x + 0.4);
              const sx = ex + along[0] * t - dx * inw, sz = ez + along[1] * t - dy * inw;
              const yaw = ry + (hash(tx, ty, 520 + sd) < 0.5 ? 0 : Math.PI) + (hash(tx, ty, 521 + sd) - 0.5) * 0.2;
              B.add('spires', piece, M4(sx, groundY(sx, sz) - 0.05, sz, yaw, [sAlong, h, sAcross]), tx, ty);
            }
            if (!wallThing && !openCells.has(key) && hash(tx, ty, 524 + sd) < (q ? 0.7 : 0.95)) {
              const t = (hash(tx, ty, 528 + sd) - 0.5) * 3.4, inw = 0.15 + hash(tx, ty, 532 + sd) * 0.8, h = 1.1 + Math.pow(hash(tx, ty, 536 + sd), 1.2) * 2.4;
              const sx = ex + along[0] * t - dx * inw, sz = ez + along[1] * t - dy * inw;
              B.add('spires', pick(proc.stalactites, hash(tx, ty, 540 + sd)), M4(sx, rootY(sx, sz, h * 0.24), sz, hash(tx, ty, 544 + sd) * 6.28, [h * 0.75, h, h * 0.75]), tx, ty);
            }
          }
        }
        // 壁の中腹の岩塊（wall_outcrops）は、なめらかな球が壁に貼り付いたように見えたため置かない。凹凸は壁そのものと法線マップで出す
        if (!openCells.has(key) && !objAt.has(key) && !falls.has(key)
            && c !== '>' && c !== '<' && hash(tx, ty, 400 + DIR_ORDER.indexOf(d)) < 0.48) {
          const offset = (hash(tx, ty, 405 + DIR_ORDER.indexOf(d)) - 0.5) * 1.5;
          B.add('frost_cornices', pick(proc.frostCornices, hash(tx, ty, 410 + DIR_ORDER.indexOf(d))),
            M4(ex - dx * 0.10 + along[0] * offset, ceilY(ex - dx * 0.1 + along[0] * offset, ez - dy * 0.1 + along[1] * offset) + 0.02,
              ez - dy * 0.10 + along[1] * offset, ry), tx, ty);
        }
        // 壁と床の境目に低い岩の堆積を置き、直線的な接合部を崩す。
        // 通路中央やイベントマスを避け、歩行判定には影響させない。
        if (!objAt.has(key) && !propCells.has(key) && c !== '>' && c !== '<' && k < 0.72) {
          const rim = pick(v8?.rocks?.length ? v8.rocks : kit.rocks, hash(tx, ty, 180 + DIR_ORDER.indexOf(d)));
          const offset = (hash(tx, ty, 184 + DIR_ORDER.indexOf(d)) - 0.5) * 2.0;
          const scale = 0.22 + hash(tx, ty, 188 + DIR_ORDER.indexOf(d)) * 0.13;
          B.add('rock_seams', rim, M4(ex - dx * 0.12 + along[0] * offset, -0.20,
            ez - dy * 0.12 + along[1] * offset, ry + hash(tx, ty, 192) * 0.8, scale), tx, ty);
        }

        if (!objAt.has(key) && c !== '>' && c !== '<' && fall !== d
            && hash(tx, ty, 390 + DIR_ORDER.indexOf(d)) < 0.29) {
          const offset = (hash(tx, ty, 394 + DIR_ORDER.indexOf(d)) - 0.5) * 1.75;
          const height = 1.45 + hash(tx, ty, 398 + DIR_ORDER.indexOf(d)) * 1.15;
          // [統合2] F9：壁の面は最大1m奥へへこむので、0.12m 手前に固定すると、へこんだ所で淡い石の脈が宙に浮き、
          // 見上げると白い欠片に見えた。実際の壁の面（3点のうち一番奥）に貼り付ける
          let wz = Infinity;
          for (const lo of [-0.4, 0, 0.4]) for (const hy of [-0.3, 0.3]) { const fx = ex + along[0] * (offset + lo), fz = ez + along[1] * (offset + lo); wz = Math.min(wz, wallZ(fx, fz, offset + lo, height + hy, CELL)); }
          const inw = wz - 0.03;
          B.add('frost_veins', pick(proc.frostVeins, hash(tx, ty, 402 + DIR_ORDER.indexOf(d))),
            M4(ex - dx * inw + along[0] * offset, height,
              ez - dy * inw + along[1] * offset, ry, 0.8), tx, ty);
        }
        const n = def(ch(tx + dx, ty + dy));
        const o = n && n.onWall ? a.objects.find((q) => q.tx === tx + dx && q.ty === ty + dy) : null;
        if (o && o.kind === 'switch') {   // 合図石：壁に埋まった結晶。解くと光が消える（第1階層のレバーと同じ扱い）
          const stone = api.place(g.world, tpl.switchStone, ex - dx * 0.35, 0.5, ez - dy * 0.35, ry, 0.45);
          g.entries.push({ o, kind: 'switch', obj: stone, state: null, at: new THREE.Vector3(ex - dx * 0.5, 1.4, ez - dy * 0.5) });
          continue;
        }
        if (o && o.kind === 'sign') {     // 壁の立て札：壁の面に石板（第1階層では壁の中に隠れていた物）
          const pl = api.place(g.world, tpl.plaque, ex - dx * 0.06, 1.55, ez - dy * 0.06, ry);
          g.entries.push({ o, kind: 'sign', obj: pl, state: null, at: new THREE.Vector3(ex - dx * 0.3, 1.5, ez - dy * 0.3) });
          continue;
        }
        if (fall === d) {
          addWaterfall(ex, ez, ry, tx, ty, B);
          light(ex - dx * 1.5, 3.0, ez - dy * 1.5, 0x80cde6, 0.4, 6.5);   // [B2V4-L] F1：滝の帯の0.25m手前にあった光で白い光の点が出たので、離して弱く
          continue;
        }
        if (objAt.has(key) || c === '>' || c === '<') continue;
        if (k > 0.73 && !propCells.has(key)) {   // 壁の根元の岩（通路へのはみ出しは0.5m以内）
          const s = 0.5 + hash(tx, ty + 7 * DIR_ORDER.indexOf(d), 19) * 0.3, t = (hash(tx, ty, 20 + DIR_ORDER.indexOf(d)) - 0.5) * 2.2;
          const piece = pick(kit.boulders, hash(tx, ty, 24 + DIR_ORDER.indexOf(d)));
          const inward = 0.45 - piece.size.z * s * 0.5;
          B.add('rocks', piece, M4(ex + along[0] * t - dx * inward, -0.15, ez + along[1] * t - dy * inward, ry + (hash(tx, ty, 28) - 0.5) * 0.5, s), tx, ty);
        }
      }
      // 結晶は全体に散らさず「結晶の溜まり場」にだけ置く（addCrystalZones）
      if (!objAt.has(key) && !fall && c !== '*') {
        // 開けた場所の小岩（壁が1つもないマスのふち）
        if (DIR_ORDER.every((d) => !wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1])) && hash(tx, ty, 42) < 0.12) {
          B.add('rocks', pick(kit.rocks, hash(tx, ty, 43)), M4(x + (hash(tx, ty, 44) > 0.5 ? 1.5 : -1.5), -0.1, z + (hash(tx, ty, 45) - 0.5) * 2.4, hash(tx, ty, 46) * 6, 0.7), tx, ty);
        }
      }
    }
    for (const z of zones) addCrystalZone(z, B);
    for (const m of monuments) {
      if (m.name === 'bridge') addAqueduct(m, assets, B, { wallCell, objAt, ch });
      else if (m.name === 'watergate') sp.buildWatergate(m, assets[m.name]);   // [B2V4-S] 水で囲み、氷柱・霜を密集
      else addMonument(m, assets[m.name], B, sp.monumentYaw(m));   // [B2V4-S] 正面を開けた側へ
    }
    for (const bd of backdrops) sp.buildBackdrop(bd, assets);   // [B2V4-S] 外周壁の向こうの背景モニュメント
    for (const gt of mazeGates) sp.buildMazeWatergate(gt, assets.watergate);   // [B2V4-S] 迷宮班 M の水門の展示区画（水は水面班 W のタイル）
    addPillars(a, B, assets, { ch, wallCell, objAt, zoneCells, falls, openCells, sp, EX });
    // 柱：4マスが通れる角（マスとマスの間の点）に、床から天井まで届く柱。プレイヤーが通るマスの中心と辺の中点から2m離れている
    const clusterAt = [];   // [B2V4-S] 遺跡群の位置
    for (let ty = 1; ty < a.h; ty++) for (let tx = 1; tx < a.w; tx++) {
      const cells = [[tx - 1, ty - 1], [tx, ty - 1], [tx - 1, ty], [tx, ty]];
      if (cells.some(([cx, cy]) => wallCell(cx, cy) || objAt.has(`${cx},${cy}`) || openCells.has(`${cx},${cy}`) || '<>'.includes(ch(cx, cy)) || falls.has(`${cx},${cy}`))) continue;
      // モニュメント・水路橋のまわり（1マス以内）には柱を立てない（正面をふさがない）
      if (cells.some(([cx, cy]) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (monumentCells.has(`${cx + i},${cy + j}`) || keepClear.has(`${cx + i},${cy + j}`)) return true; return false; })) continue;
      if (hash(tx, ty, 590) > 0.3) continue;
      if (cells.some(([cx, cy]) => propCells.has(`${cx},${cy}`))) continue;   // [RANDOM-MAZE] 足した大物のマスの角には立てない（4F は常に空）
      const px = tx * CELL - CELL / 2, pz = ty * CELL - CELL / 2, sc = 0.8 + hash(tx, ty, 591) * 0.5;
      // 開けた場所の角の一部は、追加素材の石柱（古代の石柱・氷結した石柱・崩れた石柱）にする（フロアあたり最大6本）
      // [B2V4-S] 旧：石柱を1本ずつ（最大6本）→ 遺跡群（柱2本＋梁＋倒れた柱＋瓦礫＋石畳）を最大2か所。群れどうし6マス以上離す
      if (pillarCount < 2 && hash(tx, ty, 594) < 0.45 && assets.pillarA && !clusterAt.some(([qx, qy]) => Math.max(Math.abs(qx - tx), Math.abs(qy - ty)) < 6)) {
        if (sp.pillarCluster(px, pz, 'point', null, assets, EX, tx, ty, tx * 31 + ty * 7)) { clusterAt.push([tx, ty]); for (const [cx, cy] of cells) propCells.add(`${cx},${cy}`); pillarCount++; continue; }
      }
      B.add('spires', pick(proc.columns, hash(tx, ty, 592)), M4(px, 0, pz, hash(tx, ty, 593) * 6.28, [sc, 1, sc]), tx, ty);
    }
    const mazeBridges = (roles && a.b2Features && a.b2Features.bridges) || [];   // [B2V4-S] ランダム階は迷宮班 M の橋だけに架ける（浅瀬の並びには架けない）
    if (bridge && !mazeBridges.length && !sp.buildBridge(bridge, assets.bridgeLite, EX) && !B2V4W_REMOVE_STEPPING_STONES) {   // [B2V4-S] 古代の氷橋の橋桁と欄干＋たもとの氷岸 / [B2V4-W] 飛び石（四角い石板）は廃止。旧の壊れた橋は読めないとき、かつ飛び石を残す設定のときだけ
      const sx = (CELL * 3 - 0.6) / kit.bridge.size.x;
      B.add('landmarks', kit.bridge, M4(X(bridge.tx), -0.42, Z(bridge.ty), bridge.ry, [sx, 1, 1.15]), bridge.tx, bridge.ty);
    }
    for (const fb of mazeBridges) sp.buildMazeBridge(fb, assets.bridgeLite, EX);   // [B2V4-S] 迷宮班 M の橋（水路をまたぐ通り道）に古代の氷橋

    // 物（宝箱・採集・灯・NPC・イベント・仕掛け・階段・出口・ボス門）
    const s = S;
    for (const o of a.objects) {
      if (o.onWall && (o.kind === 'switch' || o.kind === 'sign')) continue;   // 壁の面に置いた
      const x = X(o.tx), z = Z(o.ty), f = facing(o.tx, o.ty), ry = FACE_YAW[f];
      const e = { o, kind: o.kind, obj: null, state: null, at: new THREE.Vector3(x, 1.2, z) };
      switch (o.kind) {
        case 'stairs':   // [B2V4-S] 霜の青い石と氷の段（第1階層の苔の石段は使わない）。上りは背中側へ上り、下りは奥へ降りる
          e.obj = sp.buildStairs(o);
          break;
        case 'save': e.obj = api.place(g.world, getB2Kit().save, x, 0, z); e.obj.userData.b2Kit = true; e.at.y = 1.9; break;   // 霜の魔法陣と氷晶の祭壇（1層の封印石・青い灯は使わない）
        case 'chest': case 'cache': case 'gather': case 'event': e.ry = ry; break;   // 状態に応じて sync で置く
        case 'sign': e.obj = api.place(g.world, getB2Kit().sign, x, 0, z, ry); e.obj.userData.b2Kit = true; e.at.y = 1.8; break;   // 霜の石碑（1層の道標は使わない）
        case 'gate': {   // ボス門：紫の光を帯びた水門（マスの奥側）
          B.add('walls', proc.lintel, M4(x - DIR_VEC[f][0] * 1.7, 0, z - DIR_VEC[f][1] * 1.7, ry), o.tx, o.ty);
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
        case 'door': if (!o.hidden) { const pass = info.open(o.tx, o.ty - 1) || info.open(o.tx, o.ty + 1); e.ry = pass ? 0 : Math.PI / 2; B.add('walls', proc.lintel, M4(x, 0, z, e.ry), o.tx, o.ty); } break;
        default: break;
      }
      g.entries.push(e);
    }
    placeFlowers();
    made = B.build(root, mats);
    last = { falls: [...falls].map(([k, d]) => ({ cell: k, wall: d })), bridge, atrium: sky ? { tx: sky.cx, ty: sky.cy } : null, monuments: monuments.map((m) => ({ name: m.name, x: m.x, y: m.y, w: m.w, h: m.h })), placed: placedLog.slice(), crystalZones: zones.map((z) => ({ tx: z.tx, ty: z.ty, pal: z.pal, deadEnd: z.deadEnd, bx: z.bx, bz: z.bz })), streams: streamLog, buildKey: a.buildKey || a.key, random: !!roles, layout: { ...(layout || {}), ...flora.layout() }, extras: Object.fromEntries(Object.entries(EX).map(([k, v]) => [k, !!v])), ownedDisposed , setpieces: sp.info() };   // [B2V4-S] setpieces
  }

  // 大空洞の縦方向の景観。天井を抜いた3×3マスに高い石造壁と冷光を加える。
  // 3D表示の装飾のみ。通路、壁判定、カメラ、マップイベントは変更しない。
  // 結晶の溜まり場：主役の結晶の塊、群晶、小さな群れを固めて置く。色は溜まり場ごとの主色が7割、ほかの色が3割
  // マスの中心から1.4m以内には置かない（カメラが中に入らない）。見た目だけで通行判定は変えない
  function addCrystalZone(z, B) {
    const X0 = z.tx * CELL, Z0 = z.ty * CELL, len = Math.hypot(z.bx, z.bz), bx = z.bx / len, bz = z.bz / len, sx = -bz, sz = bx;
    let n = 0;
    const put = (size, px, pz, sc, tx = z.tx, ty = z.ty) => {
      const r = hash(z.tx * 7 + n, z.ty * 3 + n, 710 + n); n++;
      const pal = r < 0.7 ? z.pal : XTAL_PALS[Math.floor(hash(z.tx + n, z.ty, 720 + n) * XTAL_PALS.length)];
      B.add('crystal_zone', pick(xtal[pal][size], hash(z.tx, z.ty + n, 730 + n)), M4(px, groundY(px, pz) - 0.06, pz, hash(z.tx + n, z.ty, 740 + n) * 6.28, sc), tx, ty);
    };
    // 主役の塊は奥の壁にめり込ませて大きく置く（カメラは向いている方向の後ろへ下がるので、奥を背にしても中に入らない）
    const ox = X0 + bx * 1.9, oz = Z0 + bz * 1.9;
    put('massive', ox, oz, 2.4 + hash(z.tx, z.ty, 750) * 0.6);
    put('massive', ox + sx * 1.35 - bx * 0.2, oz + sz * 1.35 - bz * 0.2, 1.4 + hash(z.tx, z.ty, 752) * 0.4);
    if (z.deadEnd) put('massive', ox - sx * 1.4 - bx * 0.15, oz - sz * 1.4 - bz * 0.15, 1.2 + hash(z.tx, z.ty, 749) * 0.4);
    // 群晶：主役のまわり
    put('large', ox - sx * 0.9 - bx * 0.6, oz - sz * 0.9 - bz * 0.6, 1.3 + hash(z.tx, z.ty, 753) * 0.4);
    put('large', ox + sx * 0.7 - bx * 0.7, oz + sz * 0.7 - bz * 0.7, 1.1 + hash(z.tx, z.ty, 754) * 0.3);
    put('large', X0 + sx * (z.deadEnd ? -1.6 : 1.6) + bx * 0.2, Z0 + sz * (z.deadEnd ? -1.6 : 1.6) + bz * 0.2, 1.2 + hash(z.tx, z.ty, 748) * 0.3);
    // 中くらい：両側の壁ぎわに2つずつ
    for (const side of [-1, 1]) for (let q = 0; q < 2; q++) put('medium', X0 + sx * side * (1.55 + q * 0.2) + bx * (-0.4 + q * 1.0 + hash(z.tx, z.ty, 755 + side + q) * 0.3), Z0 + sz * side * (1.55 + q * 0.2) + bz * (-0.4 + q * 1.0 + hash(z.tx, z.ty, 757 + side + q) * 0.3), 0.9 + hash(z.tx, z.ty, 759 + side + q) * 0.4);
    // 小さな群れ：床のあちこち（中心から1.4m以上）と壁ぎわ
    for (let i = 0; i < 8; i++) {
      const a = hash(z.tx, z.ty, 760 + i) * 6.28, d = 1.45 + hash(z.tx, z.ty, 764 + i) * 0.5;
      let px = X0 + Math.cos(a) * d, pz = Z0 + Math.sin(a) * d;
      if ((px - X0) * -bx + (pz - Z0) * -bz > 0.8) { px += bx * 1.2; pz += bz * 1.2; }   // 入口側に寄りすぎた物は奥へ
      put('small', px, pz, 0.7 + hash(z.tx, z.ty, 768 + i) * 0.6);
    }
    if (z.deadEnd) {
      const ptx = z.tx - DIR_VEC[z.openD][0] * -1, pty = z.ty - DIR_VEC[z.openD][1] * -1;   // 行き止まりの手前のマス
      if (!wallCellAt(ptx, pty) && !objAtB(ptx, pty)) for (let i = 0; i < 4; i++) {
        const side = i % 2 ? 1 : -1, PX = ptx * CELL, PZ = pty * CELL;
        put(i === 0 ? 'medium' : 'small', PX + sx * side * 1.55 + bx * (0.6 - i * 0.7), PZ + sz * side * 1.55 + bz * (0.6 - i * 0.7), 0.7 + hash(ptx, pty, 770 + i) * 0.4, ptx, pty);
      }
    }
    // [B2V4-L] F1：旧版は結晶の0.6m手前・強さ2.0の点光源で、結晶の面が白く飛んでいた。結晶から離し、弱める
    light(ox - bx * 1.5, 2.0, oz - bz * 1.5, XTAL_LIGHT[z.pal], 1.0, 7);
    light(X0 - bx * 0.5, 0.5, Z0 - bz * 0.5, XTAL_LIGHT[z.pal], 0.55, 4.5);
  }
  // モニュメントを壁の塊の中央に置く。塊の床・天井を作り、塊の中に残った壁のマスとの境目には内向きの壁を立てる。
  // 高さは天井（約6.3m）に収まるよう縮め、塊より短い分の両端は岩と石筍で埋める（入れない場所だと分かるように）
  function addMonument(m, piece, B, faceYaw) {
    const cx = (m.x + (m.w - 1) / 2) * CELL, cz = (m.y + (m.h - 1) / 2) * CELL, along = m.w >= m.h;
    const ry = faceYaw !== undefined ? faceYaw : (along ? 0 : Math.PI / 2);   // [B2V4-S] 模型の正面（+Z）を開けた側へ
    const W = (along ? m.w : m.h) * CELL, D = (along ? m.h : m.w) * CELL;
    const turned = Math.abs(Math.sin(ry)) > 0.5 === along;   // [B2V4-S] 正面を向けたことで模型の幅の向きが塊の短い辺に来たら、両方の辺に収める
    const sc = turned ? Math.min((Math.min(W, D) - 0.6) / Math.max(piece.size.x, piece.size.z), 6.0 / piece.size.y) : Math.min((W - 0.6) / piece.size.x, (D - 0.6) / piece.size.z, 6.0 / piece.size.y);
    addMonumentGround(m, B);
    if (m.niche) {   // 壁に埋め込む：模型の正面（+Z）を北の通路へ向け、正面を塊の北の縁にそろえる
      const s2 = Math.min((W - 0.4) / piece.size.x, (D - 0.2) / piece.size.z, 6.0 / piece.size.y);
      const frontZ = (m.y - 0.5) * CELL;
      placeAsset(B, 'monuments', piece, cx, 0, frontZ + piece.size.z * s2 / 2, Math.PI, s2, m.x, m.y);
      light(cx, 2.6, frontZ - 1.2, 0x8fdcff, 1.5, 8);
      return;
    }
    placeAsset(B, 'monuments', piece, cx, 0, cz, ry, sc, m.x, m.y);
    // 両端の余り（2.5m以上）を岩で埋める
    const gap = (W - piece.size.x * sc) / 2;
    if (gap > 1.2) for (const side of [-1, 1]) {
      const ax = along ? cx + side * (W / 2 - gap / 2) : cx, az = along ? cz : cz + side * (W / 2 - gap / 2);
      for (let q = 0; q < 3; q++) {
        const ox = along ? (hash(m.x, m.y + q, 800 + side) - 0.5) * gap * 0.6 : (hash(m.x + q, m.y, 803 + side) - 0.5) * D * 0.6;
        const oz = along ? (hash(m.x + q, m.y, 806 + side) - 0.5) * D * 0.6 : (hash(m.x, m.y + q, 809 + side) - 0.5) * gap * 0.6;
        B.add('rocks', pick(kit.boulders, hash(m.x + q, m.y, 812 + side)), M4(ax + ox, -0.15, az + oz, hash(m.x, m.y, 815 + q) * 6.28, 0.8 + hash(m.x, m.y + q, 818) * 0.5), m.x, m.y);
        const h = 1.6 + hash(m.x + q, m.y, 821 + side) * 2.6;
        B.add('spires', pick(proc.stalagmites, hash(m.x, m.y + q, 824 + side)), M4(ax - ox * 0.6, 0, az - oz * 0.6, hash(m.x + q, m.y, 827) * 6.28, [h * 0.9, h, h * 0.9]), m.x, m.y);
      }
    }
    light(cx, 3.2, cz, 0x9fdcff, 1.4, 9);
  }
  // 1F・2F（と3F）の石柱：階段・出口・導きの灯の隣のまっすぐな通路に、左右の壁ぎわへ一対（フロアあたり最大2対）。
  // 行き止まり1か所に崩れた石柱を1本（倒れた部分は壁に沿わせる）。物・結晶の溜まり場・滝のマスには置かない
  function addPillars(a, B, assets, ctx) {
    const { ch, wallCell, objAt, zoneCells, falls, openCells, sp, EX } = ctx;
    if (!assets.pillarA) return;
    for (const k of ['pillarA', 'pillarG', 'pillarR']) SP.restylePillar(assets[k]);   // [B2V4-S] 色を洞窟の青へ・上面と縁に霜
    const free = (tx, ty) => !wallCell(tx, ty) && !objAt.has(`${tx},${ty}`) && !zoneCells.has(`${tx},${ty}`) && !falls.has(`${tx},${ty}`) && !openCells.has(`${tx},${ty}`) && !'<>*'.includes(ch(tx, ty));
    const marks = a.objects.filter((o) => o.kind === 'stairs' || o.kind === 'exit' || o.kind === 'save');
    let pairs = 0;
    for (const o of marks) {
      if (pairs >= 2) break;
      for (const d of DIR_ORDER) {
        const tx = o.tx + DIR_VEC[d][0], ty = o.ty + DIR_VEC[d][1];
        if (!free(tx, ty)) continue;
        const side = DIR_ORDER.find((q) => q !== d && DIR_ORDER.indexOf(q) % 2 !== DIR_ORDER.indexOf(d) % 2);   // 通路と直角の向き
        const opp = DIR_ORDER[(DIR_ORDER.indexOf(side) + 2) % 4];
        if (!wallCell(tx + DIR_VEC[side][0], ty + DIR_VEC[side][1]) || !wallCell(tx + DIR_VEC[opp][0], ty + DIR_VEC[opp][1])) continue;
        const pc = assets[pairs % 2 ? 'pillarG' : 'pillarA'] || assets.pillarA;
        for (const q of [side, opp]) {
          // 階段・出口の側（d の反対＝物のある側）の角へ寄せ、入口を左右から挟む門柱にする（立った位置の真横に来ない）
          const [qx, qy] = DIR_VEC[q], [fx, fy] = DIR_VEC[d], px = tx * CELL + qx * 1.35 - fx * 1.3, pz = ty * CELL + qy * 1.35 - fy * 1.3;
          placeAsset(B, 'pillars', pc, px, -0.05, pz, FACE_YAW[q], 0.55, tx, ty);
        }
        pairs++; break;
      }
    }
    if (assets.pillarR) {
      for (let ty = 1; ty < a.h - 1; ty++) for (let tx = 1; tx < a.w - 1; tx++) {
        if (!free(tx, ty)) continue;
        const ws = DIR_ORDER.filter((d) => wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1])); if (ws.length !== 3) continue;
        const open = DIR_ORDER.find((d) => !ws.includes(d)), back = DIR_ORDER[(DIR_ORDER.indexOf(open) + 2) % 4], [bx, bz] = DIR_VEC[back];
        // [B2V4-S] 旧：崩れた石柱を1本だけ → 行き止まりの奥に遺跡群（門のような柱2本＋梁＋崩れた柱＋倒れた柱＋瓦礫＋石畳）
        sp.pillarCluster(tx * CELL + bx * 0.55, ty * CELL + bz * 0.55, 'deadend', [-bx, -bz], assets, EX, tx, ty, tx * 17 + ty * 29);
        return;
      }
    }
  }
  // 水路橋：中央（通れない壁の塊の中）に古代の氷橋、その左右に崩れた水路橋を1基ずつ続け、両端は新しく作った橋台でしめる。
  // 橋脚の間隔（約5.75m）を0.7倍して約4mにそろえ、橋脚がマスの角（通り道から2m離れた点）に立つよう置く。
  // 橋の線はマスの境目の上なので、東西の通り道は橋の両側、南北の通り道はアーチの下を抜ける（当たり判定は変えない）
  const AQ_S = [0.7, 0.58, 0.7];
  function filterPiece(piece, keep, dropMat) {
    // 床に散らばる小さな瓦礫・床の水面（通り道にかかる物）を除いた複製を作る
    const parts = [];
    for (const pt of piece.parts) {
      if (dropMat && dropMat.test(pt.src)) continue;
      const P = pt.geo.attributes.position, N = pt.geo.attributes.normal, keepIdx = [];
      for (let i = 0; i + 2 < P.count; i += 3) {
        const cx = (P.getX(i) + P.getX(i + 1) + P.getX(i + 2)) / 3, cy = (P.getY(i) + P.getY(i + 1) + P.getY(i + 2)) / 3, cz = (P.getZ(i) + P.getZ(i + 1) + P.getZ(i + 2)) / 3;
        if (keep(cx, cy, cz)) keepIdx.push(i);
      }
      if (!keepIdx.length) continue;
      const pos = new Float32Array(keepIdx.length * 9), nor = new Float32Array(keepIdx.length * 9);
      keepIdx.forEach((i, k) => { for (let v = 0; v < 3; v++) { pos.set([P.getX(i + v), P.getY(i + v), P.getZ(i + v)], k * 9 + v * 3); nor.set([N.getX(i + v), N.getY(i + v), N.getZ(i + v)], k * 9 + v * 3); } });
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g2.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      parts.push({ geo: g2, mat: pt.mat, src: pt.src });
    }
    return { name: piece.name + '_trim', parts, size: piece.size, lights: piece.lights, transient: false };
  }
  let aqTrim = null, keepClear = new Set();
  function addAqueduct(m, assets, B, ctx) {
    const { wallCell, objAt } = ctx;
    const along = m.w >= m.h, cx = (m.x + (m.w - 1) / 2) * CELL, cz = (m.y + (m.h - 1) / 2) * CELL;
    // 中央の塊：床・天井・内向きの壁（モニュメントと同じ）＋氷河の水辺を敷き、その上に古代の氷橋
    addMonumentGround(m, B);
    if (assets.shoreline) {
      const sh = assets.shoreline, L = (along ? m.w : m.h) * CELL - 0.6, Dp = (along ? m.h : m.w) * CELL - 0.6;
      placeAsset(B, 'monuments', sh, cx, 0, cz, along ? 0 : Math.PI / 2, [L / sh.size.x, 0.6, Dp / sh.size.z], m.x, m.y);
    }
    const ry = along ? 0 : Math.PI / 2, ax = along ? 1 : 0, az = along ? 0 : 1;
    placeAsset(B, 'monuments', assets.bridge, cx, 0, cz, ry, AQ_S, m.x, m.y);
    // 左右へ崩れた水路橋を1基ずつ（右側は左右反転）。下のマスが通路（物なし）のときだけ
    const unitLen = 16;   // 0.7倍した1基の長さ（約16m＝4マス）
    let ends = [];
    if (assets.aqueduct) {
      // 通り道にかかる床の瓦礫と床の水面は除く（橋脚の根元と、高さ0.9m以上の部分は残す）
      aqTrim = aqTrim || filterPiece(assets.aqueduct, (x, y, z) => y > 0.9 || Math.abs(z) < 1.7, /water/i);
      for (const side of [-1, 1]) {
        const ux = cx + ax * side * unitLen, uz = cz + az * side * unitLen;
        // 1基の下にあたるマス（長さ方向に4マス×橋の両側2列）がすべて通路か
        let ok = true;
        for (let k = -2; k <= 2 && ok; k++) for (const o of [0, 1]) {
          const tx = along ? Math.round(ux / CELL) + k : m.x + o, ty = along ? m.y + o : Math.round(uz / CELL) + k;
          if (monumentCellsRef.has(`${tx},${ty}`)) continue;   // 中央の塊に重なる分はかまわない
          if (wallCell(tx, ty) || objAt.has(`${tx},${ty}`)) ok = false;
        }
        if (!ok) { ends.push({ x: cx + ax * side * 10, z: cz + az * side * 10, side }); continue; }
        const sc = side > 0 ? [-AQ_S[0], AQ_S[1], AQ_S[2]] : AQ_S;
        for (let k = -2; k <= 3; k++) for (const o of [0, 1]) keepClear.add(along ? `${Math.round(ux / CELL) + k * side},${m.y + o}` : `${m.x + o},${Math.round(uz / CELL) + k * side}`);   // 水路橋の下と橋台のまわり
        placeAsset(B, 'monuments', aqTrim, ux, 0, uz, ry, sc, Math.round(ux / CELL), Math.round(uz / CELL));
        ends.push({ x: ux + ax * side * 10, z: uz + az * side * 10, side });
      }
    } else ends = [-1, 1].map((side) => ({ x: cx + ax * side * 10, z: cz + az * side * 10, side }));
    const stone = (assets.bridge.parts.find((pt) => /icy limestone/i.test(pt.src)) || assets.bridge.parts[0]).mat;
    for (const e of ends) addAbutment(e.x, e.z, ry, e.side, stone, B, Math.round(e.x / CELL), Math.round(e.z / CELL));
  }
  // 橋台（新規の造形）：切石を積んだ柱（2.0×2.4m）が水路橋の高さまで立ち、上は崩れて不揃い。
  // 橋の側へ迫り出す持ち送りの石、足もとの瓦礫・岩・石筍、垂れ下がる氷柱で、洞窟の床となじませる。通り道から0.8m以上離す
  function addAbutment(x, z, ry, side, stoneMat, B, tx, ty) {
    placedLog.push({ name: 'abutment', x: +(x / CELL).toFixed(2), z: +(z / CELL).toFixed(2), ry });
    const parts = [], H = 10.18 * AQ_S[1] * 0.92, seed = Math.round(x * 7 + z * 13);
    const course = 0.46;
    // 切石：段ごとに石の幅をばらつかせ、目地を段ごとにずらす（同じ大きさの立方体の格子に見せない）。上ほど石が欠け、細る
    for (let c = 0; c * course < H; c++) {
      const y0 = c * course, taper = 1 - y0 / H * 0.14, Wd = 2.0 * taper, Dd = 2.4 * taper;
      for (const face of [0, 1]) {   // 0：橋の向きの石の列（表と裏の2列）、1：中を埋める石
        let u = -Wd / 2 + (c % 2 ? 0.28 : 0);
        while (u < Wd / 2 - 0.05) {
          const len = Math.min(Wd / 2 - u, 0.45 + rnd(seed + c * 31 + Math.round(u * 50) + face * 7) * 0.6);
          const r = rnd(seed + c * 13 + Math.round(u * 40) + face * 3);
          if (!(y0 > H * 0.6 && r < (y0 / H - 0.58) * 1.7)) {
            const depth = face ? Dd * 0.55 : Dd, out = (rnd(seed + c * 7 + Math.round(u * 30)) - 0.5) * 0.06;
            const gbox = new THREE.BoxGeometry(len * 0.95, course * 0.92, depth * (face ? 1 : 0.96));
            gbox.rotateY((rnd(seed + c + Math.round(u * 20)) - 0.5) * 0.04);
            gbox.translate(u + len / 2 + out, y0 + course / 2, face ? 0 : out * 0.5);
            parts.push({ geo: gbox, mat: stoneMat });
          }
          u += len;
        }
      }
    }
    // 崩れたアーチの迫石（橋の側へ弧を描いて数個だけ残る）と、その上の持ち送り
    const R = 1.9, cxA = -side * (1.0 + R), yA = H * 0.52;
    for (let k = 0; k < 5; k++) {
      const t = (k + 0.5) / 7 * (Math.PI / 2), px = cxA + side * Math.cos(t) * R, py = yA + Math.sin(t) * R;
      if (k === 4 && rnd(seed + 77) < 0.5) break;   // 最後の1個は落ちていることも
      const gb = new THREE.BoxGeometry(0.55, 0.32, 1.7); gb.rotateZ(side * (Math.PI / 2 - t)); gb.translate(px, py, 0);
      parts.push({ geo: gb, mat: stoneMat });
    }
    for (let k = 0; k < 2; k++) { const gb = new THREE.BoxGeometry(0.8 + k * 0.4, 0.38, 2.0); gb.translate(-side * (1.05 + k * 0.35), H * 0.86 + k * 0.38, 0); parts.push({ geo: gb, mat: stoneMat }); }
    const piece = { name: 'b2_aqueduct_abutment', parts, transient: true };
    B.add('monuments', piece, M4(x, -0.02, z, ry), tx, ty);
    for (const pt of parts) pt.geo.dispose();
    // 足もと：瓦礫（橋台の周り1.4m以内）、岩、石筍。上から氷柱
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const W2 = (lx, lz) => [x + cs * lx + sn * lz, z - sn * lx + cs * lz];
    for (let k = 0; k < 6; k++) {
      const a = rnd(seed + k * 11) * 6.28, d = 1.1 + rnd(seed + k * 13) * 0.25, [px, pz] = W2(Math.cos(a) * d, Math.sin(a) * d * 0.85);   // 橋の線と直角の向きは1.2m以内（通り道にかからない）
      B.add('rocks', pick(kit.rocks, rnd(seed + k * 3)), M4(px, -0.1, pz, a, [0.35 + rnd(seed + k) * 0.25, 0.3, 0.35 + rnd(seed + k * 2) * 0.25]), tx, ty);
    }
    const [bx, bz] = W2(side * 0.9, 0.9);
    B.add('spires', pick(proc.stalagmites, rnd(seed + 41)), M4(bx, 0, bz, rnd(seed + 42) * 6.28, [1.2, 1.6, 1.2]), tx, ty);
    for (let k = 0; k < 3; k++) {
      const [ix, iz] = W2(-side * (1.3 + k * 0.4), (rnd(seed + 50 + k) - 0.5) * 1.6);
      B.add('ice_stalactites', pick(proc.iceStalactites, rnd(seed + 53 + k)), M4(ix, H * 0.8 - 0.2, iz, rnd(seed + 56 + k) * 6.28, 0.8 + rnd(seed + 59 + k) * 0.5), tx, ty);
    }
    light(x, 1.0, z, 0xffb070, 0.7, 4);   // 橋の灯りと同じ色の、ほのかな灯り
  }
  function addMonumentGround(m, B) {
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
      const tx = m.x + i, ty = m.y + j, x = tx * CELL, z = ty * CELL;
      B.add('floor', proc.continuousGround(x, z, CELL), M4(x, 0, z), tx, ty);
      B.add('ceiling', proc.continuousCeiling(x, z, CELL), M4(x, CEIL_H, z), tx, ty);
      for (const d of DIR_ORDER) {
        const [dx, dy] = DIR_VEC[d], nx = tx + dx, ny = ty + dy;
        if (!wallCellAt(nx, ny) || monumentCellsRef.has(`${nx},${ny}`)) continue;
        const ex = x + dx * CELL / 2, ez = z + dy * CELL / 2, wr = FACE_YAW[d] + Math.PI;
        B.add('walls', proc.continuousWall(ex, ez, wr, CELL), M4(ex, 0, ez, wr), tx, ty);
      }
    }
  }
  let monumentCellsRef = new Set();
  let wallCellAt = () => true, objAtB = () => true;   // build() の中で差し替える
  function addAtrium(x, z, B, ctx, cty) {
    const atrium = new THREE.Group(); atrium.name = 'b2:open_ceiling_atrium'; root.add(atrium);
    const stone = mats['Pale mineral stone'], dark = mats['Deep cavern rock'];
    const trim = mats['Ancient inlay'];
    // 光の柱：旧版（不透明度0.19の筒）は、下から見ると白いランプシェードのように見えた。加算合成で淡く、天井より上から始める
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x5fc4e4, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });   // [統合2] 5F・6F の吹き抜けが #203 より暗かったので、光の筒（淡い霞）を少し濃く
    // 天井4mより上の縦穴を囲む壁。内側が空洞になるよう4面に配置する。
    // 通路内に柱を立てず、3×3マスの外周だけを装飾する。
    for (let side = 0; side < 4; side++) {
      const axis = side % 2 === 0;
      const sign = side < 2 ? -1 : 1;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(axis ? 12.4 : 0.9, 18.5, axis ? 0.9 : 12.4), dark);
      wall.position.set(x + (axis ? 0 : sign * 6.1), 13.25, z + (axis ? sign * 6.1 : 0));
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
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 3.6, 17, 16, 1, true), lightMat);
    beam.position.set(x, 14, z); beam.renderOrder = 3; atrium.add(beam);
    // 水面下の床に淡い揺れる光の筋を重ねる。GPU反射を使わない軽量表現。
    // 水面の光の揺らぎ：旧版は細い楕円の線で、床にチョークで描いた輪のように見えた。ぼかした光の斑点にする
    const causticTex = tileTexture(128, (ctx, n) => {
      ctx.clearRect(0, 0, n, n);
      for (let i = 0; i < 46; i++) blob(ctx, n, rnd(i * 13 + 4) * n, rnd(i * 17 + 2) * n, 5 + rnd(i * 11) * 12, `rgba(170,240,255,${0.10 + rnd(i * 31) * 0.14})`);
    });
    causticTex.repeat.set(2, 2);
    const causticMat = new THREE.MeshBasicMaterial({ map: causticTex, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 });
    const causticMesh = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 10.5).rotateX(-Math.PI / 2), causticMat);
    causticMesh.position.set(x, 0.022, z); causticMesh.renderOrder = 3; atrium.add(causticMesh);
    anim.caustics.push({ mesh: causticMesh, texture: causticTex });
    // 旧版の「高所に浮かぶ魚影」は、カメラが上を向かないため遊んでいる間ほぼ見えなかった。魚は浅瀬の水中へ移した（addFish）
    // 動かない石材・岩・氷は静的バッチへまとめる（旧版は約180個のメッシュを個別に描いていた）。作った形は作り直し時に破棄する
    // 天井を7mに上げたので、吹き抜けの縦穴も同じだけ持ち上げる（床の光の揺らぎはそのまま）
    for (const m of atrium.children) if (m !== causticMesh) m.position.y += CEIL_H - 4;
    const matName = new Map(Object.entries(mats).map(([k, m]) => [m, k]));
    const seen = new Set();
    for (const m of [...atrium.children]) {
      if (!m.isMesh) continue;
      const key = matName.get(m.material);
      if (key && !m.material.transparent) {
        m.updateMatrix();
        B.add('atrium', { parts: [{ geo: m.geometry, mat: key }] }, m.matrix, ctx, cty);
        atrium.remove(m);
      }
      if (!seen.has(m.geometry)) { seen.add(m.geometry); extraGeos.push(m.geometry); }
      if (!matName.has(m.material) && !extraMats.includes(m.material)) extraMats.push(m.material);
    }
    light(x, 4.6, z, 0x89e8ff, 9.0, 18);   // [統合2] 5F・6F の吹き抜けが #203 より暗かったので少し強く（光源の近くの面は結晶の上限で白飛びしない）
    light(x, 9.0, z, 0x6acfff, 4.0, 20);
  }

  function addRipple(x, z, r) {
    const piece = kit.ripples[Math.floor(r * kit.ripples.length) % kit.ripples.length];
    const mat = mats['Water foam'].clone(); mat.opacity = 0;
    const mesh = new THREE.Mesh(piece.parts[0].geo, mat); mesh.position.set(x, -0.05, z); mesh.renderOrder = 3; mesh.name = piece.name;
    root.add(mesh); anim.ripples.push({ mesh, phase: r, speed: 0.22 + r * 0.12, base: 1.6 / Math.max(0.5, piece.size.x) });
  }
  // 宙に漂う水色の光の粒（氷のかけらの代わり）。カメラの周り 18m の範囲で繰り返し、1粒ずつ明滅する
  let glitter = null;
  function addGlitter() {
    const N = 240, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), seed = new Float32Array(N * 4);
    for (let i = 0; i < N * 4; i++) seed[i] = rnd(i * 2.3 + 11);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const tex = tileTexture(32, (c, n) => { c.clearRect(0, 0, n, n); const gr = c.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(160,240,255,0.8)'); gr.addColorStop(1, 'rgba(90,200,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, n, n); });
    const mat = capPoints(new THREE.PointsMaterial({ map: tex, size: 0.09, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }), 8 * (g.renderer ? g.renderer.getPixelRatio() : 1));   // [B2V4-L] F1：浮いた光の玉は小さく
    glitter = new THREE.Points(geo, mat); glitter.name = 'b2_glitter'; glitter.frustumCulled = false; glitter.renderOrder = 5; glitter.userData.seed = seed;
    g.scene.add(glitter); extraMats.push(tex, mat); extraGeos.push(geo);
  }
  const _gc = new THREE.Color(), _gA = new THREE.Color(0x5fd8ff), _gB = new THREE.Color(0xbff6ff);
  // 浅瀬の魚：水中（水面と底の間）をマスの中で回遊する暗い影。当たり判定なし
  let fishGeo = null;   // 作り直し時に extraGeos で破棄するので、組み立てのたびに作り直す
  function addFish(x, z, r, count) {
    if (!fishGeo) {
      const sh = new THREE.Shape();
      sh.moveTo(-0.75, 0); sh.quadraticCurveTo(-0.15, 0.33, 0.55, 0.08); sh.lineTo(0.92, 0.32); sh.lineTo(0.78, 0);
      sh.lineTo(0.92, -0.32); sh.lineTo(0.55, -0.08); sh.quadraticCurveTo(-0.15, -0.33, -0.75, 0);
      fishGeo = new THREE.ShapeGeometry(sh, 6).rotateX(-Math.PI / 2); extraGeos.push(fishGeo);
    }
    for (let i = 0; i < count; i++) {
      const grp = new THREE.Group(), body = new THREE.Mesh(fishGeo, mats.fish);
      body.scale.setScalar(0.26 + rnd(r * 97 + i) * 0.12); grp.add(body); grp.name = 'b2_fish';
      grp.userData.swim = { x: x + (rnd(r * 31 + i) - 0.5) * 0.8, z: z + (rnd(r * 53 + i) - 0.5) * 0.8, rad: 0.55 + rnd(r * 71 + i) * 0.6, sp: (0.35 + rnd(r * 13 + i) * 0.3) * (i % 2 ? -1 : 1), ph: rnd(r * 19 + i) * 6.28, y: -0.17 - rnd(r * 41 + i) * 0.08 };
      root.add(grp); anim.fishes.push(grp);
    }
  }
  function addWaterfall(ex, ez, ry, tx, ty, B) {
    // 滝の帯（高さ4.8m）を天井4mに収める。滝つぼ（奥の半分）は水面、手前に泡
    const sy = (CEIL_H - 0.3) / kit.waterfall.size.y, sx = 2.6 / kit.waterfall.size.x;   // 天井から落ちる高い滝
    const fwd = [Math.sin(ry), Math.cos(ry)];   // 壁から通路へ向かう向き
    B.add('water', kit.waterfall, M4(ex + fwd[0] * 0.3, 0, ez + fwd[1] * 0.3, ry, [sx, sy, 1]), tx, ty);   // 壁の張り出し（最大0.15m）より手前
    B.add('water', proc.poolHalf, M4(ex + fwd[0] * 0.95, 0.07, ez + fwd[1] * 0.95, ry), tx, ty);   // 岩盤の床より少し上
    // 落水点の泡を複数の薄い輪で表現。水面より少し上に配置。
    for (let i = 0; i < 3; i++) {
      const foam = kit.ripples[(i + Math.floor(hash(tx, ty, 208) * kit.ripples.length)) % kit.ripples.length];
      const sc = 0.65 + i * 0.45;
      B.add('water_foam', foam, M4(ex + fwd[0] * (0.9 + i * 0.18), -0.025 + i * 0.004,
        ez + fwd[1] * (0.9 + i * 0.18), hash(tx, ty, 209 + i) * 6.28, sc), tx, ty);
    }
    B.add('rocks', pick(kit.rocks, hash(tx, ty, 50)), M4(ex + fwd[0] * 0.8 + fwd[1] * 1.6, -0.2, ez + fwd[1] * 0.8 - fwd[0] * 1.6, ry, 0.6), tx, ty);
    light(ex + fwd[0] * 1.6, 1.0, ez + fwd[1] * 1.6, 0x6fd4ff, 0.7, 6);   // [B2V4-L] F1：滝の帯から離して弱く（白い照り返しを出さない）
    if (anim.ripples.length < 24) addRipple(ex + fwd[0] * 0.9, ez + fwd[1] * 0.9, hash(tx, ty, 51));
    addMist(ex + fwd[0] * 0.6, ez + fwd[1] * 0.6, ry);
  }
  let mistTex = null;
  function addMist(x, z, ry) {
    mistTex = mistTex || tileTexture(64, (c, s) => { c.clearRect(0, 0, s, s); const gr = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(220,245,255,0.9)'); gr.addColorStop(1, 'rgba(220,245,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, s, s); });
    const N = 40, pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) seed[i] = rnd(i + x * 3 + z * 7);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: mistTex, size: 0.17, transparent: true, opacity: 0.16, depthWrite: false, color: 0xcff2ff, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat); pts.name = 'Waterfall_Mist'; pts.frustumCulled = false; pts.renderOrder = 4; root.add(pts);
    anim.mists.push({ points: pts, seed, x, z, ax: Math.cos(ry), az: -Math.sin(ry), fx: Math.sin(ry), fz: Math.cos(ry) });
  }

  // 毎フレーム：水面と滝の UV を流す、波紋を広げる、しぶきを漂わせる
  let t = 0;
  function tick(dt, now, camPos) {
    t += dt;
    wt.tick(dt);   // [B2V4-W]
    if (floraTick) floraTick(camPos);   // [B2V4-F] 遠い花の区画を描かない
    if (lantern && camPos) lantern.position.set(camPos.x, camPos.y + 0.35, camPos.z);
    if (motes && camPos) {
      const P = motes.geometry.attributes.position, S = motes.userData.seed, B = 24, wrap = (v, c) => c + ((((v - c) % B) + B * 1.5) % B) - B / 2;
      for (let i = 0; i < P.count; i++) {
        const bx = S[i * 3] * B + Math.sin(t * 0.3 + i) * 0.4, bz = S[i * 3 + 2] * B + Math.cos(t * 0.25 + i * 1.3) * 0.4, by = ((S[i * 3 + 1] * 6 + t * (0.08 + S[i * 3] * 0.1)) % 6) + 0.2;
        P.setXYZ(i, wrap(bx, camPos.x), by, wrap(bz, camPos.z));
      }
      P.needsUpdate = true;
    }
    mats.stream.opacity = 0.14 + 0.03 * Math.sin(t * 3.1);   // [仕上げ] F1：毎フレーム 0.45 に戻していたので、水流が白い線に見えた
    if (glitter && camPos) {
      const P = glitter.geometry.attributes.position, C = glitter.geometry.attributes.color, S = glitter.userData.seed, B = 18;
      const wrap = (v, c) => c + ((((v - c) % B) + B * 1.5) % B) - B / 2;
      for (let i = 0; i < P.count; i++) {
        const a = S[i * 4], b = S[i * 4 + 1], c = S[i * 4 + 2], d = S[i * 4 + 3];
        // ゆっくり上へ漂い、横に小さく揺れる
        const x = a * B + Math.sin(t * (0.2 + d * 0.3) + i) * 0.35, z = c * B + Math.cos(t * (0.17 + a * 0.3) + i * 1.7) * 0.35, y = 0.5 + ((b * 4.2 + t * (0.05 + d * 0.08)) % 4.2);
        P.setXYZ(i, wrap(x, camPos.x), y, wrap(z, camPos.z));
        // 明滅：ふだんは淡く、ときどき強く光る
        const tw = Math.pow(0.5 + 0.5 * Math.sin(t * (1.2 + d * 2.5) + i * 7.1), 6), k = 0.3 + tw * 0.6;   // [B2V4-L] F1：強く光るときも控えめ（旧 0.35＋1.4）
        _gc.copy(_gA).lerp(_gB, tw).multiplyScalar(k); C.setXYZ(i, _gc.r, _gc.g, _gc.b);
      }
      P.needsUpdate = true; C.needsUpdate = true;
    }
    for (const e of g.entries) if (e.obj && (e.kind === 'chest' || e.kind === 'cache' || e.kind === 'gather' || e.kind === 'event')) frostify(e.obj);
    const w = mats['Clear blue water'].map, f = mats.waterfall.map;
    if (w) { w.offset.x = (t * 0.012) % 1; w.offset.y = (t * 0.022) % 1; }
    if (f) f.offset.y = (t * 0.9) % 1;
    for (const c of anim.caustics) {
      c.texture.offset.x = (t * 0.009) % 1;
      c.texture.offset.y = (t * 0.014) % 1;
      c.mesh.material.opacity = 0.24 + 0.08 * Math.sin(t * 0.8);
    }
    for (const f of anim.fishes) {
      const w = f.userData.swim;
      if (camPos && (w.x - camPos.x) ** 2 + (w.z - camPos.z) ** 2 > 400) { f.visible = false; continue; }
      f.visible = true;
      // 円の上を回る（基準点からはみ出さない）。進む向きに頭を向け、尾びれのように小さく左右に振る
      const a = w.ph + t * w.sp, vx = -Math.sin(a) * w.sp, vz = Math.cos(a) * w.sp * 0.7;
      f.position.set(w.x + Math.cos(a) * w.rad, w.y, w.z + Math.sin(a) * w.rad * 0.7);
      f.rotation.y = Math.atan2(vz, -vx) + Math.sin(t * 7 + w.ph) * 0.12;
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
        const side = (rnd(i * 3.1 + sd) - 0.5) * 2.0, out = p * 1.1;
        pos.setXYZ(i, m.x + m.ax * side + m.fx * out, 0.1 + p * 1.6, m.z + m.az * side + m.fz * out);
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
    if (o.kind === 'gather') {   // 霜の採取ポイント（1層の苔の採掘点・草・丸太を使わない）
      const kind = st.split(':')[0], k = kind === 'chop' ? 'chop' : kind === 'mine' ? 'mine' : 'herb';
      if (!e.obj) { e.obj = api.place(g.world, getB2Kit().gather[k], x, 0, z, e.ry, 1); e.obj.userData.b2Kit = true; }
      api.dimObj(e.obj, st.endsWith('empty'));
      return true;
    }
    if (o.kind === 'chest' || o.kind === 'cache') {   // 青鉄と霜の宝箱（1層の宝箱は使わない）
      if (e.obj) { e.obj.parent?.remove(e.obj); for (const L of e.obj.userData.lights || []) L.off = true; }
      const K = getB2Kit();
      e.obj = api.place(g.world, st === 'open' ? K.chestOpen : K.chest, x, 0, z, e.ry); e.obj.userData.b2Kit = true;
      return true;
    }
    if (o.kind === 'event') {
      if (!e.obj) {
        if (o.hidden) e.obj = api.place(g.world, kit.thorns.length ? pieceGroup(kit.thorns[0], mats) : await api.load(api.FILES.roots), x, 0, z, e.ry, 0.5);
        else { e.obj = api.place(g.world, getB2Kit().crate, x, 0, z, e.ry); e.obj.userData.b2Kit = true; }   // 置き去りの補給の木箱（4層のトロッコは使わない）
      }
      if (!o.hidden) api.dimObj(e.obj, st === 'done');
      return true;
    }
    return false;
  }

  return { area: 2, env: ENV, build, sync, tick, dispose, kit, info: () => ({ meshCount: kit.meshCount, v8Decorations: v8 ? { rocks: v8.rocks.length, crystals: v8.crystals.length, stalagmites: v8.stalagmites.length, ceilingIce: v8.ceilingIce.length, erosion: v8.erosion.length } : null, omitted: kit.omitted, drawGroups: root ? root.children.map((c) => `${c.name}:${c.children.length}`) : [], ripples: anim.ripples.length, mists: anim.mists.length, ...last }) };
}
