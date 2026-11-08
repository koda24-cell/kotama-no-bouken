// 形状の部品（岩・面取りした石材・管＝根や幹・回転体・葉など）
// 作った部品は「素材ごと」にまとめて1メッシュにする（描画回数を減らすため）。
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeNoise3, rng, clamp } from './noise.js';

// ───────── 部品の入れ物 ─────────
export class Parts {
  constructor(name, seed = 1) { this.name = name; this.list = []; this.rng = rng(seed); this.noise = makeNoise3(seed * 7 + 3); this.lights = []; this.markers = []; }
  add(geo, mat, matrix) {
    if (matrix) geo.applyMatrix4(matrix);
    this.list.push({ geo, mat });
    return geo;
  }
  // 発光物の位置（シーンでの点光源の配置に使う。GLB には extras として書き出す）
  light(pos, color, intensity = 1, range = 4) { this.lights.push({ pos: pos.toArray ? pos.toArray() : pos, color, intensity, range }); }
  marker(name, pos) { this.markers.push({ name, pos: pos.toArray ? pos.toArray() : pos }); }
}

export function M(pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ'));
  const s = typeof scl === 'number' ? [scl, scl, scl] : scl;
  return m.compose(new THREE.Vector3(...pos), q, new THREE.Vector3(...s));
}

// 必要な属性（position, normal, uv）だけに揃える
export function clean(g) {
  if (g.index) g = g.toNonIndexed();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) boxUV(g, 1);
  g.morphAttributes = {};
  return g;
}

// 素材ごとにまとめた Group を返す
export function build(parts, mats) {
  const byMat = new Map();
  for (const p of parts.list) {
    if (!byMat.has(p.mat)) byMat.set(p.mat, []);
    byMat.get(p.mat).push(clean(p.geo));
  }
  const group = new THREE.Group();
  group.name = parts.name;
  for (const [key, geos] of byMat) {
    let g = mergeGeometries(geos, false);
    g = mergeVertices(g, 1e-5);
    g.computeBoundingBox(); g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, mats(key));
    mesh.name = `${parts.name}__${key}`;
    group.add(mesh);
  }
  return group;
}

// ───────── UV ─────────
// 箱投影（法線の向きで XY/YZ/XZ のどれかに投影）。tile はテクスチャ1枚あたりのメートル数
export function boxUV(g, tile = 2, off = [0, 0, 0]) {
  const p = g.attributes.position, n = g.attributes.normal;
  if (!n) g.computeVertexNormals();
  const nn = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + off[0], y = p.getY(i) + off[1], z = p.getZ(i) + off[2];
    const ax = Math.abs(nn.getX(i)), ay = Math.abs(nn.getY(i)), az = Math.abs(nn.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z * Math.sign(nn.getX(i) || 1); v = -y; } else { u = -x * Math.sign(nn.getZ(i) || 1); v = -y; }
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// ───────── 岩 ─────────
// 正二十面体を細分化し、ノイズで凹凸をつける。flat: 底を平らにする高さ（-1..1）
export function rock(parts, { r = 1, detail = 4, sx = 1, sy = 0.75, sz = 1, rough = 0.28, crisp = 0.5, flat = -0.35, seed = 0, tile = 1.6 } = {}) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const N = parts.noise, p = g.attributes.position, v = new THREE.Vector3();
  const o = seed * 13.7;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const big = N.fbm(v.x * 0.9 + o, v.y * 0.9, v.z * 0.9, 3);
    const ridges = N.ridge(v.x * 2.2 + o, v.y * 2.2, v.z * 2.2, 3);
    const fine = N.fbm(v.x * 6 + o, v.y * 6, v.z * 6, 2);
    let d = 1 + big * rough + (ridges - 0.6) * rough * crisp * 0.6 + fine * 0.025;
    v.multiplyScalar(d);
    // 平らな面（切り出された面）をいくつか作る
    v.y = Math.max(v.y, flat + N(v.x * 3 + o, 0, v.z * 3) * 0.03);
    p.setXYZ(i, v.x * r * sx, v.y * r * sy, v.z * r * sz);
  }
  g.computeVertexNormals();
  boxUV(g, tile, [seed * 0.37, 0, seed * 0.71]);
  return g;
}

// ───────── 面取りした石材（切石・板・台座） ─────────
// 細分化した箱を角の丸い箱に変形し、角の欠けと表面の風化をノイズで加える
export function block(parts, w, h, d, { r = 0.04, seg = 0.12, chip = 0.5, wobble = 0.01, tile = 2, seed = 0 } = {}) {
  const sx = Math.max(1, Math.round(w / seg)), sy = Math.max(1, Math.round(h / seg)), sz = Math.max(1, Math.round(d / seg));
  let g = new THREE.BoxGeometry(w, h, d, sx, sy, sz);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const N = parts.noise, p = g.attributes.position;
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  const v = new THREE.Vector3(), c = new THREE.Vector3(), o = seed * 9.1;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz));
    const dir = v.clone().sub(c); const len = dir.length();
    if (len > 1e-6) dir.multiplyScalar(r / len);
    v.copy(c).add(dir);
    // 角に近いほど大きく欠ける
    const edgeness = clamp(1 - Math.min(hx - Math.abs(c.x), hy - Math.abs(c.y), hz - Math.abs(c.z)) / Math.max(0.05, Math.min(w, h, d) * 0.25));
    const n = N.fbm(v.x * 3 + o, v.y * 3, v.z * 3, 3);
    const nrm = v.clone().sub(new THREE.Vector3(0, 0, 0)).normalize();
    const inward = (Math.max(0, n) * chip * 0.12 * edgeness) + (N(v.x * 9 + o, v.y * 9, v.z * 9) * wobble);
    v.addScaledVector(dir.lengthSq() > 0 ? dir.clone().normalize() : nrm, -inward);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  boxUV(g, tile, [seed * 0.53, seed * 0.29, seed * 0.17]);
  return g;
}

// ───────── 管（根・幹・枝・蔓・鎖の芯） ─────────
// pts: 中心線の点列、radius(t): 0..1 の位置での半径、bark: 表面の溝の深さ
export function tube(parts, pts, radius, { radial = 12, perMeter = 6, bark = 0.12, twist = 0, tileU = 1, tileV = 1.2, flare = null, capStart = false, seed = 0, ridgeFreq = 5 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))), false, 'centripetal');
  const L = curve.getLength();
  const segs = Math.max(4, Math.round(L * perMeter));
  const frames = curve.computeFrenetFrames(segs, false);
  const N = parts.noise, o = seed * 3.3;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, c = curve.getPointAt(t);
    const nrm = frames.normals[i], bin = frames.binormals[i];
    const R = typeof radius === 'function' ? radius(t) : radius;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2 + twist * t;
      const ca = Math.cos(a), sa = Math.sin(a);
      // 樹皮の縦の溝（周方向に周期的、長さ方向にゆっくり変化）
      const gro = N.ridge(Math.cos(a) * ridgeFreq * 0.35 + o, Math.sin(a) * ridgeFreq * 0.35, t * L * 0.6, 3);
      const bump = N.fbm(ca * 2 + o, sa * 2, t * L * 1.3, 3);
      let rr = R * (1 + (gro - 0.65) * bark + bump * bark * 0.6);
      if (flare) rr *= 1 + flare(t, a);
      const x = c.x + rr * (ca * nrm.x + sa * bin.x), y = c.y + rr * (ca * nrm.y + sa * bin.y), z = c.z + rr * (ca * nrm.z + sa * bin.z);
      pos.push(x, y, z);
      uv.push((j / radial) * tileU * Math.max(1, Math.round(R * 6.28 / tileV)), (t * L) / tileV);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  fixSeamNormals(g, segs, radial);
  return g;
}

// 管の周方向の継ぎ目（最初と最後の列）の法線を揃える
function fixSeamNormals(g, segs, radial) {
  const n = g.attributes.normal;
  for (let i = 0; i <= segs; i++) {
    const a = i * (radial + 1), b = a + radial;
    const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b);
    const l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
  }
}

// 自然な曲線（始点・方向・長さ・曲がり具合）
export function wander(parts, start, dir, length, { steps = 6, bend = 0.35, gravity = 0, seed = 0, floorY = null } = {}) {
  const N = parts.noise, pts = [new THREE.Vector3(...start)];
  const d = new THREE.Vector3(...dir).normalize();
  const stepL = length / steps;
  for (let i = 1; i <= steps; i++) {
    const p = pts[i - 1].clone();
    d.x += N(p.x * 0.7 + seed, p.y * 0.7, p.z * 0.7) * bend;
    d.y += N(p.x * 0.7, p.y * 0.7 + seed, p.z * 0.7) * bend * 0.6 - gravity;
    d.z += N(p.x * 0.7, p.y * 0.7, p.z * 0.7 + seed) * bend;
    d.normalize();
    p.addScaledVector(d, stepL);
    if (floorY !== null && p.y < floorY) { p.y = floorY; d.y = Math.abs(d.y) * 0.2; }
    pts.push(p);
  }
  return pts;
}

// ───────── 回転体（柱・壺・キノコ・灯籠） ─────────
// prof: [[半径, 高さ], ...]（下から上へ）
export function lathe(parts, prof, { seg = 24, noise = 0.0, tile = 1.5, seed = 0, phi = Math.PI * 2, phiStart = 0 } = {}) {
  let g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg, phiStart, phi);
  if (noise > 0) {
    g.deleteAttribute('normal');
    const uvs = g.attributes.uv.clone();
    const N = parts.noise, p = g.attributes.position, v = new THREE.Vector3(), o = seed * 5.1;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const rr = Math.hypot(v.x, v.z);
      if (rr < 1e-4) continue;
      const k = 1 + N.fbm(v.x * 3 + o, v.y * 3, v.z * 3, 3) * noise;
      p.setXYZ(i, v.x * k, v.y + N(v.x * 4, v.y * 4 + o, v.z * 4) * noise * 0.2, v.z * k);
    }
    g.computeVertexNormals();
  }
  // UV を実寸に合わせる（u=周、v=高さ）
  const p = g.attributes.position, uv = g.attributes.uv;
  let maxR = 0; for (const [r] of prof) maxR = Math.max(maxR, r);
  const circ = Math.max(1, Math.round((maxR * Math.PI * 2) / tile));
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ, -p.getY(i) / tile);
  return g;
}

// ───────── 葉（シダの小葉・蔓の葉） ─────────
// 長さ l、幅 w、反り curl の細長い葉（両面）。基部が原点、+Y 方向に伸びる
export function leafBlade(l, w, { segs = 6, curl = 0.3, droop = 0.4 } = {}) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const width = w * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t * 0.3);
    const y = l * t, z = -droop * l * t * t;
    for (let j = 0; j <= 2; j++) {
      const s = j - 1;
      pos.push(s * width, y, z + Math.abs(s) * curl * width);
      uv.push(0.5 + s * 0.5, 1 - t);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < 2; j++) {
    const a = i * 3 + j, b = a + 3;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// 結晶（六角柱＋先端のとがり、少しゆがませる）
export function crystalShard(parts, len, rad, { sides = 6, tip = 0.35, seed = 0 } = {}) {
  const r = rng(seed + 11);
  const prof = [[rad * 0.7, -len * 0.08], [rad, 0], [rad * (0.85 + r() * 0.2), len * (1 - tip)], [0.0001, len]];
  let g = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), sides);
  g = g.toNonIndexed();
  const p = g.attributes.position;
  const kx = 0.8 + r() * 0.4, kz = 0.8 + r() * 0.4;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * kx, p.getY(i), p.getZ(i) * kz);
  g.computeVertexNormals(); // 平らな面（ファセット）にする
  boxUV(g, 0.6, [seed, 0, seed]);
  return g;
}

// 鎖（輪をつなげる）
export function chain(parts, a, b, { link = 0.09, thick = 0.018, sag = 0.15 } = {}) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const L = A.distanceTo(B), n = Math.max(2, Math.round(L / (link * 1.5)));
  const geos = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const p = A.clone().lerp(B, t); p.y -= Math.sin(Math.PI * t) * sag * L;
    const p2 = A.clone().lerp(B, t + 0.01); p2.y -= Math.sin(Math.PI * (t + 0.01)) * sag * L;
    const dir = p2.sub(p).normalize();
    const g = new THREE.TorusGeometry(link * 0.5, thick, 6, 10);
    g.scale(1, 1.5, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const q2 = new THREE.Quaternion().setFromAxisAngle(dir, (i % 2) * Math.PI / 2);
    g.applyQuaternion(q.premultiply(q2));
    g.translate(p.x, p.y, p.z);
    geos.push(boxUV(g, 0.3));
  }
  return mergeGeometries(geos.map((x) => x.toNonIndexed()));
}

// 置いた部品を地面（y=0）に沿うよう少し沈める等の小道具
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
