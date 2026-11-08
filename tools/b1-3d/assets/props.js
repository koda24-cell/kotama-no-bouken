// 探索用の小物・扉・宝箱・吊り物・FOE の痕跡
import * as THREE from 'three';
import { tube, rock, lathe, block, boxUV, M, V, chain, leafBlade, crystalShard } from '../lib/geo.js';
import { addMossy, groundRoot, hangingVine, crystalCluster, pebbles, flame, mushroom } from '../lib/kit.js';

const GPT = 'GPT試作40点（名称・用途）を作り直し';

// 骨1本（両端がふくらむ）
function bone(P, a, b, r, seed = 0) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), mid = A.clone().lerp(B, 0.5); mid.y += r * 0.5;
  P.add(tube(P, [A, mid, B], (t) => r * (1 + 0.9 * Math.pow(Math.abs(t - 0.5) * 2, 6)), { radial: 8, perMeter: 14, bark: 0.03, seed }), 'bone');
  for (const p of [A, B]) { const k = rock(P, { r: r * 1.7, detail: 1, sy: 0.8, rough: 0.15, flat: -2, seed: seed + 1 }); k.translate(p.x, p.y, p.z); P.add(k, 'bone'); }
}

export default {
  sealed_treasure_chest: {
    dir: 'props', cat: 'interact', origin: GPT, tex: 512,
    name: '封印された宝箱', desc: '幅約1mの木製宝箱。鉄の帯と角金具、丸みのある蓋、錠前に青く光る封印。開閉用に蓋の回転軸を markers に記録（蓋は別メッシュではない）。',
    build(P) {
      const body = block(P, 1.0, 0.5, 0.62, { r: 0.03, chip: 0.4, seed: 1, tile: 0.8 }); body.translate(0, 0.25, 0); P.add(body, 'wood');
      const lid = new THREE.CylinderGeometry(0.31, 0.31, 1.0, 20, 1, false, -Math.PI / 2, Math.PI); lid.rotateX(-Math.PI / 2); lid.rotateY(Math.PI / 2); lid.translate(0, 0.5, 0);
      P.add(boxUV(lid.toNonIndexed(), 0.8), 'wood');
      for (const x of [-0.42, 0, 0.42]) {
        const band = block(P, 0.07, 0.52, 0.66, { r: 0.012, chip: 0.2, seed: x * 10 + 5 }); band.translate(x, 0.25, 0); P.add(band, 'iron');
        const arc = new THREE.TorusGeometry(0.325, 0.022, 6, 18, Math.PI); arc.rotateY(Math.PI / 2); arc.translate(x, 0.5, 0); P.add(boxUV(arc.toNonIndexed(), 0.3), 'iron');
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = block(P, 0.1, 0.1, 0.1, { r: 0.015, seed: sx + sz * 3 }); c.translate(sx * 0.47, 0.06, sz * 0.29); P.add(c, 'iron'); }
      const lock = block(P, 0.16, 0.2, 0.06, { r: 0.02, seed: 9 }); lock.translate(0, 0.46, 0.33); P.add(lock, 'bronze');
      const seal = new THREE.TorusGeometry(0.055, 0.012, 6, 20); seal.translate(0, 0.46, 0.37); P.add(seal, 'glow_core');
      const gem = new THREE.IcosahedronGeometry(0.03, 1); gem.translate(0, 0.46, 0.37); P.add(gem, 'glow_core');
      P.light([0, 0.5, 0.55], 0x7fe6ff, 0.4, 2);
      P.marker('lid_hinge', [0, 0.5, -0.31]); P.marker('interact', [0, 0, 1.0]);
      const base = rock(P, { r: 0.75, detail: 2, sy: 0.08, rough: 0.2, seed: 3 }); P.add(base, 'soil');
    },
  },

  ancient_wooden_door: {
    dir: 'props', cat: 'gimmick', origin: GPT, tex: 512, pivot: 'as-built',
    name: '古代の木の扉', desc: '石の枠にはまった両開きの木の扉（開口 幅2m・高さ3m、枠込み幅3.2m）。鉄の帯と輪の取っ手。壁モジュールの開口に合わせた寸法。原点＝床面中央、扉面は z=0。',
    build(P) {
      for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const b = block(P, 0.55, 0.5, 0.75, { r: 0.04, chip: 0.9, seed: k + (s > 0 ? 10 : 0) }); b.translate(s * 1.28, 0.25 + k * 0.5, -0.1); addMossy(P, b, 'stone_wall', { up: 0.6 }); }
      for (let k = 0; k < 7; k++) { const a = Math.PI * (k + 0.5) / 7; const b = block(P, 0.5, 0.5, 0.75, { r: 0.04, chip: 0.9, seed: 30 + k }); b.applyMatrix4(M([-Math.cos(a) * 1.28, 3.0 + Math.sin(a) * 0.55, -0.1], [0, 0, a - Math.PI / 2])); addMossy(P, b, k === 3 ? 'rune_stone' : 'stone_wall', { up: 0.6 }); }
      for (const s of [-1, 1]) {
        const pl = block(P, 3.0, 0.98, 0.12, { r: 0.015, chip: 0.3, seed: s + 50, tile: 1.2 }); pl.applyMatrix4(M([s * 0.5, 1.5, -0.06], [0, 0, Math.PI / 2])); P.add(pl, 'wood_dark');
        for (const y of [0.5, 1.5, 2.5]) { const st = block(P, 0.9, 0.09, 0.03, { r: 0.008, seed: y * 7 + s }); st.translate(s * 0.5, y, 0.02); P.add(st, 'iron'); }
        const ring = new THREE.TorusGeometry(0.08, 0.014, 6, 16); ring.translate(s * 0.14, 1.35, 0.05); P.add(boxUV(ring.toNonIndexed(), 0.2), 'iron');
      }
      const top = new THREE.CircleGeometry(1.0, 20, 0, Math.PI); top.translate(0, 3.0, -0.06); P.add(boxUV(top.toNonIndexed(), 1), 'wood_dark');
      P.marker('hinge_left', [-1.0, 0, 0]); P.marker('hinge_right', [1.0, 0, 0]);
      P.light([0, 3.55, 0.4], 0x5fe0ff, 0.4, 3);
    },
  },

  blue_wisp_torch: {
    dir: 'props', cat: 'glow', origin: GPT, tex: 256,
    name: '青白い灯火', desc: '鉄の三脚台と火皿に青白い炎（高さ約1.5m）。通路の曲がり角や部屋の入口に置く光源。',
    build(P) {
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; P.add(tube(P, [V(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35), V(Math.cos(a) * 0.18, 0.7, Math.sin(a) * 0.18), V(0, 1.15, 0)], 0.022, { radial: 6, bark: 0 }), 'iron'); }
      const ring = new THREE.TorusGeometry(0.2, 0.015, 6, 18); ring.rotateX(Math.PI / 2); ring.translate(0, 0.65, 0); P.add(boxUV(ring.toNonIndexed(), 0.3), 'iron');
      const bowl = lathe(P, [[0.0001, 1.1], [0.1, 1.12], [0.24, 1.22], [0.27, 1.3], [0.25, 1.31], [0.0001, 1.24]], { seg: 16, tile: 0.4 }); P.add(bowl, 'iron_rusty');
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const sp = lathe(P, [[0.02, 0], [0.0001, 0.08]], { seg: 4 }); sp.applyMatrix4(M([Math.cos(a) * 0.26, 1.3, Math.sin(a) * 0.26], [0.3 * Math.sin(a), 0, -0.3 * Math.cos(a)])); P.add(sp, 'iron'); }
      flame(P, [0, 1.25, 0], 0.4, { intensity: 1.8 });
    },
  },

  ancient_ruin_bookshelf: {
    dir: 'props', cat: 'ruins', origin: GPT, tex: 256,
    name: '遺跡の本棚', desc: '朽ちかけた木の本棚（幅1.6m・高さ2.2m）。崩れた本、倒れた本、苔。棚板の1枚が落ちている。調べる地点に。',
    build(P) {
      const R = P.rng;
      for (const s of [-1, 1]) { const sd = block(P, 0.08, 2.2, 0.45, { r: 0.01, chip: 0.6, seed: s }); sd.translate(s * 0.78, 1.1, 0); P.add(sd, 'wood_dark'); }
      const back = block(P, 1.5, 2.15, 0.04, { r: 0.005, seed: 3 }); back.translate(0, 1.1, -0.2); P.add(back, 'wood_dark');
      const top = block(P, 1.7, 0.08, 0.5, { r: 0.01, chip: 0.6, seed: 4 }); top.translate(0, 2.22, 0); addMossy(P, top, 'wood_dark', { up: 0.6 });
      const covers = ['cloth', 'wood_dark', 'bone'];
      for (let sh = 0; sh < 4; sh++) {
        const y = 0.08 + sh * 0.53;
        const fallen = sh === 2;
        const board = block(P, 1.5, 0.05, 0.42, { r: 0.008, chip: 0.5, seed: 10 + sh }); board.applyMatrix4(M([0, y, 0], [0, 0, fallen ? 0.2 : 0])); if (fallen) board.translate(0, -0.08, 0); P.add(board, 'wood');
        let x = -0.7;
        while (x < 0.68 && !fallen) {
          const w = 0.04 + R() * 0.05, h = 0.3 + R() * 0.15;
          if (R() < 0.15) { x += 0.08; continue; }
          const lean = R() < 0.15 ? 0.35 : (R() - 0.5) * 0.06;
          const b = block(P, w, h, 0.3, { r: 0.006, chip: 0.3, seed: sh * 50 + Math.round(x * 100), tile: 0.5 });
          b.applyMatrix4(M([x + w / 2, y + 0.025 + h / 2 - (lean > 0.2 ? 0.03 : 0), 0.02], [0, 0, lean])); P.add(b, R() < 0.5 ? 'cloth' : covers[(R() * 3) | 0]);
          x += w + 0.005 + (lean > 0.2 ? 0.08 : 0);
        }
      }
      for (let i = 0; i < 6; i++) { const b = block(P, 0.32, 0.06, 0.24, { r: 0.006, seed: 90 + i, tile: 0.5 }); b.applyMatrix4(M([(R() - 0.5) * 1.6, 0.03 + i * 0.03 * (i < 3 ? 1 : 0), 0.45 + R() * 0.5], [0, R() * 3, (R() - 0.5) * 0.1])); P.add(b, i % 2 ? 'cloth' : 'wood_dark'); }
      hangingVine(P, [0.5, 2.25, 0.2], 1.0, { seed: 2, glow: false });
    },
  },

  sealed_alchemy_vessel: {
    dir: 'props', cat: 'interact', origin: GPT, tex: 256,
    name: '封印された錬金容器', desc: '青銅の壺（高さ約1.2m）を鎖で縛り、蓋に光る封印。石の台に載る。素材・イベント用の調べる地点に。',
    build(P) {
      const st = block(P, 0.9, 0.2, 0.9, { r: 0.03, chip: 1, seed: 1 }); st.translate(0, 0.1, 0); addMossy(P, st, 'stone_block', { up: 0.6 });
      const pot = lathe(P, [[0.0001, 0.2], [0.22, 0.21], [0.32, 0.3], [0.4, 0.55], [0.38, 0.8], [0.22, 0.98], [0.17, 1.05], [0.2, 1.1], [0.0001, 1.1]], { seg: 28, tile: 0.6, noise: 0.015 }); P.add(pot, 'bronze');
      const lid = lathe(P, [[0.21, 1.1], [0.18, 1.18], [0.07, 1.24], [0.05, 1.3], [0.08, 1.34], [0.0001, 1.36]], { seg: 20, tile: 0.4 }); P.add(lid, 'bronze');
      for (const y of [0.52, 0.72]) { const ring = new THREE.TorusGeometry(y === 0.52 ? 0.405 : 0.39, 0.012, 5, 28); ring.rotateX(Math.PI / 2); ring.translate(0, y, 0); P.add(boxUV(ring.toNonIndexed(), 0.3), 'bronze'); }
      for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4; P.add(chain(P, [Math.cos(a) * 0.42, 0.2, Math.sin(a) * 0.42], [Math.cos(a) * 0.12, 1.25, Math.sin(a) * 0.12], { link: 0.07, thick: 0.012, sag: -0.08 }), 'iron'); }
      const seal = new THREE.TorusGeometry(0.06, 0.012, 6, 20); seal.rotateX(Math.PI / 2); seal.translate(0, 1.3, 0); P.add(seal, 'glow_violet');
      const tag = block(P, 0.12, 0.2, 0.01, { r: 0.002, seed: 7 }); tag.translate(0, 0.9, 0.39); P.add(tag, 'silk');
      P.light([0, 1.4, 0], 0xb890ff, 0.5, 2);
    },
  },

  abandoned_mine_cart: {
    dir: 'props', cat: 'props', origin: GPT, tex: 256,
    name: '放棄された採掘車', desc: '線路の上に止まった木と鉄の採掘車（長さ約1.5m）。中に光る鉱石。採掘ポイントの近くに置く。',
    build(P) {
      for (const z of [-0.36, 0.36]) { const rl = block(P, 3.2, 0.06, 0.06, { r: 0.008, seed: z * 10 }); rl.translate(0, 0.13, z); P.add(rl, 'iron_rusty'); }
      for (let i = 0; i < 6; i++) { const sl = block(P, 0.16, 0.08, 1.0, { r: 0.01, chip: 0.6, seed: i, tile: 0.8 }); sl.applyMatrix4(M([-1.4 + i * 0.56, 0.05, 0], [0, (i % 2 - 0.5) * 0.08, 0])); P.add(sl, 'wood_dark'); }
      const box = lathe(P, [[0.5, 0.0], [0.62, 0.55]], { seg: 4, tile: 0.8 }); box.rotateY(Math.PI / 4); box.scale(1.25, 1, 0.85); box.translate(0, 0.38, 0); box.applyMatrix4(new THREE.Matrix4());
      P.add(box, 'wood');
      const floor = block(P, 0.88, 0.04, 0.6, { r: 0.005, seed: 3 }); floor.translate(0, 0.4, 0); P.add(floor, 'wood');
      const rim = new THREE.TorusGeometry(0.62 * Math.SQRT1_2 * 1.42, 0.02, 4, 4); rim.rotateX(Math.PI / 2); rim.rotateY(Math.PI / 4); rim.scale(1.25, 1, 0.85); rim.translate(0, 0.93, 0); P.add(boxUV(rim.toNonIndexed(), 0.3), 'iron');
      for (const x of [-0.42, 0.42]) for (const z of [-0.36, 0.36]) {
        const w = new THREE.CylinderGeometry(0.15, 0.15, 0.06, 16); w.rotateX(Math.PI / 2); w.translate(x, 0.31, z); P.add(boxUV(w.toNonIndexed(), 0.3), 'iron_rusty');
        const hub = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8); hub.rotateX(Math.PI / 2); hub.translate(x, 0.31, z); P.add(boxUV(hub.toNonIndexed(), 0.3), 'iron');
      }
      const ore = rock(P, { r: 0.33, detail: 2, sy: 0.6, rough: 0.35, seed: 4 }); ore.translate(0, 0.78, 0); P.add(ore, 'stone_dark');
      crystalCluster(P, [0.1, 0.88, 0.05], 5, 0.35, { seed: 3, spread: 0.12 });
      pebbles(P, [0.9, 0, 0.6], 0.5, 6, { seed: 3, mat: 'stone_dark' });
    },
  },

  ancient_iron_gate: {
    dir: 'props', cat: 'gimmick', origin: GPT, tex: 256, pivot: 'as-built',
    name: '古代の鉄格子門', desc: '石の門柱の間に落とし格子（幅3.2m・高さ約3.4m）。槍先の付いた縦棒と横帯、1本は曲がっている。原点＝床面中央、格子面は z=0。',
    build(P) {
      for (const s of [-1, 1]) {
        const post = block(P, 0.6, 3.4, 0.8, { r: 0.05, chip: 1, seed: s, tile: 1.6 }); post.translate(s * 1.9, 1.7, -0.1); addMossy(P, post, 'stone_wall', { up: 0.6 });
        const cap = block(P, 0.75, 0.25, 0.95, { r: 0.04, chip: 1.2, seed: s + 5 }); cap.translate(s * 1.9, 3.52, -0.1); addMossy(P, cap, 'stone_block', { up: 0.6 });
      }
      const lintel = block(P, 4.4, 0.45, 0.8, { r: 0.05, chip: 1, seed: 9, tile: 1.6 }); lintel.translate(0, 3.42, -0.1); addMossy(P, lintel, 'stone_wall', { up: 0.6 });
      for (let i = 0; i < 11; i++) {
        const x = -1.5 + i * 0.3, bent = i === 3;
        const pts = bent ? [V(x, 0.15, 0), V(x + 0.05, 1.0, 0.12), V(x - 0.03, 1.6, 0.05), V(x, 3.2, 0)] : [V(x, 0.15, 0), V(x, 3.2, 0)];
        P.add(tube(P, pts, 0.028, { radial: 6, perMeter: 3, bark: 0 }), 'iron_rusty');
        const sp = lathe(P, [[0.045, 0], [0.0001, 0.16]], { seg: 4 }); sp.translate(x + (bent ? 0 : 0), 0.0, 0); P.add(sp, 'iron');
      }
      for (const y of [0.6, 1.6, 2.6]) { const bar = block(P, 3.2, 0.08, 0.05, { r: 0.01, seed: y * 3 }); bar.translate(0, y, 0); P.add(bar, 'iron'); }
      P.add(chain(P, [-1.6, 3.15, 0.05], [-1.6, 2.4, 0.08], { sag: 0.02 }), 'iron');
      P.marker('raise_axis', [0, 3.2, 0]);
    },
  },

  rusted_hanging_cage: {
    dir: 'props', cat: 'props', origin: GPT, tex: 256, pivot: 'as-built',
    name: '吊り下げ檻', desc: '鎖で吊られた錆びた鉄の檻（高さ約1.8m）。中に骨。扉は外れかけ。原点＝吊り元（上端）。',
    build(P) {
      P.add(chain(P, [0, 0, 0], [0, -1.0, 0], { sag: 0 }), 'iron');
      const top = lathe(P, [[0.0001, -1.0], [0.15, -1.05], [0.42, -1.25], [0.5, -1.35], [0.0001, -1.35]], { seg: 14, tile: 0.4 }); P.add(top, 'iron_rusty');
      const bot = new THREE.CylinderGeometry(0.5, 0.5, 0.06, 14); bot.translate(0, -2.75, 0); P.add(boxUV(bot.toNonIndexed(), 0.4), 'iron_rusty');
      for (let k = 0; k < 14; k++) { if (k === 3 || k === 4) continue; const a = k / 14 * Math.PI * 2; P.add(tube(P, [V(Math.cos(a) * 0.5, -1.35, Math.sin(a) * 0.5), V(Math.cos(a) * 0.52, -2.05, Math.sin(a) * 0.52), V(Math.cos(a) * 0.5, -2.75, Math.sin(a) * 0.5)], 0.016, { radial: 5, perMeter: 3, bark: 0 }), 'iron_rusty'); }
      for (const y of [-1.8, -2.3]) { const r = new THREE.TorusGeometry(0.51, 0.016, 4, 20); r.rotateX(Math.PI / 2); r.translate(0, y, 0); P.add(boxUV(r.toNonIndexed(), 0.3), 'iron'); }
      // 外れかけた扉
      const door = new THREE.Group();
      for (let k = 0; k < 3; k++) P.add(tube(P, [V(0.5 + k * 0.12, -1.4, 0.35 + k * 0.08), V(0.55 + k * 0.12, -2.6, 0.42 + k * 0.08)], 0.016, { radial: 5, bark: 0 }), 'iron_rusty');
      bone(P, [-0.2, -2.68, 0.1], [0.25, -2.7, -0.15], 0.03, 1);
      const skull = rock(P, { r: 0.11, detail: 2, sy: 0.85, rough: 0.05, flat: -2, seed: 2 }); skull.translate(-0.15, -2.62, -0.2); P.add(skull, 'bone');
    },
  },

  hanging_altar_chains: {
    dir: 'props', cat: 'props', origin: GPT, tex: 256,
    name: '祭壇の鎖', desc: '石柱2本に渡した梁から垂れる鎖と札（幅約2.6m・高さ約2.8m）。祭壇の背後や封印区画の雰囲気づくりに。',
    build(P) {
      const R = P.rng;
      for (const s of [-1, 1]) { const p = block(P, 0.35, 2.8, 0.35, { r: 0.04, chip: 1, seed: s, tile: 1.4 }); p.translate(s * 1.2, 1.4, 0); addMossy(P, p, 'stone_block', { up: 0.6 }); }
      const beam = block(P, 2.8, 0.22, 0.25, { r: 0.03, chip: 0.6, seed: 5 }); beam.translate(0, 2.75, 0); addMossy(P, beam, 'wood_dark', { up: 0.6 });
      for (let i = 0; i < 6; i++) {
        const x = -0.85 + i * 0.34, L = 0.8 + R() * 1.2;
        P.add(chain(P, [x, 2.64, 0], [x + (R() - 0.5) * 0.05, 2.64 - L, 0], { sag: 0, link: 0.07, thick: 0.012 }), 'iron');
        if (i % 2 === 0) { const tag = block(P, 0.1, 0.24, 0.01, { r: 0.002, seed: i }); tag.translate(x, 2.64 - L - 0.13, 0); P.add(tag, 'silk'); }
        else { const w = new THREE.IcosahedronGeometry(0.05, 1); w.translate(x, 2.64 - L - 0.05, 0); P.add(w, 'glow_core'); }
      }
      P.light([0, 1.7, 0.3], 0x7fe6ff, 0.5, 3);
    },
  },

  ancient_ceremonial_banner: {
    dir: 'props', cat: 'props', origin: GPT, tex: 512,
    name: '古代の儀式旗', desc: '石の台座に立つ竿と、裾の裂けた布の旗（高さ約3.2m）。色あせた紺地に金の紋。両面表示。',
    build(P) {
      const b = block(P, 0.6, 0.3, 0.6, { r: 0.04, chip: 1, seed: 1 }); b.translate(0, 0.15, 0); addMossy(P, b, 'stone_block', { up: 0.6 });
      P.add(tube(P, [V(0, 0.3, 0), V(0, 3.2, 0)], 0.04, { radial: 8, perMeter: 2, bark: 0.03 }), 'wood_dark');
      const bar = tube(P, [V(-0.55, 3.0, 0.05), V(0.55, 3.0, 0.05)], 0.025, { radial: 6, bark: 0 }); P.add(bar, 'wood_dark');
      for (const s of [-1, 1]) { const f = lathe(P, [[0.0001, 0], [0.04, 0.02], [0.0001, 0.1]], { seg: 6 }); f.translate(s * 0.58, 2.96, 0.05); P.add(f, 'bronze'); }
      // 布：揺れと裂け目のある格子面
      const W = 1.0, H = 2.0, nx = 14, ny = 24, pos = [], uv = [], idx = [];
      const N = P.noise;
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
        const u = i / nx, v = j / ny;
        const x = (u - 0.5) * W, y = 2.98 - v * H;
        const z = 0.07 + Math.sin(u * 5 + v * 3) * 0.05 * v + N(u * 3, v * 3, 0) * 0.06 * v;
        pos.push(x, y, z); uv.push(u, v);
      }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const u = (i + 0.5) / nx, v = (j + 0.5) / ny;
        const tear = 0.78 + N(u * 6, 7, 0) * 0.18 + (Math.abs(u - 0.5) > 0.3 ? -0.1 : 0);
        if (v > tear) continue;
        if (N(u * 9, v * 9, 3) > 0.42 && v > 0.4) continue; // 虫食い穴
        const a = j * (nx + 1) + i, b2 = a + nx + 1;
        idx.push(a, b2, a + 1, b2, b2 + 1, a + 1);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      P.add(g, 'cloth');
    },
  },

  forest_beast_bone_pile: {
    dir: 'props', cat: 'foe', origin: GPT, tex: 256, pivot: 'ground',
    name: '森の獣の骨', desc: '大型の獣の頭骨・肋骨・大腿骨の山（約2.5m）。FOE の縄張りを示す環境素材。',
    build(P) {
      const R = P.rng;
      // 頭骨（角つき）
      const sk = rock(P, { r: 0.4, detail: 3, sx: 0.75, sy: 0.6, sz: 1.5, rough: 0.12, crisp: 0.8, flat: -2, seed: 2 }); sk.applyMatrix4(M([0.3, 0.32, 0.2], [0.15, 0.6, 0.1])); P.add(sk, 'bone');
      const jaw = rock(P, { r: 0.3, detail: 2, sx: 0.6, sy: 0.3, sz: 1.2, rough: 0.08, flat: -2, seed: 3 }); jaw.applyMatrix4(M([0.55, 0.12, 0.55], [0.0, 0.6, 0.2])); P.add(jaw, 'bone');
      for (const s of [-1, 1]) { const horn = tube(P, [V(0.3 + s * 0.25, 0.55, 0.0), V(0.3 + s * 0.6, 0.85, -0.3), V(0.3 + s * 0.75, 1.3, -0.15), V(0.3 + s * 0.6, 1.55, 0.15)], (t) => 0.09 * (1 - t * 0.9), { radial: 8, bark: 0.04, seed: s }); horn.applyMatrix4(M([0, 0, 0], [0, 0.3, 0])); P.add(horn, 'bone'); }
      for (const s of [-1, 1]) { const e = new THREE.SphereGeometry(0.06, 8, 6); e.scale(1, 0.7, 0.6); e.translate(0.3 + s * 0.15, 0.44, 0.5); e.applyMatrix4(M([0, 0, 0], [0, 0.3, 0])); P.add(e, 'dark_void'); }
      // 肋骨
      for (let i = 0; i < 7; i++) {
        const z = -0.9 + i * 0.18, side = i % 2 ? 1 : -1;
        P.add(tube(P, [V(-0.6, 0.05, z), V(-0.9, 0.55 - i * 0.03, z + 0.05), V(-1.25, 0.6 - i * 0.04, z + 0.1), V(-1.55, 0.2, z + 0.05)], (t) => 0.035 * (1 - t * 0.5), { radial: 6, bark: 0.03, seed: i }), 'bone');
      }
      P.add(tube(P, [V(-0.6, 0.06, -1.0), V(-0.55, 0.08, 0.3)], 0.06, { radial: 8, bark: 0.03 }), 'bone');
      for (let i = 0; i < 6; i++) { const a = R() * 6.28, d = 0.8 + R() * 0.8; bone(P, [Math.cos(a) * d, 0.04, Math.sin(a) * d], [Math.cos(a + 0.6) * d + (R() - 0.5), 0.05, Math.sin(a + 0.6) * d + (R() - 0.5)], 0.03 + R() * 0.02, i); }
      pebbles(P, [0, 0, 0], 1.8, 10, { seed: 3, mat: 'stone_dark' });
    },
  },

  foe_claw_marks: {
    dir: 'props', cat: 'foe', origin: GPT, tex: 512, pivot: 'as-built',
    name: 'FOEの爪痕', desc: '石壁の一部（幅2m・高さ2.5m）に刻まれた3本の深い爪痕。溝の奥が赤く脈打つように光る。FOE の巡回路の予告に。原点＝壁面の下端中央。',
    build(P) {
      const W = 2, H = 2.5, nx = 60, ny = 75;
      let g = new THREE.PlaneGeometry(W, H, nx, ny); g.translate(0, H / 2, 0);
      g.deleteAttribute('normal');
      const p = g.attributes.position, uv = g.attributes.uv, N = P.noise;
      const claws = [-0.38, 0, 0.38].map((o, i) => ({ o, a: -0.55 + i * 0.03 }));
      const glowStrips = [];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        let d = 0;
        for (const c of claws) {
          // 斜めの線分（右上から左下へ）
          const t = clamp01((y - 0.4) / 1.8), cx = c.o + (t - 0.5) * 1.1;
          const dist = Math.abs(x - cx), depth = Math.sin(Math.PI * t) * (y > 0.4 && y < 2.2 ? 1 : 0);
          d = Math.max(d, Math.max(0, 1 - dist / 0.07) ** 1.5 * depth * 0.12);
        }
        p.setZ(i, -d + N(x * 3, y * 3, 0) * 0.04 + N(x * 12, y * 12, 1) * 0.008);
        uv.setXY(i, x / 1.6, -y / 1.6);
      }
      g.computeVertexNormals();
      P.add(g, 'stone_wall');
      for (const c of claws) {
        const pts = []; for (let k = 0; k <= 10; k++) { const t = 0.08 + k / 10 * 0.84; pts.push(V(c.o + (t - 0.5) * 1.1, 0.4 + t * 1.8, -0.1 * Math.sin(Math.PI * t))); }
        P.add(tube(P, pts, (t) => 0.012 * Math.sin(Math.PI * t) + 0.002, { radial: 5, bark: 0 }), 'crystal_cursed');
      }
      const back = new THREE.BoxGeometry(W, H, 0.4); back.translate(0, H / 2, -0.22); P.add(boxUV(back.toNonIndexed(), 1.6), 'stone_dark');
      pebbles(P, [0, 0, 0.3], 0.8, 10, { seed: 4, size: 0.08 });
      P.light([0, 1.3, 0.4], 0xff3a6a, 0.22, 2.0);
    },
  },

  foe_footprint: {
    dir: 'props', cat: 'foe', origin: GPT, tex: 512, pivot: 'as-built',
    name: 'FOEの足跡', desc: '地面に深く沈んだ3本指の巨大な足跡（長さ約1.6m）とひびの入った敷石。上面が y=0。FOE の存在を事前に示す。',
    build(P) {
      const S = 2.6, n = 90;
      const g = new THREE.PlaneGeometry(S, S, n, n); g.rotateX(-Math.PI / 2); g.deleteAttribute('normal');
      const p = g.attributes.position, uv = g.attributes.uv, N = P.noise;
      const toes = [[-0.35, -0.55, 0.42], [0, -0.7, 0.45], [0.35, -0.55, 0.42]];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        let d = Math.max(0, 1 - Math.hypot(x / 0.45, (z - 0.15) / 0.5)) ** 0.7 * 0.14;
        for (const [tx, tz, l] of toes) { const ax = tx * 0.5, az = tz * 0.5; const t = clamp01(((x - ax) * tx + (z - az) * tz) / (tx * tx + tz * tz)); const px = ax + tx * t * 0.6, pz = az + tz * t * 0.6; d = Math.max(d, Math.max(0, 1 - Math.hypot(x - px, z - pz) / 0.13) * 0.12 * (1 - t * 0.3)); }
        // 縁の盛り上がり
        const r = Math.hypot(x / 0.65, (z + 0.05) / 0.85); const rim = Math.max(0, 1 - Math.abs(r - 1) / 0.25) * 0.035;
        const edge = 1 - Math.max(0, (Math.max(Math.abs(x), Math.abs(z)) - S * 0.38) / (S * 0.12));
        p.setY(i, (-d + rim + N(x * 4, 0, z * 4) * 0.015) * Math.max(0, edge));
        uv.setXY(i, x / 1.3, z / 1.3);
      }
      g.computeVertexNormals();
      P.add(g, 'soil');
      for (let i = 0; i < 5; i++) { const a = i * 1.3, b = block(P, 0.45, 0.1, 0.4, { r: 0.02, chip: 1.4, seed: i }); b.applyMatrix4(M([Math.cos(a) * 0.95, -0.03, Math.sin(a) * 0.95], [(i % 2 - 0.5) * 0.25, a, (i % 3 - 1) * 0.15])); P.add(b, 'stone_block'); }
      pebbles(P, [0, 0, 0], 1.1, 14, { seed: 6, size: 0.06, mat: 'stone_dark' });
    },
  },

  foe_cursed_crystal_cluster: {
    dir: 'props', cat: 'foe', origin: GPT, tex: 512, pivot: 'ground',
    name: 'FOE由来の呪晶', desc: '黒く変色した根の塊から突き出す赤紫の結晶（高さ約1.4m）。青系の発光物と対比させて危険区域を示す。',
    build(P) {
      const R = P.rng;
      const mass = rock(P, { r: 0.8, detail: 3, sy: 0.4, rough: 0.4, seed: 5 }); P.add(mass, 'bark_old');
      for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; groundRoot(P, [Math.cos(a) * 0.6, 0.2, Math.sin(a) * 0.6], [Math.cos(a), -0.3, Math.sin(a)], 1.5 + R(), 0.1, { seed: i, mat: 'bark_old', branches: 1 }); }
      crystalCluster(P, [0, 0.25, 0], 8, 1.4, { seed: 7, mat: 'crystal_cursed', color: 0xff3a6a });
      crystalCluster(P, [0.7, 0.05, -0.4], 4, 0.5, { seed: 17, mat: 'crystal_cursed', color: 0xff3a6a });
    },
  },
};

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
