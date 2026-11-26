/* 5層 V6：戦争跡の小物（A6 剣／A7 盾・兜・槍・矢・瓦礫）
 * どれも「地面に刺さる・転がる・群れる」ことを前提に、根元に土と小石を足す。 */
import * as THREE from 'three';
import { sweep, lathe, chip, rng } from './b5v6-geom.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ROUND = n => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; });
const rod = (pts, r = 0.02, n = 6) => sweep(pts, ROUND(n).map(([c, s]) => [c * r, s * r]), { closed: true });
const steelWx = { grime: 0, soot: 0.6, moss: 0, mottle: 0.4, seed: 71 };

/* 刃（y 方向に伸びる）。len 刃渡り, w 根元の幅, tip 切っ先の長さ, broken 折れ位置（0〜1, 1=折れていない） */
function blade(len, w, { tip = 0.18, broken = 1, R = Math.random, notches = 0 } = {}) {
  const L = len * broken, pts = [];
  const half = y => w / 2 * (1 - 0.35 * (y / len));
  pts.push(new THREE.Vector2(-half(0), 0));
  // 刃こぼれ（片側に小さな欠け）
  const nl = [];
  for (let i = 0; i < notches; i++) nl.push(0.15 + R() * 0.7);
  const side = (sgn) => {
    const out = [];
    const n = 10;
    for (let i = 1; i <= n; i++) {
      const y = (i / n) * Math.min(L, len - tip);
      let x = half(y);
      if (sgn > 0 && nl.some(t => Math.abs(y / len - t) < 0.02)) x -= w * 0.18;
      out.push(new THREE.Vector2(sgn * x, y));
    }
    return out;
  };
  const right = side(1), left = side(-1).reverse();
  let topPts;
  if (broken < 1) {
    // ぎざぎざの折れ口
    const yb = L; topPts = [];
    for (let i = 0; i <= 4; i++) topPts.push(new THREE.Vector2(half(yb) * (1 - i / 2), yb + (i % 2 ? 0.025 : -0.01) + (R() - 0.5) * 0.02));
  } else topPts = [new THREE.Vector2(0, len)];
  const shape = new THREE.Shape([...[new THREE.Vector2(half(0), 0)], ...right, ...topPts, ...left]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0055, bevelSize: w * 0.22, bevelSegments: 1, curveSegments: 4 });
  g.translate(0, 0, -0.002);
  return g;
}

/* 剣：kind 'long' | 'great' | 'short' | 'broken'。原点＝鍔の中心、刃は +y */
export function sword(M, seed = 1, { kind = 'long' } = {}) {
  const R = rng(seed), parts = [];
  const spec = { long: [0.95, 0.055, 0.2, 0.09], great: [1.35, 0.075, 0.3, 0.12], short: [0.62, 0.05, 0.14, 0.08], broken: [0.95, 0.055, 0.22, 0.09] }[kind];
  const [len, w, guardW, grip] = spec;
  const br = kind === 'broken' ? 0.3 + R() * 0.35 : 1;
  parts.push([blade(len, w, { broken: br, R, notches: Math.floor(R() * 3) }), M.steel, steelWx]);
  // 鍔（両端が少し下がる）
  const gpts = []; for (let i = 0; i <= 8; i++) { const t = -1 + i / 4; if (t > 1) break; gpts.push(V(t * guardW, -0.012 - Math.abs(t) * Math.abs(t) * 0.035 * (R() < 0.5 ? 1 : -0.4), 0)); }
  parts.push([sweep(gpts, [[-0.016, -0.012], [0.016, -0.012], [0.016, 0.012], [-0.016, 0.012]], { up: V(0, 0, 1) }), M.iron, steelWx]);
  // 握り（革巻きの凹凸）と柄頭
  const gp = []; for (let i = 0; i <= 10; i++) gp.push([0.015 + (i % 2 ? 0.002 : 0), -0.03 - i / 10 * (grip * (kind === 'great' ? 2.2 : 1.6))]);
  const gl = grip * (kind === 'great' ? 2.2 : 1.6);
  parts.push([lathe([[0, -0.03], ...gp.map(([r, y]) => [r, y]), [0, -0.03 - gl]].map(([r, y]) => [r, y]), 8), M.leather, { grime: 0, soot: 0.3, moss: 0, seed: 72 }]);
  parts.push([new THREE.SphereGeometry(0.028 * (kind === 'great' ? 1.3 : 1), 8, 6).scale(1, 0.8, 0.6).translate(0, -0.05 - gl, 0), M.iron, steelWx]);
  return { parts, len: len * br };
}

/* 地面に刺さった剣の群れ（戦場跡の主役）。radius の円内に count 本、角度はばらばら */
export function swordField(M, seed = 1, { count = 13, radius = 1.35 } = {}) {
  const R = rng(seed), parts = [];
  const kinds = ['long', 'long', 'great', 'broken', 'short', 'broken'];
  for (let i = 0; i < count; i++) {
    const s = sword(M, seed * 31 + i, { kind: kinds[Math.floor(R() * kinds.length)] });
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * radius;
    // 鍔が上に来るよう 180°回して刃を地面へ。刺さる深さと傾き
    const tilt = (R() - 0.5) * 0.7, yaw = R() * Math.PI * 2, depth = 0.12 + R() * 0.3;
    const k = 1.15 + R() * 0.2;
    const m = new THREE.Matrix4().compose(V(Math.cos(a) * r, (s.len - depth) * k, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI + tilt, yaw, (R() - 0.5) * 0.5, 'YXZ')), V(k, k, k));
    for (const p of s.parts) { p[0].applyMatrix4(m); parts.push(p); }
    // 根元の土と小石
    const mound = new THREE.SphereGeometry(0.12 + R() * 0.08, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.4, 0.35, 1.2).translate(Math.cos(a) * r, 0, Math.sin(a) * r);
    parts.push([mound, M.rubble, { grime: 0.4, soot: 0, moss: 0.25, base: 0.7, seed: 73 }]);
  }
  return { parts, flames: [], embers: [], lights: [] };
}

/* 盾：kind 'kite' | 'round'。原点＝下端中央、+z が表 */
export function shield(M, seed = 1, { kind = 'kite', broken = false } = {}) {
  const R = rng(seed), parts = [];
  let outline;
  if (kind === 'kite') {
    outline = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; outline.push(new THREE.Vector2(0.3 * Math.sin(t * Math.PI / 2) ** 0.7, t * 0.55)); }
    outline.push(new THREE.Vector2(0.3, 0.75), new THREE.Vector2(0.24, 0.82), new THREE.Vector2(0, 0.84));
    const left = outline.slice(0, -1).reverse().map(v => new THREE.Vector2(-v.x, v.y)); outline = [...outline, ...left];
  } else outline = ROUND(20).map(([c, s]) => new THREE.Vector2(c * 0.33, 0.33 + s * 0.33));
  if (broken) { // 割れて欠けた縁
    const cut = 0.3 + R() * 0.3; outline = outline.map(v => v.y > cut && v.x > 0.05 ? new THREE.Vector2(Math.min(v.x, 0.05 + (R() - 0.5) * 0.08), v.y) : v);
  }
  const shape = new THREE.Shape(outline);
  const face = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false, curveSegments: 6 });
  // 湾曲
  const p = face.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - p.getX(i) * p.getX(i) * 0.6); face.computeVertexNormals();
  parts.push([face, R() < 0.5 ? M.paintRed : M.paintBlue, { grime: 0.2, soot: 0.6, moss: 0.05, mottle: 0.5, seed: 74 }]);
  const rim = sweep(outline.map(v => V(v.x, v.y, 0.035 - v.x * v.x * 0.6)), [[-0.012, -0.012], [0.012, -0.012], [0.012, 0.012], [-0.012, 0.012]], { up: V(0, 0, 1) });
  parts.push([rim, M.iron, steelWx]);
  if (kind === 'round') parts.push([new THREE.SphereGeometry(0.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).translate(0, 0.33, 0.035), M.iron, steelWx]);
  return { parts };
}

/* 兜（グレートヘルム）：原点＝底の中心 */
export function helmet(M, seed = 1) {
  const parts = [];
  const shell = lathe([[0.12, 0], [0.125, 0.12], [0.126, 0.22], [0.11, 0.27], [0.06, 0.3], [0, 0.305]], 12);
  shell.scale(1, 1, 1.1);
  parts.push([shell, M.steel, steelWx]);
  // 目の細隙と十字の補強
  parts.push([new THREE.BoxGeometry(0.17, 0.018, 0.04).translate(0, 0.18, 0.12), M.void, false]);
  parts.push([new THREE.BoxGeometry(0.03, 0.2, 0.02).translate(0, 0.12, 0.137), M.iron, steelWx]);
  parts.push([new THREE.TorusGeometry(0.126, 0.008, 4, 16).rotateX(Math.PI / 2).scale(1, 1, 1.1).translate(0, 0.205, 0), M.iron, steelWx]);
  return { parts };
}

/* 槍（折れた柄）。原点＝石突き、+y 方向 */
export function spear(M, seed = 1, { len = 2.4, broken = 0.6 } = {}) {
  const R = rng(seed), parts = [], L = len * broken;
  parts.push([new THREE.CylinderGeometry(0.022, 0.026, L, 7, 1).translate(0, L / 2, 0), M.wood, { grime: 0.2, soot: 0.3, moss: 0.05, seed: 75 }]);
  if (broken >= 0.99) {
    const head = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.045, 0.08), new THREE.Vector2(0.03, 0.26), new THREE.Vector2(0, 0.34), new THREE.Vector2(-0.03, 0.26), new THREE.Vector2(-0.045, 0.08)]);
    parts.push([new THREE.ExtrudeGeometry(head, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.01, bevelSegments: 1 }).translate(0, L, 0), M.steel, steelWx]);
  } else {
    // 裂けた折れ口
    for (let i = 0; i < 4; i++) parts.push([new THREE.ConeGeometry(0.008, 0.08 + R() * 0.1, 3).translate((R() - 0.5) * 0.03, L + 0.04, (R() - 0.5) * 0.03), M.wood, false]);
  }
  return { parts };
}

/* 地面に刺さった矢の束 */
export function arrows(M, seed = 1, { count = 7, radius = 0.5 } = {}) {
  const R = rng(seed), parts = [];
  for (let i = 0; i < count; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * radius, L = 0.55 + R() * 0.2;
    const g = [];
    const shaft = new THREE.CylinderGeometry(0.005, 0.005, L, 4).translate(0, L / 2, 0);
    const f1 = new THREE.PlaneGeometry(0.03, 0.09).translate(0.015, L - 0.06, 0), f2 = f1.clone().rotateY(Math.PI * 2 / 3), f3 = f1.clone().rotateY(-Math.PI * 2 / 3);
    const m = new THREE.Matrix4().compose(V(Math.cos(a) * r, -0.08, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - 0.5) * 0.9, R() * 6, (R() - 0.5) * 0.9)), V(1, 1, 1));
    parts.push([shaft.applyMatrix4(m), M.wood, false]);
    for (const f of [f1, f2, f3]) parts.push([f.applyMatrix4(m), M.clothBlack, false]);
  }
  return { parts };
}

/* 瓦礫：石塊・柱の輪切り・アーチの迫石。scale でまとまりの大きさ */
export function rubble(M, seed = 1, { radius = 1.0, count = 10, drums = 1, voussoirs = 1, low = false } = {}) {
  const R = rng(seed), parts = [];
  for (let i = 0; i < count; i++) {
    // 割れた切石（角張った塊。角を少し欠く）
    const s = (0.1 + Math.pow(R(), 2) * 0.34) * (low ? 0.6 : 1), a = R() * Math.PI * 2, r = Math.sqrt(R()) * radius;
    const g = new THREE.BoxGeometry(s * (1 + R()), s * (0.5 + R() * 0.5), s * (0.8 + R() * 0.6), 2, 2, 2); g.computeVertexNormals(); chip(g, s * 0.12, 2.5 / s, R() * 9);
    g.rotateY(R() * 6).rotateX((R() - 0.5) * 0.5).rotateZ((R() - 0.5) * 0.5).translate(Math.cos(a) * r, s * 0.25, Math.sin(a) * r);
    parts.push([g, R() < 0.5 ? M.rubble : M.dressed, { grime: 0.5, soot: 0.4, moss: 0.35, base: 0.75, seed: 76 }]);
    // 砂利
    if (i % 2 === 0) { const gr = new THREE.DodecahedronGeometry(0.04 + R() * 0.04, 0).translate(Math.cos(a + 1) * r * 1.1, 0.02, Math.sin(a + 1) * r * 1.1); parts.push([gr, M.rubble, { grime: 0.3, base: 0.6, moss: 0.2, seed: 79 }]); }
  }
  for (let i = 0; i < drums; i++) {
    const h = 0.35 + R() * 0.3, g = new THREE.CylinderGeometry(0.3, 0.3, h, 12, 2); g.computeVertexNormals(); chip(g, 0.035, 5, R() * 9);
    const lying = R() < 0.6;
    if (lying) g.rotateZ(Math.PI / 2).rotateY(R() * 6).translate((R() - 0.5) * radius, 0.28, (R() - 0.5) * radius);
    else g.rotateX((R() - 0.5) * 0.3).translate((R() - 0.5) * radius, h / 2 - 0.05, (R() - 0.5) * radius);
    parts.push([g, M.dressed, { grime: 0.6, soot: 0.3, moss: 0.4, seed: 77 }]);
  }
  for (let i = 0; i < voussoirs; i++) {
    const g = new THREE.BoxGeometry(0.5, 0.32, 0.45, 3, 2, 2); g.computeVertexNormals();
    const p = g.attributes.position; for (let k = 0; k < p.count; k++) p.setX(k, p.getX(k) * (1 - (p.getY(k) + 0.16) * 0.35)); // 楔形
    chip(g, 0.03, 5, R() * 9);
    g.rotateZ((R() - 0.5) * 1.2).rotateY(R() * 6).translate((R() - 0.5) * radius * 1.2, 0.14, (R() - 0.5) * radius * 1.2);
    parts.push([g, M.dressed, { grime: 0.6, soot: 0.3, moss: 0.35, seed: 78 }]);
  }
  return { parts, flames: [], embers: [], lights: [] };
}

/* 戦場の残骸の山：瓦礫＋剣・盾・兜・槍・矢を混ぜる */
export function battleDebris(M, seed = 1, { radius = 1.4, dense = 1 } = {}) {
  const R = rng(seed), out = rubble(M, seed, { radius, count: Math.round(8 * dense), drums: R() < 0.5 ? 1 : 0, voussoirs: 1, low: true });
  const put = (asset, x, y, z, rx, ry, rz) => { const m = new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(1, 1, 1)); for (const p of asset.parts) { p[0].applyMatrix4(m); out.parts.push(p); } };
  const rp = () => { const a = R() * 6.28, r = Math.sqrt(R()) * radius; return [Math.cos(a) * r, Math.sin(a) * r]; };
  for (let i = 0; i < Math.round(2 * dense); i++) { const [x, z] = rp(); put(shield(M, seed + i * 3, { kind: R() < 0.6 ? 'kite' : 'round', broken: R() < 0.4 }), x, 0.04, z, -Math.PI / 2 + (R() - 0.5) * 0.4, R() * 6, (R() - 0.5) * 0.3); }
  for (let i = 0; i < Math.round(1 + dense); i++) { const [x, z] = rp(); put(helmet(M, seed + i * 5), x, 0.12, z, Math.PI / 2 * (R() < 0.5 ? 1 : 0.2), R() * 6, (R() - 0.5) * 1.2); }
  for (let i = 0; i < Math.round(2 * dense); i++) { const [x, z] = rp(); put(sword(M, seed + i * 7, { kind: R() < 0.5 ? 'broken' : 'long' }), x, 0.03, z, Math.PI / 2, R() * 6, 0); }
  for (let i = 0; i < Math.round(1.5 * dense); i++) { const [x, z] = rp(); put(spear(M, seed + i * 11, { broken: 0.3 + R() * 0.4 }), x, 0.03, z, Math.PI / 2, R() * 6, 0); }
  if (R() < 0.6) { const [x, z] = rp(); put(arrows(M, seed + 13, { count: 5 + Math.floor(R() * 5) }), x, 0, z, 0, 0, 0); }
  return out;
}
