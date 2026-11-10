/* ============================================================
   field/b2-crystals.js — 第2階層の結晶（水晶の群晶・結晶の塊）を作る
   ------------------------------------------------------------
   参考：水晶の群晶の写真（六角柱の先が六角すいにとがった結晶が、母岩から放射状に伸びる）。
   ・結晶1本：少しゆがんだ六角柱＋六角すいの先端。面ごとに光が変わるよう平面の陰影（flatShading）。
   ・面ごとに質感を変える：透明な面（半透明・映り込み）／濁った面（乳白で不透明、内側からほのかに光る）。
     全部の面を透かさず、1本の中でも透明と濁りが混ざる。
   ・先が折れた結晶：斜めの割れ口（断面）に、貝殻状にでこぼこした白っぽい面を付ける。
   ・群晶（cluster）：主役の結晶、外へ傾いた結晶、根元の小さな結晶、母岩。
   ・結晶の塊（massive）：割れた面だらけの大きな結晶の塊（凸多面体）に、太く短い結晶がびっしり生えたもの。
   ・色：白（透明な水晶）・水色・紫（アメシスト）・青。根元は乳白色、先へ行くほど色が濃い（頂点の色）。
   画像・GLB は使わず、すべてコードで作る（容量ゼロ）。
   ============================================================ */
import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

// 色：base＝根元（乳白）、tip＝先端、core＝芯の光
export const CRYSTAL_PALETTES = {
  // 先端（tip）は濃く深い色。根元の乳白から先へ向かって一気に濃くなる
  white: { base: 0xf7fbff, tip: 0xbcdcff, core: 0x9cc4ea },    // 透明な水晶（先端だけ薄い青）
  cyan: { base: 0xd2f6ff, tip: 0x0096d6, core: 0x0a8cc8 },     // 水色（先端は深い水色）
  violet: { base: 0xeadcff, tip: 0x5a12c8, core: 0x6a2ad8 },   // 紫（先端は濃いアメシスト）
  blue: { base: 0xd8e4ff, tip: 0x1230c8, core: 0x2244d8 },     // 青（先端は群青）
};
export const CRYSTAL_PARTS = ['shell', 'cloudy', 'fracture', 'core', 'rock'];

const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// 三角形を質感ごとにためる入れ物
// l には結晶ごとの「自分の座標」（模様を結晶に張り付けるため。動かしても模様がずれない）を入れる
class Tris {
  constructor() { this.b = { shell: [], cloudy: [], fracture: [], core: [] }; this.l = { shell: [], cloudy: [], fracture: [], core: [] }; this.off = V(0, 0, 0); }
  add(kind, a, b, c) {
    this.b[kind].push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    const o = this.off; this.l[kind].push(a.x + o.x, a.y, a.z + o.z, b.x + o.x, b.y, b.z + o.z, c.x + o.x, c.y, c.z + o.z);
  }
}
function toGeo(arr, larr) {
  if (!arr.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  g.setAttribute('lpos', new THREE.Float32BufferAttribute(larr, 3));
  g.computeVertexNormals(); return g;
}

// 結晶1本（原点＝根元の中心、+Y、長さ1）。kind：'clear'（ほぼ透明）/'cloudy'（ほぼ濁り）/'broken'（先が折れて断面）
function quartzPoint(T, r, seed, kind, twin) {
  const ring0 = [], ring1 = [];
  const tipH = Math.min(r * (1.4 + rnd(seed) * 0.8), 0.4), bodyH = 1 - tipH;   // 太く短い結晶でも柱の部分を残す
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + (rnd(seed + 3 + i) - 0.5) * 0.18, k = 1 + (rnd(seed + 10 + i) - 0.5) * 0.35;
    ring0.push(V(Math.cos(a) * r * k * 1.04, 0, Math.sin(a) * r * k * 1.04));
    ring1.push(V(Math.cos(a) * r * k, bodyH + (rnd(seed + 20 + i) - 0.5) * tipH * 0.35, Math.sin(a) * r * k));
  }
  // 面ごとの質感：透明な結晶でも1〜2面は濁り、濁った結晶でも1面は透ける
  const faceKind = (i) => { const x = rnd(seed * 3 + i * 17); return kind === 'cloudy' ? (x < 0.15 ? 'shell' : 'cloudy') : (x < 0.25 ? 'cloudy' : 'shell'); };
  if (kind === 'broken') {
    // 斜めの割れ口：柱の途中を傾いた面で切り、割れ口は貝殻状のでこぼこ（中心と中点を少し浮き沈みさせた扇）
    const cutH = bodyH * (0.55 + rnd(seed + 30) * 0.35), sx = (rnd(seed + 31) - 0.5) * 1.6, sz = (rnd(seed + 32) - 0.5) * 1.6;
    const top = ring1.map((p) => V(p.x, cutH + p.x * sx + p.z * sz, p.z));
    for (let i = 0; i < 6; i++) { const j = (i + 1) % 6, fk = faceKind(i); T.add(fk, ring0[i], top[i], top[j]); T.add(fk, ring0[i], top[j], ring0[j]); }
    const c = V((rnd(seed + 33) - 0.5) * r * 0.3, cutH + (rnd(seed + 34) - 0.4) * r * 0.5, (rnd(seed + 35) - 0.5) * r * 0.3);
    for (let i = 0; i < 6; i++) {
      const j = (i + 1) % 6, m = top[i].clone().lerp(top[j], 0.5).lerp(c, 0.35); m.y += (rnd(seed + 40 + i) - 0.5) * r * 0.35;
      T.add('fracture', top[i], c, m); T.add('fracture', m, c, top[j]);
    }
    return;
  }
  const apex = V((rnd(seed + 1) - 0.5) * r * 0.5, 1, (rnd(seed + 2) - 0.5) * r * 0.5);
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6, fk = faceKind(i), tk = faceKind(i + 6);
    T.add(fk, ring0[i], ring1[i], ring1[j]); T.add(fk, ring0[i], ring1[j], ring0[j]);
    T.add(tk, ring1[i], apex, ring1[j]);
  }
  if (twin) { const apex2 = V(-apex.x, -tipH * 0.9, -apex.z); for (let i = 0; i < 6; i++) T.add(faceKind(i + 12), ring0[(i + 1) % 6], apex2, ring0[i]); }
  // 芯：透ける面のある結晶だけ、中に細い発光の芯
  if (kind === 'clear') {
    const cr = r * 0.45, ch = bodyH * 0.92;
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * 6.283, a1 = ((i + 1) / 6) * 6.283;
      const p0 = V(Math.cos(a0) * cr, 0.02, Math.sin(a0) * cr), p1 = V(Math.cos(a1) * cr, 0.02, Math.sin(a1) * cr);
      const q0 = V(p0.x, ch, p0.z), q1 = V(p1.x, ch, p1.z), tip = V(apex.x * 0.5, ch + tipH * 0.6, apex.z * 0.5);
      T.add('core', p0, q0, q1); T.add('core', p0, q1, p1); T.add('core', q0, tip, q1);
    }
  }
}

// 頂点の色：根元（y の低い所）は乳白、高い所ほど先端の色。割れ口は白寄り、芯は暗めの先端色
function paint(geo, pal, kind, yMin, yMax) {
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  const a = new THREE.Color(pal.base), b = new THREE.Color(kind === 'core' ? pal.core : pal.tip), c = new THREE.Color(), w = new THREE.Color(0xffffff);
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp((p.getY(i) - yMin) / Math.max(1e-3, yMax - yMin), 0, 1);
    if (kind === 'core') { c.copy(a).lerp(b, 0.8 + t * 0.2).multiplyScalar(0.7 + t * 0.25); }
    else if (kind === 'fracture') { c.copy(a).lerp(b, Math.pow(t, 0.7) * 0.5).lerp(w, 0.35); }
    else if (kind === 'cloudy') { c.copy(a).lerp(b, 0.3 + Math.pow(t, 0.6) * 0.7); }
    else c.copy(a).lerp(b, 0.4 + Math.pow(t, 0.5) * 0.6);   // 根元から色を残し、上半分はほぼ先端の濃い色
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// 母岩：つぶした多面体を数個
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

// 結晶の大きな塊：ランダムな点の凸包＝平らな割れ面だらけの塊。面ごとに 濁り／透明／割れ口 を割り振る
function addChunk(T, seed, R, H) {
  T.off.set(rnd(seed + 5) * 40, 0, rnd(seed + 7) * 40);
  const pts = [];
  for (let i = 0; i < 22; i++) {
    const a = rnd(seed + i * 3) * 6.283, d = Math.sqrt(rnd(seed + i * 5)) * R, y = rnd(seed + i * 7) * H * (1 - d / R * 0.55);
    pts.push(V(Math.cos(a) * d, y, Math.sin(a) * d));
  }
  pts.push(V(0, H * 1.05, 0));
  const g = new ConvexGeometry(pts).toNonIndexed(), p = g.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const A = V(p.getX(i), p.getY(i), p.getZ(i)), B = V(p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)), C = V(p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
    const n = B.clone().sub(A).cross(C.clone().sub(A)).normalize(), x = rnd(seed * 11 + Math.round((A.x + B.y + C.z) * 37));
    // 上向きの面は割れ口になりやすく、横の面は濁りが多い
    const kind = n.y > 0.55 && x < 0.45 ? 'fracture' : x < 0.62 ? 'cloudy' : 'shell';
    T.add(kind, A, B, C);
  }
  g.dispose(); T.off.set(0, 0, 0);
}

const UP = V(0, 1, 0);
// 群晶・塊を1つ作る。返り値：{ shell, cloudy, fracture, core, rock } それぞれ BufferGeometry の配列（原点＝根元の中心、高さ約1）
// size：'large'（主役の群晶）/'medium'/'small'（根元に散らす小さな群れ）/'massive'（結晶の塊）
export function makeCrystalCluster(seed, paletteName, size = 'large') {
  const pal = CRYSTAL_PALETTES[paletteName] || CRYSTAL_PALETTES.cyan;
  const out = { shell: [], cloudy: [], fracture: [], core: [], rock: [] };
  const T = new Tris();
  const R = size === 'massive' ? 0.5 : size === 'large' ? 0.42 : size === 'medium' ? 0.3 : 0.18;
  addMatrix(out, seed, R);
  const kindOf = (sd) => { const x = rnd(sd * 1.37); return x < 0.5 ? 'clear' : x < 0.85 ? 'cloudy' : 'broken'; };
  const place = (len, r, tilt, yaw, dist, lift, sd, twin, kind) => {
    const base = V(Math.cos(yaw) * dist, lift, Math.sin(yaw) * dist);
    const dir = V(Math.cos(yaw) * Math.sin(tilt), Math.cos(tilt), Math.sin(yaw) * Math.sin(tilt)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir).multiply(new THREE.Quaternion().setFromAxisAngle(UP, rnd(sd + 50) * 6.28));
    const m = new THREE.Matrix4().compose(base, q, V(len, len, len));
    const t = new Tris(); t.off.set(rnd(sd + 61) * 40, 0, rnd(sd + 67) * 40); quartzPoint(t, r, sd, kind || kindOf(sd), twin);
    for (const k of Object.keys(t.b)) { const a = t.b[k]; for (let i = 0; i < a.length; i += 3) { const v = V(a[i], a[i + 1], a[i + 2]).applyMatrix4(m); T.b[k].push(v.x, v.y, v.z); } T.l[k].push(...t.l[k]); }
  };
  if (size === 'massive') {
    // 塊：大きな割れた結晶の塊＋上に太く短い結晶をびっしり（塊感）
    addChunk(T, seed, R, 0.62);   // 割れ面だらけの大きな塊が主役
    const n = 7 + Math.floor(rnd(seed + 4) * 5);
    for (let i = 0; i < n; i++) {
      // 塊の上半分から、太く短い結晶がほぼ上向きに突き出す（花のように開かない）
      const yaw = rnd(seed * 61 + i) * 6.28, dist = Math.sqrt(rnd(seed * 67 + i)) * R * 0.55;
      place(0.32 + rnd(seed * 71 + i) * 0.4, 0.2 + rnd(seed * 73 + i) * 0.1, 0.1 + dist / R * 0.5 + rnd(seed * 79 + i) * 0.2, yaw, dist, 0.45 * (1 - dist / R), seed * 100 + i);
    }
  } else {
    const big = size === 'large' ? 1 + Math.floor(rnd(seed + 1) * 3) : size === 'medium' ? 1 : 0;
    const mid = size === 'large' ? 6 + Math.floor(rnd(seed + 2) * 5) : size === 'medium' ? 4 + Math.floor(rnd(seed + 2) * 3) : 2;
    const small = size === 'large' ? 12 + Math.floor(rnd(seed + 3) * 8) : size === 'medium' ? 8 : 6;
    // 主役：ほぼまっすぐで長い。透明か濁り（折れない）
    for (let i = 0; i < big; i++) place(0.75 + rnd(seed * 3 + i) * 0.3, 0.13 + rnd(seed * 5 + i) * 0.04, rnd(seed * 7 + i) * 0.35, rnd(seed * 11 + i) * 6.28, rnd(seed * 13 + i) * R * 0.3, R * 0.05, seed * 100 + i, false, rnd(seed * 9 + i) < 0.7 ? 'clear' : 'cloudy');
    // 太く短い結晶を根元に数本（まとまった塊感）
    for (let i = 0; i < (size === 'small' ? 1 : 3); i++) place(0.18 + rnd(seed * 83 + i) * 0.14, 0.3 + rnd(seed * 89 + i) * 0.12, 0.2 + rnd(seed * 97 + i) * 0.5, rnd(seed * 101 + i) * 6.28, R * (0.1 + rnd(seed * 103 + i) * 0.35), R * 0.05, seed * 100 + 90 + i);
    for (let i = 0; i < mid; i++) {
      const yaw = (i / mid) * 6.28 + rnd(seed * 17 + i) * 0.8;
      place((size === 'small' ? 0.35 : 0.3) + rnd(seed * 19 + i) * 0.35, 0.12 + rnd(seed * 23 + i) * 0.05, 0.35 + rnd(seed * 29 + i) * 0.6, yaw, R * (0.2 + rnd(seed * 31 + i) * 0.5), R * 0.04, seed * 100 + 20 + i);
    }
    for (let i = 0; i < small; i++) {
      const yaw = rnd(seed * 37 + i) * 6.28, twin = rnd(seed * 41 + i) < 0.2;
      place(0.07 + rnd(seed * 43 + i) * 0.16, 0.14 + rnd(seed * 47 + i) * 0.06, twin ? 1.35 + rnd(seed * 53 + i) * 0.2 : 0.6 + rnd(seed * 53 + i) * 0.8, yaw, R * (0.35 + rnd(seed * 59 + i) * 0.7), R * 0.06, seed * 100 + 50 + i, twin);
    }
  }
  // 色は群晶全体の高さに対して付ける（根元が乳白、上ほど濃い）
  for (const k of Object.keys(T.b)) { const g = toGeo(T.b[k], T.l[k]); if (g) out[k].push(paint(g, pal, k, 0, size === 'massive' ? 0.9 : 1.0)); }
  return out;
}

// 素材（色は頂点の色で付けるので、全色共通の5つ）
// shell：透明な面（半透明・強い映り込み・ふちが光る） cloudy：濁った面（乳白で不透明、内側からほのかに光る）
// fracture：割れ口（白っぽく、ざらついた光り方） core：透明な結晶の芯（光源に関係なく光る） rock：母岩
// 結晶の模様（フラグメントシェーダー）：
//   ・うっすら全体が光る（base）
//   ・中心が輝く：視線に正面を向いた面ほど、また結晶の高さの中ほどほど明るい（透けた中心が光って見える）
//   ・模様：結晶の自分の座標で作る3次元のボロノイ。境目は細い光のひび、一部の細胞は暗い内包物の斑、
//           長さ方向に流れる淡い光の筋。ふちは結晶の色で光る
const CRYSTAL_GLSL = `
  vec3 _h3(vec3 p) { p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return fract(sin(p) * 43758.5453); }
  // 戻り値：x=最も近い点までの距離, y=2番目との差（境目で0）, z=細胞ごとの乱数
  vec3 _vor(vec3 p) {
    vec3 ip = floor(p), fp = fract(p); float d1 = 8.0, d2 = 8.0; vec3 id = vec3(0.0);
    for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec3 g = vec3(float(i), float(j), float(k)), o = _h3(ip + g), r = g + o - fp; float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; id = ip + g; } else if (d < d2) d2 = d;
    }
    return vec3(sqrt(d1), sqrt(d2) - sqrt(d1), _h3(id).x);
  }
`;
function crystalShader(m, key, o) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 lpos;\nvarying vec3 vL;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = lpos;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vL;\n' + CRYSTAL_GLSL)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 cv = _vor(vec3(vL.x * 4.2, vL.y * 2.1, vL.z * 4.2) + vec3(0.0, sin(vL.x * 3.0 + vL.z * 2.0) * 0.35, 0.0));   // ゆがめて不規則な大きめの斑に
        vec3 cv2 = _vor(vec3(vL.x * 11.0, vL.y * 6.0, vL.z * 11.0));
        float crack = ((1.0 - smoothstep(0.0, 0.04, cv.y)) * step(0.4, cv.z) + (1.0 - smoothstep(0.0, 0.025, cv2.y)) * 0.3 * step(0.7, cv.z));   // 光のひび（所々だけ。全体を網目にしない）
        float dark = step(${o.darkCut.toFixed(2)}, cv.z) * (1.0 - crack);   // 暗い内包物の斑
        float streak = pow(0.5 + 0.5 * sin(vL.x * 31.0 + vL.z * 23.0 + sin(vL.y * 9.0) * 1.5), 8.0);   // 長さ方向の光の筋
        diffuseColor.rgb *= mix(${o.body.toFixed(2)}, ${(o.body * 0.25).toFixed(2)}, dark);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float facing = clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0);
          float bell = sin(3.14159 * clamp(vL.y, 0.0, 1.0));
          float center = pow(facing, 4.0) * (0.25 + 0.75 * bell);   // 正面を向いた面の中ほどが最も明るい
          float glow = ${o.base.toFixed(2)} + center * ${o.center.toFixed(2)} + crack * ${o.crack.toFixed(2)} + streak * 0.18 + pow(1.0 - facing, 2.2) * ${o.rim.toFixed(2)};
          totalEmissiveRadiance += vColor.rgb * glow * (1.0 - dark * 0.75) + vec3(1.0) * center * crack * ${o.white.toFixed(2)}; }`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}

// 素材（色は頂点の色で付けるので、全色共通の5つ）
// shell：透明な面（半透明・強い映り込み） cloudy：濁った面（不透明、内側から光る） fracture：割れ口（白っぽくざらつく）
// core：透明な結晶の芯（光源に関係なく光る） rock：母岩
export function makeCrystalMaterials() {
  const shell = crystalShader(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.05, metalness: 0.0, envMapIntensity: 1.2, transparent: true, opacity: 0.78, flatShading: true }), 'b2crystalShell2',
    { base: 0.07, center: 1.7, crack: 0.75, rim: 0.3, white: 0.6, body: 0.45, darkCut: 0.6 });
  const cloudy = crystalShader(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.3, metalness: 0.0, envMapIntensity: 1.0, flatShading: true }), 'b2crystalCloudy2',
    { base: 0.09, center: 1.0, crack: 0.6, rim: 0.22, white: 0.3, body: 0.5, darkCut: 0.55 });
  const fracture = crystalShader(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.62, metalness: 0.0, envMapIntensity: 0.8, flatShading: true }), 'b2crystalFracture2',
    { base: 0.1, center: 0.35, crack: 0.9, rim: 0.15, white: 0.35, body: 0.75, darkCut: 0.85 });
  const core = new THREE.MeshBasicMaterial({ vertexColors: true });   // 不透明（先に描かれ、半透明の殻を通して見える）
  const rock = new THREE.MeshStandardMaterial({ color: 0x5a7690, roughness: 0.85, metalness: 0.0, flatShading: true });
  return { shell, cloudy, fracture, core, rock };
}
