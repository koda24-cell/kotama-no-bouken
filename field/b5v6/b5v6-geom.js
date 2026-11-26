/* 5層 V6：形状の共通処理
 * ・prep：属性をそろえる（非インデックス・position/normal/uv/color）
 * ・boxUV：面の向きごとに世界座標（m）で UV を振る（モジュール間の継ぎ目が出ない）
 * ・weather：頂点カラーで経年の汚れ（床際の泥・すす・苔・まだら）
 * ・Bucket：材質×区画ごとに結合して描画呼び出しを減らす（区画単位で視錐台カリングが効く） */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---- 決定的な乱数・ノイズ
export function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function h3(x, y, z) { let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const s = t => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), L(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v),
           L(L(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), L(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v), w);
}
export function fbm(x, y, z, oct = 4) { let a = 0, f = 1, amp = 0.5; for (let i = 0; i < oct; i++) { a += amp * vnoise(x * f, y * f, z * f); f *= 2.03; amp *= 0.5; } return a / (1 - Math.pow(0.5, oct)); }

export function prep(geo) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count;
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.attributes.color) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  g.morphAttributes = {};
  return g;
}

// 面ごとの箱投影 UV（世界座標の m 単位。材質側の repeat で周期を決める）
export function boxUV(g, ox = 0, oy = 0, oz = 0) {
  const p = g.attributes.position, uv = g.attributes.uv, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.subVectors(c, b).cross(a.clone().sub(b)).normalize();
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const x = p.getX(i + k) + ox, y = p.getY(i + k) + oy, z = p.getZ(i + k) + oz;
      if (ay >= ax && ay >= az) uv.setXY(i + k, x, z);
      else if (ax >= az) uv.setXY(i + k, z * Math.sign(n.x || 1), y);
      else uv.setXY(i + k, -x * Math.sign(n.z || 1), y);
    }
  }
  uv.needsUpdate = true;
  return g;
}

// 円筒・旋盤形状向け：周方向×高さで UV
export function cylUV(g, cx = 0, cz = 0, radius = 0.3) {
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ang = Math.atan2(p.getZ(i) - cz, p.getX(i) - cx);
    uv.setXY(i, ang * radius, p.getY(i));
  }
  // 継ぎ目をまたぐ三角形の折り返しを直す
  for (let i = 0; i < p.count; i += 3) {
    const u0 = uv.getX(i), u1 = uv.getX(i + 1), u2 = uv.getX(i + 2), span = Math.PI * radius;
    const mx = Math.max(u0, u1, u2), mn = Math.min(u0, u1, u2);
    if (mx - mn > span) for (let k = 0; k < 3; k++) if (uv.getX(i + k) < 0) uv.setX(i + k, uv.getX(i + k) + 2 * span);
  }
  uv.needsUpdate = true; return g;
}

/* 経年の汚れ。世界座標で評価する（結合前に applyMatrix4 しておく）
 * opts: grime 床際の泥（m）, soot すす量, moss 苔量, tint 基本色 */
const MOSS = new THREE.Color(0x5d6648), GRIME = new THREE.Color(0x3a3440), SOOT = new THREE.Color(0x16131c);
export function weather(g, { grime = 0.9, soot = 0.25, moss = 0.2, base = 1, mottle = 0.22, floorY = 0, seed = 1, joints = 0, edgeAO = 0 } = {}) {
  const p = g.attributes.position, nrm = g.attributes.normal, col = g.attributes.color, c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ny = nrm.getY(i);
    const n1 = fbm(x * 0.55 + seed, y * 0.55, z * 0.55, 4), n2 = vnoise(x * 2.3, y * 2.3 + seed, z * 2.3);
    let r = base * (1 - mottle * 0.5 + mottle * n1);
    // 石積みの目地（円柱の輪切り）
    if (joints > 0) { const f = ((y - floorY) / joints) % 1; if (f < 0.035 || f > 0.985) r *= 0.45; }
    // 下向きの面ほど暗く（簡易な遮蔽）
    if (edgeAO > 0 && ny < -0.3) r *= 1 - edgeAO * Math.min(1, -ny);
    c.setRGB(r, r, r);
    // 床際の泥と湿り
    const gy = THREE.MathUtils.clamp(1 - (y - floorY) / Math.max(0.01, grime), 0, 1);
    if (gy > 0) c.lerp(GRIME, gy * gy * (0.55 + 0.35 * n2));
    // 苔：上向きの面と床際、ノイズでまだらに
    const mm = moss * THREE.MathUtils.smoothstep(n1 + (ny > 0.6 ? 0.25 : 0) + gy * 0.2, 0.55, 0.85);
    if (mm > 0) c.lerp(MOSS, Math.min(0.75, mm));
    // すす：縦の筋（上ほど濃い）
    const streak = Math.pow(vnoise(x * 3.1 + z * 3.1, 0, seed), 3) * THREE.MathUtils.clamp((y - floorY - 1.5) / 6, 0, 1);
    if (soot > 0) c.lerp(SOOT, Math.min(0.8, soot * (streak * 1.6 + n2 * 0.3)));
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
  return g;
}

// 頂点の押し出しで角を欠く（面の外向きノイズ）。細分化されたジオメトリ向け
export function chip(g, amount = 0.05, freq = 2.2, seed = 0) {
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = (fbm(x * freq + seed, y * freq, z * freq, 3) - 0.5) * 2 * amount;
    p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
  }
  p.needsUpdate = true; return g;
}

// 材質×区画ごとに結合
export class Bucket {
  constructor(chunk = 12) { this.chunk = chunk; this.map = new Map(); }
  // opts: matrix（配置）, uv:'box'|'keep', wx（weather の設定、false で無し）
  add(geo, material, { matrix = null, uv = 'box', wx = {} } = {}) {
    let g = prep(geo);
    if (matrix) g.applyMatrix4(matrix);
    if (uv === 'box') boxUV(g);
    if (wx) weather(g, wx);
    g.computeBoundingBox();
    const c = g.boundingBox.getCenter(new THREE.Vector3());
    const key = material.uuid + '|' + Math.floor(c.x / this.chunk) + ',' + Math.floor(c.z / this.chunk) + (material.transparent ? '|t' : '');
    if (!this.map.has(key)) this.map.set(key, { material, geos: [] });
    this.map.get(key).geos.push(g);
    return g;
  }
  build(parent, name = 'b5v6') {
    const out = [];
    for (const { material, geos } of this.map.values()) {
      const merged = mergeGeometries(geos, false); geos.forEach(g => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const m = new THREE.Mesh(merged, material); m.name = name + ':' + material.name; m.matrixAutoUpdate = false; m.updateMatrix();
      parent.add(m); out.push(m);
    }
    this.map.clear();
    return out;
  }
}

// 尖頭アーチの高さ関数（t ∈ [-1,1]、端で 0、中央で 1）。pointedness 0=半円 1=正三角アーチ寄り
export function pointedArch(t, pointed = 0.55) {
  const a = Math.abs(t);
  const r = 1 + pointed;                 // 円弧の半径（半スパン=1 に対して）
  const cx = pointed;                    // 中心は反対側にずれる
  const yMax = Math.sqrt(r * r - cx * cx);
  return Math.sqrt(Math.max(0, r * r - (a + cx) * (a + cx))) / yMax;
}

// 尖頭アーチ形状の 2D 輪郭（幅 w、起拱点高さ h0、頂点 h1）。Shape 用の点列
export function archOutline(w, h0, h1, seg = 16, pointed = 0.55) {
  const pts = [new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0)];
  for (let i = 0; i <= seg; i++) { const t = 1 - (i / seg) * 2; pts.push(new THREE.Vector2(t * w / 2, h0 + (h1 - h0) * pointedArch(t, pointed))); }
  return pts;
}

/* 断面 profile（[x,y] の配列、x=横 y=上）を 3D 曲線 pts に沿って掃引する。closed=断面を閉じる。
 * up は断面の「上」の基準（曲線とほぼ平行にならない向き） */
export function sweep(pts, profile, { closed = true, up = new THREE.Vector3(0, 1, 0), scale = null, caps = true } = {}) {
  const pos = [], np = profile.length, T = new THREE.Vector3(), S = new THREE.Vector3(), U = new THREE.Vector3();
  const rings = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    T.subVectors(b, a).normalize();
    S.crossVectors(T, up); if (S.lengthSq() < 1e-6) S.set(1, 0, 0); S.normalize();
    U.crossVectors(S, T).normalize();
    const k = scale ? scale(i / (pts.length - 1)) : 1;
    rings.push(profile.map(([x, y]) => pts[i].clone().addScaledVector(S, x * k).addScaledVector(U, y * k)));
  }
  // 側面：リングの頂点を共有した索引付き形状（滑らかな法線）。角の立った断面は hard=true の頂点を複製
  const verts = [], idx = [];
  for (const ring of rings) for (const v of ring) verts.push(v.x, v.y, v.z);
  const segs = closed ? np : np - 1;
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < segs; j++) {
    const j2 = (j + 1) % np, a = i * np + j, b = (i + 1) * np + j, c = (i + 1) * np + j2, d = i * np + j2;
    idx.push(a, b, c, a, c, d);
  }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setIndex(idx); g.computeVertexNormals();
  g = g.toNonIndexed();
  if (caps && closed) {
    const capPos = [];
    for (const [ring, flip] of [[rings[0], true], [rings[rings.length - 1], false]]) {
      const c = ring.reduce((s, v) => s.add(v), new THREE.Vector3()).multiplyScalar(1 / np);
      for (let j = 0; j < np; j++) { const a = ring[j], b = ring[(j + 1) % np]; if (flip) capPos.push(...c.toArray(), ...b.toArray(), ...a.toArray()); else capPos.push(...c.toArray(), ...a.toArray(), ...b.toArray()); }
    }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(capPos, 3)); cg.computeVertexNormals();
    const m = mergeGeometries([g, cg]); g.dispose(); cg.dispose(); g = m;
  }
  return g;
}

// 掃引の向き：断面の外向きが正しくなるよう、反時計回りの断面を使う。よく使う断面
export const PROFILES = {
  // リブ：面取りした縦長の断面（下に細い玉縁）
  rib: [[-0.13, 0.12], [-0.13, -0.08], [-0.07, -0.2], [0, -0.24], [0.07, -0.2], [0.13, -0.08], [0.13, 0.12]].reverse(),
  // 帯状の繰形（壁に付く。x=壁から手前, y=上）
  stringCourse: [[0, 0.22], [0.06, 0.22], [0.16, 0.12], [0.16, 0.06], [0.1, 0.02], [0.1, -0.04], [0, -0.06]],
  plinth: [[0, 0.78], [0.08, 0.78], [0.1, 0.7], [0.18, 0.62], [0.18, 0.42], [0.24, 0.36], [0.28, 0.2], [0.28, 0], [0, 0]],
  archMould: [[-0.16, 0], [-0.16, 0.12], [-0.08, 0.2], [0.08, 0.2], [0.16, 0.12], [0.16, 0]],
};
export function lathe(points, segs = 12) { return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs); }
