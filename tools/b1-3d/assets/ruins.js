// 遺跡の構造物（壁・柱・アーチ・床・階段・瓦礫・石棺・祭壇・像・橋・井戸・灯籠）
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, rock, lathe, block, boxUV, M, V, wander } from '../lib/geo.js';
import { addMossy, masonryWall, groundRoot, hangingVine, mushroom, crystalCluster, pebbles, flame } from '../lib/kit.js';
import { smooth, clamp } from '../lib/noise.js';

const GPT = 'GPT試作40点（名称・用途）を作り直し';

// 溝彫りの円柱。break: 上端を折れた形にする深さ（0 で平ら）
export function column(P, { r = 0.42, h = 4, flutes = 16, flute = 0.035, brk = 0, seed = 0, taper = 0.08 } = {}) {
  const radial = flutes * 3, hs = Math.max(8, Math.round(h * 5));
  let g = new THREE.CylinderGeometry(r * (1 - taper), r, h, radial, hs, false);
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g);
  g.translate(0, h / 2, 0);
  const p = g.attributes.position, N = P.noise, o = seed * 2.7;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const rr = Math.hypot(x, z), a = Math.atan2(z, x);
    if (rr > 1e-4) {
      const fl = 1 - flute / r * Math.pow(Math.max(0, Math.cos(a * flutes)), 2) * (y > 0.02 && y < h - 0.02 ? 1 : 0.4);
      const wear = 1 + N.fbm(x * 3 + o, y * 2, z * 3, 3) * 0.025 - Math.max(0, N(x * 5 + o, y * 5, z * 5)) * 0.04;
      x *= fl * wear; z *= fl * wear;
    }
    if (brk > 0 && y > h - brk * 1.5) {
      const cut = h - brk * (0.55 + 0.45 * (N(x * 2.2 + o, 0, z * 2.2) * 0.5 + 0.5)) - Math.max(0, Math.sin(a * 2 + seed)) * brk * 0.4;
      if (y > cut) y = cut + N(x * 9, y, z * 9) * 0.03;
    }
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  // 円筒の UV（u=周、v=高さ）。上下の蓋は平面投影
  const uv = new Float32Array(p.count * 2), nn = g.attributes.normal, circ = Math.max(1, Math.round(r * Math.PI * 2 / 1.2));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (Math.abs(nn.getY(i)) > 0.8) { uv[i * 2] = x / 1.2; uv[i * 2 + 1] = z / 1.2; }
    else { uv[i * 2] = (Math.atan2(z, x) / (Math.PI * 2) + 0.5) * circ; uv[i * 2 + 1] = -y / 1.2; }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

export default {
  mossed_ruin_wall: {
    dir: 'props', cat: 'ruins', origin: GPT, tex: 512, pivot: 'as-built',
    name: '苔むした遺跡の壁', desc: '幅4m・高さ約3.5mの石積み壁。上部が崩れ、上面と目地に苔。原点＝内側の面の下端中央（+Z が内側）。',
    build(P) {
      masonryWall(P, { w: 4, h: 3.5, d: 0.7, broken: 0.55, missing: 0.04, seed: 3, mat: 'stone_wall' });
      pebbles(P, [0, 0, 0.6], 1.5, 8, { seed: 2 });
      hangingVine(P, [0.9, 2.6, 0.08], 1.6, { seed: 4, glow: false });
    },
  },

  root_choked_wall: {
    dir: 'props', cat: 'ruins', origin: GPT, tex: 512, pivot: 'as-built',
    name: '根に覆われた壁', desc: '石積み壁を太い根が締め付けるように覆う（幅4m・高さ4m）。巨木の近くの壁や行き止まりに。原点＝内側の面の下端中央。',
    build(P) {
      const R = P.rng;
      masonryWall(P, { w: 4, h: 4, d: 0.7, broken: 0.25, seed: 9, mat: 'stone_wall_mossy' });
      for (let i = 0; i < 6; i++) {
        const x0 = -1.8 + R() * 3.6;
        const pts = [V(x0 + (R() - 0.5), 4.4, -0.2), V(x0 + (R() - 0.5) * 1.2, 3.2, 0.12), V(x0 + (R() - 0.5) * 1.4, 2.0, 0.16), V(x0 + (R() - 0.5) * 1.6, 0.9, 0.14), V(x0 + (R() - 0.5) * 2, 0.0, 0.35)];
        P.add(tube(P, pts, (t) => (0.16 + R() * 0.06) * (1 - t * 0.35), { radial: 10, perMeter: 5, bark: 0.12, seed: i }), i < 2 ? 'bark' : 'root');
      }
      for (let i = 0; i < 5; i++) groundRoot(P, [-1.8 + i * 0.9, 0.15, 0.3], [(R() - 0.5), -0.2, 1], 1 + R(), 0.1, { seed: 20 + i, branches: 1 });
      hangingVine(P, [-0.5, 3.9, 0.2], 2.2, { seed: 7 }); hangingVine(P, [1.2, 3.7, 0.2], 1.6, { seed: 9 });
    },
  },

  ruined_stone_pillar: {
    dir: 'props', cat: 'ruins', origin: GPT, tex: 512,
    name: '崩れた遺跡の柱', desc: '溝彫りの円柱（高さ約3.4m）。上端は折れ、台座は欠け、足元に落ちた柱頭。上面に苔、蔦が絡む。',
    build(P) {
      const R = P.rng;
      const base = block(P, 1.25, 0.45, 1.25, { r: 0.05, chip: 1.2, seed: 1 }); base.translate(0, 0.225, 0); addMossy(P, base, 'stone_block', { up: 0.6 });
      const torus = lathe(P, [[0.5, 0.45], [0.55, 0.52], [0.52, 0.6], [0.46, 0.64]], { seg: 32, noise: 0.03, tile: 1 }); P.add(torus, 'stone_block');
      const col = column(P, { h: 3.0, brk: 0.5, seed: 2 }); col.translate(0, 0.62, 0); addMossy(P, col, 'stone_pale', { up: 0.55, thick: 0.03 });
      // 落ちた柱頭と柱の破片
      const cap = block(P, 1.0, 0.35, 1.0, { r: 0.06, chip: 1.4, seed: 5 }); cap.applyMatrix4(M([1.1, 0.25, 0.7], [0.25, 0.6, 0.35])); addMossy(P, cap, 'stone_block', { up: 0.5 });
      const frag = column(P, { h: 0.9, brk: 0.3, seed: 7 }); frag.applyMatrix4(M([-1.0, 0.36, 0.5], [0, 0.4, Math.PI / 2])); addMossy(P, frag, 'stone_pale', { up: 0.5 });
      // 蔦（柱に巻き付く）
      const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20, a = t * Math.PI * 3.2; pts.push(V(Math.cos(a) * 0.45, 0.5 + t * 2.6, Math.sin(a) * 0.45)); }
      P.add(tube(P, pts, 0.025, { radial: 6, bark: 0.05 }), 'root');
      pebbles(P, [0, 0, 0], 1.6, 10, { seed: 4 });
    },
  },

  ruin_archway: {
    dir: 'props', cat: 'ruins', origin: GPT, tex: 512,
    name: '遺跡のアーチ', desc: '幅約4.4m・高さ約5mの石造アーチ。迫石を1つずつ組み、要石に青く光る紋。片側の迫石が1つ抜け落ちている。',
    build(P) {
      const R = P.rng;
      const span = 1.75, rise = 3.0;
      for (const s of [-1, 1]) {
        const pl = block(P, 0.9, 0.4, 0.9, { r: 0.05, chip: 1, seed: s + 3 }); pl.translate(s * 2.05, 0.2, 0); addMossy(P, pl, 'stone_block', { up: 0.6 });
        for (let k = 0; k < 5; k++) {
          const b = block(P, 0.7, 0.52, 0.75, { r: 0.04, chip: 0.8, seed: k * 3 + (s > 0 ? 50 : 0) });
          b.applyMatrix4(M([s * 2.05 + (R() - 0.5) * 0.03, 0.4 + 0.26 + k * 0.52, 0], [0, (R() - 0.5) * 0.04, 0])); addMossy(P, b, 'stone_wall', { up: 0.6 });
        }
      }
      const n = 11;
      for (let k = 0; k < n; k++) {
        if (k === 2) continue; // 抜け落ちた迫石
        const a0 = Math.PI * (k / n), a1 = Math.PI * ((k + 1) / n), am = (a0 + a1) / 2;
        const len = 0.62, wdt = (span + 0.35) * Math.PI / n * 0.96;
        const key = k === Math.floor(n / 2);
        const b = block(P, wdt, len * (key ? 1.25 : 1), 0.78 + (key ? 0.06 : 0), { r: 0.035, chip: 0.9, seed: 80 + k });
        const rr = span + len / 2;
        b.applyMatrix4(M([-Math.cos(am) * (rr + 0.3), 3.0 + Math.sin(am) * rr * (rise / 3.0) * 0.62, 0], [0, 0, am - Math.PI / 2]));
        addMossy(P, b, key ? 'rune_stone' : 'stone_wall', { up: 0.5, thick: 0.03 });
        if (key) P.light([0, 4.6, 0.6], 0x5fe0ff, 0.8, 4);
      }
      // 落ちた迫石
      const fb = block(P, 0.6, 0.62, 0.78, { r: 0.04, chip: 1.6, seed: 99 }); fb.applyMatrix4(M([-1.3, 0.31, 1.1], [0.1, 0.7, 0.2])); addMossy(P, fb, 'stone_wall', { up: 0.5 });
      hangingVine(P, [0.6, 4.3, 0.42], 1.8, { seed: 2 }); hangingVine(P, [-0.9, 4.0, -0.42], 1.3, { seed: 3, glow: false });
      pebbles(P, [0, 0, 0.8], 2, 10, { seed: 6 });
    },
  },

  ancient_stone_floor_tile: {
    dir: 'props', cat: 'ruins', origin: GPT, tex: 512, pivot: 'as-built',
    name: '古代の石畳タイル', desc: '2m×2m の石畳（敷石1枚ずつ）。上面が y=0。隙間に苔。床モジュールより細かい装飾用。',
    build(P) {
      const R = P.rng;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const w = 0.48, dd = 0.48;
        const b = block(P, w - 0.03, 0.16, dd - 0.03, { r: 0.02, chip: 0.35, seed: i * 4 + j, tile: 1.2 });
        b.applyMatrix4(M([-0.75 + i * 0.5 + (R() - 0.5) * 0.02, -0.08 + (R() - 0.5) * 0.025, -0.75 + j * 0.5 + (R() - 0.5) * 0.02], [(R() - 0.5) * 0.02, (R() - 0.5) * 0.04, (R() - 0.5) * 0.02]));
        P.add(b, 'stone_block');
      }
      const base = new THREE.BoxGeometry(2, 0.1, 2); base.translate(0, -0.12, 0); P.add(boxUV(base.toNonIndexed(), 1), 'soil');
    },
  },

  broken_stone_stairs: {
    dir: 'props', cat: 'ruins', origin: GPT, tex: 512,
    name: '崩れた石段', desc: '幅2.4m・高さ約1.8mの石段（9段）。段の一部が割れて沈み、側壁は崩れている。高低差の演出に。',
    build(P) {
      const R = P.rng;
      const steps = 9, sh = 0.2, sd = 0.38;
      for (let i = 0; i < steps; i++) {
        let x = -1.2;
        while (x < 1.2) {
          const w = Math.min(0.5 + R() * 0.6, 1.2 - x); if (w < 0.15) break;
          const sunk = R() < 0.12 ? -0.06 - R() * 0.06 : 0;
          const b = block(P, w - 0.02, sh, sd + 0.05, { r: 0.03, chip: 1.0, seed: i * 10 + Math.round(x * 10) });
          b.applyMatrix4(M([x + w / 2, i * sh + sh / 2 + sunk, -i * sd], [(R() - 0.5) * (sunk ? 0.12 : 0.02), 0, (R() - 0.5) * (sunk ? 0.1 : 0.02)]));
          addMossy(P, b, 'stone_block', { up: 0.65, patch: 0.5, thick: 0.02 });
          x += w;
        }
        // 段の下を埋める
        const fill = new THREE.BoxGeometry(2.4, i * sh + 0.01, sd); fill.translate(0, (i * sh) / 2, -i * sd); P.add(boxUV(fill.toNonIndexed(), 1.5), 'stone_dark');
      }
      for (const s of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
          const hgt = (i + 1) * 0.42 * (s < 0 ? 1 : 0.7);
          const b = block(P, 0.35, hgt, 0.7, { r: 0.04, chip: 1.2, seed: i + (s > 0 ? 30 : 0) });
          b.translate(s * 1.38, hgt / 2, -i * 0.72);
          addMossy(P, b, 'stone_wall', { up: 0.55 });
        }
      }
      pebbles(P, [0.4, 0, 0.6], 1.2, 9, { seed: 3 });
    },
  },

  ruin_rubble_pile: {
    dir: 'props', cat: 'ruins', origin: GPT, tex: 512, pivot: 'ground',
    name: '遺跡の瓦礫の山', desc: '崩れた切石と割れた岩の山（約3m）。積み重なりに見えるよう下から順に配置。通路の部分封鎖や崩落地点に。',
    build(P) {
      const R = P.rng;
      const layers = [[9, 1.4, 0.15], [6, 1.0, 0.45], [4, 0.6, 0.8], [2, 0.25, 1.1]];
      let k = 0;
      for (const [n, rad, y] of layers) for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + R() * 0.5, d = rad * (0.4 + R() * 0.6);
        let g;
        if (R() < 0.6) { const s = 0.35 + R() * 0.35; g = block(P, s * 1.6, s, s * 1.1, { r: 0.04, chip: 1.6, seed: k }); }
        else g = rock(P, { r: 0.3 + R() * 0.2, detail: 2, sy: 0.7, rough: 0.35, crisp: 1, seed: k });
        g.applyMatrix4(M([Math.cos(a) * d, y, Math.sin(a) * d], [(R() - 0.5) * 0.9, R() * 6.28, (R() - 0.5) * 0.9]));
        addMossy(P, g, R() < 0.5 ? 'stone_block' : 'stone_wall', { up: 0.6, patch: 0.5 }); k++;
      }
      const col = column(P, { h: 1.4, brk: 0.35, seed: 3 }); col.applyMatrix4(M([0.9, 0.38, -1.1], [0.2, 0.9, Math.PI / 2 - 0.15])); P.add(col, 'stone_pale');
      pebbles(P, [0, 0, 0], 2.4, 20, { seed: 8, size: 0.14 });
    },
  },

  ancient_sarcophagus: {
    dir: 'props', cat: 'ruins', origin: GPT, tex: 512,
    name: '古代の石棺', desc: '長さ約2.4mの石棺。蓋に横たわる人物のレリーフ、蓋は少しずれて隙間から青い光。側面に帯状の装飾。',
    build(P) {
      const body = block(P, 1.0, 0.75, 2.3, { r: 0.05, chip: 0.8, seed: 1 }); body.translate(0, 0.375 + 0.12, 0); addMossy(P, body, 'stone_block', { up: 0.7 });
      const plinth = block(P, 1.2, 0.14, 2.5, { r: 0.04, chip: 1.2, seed: 2 }); plinth.translate(0, 0.07, 0); addMossy(P, plinth, 'stone_dark', { up: 0.6 });
      for (const y of [0.3, 0.75]) { const band = block(P, 1.04, 0.07, 2.34, { r: 0.02, chip: 0.5, seed: y * 10 }); band.translate(0, y, 0); P.add(band, 'stone_pale'); }
      const lidM = M([0.12, 0.87 + 0.08, 0.18], [0, 0.08, 0]);
      const lid = block(P, 1.1, 0.16, 2.4, { r: 0.05, chip: 0.9, seed: 3 }); lid.applyMatrix4(lidM); addMossy(P, lid, 'stone_pale', { up: 0.6 });
      // 人物のレリーフ（簡略化した寝姿）
      const fig = [[0, 0.06, -0.85, 0.24, 0.12, 0.26], [0, 0.07, -0.25, 0.46, 0.13, 0.75], [0, 0.06, 0.45, 0.4, 0.1, 0.65], [0, 0.05, 0.88, 0.3, 0.08, 0.25]];
      fig.forEach(([x, y, z, w, h, d], i) => { const b = i === 0 ? rock(P, { r: 0.14, detail: 2, sy: 0.6, rough: 0.1, seed: 9 }) : block(P, w, h, d, { r: 0.05, chip: 0.4, seed: 20 + i }); b.translate(x, 0.08 + y, z); b.applyMatrix4(lidM); P.add(b, 'stone_pale'); });
      const sword = block(P, 0.08, 0.04, 1.0, { r: 0.01, seed: 30 }); sword.translate(0, 0.17, 0.05); sword.applyMatrix4(lidM); P.add(sword, 'bronze');
      const glow = new THREE.BoxGeometry(0.9, 0.03, 0.05); glow.translate(0, 0.875, -1.08); P.add(glow, 'glow_core');
      P.light([0, 0.95, -1.15], 0x7fe6ff, 0.5, 2.5);
      pebbles(P, [0, 0, 0], 1.8, 8, { seed: 5 });
    },
  },

  forest_shrine_altar: {
    dir: 'props', cat: 'gimmick', origin: GPT, tex: 512,
    name: '樹海の祭壇', desc: '3段の石壇に祭壇石。中央に光る結晶球を根が抱え、側面に紋の刻まれた石板。仕掛け・イベント地点に。',
    build(P) {
      const R = P.rng;
      [[2.6, 0.25], [2.0, 0.25], [1.5, 0.25]].forEach(([w, h], i) => { const b = block(P, w, h, w, { r: 0.05, chip: 1.0, seed: i }); b.translate(0, i * 0.25 + h / 2, 0); addMossy(P, b, 'stone_block', { up: 0.6, patch: 0.45 }); });
      const top = block(P, 1.2, 0.7, 0.8, { r: 0.06, chip: 0.8, seed: 7 }); top.translate(0, 0.75 + 0.35, 0); addMossy(P, top, 'stone_pale', { up: 0.7 });
      const front = block(P, 0.9, 0.5, 0.05, { r: 0.01, chip: 0.2, seed: 9 }); front.translate(0, 1.1, 0.42); P.add(front, 'rune_stone');
      const orb = new THREE.IcosahedronGeometry(0.22, 3); orb.translate(0, 1.72, 0); P.add(orb, 'crystal_cyan');
      const core = new THREE.IcosahedronGeometry(0.1, 2); core.translate(0, 1.72, 0); P.add(core, 'glow_core');
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const pts = [V(Math.cos(a) * 0.5, 1.45, Math.sin(a) * 0.35), V(Math.cos(a) * 0.35, 1.5, Math.sin(a) * 0.25), V(Math.cos(a + 0.4) * 0.22, 1.7, Math.sin(a + 0.4) * 0.22), V(Math.cos(a + 0.9) * 0.08, 1.95, Math.sin(a + 0.9) * 0.08)];
        P.add(tube(P, pts, (t) => 0.05 * (1 - t * 0.7), { radial: 6, bark: 0.1, seed: i }), 'root');
      }
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; groundRoot(P, [Math.cos(a) * 0.7, 1.0, Math.sin(a) * 0.5], [Math.cos(a), -0.8, Math.sin(a)], 1.6 + R(), 0.09, { seed: i * 4, branches: 1 }); }
      P.light([0, 1.75, 0], 0x7fe6ff, 1.6, 6);
      P.marker('interact', [0, 1.0, 1.4]);
    },
  },

  weathered_guardian_statue: {
    dir: 'props', cat: 'ruins', origin: GPT, tex: 512,
    name: '風化した守護像', desc: '台座に立つ衣をまとった守護像（全高約3.6m）。剣を地に突き立てて構える。片腕の先と顔の一部が欠け、肩に苔。',
    build(P) {
      const pl = block(P, 1.4, 0.6, 1.4, { r: 0.06, chip: 1.3, seed: 1 }); pl.translate(0, 0.3, 0); addMossy(P, pl, 'stone_block', { up: 0.6 });
      const pl2 = block(P, 1.15, 0.2, 1.15, { r: 0.04, chip: 1, seed: 2 }); pl2.translate(0, 0.7, 0); P.add(pl2, 'stone_dark');
      const robe = lathe(P, [[0.55, 0.8], [0.5, 1.2], [0.4, 1.9], [0.36, 2.2], [0.42, 2.45], [0.5, 2.6], [0.3, 2.75], [0.12, 2.8]], { seg: 28, noise: 0.07, tile: 1, seed: 3 });
      addMossy(P, robe, 'stone_pale', { up: 0.4, thick: 0.03, patch: 0.4 });
      // 衣のひだ
      for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3 + Math.PI / 2; const f = tube(P, [V(Math.cos(a) * 0.5, 0.82, Math.sin(a) * 0.5), V(Math.cos(a) * 0.43, 1.5, Math.sin(a) * 0.43), V(Math.cos(a) * 0.37, 2.1, Math.sin(a) * 0.37)], 0.05, { radial: 6, bark: 0.02 }); P.add(f, 'stone_pale'); }
      const head = rock(P, { r: 0.19, detail: 3, sx: 0.9, sy: 1.12, sz: 1.0, rough: 0.03, crisp: 0.1, flat: -2, seed: 4, tile: 0.8 }); head.translate(0, 2.98, 0.02); P.add(head, 'stone_pale');
            // 兜（面の細い覗き穴つき）と頭頂の飾り
      const helm = lathe(P, [[0.24, 2.8], [0.23, 3.0], [0.215, 3.12], [0.17, 3.24], [0.07, 3.31], [0.0001, 3.33]], { seg: 22, noise: 0.03, tile: 0.8, seed: 5 });
      addMossy(P, helm, 'stone_pale', { up: 0.8 });
      const slit = block(P, 0.2, 0.035, 0.06, { r: 0.01, seed: 13 }); slit.translate(0, 3.02, 0.215); P.add(slit, 'dark_void');
      const crest = block(P, 0.04, 0.22, 0.34, { r: 0.015, chip: 0.6, seed: 14 }); crest.applyMatrix4(M([0, 3.34, -0.02], [0.2, 0, 0])); P.add(crest, 'stone_pale');
      for (const s of [-1, 1]) { const sh = rock(P, { r: 0.2, detail: 2, sy: 0.7, rough: 0.05, flat: -2, seed: 6 + s }); sh.translate(s * 0.42, 2.6, 0); addMossy(P, sh, 'stone_pale', { up: 0.75, thick: 0.025 }); }
      // 腕と剣（両手で柄頭を押さえる）
      for (const s of [-1, 1]) P.add(tube(P, [V(s * 0.45, 2.55, 0), V(s * 0.38, 2.1, 0.22), V(s * 0.1, 1.85, 0.42)], (t) => 0.09 - t * 0.02, { radial: 8, bark: 0.03 }), 'stone_pale');
      const blade = block(P, 0.12, 1.25, 0.04, { r: 0.01, chip: 0.3, seed: 8 }); blade.translate(0, 1.15, 0.5); P.add(blade, 'stone_dark');
      const guard = block(P, 0.5, 0.07, 0.09, { r: 0.015, seed: 9 }); guard.translate(0, 1.8, 0.5); P.add(guard, 'bronze');
      const grip = block(P, 0.05, 0.22, 0.05, { r: 0.01, seed: 10 }); grip.translate(0, 1.93, 0.5); P.add(grip, 'bronze');
      const eye = new THREE.IcosahedronGeometry(0.035, 1); eye.translate(0, 2.0, 0.53); P.add(eye, 'glow_core');
      P.light([0, 2.05, 0.7], 0x7fe6ff, 0.4, 2);
      pebbles(P, [0, 0, 0], 1.6, 10, { seed: 11 });
    },
  },

  broken_ruin_bridge: {
    dir: 'props', cat: 'ruins', origin: GPT, tex: 512,
    name: '崩れた遺跡橋', desc: '長さ約7m・幅2.2mの石橋。下面はアーチ、手すりの柱が残り、片端が崩落して途切れる。高低差のある広間に。',
    build(P) {
      const R = P.rng;
      const L = 7, deck = 1.6;
      for (let i = 0; i < 12; i++) {
        const x = -L / 2 + (i + 0.5) * (L / 12); if (x > 2.3 && R() < 0.85) continue;
        const b = block(P, L / 12 - 0.02, 0.35, 2.2, { r: 0.04, chip: 1.0, seed: i });
        b.applyMatrix4(M([x, deck + 0.175 - (x > 2.0 ? (x - 2) * 0.08 : 0), 0], [0, 0, x > 2 ? -0.06 : 0]));
        addMossy(P, b, 'stone_block', { up: 0.6, patch: 0.5 });
      }
      // 下のアーチ（迫石）
      for (let k = 0; k < 9; k++) {
        const a = Math.PI * (0.06 + 0.88 * (k + 0.5) / 9);
        const b = block(P, 0.5, 0.45, 2.0, { r: 0.04, chip: 0.9, seed: 40 + k });
        b.applyMatrix4(M([-Math.cos(a) * 2.4 - 1, Math.sin(a) * 1.25 + 0.05, 0], [0, 0, a - Math.PI / 2]));
        P.add(b, 'stone_wall');
      }
      for (const s of [-1, 1]) {
        const pier = block(P, 0.8, deck, 2.1, { r: 0.05, chip: 1, seed: s + 60 }); pier.translate(-3.4 * (s < 0 ? 1 : 0) + (s > 0 ? 1.4 : 0), deck / 2, 0); addMossy(P, pier, 'stone_wall', { up: 0.6 });
        for (let i = 0; i < 6; i++) {
          const x = -3.2 + i * 1.1; if (x > 2.2) break;
          const post = block(P, 0.18, 0.75 - (i === 4 ? 0.35 : 0), 0.18, { r: 0.03, chip: 1, seed: i + (s > 0 ? 70 : 80) }); post.translate(x, deck + 0.35 + 0.37, s * 0.98); P.add(post, 'stone_pale');
        }
        const rail = block(P, 3.4, 0.12, 0.2, { r: 0.03, chip: 1.2, seed: s + 90 }); rail.translate(-1.5, deck + 1.1, s * 0.98); addMossy(P, rail, 'stone_pale', { up: 0.6 });
      }
      hangingVine(P, [0.5, 1.55, 1.1], 1.4, { seed: 3 }); hangingVine(P, [-1.8, 1.6, -1.1], 1.0, { seed: 4, glow: false });
      pebbles(P, [3.2, 0, 0], 1.5, 12, { seed: 2, size: 0.2 });
    },
  },

  ancient_rune_floor_seal: {
    dir: 'props', cat: 'gimmick', origin: GPT, tex: 1024, pivot: 'as-built',
    name: '床の古代ルーン', desc: '直径約2.6mの円形の封印。刻まれた円陣と文字が青く光る。周囲を縁石が囲む。上面が y≒0.04。',
    build(P) {
      const disc = new THREE.CylinderGeometry(1.15, 1.18, 0.12, 64, 1); disc.translate(0, -0.02, 0);
      const d2 = disc.toNonIndexed(); const p = d2.attributes.position, uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / 2.3 + 0.5; uv[i * 2 + 1] = p.getZ(i) / 2.3 + 0.5; }
      d2.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); d2.computeVertexNormals(); P.add(d2, 'rune_stone');
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const b = block(P, 0.46, 0.14, 0.24, { r: 0.03, chip: 1, seed: k });
        b.applyMatrix4(M([Math.cos(a) * 1.3, -0.01, Math.sin(a) * 1.3], [0, -a + Math.PI / 2, 0]));
        addMossy(P, b, 'stone_block', { up: 0.7, patch: 0.5 });
      }
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; const c = new THREE.IcosahedronGeometry(0.06, 1); c.translate(Math.cos(a) * 1.3, 0.12, Math.sin(a) * 1.3); P.add(c, 'glow_core'); }
      P.light([0, 0.4, 0], 0x5fe0ff, 1.4, 5);
    },
  },

  fallen_statue_head: {
    dir: 'props', cat: 'ruins', origin: GPT, tex: 512, pivot: 'ground',
    name: '守護像の頭部', desc: '倒れて半ば埋もれた巨大な石の頭部（約2.2m）。冠の帯、眉・鼻・唇の造形、ひびと厚い苔。広間のスケール感の演出に。',
    build(P) {
      const R = P.rng;
      const rot = M([0, 0.7, 0], [0.15, 0.4, Math.PI / 2 - 0.25]);
      const head = rock(P, { r: 1.0, detail: 4, sx: 0.85, sy: 1.15, sz: 0.95, rough: 0.05, crisp: 0.2, flat: -2, seed: 2, tile: 1.6 });
      head.applyMatrix4(rot); addMossy(P, head, 'stone_pale', { up: 0.35, thick: 0.05, patch: 0.5 });
      const feat = (g, mat = 'stone_pale') => { g.applyMatrix4(rot); P.add(g, mat); };
      const nose = block(P, 0.22, 0.42, 0.28, { r: 0.06, chip: 1.4, seed: 3 }); nose.translate(0, 0.05, 0.92); feat(nose);
      for (const s of [-1, 1]) { const brow = block(P, 0.38, 0.1, 0.18, { r: 0.04, chip: 0.6, seed: 4 + s }); brow.applyMatrix4(M([s * 0.24, 0.33, 0.82], [0, s * 0.25, s * 0.1])); feat(brow);
        const eye = rock(P, { r: 0.09, detail: 1, sy: 0.6, rough: 0.05, seed: 6 + s }); eye.translate(s * 0.24, 0.18, 0.86); feat(eye, 'stone_dark'); }
      const lip = block(P, 0.36, 0.08, 0.12, { r: 0.03, seed: 8 }); lip.translate(0, -0.33, 0.86); feat(lip);
      const crown = lathe(P, [[0.92, 0.55], [0.98, 0.62], [0.98, 0.78], [0.9, 0.84]], { seg: 32, noise: 0.05, tile: 1.2, seed: 9 }); feat(crown, 'bronze');
      const soil = rock(P, { r: 1.4, detail: 3, sy: 0.18, rough: 0.2, seed: 10 }); soil.translate(0, -0.05, 0); P.add(soil, 'soil');
      for (let i = 0; i < 4; i++) groundRoot(P, [(R() - 0.5) * 1.5, 1.4, (R() - 0.5)], [(R() - 0.5), -1, R() - 0.5], 2, 0.07, { seed: i, branches: 1 });
      pebbles(P, [0, 0, 0], 2.2, 12, { seed: 12 });
    },
  },

  mossy_wishing_well: {
    dir: 'props', cat: 'ruins', origin: GPT, tex: 512,
    name: '苔むした願いの井戸', desc: '石を円く積んだ井戸（径約1.8m）。木の屋根枠、滑車と縄、桶。水面が青く光る。休憩地点や回復イベントの目印に。',
    build(P) {
      const R = P.rng;
      for (let row = 0; row < 3; row++) for (let k = 0; k < 14; k++) {
        const a = ((k + (row % 2) * 0.5) / 14) * Math.PI * 2;
        const b = block(P, 0.4, 0.27, 0.3, { r: 0.04, chip: 1.0, seed: row * 20 + k });
        b.applyMatrix4(M([Math.cos(a) * 0.82, 0.14 + row * 0.28, Math.sin(a) * 0.82], [0, -a + Math.PI / 2, (R() - 0.5) * 0.04]));
        addMossy(P, b, 'stone_wall', { up: 0.6, patch: 0.5 });
      }
      const water = new THREE.CircleGeometry(0.72, 32); water.rotateX(-Math.PI / 2); water.translate(0, 0.45, 0); P.add(water, 'water_glow');
      const inner = new THREE.CylinderGeometry(0.74, 0.74, 0.8, 24, 1, true); inner.translate(0, 0.45, 0); inner.scale(-1, 1, 1); P.add(boxUV(inner.toNonIndexed(), 1), 'stone_dark');
      for (const s of [-1, 1]) { const post = block(P, 0.14, 2.0, 0.14, { r: 0.02, chip: 0.5, seed: s + 40, tile: 1 }); post.translate(s * 0.95, 1.0, 0); P.add(post, 'wood_dark'); }
      const beam = block(P, 2.2, 0.12, 0.14, { r: 0.02, seed: 50 }); beam.translate(0, 1.95, 0); P.add(beam, 'wood_dark');
      for (const s of [-1, 1]) { const roof = block(P, 2.5, 0.06, 0.8, { r: 0.015, chip: 0.6, seed: 51 + s }); roof.applyMatrix4(M([0, 2.2, s * 0.32], [s * -0.55, 0, 0])); addMossy(P, roof, 'wood', { up: 0.5 }); }
      const wheel = new THREE.TorusGeometry(0.13, 0.03, 6, 16); wheel.translate(0, 1.82, 0); P.add(boxUV(wheel.toNonIndexed(), 0.3), 'iron');
      P.add(tube(P, [V(0.13, 1.82, 0), V(0.13, 1.2, 0.02), V(0.12, 0.85, 0)], 0.012, { radial: 5, bark: 0 }), 'wood_dark');
      const bucket = lathe(P, [[0.0001, 0.6], [0.12, 0.6], [0.14, 0.82], [0.13, 0.84]], { seg: 14, tile: 0.4 }); bucket.translate(0.13, 0, 0); P.add(bucket, 'wood');
      P.light([0, 0.7, 0], 0x55d8ff, 0.9, 3.5);
      P.marker('interact', [0, 0, 1.4]);
    },
  },

  ruin_stone_lantern: {
    dir: 'props', cat: 'glow', origin: GPT, tex: 256,
    name: '遺跡の石灯籠', desc: '積み石の灯籠（高さ約1.7m）。火袋に青白い灯火。通路沿いの視線誘導に。',
    build(P) {
      const b0 = block(P, 0.6, 0.18, 0.6, { r: 0.04, chip: 1.2, seed: 1 }); b0.translate(0, 0.09, 0); addMossy(P, b0, 'stone_block', { up: 0.6 });
      const post = column(P, { r: 0.13, h: 0.65, flutes: 8, flute: 0.01, seed: 2 }); post.translate(0, 0.18, 0); P.add(post, 'stone_block');
      const plat = block(P, 0.5, 0.1, 0.5, { r: 0.03, chip: 1, seed: 3 }); plat.translate(0, 0.88, 0); addMossy(P, plat, 'stone_block', { up: 0.6 });
      for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) { const p = block(P, 0.08, 0.3, 0.08, { r: 0.015, seed: x * 9 + z }); p.translate(x, 1.08, z); P.add(p, 'stone_block'); }
      const roof = lathe(P, [[0.0001, 1.23], [0.48, 1.25], [0.44, 1.32], [0.2, 1.45], [0.06, 1.55], [0.08, 1.62], [0.0001, 1.7]], { seg: 6, noise: 0.03, tile: 0.7 }); roof.rotateY(Math.PI / 4); addMossy(P, roof, 'stone_block', { up: 0.5, thick: 0.03 });
      flame(P, [0, 0.93, 0], 0.22, { intensity: 1.0 });
    },
  },

  ancient_lantern_post: {
    dir: 'props', cat: 'glow', origin: GPT, tex: 256,
    name: '古代の灯籠柱', desc: '高さ約2.6mの石柱に鉄の吊り灯籠。青白い灯がともる。広い通路の両側に並べて奥行きを出す。',
    build(P) {
      const b0 = block(P, 0.5, 0.3, 0.5, { r: 0.04, chip: 1.2, seed: 1 }); b0.translate(0, 0.15, 0); addMossy(P, b0, 'stone_block', { up: 0.6 });
      const col = column(P, { r: 0.16, h: 2.2, flutes: 10, flute: 0.015, seed: 2 }); col.translate(0, 0.3, 0); addMossy(P, col, 'stone_block', { up: 0.6 });
      const cap = block(P, 0.4, 0.12, 0.4, { r: 0.03, seed: 3 }); cap.translate(0, 2.56, 0); P.add(cap, 'stone_block');
      const arm = tube(P, [V(0, 2.45, 0), V(0.25, 2.5, 0), V(0.45, 2.45, 0)], 0.02, { radial: 6, bark: 0 }); P.add(arm, 'iron');
      const cage = lathe(P, [[0.0001, 1.95], [0.1, 1.97], [0.13, 2.12], [0.12, 2.25], [0.04, 2.33], [0.0001, 2.4]], { seg: 6, tile: 0.3 }); cage.translate(0.45, 0, 0);
      // 鉄枠（縦の棒）
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; P.add(tube(P, [V(0.45 + Math.cos(a) * 0.1, 1.97, Math.sin(a) * 0.1), V(0.45 + Math.cos(a) * 0.135, 2.12, Math.sin(a) * 0.135), V(0.45 + Math.cos(a) * 0.05, 2.32, Math.sin(a) * 0.05)], 0.008, { radial: 4, bark: 0 }), 'iron'); }
      const top = lathe(P, [[0.0001, 2.3], [0.12, 2.3], [0.03, 2.4], [0.0001, 2.45]], { seg: 6, tile: 0.3 }); top.translate(0.45, 0, 0); P.add(top, 'iron');
      P.add(tube(P, [V(0.45, 2.45, 0), V(0.45, 2.4, 0)], 0.01, { radial: 4, bark: 0 }), 'iron');
      const core = new THREE.IcosahedronGeometry(0.07, 2); core.scale(1, 1.4, 1); core.translate(0.45, 2.11, 0); P.add(core, 'glow_core');
      P.light([0.45, 2.1, 0], 0x7fe6ff, 1.2, 6);
    },
  },
};
