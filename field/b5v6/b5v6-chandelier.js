/* 5層 V6：シャンデリア（A10）— 鍛鉄の 2 段の輪、S 字の腕、棘飾り、ろうそくの琥珀の炎、天井へ伸びる鎖
 * 落下版：床に傾いて転がり、輪が折れ、ろうそくが散らばる。原点＝吊り点の真下の輪の中心（hang=true）／床（fallen） */
import * as THREE from 'three';
import { sweep, lathe, rng } from './b5v6-geom.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ROUND = n => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; });
const rod = (pts, r = 0.02, n = 6) => sweep(pts, ROUND(n).map(([c, s]) => [c * r, s * r]), { closed: true });
const IW = { grime: 0, soot: 0.9, moss: 0, mottle: 0.3, seed: 101 };

function ring(r, y, t = 0.03, seg = 40, broken = null) {
  const pts = []; for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; if (broken && a > broken[0] && a < broken[1]) continue; pts.push(V(Math.cos(a) * r, y, Math.sin(a) * r)); }
  return sweep(pts, [[-t, -t * 0.7], [t, -t * 0.7], [t, t * 0.7], [-t, t * 0.7]], { up: V(0, 1, 0), closed: true });
}

export function chandelier(M, seed = 1, { radius = 1.2, chainTo = 6, tiers = 2, fallen = false, gold = false } = {}) {
  const R = rng(seed), parts = [], flames = [], k = radius / 1.2;
  const add = (g, m = M.iron, w = IW) => parts.push([g, m, w]);
  const broken = fallen ? [R() * 4, 0] : null; if (broken) broken[1] = broken[0] + 0.9;
  // 芯の飾り柱
  add(lathe([[0, -0.55], [0.06, -0.55], [0.1, -0.45], [0.05, -0.35], [0.08, -0.15], [0.12, -0.05], [0.07, 0.05], [0.05, 0.3], [0.09, 0.45], [0.04, 0.55], [0.06, 0.62], [0, 0.66]].map(([r, y]) => [r * k, y * k]), 10));
  add(new THREE.SphereGeometry(0.09 * k, 10, 8).translate(0, -0.62 * k, 0));
  const tierDefs = tiers === 2 ? [[radius, 0, 12], [radius * 0.58, 0.42 * k, 8]] : [[radius, 0, 12]];
  for (const [r, y, n] of tierDefs) {
    add(ring(r, y, 0.03 * k, 48, broken)); add(ring(r * 0.94, y - 0.09 * k, 0.018 * k, 40, broken));
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + (y > 0 ? Math.PI / n : 0), c = Math.cos(a), s = Math.sin(a);
      if (broken && a > broken[0] && a < broken[1]) continue;
      // S 字の腕（芯から輪へ）
      const arm = []; for (let t = 0; t <= 8; t++) { const u = t / 8; const rr = 0.1 * k + (r - 0.1 * k) * u; arm.push(V(c * rr, y - 0.25 * k * Math.sin(u * Math.PI) + 0.06 * k * Math.sin(u * Math.PI * 2), s * rr)); }
      add(rod(arm, 0.014 * k));
      // 受け皿・蝋燭・棘
      add(lathe([[0, 0], [0.055, 0], [0.065, 0.02], [0.03, 0.03], [0.022, 0.06], [0, 0.06]].map(([q, h]) => [q * k, h * k]), 8).translate(c * r, y + 0.03 * k, s * r));
      const ch = (0.1 + R() * 0.18) * k;
      if (!fallen || R() < 0.4) {
        add(new THREE.CylinderGeometry(0.02 * k, 0.022 * k, ch, 7).translate(c * r, y + 0.09 * k + ch / 2, s * r), M.wax, { grime: 0, soot: 0.2, moss: 0, base: 0.9, seed: 102 });
        if (!fallen && R() < 0.85) flames.push([c * r, y + 0.09 * k + ch, s * r, 0.11 * k, 1]);
      }
      const sp = new THREE.ConeGeometry(0.012 * k, 0.13 * k, 4).rotateX(Math.PI).translate(c * (r + 0.02), y - 0.1 * k, s * (r + 0.02));
      add(sp);
    }
  }
  // 鎖（輪をつなぐ 4 本＋天井への 1 本）
  const link = new THREE.TorusGeometry(0.04 * k, 0.01 * k, 3, 6);
  const chainLine = (a, b) => {
    const d = b.clone().sub(a), L = d.length(), n = Math.max(2, Math.floor(L / (0.075 * k))), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
    for (let i = 0; i < n; i++) {
      const g = link.clone().rotateY(i % 2 ? Math.PI / 2 : 0).rotateX(Math.PI / 2 * 0).applyQuaternion(q);
      const p = a.clone().addScaledVector(d, (i + 0.5) / n); g.translate(p.x, p.y, p.z); add(g);
    }
  };
  if (!fallen) {
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; chainLine(V(Math.cos(a) * radius * 0.96, 0.02, Math.sin(a) * radius * 0.96), V(0, 1.15 * k, 0)); }
    add(new THREE.TorusGeometry(0.08 * k, 0.018 * k, 6, 12).translate(0, 1.18 * k, 0));
    chainLine(V(0, 1.22 * k, 0), V(0, chainTo, 0));
  }
  link.dispose();
  if (gold) parts.forEach(p => { if (p[1] === M.iron) { p[1] = M.gold; p[2] = false; } });
  const lights = fallen ? [] : [[0, -0.1, 0, 0xffa24e, 2.0 * k, 7 * k]];
  return { parts, flames, embers: [], lights };
}

// 床に落ちたシャンデリア（傾き・折れた輪・散らばった蝋燭）
export function fallenChandelier(M, seed = 1) {
  const c = chandelier(M, seed, { radius: 1.1, fallen: true });
  const R = rng(seed + 5);
  const m = new THREE.Matrix4().compose(V(0, 0.42, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, R() * 6, 0.15)), V(1, 1, 1));
  c.parts.forEach(p => p[0].applyMatrix4(m));
  for (let i = 0; i < 6; i++) {
    const a = R() * 6.28, r = 1.2 + R() * 0.8;
    c.parts.push([new THREE.CylinderGeometry(0.02, 0.022, 0.12 + R() * 0.1, 7).rotateZ(Math.PI / 2).rotateY(R() * 6).translate(Math.cos(a) * r, 0.02, Math.sin(a) * r), M.wax, false]);
  }
  return c;
}
