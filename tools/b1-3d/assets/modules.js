// Claude 新規：ダンジョンの組み立て部品（4m グリッド）・仕掛け・採集ポイント・環境演出
// 共通の寸法：1マス＝4m×4m、壁の高さ 4m、天井の下面 y=4（天井部品は原点＝下面）
import * as THREE from 'three';
import { tube, rock, lathe, block, boxUV, M, V, leafBlade, crystalShard, wander } from '../lib/geo.js';
import { addMossy, masonryWall, groundRoot, hangingVine, mushroom, crystalCluster, pebbles, flame } from '../lib/kit.js';

const NEW = 'Claude 新規';
const CELL = 4, WALL_H = 4;

// 起伏のある床面（細分化した平面）。hfn(x,z) で高さ、mat の UV は実寸/tile
function groundPlane(P, w, d, n, hfn, mat, tile = 2) {
  const g = new THREE.PlaneGeometry(w, d, n, Math.round(n * d / w)); g.rotateX(-Math.PI / 2); g.deleteAttribute('normal');
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, hfn(x, z)); uv.setXY(i, x / tile, z / tile); }
  g.computeVertexNormals();
  P.add(g, mat);
  return g;
}
// 床の縁（厚み）を隠す側面
function slabSides(P, w, d, th, mat) { const g = new THREE.BoxGeometry(w, th, d); g.translate(0, -th / 2 - 0.02, 0); P.add(boxUV(g.toNonIndexed(), 2), mat); }

// シダ1株
function fern(P, pos, size, { seed = 0, mat = 'leaf' } = {}) {
  const R = P.rng;
  const n = 7 + Math.round(R() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * 0.4, len = size * (0.7 + R() * 0.5);
    // 葉軸（曲がった細い管）と小葉
    const pts = []; for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push(V(pos[0] + Math.cos(a) * len * t * 0.8, pos[1] + Math.sin(Math.PI * t * 0.8) * len * 0.45, pos[2] + Math.sin(a) * len * t * 0.8)); }
    P.add(tube(P, pts, (t) => 0.008 * (1 - t * 0.7), { radial: 4, perMeter: 8, bark: 0 }), 'root');
    const curve = new THREE.CatmullRomCurve3(pts);
    for (let k = 1; k < 9; k++) {
      const t = k / 9, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
      for (const s of [-1, 1]) {
        const lf = leafBlade(len * 0.16 * (1 - t * 0.6), len * 0.04, { segs: 3, droop: 0.3, curl: 0.2 });
        const yaw = Math.atan2(tg.x, tg.z);
        lf.applyMatrix4(M([p.x, p.y, p.z], [Math.PI / 2 - 0.3, yaw + s * 1.25, 0]));
        P.add(lf, mat);
      }
    }
  }
}

export default {
  // ───── 床 ─────
  mod_floor_stone_4m: {
    dir: 'modules', cat: 'module', origin: NEW, tex: 1024, pivot: 'as-built',
    name: '床：石畳（4m）', desc: '1マス分の石畳。わずかな起伏と、ところどころ浮いた敷石。上面が y≒0、中心が原点。隣のマスと継ぎ目なく並ぶ（縁の高さは0）。',
    build(P) {
      const N = P.noise;
      groundPlane(P, CELL, CELL, 48, (x, z) => { const e = Math.min(1, (CELL / 2 - Math.max(Math.abs(x), Math.abs(z))) / 0.4); return (N.fbm(x * 0.6, 0, z * 0.6, 3) * 0.04) * e; }, 'stone_floor', 2);
      slabSides(P, CELL, CELL, 0.3, 'stone_dark');
      const R = P.rng;
      for (let i = 0; i < 4; i++) { const b = block(P, 0.5 + R() * 0.3, 0.12, 0.4 + R() * 0.3, { r: 0.03, chip: 1.0, seed: i }); b.applyMatrix4(M([(R() - 0.5) * 3, 0.0, (R() - 0.5) * 3], [(R() - 0.5) * 0.12, R() * 3, (R() - 0.5) * 0.12])); P.add(b, 'stone_block'); }
      pebbles(P, [0, 0, 0], 1.8, 6, { seed: 2, size: 0.07 });
    },
  },

  mod_floor_stone_broken_4m: {
    dir: 'modules', cat: 'module', origin: NEW, tex: 512, pivot: 'as-built',
    name: '床：崩れた石畳（4m）', desc: '敷石が抜け落ち、土と根と苔がのぞく1マス分の床。通路の荒れた区間に混ぜて単調さを崩す。',
    build(P) {
      const R = P.rng, N = P.noise;
      groundPlane(P, CELL, CELL, 40, (x, z) => -0.08 + N.fbm(x * 0.8, 0, z * 0.8, 3) * 0.05, 'soil', 1.5);
      slabSides(P, CELL, CELL, 0.3, 'stone_dark');
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
        const x = -1.75 + i * 0.5, z = -1.75 + j * 0.5;
        const hole = N(x * 0.45 + 3, 0, z * 0.45) > 0.12;
        if (hole && Math.abs(x) < 1.7 && Math.abs(z) < 1.7) { if (R() < 0.2) { const b = block(P, 0.44, 0.1, 0.44, { r: 0.03, chip: 1.5, seed: i * 8 + j }); b.applyMatrix4(M([x, -0.07, z], [(R() - 0.5) * 0.5, R(), (R() - 0.5) * 0.5])); P.add(b, 'stone_block'); } continue; }
        const b = block(P, 0.47, 0.14, 0.47, { r: 0.025, chip: 0.6, seed: i * 8 + j, tile: 1.2 }); b.applyMatrix4(M([x, -0.07 + (R() - 0.5) * 0.02, z], [(R() - 0.5) * 0.03, (R() - 0.5) * 0.04, (R() - 0.5) * 0.03])); P.add(b, 'stone_block');
      }
      for (let i = 0; i < 3; i++) groundRoot(P, [-2 + R() * 0.3, 0.02, -1.5 + i * 1.4], [1, -0.1, (R() - 0.5) * 0.6], 3 + R(), 0.09, { seed: i, branches: 1, sink: 0.6 });
      for (let i = 0; i < 4; i++) fern(P, [(R() - 0.5) * 2.5, -0.05, (R() - 0.5) * 2.5], 0.35, { seed: i });
    },
  },

  mod_floor_root_soil_4m: {
    dir: 'modules', cat: 'module', origin: NEW, tex: 512, pivot: 'as-built',
    name: '床：根の這う土（4m）', desc: '遺跡の外側、樹海寄りの区画の床。土と落ち葉、這う根、苔の塊、小さな発光キノコ。',
    build(P) {
      const R = P.rng, N = P.noise;
      groundPlane(P, CELL, CELL, 40, (x, z) => { const e = Math.min(1, (CELL / 2 - Math.max(Math.abs(x), Math.abs(z))) / 0.5); return N.fbm(x * 0.7, 0, z * 0.7, 4) * 0.12 * e; }, 'soil', 1.5);
      slabSides(P, CELL, CELL, 0.3, 'soil');
      for (let i = 0; i < 4; i++) groundRoot(P, [-2.1, 0.05, -1.6 + i * 1.1 + R() * 0.3], [1, -0.05, (R() - 0.5) * 0.8], 3.6 + R() * 0.8, 0.07 + R() * 0.07, { seed: i * 3, branches: 2, sink: 0.55 });
      for (let i = 0; i < 5; i++) { const m = rock(P, { r: 0.25 + R() * 0.2, detail: 2, sy: 0.25, rough: 0.3, seed: i }); m.translate((R() - 0.5) * 3.2, 0.02, (R() - 0.5) * 3.2); P.add(m, 'moss'); }
      for (let i = 0; i < 6; i++) mushroom(P, [(R() - 0.5) * 3, 0.0, (R() - 0.5) * 3], 0.06 + R() * 0.08, 0.04 + R() * 0.03, { seed: i, mat: i % 2 ? 'glowcap' : 'glowcap_teal' });
      P.light([0, 0.4, 0], 0x6fe8ff, 0.3, 3);
    },
  },

  mod_floor_ledge_step: {
    dir: 'modules', cat: 'module', origin: NEW, tex: 512, pivot: 'as-built',
    name: '床：段差の高台（4m）', desc: '高さ0.6mの石の高台1マス。手前（+Z）に2段の石段。広間に高低差を作る。上面 y=0.6。',
    build(P) {
      const R = P.rng, N = P.noise;
      const top = groundPlane(P, CELL, CELL - 0.8, 40, (x, z) => 0.6 + N.fbm(x * 0.6, 0, z * 0.6, 3) * 0.02, 'stone_floor', 2); top.translate(0, 0, -0.4);
      // 前面の擁壁
      for (let k = 0; k < 2; k++) { let x = -2; while (x < 2) { const w = Math.min(0.7 + R() * 0.5, 2 - x); const b = block(P, w - 0.02, 0.3, 0.5, { r: 0.03, chip: 0.9, seed: k * 20 + Math.round(x * 5) }); b.translate(x + w / 2, k * 0.3 + 0.15, 1.35); addMossy(P, b, 'stone_wall', { up: 0.7 }); x += w; } }
      const sides = new THREE.BoxGeometry(CELL, 0.6, CELL - 0.8); sides.translate(0, 0.3, -0.4); P.add(boxUV(sides.toNonIndexed(), 2), 'stone_dark');
      for (let k = 0; k < 2; k++) { const st = block(P, 1.6, 0.2, 0.35, { r: 0.03, chip: 1.0, seed: 50 + k }); st.translate(0, 0.1 + k * 0.2, 1.95 - k * 0.32); addMossy(P, st, 'stone_block', { up: 0.7 }); }
      pebbles(P, [0, 0.6, -0.5], 1.5, 5, { seed: 4, size: 0.07 });
    },
  },

  // ───── 壁 ─────
  mod_wall_4m: {
    dir: 'modules', cat: 'module', origin: NEW, tex: 512, pivot: 'as-built',
    name: '壁：石積み（4m）', desc: '1マスの辺を埋める標準の石積み壁（幅4m・高さ4m・厚さ0.8m）。原点＝内側の面の下端中央、内側が +Z。マスの辺に置くだけで通路になる。',
    build(P) { masonryWall(P, { w: CELL, h: WALL_H, d: 0.8, seed: 21, mat: 'stone_wall' }); },
  },

  mod_wall_mossy_roots_4m: {
    dir: 'modules', cat: 'module', origin: NEW, tex: 512, pivot: 'as-built',
    name: '壁：苔と細根（4m）', desc: '標準壁の差分。苔が多く、細い根と蔓が垂れる。巨木に近い区画用。寸法と原点は標準壁と同じ。',
    build(P) {
      const R = P.rng;
      masonryWall(P, { w: CELL, h: WALL_H, d: 0.8, seed: 33, mat: 'stone_wall_mossy', missing: 0.03 });
      for (let i = 0; i < 4; i++) { const x0 = -1.6 + i * 1.05 + (R() - 0.5) * 0.4; P.add(tube(P, [V(x0, 4.2, -0.1), V(x0 + (R() - 0.5) * 0.4, 3.0, 0.07), V(x0 + (R() - 0.5) * 0.6, 1.6, 0.08), V(x0 + (R() - 0.5) * 0.6, 0.4, 0.06), V(x0 + (R() - 0.5), 0.0, 0.25)], (t) => 0.05 * (1 - t * 0.4), { radial: 7, bark: 0.1, seed: i }), 'root'); }
      hangingVine(P, [-0.8, 3.9, 0.08], 1.8, { seed: 2 }); hangingVine(P, [1.1, 3.95, 0.08], 1.2, { seed: 5, glow: false });
    },
  },

  mod_wall_collapsed_4m: {
    dir: 'modules', cat: 'module', origin: NEW, tex: 512, pivot: 'as-built',
    name: '壁：崩落（4m）', desc: '上部が大きく崩れ、足元に瓦礫が積もった壁。崩れた隙間の奥を暗くして、向こう側の空間を想像させる。',
    build(P) {
      masonryWall(P, { w: CELL, h: WALL_H, d: 0.8, broken: 0.75, missing: 0.05, seed: 44, mat: 'stone_wall' });
      const R = P.rng;
      for (let i = 0; i < 9; i++) { const s = 0.3 + R() * 0.3; const b = block(P, s * 1.6, s, s * 1.2, { r: 0.04, chip: 1.6, seed: 60 + i }); b.applyMatrix4(M([(R() - 0.5) * 3.4, s * 0.4, 0.4 + R() * 0.9], [(R() - 0.5) * 0.9, R() * 6, (R() - 0.5) * 0.9])); addMossy(P, b, 'stone_wall', { up: 0.6 }); }
      pebbles(P, [0, 0, 0.8], 1.8, 14, { seed: 5 });
    },
  },

  mod_wall_doorway_4m: {
    dir: 'modules', cat: 'module', origin: NEW, tex: 512, pivot: 'as-built',
    name: '壁：アーチの開口（4m）', desc: '幅2m・高さ3mのアーチ開口をもつ壁。扉（ancient_wooden_door・gimmick_sealed_rune_door）や根のカーテンをはめられる寸法。',
    build(P) {
      const R = P.rng;
      for (const s of [-1, 1]) masonryWall(P, { w: 1.0, h: WALL_H, d: 0.8, seed: 70 + s, x0: s * 1.5, mat: 'stone_wall' });
      // アーチの迫石
      for (let k = 0; k < 9; k++) { const a = Math.PI * (k + 0.5) / 9; const b = block(P, 0.36, 0.45, 0.82, { r: 0.035, chip: 0.8, seed: 80 + k }); b.applyMatrix4(M([-Math.cos(a) * 1.2, 2.0 + Math.sin(a) * 1.2, -0.41], [0, 0, a - Math.PI / 2])); addMossy(P, b, k === 4 ? 'rune_stone' : 'stone_wall', { up: 0.6 }); }
      // アーチの上の壁
      for (let r = 0; r < 3; r++) { let x = -1.0 + (r % 2) * 0.25; while (x < 1.0) { const w = Math.min(0.5 + R() * 0.3, 1.0 - x); const cx = x + w / 2, y = 3.0 + r * 0.33; if (Math.hypot(cx, y - 2.0) > 1.45) { const b = block(P, w - 0.02, 0.31, 0.8, { r: 0.03, chip: 0.8, seed: 90 + r * 9 + Math.round(x * 8) }); b.translate(cx, y + 0.16, -0.4); addMossy(P, b, 'stone_wall', { up: 0.6 }); } x += w; } }
      const fill = new THREE.Shape(); fill.moveTo(-1, 2); fill.absarc(0, 2, 1.0, Math.PI, 0, true); fill.lineTo(1, 4); fill.lineTo(-1, 4); fill.lineTo(-1, 2);
      const fg = new THREE.ExtrudeGeometry(fill, { depth: 0.4, bevelEnabled: false, curveSegments: 16 }); fg.translate(0, 0, -0.6); P.add(boxUV(fg.toNonIndexed(), 2), 'stone_dark');
      P.light([0, 3.2, 0.5], 0x5fe0ff, 0.4, 3);
    },
  },

  mod_pillar_corner: {
    dir: 'modules', cat: 'module', origin: NEW, tex: 512,
    name: '角柱：マスの角（4.3m）', desc: 'マスの角に立てる太い角柱（0.9m角・高さ4.3m）。壁と壁の継ぎ目を隠し、通路にリズムを付ける。柱頭と台座つき。',
    build(P) {
      const base = block(P, 1.1, 0.4, 1.1, { r: 0.05, chip: 1.1, seed: 1 }); base.translate(0, 0.2, 0); addMossy(P, base, 'stone_block', { up: 0.6 });
      for (let k = 0; k < 6; k++) { const b = block(P, 0.9, 0.58, 0.9, { r: 0.045, chip: 0.9, seed: 10 + k, tile: 1.6 }); b.applyMatrix4(M([0, 0.4 + 0.29 + k * 0.58, 0], [0, (k % 2 - 0.5) * 0.04, 0])); addMossy(P, b, 'stone_wall', { up: 0.6 }); }
      const cap = block(P, 1.15, 0.35, 1.15, { r: 0.05, chip: 1.0, seed: 3 }); cap.translate(0, 4.07, 0); addMossy(P, cap, 'stone_block', { up: 0.55 });
    },
  },

  crystal_wall_vein: {
    dir: 'modules', cat: 'glow', origin: NEW, tex: 512, pivot: 'as-built',
    name: '壁の結晶脈', desc: '壁面に重ねて置く、岩肌を割って生えた結晶の群れ（幅約2.4m）。原点＝壁面の下端中央、+Z へ突き出す。標準壁の前に置いて差分を作る。',
    build(P) {
      const R = P.rng;
      const rk = rock(P, { r: 1.2, detail: 4, sx: 1.1, sy: 1.25, sz: 0.3, rough: 0.55, crisp: 1.2, flat: -2, seed: 3 }); rk.translate(0, 1.4, -0.05); addMossy(P, rk, 'stone_dark', { up: 0.7 });
      const pts = [[-0.6, 1.0], [0.1, 1.6], [0.6, 0.8], [-0.2, 2.2], [0.5, 1.9]];
      pts.forEach(([x, y], i) => {
        for (let k = 0; k < 4; k++) {
          const len = (i === 1 ? 0.9 : 0.5) * (0.5 + R() * 0.6), g = crystalShard(P, len, len * 0.18, { seed: i * 9 + k });
          g.applyMatrix4(M([x + (R() - 0.5) * 0.2, y + (R() - 0.5) * 0.2, 0.2], [Math.PI / 2 - 0.4 + (R() - 0.5) * 0.9, 0, (R() - 0.5) * 1.6]));
          P.add(g, i === 3 ? 'crystal_violet' : 'crystal_cyan');
        }
      });
      P.light([0, 1.5, 0.8], 0x55d8ff, 1.0, 5);
    },
  },

  // ───── 天井 ─────
  mod_ceiling_vault_4m: {
    dir: 'modules', cat: 'module', origin: NEW, tex: 512, pivot: 'as-built',
    name: '天井：石のヴォールト（4m）', desc: '1マス分の石の天井。2本の肋材（リブ）と、隙間から垂れる根。原点＝天井の下端（壁の上 y=4 に置く）。',
    build(P) {
      const R = P.rng;
      const slab = new THREE.PlaneGeometry(CELL, CELL, 24, 24); slab.rotateX(Math.PI / 2);
      const p = slab.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, 0.9 - 0.9 * Math.max(Math.abs(x), Math.abs(z)) / 2 * 0.4 + P.noise(x, 3, z) * 0.05); }
      slab.computeVertexNormals(); boxUV(slab, 2); P.add(slab, 'stone_wall');
      for (const rotY of [0, Math.PI / 2]) for (let k = 0; k < 8; k++) {
        // 楕円の肋材。石は接線の向きに並べる
        const a = Math.PI * (k + 0.5) / 8; const b = block(P, 0.66, 0.32, 0.42, { r: 0.03, chip: 0.8, seed: k + rotY * 10 });
        const tx = Math.sin(a) * 2.0, ty = Math.cos(a) * 0.85;
        b.applyMatrix4(M([-Math.cos(a) * 2.0, Math.sin(a) * 0.85 - 0.12, 0], [0, 0, Math.atan2(ty, tx)])); b.applyMatrix4(M([0, 0, 0], [0, rotY, 0])); P.add(b, 'stone_block');
      }
      for (let i = 0; i < 5; i++) { const x = (R() - 0.5) * 3, z = (R() - 0.5) * 3; P.add(tube(P, [V(x, 0.8, z), V(x + 0.1, 0.3, z), V(x + (R() - 0.5) * 0.3, -0.4 - R() * 0.8, z + 0.05)], (t) => 0.04 * (1 - t * 0.8), { radial: 6, bark: 0.1, seed: i }), 'root'); }
    },
  },

  mod_ceiling_roots_4m: {
    dir: 'modules', cat: 'module', origin: NEW, tex: 512, pivot: 'as-built',
    name: '天井：根の天蓋（4m）', desc: '太い根が網のように張った天井。光る雫と垂れる蔓。巨木の真下の区画用。原点＝天井の下端。',
    build(P) {
      const R = P.rng;
      const back = new THREE.PlaneGeometry(CELL, CELL, 8, 8); back.rotateX(Math.PI / 2); back.translate(0, 0.9, 0); P.add(boxUV(back.toNonIndexed(), 2), 'soil');
      for (let i = 0; i < 9; i++) {
        const a = R() * Math.PI, ox = (R() - 0.5) * 2, oz = (R() - 0.5) * 2;
        const d = [Math.cos(a), 0, Math.sin(a)];
        const pts = [V(ox - d[0] * 2.6, 0.7, oz - d[2] * 2.6), V(ox - d[0] * 1.0, 0.2 - R() * 0.3, oz - d[2] * 1.0), V(ox + d[0] * 1.0, 0.25 - R() * 0.3, oz + d[2] * 1.0), V(ox + d[0] * 2.6, 0.7, oz + d[2] * 2.6)];
        P.add(tube(P, pts, 0.12 + R() * 0.12, { radial: 10, perMeter: 4, bark: 0.14, seed: i }), i < 3 ? 'bark' : 'root');
      }
      for (let i = 0; i < 6; i++) hangingVine(P, [(R() - 0.5) * 3, 0.1, (R() - 0.5) * 3], 0.6 + R() * 1.4, { seed: i * 2, r0: 0.018 });
    },
  },

  mod_stairs_down: {
    dir: 'modules', cat: 'module', origin: NEW, tex: 512, pivot: 'as-built',
    name: '下り階段（B2Fへ）', desc: '1マス分の床に開いた下り階段（開口 2m×3m）。闇へ降りる石段、縁石、青い道標の灯。上面 y=0、階段は -Z 方向へ下る。',
    build(P) {
      const R = P.rng, N = P.noise;
      // 開口のある床
      for (const [x, z, w, d] of [[-1.5, 0, 1, 4], [1.5, 0, 1, 4], [0, 1.75, 2, 0.5], [0, -1.75, 2, 0.5]]) {
        const g = groundPlane(P, w, d, Math.max(4, Math.round(w * 10)), (xx, zz) => N.fbm((xx + x) * 0.6, 0, (zz + z) * 0.6, 3) * 0.02, 'stone_floor', 2);
        g.translate(x, 0, z);
      }
      for (let k = 0; k < 10; k++) { const st = block(P, 1.96, 0.22, 0.32, { r: 0.025, chip: 0.9, seed: k }); st.translate(0, -0.11 - k * 0.22, 1.35 - k * 0.3); addMossy(P, st, 'stone_block', { up: 0.75, patch: 0.4 }); }
      for (const s of [-1, 1]) { const wall = new THREE.BoxGeometry(0.1, 2.4, 3.2); wall.translate(s * 1.03, -1.2, 0); P.add(boxUV(wall.toNonIndexed(), 1.6), 'stone_wall'); }
      const endWall = new THREE.BoxGeometry(2.1, 2.4, 0.1); endWall.translate(0, -1.2, -1.55); P.add(boxUV(endWall.toNonIndexed(), 1.6), 'stone_dark');
      const pit = new THREE.PlaneGeometry(2.0, 3.2); pit.rotateX(-Math.PI / 2); pit.translate(0, -2.4, 0); P.add(pit, 'dark_void');
      // 縁石
      for (const [x, z, w, d] of [[-1.05, 0, 0.14, 3.2], [1.05, 0, 0.14, 3.2], [0, 1.55, 2.24, 0.14]]) { const b = block(P, w, 0.12, d, { r: 0.03, chip: 0.8, seed: x * 9 + z }); b.translate(x, 0.06, z); P.add(b, 'stone_pale'); }
      const marker = block(P, 0.3, 1.0, 0.3, { r: 0.04, chip: 1, seed: 7 }); marker.translate(-1.5, 0.5, 1.5); addMossy(P, marker, 'stone_block', { up: 0.6 });
      const gem = new THREE.OctahedronGeometry(0.1, 0); gem.translate(-1.5, 1.15, 1.5); P.add(gem, 'glow_core');
      P.light([-1.5, 1.2, 1.5], 0x7fe6ff, 0.8, 4); P.light([0, -1.6, -0.6], 0x3a7aa0, 0.6, 3);
    },
  },

  // ───── 仕掛け ─────
  gimmick_sealed_rune_door: {
    dir: 'modules', cat: 'gimmick', origin: NEW, tex: 1024, pivot: 'as-built',
    name: '封印の石扉', desc: '開口（幅2m・高さ3m）をふさぐ一枚岩の扉。中央に光る封印の円陣。鍵・仕掛けで開く扉用。mod_wall_doorway_4m にはまる。原点＝床面中央。',
    build(P) {
      const sh = new THREE.Shape(); sh.moveTo(-0.98, 0); sh.lineTo(0.98, 0); sh.lineTo(0.98, 2.0); sh.absarc(0, 2.0, 0.98, 0, Math.PI, false); sh.lineTo(-0.98, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 20 });
      g.translate(0, 0, -0.3);
      const ng = g.toNonIndexed(); ng.computeVertexNormals();
      // 正面は円陣が中央に来る UV、その他は箱投影
      const p = ng.attributes.position, n = ng.attributes.normal, uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) { if (n.getZ(i) > 0.9) { uv[i * 2] = p.getX(i) / 2.0 + 0.5; uv[i * 2 + 1] = 1 - (p.getY(i) - 0.55) / 2.0; } else { uv[i * 2] = (p.getX(i) + p.getZ(i)) / 1.5; uv[i * 2 + 1] = p.getY(i) / 1.5; } }
      ng.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      // 扉の本体は風化石、正面中央に封印の円盤を1枚だけ重ねる（円陣が繰り返さないように）
      boxUV(ng, 1.4); P.add(ng, 'stone_block');
      const disc = new THREE.CircleGeometry(0.88, 48); const dp = disc.attributes.position, du = disc.attributes.uv;
      for (let i = 0; i < dp.count; i++) du.setXY(i, dp.getX(i) / 2.1 + 0.5, 0.5 - dp.getY(i) / 2.1);
      disc.translate(0, 1.6, -0.012); P.add(disc, 'rune_stone');
      P.light([0, 1.5, 0.5], 0x5fe0ff, 1.0, 4);
      P.marker('interact', [0, 0, 1.2]);
    },
  },

  gimmick_pressure_plate: {
    dir: 'modules', cat: 'gimmick', origin: NEW, tex: 256, pivot: 'as-built',
    name: '踏み板の仕掛け', desc: '床にはめ込まれた1.2m角の踏み板。縁の溝が青く光る（作動時に強さを変える想定）。上面 y≒0.03。',
    build(P) {
      const frame = [[0, 0.68, 1.5, 0.16], [0, -0.68, 1.5, 0.16], [0.68, 0, 0.16, 1.2], [-0.68, 0, 0.16, 1.2]];
      frame.forEach(([x, z, w, d], i) => { const b = block(P, w, 0.1, d, { r: 0.02, chip: 0.8, seed: i }); b.translate(x, -0.03, z); P.add(b, 'stone_dark'); });
      const plate = block(P, 1.1, 0.12, 1.1, { r: 0.03, chip: 0.4, seed: 9, tile: 1.2 }); plate.translate(0, -0.03, 0); P.add(plate, 'stone_pale');
      for (const [x, z, w, d] of [[0, 0.575, 1.16, 0.03], [0, -0.575, 1.16, 0.03], [0.575, 0, 0.03, 1.16], [-0.575, 0, 0.03, 1.16]]) { const gl = new THREE.BoxGeometry(w, 0.02, d); gl.translate(x, 0.0, z); P.add(gl, 'glow_core'); }
      const sym = new THREE.RingGeometry(0.18, 0.23, 24); sym.rotateX(-Math.PI / 2); sym.translate(0, 0.035, 0); P.add(sym, 'glow_core');
      P.light([0, 0.3, 0], 0x7fe6ff, 0.5, 2.5);
    },
  },

  gimmick_root_lever: {
    dir: 'modules', cat: 'gimmick', origin: NEW, tex: 256,
    name: '根の巻き付いたレバー', desc: '石の台座から伸びる木のレバー（高さ約1.3m）。根が巻き付き、先端の結晶が光る。仕掛けの起動点。回転軸を markers に記録。',
    build(P) {
      const base = block(P, 0.7, 0.5, 0.5, { r: 0.04, chip: 1, seed: 1 }); base.translate(0, 0.25, 0); addMossy(P, base, 'stone_block', { up: 0.6 });
      const slot = block(P, 0.1, 0.05, 0.36, { r: 0.01, seed: 2 }); slot.translate(0, 0.51, 0); P.add(slot, 'dark_void');
      const axle = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 10); axle.rotateZ(Math.PI / 2); axle.translate(0, 0.52, 0); P.add(boxUV(axle.toNonIndexed(), 0.3), 'iron');
      const arm = tube(P, [V(0, 0.52, 0), V(0, 0.9, 0.12), V(0, 1.25, 0.25)], 0.04, { radial: 8, bark: 0.05 }); P.add(arm, 'wood_dark');
      const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14, a = t * Math.PI * 6; pts.push(V(Math.cos(a) * 0.055, 0.55 + t * 0.65, 0.02 + t * 0.2 + Math.sin(a) * 0.055)); }
      P.add(tube(P, pts, 0.012, { radial: 5, bark: 0.05 }), 'root');
      const gem = crystalShard(P, 0.18, 0.05, { seed: 3 }); gem.translate(0, 1.25, 0.26); P.add(gem, 'crystal_cyan');
      P.light([0, 1.35, 0.3], 0x55d8ff, 0.5, 2);
      P.marker('pivot', [0, 0.52, 0]); P.marker('interact', [0, 0, 0.9]);
    },
  },

  gimmick_root_curtain_shortcut: {
    dir: 'modules', cat: 'gimmick', origin: NEW, tex: 256, pivot: 'as-built',
    name: '根のカーテン（近道）', desc: '開口をふさぐ垂れ根の幕（幅2m・高さ3m）。片側からだけ押し通れる近道の表現用。mod_wall_doorway_4m にはまる。原点＝床面中央。',
    build(P) {
      const R = P.rng;
      P.add(tube(P, [V(-1.1, 3.0, 0), V(0, 3.15, 0.05), V(1.1, 3.0, 0)], 0.09, { radial: 8, bark: 0.12 }), 'bark');
      for (let i = 0; i < 26; i++) {
        const x = -0.95 + i * 0.076 + (R() - 0.5) * 0.03, L = 2.3 + R() * 0.7;
        const pts = []; for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push(V(x + Math.sin(t * 4 + i) * 0.04, 3.05 - L * t, (R() - 0.5) * 0.06 + t * t * 0.08)); }
        P.add(tube(P, pts, (t) => 0.022 * (1 - t * 0.7), { radial: 5, perMeter: 5, bark: 0.08, seed: i }), 'root');
      }
      for (let i = 0; i < 10; i++) { const s = new THREE.IcosahedronGeometry(0.03, 1); s.translate(-0.9 + R() * 1.8, 0.6 + R() * 2.2, 0.06); P.add(s, 'glow_core'); }
      P.light([0, 1.5, 0.4], 0x7fe6ff, 0.4, 3);
    },
  },

  // ───── 採集ポイント ─────
  gather_herb_point: {
    dir: 'modules', cat: 'gather', origin: NEW, tex: 256, pivot: 'ground',
    name: '採集ポイント：薬草', desc: '光る薬草とシダの茂み（径約1.4m）。小石の輪で採集地点だと分かるようにする。',
    build(P) {
      const R = P.rng;
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const s = rock(P, { r: 0.08 + R() * 0.04, detail: 1, sy: 0.6, rough: 0.3, seed: k }); s.translate(Math.cos(a) * 0.75, 0.02, Math.sin(a) * 0.75); P.add(s, 'stone_block'); }
      const mound = rock(P, { r: 0.65, detail: 2, sy: 0.15, rough: 0.2, seed: 3 }); P.add(mound, 'soil');
      fern(P, [0.2, 0.06, -0.2], 0.55, { seed: 1 }); fern(P, [-0.3, 0.05, 0.15], 0.45, { seed: 2 });
      for (let i = 0; i < 9; i++) {
        const a = R() * 6.28, d = R() * 0.45, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.25 + R() * 0.2;
        P.add(tube(P, [V(x, 0.05, z), V(x + 0.02, h * 0.6, z), V(x + (R() - 0.5) * 0.08, h, z)], 0.006, { radial: 4, bark: 0 }), 'root');
        for (let k = 0; k < 3; k++) { const lf = leafBlade(0.12, 0.04, { segs: 3, droop: 0.4 }); lf.applyMatrix4(M([x, h * (0.4 + k * 0.2), z], [0.8, R() * 6.28, 0])); P.add(lf, 'leaf_glow'); }
        const bud = new THREE.IcosahedronGeometry(0.03, 1); bud.translate(x, h + 0.02, z); P.add(bud, 'glow_core');
      }
      P.light([0, 0.5, 0], 0x7fe6ff, 0.6, 3);
      P.marker('interact', [0, 0, 1.1]);
    },
  },

  gather_mining_point: {
    dir: 'modules', cat: 'gather', origin: NEW, tex: 512, pivot: 'ground',
    name: '採集ポイント：採掘', desc: '結晶の鉱脈が走る岩（幅約2m）。割れた面と散らばった鉱石、突き立てたつるはし。',
    build(P) {
      const R = P.rng;
      const rk = rock(P, { r: 1.0, detail: 4, sy: 0.75, rough: 0.32, crisp: 1, flat: -0.5, seed: 4, tile: 1.4 }); rk.translate(0, 0.35, 0); addMossy(P, rk, 'stone_dark', { up: 0.6, patch: 0.5 });
      for (let i = 0; i < 6; i++) { const a = -0.8 + i * 0.3; const g = crystalShard(P, 0.3 + R() * 0.3, 0.07, { seed: i }); g.applyMatrix4(M([Math.sin(a) * 0.85, 0.55 + R() * 0.4, Math.cos(a) * 0.75], [1.2, a, (R() - 0.5) * 0.6])); P.add(g, 'crystal_cyan'); }
      for (let i = 0; i < 7; i++) { const o = rock(P, { r: 0.08 + R() * 0.07, detail: 1, rough: 0.4, crisp: 1, seed: 20 + i }); o.translate((R() - 0.3) * 1.6, 0.04, 0.8 + R() * 0.5); P.add(o, 'stone_dark'); if (i % 2) { const c = crystalShard(P, 0.12, 0.03, { seed: 30 + i }); c.translate((R() - 0.3) * 1.4, 0.0, 0.9 + R() * 0.4); P.add(c, 'crystal_cyan'); } }
      P.add(tube(P, [V(0.35, 0.2, 1.1), V(0.3, 0.9, 0.85)], 0.025, { radial: 6, bark: 0.03 }), 'wood_dark');
      const head = tube(P, [V(0.0, 0.92, 0.95), V(0.3, 1.0, 0.82), V(0.6, 0.9, 0.7)], (t) => 0.03 * (1 - Math.abs(t - 0.5) * 1.2), { radial: 6, bark: 0 }); P.add(head, 'iron');
      P.light([0, 0.9, 0.8], 0x55d8ff, 0.7, 3.5);
      P.marker('interact', [0, 0, 1.6]);
    },
  },

  gather_logging_point: {
    dir: 'modules', cat: 'gather', origin: NEW, tex: 512, pivot: 'ground',
    name: '採集ポイント：伐採', desc: '倒れた太枝（長さ約2.4m）。斧の切り込みから光る樹液がにじむ。脇に割った薪。',
    build(P) {
      const R = P.rng;
      const g = tube(P, [V(-1.2, 0.3, 0), V(0, 0.33, 0.1), V(1.2, 0.28, 0)], (t) => 0.32 - t * 0.06, { radial: 18, perMeter: 6, bark: 0.14, seed: 3 }); addMossy(P, g, 'bark', { up: 0.6 });
      for (const x of [-1.2, 1.2]) { const c = new THREE.CircleGeometry(x < 0 ? 0.32 : 0.26, 18); c.rotateY(x < 0 ? -Math.PI / 2 : Math.PI / 2); c.translate(x, x < 0 ? 0.3 : 0.28, 0); P.add(boxUV(c.toNonIndexed(), 0.5), 'wood'); }
      for (let i = 0; i < 3; i++) { const cut = block(P, 0.08, 0.2, 0.25, { r: 0.01, seed: i }); cut.applyMatrix4(M([0.2 + i * 0.12, 0.55, 0.15], [0.3, 0, 0.5])); P.add(cut, 'dark_void'); }
      const sap = new THREE.IcosahedronGeometry(0.05, 1); sap.scale(1, 1.6, 1); sap.translate(0.32, 0.5, 0.3); P.add(sap, 'glow_warm');
      const sap2 = new THREE.IcosahedronGeometry(0.03, 1); sap2.translate(0.26, 0.42, 0.33); P.add(sap2, 'glow_warm');
      for (let i = 0; i < 4; i++) { const w = lathe(P, [[0.0001, 0], [0.09, 0], [0.09, 0.45], [0.0001, 0.45]], { seg: 3, tile: 0.4 }); w.applyMatrix4(M([0.6 + R() * 0.5, 0.08, 0.6 + R() * 0.3], [Math.PI / 2, R() * 3, 0])); P.add(w, 'wood'); }
      P.light([0.3, 0.6, 0.4], 0xffb060, 0.5, 2.5);
      P.marker('interact', [0, 0, 1.2]);
    },
  },

  // ───── 環境演出 ─────
  fern_cluster: {
    dir: 'props', cat: 'nature', origin: NEW, tex: 256, pivot: 'ground',
    name: 'シダの茂み', desc: '大小のシダ3株（径約1.5m）。壁際や柱の根元の隙間を埋め、床と壁の境目を柔らかくする。',
    build(P) { fern(P, [0, 0, 0], 0.8, { seed: 1 }); fern(P, [0.55, 0, 0.3], 0.5, { seed: 2 }); fern(P, [-0.45, 0, 0.35], 0.45, { seed: 3, mat: 'leaf_glow' }); },
  },

  glow_moss_floor_patch: {
    dir: 'props', cat: 'glow', origin: NEW, tex: 256, pivot: 'ground',
    name: '光る苔の床', desc: '床に広がる苔の塊と小さな光る芽（約2m）。暗い通路で進行方向を示す光の点として並べる。',
    build(P) {
      const R = P.rng;
      for (let i = 0; i < 6; i++) { const m = rock(P, { r: 0.3 + R() * 0.3, detail: 2, sy: 0.15, rough: 0.35, seed: i }); m.translate((R() - 0.5) * 1.4, 0, (R() - 0.5) * 1.4); P.add(m, 'moss'); }
      for (let i = 0; i < 24; i++) { const x = (R() - 0.5) * 1.6, z = (R() - 0.5) * 1.6, h = 0.03 + R() * 0.08; P.add(tube(P, [V(x, 0.0, z), V(x, h, z)], 0.004, { radial: 3, bark: 0 }), 'root'); const b = new THREE.IcosahedronGeometry(0.012 + R() * 0.01, 0); b.translate(x, h, z); P.add(b, 'glow_core'); }
      P.light([0, 0.3, 0], 0x7fe6ff, 0.4, 2.5);
    },
  },

  foe_trampled_path: {
    dir: 'props', cat: 'foe', origin: NEW, tex: 512, pivot: 'as-built',
    name: 'FOEの踏み荒らし跡', desc: '何かが繰り返し通った跡（4m×1.6m）。ちぎれた根、こすれた溝、倒れたシダ。FOE の巡回路の床に重ねる。上面 y≒0。',
    build(P) {
      const R = P.rng, N = P.noise;
      const g = new THREE.PlaneGeometry(4, 1.6, 80, 32); g.rotateX(-Math.PI / 2); g.deleteAttribute('normal');
      const p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const e = Math.max(0, 1 - Math.abs(z) / 0.8); let d = 0; for (const o of [-0.35, 0, 0.35]) d = Math.max(d, Math.max(0, 1 - Math.abs(z - o - Math.sin(x * 0.8) * 0.08) / 0.06) * 0.04); p.setY(i, (-d + N(x * 3, 0, z * 3) * 0.015) * Math.min(1, e * 3) * Math.min(1, (2 - Math.abs(x)) * 3)); uv.setXY(i, x / 1.5, z / 1.5); }
      g.computeVertexNormals(); P.add(g, 'soil');
      for (let i = 0; i < 8; i++) { const x = -1.8 + i * 0.5, z = (R() - 0.5) * 1.2; const r = tube(P, [V(x, 0.02, z), V(x + 0.2, 0.06, z + 0.1), V(x + 0.3 + R() * 0.2, 0.03 + R() * 0.1, z + 0.25)], (t) => 0.035 * (1 - t * 0.5), { radial: 6, bark: 0.1, seed: i }); P.add(r, 'root'); }
      for (let i = 0; i < 3; i++) { const lf = leafBlade(0.5, 0.06, { segs: 4, droop: 0.05, curl: 0.1 }); lf.applyMatrix4(M([(R() - 0.5) * 3, 0.02, (R() - 0.5) * 1.2], [-Math.PI / 2 + 0.05, R() * 6, 0])); P.add(lf, 'leaf'); }
      pebbles(P, [0, 0, 0], 1.8, 12, { seed: 3, size: 0.06, mat: 'stone_dark' });
    },
  },
};
