// 樹木・根・岩・発光植物・結晶
import * as THREE from 'three';
import { tube, wander, rock, lathe, leafBlade, M, V, boxUV } from '../lib/geo.js';
import { addMossy, mossShell, groundRoot, hangingVine, mushroom, crystalCluster, pebbles } from '../lib/kit.js';
import { smooth } from '../lib/noise.js';

const GPT = 'GPT試作40点（名称・用途）を作り直し';
const NEW = 'Claude 新規';

// 幹の根元の張り出し（板根）
const buttress = (lobes, amp, phase = 0) => (t, a) => (1 - smooth(0, 0.22, t)) * Math.pow(0.5 + 0.5 * Math.cos(a * lobes + phase), 3) * amp;

function treeBranches(P, from, dir, len, r0, depth, seed, mat = 'bark') {
  const pts = wander(P, from, dir, len, { steps: 5, bend: 0.3, gravity: -0.05, seed });
  P.add(tube(P, pts, (t) => r0 * (1 - t * 0.75) + 0.02, { radial: Math.max(6, Math.round(14 * r0 + 4)), perMeter: 3, bark: 0.14, seed, tileV: 1.4 }), mat);
  if (depth === 0) {
    // 枝先の葉の房（地下の樹海らしく暗い葉と、ところどころ光る葉）
    const end = pts[pts.length - 1], R = P.rng;
    for (let i = 0; i < 26; i++) {
      const lf = leafBlade(0.35 + R() * 0.3, 0.1 + R() * 0.05, { segs: 4, droop: 0.5, curl: 0.4 });
      lf.applyMatrix4(M([end.x + (R() - 0.5) * 1.6, end.y + (R() - 0.5) * 0.9, end.z + (R() - 0.5) * 1.6], [R() * 2.4 - 1.2, R() * 6.28, R() * 2.4 - 1.2]));
      P.add(lf, R() < 0.25 ? 'leaf_glow' : 'leaf');
    }
  }
  if (depth > 0) {
    const n = 2 + (seed % 2);
    for (let i = 0; i < n; i++) {
      const k = 0.45 + 0.4 * (i / n);
      const p = pts[Math.round(k * (pts.length - 1))];
      const d = pts[pts.length - 1].clone().sub(pts[0]).normalize();
      const side = new THREE.Vector3(Math.cos(seed + i * 2.4), 0.25, Math.sin(seed + i * 2.4));
      treeBranches(P, [p.x, p.y, p.z], d.add(side).normalize().toArray(), len * 0.55, r0 * 0.45, depth - 1, seed * 3 + i + 1, mat);
    }
  }
  return pts;
}

export default {
  ancient_giant_tree: {
    dir: 'props', cat: 'nature', origin: GPT, tex: 1024, pivot: 'ground',
    name: '巨大古代樹', desc: '高さ約16m・幹径約5mの目印となる巨木。板根、地を這う太根、上部で分かれる大枝、棚状の発光キノコ、垂れる発光蔓つき。',
    build(P) {
      const R = P.rng;
      const trunk = [V(0, -0.6, 0), V(0.15, 3, 0.1), V(-0.2, 7, 0.3), V(0.35, 11, -0.1), V(0.2, 14.5, 0)];
      P.add(tube(P, trunk, (t) => 2.4 * (1 - t * 0.55), { radial: 40, perMeter: 3, bark: 0.18, seed: 3, tileV: 1.6, ridgeFreq: 9, flare: buttress(6, 1.1, 0.4) }), 'bark_old');
      // 太い根（地表に沿って広がり、地中へ沈む）
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + R() * 0.3;
        const r0 = 0.55 + R() * 0.35;
        groundRoot(P, [Math.cos(a) * 1.9, 1.1 + R() * 0.6, Math.sin(a) * 1.9], [Math.cos(a), -0.45, Math.sin(a)], 5 + R() * 4, r0, { seed: 10 + i, sink: 0.45, mat: 'bark', radial: 14 });
      }
      // 大枝
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.6;
        treeBranches(P, [Math.cos(a) * 0.6, 11.5 + i * 0.6, Math.sin(a) * 0.6], [Math.cos(a), 0.9, Math.sin(a)], 6 + R() * 2, 0.75, 2, 20 + i);
      }
      // 棚状のキノコ（幹に半円盤）
      for (let i = 0; i < 7; i++) {
        const a = R() * Math.PI * 2, y = 1.5 + R() * 6, rr = 2.4 * (1 - (y / 14.5) * 0.55);
        const s = 0.35 + R() * 0.35;
        const sh = lathe(P, [[0.0001, 0.06], [s * 0.7, 0.05], [s, 0], [s * 0.95, -0.04], [0.0001, -0.03]], { seg: 16, phi: Math.PI, tile: 0.5, noise: 0.1, seed: i });
        sh.applyMatrix4(M([Math.cos(a) * (rr - 0.05), y, Math.sin(a) * (rr - 0.05)], [0, -a + Math.PI / 2, 0]));
        P.add(sh, i % 2 ? 'glowcap' : 'glowcap_teal');
        if (i % 2) P.light([Math.cos(a) * (rr + 0.3), y, Math.sin(a) * (rr + 0.3)], 0x6fe8ff, 0.5, 3);
      }
      // 枝から垂れる発光蔓
      for (let i = 0; i < 8; i++) {
        const a = R() * Math.PI * 2, d = 2.5 + R() * 3.5;
        hangingVine(P, [Math.cos(a) * d, 13 + R() * 1.5, Math.sin(a) * d], 4 + R() * 5, { seed: i * 3, r0: 0.03 });
      }
      pebbles(P, [0, 0, 0], 5, 14, { seed: 4, size: 0.18 });
    },
  },

  spreading_root_cluster: {
    dir: 'props', cat: 'nature', origin: GPT, tex: 512, pivot: 'ground',
    name: '這い広がる根', desc: '床を這う根の塊（約5m）。半分地中に沈み、通路の床に置いて段差感と有機的な縁を作る。',
    build(P) {
      const R = P.rng;
      const knot = rock(P, { r: 0.7, detail: 3, sy: 0.6, rough: 0.35, seed: 2, tile: 1 });
      knot.translate(0, -0.15, 0);
      P.add(knot, 'bark');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + R() * 0.4;
        groundRoot(P, [Math.cos(a) * 0.4, 0.25, Math.sin(a) * 0.4], [Math.cos(a), -0.15, Math.sin(a)], 1.8 + R() * 1.6, 0.18 + R() * 0.12, { seed: i * 5, sink: 0.4 });
        if (R() < 0.6) groundRoot(P, [Math.cos(a) * 1.2, 0.08, Math.sin(a) * 1.2], [Math.cos(a + 0.6), -0.1, Math.sin(a + 0.6)], 1 + R(), 0.07, { seed: i * 7 + 1, sink: 0.3 });
      }
      for (let i = 0; i < 4; i++) mushroom(P, [Math.cos(i * 1.7) * 0.7, 0.1, Math.sin(i * 1.7) * 0.7], 0.12 + R() * 0.1, 0.06 + R() * 0.05, { seed: i, tilt: 0.2 });
      P.light([0, 0.4, 0], 0x6fe8ff, 0.3, 2);
    },
  },

  fallen_ancient_trunk: {
    dir: 'props', cat: 'nature', origin: GPT, tex: 512,
    name: '倒れた古代樹の幹', desc: '長さ約8m・径約1.8mの倒木。根の付いた端と裂けた折れ口、上面の苔、キノコ。通路をふさぐ障害物や橋に。',
    build(P) {
      const R = P.rng;
      const pts = [V(-4, 0.85, 0), V(-1.5, 0.9, 0.15), V(1.2, 0.8, -0.1), V(3.6, 0.72, 0.05)];
      const g = tube(P, pts, (t) => 0.92 - t * 0.18, { radial: 26, perMeter: 4, bark: 0.16, seed: 7, tileV: 1.2, ridgeFreq: 7 });
      addMossy(P, g, 'bark_old', { up: 0.5, thick: 0.05, patch: 0.4 });
      // 折れ口（ギザギザの木の繊維）
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, r = 0.55 + R() * 0.15;
        const sp = lathe(P, [[0.09, 0], [0.05, 0.2 + R() * 0.4], [0.0001, 0.35 + R() * 0.5]], { seg: 5, tile: 0.4 });
        sp.applyMatrix4(M([3.65, 0.72 + Math.sin(a) * r, Math.cos(a) * r], [0, 0, -Math.PI / 2 + (R() - 0.5) * 0.4]));
        P.add(sp, 'wood_dark');
      }
      const face = new THREE.CircleGeometry(0.72, 20); face.rotateY(Math.PI / 2); face.translate(3.62, 0.72, 0);
      P.add(boxUV(face.toNonIndexed(), 0.8), 'wood_dark');
      // 根の付いた端
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const pts2 = wander(P, [-3.9, 0.85 + Math.sin(a) * 0.6, Math.cos(a) * 0.6], [-0.6, Math.sin(a) * 0.9, Math.cos(a) * 0.9], 1.6 + R() * 1.2, { steps: 5, bend: 0.5, seed: i });
        P.add(tube(P, pts2, (t) => 0.22 * (1 - t * 0.9) + 0.01, { radial: 8, perMeter: 5, bark: 0.1, seed: i }), 'root');
      }
      for (let i = 0; i < 6; i++) mushroom(P, [-2 + i * 0.9, 1.62 + R() * 0.05, (R() - 0.5) * 0.4], 0.1 + R() * 0.1, 0.07 + R() * 0.05, { seed: i, tilt: (R() - 0.5) * 0.4, mat: i % 2 ? 'glowcap' : 'glowcap_teal' });
      P.light([0, 1.9, 0], 0x6fe8ff, 0.4, 3);
    },
  },

  moss_boulder_cluster: {
    dir: 'props', cat: 'nature', origin: GPT, tex: 512, pivot: 'ground',
    name: '苔むした岩の群れ', desc: '大中小の岩3〜4個。上面に厚い苔。通路の縁や広間の遮蔽に。',
    build(P) {
      const R = P.rng;
      const spec = [[0, 0, 1.1, 0.8], [1.3, 0.4, 0.65, 0.7], [-1.0, 0.7, 0.5, 0.65], [0.4, -1.0, 0.35, 0.6]];
      spec.forEach(([x, z, r, sy], i) => {
        const g = rock(P, { r, detail: 4, sy, rough: 0.3, crisp: 0.8, seed: i + 1, tile: 1.4, flat: -0.45 });
        g.translate(x, r * sy * 0.45, z);
        addMossy(P, g, 'stone_block', { up: 0.35, thick: 0.05, patch: 0.5, seed: i });
      });
      pebbles(P, [0, 0, 0], 2.2, 12, { seed: 9 });
    },
  },

  bioluminescent_crystal_cluster: {
    dir: 'props', cat: 'glow', origin: GPT, tex: 512, pivot: 'ground',
    name: '発光結晶の群生', desc: '岩から突き出す青白い結晶（高さ約1.6m）。発光する筋入り。点光源の位置を GLB の extras に記録。',
    build(P) {
      const base = rock(P, { r: 0.7, detail: 3, sy: 0.45, rough: 0.35, seed: 3, tile: 1.2 });
      addMossy(P, base, 'stone_dark', { up: 0.5, seed: 2 });
      crystalCluster(P, [0, 0.25, 0], 9, 1.6, { seed: 1 });
      crystalCluster(P, [0.75, 0.05, 0.3], 4, 0.6, { seed: 20, mat: 'crystal_violet', color: 0xb08aff });
      pebbles(P, [0, 0, 0], 1.4, 8, { seed: 5, mat: 'stone_dark' });
    },
  },

  glow_mushroom_cluster: {
    dir: 'props', cat: 'glow', origin: GPT, tex: 256, pivot: 'ground',
    name: '発光キノコの群生', desc: '大小のキノコ12本前後。傘の斑点と縁が光る。2色（水色・青緑）を混ぜて単調さを避ける。',
    build(P) {
      const R = P.rng;
      const mound = rock(P, { r: 0.6, detail: 3, sy: 0.25, rough: 0.2, seed: 4, tile: 1 });
      P.add(mound, 'soil');
      for (let i = 0; i < 13; i++) {
        const big = i < 3;
        const a = R() * Math.PI * 2, d = big ? R() * 0.25 : 0.2 + R() * 0.45;
        const h = big ? 0.45 + R() * 0.35 : 0.1 + R() * 0.2;
        mushroom(P, [Math.cos(a) * d, 0.05, Math.sin(a) * d], h, h * (0.45 + R() * 0.2), { seed: i, tilt: (R() - 0.5) * 0.5, yaw: R() * 6, mat: i % 3 ? 'glowcap' : 'glowcap_teal' });
      }
      P.light([0, 0.6, 0], 0x6fe8ff, 1.0, 4);
    },
  },

  hanging_glow_vines: {
    dir: 'props', cat: 'glow', origin: GPT, tex: 256, pivot: 'as-built',
    name: '発光する垂れ蔓', desc: '天井や梁から垂れる蔓の束（長さ1.5〜3.5m）。原点は上端（取り付け位置）。葉と光る実つき。',
    build(P) {
      const R = P.rng;
      P.add(tube(P, [V(-0.9, 0, 0), V(0, 0.08, 0.05), V(0.9, 0, 0)], 0.07, { radial: 8, bark: 0.1 }), 'root');
      for (let i = 0; i < 7; i++) hangingVine(P, [-0.8 + i * 0.27, 0, (R() - 0.5) * 0.2], 1.5 + R() * 2, { seed: i * 2, r0: 0.02 });
    },
  },

  hollow_tree_stump: {
    dir: 'props', cat: 'nature', origin: GPT, tex: 512, pivot: 'ground',
    name: '空洞の切り株', desc: '内部が空洞の大きな切り株（径約2m）。縁はギザギザ、根が地面へ広がる。遮蔽物・採集の目印に。',
    build(P) {
      const R = P.rng;
      // 外壁と内壁を回転体で作り、上端をノイズで欠けさせる
      const prof = [[1.25, -0.2], [1.1, 0.3], [0.98, 0.9], [0.95, 1.35], [0.8, 1.4], [0.72, 1.2], [0.7, 0.4], [0.0001, 0.35]];
      const g = lathe(P, prof, { seg: 36, tile: 1.2, noise: 0.08, seed: 2 });
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 1.0) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, y - Math.max(0, Math.sin(a * 5) * 0.35 + P.noise(a * 3, 0, 0) * 0.25)); } }
      g.computeVertexNormals();
      addMossy(P, g, 'bark_old', { up: 0.5, thick: 0.04 });
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + R() * 0.3; groundRoot(P, [Math.cos(a) * 1.0, 0.35, Math.sin(a) * 1.0], [Math.cos(a), -0.4, Math.sin(a)], 1.4 + R() * 1.2, 0.22, { seed: i * 3, mat: 'bark' }); }
      for (let i = 0; i < 5; i++) mushroom(P, [Math.cos(i * 1.3) * 0.35, 0.36, Math.sin(i * 1.3) * 0.35], 0.12 + R() * 0.12, 0.08, { seed: i });
      P.light([0, 0.8, 0], 0x6fe8ff, 0.5, 2.5);
    },
  },

  living_root_arch: {
    dir: 'props', cat: 'nature', origin: GPT, tex: 512, pivot: 'ground',
    name: '生きた根のアーチ', desc: '通路をまたぐ根のアーチ（幅約4m・高さ約4m）。根が絡み合い、光る芽が付く。区画の切り替わりの目印に。',
    build(P) {
      const R = P.rng;
      for (let i = 0; i < 7; i++) {
        const z = (R() - 0.5) * 0.6, lift = 3.6 + R() * 0.6;
        const pts = [V(-2.1 - R() * 0.3, -0.3, z), V(-1.9, 1.5, z * 0.5), V(-1.2, lift - 0.4, z), V(0, lift + R() * 0.2, z * 0.6), V(1.2, lift - 0.4, z), V(1.9, 1.5, z), V(2.1 + R() * 0.3, -0.3, z * 0.4)];
        if (i % 2) pts.reverse();
        P.add(tube(P, pts, (t) => (0.16 + R() * 0.0) * (1.1 - Math.sin(Math.PI * t) * 0.45) + (i === 0 ? 0.08 : 0), { radial: 10, perMeter: 5, bark: 0.12, seed: i, twist: 2 }), i < 2 ? 'bark' : 'root');
      }
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) groundRoot(P, [s * 2.0, 0.3, (R() - 0.5) * 0.4], [s * 0.6, -0.4, (R() - 0.5)], 1.2 + R(), 0.14, { seed: i + (s > 0 ? 10 : 0) });
      for (let i = 0; i < 9; i++) {
        const t = 0.12 + (i / 9) * 0.76, a = Math.PI * t;
        const x = -Math.cos(a) * 2.0, y = Math.sin(a) * 3.7;
        const b = new THREE.IcosahedronGeometry(0.06 + R() * 0.04, 1); b.translate(x, y - 0.12, (R() - 0.5) * 0.3);
        P.add(b, 'glow_core');
      }
      hangingVine(P, [-0.6, 3.6, 0.1], 1.4, { seed: 3 }); hangingVine(P, [0.7, 3.65, -0.1], 1.9, { seed: 5 });
      P.light([0, 3.2, 0], 0x7fe6ff, 0.8, 5);
    },
  },

  hanging_forest_cocoon: {
    dir: 'props', cat: 'foe', origin: GPT, tex: 256, pivot: 'as-built',
    name: '森の繭', desc: '根から糸で吊られた大きな繭（約1.6m）。内側からかすかに光る。原点は上端。魔物の巣の気配づくりに。',
    build(P) {
      const R = P.rng;
      P.add(tube(P, [V(-0.8, 0, 0), V(0, 0.1, 0), V(0.8, 0, 0)], 0.09, { radial: 8, bark: 0.12 }), 'root');
      const c = lathe(P, [[0.0001, -2.6], [0.25, -2.45], [0.48, -2.0], [0.55, -1.6], [0.45, -1.15], [0.2, -0.85], [0.06, -0.7]], { seg: 20, noise: 0.12, tile: 0.8, seed: 3 });
      P.add(c, 'silk');
      for (let i = 0; i < 6; i++) {
        const x = -0.5 + R(), z = (R() - 0.5) * 0.3;
        P.add(tube(P, [V(x, 0, z), V(x * 0.5, -0.4, z * 0.5), V(0, -0.8, 0)], 0.008, { radial: 4, bark: 0 }), 'silk');
      }
      for (let i = 0; i < 12; i++) {
        const y = -2.45 + R() * 1.6, a = R() * Math.PI * 2;
        P.add(tube(P, [V(Math.cos(a) * 0.5, y, Math.sin(a) * 0.5), V(Math.cos(a + 1) * 0.52, y + 0.15, Math.sin(a + 1) * 0.52), V(Math.cos(a + 2) * 0.5, y + 0.05, Math.sin(a + 2) * 0.5)], 0.01, { radial: 4, bark: 0 }), 'silk');
      }
      P.light([0, -1.6, 0], 0x5fd0c8, 0.4, 2.5);
    },
  },
};
