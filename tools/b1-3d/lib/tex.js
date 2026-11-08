// 手続き型 PBR テクスチャ（色・法線・ORM＝遮蔽/粗さ/金属、必要なら発光）
// すべて継ぎ目なく繰り返せる（周期ノイズを使用）。
import * as THREE from 'three';
import { fbm2, ridge2, worley2, hash2, clamp, smooth, mix } from './noise.js';

const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const mulc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

// fn(u, v) -> { c:[r,g,b] (sRGB 0..1), h (0..1), r (粗さ), m (金属), e:[r,g,b] 任意, ao 任意 }
function bake(size, fn, { normalStrength = 2.0, aoStrength = 1.0, emissive = false } = {}) {
  const N = size * size;
  const col = new Float32Array(N * 3), hgt = new Float32Array(N), rou = new Float32Array(N), met = new Float32Array(N), aoX = new Float32Array(N);
  const emi = emissive ? new Float32Array(N * 3) : null;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    const s = fn((x + 0.5) / size, (y + 0.5) / size);
    col[i * 3] = s.c[0]; col[i * 3 + 1] = s.c[1]; col[i * 3 + 2] = s.c[2];
    hgt[i] = s.h; rou[i] = s.r; met[i] = s.m || 0; aoX[i] = s.ao ?? 1;
    if (emi && s.e) { emi[i * 3] = s.e[0]; emi[i * 3 + 1] = s.e[1]; emi[i * 3 + 2] = s.e[2]; }
  }
  // 周囲平均（ぼかし）との差でくぼみの陰を作る
  const blur = boxBlur(hgt, size, Math.max(2, size >> 6));
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const cA = mk(), cN = mk(), cO = mk(), cE = emissive ? mk() : null;
  const iA = cA.getContext('2d').createImageData(size, size), iN = cN.getContext('2d').createImageData(size, size), iO = cO.getContext('2d').createImageData(size, size);
  const iE = cE ? cE.getContext('2d').createImageData(size, size) : null;
  const H = (x, y) => hgt[((y + size) % size) * size + ((x + size) % size)];
  const k = normalStrength * size / 256;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, p = i * 4;
    const cav = clamp(1 + (hgt[i] - blur[i]) * 3.0 * aoStrength, 0.25, 1) * aoX[i];
    // 色にも軽くくぼみの陰を乗せる（暗所での形の読みやすさのため）
    const shade = mix(1, cav, 0.45);
    iA.data[p] = clamp(col[i * 3] * shade) * 255; iA.data[p + 1] = clamp(col[i * 3 + 1] * shade) * 255; iA.data[p + 2] = clamp(col[i * 3 + 2] * shade) * 255; iA.data[p + 3] = 255;
    // 法線（flipY=false の UV。v は画像の下方向に増える）
    const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k;
    let nx = -dx, ny = -dy, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    iN.data[p] = (nx * 0.5 + 0.5) * 255; iN.data[p + 1] = (ny * 0.5 + 0.5) * 255; iN.data[p + 2] = (nz * 0.5 + 0.5) * 255; iN.data[p + 3] = 255;
    iO.data[p] = cav * 255; iO.data[p + 1] = clamp(rou[i]) * 255; iO.data[p + 2] = clamp(met[i]) * 255; iO.data[p + 3] = 255;
    if (iE) { iE.data[p] = clamp(emi[i * 3]) * 255; iE.data[p + 1] = clamp(emi[i * 3 + 1]) * 255; iE.data[p + 2] = clamp(emi[i * 3 + 2]) * 255; iE.data[p + 3] = 255; }
  }
  cA.getContext('2d').putImageData(iA, 0, 0); cN.getContext('2d').putImageData(iN, 0, 0); cO.getContext('2d').putImageData(iO, 0, 0);
  if (cE) cE.getContext('2d').putImageData(iE, 0, 0);
  return { albedo: cA, normal: cN, orm: cO, emissive: cE };
}

function boxBlur(src, size, r) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < size; y++) { let s = 0; for (let x = -r; x <= r; x++) s += src[y * size + ((x + size) % size)];
    for (let x = 0; x < size; x++) { tmp[y * size + x] = s / (2 * r + 1); s += src[y * size + ((x + r + 1) % size)] - src[y * size + ((x - r + size) % size)]; } }
  for (let x = 0; x < size; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[((y + size) % size) * size + x];
    for (let y = 0; y < size; y++) { out[y * size + x] = s / (2 * r + 1); s += tmp[((y + r + 1) % size) * size + x] - tmp[((y - r + size) % size) * size + x]; } }
  return out;
}

// ───────── 素材ごとの表面 ─────────
const MOSS_A = hex(0x2c4a26), MOSS_B = hex(0x5d7a33), MOSS_DRY = hex(0x4a5232);

function mossLayer(u, v, seed, amount, base) {
  // amount: 0..1 苔の量、base: 下地の高さ（くぼみに溜まる）
  const n = fbm2(u, v, 3, 5, seed) * 0.5 + 0.5;
  const fine = fbm2(u, v, 24, 3, seed + 5) * 0.5 + 0.5;
  const m = smooth(1 - amount, 1 - amount + 0.18, n * 0.75 + (1 - base) * 0.35 + fine * 0.12);
  const c = mixc(mixc(MOSS_A, MOSS_B, fine), MOSS_DRY, smooth(0.6, 0.9, n) * 0.5);
  return { m, c, h: fine * 0.06 };
}

const SURFACES = {
  // 石積み（壁）：段ずらしの切石、目地、欠け、ひび、苔
  stone_masonry: ({ seed = 11, rows = 4, cols = 2, moss = 0.42, tint = 0x5c6563 } = {}) => {
    const base = hex(tint);
    return (u, v) => {
      const row = Math.floor(v * rows), rv = v * rows - row;
      const shift = (row % 2) * 0.5 + (hash2(row, 3, seed) - 0.5) * 0.18;
      const cu = u * cols + shift, col = Math.floor(cu), ru = cu - col;
      const id = ((col % cols) + cols) % cols + row * 31;
      const wob = fbm2(u, v, 8, 3, seed + 3) * 0.035;
      const ex = Math.min(ru, 1 - ru) / cols * 2, ey = Math.min(rv, 1 - rv) / rows * 2; // 辺までの距離（0..）
      const edge = Math.min(ex * cols * 0.5, ey * rows * 0.5 * (cols / rows) * 2) + wob;
      const mortar = 1 - smooth(0.012, 0.045, edge);
      const chip = smooth(0.35, 0.8, fbm2(u, v, 6, 4, seed + id) * 0.5 + 0.5) * (1 - smooth(0.02, 0.12, edge));
      const bulge = smooth(0.0, 0.16, edge) * 0.55;
      const grain = fbm2(u, v, 10, 5, seed + 9) * 0.5 + 0.5;
      const crack = smooth(0.94, 0.985, ridge2(u, v, 3, 4, seed + 21)) * (1 - mortar);
      let h = 0.25 + bulge + grain * 0.18 - chip * 0.35 - crack * 0.25 - mortar * 0.3;
      const tintK = 0.78 + hash2(id, 1, seed) * 0.38;
      let c = mulc(mixc(base, hex(0x8c8f84), grain * 0.35), tintK * (0.85 + grain * 0.25));
      c = mixc(c, hex(0x2b2f2c), mortar * 0.85 + crack * 0.6);
      // 筋状の汚れ（雨だれ）
      const streak = smooth(0.55, 0.9, fbm2(u, v, 2, 4, seed + 40, 0.5, 6, 0.4) * 0.5 + 0.5);
      c = mixc(c, mulc(c, 0.65), streak * 0.5);
      const ml = mossLayer(u, v, seed + 50, moss + mortar * 0.25, h);
      c = mixc(c, ml.c, ml.m); h += ml.m * ml.h + ml.m * 0.04;
      return { c, h: clamp(h), r: mix(0.82, 0.95, mortar) * (1 - ml.m) + ml.m * 0.98 };
    };
  },
  // 風化した石（柱・像・岩）：層、穴、細かな凹凸、苔
  stone_rough: ({ seed = 23, moss = 0.35, tint = 0x5f6967 } = {}) => {
    const base = hex(tint);
    return (u, v) => {
      const n = fbm2(u, v, 3, 6, seed) * 0.5 + 0.5;
      const facet = worley2(u, v, 3, seed + 5, 0.9);
      const facets = smooth(0.0, 0.35, facet.f2 - facet.f1);
      const strata = Math.sin((v + fbm2(u, v, 2, 3, seed + 1) * 0.12) * Math.PI * 10) * 0.5 + 0.5;
      const pit = worley2(u, v, 12, seed + 2, 1);
      const pits = (1 - smooth(0.0, 0.14, pit.f1)) * (hash2(pit.id, 3, seed) > 0.6 ? 1 : 0);
      const crack = smooth(0.92, 0.98, ridge2(u, v, 3, 4, seed + 4));
      let h = n * 0.5 + facets * 0.1 + strata * 0.08 - pits * 0.22 - crack * 0.35 + 0.15;
      let c = mulc(mixc(base, hex(0x9a9a8c), n * 0.45), (0.72 + n * 0.4) * (0.88 + hash2(facet.id, 4, seed) * 0.22));
      c = mixc(c, hex(0x33362f), pits * 0.55 + crack * 0.65 + (1 - facets) * 0.08);
      const ml = mossLayer(u, v, seed + 50, moss, h);
      c = mixc(c, ml.c, ml.m); h += ml.m * ml.h;
      return { c, h: clamp(h), r: mix(0.84, 0.98, ml.m) };
    };
  },
  // 石畳（床）：不定形の敷石、隙間に土と苔、中央はすり減って滑らか
  stone_paving: ({ seed = 31, cells = 5, moss = 0.3 } = {}) => (u, v) => {
    const w = worley2(u, v, cells, seed, 0.85);
    const edge = w.f2 - w.f1;
    const gap = 1 - smooth(0.035, 0.09, edge);
    const tint = 0.75 + hash2(w.id, 2, seed) * 0.4;
    const n = fbm2(u, v, 8, 5, seed + 3) * 0.5 + 0.5;
    const worn = smooth(0.1, 0.4, edge);
    let h = 0.35 + worn * 0.35 + n * 0.15 - gap * 0.45;
    let c = mulc(mixc(hex(0x4f5757), hex(0x767870), n * 0.5), tint);
    c = mixc(c, hex(0x2a2620), gap);
    const ml = mossLayer(u, v, seed + 9, moss * 0.6 + gap * 0.5, h);
    c = mixc(c, ml.c, ml.m * (0.4 + gap * 0.6)); h += ml.m * ml.h;
    return { c, h: clamp(h), r: mix(0.72, 0.95, 1 - worn) * (1 - gap) + gap * 0.98 };
  },
  // 樹皮：縦の深い溝、うろこ状の割れ、苔と地衣類（u=周方向, v=長さ方向）
  bark: ({ seed = 41, moss = 0.35, tint = 0x4a3a2c } = {}) => {
    const base = hex(tint);
    return (u, v) => {
      const warp = fbm2(u, v, 3, 3, seed) * 0.08;
      const fiss = ridge2(u + warp, v, 6, 4, seed + 1, 1, 0.35);
      const plates = worley2(u + warp, v, 10, seed + 2, 0.9, 4);
      const groove = smooth(0.55, 0.95, fiss);
      const n = fbm2(u, v, 16, 4, seed + 3) * 0.5 + 0.5;
      let h = groove * 0.55 + smooth(0.0, 0.25, plates.f2 - plates.f1) * 0.25 + n * 0.15;
      let c = mulc(mixc(base, hex(0x6e5a44), n * 0.5), 0.55 + h * 0.75);
      const lichen = smooth(0.72, 0.8, fbm2(u, v, 6, 4, seed + 7) * 0.5 + 0.5) * 0.7;
      c = mixc(c, hex(0x8f9a7a), lichen * groove);
      const ml = mossLayer(u, v, seed + 50, moss, h);
      c = mixc(c, ml.c, ml.m); h += ml.m * ml.h;
      return { c, h: clamp(h), r: 0.9 };
    };
  },
  // 根（若い樹皮。細かな筋、湿り気）
  root: ({ seed = 47, moss = 0.25 } = {}) => (u, v) => {
    const fiber = fbm2(u, v, 12, 4, seed, 0.5, 1, 0.12) * 0.5 + 0.5;
    const knot = 1 - smooth(0.0, 0.2, worley2(u, v, 6, seed + 1, 0.9, 3).f1);
    const n = fbm2(u, v, 6, 5, seed + 2) * 0.5 + 0.5;
    let h = fiber * 0.5 + n * 0.3 + knot * 0.2;
    let c = mulc(mixc(hex(0x3b2c22), hex(0x6b5640), fiber * 0.6 + n * 0.3), 0.7 + n * 0.5);
    const ml = mossLayer(u, v, seed + 50, moss, h);
    c = mixc(c, ml.c, ml.m); h += ml.m * ml.h;
    return { c, h: clamp(h), r: mix(0.62, 0.92, n) };
  },
  // 古材の板：板目、隙間、釘、すり減り（u=板の長さ方向）
  wood_planks: ({ seed = 53, boards = 5, tint = 0x5a3f2a } = {}) => (u, v) => {
    const b = Math.floor(v * boards), bv = v * boards - b;
    const off = hash2(b, 1, seed);
    const grain = fbm2(u + off, v, 2, 5, seed + b, 0.55, 1, 10) * 0.5 + 0.5;
    const rings = Math.sin((bv * 3 + grain * 5 + off * 6) * Math.PI * 2) * 0.5 + 0.5;
    const gap = 1 - smooth(0.02, 0.06, Math.min(bv, 1 - bv));
    const nail = (() => { let m = 0; for (const nu of [0.06, 0.94]) { const dx = (u - nu) * boards, dy = bv - 0.5; m = Math.max(m, 1 - smooth(0.04, 0.07, Math.hypot(dx, dy))); } return m; })();
    let h = 0.45 + grain * 0.25 + rings * 0.08 - gap * 0.45 + nail * 0.15;
    let c = mulc(mixc(hex(tint), hex(0x8a6a48), grain * 0.5 + rings * 0.15), 0.7 + hash2(b, 3, seed) * 0.4);
    c = mixc(c, hex(0x1d1510), gap);
    c = mixc(c, hex(0x3a3631), nail);
    const rot = smooth(0.6, 0.85, fbm2(u, v, 3, 4, seed + 9) * 0.5 + 0.5);
    c = mixc(c, mixc(hex(0x2f3a24), hex(0x23201a), 0.5), rot * 0.6);
    return { c, h: clamp(h), r: mix(0.78, 0.92, rot), m: nail * 0.8 };
  },
  // 錆びた鉄
  iron: ({ seed = 61, rust = 0.5 } = {}) => (u, v) => {
    const n = fbm2(u, v, 6, 6, seed) * 0.5 + 0.5;
    const rm = smooth(1 - rust - 0.1, 1 - rust + 0.15, fbm2(u, v, 3, 5, seed + 1) * 0.5 + 0.5 + (n - 0.5) * 0.3);
    const pit = 1 - smooth(0.0, 0.12, worley2(u, v, 30, seed + 2).f1);
    let h = 0.5 + n * 0.2 - pit * 0.2 * rm + rm * 0.1;
    let c = mixc(hex(0x34393c), hex(0x4e5458), n);
    c = mixc(c, mixc(hex(0x6b3a1e), hex(0x9a5a2a), n), rm);
    return { c, h: clamp(h), r: mix(0.42, 0.9, rm), m: mix(0.9, 0.1, rm) };
  },
  // 古い青銅（緑青）
  bronze: ({ seed = 67, patina = 0.55 } = {}) => (u, v) => {
    const n = fbm2(u, v, 5, 6, seed) * 0.5 + 0.5;
    const p = smooth(1 - patina - 0.1, 1 - patina + 0.2, fbm2(u, v, 4, 5, seed + 1) * 0.5 + 0.5);
    let c = mixc(hex(0x7a5a2c), hex(0xa07a3a), n);
    c = mixc(c, mixc(hex(0x3f7a6a), hex(0x6aa392), n), p);
    return { c, h: clamp(0.5 + n * 0.3 + p * 0.1), r: mix(0.35, 0.85, p), m: mix(0.95, 0.15, p) };
  },
  // 苔の塊
  moss: ({ seed = 71 } = {}) => (u, v) => {
    const n = fbm2(u, v, 6, 6, seed) * 0.5 + 0.5;
    const tufts = 1 - worley2(u, v, 28, seed + 1).f1 * 2.0;
    const fine = fbm2(u, v, 32, 3, seed + 2) * 0.5 + 0.5;
    const h = clamp(n * 0.55 + tufts * 0.25 + fine * 0.2);
    const c = mulc(mixc(mixc(MOSS_A, MOSS_B, h * 0.8), MOSS_DRY, smooth(0.55, 0.85, n) * 0.4), 0.72 + n * 0.35);
    return { c, h, r: 0.98 };
  },
  // 土・落ち葉
  soil: ({ seed = 73 } = {}) => (u, v) => {
    const n = fbm2(u, v, 6, 6, seed) * 0.5 + 0.5;
    const peb = worley2(u, v, 22, seed + 1);
    const pebm = 1 - smooth(0.12, 0.2, peb.f1);
    const leaf = smooth(0.62, 0.66, fbm2(u, v, 14, 3, seed + 2) * 0.5 + 0.5);
    let h = n * 0.5 + pebm * 0.35 * (0.5 + hash2(peb.id, 1, seed)) + leaf * 0.1;
    let c = mixc(hex(0x2a2119), hex(0x46382a), n);
    c = mixc(c, mulc(hex(0x6f6e66), 0.7 + hash2(peb.id, 2, seed) * 0.5), pebm);
    c = mixc(c, mixc(hex(0x5a3b1c), hex(0x3d4a22), hash2(Math.floor(u * 40), Math.floor(v * 40), seed)), leaf * 0.8);
    return { c, h: clamp(h), r: mix(0.95, 0.75, pebm) };
  },
  // 骨
  bone: ({ seed = 79 } = {}) => (u, v) => {
    const n = fbm2(u, v, 6, 5, seed) * 0.5 + 0.5;
    const por = 1 - smooth(0.0, 0.08, worley2(u, v, 50, seed + 1).f1);
    const crack = smooth(0.95, 0.99, ridge2(u, v, 4, 3, seed + 2));
    let c = mixc(hex(0x8f8670), hex(0xb3aa90), n);
    c = mixc(c, hex(0x6b5c44), por * 0.35 + crack * 0.7 + smooth(0.5, 0.9, fbm2(u, v, 2, 3, seed + 3) * 0.5 + 0.5) * 0.35);
    return { c, h: clamp(0.5 + n * 0.3 - por * 0.15 - crack * 0.3), r: 0.7 };
  },
  // 布（儀式旗）：織り目、色あせ、刺繍の帯、汚れ
  cloth: ({ seed = 83, tint = 0x1f3a52, trim = 0x9a7a3a } = {}) => (u, v) => {
    const weave = (Math.sin(u * 512 * Math.PI) * Math.sin(v * 512 * Math.PI)) * 0.5 + 0.5;
    const n = fbm2(u, v, 4, 5, seed) * 0.5 + 0.5;
    const band = smooth(0.0, 0.01, Math.abs(Math.abs(u - 0.5) - 0.4) - 0.02) ;
    const emblemD = Math.hypot(u - 0.5, (v - 0.42) * 1.4);
    const emblem = (1 - smooth(0.17, 0.18, emblemD)) * smooth(0.13, 0.14, emblemD) + (1 - smooth(0.05, 0.06, emblemD));
    let c = mulc(hex(tint), 0.75 + n * 0.45);
    c = mixc(c, hex(trim), clamp((1 - band) + emblem));
    c = mixc(c, hex(0x2a2218), smooth(0.55, 0.85, fbm2(u, v, 3, 4, seed + 1) * 0.5 + 0.5) * 0.6 + smooth(0.75, 1, v) * 0.4);
    return { c, h: clamp(0.5 + weave * 0.15 + n * 0.1), r: 0.95 };
  },
  // 結晶（内部の筋＋発光）
  crystal: ({ seed = 89, tint = 0x3aa8c8, glow = 0x55d8ff, k = 1 } = {}) => (u, v) => {
    const st = ridge2(u, v, 3, 4, seed, 1, 0.3);
    const n = fbm2(u, v, 4, 4, seed + 1) * 0.5 + 0.5;
    const e = smooth(0.55, 0.95, st * 0.7 + n * 0.4) * k;
    const c = mixc(mulc(hex(tint), 0.4), hex(tint), n);
    return { c, h: clamp(0.5 + st * 0.2), r: 0.12 + n * 0.15, e: mulc(hex(glow), 0.25 + e * 0.75) };
  },
  // 発光キノコの傘・発光植物（斑点が光る）
  glowcap: ({ seed = 97, tint = 0x24324a, glow = 0x6fe8ff } = {}) => (u, v) => {
    const w = worley2(u, v, 9, seed, 0.9, 6);
    const spot = 1 - smooth(0.12, 0.22, w.f1);
    const n = fbm2(u, v, 6, 4, seed + 1) * 0.5 + 0.5;
    const rim = smooth(0.75, 1, v);
    let c = mixc(hex(tint), hex(0x3a5a7a), n * 0.5 + rim * 0.4);
    c = mixc(c, hex(0xbff6ff), spot * 0.7);
    return { c, h: clamp(0.5 + spot * 0.25 + n * 0.1), r: 0.55, e: mulc(hex(glow), spot * 0.9 + rim * 0.35) };
  },
  // 葉（シダ・蔓）：葉脈
  leaf: ({ seed = 101, tint = 0x2f5a30 } = {}) => (u, v) => {
    const vein = 1 - smooth(0.0, 0.02, Math.abs(u - 0.5));
    const side = 1 - smooth(0.0, 0.012, Math.abs(((Math.abs(u - 0.5) * 2 + v * 1.4) * 9) % 1 - 0.5) / 9);
    const n = fbm2(u, v, 4, 4, seed) * 0.5 + 0.5;
    let c = mulc(mixc(hex(tint), hex(0x6f9a3e), n * 0.5 + v * 0.3), 0.75 + n * 0.4);
    c = mixc(c, hex(0x9ab86a), vein * 0.6 + side * 0.25);
    return { c, h: clamp(0.5 + vein * 0.2 + side * 0.08), r: 0.7 };
  },
  // 繭の糸
  silk: ({ seed = 103 } = {}) => (u, v) => {
    const f = fbm2(u, v, 3, 5, seed, 0.6, 1, 6) * 0.5 + 0.5;
    const strands = ridge2(u, v, 8, 3, seed + 1, 1, 0.25);
    let c = mixc(hex(0x9aa39a), hex(0xdfe6dc), f * 0.6 + strands * 0.4);
    c = mixc(c, hex(0x56635a), smooth(0.6, 0.9, fbm2(u, v, 2, 3, seed + 2) * 0.5 + 0.5) * 0.4);
    return { c, h: clamp(strands * 0.6 + f * 0.3), r: 0.8, e: mulc(hex(0x5fd0c8), smooth(0.85, 1, strands) * 0.25) };
  },
  // ルーン石（封印・仕掛け）：敷石＋光る円陣の刻み
  rune_stone: ({ seed = 107, glow = 0x5fe0ff } = {}) => {
    const pave = SURFACES.stone_rough({ seed, moss: 0.15, tint: 0x5c6668 });
    return (u, v) => {
      const s = pave(u, v);
      const dx = u - 0.5, dy = v - 0.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const ring = (rr, w) => 1 - smooth(w * 0.5, w, Math.abs(r - rr));
      let g = Math.max(ring(0.42, 0.012), ring(0.33, 0.008), ring(0.18, 0.01));
      // 外周の文字（短い刻み）
      const seg = Math.floor((a / (Math.PI * 2) + 0.5) * 36);
      const glyph = (r > 0.35 && r < 0.405) ? (hash2(seg, Math.floor((r - 0.35) * 60), seed) > 0.55 ? 1 : 0) * (1 - smooth(0.25, 0.4, Math.abs(((a / (Math.PI * 2) + 0.5) * 36) % 1 - 0.5))) : 0;
      // 中央の星形
      // 中央の紋（三角形1つ＋中心へ向かう3本の線＝「樹」の印）
      let star = 0;
      if (r < 0.175) {
        for (let k2 = 0; k2 < 3; k2++) {
          const th = k2 * Math.PI * 2 / 3 + Math.PI / 2;
          const d = Math.abs(dx * Math.cos(th) + dy * Math.sin(th) - 0.075);
          star = Math.max(star, 1 - smooth(0.004, 0.009, d));
          const ta = th + Math.PI; // 中心から頂点への線
          const along = -(dx * Math.cos(ta) + dy * Math.sin(ta)), perp = Math.abs(-dx * Math.sin(ta) + dy * Math.cos(ta));
          if (along > 0 && along < 0.15) star = Math.max(star, 1 - smooth(0.003, 0.007, perp));
        }
        star = Math.max(star, 1 - smooth(0.004, 0.009, Math.abs(r - 0.03)));
      }
      g = clamp(Math.max(g, glyph, star * 0.8));
      const c = mixc(s.c, hex(0x1d2a30), g * 0.7);
      return { c, h: clamp(s.h - g * 0.25), r: s.r, e: mulc(hex(glow), g) };
    };
  },
};

// 素材の既定（色・粗さに加え、発光の強さなど）
export const MATERIAL_DEFS = {
  stone_wall:   { surf: 'stone_masonry', opts: {}, normal: 2.6 },
  stone_wall_mossy: { surf: 'stone_masonry', opts: { seed: 13, moss: 0.62, tint: 0x66706c }, normal: 2.6 },
  stone_block:  { surf: 'stone_rough', opts: {}, normal: 3.0 },
  stone_dark:   { surf: 'stone_rough', opts: { seed: 29, tint: 0x4f5857, moss: 0.25 }, normal: 3.0 },
  stone_pale:   { surf: 'stone_rough', opts: { seed: 37, tint: 0x767a71, moss: 0.3 }, normal: 2.8 },
  stone_floor:  { surf: 'stone_paving', opts: {}, normal: 2.4 },
  bark:         { surf: 'bark', opts: {}, normal: 3.2 },
  bark_old:     { surf: 'bark', opts: { seed: 43, moss: 0.55, tint: 0x3d3229 }, normal: 3.2 },
  root:         { surf: 'root', opts: {}, normal: 2.2 },
  wood:         { surf: 'wood_planks', opts: {}, normal: 2.0 },
  wood_dark:    { surf: 'wood_planks', opts: { seed: 57, boards: 3, tint: 0x3d2b1e }, normal: 2.0 },
  iron:         { surf: 'iron', opts: {}, normal: 1.5 },
  iron_rusty:   { surf: 'iron', opts: { seed: 63, rust: 0.8 }, normal: 1.8 },
  bronze:       { surf: 'bronze', opts: {}, normal: 1.4 },
  moss:         { surf: 'moss', opts: {}, normal: 1.4 },
  soil:         { surf: 'soil', opts: {}, normal: 2.0 },
  bone:         { surf: 'bone', opts: {}, normal: 1.6 },
  cloth:        { surf: 'cloth', opts: {}, normal: 0.8, side: 'double' },
  crystal_cyan: { surf: 'crystal', opts: {}, normal: 1.0, emissive: 1.4 },
  crystal_violet: { surf: 'crystal', opts: { seed: 91, tint: 0x6a4ac8, glow: 0xb08aff }, normal: 1.0, emissive: 1.3 },
  crystal_cursed: { surf: 'crystal', opts: { seed: 93, tint: 0x5a1a3a, glow: 0xff3a6a, k: 1.2 }, normal: 1.0, emissive: 1.3 },
  glowcap:      { surf: 'glowcap', opts: {}, normal: 1.2, emissive: 1.5 },
  glowcap_teal: { surf: 'glowcap', opts: { seed: 99, tint: 0x1f3a3a, glow: 0x7affd8 }, normal: 1.2, emissive: 1.4 },
  leaf:         { surf: 'leaf', opts: {}, normal: 1.0, side: 'double' },
  leaf_glow:    { surf: 'leaf', opts: { seed: 105, tint: 0x24504a }, normal: 1.0, side: 'double', emissiveColor: 0x2a9a9a, emissive: 0.6 },
  silk:         { surf: 'silk', opts: {}, normal: 1.4, emissive: 1.0 },
  rune_stone:   { surf: 'rune_stone', opts: {}, normal: 2.0, emissive: 2.0 },
  // テクスチャを持たない単色（発光体の芯など。容量を節約）
  glow_core:    { flat: 0xbff4ff, emissiveColor: 0x7fe6ff, emissive: 2.6, rough: 0.3 },
  glow_warm:    { flat: 0xffd9a0, emissiveColor: 0xffb060, emissive: 2.4, rough: 0.4 },
  glow_violet:  { flat: 0xe0c8ff, emissiveColor: 0xb890ff, emissive: 2.4, rough: 0.3 },
  water_glow:   { flat: 0x0b3442, emissiveColor: 0x1d9cc4, emissive: 0.9, rough: 0.05 },
  dark_void:    { flat: 0x050708, rough: 1.0 },
};

const cache = new Map();
// 素材を作る。size はテクスチャの一辺（256/512/1024）
export function makeMaterial(key, size = 512) {
  const ck = key + '@' + size;
  if (cache.has(ck)) return cache.get(ck);
  const d = MATERIAL_DEFS[key];
  if (!d) throw new Error('unknown material ' + key);
  let m;
  if (d.flat !== undefined) {
    m = new THREE.MeshStandardMaterial({ color: new THREE.Color(d.flat), roughness: d.rough ?? 0.8, metalness: 0 });
    if (d.emissive) { m.emissive = new THREE.Color(d.emissiveColor ?? d.flat); m.emissiveIntensity = d.emissive; }
  } else {
    const hasE = d.emissive && !d.emissiveColor;
    const t = bake(size, SURFACES[d.surf](d.opts), { normalStrength: d.normal ?? 2, emissive: hasE });
    const tex = (cv, srgb) => {
      const x = new THREE.CanvasTexture(cv);
      x.flipY = false; x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 4;
      x.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      x.userData.mimeType = 'image/jpeg';
      return x;
    };
    const orm = tex(t.orm, false);
    m = new THREE.MeshStandardMaterial({
      map: tex(t.albedo, true), normalMap: tex(t.normal, false),
      roughnessMap: orm, metalnessMap: orm, aoMap: orm, roughness: 1, metalness: 1,
    });
    if (hasE) { m.emissiveMap = tex(t.emissive, true); m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = d.emissive; }
    else if (d.emissive) { m.emissive = new THREE.Color(d.emissiveColor); m.emissiveIntensity = d.emissive; }
  }
  if (d.side === 'double') m.side = THREE.DoubleSide;
  m.name = key;
  cache.set(ck, m);
  return m;
}

export function materialPreviewCanvases(key, size = 256) {
  const d = MATERIAL_DEFS[key];
  if (d.flat !== undefined) return null;
  return bake(size, SURFACES[d.surf](d.opts), { normalStrength: d.normal ?? 2, emissive: !!(d.emissive && !d.emissiveColor) });
}
