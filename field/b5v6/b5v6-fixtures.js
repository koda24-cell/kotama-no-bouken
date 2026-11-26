/* 5層 V6：灯りの器具 — 篝火台（紫の魔炎）・壁の松明・床置きの燭台群
 * 各関数は部品（ローカル座標）・炎・火の粉・点光源の位置を返す。配置は b5v6-layout.js が行う。 */
import * as THREE from 'three';
import { sweep, lathe, chip, rng } from './b5v6-geom.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ROUND = n => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; });
function rod(pts, r = 0.025, n = 6) { return sweep(pts, ROUND(n).map(([c, s]) => [c * r, s * r]), { closed: true }); }

// 篝火台：鍛鉄の三脚と浅い鉢。鉢の中に燃えさしと紫の炎
export function brazier(M, seed = 1, { scale = 1, tipped = false, holy = false } = {}) {
  const R = rng(seed), parts = [], k = scale;
  const bowl = lathe([[0, 0], [0.12, 0], [0.34, 0.08], [0.46, 0.2], [0.5, 0.28], [0.47, 0.3], [0.42, 0.22], [0.3, 0.12], [0, 0.1]].map(([r, y]) => [r * k, y * k]), 16).translate(0, 0.95 * k, 0);
  parts.push([bowl, M.iron, { grime: 0, soot: 1.2, moss: 0, seed: 41 }]);
  // 縁の飾り（棘）
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, sp = new THREE.ConeGeometry(0.03 * k, 0.16 * k, 5).translate(0, 0.08 * k, 0);
    sp.rotateZ(-0.5).rotateY(-a).translate(Math.cos(a) * 0.47 * k, 1.24 * k, Math.sin(a) * 0.47 * k);
    parts.push([sp, M.iron, { grime: 0, soot: 0.8, moss: 0, seed: 42 }]);
  }
  // 三脚（外へ反る）
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + 0.3, c = Math.cos(a), s = Math.sin(a), pts = [];
    for (let t = 0; t <= 8; t++) { const u = t / 8; pts.push(V(c * (0.12 + 0.28 * u + 0.08 * Math.sin(u * Math.PI)) * k, (1.0 - u * 1.0) * k, s * (0.12 + 0.28 * u + 0.08 * Math.sin(u * Math.PI)) * k)); }
    parts.push([rod(pts, 0.032 * k), M.iron, { grime: 0.4, soot: 0.6, moss: 0.1, seed: 43 }]);
    const foot = new THREE.SphereGeometry(0.05 * k, 6, 4).translate(c * 0.4 * k, 0.03 * k, s * 0.4 * k);
    parts.push([foot, M.iron, { grime: 0.4, soot: 0.3, moss: 0.1, seed: 44 }]);
  }
  const ring = new THREE.TorusGeometry(0.26 * k, 0.02 * k, 6, 18).rotateX(Math.PI / 2).translate(0, 0.62 * k, 0);
  parts.push([ring, M.iron, { grime: 0, soot: 0.6, moss: 0, seed: 45 }]);
  // 燃えさし（暗い石＋紫の熾火）
  for (let i = 0; i < 7; i++) {
    const r = new THREE.DodecahedronGeometry((0.07 + R() * 0.06) * k, 0).translate((R() - 0.5) * 0.45 * k, 1.12 * k, (R() - 0.5) * 0.45 * k);
    parts.push([r, i % 3 ? M.rubble : M.rune, { grime: 0, soot: 1.5, moss: 0, base: 0.5, seed: 46 }]);
  }
  if (holy) parts.forEach(p => { if (p[1] === M.iron) p[1] = M.gold; });
  const pal = holy ? 1 : 0;
  return { parts, flames: [[0, 1.12 * k, 0, 0.85 * k, pal], [0.12 * k, 1.1 * k, 0.05 * k, 0.5 * k, pal], [-0.1 * k, 1.1 * k, -0.08 * k, 0.55 * k, pal]], embers: holy ? [] : [[0, 1.4 * k, 0, 10, 0.18 * k, 2.4 * k]], lights: [[0, 1.7 * k, 0, holy ? 0xffc27a : 0x8c62f0, 3.2, 6.5]] };
}

// 壁の松明（壁面から張り出す腕金と杯）。ローカル +z が通路側、z=0 が壁面
export function wallTorch(M, seed = 1, { palette = 0 } = {}) {
  const parts = [];
  const plate = new THREE.BoxGeometry(0.22, 0.42, 0.04, 2, 3, 1).translate(0, 2.25, 0.02);
  parts.push([plate, M.iron, { grime: 0, soot: 1, moss: 0, seed: 51 }]);
  const arm = rod([V(0, 2.18, 0.03), V(0, 2.2, 0.2), V(0, 2.32, 0.34), V(0, 2.45, 0.4)], 0.025);
  parts.push([arm, M.iron, { grime: 0, soot: 1, moss: 0, seed: 52 }]);
  const brace = rod([V(0, 1.98, 0.03), V(0, 2.12, 0.2), V(0, 2.3, 0.33)], 0.018);
  parts.push([brace, M.iron, { grime: 0, soot: 1, moss: 0, seed: 52 }]);
  const cup = lathe([[0, 0], [0.05, 0], [0.12, 0.1], [0.14, 0.18], [0.12, 0.19], [0.1, 0.12], [0, 0.1]], 10).translate(0, 2.42, 0.4);
  parts.push([cup, M.iron, { grime: 0, soot: 1.4, moss: 0, seed: 53 }]);
  return { parts, flames: [[0, 2.6, 0.4, 0.55, palette]], embers: [[0, 2.8, 0.4, 4, 0.08, 1.4]], lights: [[0, 2.7, 0.55, palette === 1 ? 0xd88a52 : 0x8a6ad8, 1.6, 4.8]],
    soot: { y0: 2.6, y1: 4.6, z: 0.002 } };
}

// 床置きの燭台群（ろうそくの溶けた蝋と高さ違い）。祭壇棚や像の足元に
export function candles(M, seed = 1, { count = 7, radius = 0.35, base = 0 } = {}) {
  const R = rng(seed), parts = [], flames = [];
  // 溶けて広がった蝋だまり
  const pool = new THREE.CylinderGeometry(radius * 1.1, radius * 1.25, 0.03, 18, 1).translate(0, base + 0.015, 0);
  parts.push([pool, M.wax, { grime: 0, soot: 0.3, moss: 0, base: 0.8, seed: 61 }]);
  for (let i = 0; i < count; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * radius, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = 0.08 + R() * R() * 0.45, w = 0.025 + R() * 0.025;
    const c = lathe([[0, 0], [w * 1.6, 0], [w * 1.2, 0.02], [w, 0.05], [w, h - 0.01], [w * 0.8, h], [0, h]], 8).translate(x, base, z);
    parts.push([c, M.wax, { grime: 0, soot: 0.25, moss: 0, base: 0.9, seed: 62 }]);
    // 垂れた蝋
    if (R() < 0.6) { const d = new THREE.CapsuleGeometry(w * 0.35, h * 0.4, 2, 5).translate(x + w * 0.9, base + h * 0.55, z); parts.push([d, M.wax, false]); }
    if (R() < 0.82) flames.push([x, base + h, z, 0.09 + w * 1.4, 1]);
  }
  return { parts, flames, embers: [], lights: [[0, base + 0.5, 0, 0xd8945a, 0.8, 3.0]] };
}

// 倒れた篝火台（戦場跡の小物）
export function fallenBrazier(M, seed = 1) {
  const b = brazier(M, seed, { scale: 0.9 });
  const m = new THREE.Matrix4().makeRotationZ(Math.PI / 2 - 0.25).setPosition(0.9, 0.3, 0);
  b.parts.forEach(p => p[0].applyMatrix4(m));
  return { parts: b.parts, flames: [], embers: [], lights: [] };
}

// 金の大燭台（魔王の間・参道）：細い柱に 3 段 7 本のろうそく
export function candelabrum(M, seed = 1, { height = 2.3 } = {}) {
  const parts = [], flames = [], h = height;
  parts.push([lathe([[0, 0], [0.26, 0], [0.24, 0.06], [0.12, 0.12], [0.06, 0.3], [0.045, h * 0.5], [0.07, h * 0.52], [0.04, h * 0.56], [0.035, h - 0.1], [0.06, h - 0.06], [0, h - 0.05]], 10), M.gold, false]);
  const arms = [[0, h + 0.02, 0]];
  for (const [r, y, n] of [[0.32, h - 0.32, 2], [0.5, h - 0.55, 4]]) for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (n === 2 ? Math.PI / 2 : Math.PI / 4), x = Math.cos(a) * r, z = Math.sin(a) * r;
    parts.push([rod([V(0, y - 0.05, 0), V(x * 0.5, y - 0.12, z * 0.5), V(x, y, z)], 0.014), M.gold, false]);
    arms.push([x, y + 0.02, z]);
  }
  for (const [x, y, z] of arms) {
    parts.push([lathe([[0, 0], [0.05, 0], [0.06, 0.02], [0.03, 0.03], [0, 0.03]], 8).translate(x, y, z), M.gold, false]);
    const ch = 0.12 + Math.abs(Math.sin(x * 9 + z * 7)) * 0.14;
    parts.push([new THREE.CylinderGeometry(0.02, 0.022, ch, 7).translate(x, y + 0.03 + ch / 2, z), M.wax, false]);
    flames.push([x, y + 0.03 + ch, z, 0.12, 1]);
  }
  return { parts, flames, embers: [], lights: [[0, h, 0, 0xffc47e, 1.4, 4.5]] };
}
