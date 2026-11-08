// 複数の素材で使い回す、ひとまとまりの部品（苔の被覆・石積み壁・根・発光体など）
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { block, rock, tube, wander, lathe, leafBlade, crystalShard, boxUV, M, V } from './geo.js';
import { clamp, smooth } from './noise.js';

// 苔の被覆：上を向いた面だけを少し膨らませて複製する（苔は上面に積もる）
export function mossShell(P, geo, { up = 0.72, thick = 0.03, patch = 0.55, scale = 1.1, seed = 0 } = {}) {
  // 頂点ごとに「苔の厚み」を決め、縁では厚み0にして地の面へなめらかに沈める（ギザギザの縁を作らない）
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, N = P.noise;
  const out = [], uv = [];
  const wAt = (j) => {
    const x = p.getX(j), y = p.getY(j), z = p.getZ(j);
    const pn = N.fbm(x * scale + seed, y * scale, z * scale, 3);
    return smooth(up, up + 0.22, n.getY(j) + pn * patch);
  };
  for (let i = 0; i < p.count; i += 3) {
    const w = [wAt(i), wAt(i + 1), wAt(i + 2)];
    if (w[0] + w[1] + w[2] < 0.05) continue;
    for (let k = 0; k < 3; k++) {
      const j = i + k;
      const x = p.getX(j), y = p.getY(j), z = p.getZ(j);
      const t = thick * w[k] * (0.6 + 0.8 * clamp(N(x * 7 + seed, y * 7, z * 7) * 0.5 + 0.5)) + 0.003;
      out.push(x + n.getX(j) * t, y + n.getY(j) * t, z + n.getZ(j) * t);
      uv.push(x / 0.8, z / 0.8);
    }
  }
  if (!out.length) return null;
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  m.computeVertexNormals();
  boxUV(m, 0.8, [seed * 0.31, 0, seed * 0.17]); // 側面で縞にならないよう、面の向きに応じて投影
  return m;
}

// 部品を追加し、同時に苔の被覆も追加する
export function addMossy(P, geo, mat, opts = {}) {
  P.add(geo, mat);
  const m = mossShell(P, geo, opts);
  if (m) P.add(m, opts.mossMat || 'moss');
  return geo;
}

// 石積みの壁。原点は壁の下端中央、厚みは z = -d..0（内側の面が z=0、+Z を向く）
// broken: 上部の崩れ具合 0..1、missing: 欠けた石の割合
export function masonryWall(P, { w = 4, h = 4, d = 0.7, course = 0.5, len = 1.0, broken = 0, missing = 0, mat = 'stone_wall', mossy = true, seed = 0, x0 = 0, z0 = 0, top = null } = {}) {
  const R = P.rng, N = P.noise;
  const rows = Math.round(h / course);
  for (let r = 0; r < rows; r++) {
    const y = r * course;
    let x = -w / 2 + ((r % 2) ? -len * 0.5 : 0) + (R() - 0.5) * 0.1;
    while (x < w / 2 - 0.01) {
      let bl = len * (0.75 + R() * 0.5);
      const xa = Math.max(x, -w / 2), xb = Math.min(x + bl, w / 2);
      x += bl;
      const bw = xb - xa; if (bw < 0.12) continue;
      const cx = (xa + xb) / 2;
      // 崩れ：上に行くほど、ノイズに応じて石を抜く
      const decay = broken * smooth(0.25, 1, (y + course) / h) + N(cx * 0.8 + seed, y * 0.8, 0) * 0.35 * broken;
      const limit = top ? top(cx) : h;
      if (y + course > limit + 0.01) continue;
      if (decay > 0.45 || (R() < missing && r > 0 && r < rows - 1)) continue;
      const bh = course * (0.94 + R() * 0.04), bd = d * (0.9 + R() * 0.1);
      const g = block(P, bw - 0.02, bh - 0.02, bd, { r: 0.035 + R() * 0.03, seg: 0.11, chip: 0.6 + R() * 0.6, tile: 1.6, seed: seed + r * 17 + Math.round(cx * 7) });
      const tilt = (R() - 0.5) * 0.03 + (decay > 0.2 ? (R() - 0.5) * 0.12 : 0);
      g.applyMatrix4(M([x0 + cx, y + bh / 2, z0 - bd / 2 + (R() - 0.5) * 0.03 + (decay > 0.2 ? R() * 0.06 : 0)], [tilt * 0.4, (R() - 0.5) * 0.02, tilt]));
      // 苔は最上段と一部の石だけ（全段に載せると縞模様に見えるため）
      if (mossy && (r === rows - 1 || y + course * 2 > limit || decay > 0.2 || R() < 0.14)) addMossy(P, g, mat, { up: 0.55, thick: 0.03, seed: seed + r });
      else P.add(g, mat);
    }
  }
  // 壁の芯（石の隙間から向こうが透けないように、奥に暗い板）
  const core = new THREE.BoxGeometry(w - 0.1, h * (1 - broken * 0.5) - 0.1, d * 0.5);
  core.translate(x0, (h * (1 - broken * 0.5)) / 2, z0 - d * 0.5);
  P.add(boxUV(core.toNonIndexed(), 2), 'stone_dark');
}

// 地を這う根。start から dir の方向へ、地面に沿って沈みながら伸びる
export function groundRoot(P, start, dir, length, r0, { seed = 0, sink = 0.45, mat = 'root', bend = 0.55, perMeter = 5, radial = 10, branches = 2, depth = 1 } = {}) {
  // 地面に向かって潜り込み、その後は地表を這う（中心線を地面より少し下に保つ＝半分埋まる）
  const pts = wander(P, start, dir, length, { steps: Math.max(5, Math.round(length * 2.2)), bend, gravity: 0.32, seed, floorY: -r0 * sink });
  const g = tube(P, pts, (t) => r0 * (1 - Math.pow(t, 0.55) * 0.88) + 0.01, { radial, perMeter, bark: 0.1, seed, tileV: 0.9 });
  P.add(g, mat);
  if (depth > 0) for (let i = 0; i < branches; i++) {
    const k = 0.3 + 0.45 * ((i + 1) / (branches + 1));
    const p = pts[Math.min(pts.length - 1, Math.round(k * (pts.length - 1)))];
    const d = pts[pts.length - 1].clone().sub(pts[0]).normalize();
    const side = (i % 2 ? 1 : -1) * (0.7 + P.rng() * 0.5);
    const nd = [d.x * Math.cos(side) - d.z * Math.sin(side), -0.1, d.x * Math.sin(side) + d.z * Math.cos(side)];
    const rr = r0 * (1 - Math.pow(k, 0.55) * 0.88) * 0.55;
    if (rr > 0.025) groundRoot(P, [p.x, Math.max(p.y, 0), p.z], nd, length * 0.45, rr, { seed: seed * 3 + i + 1, sink, mat: 'root', bend, perMeter, radial: Math.max(6, radial - 4), branches: 1, depth: depth - 1 });
  }
  return pts;
}

// 垂れ下がる蔓（葉と発光する実つき）
export function hangingVine(P, top, length, { seed = 0, leaves = true, glow = true, r0 = 0.025, leafMat = 'leaf', glowMat = 'glow_core', sway = 0.25 } = {}) {
  const R = P.rng;
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push(V(top[0] + Math.sin(t * 3 + seed) * sway * t, top[1] - length * t, top[2] + Math.cos(t * 2.3 + seed) * sway * 0.6 * t));
  }
  P.add(tube(P, pts, (t) => r0 * (1 - t * 0.5), { radial: 6, perMeter: 6, bark: 0.05, seed }), 'root');
  const curve = new THREE.CatmullRomCurve3(pts);
  if (leaves) for (let i = 0; i < length * 5; i++) {
    const t = 0.05 + R() * 0.9, p = curve.getPointAt(t);
    const lf = leafBlade(0.12 + R() * 0.1, 0.04 + R() * 0.02, { segs: 4, droop: 0.6 });
    lf.applyMatrix4(M([p.x, p.y, p.z], [R() * 1.2 - 0.3, R() * Math.PI * 2, R() * 0.8 - 0.4]));
    P.add(lf, leafMat);
  }
  if (glow) {
    const n = Math.max(2, Math.round(length * 1.5));
    for (let i = 0; i < n; i++) {
      const t = 0.3 + (i / n) * 0.7, p = curve.getPointAt(Math.min(1, t));
      const s = new THREE.IcosahedronGeometry(0.035 + R() * 0.03, 1);
      s.translate(p.x + (R() - 0.5) * 0.05, p.y - 0.04, p.z + (R() - 0.5) * 0.05);
      P.add(s, glowMat);
    }
    const e = curve.getPointAt(1);
    P.light([e.x, e.y + length * 0.3, e.z], 0x7fe6ff, 0.6, 3);
  }
}

// 発光キノコ1本。傘の裏（ひだ）も作る
export function mushroom(P, pos, h, capR, { mat = 'glowcap', stemMat = 'bone', tilt = 0, yaw = 0, seed = 0 } = {}) {
  const stem = lathe(P, [[capR * 0.32, 0], [capR * 0.26, h * 0.2], [capR * 0.2, h * 0.7], [capR * 0.22, h]], { seg: 10, tile: 0.3, noise: 0.08, seed });
  const cap = lathe(P, [[0.0001, h + capR * 0.55], [capR * 0.55, h + capR * 0.45], [capR * 0.9, h + capR * 0.2], [capR, h - capR * 0.02], [capR * 0.92, h - capR * 0.08], [capR * 0.3, h - 0.0], [0.0001, h - 0.0]], { seg: 18, tile: capR * 2.2, noise: 0.06, seed: seed + 1 });
  const m = M(pos, [tilt, yaw, tilt * 0.5]);
  P.add(stem, stemMat, m); P.add(cap, mat, m);
}

// 結晶の群れ。base: 根元の位置
export function crystalCluster(P, base, count, size, { mat = 'crystal_cyan', spread = 0.35, seed = 0, color = 0x55d8ff } = {}) {
  const R = P.rng;
  for (let i = 0; i < count; i++) {
    const big = i === 0;
    const len = size * (big ? 1 : 0.35 + R() * 0.55), rad = len * (0.16 + R() * 0.06);
    const g = crystalShard(P, len, rad, { seed: seed + i, sides: R() < 0.5 ? 6 : 5 });
    const a = R() * Math.PI * 2, d = big ? 0 : spread * (0.4 + R() * 0.8);
    const tilt = big ? (R() - 0.5) * 0.25 : 0.25 + R() * 0.6;
    g.applyMatrix4(M([base[0] + Math.cos(a) * d, base[1] - 0.05, base[2] + Math.sin(a) * d], [tilt * Math.sin(a + 1.57), R() * 6.28, tilt * Math.cos(a)]));
    P.add(g, mat);
  }
  P.light([base[0], base[1] + size * 0.6, base[2]], color, 1.2, 4 + size * 2);
}

// 散らばる小石
export function pebbles(P, center, radius, n, { mat = 'stone_block', size = 0.12, seed = 0 } = {}) {
  const R = P.rng;
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * radius, s = size * (0.4 + R());
    const g = rock(P, { r: s, detail: 1, sy: 0.6, rough: 0.35, seed: seed + i, tile: 0.8 });
    g.translate(center[0] + Math.cos(a) * d, center[1] + s * 0.15, center[2] + Math.sin(a) * d);
    P.add(g, mat);
  }
}

// 炎（青白い炎・暖色の炎）。芯と外炎の2層
export function flame(P, pos, h, { core = 'glow_core', color = 0x7fe6ff, intensity = 1.6 } = {}) {
  const outer = lathe(P, [[0.0001, 0], [h * 0.22, h * 0.15], [h * 0.2, h * 0.4], [h * 0.1, h * 0.75], [0.0001, h]], { seg: 10, noise: 0.15, tile: 1 });
  const inner = lathe(P, [[0.0001, 0], [h * 0.12, h * 0.12], [h * 0.08, h * 0.4], [0.0001, h * 0.65]], { seg: 8, tile: 1 });
  P.add(outer, core, M(pos)); P.add(inner, core, M([pos[0], pos[1] + 0.01, pos[2]]));
  P.light([pos[0], pos[1] + h * 0.5, pos[2]], color, intensity, 6);
}

export { block, rock, tube, wander, lathe, leafBlade, crystalShard, boxUV, M, V };
