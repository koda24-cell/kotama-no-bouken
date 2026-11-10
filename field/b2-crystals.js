/* ============================================================
   field/b2-crystals.js — 第2階層の結晶（水晶の群晶）を作る
   ------------------------------------------------------------
   参考：水晶の群晶の写真（六角柱の先が六角すいにとがった結晶が、母岩から放射状に伸びる）。
   ・結晶1本：少しゆがんだ六角柱＋六角すいの先端。面ごとに光が変わるよう平面の陰影（flatShading）。
   ・群晶：主役の大きな結晶1〜3本、外へ傾いた中くらいの結晶、根元にびっしり付いた小さな結晶、母岩。
   ・色：白（透明な水晶）・水色・紫（アメシスト）・青。根元は乳白色、先へ行くほど色が濃くなる（頂点の色）。
   ・見た目：外側の殻（半透明・映り込み・ふちが光る）と、内側の芯（発光）の二重構造で、
     屈折の重い計算をせずに「透けて中が光る」感じを出す。
   画像・GLB は使わず、すべてコードで作る（容量ゼロ）。三角形は群晶1つで 500〜900 程度。
   ============================================================ */
import * as THREE from 'three';

// 色：base＝根元（乳白）、tip＝先端、core＝芯の光
export const CRYSTAL_PALETTES = {
  white: { base: 0xf7fbff, tip: 0xdbeeff, core: 0xb8d6ee },    // 透明な水晶（ほぼ無色、少し青白い）
  cyan: { base: 0xd8f8ff, tip: 0x22ccff, core: 0x2fb8e8 },     // 水色
  violet: { base: 0xeee2ff, tip: 0x8a48ff, core: 0x8f5cf0 },   // 紫（アメシスト）
  blue: { base: 0xdfe8ff, tip: 0x2f5cff, core: 0x3f68e8 },     // 青
};

const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// 結晶1本（原点＝根元の中心、+Y が伸びる向き、長さ1）。r：太さ（長さに対する比）
// 六角柱の各頂点を少しずらし、先端も中心から外して、自然な不揃いを作る
function quartzPoint(r, seed, twin) {
  const pos = [], ring0 = [], ring1 = [];
  const tipH = r * (1.4 + rnd(seed) * 0.8), bodyH = 1 - tipH;
  const apex = new THREE.Vector3((rnd(seed + 1) - 0.5) * r * 0.5, 1, (rnd(seed + 2) - 0.5) * r * 0.5);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + (rnd(seed + 3 + i) - 0.5) * 0.18, k = 1 + (rnd(seed + 10 + i) - 0.5) * 0.35;
    ring0.push(new THREE.Vector3(Math.cos(a) * r * k * 1.04, 0, Math.sin(a) * r * k * 1.04));   // 根元はわずかに太い
    ring1.push(new THREE.Vector3(Math.cos(a) * r * k, bodyH + (rnd(seed + 20 + i) - 0.5) * tipH * 0.35, Math.sin(a) * r * k));
  }
  const tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    tri(ring0[i], ring1[i], ring1[j]); tri(ring0[i], ring1[j], ring0[j]);   // 柱の面
    tri(ring1[i], apex, ring1[j]);                                          // 先端の面
  }
  if (twin) {   // 両側がとがった結晶（横たわる結晶用）：根元側にも先端を付ける
    const apex2 = new THREE.Vector3(-apex.x, -tipH * 0.9, -apex.z);
    for (let i = 0; i < 6; i++) { const j = (i + 1) % 6; tri(ring0[j], apex2, ring0[i]); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// 頂点の色：根元（y=0）は乳白、先端（y=1）は色が濃い。芯は少し明るく
function paint(geo, pal, coreMode) {
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  const a = new THREE.Color(pal.base), b = new THREE.Color(coreMode ? pal.core : pal.tip), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp(p.getY(i), 0, 1);
    // 殻：根元の乳白から先端の色へ。芯：先端側の色で、明るさを抑えて奥に沈んだ光にする
    c.copy(a).lerp(b, coreMode ? 0.8 + t * 0.2 : Math.pow(t, 0.7)); if (coreMode) c.multiplyScalar(0.7 + t * 0.25);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// 1本の結晶を、殻と芯の2つの形にして置く
function addPoint(out, pal, len, r, seed, matrix, twin) {
  const shell = quartzPoint(r, seed, twin); paint(shell, pal, false);
  const core = quartzPoint(r * 0.5, seed + 7, twin); core.translate(0, 0.02, 0); core.scale(1, 0.9, 1); paint(core, pal, true);
  const m = new THREE.Matrix4().makeScale(len, len, len).premultiply(matrix);
  out.shell.push(shell.applyMatrix4(m)); out.core.push(core.applyMatrix4(m));
}

// 母岩：つぶした多面体を数個。結晶が生える土台
function addMatrix(out, seed, radius) {
  const n = 3 + Math.floor(rnd(seed) * 3);
  for (let i = 0; i < n; i++) {
    const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const s = 1 + (rnd(seed * 7 + k * 3 + i) - 0.5) * 0.35; p.setXYZ(k, p.getX(k) * s, p.getY(k) * s, p.getZ(k) * s); }
    const a = rnd(seed + i * 5) * 6.28, d = rnd(seed + i * 9) * radius * 0.6;
    g.scale(radius * (0.45 + rnd(seed + i) * 0.35), radius * (0.18 + rnd(seed + i * 3) * 0.12), radius * (0.4 + rnd(seed + i * 4) * 0.35));
    g.translate(Math.cos(a) * d, radius * 0.02, Math.sin(a) * d);
    g.computeVertexNormals();
    out.rock.push(g);
  }
}

const UP = new THREE.Vector3(0, 1, 0);
// 群晶を1つ作る。返り値：{ shell, core, rock } それぞれ BufferGeometry の配列（原点＝群晶の根元の中心、高さ約1）
// size：'large'（主役の群晶）/ 'medium' / 'small'（根元に散らす小さな群れ）
export function makeCrystalCluster(seed, paletteName, size = 'large') {
  const pal = CRYSTAL_PALETTES[paletteName] || CRYSTAL_PALETTES.cyan;
  const out = { shell: [], core: [], rock: [] };
  const R = size === 'large' ? 0.42 : size === 'medium' ? 0.3 : 0.18;
  addMatrix(out, seed, R);
  const place = (len, r, tilt, yaw, dist, lift, sd, twin) => {
    // 根元の位置（母岩の上）、外へ向かって tilt だけ傾ける
    const base = new THREE.Vector3(Math.cos(yaw) * dist, lift, Math.sin(yaw) * dist);
    const dir = new THREE.Vector3(Math.cos(yaw) * Math.sin(tilt), Math.cos(tilt), Math.sin(yaw) * Math.sin(tilt)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir).multiply(new THREE.Quaternion().setFromAxisAngle(UP, rnd(sd + 50) * 6.28));
    addPoint(out, pal, len, r, sd, new THREE.Matrix4().compose(base, q, new THREE.Vector3(1, 1, 1)), twin);
  };
  const big = size === 'large' ? 1 + Math.floor(rnd(seed + 1) * 3) : size === 'medium' ? 1 : 0;
  const mid = size === 'large' ? 6 + Math.floor(rnd(seed + 2) * 5) : size === 'medium' ? 4 + Math.floor(rnd(seed + 2) * 3) : 2;
  const small = size === 'large' ? 12 + Math.floor(rnd(seed + 3) * 8) : size === 'medium' ? 8 : 6;
  // 主役：ほぼまっすぐ、長い
  for (let i = 0; i < big; i++) place(0.75 + rnd(seed * 3 + i) * 0.3, 0.13 + rnd(seed * 5 + i) * 0.04, rnd(seed * 7 + i) * 0.35, rnd(seed * 11 + i) * 6.28, rnd(seed * 13 + i) * R * 0.3, R * 0.05, seed * 100 + i);
  // 中くらい：外へ放射状に傾く
  for (let i = 0; i < mid; i++) {
    const yaw = (i / mid) * 6.28 + rnd(seed * 17 + i) * 0.8;
    place((size === 'small' ? 0.35 : 0.3) + rnd(seed * 19 + i) * 0.35, 0.12 + rnd(seed * 23 + i) * 0.05, 0.35 + rnd(seed * 29 + i) * 0.6, yaw, R * (0.2 + rnd(seed * 31 + i) * 0.5), R * 0.04, seed * 100 + 20 + i);
  }
  // 根元の小さな結晶：大きく傾き、母岩をおおう。2割は横たわる両錐の結晶
  for (let i = 0; i < small; i++) {
    const yaw = rnd(seed * 37 + i) * 6.28, twin = rnd(seed * 41 + i) < 0.2;
    place(0.07 + rnd(seed * 43 + i) * 0.16, 0.14 + rnd(seed * 47 + i) * 0.06, twin ? 1.35 + rnd(seed * 53 + i) * 0.2 : 0.6 + rnd(seed * 53 + i) * 0.8, yaw, R * (0.35 + rnd(seed * 59 + i) * 0.7), R * 0.06, seed * 100 + 50 + i, twin);
  }
  return out;
}

// 結晶の素材（色は頂点の色で付けるので、素材は全色共通で3つだけ）
// shell：半透明の殻。映り込みが強く、ふち（視線と面が平行になるところ）が頂点の色で光る
// core：内側の芯。光源の影響を受けずに光る（ブルームでにじむ）
// rock：母岩
export function makeCrystalMaterials() {
  const shell = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.04, metalness: 0.0, envMapIntensity: 2.2, transparent: true, opacity: 0.55, flatShading: true, emissive: 0x000000 });
  shell.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include emissivemap_fragment', `#include emissivemap_fragment
      { float facing = clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0);
        totalEmissiveRadiance += vColor.rgb * (pow(1.0 - facing, 2.2) * 1.1 + 0.18); }`);
  };
  shell.customProgramCacheKey = () => 'b2crystalShell';
  const core = new THREE.MeshBasicMaterial({ vertexColors: true });   // 不透明（先に描かれ、半透明の殻を通して見える）
  const rock = new THREE.MeshStandardMaterial({ color: 0x5a7690, roughness: 0.85, metalness: 0.0, flatShading: true });
  return { shell, core, rock };
}
