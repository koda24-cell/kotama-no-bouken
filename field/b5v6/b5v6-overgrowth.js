/* 5層 V6：植生（A13）— 遺構を覆う枯れたつる・根・苔、廃墟に咲く白い小花（エンドフィールドの「希望の差し色」）
 * 壁面のつる：帯状の繰形や窪みの縁から垂れる。床の根：壁際を這う。花：石の割れ目に小さく群れる。 */
import * as THREE from 'three';
import { sweep, rng } from './b5v6-geom.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ROUND = n => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; });

function leafQuad(p, n, s, R) {
  // 菱形の葉（2 三角形）。向きは壁から少し起きる
  const up = V(0, 1, 0), side = new THREE.Vector3().crossVectors(n, up).normalize(); if (side.lengthSq() < 0.1) side.set(1, 0, 0);
  const tip = p.clone().addScaledVector(up, -s * (0.6 + R() * 0.6)).addScaledVector(n, s * 0.5).addScaledVector(side, (R() - 0.5) * s);
  const l = p.clone().addScaledVector(side, -s * 0.35).addScaledVector(n, s * 0.15), r = p.clone().addScaledVector(side, s * 0.35).addScaledVector(n, s * 0.15);
  return [...p.toArray(), ...l.toArray(), ...tip.toArray(), ...p.toArray(), ...tip.toArray(), ...r.toArray()];
}

/* 壁面から垂れるつる。matrix は壁面（z=0、+z 通路）。y0 は垂れ始めの高さ */
export function wallVines(M, seed, { y0 = 5.3, count = 5, width = 3.2, maxLen = 4.2, leafy = 0.6 } = {}) {
  const R = rng(seed), parts = [], leaves = [];
  for (let i = 0; i < count; i++) {
    const x0 = (R() - 0.5) * width, L = 1.2 + R() * (maxLen - 1.2), pts = [];
    let x = x0, z = 0.08;
    for (let k = 0; k <= 14; k++) {
      const t = k / 14, y = y0 - t * L;
      x += (R() - 0.5) * 0.12; z = 0.05 + Math.sin(t * Math.PI) * 0.12 + R() * 0.03;
      pts.push(V(x, y, z));
    }
    const r = 0.007 + R() * 0.009;
    parts.push([sweep(pts, ROUND(5).map(([c, s]) => [c * r, s * r]), { closed: true, scale: t => 1 - t * 0.6 }), M.wood, { grime: 0, soot: 0.2, moss: 0.6, seed: 111 }]);
    if (R() < leafy) for (let k = 2; k < pts.length; k += 1) if (R() < 0.7) leaves.push(...leafQuad(pts[k], V(0, 0, 1), 0.07 + R() * 0.06, R));
    // 枝分かれ
    if (R() < 0.5) {
      const b = pts[4 + Math.floor(R() * 6)], bp = [b];
      for (let k = 1; k <= 6; k++) bp.push(b.clone().add(V((R() - 0.5) * 0.3 * k * 0.3, -k * 0.12, 0.04)));
      parts.push([sweep(bp, ROUND(4).map(([c, s]) => [c * r * 0.6, s * r * 0.6]), { closed: true }), M.wood, { grime: 0, soot: 0.2, moss: 0.6, seed: 112 }]);
    }
  }
  if (leaves.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(leaves, 3)); g.computeVertexNormals(); parts.push([g, M.leaf, { grime: 0, soot: 0, moss: 0.3, mottle: 0.6, seed: 113 }]); }
  return { parts, flames: [], embers: [], lights: [] };
}

/* 壁際を這う根（床と壁の境）。matrix は壁面 */
export function floorRoots(M, seed, { count = 4, width = 3.4 } = {}) {
  const R = rng(seed), parts = [];
  for (let i = 0; i < count; i++) {
    const x0 = (R() - 0.5) * width, pts = [];
    let x = x0, y = 0.6 + R() * 1.2;
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      if (t < 0.45) { pts.push(V(x, y * (1 - t / 0.45), 0.25 + Math.sin(t * 9) * 0.03)); }
      else { const u = (t - 0.45) / 0.55; pts.push(V(x + (R() - 0.5) * 0.3, 0.02 + Math.sin(u * 6) * 0.02, 0.25 + u * (0.5 + R() * 0.7))); }
      x += (R() - 0.5) * 0.18;
    }
    const r = 0.02 + R() * 0.03;
    parts.push([sweep(pts, ROUND(6).map(([c, s]) => [c * r, s * r]), { closed: true, scale: t => 1 - t * 0.75 }), M.wood, { grime: 0.3, soot: 0, moss: 0.5, base: 0.7, seed: 114 }]);
  }
  return { parts, flames: [], embers: [], lights: [] };
}

/* 石の割れ目に咲く白い小花の群れ（原点＝地面） */
export function pale_flowers(M, seed, { count = 14, radius = 0.45 } = {}) {
  const R = rng(seed), petals = [], stems = [];
  for (let i = 0; i < count; i++) {
    const a = R() * 6.28, r = Math.sqrt(R()) * radius, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.06 + R() * 0.14;
    stems.push(...[x, 0, z, x + 0.004, h, z, x - 0.004, h, z]);
    const s = 0.018 + R() * 0.012, rot = R() * 6;
    for (let p = 0; p < 5; p++) {
      const pa = rot + p / 5 * Math.PI * 2, px = x + Math.cos(pa) * s, pz = z + Math.sin(pa) * s;
      const qa = pa + 0.5, qx = x + Math.cos(qa) * s * 0.6, qz = z + Math.sin(qa) * s * 0.6;
      petals.push(x, h, z, px, h + 0.006, pz, qx, h + 0.004, qz);
    }
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(petals, 3)); pg.computeVertexNormals();
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(stems, 3)); sg.computeVertexNormals();
  return { parts: [[pg, M.flower, false], [sg, M.leaf, false]], flames: [], embers: [], lights: [] };
}
