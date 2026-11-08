// 乱数・ノイズ（テクスチャ用の周期ノイズと、形状用の3Dノイズ）
// すべて種（seed）から決定的に生成する。同じ種なら毎回同じ結果になる。

export function rng(seed) {
  let a = (seed >>> 0) || 1;
  const f = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f());
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.sign = () => (f() < 0.5 ? -1 : 1);
  return f;
}

export function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function hash3(x, y, z, s = 0) {
  return hash2(x + Math.imul(z, 1013), y - Math.imul(z, 7919), s);
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const mix = lerp;

// 周期つき勾配ノイズ（2D）。px, py は格子の周期（整数）。戻り値はおよそ -1..1
export function pnoise2(x, y, px, py, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const g = (ix, iy, dx, dy) => {
    const h = hash2(((ix % px) + px) % px, ((iy % py) + py) % py, seed) * Math.PI * 2;
    return Math.cos(h) * dx + Math.sin(h) * dy;
  };
  const u = fade(xf), v = fade(yf);
  return lerp(
    lerp(g(xi, yi, xf, yf), g(xi + 1, yi, xf - 1, yf), u),
    lerp(g(xi, yi + 1, xf, yf - 1), g(xi + 1, yi + 1, xf - 1, yf - 1), u), v) * 1.41;
}

// 周期つき fbm。u,v は 0..1、base は最初の周期（整数）。戻り値 およそ -1..1
export function fbm2(u, v, base, oct = 5, seed = 0, gain = 0.5, sx = 1, sy = 1) {
  let a = 1, sum = 0, norm = 0, f = base;
  for (let o = 0; o < oct; o++) {
    const fx = Math.max(1, Math.round(f * sx)), fy = Math.max(1, Math.round(f * sy));
    sum += a * pnoise2(u * fx, v * fy, fx, fy, seed + o * 31);
    norm += a; a *= gain; f *= 2;
  }
  return sum / norm;
}

// 尾根ノイズ（ひび・樹皮の溝に使う）0..1
export function ridge2(u, v, base, oct, seed, sx = 1, sy = 1) {
  let a = 1, sum = 0, norm = 0, f = base;
  for (let o = 0; o < oct; o++) {
    const fx = Math.max(1, Math.round(f * sx)), fy = Math.max(1, Math.round(f * sy));
    sum += a * (1 - Math.abs(pnoise2(u * fx, v * fy, fx, fy, seed + o * 17)));
    norm += a; a *= 0.5; f *= 2;
  }
  return sum / norm;
}

// 周期つきボロノイ。n はセル数。{f1, f2, id, cx, cy}（cx,cy はセル中心の 0..1 座標）
export function worley2(u, v, n, seed = 0, jitter = 0.9, ny = n) {
  const x = u * n, y = v * ny;
  const xi = Math.floor(x), yi = Math.floor(y);
  let f1 = 9, f2 = 9, id = 0, cx = 0, cy = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const gx = xi + i, gy = yi + j;
    const wx = ((gx % n) + n) % n, wy = ((gy % ny) + ny) % ny;
    const ox = 0.5 + (hash2(wx, wy, seed) - 0.5) * jitter;
    const oy = 0.5 + (hash2(wx, wy, seed + 7) - 0.5) * jitter;
    const dx = gx + ox - x, dy = gy + oy - y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < f1) { f2 = f1; f1 = d; id = wx + wy * 977; cx = (gx + ox) / n; cy = (gy + oy) / ny; }
    else if (d < f2) f2 = d;
  }
  return { f1, f2, id, cx, cy };
}

// 3D シンプレックス風ノイズ（形状の変形用、周期なし）。戻り値 およそ -1..1
export function makeNoise3(seed) {
  const r = rng(seed);
  const p = new Uint8Array(512);
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  const grad = (h, x, y, z) => {
    const g = h & 15, u = g < 8 ? x : y, v = g < 4 ? y : (g === 12 || g === 14 ? x : z);
    return ((g & 1) ? -u : u) + ((g & 2) ? -v : v);
  };
  const n3 = (x, y, z) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(lerp(lerp(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u),
      lerp(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u),
        lerp(grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  };
  n3.fbm = (x, y, z, oct = 4, gain = 0.5) => {
    let a = 1, f = 1, s = 0, n = 0;
    for (let o = 0; o < oct; o++) { s += a * n3(x * f, y * f, z * f); n += a; a *= gain; f *= 2.03; }
    return s / n;
  };
  n3.ridge = (x, y, z, oct = 4) => {
    let a = 1, f = 1, s = 0, n = 0;
    for (let o = 0; o < oct; o++) { s += a * (1 - Math.abs(n3(x * f, y * f, z * f))); n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  };
  return n3;
}
