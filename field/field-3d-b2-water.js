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
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const B2_BASE = './assets/3d/dungeons/b2_water_source/';
export const B2_GLB = B2_BASE + 'models/floor2-water-source-quality-v3.glb';
const CHUNK = 8;                                       // まとめる区画（マス数）
const WATER_KEY = 'kotama.field3d.b2.water';           // 'opaque' で水を不透明にする（半透明が崩れる環境向けの退避）

// 第2階層の空気（第1階層の値とは別。第1階層へ戻ると field-3d-view.js が第1階層の値に戻す）
export const ENV = { background: 0x07141c, fog: { color: 0x15303c, density: 0.027 }, hemi: { sky: 0xb3dce9, ground: 0x263f4b, high: 1.85, low: 2.25 } };

/* ------------------------------------------------------------
   素材（GLB の素材名ごとに、ゲームの描画に合わせた値で作り直す）
   ------------------------------------------------------------ */
function makeMaterials(opaqueWater) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const waterTex = tileTexture(256, (c, s) => {
    // 周期的な波紋と細い水流模様。タイル境界をまたいでも連続する。
    c.fillStyle = '#83b9cc'; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 240; i++) {
      const x = rnd(i * 11 + 3) * s, y = rnd(i * 17 + 9) * s;
      const rx = 4 + rnd(i * 7 + 12) * 22, ry = 0.5 + rnd(i * 13 + 8) * 2.3;
      c.strokeStyle = `rgba(220,252,255,${0.05 + rnd(i * 19) * 0.21})`;
      c.lineWidth = 0.5 + rnd(i * 23) * 1.1;
      for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
        c.beginPath(); c.ellipse(x + ox, y + oy, rx, ry, rnd(i + 91) * 0.35, 0, Math.PI * 2); c.stroke();
      }
    }
  });
  const fallTex = tileTexture(128, (c, s) => {      // 滝：縦の筋
    c.fillStyle = '#7fa6bf'; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) { const x = rnd(i + 5) * s, w = 1 + rnd(i + 11) * 4, a = 0.15 + rnd(i + 17) * 0.45; c.fillStyle = `rgba(235,250,255,${a})`; c.fillRect(x, 0, w, s); if (x + w > s) c.fillRect(x - s, 0, w, s); }
  });
  fallTex.repeat.set(2, 1.4); waterTex.repeat.set(1, 1);
  const water = std({ color: 0x3a99bd, map: waterTex, roughness: 0.16, metalness: 0.03, emissive: 0x0a3852, emissiveIntensity: 0.65, side: THREE.DoubleSide });
  const fall = std({ color: 0x8cddf5, map: fallTex, roughness: 0.24, metalness: 0.0, emissive: 0x18526a, emissiveIntensity: 0.8, side: THREE.DoubleSide });
  if (opaqueWater) { water.color.setHex(0x0f4a68); fall.color.setHex(0x2f7fa8); }
  else for (const m of [water, fall]) { m.transparent = true; m.opacity = m === water ? 0.62 : 0.72; m.depthWrite = false; }
  const foam = std({ color: 0xaee8ff, roughness: 0.5, emissive: 0x1f4a59, emissiveIntensity: 1.0, transparent: true, opacity: 0.8, depthWrite: false });
  // UVのないGLB部品にも使える、繰り返し可能な微細石材テクスチャ。
  // 大きなGLBを追加せずに床・壁・天井の表面情報を増やす。
  const rockTex = stoneTexture(256, 13, false);
  const slateTex = stoneTexture(256, 37, true);
  const paleTex = stoneTexture(256, 71, false);
  const rockBump = rockTex.clone(), slateBump = slateTex.clone(), paleBump = paleTex.clone();
  for (const t of [rockBump, slateBump, paleBump]) { t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; }
  return {
    'Wet slate stone': std({ color: 0x9fb6c0, map: slateTex, bumpMap: slateBump, bumpScale: 0.075, roughness: 0.38, metalness: 0.04, vertexColors: true }),   // 濡れた暗い石板
    'Ancient inlay': std({ color: 0xad8c4a, roughness: 0.42, metalness: 0.55, emissive: 0x2a1c06, emissiveIntensity: 0.6 }),
    'Deep cavern rock': std({ color: 0x8fa6b1, map: rockTex, bumpMap: rockBump, bumpScale: 0.15, roughness: 0.89, metalness: 0.0, vertexColors: true }),
    'Pale mineral stone': std({ color: 0xb6d2de, map: paleTex, bumpMap: paleBump, bumpScale: 0.095, roughness: 0.57, metalness: 0.02, vertexColors: true }),  // 淡い鉱物の石
    'Glowing cyan crystal': std({ color: 0x3dc7fa, roughness: 0.18, metalness: 0.1, emissive: 0x1aa6e0, emissiveIntensity: 0.75 }),  // 控えめな発光
    'Deep blue crystal': std({ color: 0x3863e0, roughness: 0.2, metalness: 0.1, emissive: 0x1a2f8a, emissiveIntensity: 0.6 }),
    'Violet danger crystal': std({ color: 0x9e4ce0, roughness: 0.25, metalness: 0.05, emissive: 0x5a1a90, emissiveIntensity: 0.9 }), // 紫＝危険
    'Clear blue water': water,
    'Water foam': foam,
    'Aquatic dark teal': std({ color: 0x1d7563, roughness: 0.62, metalness: 0.0 }),
    ceiling: std({ color: 0x9bb4c0, map: rockTex, bumpMap: rockBump, bumpScale: 0.16, roughness: 0.91, metalness: 0.0, emissive: 0x253f4a, emissiveIntensity: 0.45, vertexColors: true, side: THREE.DoubleSide }),   // 下向きの面は環境光が弱いので少し自発光
    bed: std({ color: 0x122a3a, roughness: 0.6, metalness: 0.0 }),                                // 水底・床板のすき間
    waterfall: fall,
  };
}
// タイル境界で繰り返せる周期関数と決定論的な粒子を合成する。
function stoneTexture(size, seed, slate) {
  const tex = tileTexture(size, (c, n) => {
    const image = c.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = x / n * Math.PI * 2, v = y / n * Math.PI * 2;
      const strata = Math.sin(v * (slate ? 18 : 7) + Math.sin(u * 3) * 0.8) * (slate ? 15 : 9);
      const grain = Math.sin(u * 13 + Math.cos(v * 9)) * Math.cos(v * 17 - Math.sin(u * 5)) * 13;
      const fleck = (rnd(x * 19 + y * 127 + seed) - 0.5) * 32;
      const value = Math.max(75, Math.min(228, 165 + strata + grain + fleck));
      const i = (y * n + x) * 4;
      image.data[i] = value * 0.88;
      image.data[i + 1] = value * 0.96;
      image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
    c.putImageData(image, 0, 0);
  });
  tex.anisotropy = 4;
  return tex;
}
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
  const walls = [0, 1, 2, 3].map((v) => {
    // 幅4.3×高さ4.1×厚み0.8。原点は内側の面の下端中央（+Z が通路側）＝第1階層の壁部品と同じ約束
    const g = new THREE.BoxGeometry(4.3, 4.1, 0.8, 20, 16, 1).toNonIndexed(); g.translate(0, 2.05, -0.4);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (z < -0.01) continue;   // 通路側の面だけ凸凹にする
      const edge = Math.min(1, Math.max(0, (2.15 - Math.abs(x)) / 0.35));   // 左右の端は平らにして隣の壁とつなぐ
      const n = 0.5 + 0.30 * Math.sin(x * 1.9 + v * 2.1) * Math.sin(y * 1.5 + v) + 0.23 * Math.sin(x * 4.3 + y * 3.7 + v * 5.0) + 0.14 * Math.cos(x * 8.1 - y * 6.4 + v);
      p.setZ(i, z - n * 0.52 * edge + 0.04);
    }
    return { name: `cavern_wall_${v}`, parts: [{ geo: prepGeo(g, false), mat: 'Deep cavern rock' }] };
  });
  const ceil = (() => {
    const g = new THREE.PlaneGeometry(4.25, 4.25, 12, 12).rotateX(Math.PI / 2).toNonIndexed(), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, -(0.32 + 0.24 * Math.sin(x * 1.3 + 0.7) * Math.cos(z * 1.1 + 0.3) + 0.15 * Math.sin(x * 3.1 + z * 2.3) + 0.10 * Math.cos(x * 5.1 - z * 4.2))); }
    return { name: 'cavern_ceiling', parts: [{ geo: prepGeo(g, false), mat: 'ceiling' }] };
  })();
  const bed = { name: 'water_bed', parts: [{ geo: prepGeo(new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2), false), mat: 'bed' }] };
  const pool = (w, d) => ({ name: 'water_surface', parts: [{ geo: prepGeo(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), true), mat: 'Clear blue water' }] });
  const plaque = { name: 'wall_plaque', parts: [{ geo: prepGeo(new THREE.BoxGeometry(1.1, 0.7, 0.08).translate(0, 0, 0.04), false), mat: 'Ancient inlay' }, { geo: prepGeo(new THREE.BoxGeometry(1.3, 0.9, 0.06).translate(0, 0, 0.0), false), mat: 'Pale mineral stone' }] };
  return { walls, ceil, bed, poolFull: pool(4, 4), poolHalf: pool(4, 1.9), plaque };
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
  const p = geo.attributes.position, n = p.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const big = 0.5 + 0.5 * Math.sin(cx * 0.9 + cz * 0.7) * Math.sin(cy * 1.3 + cz * 0.4);
    const v = 0.72 + 0.22 * big + 0.16 * rnd(Math.floor(cx * 7.3) * 31 + Math.floor(cy * 5.1) * 17 + Math.floor(cz * 6.7));
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
  const proc = makeProcedural();
  const mats = makeMaterials(opaqueWater);
  const { CELL, DIR_VEC, DIR_ORDER, FACE_YAW, hash, g } = api;
  let made = [], anim = { ripples: [], mists: [] }, root = null, last = { falls: [], bridge: null };

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
    anim = { ripples: [], mists: [] }; root = null;
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
      let valid = true;
      for (let dz = -1; dz <= 1 && valid; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (wallCell(cx + dx, cy + dz) || objAt.has(`${cx + dx},${cy + dz}`)) valid = false;
      }
      if (valid) skylightCandidates.push({ cx, cy, score: hash(cx, cy, 205) });
    }
    skylightCandidates.sort((a, b) => a.score - b.score);
    const sky = skylightCandidates[0] || null;
    if (sky) {
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) openCells.add(`${sky.cx + dx},${sky.cy + dz}`);
      addAtrium(sky.cx * CELL, sky.cy * CELL);
    }

    for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
      if (wallCell(tx, ty)) continue;
      const c = ch(tx, ty), x = X(tx), z = Z(ty), key = `${tx},${ty}`;
      const fall = falls.get(key);
      // 床：濡れた石板を2×2枚。すき間から暗い水底がのぞく
      B.add('floor', proc.bed, M4(x, -0.3, z), tx, ty);
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
        if (anim.ripples.length < 24 && hash(tx, ty, 11) < 0.45) addRipple(x + (hash(tx, ty, 12) - 0.5) * 2, z + (hash(tx, ty, 13) - 0.5) * 2, hash(tx, ty, 14));
      } else {
        for (const [ox, oz] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]]) {
          if (fall) { const [bx, bz] = DIR_VEC[fall]; if (ox * bx + oz * bz > 0) continue; }   // 滝つぼ側の床板は外す
          const r = hash(tx * 2 + (ox > 0), ty * 2 + (oz > 0), 15);
          B.add('floor', pick(kit.slabs, r), M4(x + ox, 0, z + oz, Math.floor(hash(tx * 2 + (ox > 0), ty * 2 + (oz > 0), 16) * 4) * Math.PI / 2), tx, ty);
        }
        if (c === ',' || c === '_' || c === 'P') {   // 道（, _）には古い象嵌を一筋
          const run = (ch(tx - 1, ty) === c || ch(tx + 1, ty) === c) ? 0 : Math.PI / 2;
          B.add('floor', pick(kit.inlays, hash(tx, ty, 17)), M4(x, 0.004, z, run, [3.2, 1, 3.2]), tx, ty);
        }
      }
      // 天井
      if (!openCells.has(key)) B.add('ceiling', proc.ceil, M4(x, 4, z, Math.floor(hash(tx, ty, 18) * 4) * Math.PI / 2), tx, ty);
      // 壁と、壁ぎわの岩・鉱脈・壁付きの物
      for (const d of DIR_ORDER) {
        const [dx, dy] = DIR_VEC[d]; if (!wallCell(tx + dx, ty + dy)) continue;
        const ex = x + dx * CELL / 2, ez = z + dy * CELL / 2, k = hash(tx * 4 + DIR_ORDER.indexOf(d), ty, 5), ry = FACE_YAW[d] + Math.PI;
        B.add('walls', pick(proc.walls, k), M4(ex, 0, ez, ry), tx, ty);
        // 壁と床の境目に低い岩の堆積を置き、直線的な接合部を崩す。
        // 通路中央やイベントマスを避け、歩行判定には影響させない。
        if (!objAt.has(key) && c !== '>' && c !== '<' && k < 0.72) {
          const rim = pick(kit.rocks, hash(tx, ty, 180 + DIR_ORDER.indexOf(d)));
          const offset = (hash(tx, ty, 184 + DIR_ORDER.indexOf(d)) - 0.5) * 2.0;
          const scale = 0.22 + hash(tx, ty, 188 + DIR_ORDER.indexOf(d)) * 0.13;
          B.add('rock_seams', rim, M4(ex - dx * 0.12 + along[0] * offset, -0.20,
            ez - dy * 0.12 + along[1] * offset, ry + hash(tx, ty, 192) * 0.8, scale), tx, ty);
        }
        const along = [dy ? 1 : 0, dx ? 1 : 0];   // 壁に沿う向き（x, z）
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
        if (fall === d) { addWaterfall(ex, ez, ry, tx, ty, B); continue; }
        if (objAt.has(key) || c === '>' || c === '<') continue;
        if (k > 0.45) {   // 壁の根元の岩（通路へのはみ出しは0.5m以内）
          const s = 0.5 + hash(tx, ty + 7 * DIR_ORDER.indexOf(d), 19) * 0.3, t = (hash(tx, ty, 20 + DIR_ORDER.indexOf(d)) - 0.5) * 2.2;
          const piece = pick(kit.boulders, hash(tx, ty, 24 + DIR_ORDER.indexOf(d)));
          const inward = 0.45 - piece.size.z * s * 0.5;
          B.add('rocks', piece, M4(ex + along[0] * t - dx * inward, -0.15, ez + along[1] * t - dy * inward, ry + (hash(tx, ty, 28) - 0.5) * 0.5, s), tx, ty);
        }
        if (k < 0.1) {    // 光る鉱脈
          const t = (hash(tx, ty, 29) - 0.5) * 2.4, y = 1.0 + hash(tx, ty, 30) * 1.8;
          B.add('crystals', pick(kit.veins, hash(tx, ty, 31)), M4(ex + along[0] * t - dx * 0.06, y, ez + along[1] * t - dy * 0.06, ry, 1.1), tx, ty);
        }
      }
      // 角の結晶の群れ（二方が壁の角だけ。通路の正面をふさがない）
      if (!objAt.has(key) && !fall && c !== '*') {
        for (let i = 0; i < 4; i++) {
          const d1 = DIR_ORDER[i], d2 = DIR_ORDER[(i + 1) % 4];
          if (!wallCell(tx + DIR_VEC[d1][0], ty + DIR_VEC[d1][1]) || !wallCell(tx + DIR_VEC[d2][0], ty + DIR_VEC[d2][1])) continue;
          if (hash(tx, ty, 32 + i) > 0.3) continue;
          const px = x + (DIR_VEC[d1][0] + DIR_VEC[d2][0]) * 1.3, pz = z + (DIR_VEC[d1][1] + DIR_VEC[d2][1]) * 1.3;
          const piece = pick(kit.crystals, hash(tx, ty, 36 + i)), s = 0.45 + hash(tx, ty, 40) * 0.15;
          B.add('crystals', piece, M4(px, -0.05, pz, hash(tx, ty, 37) * 6, s), tx, ty);
          light(px, piece.size.y * s * 0.6, pz, 0x4fd6ff, 1.3, 4.5);
          break;
        }
        // 開けた場所の小岩（壁が1つもないマスのふち）
        if (DIR_ORDER.every((d) => !wallCell(tx + DIR_VEC[d][0], ty + DIR_VEC[d][1])) && hash(tx, ty, 42) < 0.12) {
          B.add('rocks', pick(kit.rocks, hash(tx, ty, 43)), M4(x + (hash(tx, ty, 44) > 0.5 ? 1.5 : -1.5), -0.1, z + (hash(tx, ty, 45) - 0.5) * 2.4, hash(tx, ty, 46) * 6, 0.7), tx, ty);
        }
      }
      // 天井から下がる結晶（まれに、壁ぎわ）
      if (!openCells.has(key) && hash(tx, ty, 47) < 0.19) {
        const d = DIR_ORDER.find((q) => wallCell(tx + DIR_VEC[q][0], ty + DIR_VEC[q][1]));
        if (d) { const [dx, dy] = DIR_VEC[d]; B.add('crystals', pick(kit.shards, hash(tx, ty, 48)), M4(x + dx * 1.3, 3.82, z + dy * 1.3, hash(tx, ty, 49) * 6, 0.24 + hash(tx, ty, 194) * 0.22, Math.PI), tx, ty); }
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
    last = { falls: [...falls].map(([k, d]) => ({ cell: k, wall: d })), bridge };
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
      const sign = side % 2 === 0 ? -1 : 1;
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
    // 角の崩れた支柱と礎石。上方には段差を付け、直方体の箱に見えにくくする。
    for (const [dx, dz] of [[-5.6,-5.6],[5.6,-5.6],[-5.6,5.6],[5.6,5.6]]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.88, 18, 8), stone);
      pillar.position.set(x + dx, 13, z + dz); atrium.add(pillar);
      for (const h of [5.5, 11.5, 17.5, 21.5]) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.4, 8), dark);
        cap.position.set(x + dx, h, z + dz); atrium.add(cap);
      }
    }
    // 空洞上部の明るい水色。全体の背景色ではなく、吹き抜け内部だけの光源。
    const opening = new THREE.Mesh(new THREE.CircleGeometry(5.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x6bcde5, side: THREE.DoubleSide, fog: false }));
    opening.rotation.x = Math.PI / 2; opening.position.set(x, 22.65, z); atrium.add(opening);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 4.1, 19, 16, 1, true), lightMat);
    beam.position.set(x, 13, z); beam.renderOrder = 3; atrium.add(beam);
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
      atrium.add(f);
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
    // 滝の帯（高さ4.8m）を天井4mに収める。滝つぼ（奥の半分）は水面、手前に泡
    const sy = 3.85 / kit.waterfall.size.y, sx = 2.4 / kit.waterfall.size.x;
    const fwd = [Math.sin(ry), Math.cos(ry)];   // 壁から通路へ向かう向き
    B.add('water', kit.waterfall, M4(ex + fwd[0] * 0.12, 0, ez + fwd[1] * 0.12, ry, [sx, sy, 1]), tx, ty);
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
    const N = 28, pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) seed[i] = rnd(i + x * 3 + z * 7);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: mistTex, size: 0.32, transparent: true, opacity: 0.2, depthWrite: false, color: 0xcff2ff, sizeAttenuation: true });
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
    for (const r of anim.ripples) {
      if (camPos && r.mesh.position.distanceToSquared(camPos) > 400) { r.mesh.visible = false; continue; }
      r.mesh.visible = true;
      const p = (r.phase + t * r.speed) % 1, s = (0.35 + p * 0.9) * r.base;
      r.mesh.scale.set(s, 1, s); r.mesh.material.opacity = (1 - p) * 0.55;
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

  return { area: 2, env: ENV, build, sync, tick, dispose, kit, info: () => ({ meshCount: kit.meshCount, omitted: kit.omitted, drawGroups: root ? root.children.map((c) => `${c.name}:${c.children.length}`) : [], ripples: anim.ripples.length, mists: anim.mists.length, ...last }) };
}
