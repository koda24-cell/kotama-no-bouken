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
// 旧版（環境光 2.0・霧 0.011）は全体が均一に明るく、奥行きと陰影が無く平板に見えていた。
// 環境光を下げて霧で奥を沈め、近くはプレイヤーの手元の灯り、遠くは結晶・滝の光で見せる。
export const ENV = { background: 0x07161f, fog: { color: 0x0c2531, density: 0.03 }, hemi: { sky: 0x9fd6e8, ground: 0x24414d, high: 1.0, low: 1.45 } };
const LANTERN = { color: 0xd4f1ff, high: 5.5, low: 7.5, range: 11 };   // カメラに付いて動く手元の灯り（第2階層だけ）

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
  const water = std({ color: 0x86c3cc, map: waterTex, roughness: 0.05, metalness: 0.1, emissive: 0x061c29, emissiveIntensity: 0.15, envMapIntensity: 1.6, side: THREE.DoubleSide });
  const fall = std({ color: 0xb5dce5, map: fallTex, roughness: 0.19, metalness: 0.0, emissive: 0x17495d, emissiveIntensity: 0.3, side: THREE.DoubleSide });
  if (opaqueWater) { water.color.setHex(0x0f4a68); fall.color.setHex(0x2f7fa8); }
  else for (const m of [water, fall]) { m.transparent = true; m.opacity = m === water ? 0.66 : 0.72; m.depthWrite = false; }   // 水底の小石と魚が透けて見える濃さ
  const foam = std({ color: 0xd8f4ff, roughness: 0.5, emissive: 0x1f4a59, emissiveIntensity: 0.6, transparent: true, opacity: 0.24, depthWrite: false, envMapIntensity: 0.3 });   // 硬い白線にならない薄さ
  // 岩肌・石板・淡い石：高さ（割れ目・層・粒）から色と法線を作る。
  // 旧版は雲のようなぼやけた濃淡だけで、近くで見ると平らな板に見えていた。
  // 法線マップで凹凸に光が当たるので、ジオメトリを細かくしなくても岩の質感が出る。
  const rock = stoneSet(512, 13, 'rock'), slate = stoneSet(512, 37, 'slate'), pale = stoneSet(256, 71, 'pale');
  const ice = std({ color: 0xcdeff7, roughness: 0.12, metalness: 0.0, emissive: 0x1e5a6e, emissiveIntensity: 0.35, envMapIntensity: 1.4, vertexColors: true });
  return {
    'Wet slate stone': std({ color: 0xb6c6c8, map: slate.map, normalMap: slate.normal, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.38, metalness: 0.02, envMapIntensity: 0.9, vertexColors: true }),   // 濡れた暗い石板
    'Ancient inlay': std({ color: 0xc9a45a, roughness: 0.38, metalness: 0.7, emissive: 0x2a1c06, emissiveIntensity: 0.5, envMapIntensity: 1.2 }),
    'Deep cavern rock': std({ color: 0xa9b3b4, map: rock.map, normalMap: rock.normal, normalScale: new THREE.Vector2(1.15, 1.15), roughness: 0.82, metalness: 0.0, envMapIntensity: 0.45, vertexColors: true }),
    'Pale mineral stone': std({ color: 0xa9babd, map: pale.map, normalMap: pale.normal, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.6, metalness: 0.0, envMapIntensity: 0.45, vertexColors: true }),  // 淡い鉱物の石
    'Glowing cyan crystal': std({ color: 0x8fe4f5, roughness: 0.1, metalness: 0.05, emissive: 0x1ab4ec, emissiveIntensity: 0.9, envMapIntensity: 1.3 }),  // 控えめな発光
    'Deep blue crystal': std({ color: 0x4a76e8, roughness: 0.12, metalness: 0.05, emissive: 0x1a3596, emissiveIntensity: 0.7, envMapIntensity: 1.3 }),
    'Violet danger crystal': std({ color: 0x8a6cc4, roughness: 0.2, metalness: 0.05, emissive: 0x5a1a90, emissiveIntensity: 0.9 }), // 紫＝危険
    'Clear blue water': water,
    'Water foam': foam,
    'Aquatic dark teal': std({ color: 0x1f6670, roughness: 0.62, metalness: 0.0 }),
    ceiling: std({ color: 0x8e9ea2, map: rock.map, normalMap: rock.normal, normalScale: new THREE.Vector2(1.0, 1.0), roughness: 0.9, metalness: 0.0, emissive: 0x16303a, emissiveIntensity: 0.25, envMapIntensity: 0.35, vertexColors: true, side: THREE.DoubleSide }),   // 下向きの面は環境光が弱いので少し自発光
    bed: std({ color: 0x3a5560, map: rock.map, roughness: 0.75, metalness: 0.0, vertexColors: true }),   // 床板のすき間（目地）。旧版は黒い隙間で、通路の中央の目地が正面に立つ黒い棒に見えた
    shallowBed: std({ color: 0x7fa9b0, map: pale.map, roughness: 0.7, metalness: 0.0, vertexColors: true }),   // 浅瀬の底（明るい小石。水を通して青緑に見える）
    ice,                                                                                          // 氷柱
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
const ceilDrop = (wx, wz) => 0.2 + 0.12 * Math.sin(wx * 0.37 + 0.7) * Math.cos(wz * 0.42 + 0.3) + 0.07 * Math.sin(wx * 0.83 + wz * 0.56)
  + 0.03 * Math.cos(wx * 1.91 - wz * 1.47) + 0.05 * Math.pow(Math.abs(Math.sin(wx * 0.72 - wz * 0.83)), 9);
const ceilY = (wx, wz) => 4 - ceilDrop(wx, wz);
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
  // 壁面の起伏をワールド座標から求める。隣接する壁でも同じ鉱脈が続く。
  // 端の変位はゼロに収束させ、直交する壁・天井との裂け目を抑える。
  const continuousWall = (ex, ez, yaw, cell) => {
    // 旧版は奥行きのある箱（24×22分割・裏面も分割）で、1枚約2300三角形・1フロア100万三角形を超えていた。
    // 見えるのは通路側の面だけなので面1枚（12×11分割）にし、細かな凹凸は法線マップに任せる。
    // 下端は床の起伏に隠れるよう -0.4m まで伸ばす。通路側への張り出しは最大0.2m。
    const geo = new THREE.PlaneGeometry(cell + 0.12, 4.6, 12, 11);
    geo.translate(0, 1.9, 0);
    const p = geo.attributes.position, cs = Math.cos(yaw), sn = Math.sin(yaw);
    for (let i = 0; i < p.count; i++) {
      const lx = p.getX(i), y = p.getY(i);
      const wx = ex + cs * lx, wz = ez - sn * lx;
      const edge = THREE.MathUtils.smoothstep(cell / 2 - Math.abs(lx), 0, 0.55);
      const vertical = THREE.MathUtils.smoothstep(y, -0.1, 0.5) * (1 - THREE.MathUtils.smoothstep(y, 3.3, 4.1));
      const broad = 0.34 * Math.sin(wx * 0.63 + wz * 0.29 + y * 0.33) + 0.20 * Math.cos(wx * 0.24 - wz * 0.71 + y * 0.58);
      const strata = 0.16 * Math.sin(wx * 1.47 - wz * 1.05 + y * 1.24) + 0.09 * Math.cos(wx * 2.87 + wz * 1.94 - y * 2.13);
      const fracture = Math.pow(Math.abs(Math.sin(wx * 1.06 + wz * 0.53 + y * 0.15)), 14);
      const relief = (broad + strata - 0.13 * fracture) * edge * vertical;
      p.setZ(i, Math.max(-0.5, Math.min(0.15, -relief * 0.7)));
    }
    const prepared = prepGeo(geo, false);
    geo.dispose();
    const smoothed = smoothRock(prepared);
    prepared.dispose();
    return { name: 'continuous_cavern_wall', transient: true, parts: [{ geo: smoothed, mat: 'Deep cavern rock' }] };
  };
  // 世界座標で天井の起伏を生成し、隣接セル間で位相と高さを一致させる。
  // 下向き法線を保持し、境界を跨いでも同じ岩盤が続くようにする。
  // 旧版は最大1.1m垂れ下がり（天井が2.9mまで下がる）、黒い布のように視界の上を覆っていた。
  // 垂れ下がりは最大0.45mに抑え、氷柱などは ceilDrop() で実際の天井の高さに根元を付ける。
  const continuousCeiling = (worldX, worldZ, cell) => {
    const geo = new THREE.PlaneGeometry(cell, cell, 8, 8).rotateX(Math.PI / 2);
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
      const geo = new THREE.ConeGeometry(r, len, 7, 2);
      geo.rotateX(Math.PI); geo.translate(0, -len / 2 + 0.03, 0);
      geo.rotateZ((rnd(variant * 5 + j) - 0.5) * 0.18);
      geo.translate((rnd(variant * 13 + j) - 0.5) * 0.42, 0, (rnd(variant * 17 + j) - 0.5) * 0.42);
      parts.push({ geo, mat: 'ice' });
    }
    const root = new THREE.SphereGeometry(0.2, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2); root.scale(1.4, 0.35, 1.2); root.rotateX(Math.PI);
    parts.push({ geo: root, mat: 'Deep cavern rock' });
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
    return { name: 'b2_shoreline_' + variant, parts: [{ geo: g, mat: 'Wet slate stone' }] };   // 旧版の淡い石は床に置いた白い紙のように見えた
  });
  // 隣接する床マスで高さが一致する世界座標ベースの岩盤。
  // マス境界で起伏をゼロに戻さないため、正方形パッチの継ぎ目が目立たない。
  const continuousGround = (worldX, worldZ, cell) => {
    const g = new THREE.PlaneGeometry(cell, cell, 12, 12).rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const wx = worldX + p.getX(i), wz = worldZ + p.getZ(i);
      const y = 0.085 * Math.sin(wx * 0.47) * Math.cos(wz * 0.39)
        + 0.038 * Math.sin(wx * 1.14 + wz * 0.58)
        + 0.018 * Math.cos(wx * 2.37 - wz * 1.81);
      p.setY(i, y);
    }
    g.computeVertexNormals();
    return { name: 'continuous_rock_ground', transient: true, parts: [{ geo: g, mat: 'Deep cavern rock' }] };
  };
  const shallowBed = (() => {   // 浅瀬の底：明るい小石の起伏（水を通して見える）
    const g = new THREE.PlaneGeometry(4, 4, 6, 6).rotateX(-Math.PI / 2), q = g.attributes.position;
    for (let i = 0; i < q.count; i++) q.setY(i, 0.05 * Math.sin(q.getX(i) * 2.1) * Math.cos(q.getZ(i) * 1.7));
    return { name: 'shallow_bed', parts: [{ geo: prepGeo(g, false), mat: 'shallowBed' }] };
  })();
  const bed = { name: 'water_bed', parts: [{ geo: prepGeo(new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2), false), mat: 'bed' }] };
  const pool = (w, d) => ({ name: 'water_surface', parts: [{ geo: prepGeo(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), true), mat: 'Clear blue water' }] });
  const plaque = { name: 'wall_plaque', parts: [{ geo: prepGeo(new THREE.BoxGeometry(1.1, 0.7, 0.08).translate(0, 0, 0.04), false), mat: 'Ancient inlay' }, { geo: prepGeo(new THREE.BoxGeometry(1.3, 0.9, 0.06).translate(0, 0, 0.0), false), mat: 'Pale mineral stone' }] };
  return { continuousWall, continuousCeiling, continuousGround, shoreline, glowFungi, frostVeins, frostCornices, wallOutcrops, frostLedges, ceilingRidge, iceStalactites, bed, shallowBed, poolFull: pool(4, 4), poolHalf: pool(4, 1.9), plaque };
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
  for (let i = 0; i < n; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const big = 0.5 + 0.5 * Math.sin(cx * 0.9 + cz * 0.7) * Math.sin(cy * 1.3 + cz * 0.4);
    const v = 0.88 + 0.08 * big + 0.035 * rnd(Math.floor(cx * 7.3) * 31 + Math.floor(cy * 5.1) * 17 + Math.floor(cz * 6.7));
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
  const kit = await loadKit();
  // v8 は任意の見た目拡張。読み込み失敗時も旧B2キットで遊べる。
  const v8 = await loadV8Decorations().catch((err) => { console.warn('[B2] v8 decoration unavailable; using legacy kit', err); return null; });
  const proc = makeProcedural();
  const mats = makeMaterials(opaqueWater);
  const { CELL, DIR_VEC, DIR_ORDER, FACE_YAW, hash, g } = api;
  let made = [], anim = { ripples: [], mists: [], fishes: [], caustics: [] }, root = null, last = { falls: [], bridge: null };
  let extraGeos = [], extraMats = [];   // 組み立てごとに作る物（作り直すときに破棄する）

  // 映り込み用の環境マップ（濡れた石・水面・結晶のつや）。小さなグラデーション画像から作るので軽い
  let envTex = null, lantern = null;
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
    if (!obj) return obj;
    obj.userData.b2Frost = true;
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map(frostMat) : frostMat(o.material);
      if (o.userData.baseMat) o.userData.baseMat = frostMat(o.userData.baseMat);
    });
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

  function dispose() {
    for (const geo of made) geo.dispose(); made = [];
    for (const r of anim.ripples) r.mesh.material.dispose();
    for (const m of anim.mists) { m.points.geometry.dispose(); }
    for (const c of anim.caustics) { c.mesh.geometry.dispose(); c.mesh.material.dispose(); c.texture.dispose(); }
    for (const geo of extraGeos) geo.dispose(); extraGeos = []; fishGeo = null;
    for (const m of extraMats) m.dispose(); extraMats = []; frostCache.clear();
    if (g.scene && envTex && g.scene.environment === envTex) g.scene.environment = null;
    if (lantern) { lantern.parent?.remove(lantern); lantern = null; }
    anim = { ripples: [], mists: [], fishes: [], caustics: [] }; root = null;
  }

  async function build(a, S, info) {
    dispose();
    const { ch, def, wallCell, facing } = info;
    const X = (tx) => tx * CELL, Z = (ty) => ty * CELL;
    const objAt = new Map(a.objects.map((o) => [`${o.tx},${o.ty}`, o]));
    const B = new Batcher();
    root = new THREE.Group(); root.name = 'b2_water_source'; g.world.add(root);
    ensureEnv(); if (envTex) g.scene.environment = envTex;
    lantern = new THREE.PointLight(LANTERN.color, g.high ? LANTERN.high : LANTERN.low, LANTERN.range, 2); lantern.name = 'b2_lantern'; g.scene.add(lantern);
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
      addAtrium(sky.cx * CELL, sky.cy * CELL, B, sky.cx, sky.cy);
    }

    for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
      if (wallCell(tx, ty)) continue;
      const c = ch(tx, ty), x = X(tx), z = Z(ty), key = `${tx},${ty}`;
      const fall = falls.get(key);
      // 床：濡れた石板を2×2枚。すき間から暗い水底がのぞく
      // 滝つぼのあるマスは水面（-0.07）と重ならないよう目地を深く
      B.add('floor', c === '*' ? proc.shallowBed : proc.bed, M4(x, c === '*' ? -0.34 : fall ? -0.3 : -0.07, z), tx, ty);
      if (c === '>') { /* 階段の素材が床を兼ねる */ }
      else if (c === '*') {   // 浅瀬：床板の代わりに水面（見た目だけ。通行と歩数の扱いは従来どおり）
        B.add('water', proc.poolFull, M4(x, -0.07, z), tx, ty);
        if (!onBridge(tx, ty)) {
          // 足もとに沈んだ石を1枚
          B.add('floor', pick(kit.slabs, hash(tx, ty, 2)), M4(x + (hash(tx, ty, 3) - 0.5) * 1.2, -0.12, z + (hash(tx, ty, 4) - 0.5) * 1.2, hash(tx, ty, 5) * 6, 0.7), tx, ty);
          // 荊（紫のとげ＝危険の目印）を壁ぎわに
          const side = DIR_ORDER.find((d) => wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1]));
          if (side && hash(tx, ty, 6) < 0.6) { const [dx, dy] = DIR_VEC[side]; B.add('thorns', pick(kit.thorns, hash(tx, ty, 7)), M4(x + dx * 1.45 + (hash(tx, ty, 8) - 0.5) * (dy ? 2 : 0), -0.08, z + dy * 1.45 + (hash(tx, ty, 8) - 0.5) * (dx ? 2 : 0), hash(tx, ty, 9) * 6, 0.75 + hash(tx, ty, 10) * 0.3), tx, ty); }
        }
        if (anim.ripples.length < 8 && hash(tx, ty, 11) < 0.10) addRipple(x + (hash(tx, ty, 12) - 0.5) * 2, z + (hash(tx, ty, 13) - 0.5) * 2, hash(tx, ty, 14));
        if (!onBridge(tx, ty) && anim.fishes.length < 14 && hash(tx, ty, 60) < 0.3) addFish(x, z, hash(tx, ty, 61), 1 + Math.floor(hash(tx, ty, 62) * 2));
      } else {
        const naturalGround = !fall && c !== 'P' && c !== ',' && c !== '_' && c !== '<'
          && !objAt.has(key) && hash(tx, ty, 215) < 0.70;
        if (naturalGround) {
          B.add('floor', proc.continuousGround(x, z, CELL), M4(x, -0.025, z), tx, ty);
        } else for (const [ox0, oz0] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]]) {
          // 目地をマスごとに左右・前後へずらす。旧版は通路の中央に目地が一直線に並び、正面に立つ黒い棒に見えた
          const sh = fall ? 0 : 0.22, ox = ox0 + (hash(tx, ty, 151) < 0.5 ? -sh : sh), oz = oz0 + (hash(tx, ty, 152) < 0.5 ? -sh : sh);
          if (fall) { const [bx, bz] = DIR_VEC[fall]; if (ox * bx + oz * bz > 0) continue; }   // 滝つぼ側の床板は外す
          const r = hash(tx * 2 + (ox > 0), ty * 2 + (oz > 0), 15);
          B.add('floor', pick(kit.slabs, r), M4(x + ox, -0.035 + hash(tx, ty, 150) * 0.035, z + oz, Math.floor(hash(tx * 2 + (ox > 0), ty * 2 + (oz > 0), 16) * 4) * Math.PI / 2), tx, ty);
        }
        if (c === ',' || c === '_' || c === 'P') {   // 道（, _）には古い象嵌を一筋
          const run = (ch(tx - 1, ty) === c || ch(tx + 1, ty) === c) ? 0 : Math.PI / 2;
          B.add('floor', pick(kit.inlays, hash(tx, ty, 17)), M4(x, 0.004, z, run, [3.2, 1, 3.2]), tx, ty);
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
          B.add('glow_fungi', pick(proc.glowFungi, hash(tx, ty, 352)),
            M4(x + dx * 1.55, 0.015, z + dz * 1.55, hash(tx, ty, 353) * Math.PI * 2,
              0.75 + hash(tx, ty, 354) * 0.35), tx, ty);
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
      if (!openCells.has(key)) B.add('ceiling', proc.continuousCeiling(x, z, CELL), M4(x, 4, z), tx, ty);
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
          M4(x + ox, ceilY(x + ox, z + oz) + 0.04, z + oz, hash(tx, ty, 245) * Math.PI * 2, 0.85 + hash(tx, ty, 246) * 0.5), tx, ty);
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
          B.add('ice_stalactites', pick(proc.iceStalactites, hash(tx, ty, 308)), M4(ix, ceilY(ix, iz) + 0.04, iz, hash(tx, ty, 311) * 6.28, 1.0 + hash(tx, ty, 310) * 0.6), tx, ty);
        }
      }
      // 壁と、壁ぎわの岩・鉱脈・壁付きの物
      for (const d of DIR_ORDER) {
        const [dx, dy] = DIR_VEC[d]; if (!wallCell(tx + dx, ty + dy)) continue;
        const ex = x + dx * CELL / 2, ez = z + dy * CELL / 2, k = hash(tx * 4 + DIR_ORDER.indexOf(d), ty, 5), ry = FACE_YAW[d] + Math.PI;
        const along = [dy ? 1 : 0, dx ? 1 : 0];   // 壁に沿う向き（x, z）
        B.add('walls', proc.continuousWall(ex, ez, ry, CELL), M4(ex, 0, ez, ry), tx, ty);
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
        if (!objAt.has(key) && c !== '>' && c !== '<' && k < 0.72) {
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
          B.add('frost_veins', pick(proc.frostVeins, hash(tx, ty, 402 + DIR_ORDER.indexOf(d))),
            M4(ex - dx * 0.12 + along[0] * offset, height,
              ez - dy * 0.12 + along[1] * offset, ry, 0.8), tx, ty);
        }
        // v8の結晶を壁際に低頻度で追加。通路・階段・イベントの中央は塞がない。
        if (v8?.crystals?.length && !objAt.has(key) && c !== '>' && c !== '<'
            && k > 0.77) {
          const gem = pick(v8.crystals, hash(tx, ty, 260 + DIR_ORDER.indexOf(d)));
          B.add('v8_crystals', gem, M4(ex - dx * 0.30 + along[0] * 0.4, -0.04,
            ez - dy * 0.30 + along[1] * 0.4, ry), tx, ty);
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
          light(ex - dx * 0.55, 2.5, ez - dy * 0.55, 0x80cde6, 0.85, 6.5);
          continue;
        }
        if (objAt.has(key) || c === '>' || c === '<') continue;
        if (k > 0.73) {   // 壁の根元の岩（通路へのはみ出しは0.5m以内）
          const s = 0.5 + hash(tx, ty + 7 * DIR_ORDER.indexOf(d), 19) * 0.3, t = (hash(tx, ty, 20 + DIR_ORDER.indexOf(d)) - 0.5) * 2.2;
          const piece = pick(kit.boulders, hash(tx, ty, 24 + DIR_ORDER.indexOf(d)));
          const inward = 0.45 - piece.size.z * s * 0.5;
          B.add('rocks', piece, M4(ex + along[0] * t - dx * inward, -0.15, ez + along[1] * t - dy * inward, ry + (hash(tx, ty, 28) - 0.5) * 0.5, s), tx, ty);
        }
        if (k < 0.12) {    // 壁の根元の小さな結晶と、その光（旧版の横棒状の鉱脈は画面の飾り線のように見えたため置かない）
          const t = (hash(tx, ty, 29) - 0.5) * 2.4, cx = ex + along[0] * t - dx * 0.35, cz = ez + along[1] * t - dy * 0.35;
          const piece = pick(kit.crystals, hash(tx, ty, 31)), sc = 0.26 + hash(tx, ty, 30) * 0.12;
          B.add('crystals', piece, M4(cx, -0.05, cz, hash(tx, ty, 32) * 6, sc), tx, ty);
          light(cx - dx * 0.2, 0.7, cz - dy * 0.2, 0x83ddf1, 1.1, 4.5);
        }
      }
      // 角の結晶の群れ（二方が壁の角だけ。通路の正面をふさがない）
      if (!objAt.has(key) && !fall && c !== '*') {
        for (let i = 0; i < 4; i++) {
          const d1 = DIR_ORDER[i], d2 = DIR_ORDER[(i + 1) % 4];
          if (!wallCell(tx + DIR_VEC[d1][0], ty + DIR_VEC[d1][1]) || !wallCell(tx + DIR_VEC[d2][0], ty + DIR_VEC[d2][1])) continue;
          if (hash(tx, ty, 32 + i) > 0.24) continue;
          const px = x + (DIR_VEC[d1][0] + DIR_VEC[d2][0]) * 1.3, pz = z + (DIR_VEC[d1][1] + DIR_VEC[d2][1]) * 1.3;
          const piece = pick(kit.crystals, hash(tx, ty, 36 + i)), s = 0.45 + hash(tx, ty, 40) * 0.15;
          B.add('crystals', piece, M4(px, -0.05, pz, hash(tx, ty, 37) * 6, s), tx, ty);
          light(px, piece.size.y * s * 0.6, pz, 0x79d6e8, 1.25, 5.5);
          break;
        }
        // 開けた場所の小岩（壁が1つもないマスのふち）
        if (DIR_ORDER.every((d) => !wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1])) && hash(tx, ty, 42) < 0.12) {
          B.add('rocks', pick(kit.rocks, hash(tx, ty, 43)), M4(x + (hash(tx, ty, 44) > 0.5 ? 1.5 : -1.5), -0.1, z + (hash(tx, ty, 45) - 0.5) * 2.4, hash(tx, ty, 46) * 6, 0.7), tx, ty);
        }
      }
      // 天井から下がる結晶（まれに、壁ぎわ）
      if (!openCells.has(key) && hash(tx, ty, 47) < 0.08) {
        const d = DIR_ORDER.find((q) => wallCell(tx + DIR_VEC[q][0], ty + DIR_VEC[q][1]));
        if (d) { const [dx, dy] = DIR_VEC[d]; B.add('crystals', pick(kit.shards, hash(tx, ty, 48)), M4(x + dx * 1.3, ceilY(x + dx * 1.3, z + dy * 1.3) + 0.05, z + dy * 1.3, hash(tx, ty, 49) * 6, 0.24 + hash(tx, ty, 194) * 0.22, Math.PI), tx, ty); }
      }
    }
    if (bridge) {   // 壊れた橋（6.6m）を3マスに合わせて少し伸ばす。上面が水面のすぐ上に来る高さ
      const sx = (CELL * 3 - 0.6) / kit.bridge.size.x;
      B.add('landmarks', kit.bridge, M4(X(bridge.tx), -0.42, Z(bridge.ty), bridge.ry, [sx, 1, 1.15]), bridge.tx, bridge.ty);
    }

    // 物（宝箱・採集・灯・NPC・イベント・仕掛け・階段・出口・ボス門）
    const s = S;
    for (const o of a.objects) {
      if (o.onWall && (o.kind === 'switch' || o.kind === 'sign')) continue;   // 壁の面に置いた
      const x = X(o.tx), z = Z(o.ty), f = facing(o.tx, o.ty), ry = FACE_YAW[f];
      const e = { o, kind: o.kind, obj: null, state: null, at: new THREE.Vector3(x, 1.2, z) };
      switch (o.kind) {
        case 'stairs':
          if (o.dir === 'down') e.obj = frostify(api.place(g.world, s.stairsDown, x, 0, z, ry));
          else e.obj = frostify(api.place(g.world, s.stairsUp, x, 0, z, ry + Math.PI, 0.75));
          break;
        case 'save': frostify(api.place(g.world, s.seal, x, 0.005, z, 0, 0.8)); e.obj = api.place(g.world, s.torch, x, 0, z); e.at.y = 1.9; break;
        case 'chest': case 'cache': case 'gather': case 'event': e.ry = ry; break;   // 状態に応じて sync で置く
        case 'sign': e.obj = frostify(api.place(g.world, s.sign, x, 0, z, ry)); e.at.y = 1.8; break;
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
    last = { falls: [...falls].map(([k, d]) => ({ cell: k, wall: d })), bridge, atrium: sky ? { tx: sky.cx, ty: sky.cy } : null };
  }

  // 大空洞の縦方向の景観。天井を抜いた3×3マスに高い石造壁と冷光を加える。
  // 3D表示の装飾のみ。通路、壁判定、カメラ、マップイベントは変更しない。
  function addAtrium(x, z, B, ctx, cty) {
    const atrium = new THREE.Group(); atrium.name = 'b2:open_ceiling_atrium'; root.add(atrium);
    const stone = mats['Pale mineral stone'], dark = mats['Deep cavern rock'];
    const trim = mats['Ancient inlay'];
    // 光の柱：旧版（不透明度0.19の筒）は、下から見ると白いランプシェードのように見えた。加算合成で淡く、天井より上から始める
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x5fc4e4, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
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
    const causticMat = new THREE.MeshBasicMaterial({ map: causticTex, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 });
    const causticMesh = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 10.5).rotateX(-Math.PI / 2), causticMat);
    causticMesh.position.set(x, 0.022, z); causticMesh.renderOrder = 3; atrium.add(causticMesh);
    anim.caustics.push({ mesh: causticMesh, texture: causticTex });
    // 旧版の「高所に浮かぶ魚影」は、カメラが上を向かないため遊んでいる間ほぼ見えなかった。魚は浅瀬の水中へ移した（addFish）
    // 動かない石材・岩・氷は静的バッチへまとめる（旧版は約180個のメッシュを個別に描いていた）。作った形は作り直し時に破棄する
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
    light(x, 3.4, z, 0x89e8ff, 2.4, 13);
    light(x, 9.0, z, 0x6acfff, 1.7, 16);
  }

  function addRipple(x, z, r) {
    const piece = kit.ripples[Math.floor(r * kit.ripples.length) % kit.ripples.length];
    const mat = mats['Water foam'].clone(); mat.opacity = 0;
    const mesh = new THREE.Mesh(piece.parts[0].geo, mat); mesh.position.set(x, -0.05, z); mesh.renderOrder = 3; mesh.name = piece.name;
    root.add(mesh); anim.ripples.push({ mesh, phase: r, speed: 0.22 + r * 0.12, base: 1.6 / Math.max(0.5, piece.size.x) });
  }
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
    const sy = 3.85 / kit.waterfall.size.y, sx = 2.4 / kit.waterfall.size.x;
    const fwd = [Math.sin(ry), Math.cos(ry)];   // 壁から通路へ向かう向き
    B.add('water', kit.waterfall, M4(ex + fwd[0] * 0.3, 0, ez + fwd[1] * 0.3, ry, [sx, sy, 1]), tx, ty);   // 壁の張り出し（最大0.15m）より手前
    B.add('water', proc.poolHalf, M4(ex + fwd[0] * 0.95, -0.07, ez + fwd[1] * 0.95, ry), tx, ty);
    // 落水点の泡を複数の薄い輪で表現。水面より少し上に配置。
    for (let i = 0; i < 3; i++) {
      const foam = kit.ripples[(i + Math.floor(hash(tx, ty, 208) * kit.ripples.length)) % kit.ripples.length];
      const sc = 0.65 + i * 0.45;
      B.add('water_foam', foam, M4(ex + fwd[0] * (0.9 + i * 0.18), -0.025 + i * 0.004,
        ez + fwd[1] * (0.9 + i * 0.18), hash(tx, ty, 209 + i) * 6.28, sc), tx, ty);
    }
    B.add('rocks', pick(kit.rocks, hash(tx, ty, 50)), M4(ex + fwd[0] * 0.8 + fwd[1] * 1.6, -0.2, ez + fwd[1] * 0.8 - fwd[0] * 1.6, ry, 0.6), tx, ty);
    light(ex + fwd[0] * 1.2, 1.2, ez + fwd[1] * 1.2, 0x6fd4ff, 1.6, 6);
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
    if (lantern && camPos) lantern.position.set(camPos.x, camPos.y + 0.35, camPos.z);
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
