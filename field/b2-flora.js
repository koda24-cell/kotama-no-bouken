// [B2V4-F] 第2階層「凍てつく水源」の花（霜鈴草・氷水芭蕉・氷晶花）の配置と見た目（設計書 docs/3d/B2_V4_FEEDBACK_DESIGN.md の F10a・F10b）
//
// ・花の形（assets/models/floor2/claude-flowers-candidates/*.glb）は変えない。素材の色・明るさ・発光と、置き方・描き方だけをここで決める。
// ・根元（F10a）：霜鈴草の盛り土・氷水芭蕉の薄氷・氷晶花の岩は床へ沈め、床の色になじむ青白い霜／#203 の岩の青にする。
//   株の足もとに小さな霜の結晶・小石を添え、群れの下に薄い霜の斑（床の光る水脈が透ける半透明）を敷いて「床から生えている」ように見せる。
// ・群れ（F10a）：1か所に3〜7株。高さ・向き・間隔を変え、種類を混ぜる（水辺＝氷水芭蕉、壁ぎわ・部屋の隅＝霜鈴草、結晶の溜まり場の脇＝氷晶花が主）。
//   単体では置かない（3株そろわない場所は群れごと置かない）。通れるマスの中央は空け、壁ぎわ・角・水辺の縁にだけ植える。
// ・群生地（F10b）：各階1か所。迷宮班 M の `meadow`（a.b2Features.meadow／tileTags）があればそこ、無ければ吹き抜けの光の下、無ければ部屋の広い所。
//   3種が一面に咲く（同じ種類がまとまって咲く「吹きだまり」を低い周波数のゆらぎで作る）。中心が濃く縁がまばら・縁と歩く筋の脇ほど小さい株。
//   歩く筋（マスの中心どうしを結ぶ線）は細く空ける。群生地の株は根元の部品（盛り土・薄氷・岩）を外し、床一面の霜と霜の結晶で根元を埋める。
// ・負荷：1株約2万三角形と重いので、
//   1) 形を実行時に間引いた軽い版（QEM の辺の縮約。中＝約16%、遠＝約5%、群生地は約9%／約3.5%）を作り、距離で切り替える（形は1回だけ作って使い回す）。
//   2) 種類×素材×区画ごとの InstancedMesh で描く。区画ごとに画面外は描かず、カメラから FLORA_CONFIG.far（m）より遠い区画も描かない。
import * as THREE from 'three';

export const FLORA_KINDS = ['snowdrop', 'mizubasho', 'bloom'];

// 迷宮班 M の新しい役割（tileRoles／tileTags）が決まったら、ここを差し替えるだけで群生地・水辺の扱いが変わる
export const FLORA_CONFIG = {
  meadowRoles: ['meadow'],                         // 花の群生地（各階1）。あればこのマスの集まりを群生地にする（tileRoles・tileTags のどちらでも）
  waterRoles: ['water', 'water-hazard', 'puddle'], // 水辺とみなす隣のマス（'*' の浅瀬も水辺）
  noPlantRoles: ['water-hazard', 'bridge', 'fixed', 'setpiece-watergate'],   // 株を植えないマス
  shoreRoles: ['shore'],
  roomRoles: ['room', 'template', 'vista', 'meadow'],
  wallSideRoles: ['corridor', 'road', 'deadend', 'room', 'shore', 'vista'],
  groupsPerFloor: 10,     // 群れの数（各階）
  groupSpacing: 4,        // 群れどうしの間隔（マス、チェビシェフ距離）
  groupMin: 3, groupMax: 7,
  quota: { mizubasho: 4, snowdrop: 5, bloom: 3 },  // 主になる種類ごとの群れの上限
  meadowMax: 140,         // 群生地の株数の上限（群生地は軽い版だけで描く。少し大きめの株で一面に見せる）
  meadowStep: 0.5,        // 群生地の株の間隔の目安（m）
  far: 26,                // これより遠い区画は描かない（m。霧の濃さ0.034で約6割が霧に沈む距離）
  // 区画の端までの距離で形の段階を切り替える（m）：[元の形, 中, 遠] の上限（0 はその段階を使わない）
  // 中（約20%）は近くで見ても元の形とほぼ同じ（間引きの比較で確認）なので、元の形（1株約2万三角形）は使わない
  tiers: { group: [0, 9, 24], meadow: [0, 3, 26] },
  lod: { mid: 0.12, lo: 0.04, mMid: 0.045, mLo: 0.02 },
  // 種類ごとの上書き：霜鈴草は細い茎が先に消える（鈴が浮く）ので、軽い版を少し厚めに残す
  lodKind: { snowdrop: { mMid: 0.055, mLo: 0.032 } },
  chunk: 4,               // 群れ以外の区画（マス）
  meadowChunk: 2,         // 群生地の区画（マス。小さいほど遠い区画が軽い版になる）
};

// 目の高さ1.6mの一人称から見えるように拡大した高さ（m）。[低い, 高い]
const HEIGHT = { snowdrop: [0.66, 1.18], bloom: [0.5, 0.84], mizubasho: [0.7, 1.0] };
// 根元を床へ沈める量（原寸の高さに対する値）：霜鈴草の盛り土は高さ0.029、氷晶花の岩は0.062、氷水芭蕉の泥と薄氷は0.016
const SINK = { snowdrop: 0.026, bloom: 0.036, mizubasho: 0.011 };
// 群生地の株（根元の部品を外す）は、茎の付け根が床に少しめり込む程度
const SINK_MEADOW = { snowdrop: 0.012, bloom: 0.03, mizubasho: 0.006 };
const MIX = { mizubasho: ['snowdrop', 'snowdrop', 'bloom'], snowdrop: ['bloom', 'bloom', 'mizubasho'], bloom: ['snowdrop', 'snowdrop', 'mizubasho'] };
// 根元の部品（群生地では外す）
const BASE_KEYS = new Set(['x:flowerBase', 'x:flowerBaseIce', 'x:flowerRock']);

/* ---------------- 素材（field-3d-b2-water.js の追加素材の読み込みから呼ぶ） ---------------- */
// GLB の素材名から、花の素材の仲間を選ぶ
export function floraMaterialClass(m) {
  const nm = (m.name || '').toLowerCase(), trans = (m.transmission || 0) > 0 || m.transparent;
  if (/snow_mound|mz_ice$|mz_ice_crack|mz_mud|mz_dead_grass/.test(nm)) return 'x:flowerBase';   // 盛り土・薄氷の円盤・泥・枯れ草 → 床になじむ青白い霜（白く浮かない）
  if (/snowdrop_frost_crystal|snowdrop_ice_shard|mz_ice_rim/.test(nm)) return 'x:flowerBaseIce';   // 盛り土の縁の氷晶・薄氷の縁
  if (/crystal_rock/.test(nm)) return 'x:flowerRock';                                            // 氷晶花の岩 → #203 の岩の青
  if (/core_glow/.test(nm)) return 'x:flowerGlow';
  return (trans || /ice|frost/.test(nm)) && !/mud|crack|grass/.test(nm) ? 'x:flowerIce' : 'x:flower';
}
// 花の素材を作る（花以外の key は null）
export function floraMaterial(key) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  switch (key) {
    case 'x:flower': return std({ color: 0xffffff, vertexColors: true, roughness: 0.5, metalness: 0.0, emissive: 0x0e4c6a, emissiveIntensity: 0.42, envMapIntensity: 1.0, side: THREE.DoubleSide });
    case 'x:flowerIce': return std({ color: 0xffffff, vertexColors: true, roughness: 0.1, metalness: 0.0, emissive: 0x1890c4, emissiveIntensity: 0.5, envMapIntensity: 1.5, side: THREE.DoubleSide });
    case 'x:flowerGlow': return std({ color: 0xffffff, vertexColors: true, roughness: 0.3, emissive: 0x3cc4ff, emissiveIntensity: 0.95, envMapIntensity: 1.0 });
    // 盛り土：床（caveFloor 0x82bcd8・光る水脈 0x52e2ff）と同じ色域の、床より少しだけ暗い霜。白く飛ばない
    case 'x:flowerBase': return std({ color: 0x6aa0be, vertexColors: true, roughness: 0.66, metalness: 0.0, emissive: 0x165c7c, emissiveIntensity: 0.38, envMapIntensity: 0.7 });
    case 'x:flowerBaseIce': return std({ color: 0x9cd2ea, vertexColors: true, roughness: 0.14, metalness: 0.0, emissive: 0x16709a, emissiveIntensity: 0.32, envMapIntensity: 1.2, side: THREE.DoubleSide });
    // 氷晶花の岩：#203 の岩（Deep cavern rock の青）に寄せる。真っ黒な塊にしない
    case 'x:flowerRock': return std({ color: 0x4c86b4, vertexColors: true, roughness: 0.74, metalness: 0.0, emissive: 0x0a3050, emissiveIntensity: 0.9, envMapIntensity: 0.6 });
    case 'x:floraFrost': return std({ color: 0xa8d8ee, vertexColors: true, roughness: 0.7, metalness: 0.0, emissive: 0x2a86aa, emissiveIntensity: 0.15, envMapIntensity: 0.6, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    default: return null;
  }
}
// 頂点色 × 素材の色。緑（葉・茎）は霜の青緑へ寄せる。盛り土は青白い霜の濃淡、岩は明るさだけ残す
export function floraTint(src, m, n, key) {
  const col = new Float32Array(n * 3), base = m.color || new THREE.Color(1, 1, 1), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    c.setRGB(src ? src.getX(i) : 1, src ? src.getY(i) : 1, src ? src.getZ(i) : 1).multiply(base);
    const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
    if (key === 'x:flowerBase') { const v = 0.8 + 0.2 * Math.min(1, lum); col[i * 3] = v * 0.88; col[i * 3 + 1] = v * 0.96; col[i * 3 + 2] = v; continue; }
    if (key === 'x:flowerBaseIce') { const v = 0.85 + 0.15 * Math.min(1, lum); col[i * 3] = v * 0.86; col[i * 3 + 1] = v * 0.95; col[i * 3 + 2] = v; continue; }
    if (key === 'x:flowerRock') { const v = 0.55 + 0.9 * Math.min(0.5, lum); col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v; continue; }
    const green = Math.max(0, Math.min(1, (c.g - Math.max(c.r, c.b)) * 6)), k = 0.25 + 0.45 * green;
    col[i * 3] = c.r * (1 - k) + lum * 0.78 * k; col[i * 3 + 1] = c.g * (1 - k) + lum * 1.0 * k; col[i * 3 + 2] = c.b * (1 - k) + lum * 1.18 * k;
  }
  return col;
}

/* ---------------- 軽い版の形（QEM の辺の縮約） ---------------- */
// geo：position・normal・color（任意）の形。ratio：残す三角形の割合。法線・色は縮約した頂点で混ぜる。
// 花びら・葉の輪郭（縁の辺）は、面に垂直な拘束平面で保つ。面が裏返る縮約はしない。
export function simplifyGeometry(geo, ratio, minTris = 8) {
  const P = geo.attributes.position, N = geo.attributes.normal, Ca = geo.attributes.color;
  const nIdx = geo.index ? geo.index.count : P.count, IX = geo.index ? geo.index.array : null;
  // 位置で溶接（法線・色は平均）
  const vmap = new Map(), remap = new Int32Array(P.count), vx = [], at = [];
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const k = `${Math.round(x * 2e4)},${Math.round(y * 2e4)},${Math.round(z * 2e4)}`;
    let v = vmap.get(k);
    if (v === undefined) { v = vx.length / 3; vmap.set(k, v); vx.push(x, y, z); at.push(0, 0, 0, 0, 0, 0, 0); }
    const o = v * 7; if (N) { at[o] += N.getX(i); at[o + 1] += N.getY(i); at[o + 2] += N.getZ(i); } if (Ca) { at[o + 3] += Ca.getX(i); at[o + 4] += Ca.getY(i); at[o + 5] += Ca.getZ(i); } at[o + 6]++;
    remap[i] = v;
  }
  const nv = vx.length / 3, A = Float64Array.from(at);
  for (let v = 0; v < nv; v++) { const o = v * 7, l = Math.hypot(A[o], A[o + 1], A[o + 2]) || 1, w = A[o + 6] || 1; A[o] /= l; A[o + 1] /= l; A[o + 2] /= l; A[o + 3] /= w; A[o + 4] /= w; A[o + 5] /= w; }
  const Fl = [];
  for (let t = 0; t + 2 < nIdx; t += 3) { const a = remap[IX ? IX[t] : t], b = remap[IX ? IX[t + 1] : t + 1], c = remap[IX ? IX[t + 2] : t + 2]; if (a !== b && b !== c && a !== c) Fl.push(a, b, c); }
  const F = Int32Array.from(Fl), nf = F.length / 3, target = Math.max(minTris, Math.floor(nf * ratio));
  const pos = Float64Array.from(vx), Q = new Float64Array(nv * 10), alive = new Uint8Array(nf).fill(1);
  const vfaces = new Array(nv); for (let v = 0; v < nv; v++) vfaces[v] = [];
  for (let f = 0; f < nf; f++) { vfaces[F[f * 3]].push(f); vfaces[F[f * 3 + 1]].push(f); vfaces[F[f * 3 + 2]].push(f); }
  const addQ = (v, a, b, c, d, w) => { const o = v * 10; Q[o] += w * a * a; Q[o + 1] += w * a * b; Q[o + 2] += w * a * c; Q[o + 3] += w * a * d; Q[o + 4] += w * b * b; Q[o + 5] += w * b * c; Q[o + 6] += w * b * d; Q[o + 7] += w * c * c; Q[o + 8] += w * c * d; Q[o + 9] += w * d * d; };
  let fx = 0, fy = 0, fz = 0;
  const fnorm = (f) => {
    const a = F[f * 3] * 3, b = F[f * 3 + 1] * 3, c = F[f * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], wx = pos[c] - pos[a], wy = pos[c + 1] - pos[a + 1], wz = pos[c + 2] - pos[a + 2];
    fx = uy * wz - uz * wy; fy = uz * wx - ux * wz; fz = ux * wy - uy * wx;
  };
  const edgeCount = new Map(), ek = (a, b) => (a < b ? a * nv + b : b * nv + a);
  for (let f = 0; f < nf; f++) {
    fnorm(f); const len = Math.hypot(fx, fy, fz);
    for (let k = 0; k < 3; k++) { const e = ek(F[f * 3 + k], F[f * 3 + (k + 1) % 3]); edgeCount.set(e, (edgeCount.get(e) || 0) + 1); }
    if (len < 1e-14) continue;
    // 面ごとに同じ重み（面積で重みづけすると、細かく作られた小さな花＝霜鈴草の鈴が先に消える）
    const nx = fx / len, ny = fy / len, nz = fz / len, a = F[f * 3] * 3, d = -(nx * pos[a] + ny * pos[a + 1] + nz * pos[a + 2]);
    for (let k = 0; k < 3; k++) addQ(F[f * 3 + k], nx, ny, nz, d, 1);
  }
  for (let f = 0; f < nf; f++) {
    fnorm(f); if (Math.hypot(fx, fy, fz) < 1e-14) continue;
    for (let k = 0; k < 3; k++) {
      const v1 = F[f * 3 + k], v2 = F[f * 3 + (k + 1) % 3]; if (edgeCount.get(ek(v1, v2)) !== 1) continue;
      const ex = pos[v2 * 3] - pos[v1 * 3], ey = pos[v2 * 3 + 1] - pos[v1 * 3 + 1], ez = pos[v2 * 3 + 2] - pos[v1 * 3 + 2];
      let px = ey * fz - ez * fy, py = ez * fx - ex * fz, pz = ex * fy - ey * fx; const pl = Math.hypot(px, py, pz); if (pl < 1e-14) continue;
      px /= pl; py /= pl; pz /= pl; const d = -(px * pos[v1 * 3] + py * pos[v1 * 3 + 1] + pz * pos[v1 * 3 + 2]), w = 3;
      addQ(v1, px, py, pz, d, w); addQ(v2, px, py, pz, d, w);
    }
  }
  // 候補の辺：型付き配列のヒープ（古くなった候補は頂点の版で見分けて捨てる）
  let cap = 1 << 15, n = 0, rec = 0;
  let hk = new Float64Array(cap), hr = new Int32Array(cap), RA = new Int32Array(cap), RB = new Int32Array(cap), RVA = new Int32Array(cap), RVB = new Int32Array(cap), RT = new Float32Array(cap);
  const grow = () => { cap *= 2; const g = (old, T) => { const x = new T(cap); x.set(old); return x; }; hk = g(hk, Float64Array); hr = g(hr, Int32Array); RA = g(RA, Int32Array); RB = g(RB, Int32Array); RVA = g(RVA, Int32Array); RVB = g(RVB, Int32Array); RT = g(RT, Float32Array); };
  const ver = new Int32Array(nv), dead = new Uint8Array(nv);
  const push = (cost, a, b, t) => {
    if (rec >= cap) grow();
    const r = rec++; RA[r] = a; RB[r] = b; RVA[r] = ver[a]; RVB[r] = ver[b]; RT[r] = t;
    let i = n++; while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= cost) break; hk[i] = hk[p]; hr[i] = hr[p]; i = p; }
    hk[i] = cost; hr[i] = r;
  };
  const pop = () => {
    const top = hr[0]; n--;
    if (n > 0) {
      const lk = hk[n], lr = hr[n]; let i = 0;
      for (;;) { const l = i * 2 + 1, r = l + 1; let m = -1, mk = lk; if (l < n && hk[l] < mk) { m = l; mk = hk[l]; } if (r < n && hk[r] < mk) m = r; if (m < 0) break; hk[i] = hk[m]; hr[i] = hr[m]; i = m; }
      hk[i] = lk; hr[i] = lr;
    }
    return top;
  };
  const err = (o1, o2, x, y, z) =>
    (Q[o1] + Q[o2]) * x * x + 2 * (Q[o1 + 1] + Q[o2 + 1]) * x * y + 2 * (Q[o1 + 2] + Q[o2 + 2]) * x * z + 2 * (Q[o1 + 3] + Q[o2 + 3]) * x
    + (Q[o1 + 4] + Q[o2 + 4]) * y * y + 2 * (Q[o1 + 5] + Q[o2 + 5]) * y * z + 2 * (Q[o1 + 6] + Q[o2 + 6]) * y + (Q[o1 + 7] + Q[o2 + 7]) * z * z + 2 * (Q[o1 + 8] + Q[o2 + 8]) * z + (Q[o1 + 9] + Q[o2 + 9]);
  const cand = (a, b) => {
    const o1 = a * 10, o2 = b * 10; let bc = Infinity, bt = 0;
    for (let s = 0; s < 3; s++) {
      const t = s * 0.5, x = pos[a * 3] + (pos[b * 3] - pos[a * 3]) * t, y = pos[a * 3 + 1] + (pos[b * 3 + 1] - pos[a * 3 + 1]) * t, z = pos[a * 3 + 2] + (pos[b * 3 + 2] - pos[a * 3 + 2]) * t;
      const c = err(o1, o2, x, y, z); if (c < bc) { bc = c; bt = t; }
    }
    push(Math.max(0, bc), a, b, bt);
  };
  const seen = new Set();
  for (let f = 0; f < nf; f++) for (let k = 0; k < 3; k++) { const a = F[f * 3 + k], b = F[f * 3 + (k + 1) % 3], e = ek(a, b); if (seen.has(e)) continue; seen.add(e); cand(Math.min(a, b), Math.max(a, b)); }
  let faces = nf, guard = nf * 40;
  const mark = new Int32Array(nv).fill(-1);
  while (faces > target && n > 0 && guard-- > 0) {
    const r = pop(), a = RA[r], b = RB[r];
    if (dead[a] || dead[b] || ver[a] !== RVA[r] || ver[b] !== RVB[r]) continue;
    const t = RT[r];
    const x = pos[a * 3] + (pos[b * 3] - pos[a * 3]) * t, y = pos[a * 3 + 1] + (pos[b * 3 + 1] - pos[a * 3 + 1]) * t, z = pos[a * 3 + 2] + (pos[b * 3 + 2] - pos[a * 3 + 2]) * t;
    let bad = false;
    for (let s = 0; s < 2 && !bad; s++) {
      const v = s ? b : a, list = vfaces[v], ox = pos[v * 3], oy = pos[v * 3 + 1], oz = pos[v * 3 + 2];
      for (let j = 0; j < list.length; j++) {
        const f = list[j]; if (!alive[f]) continue;
        const fa = F[f * 3], fb = F[f * 3 + 1], fc = F[f * 3 + 2];
        if ((fa === a || fb === a || fc === a) && (fa === b || fb === b || fc === b)) continue;
        fnorm(f); const n0x = fx, n0y = fy, n0z = fz;
        pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z; fnorm(f); pos[v * 3] = ox; pos[v * 3 + 1] = oy; pos[v * 3 + 2] = oz;
        const l0 = Math.hypot(n0x, n0y, n0z), l1 = Math.hypot(fx, fy, fz);
        if (l1 < 1e-16 || n0x * fx + n0y * fy + n0z * fz < 0.3 * l0 * l1) { bad = true; break; }
      }
    }
    if (bad) continue;   // 裏返るなら捨てる（周りが変われば候補に戻る）
    pos[a * 3] = x; pos[a * 3 + 1] = y; pos[a * 3 + 2] = z;
    for (let i = 0; i < 10; i++) Q[a * 10 + i] += Q[b * 10 + i];
    const oa = a * 7, ob = b * 7;
    for (let i = 0; i < 6; i++) A[oa + i] = A[oa + i] * (1 - t) + A[ob + i] * t;
    const l = Math.hypot(A[oa], A[oa + 1], A[oa + 2]) || 1; A[oa] /= l; A[oa + 1] /= l; A[oa + 2] /= l;
    dead[b] = 1;
    const nl = [], la = vfaces[a], lb = vfaces[b];
    for (let j = 0; j < la.length; j++) if (alive[la[j]]) nl.push(la[j]);
    for (let j = 0; j < lb.length; j++) {
      const f = lb[j]; if (!alive[f]) continue;
      for (let k = 0; k < 3; k++) if (F[f * 3 + k] === b) F[f * 3 + k] = a;
      const fa = F[f * 3], fb = F[f * 3 + 1], fc = F[f * 3 + 2];
      if (fa === fb || fb === fc || fa === fc) { alive[f] = 0; faces--; } else nl.push(f);
    }
    vfaces[b] = [];
    const fin = []; for (const f of nl) if (alive[f]) fin.push(f); vfaces[a] = fin;
    ver[a]++;
    for (const f of fin) for (let k = 0; k < 3; k++) { const v = F[f * 3 + k]; if (v !== a && mark[v] !== ver[a]) { mark[v] = ver[a]; cand(Math.min(a, v), Math.max(a, v)); } }
  }
  const out = []; for (let f = 0; f < nf; f++) if (alive[f]) out.push(F[f * 3], F[f * 3 + 1], F[f * 3 + 2]);
  const m = out.length, p = new Float32Array(m * 3), nn = new Float32Array(m * 3), cc = Ca ? new Float32Array(m * 3) : null;
  for (let i = 0; i < m; i++) {
    const v = out[i], o = v * 7;
    p[i * 3] = pos[v * 3]; p[i * 3 + 1] = pos[v * 3 + 1]; p[i * 3 + 2] = pos[v * 3 + 2];
    nn[i * 3] = A[o]; nn[i * 3 + 1] = A[o + 1]; nn[i * 3 + 2] = A[o + 2];
    if (cc) { cc[i * 3] = A[o + 3]; cc[i * 3 + 1] = A[o + 4]; cc[i * 3 + 2] = A[o + 5]; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nn, 3)); if (cc) g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}
// 種類ごとの形の段階（読み込んだ形 EX[kind] ごとに1回だけ作り、組み立て直しでも使い回す。破棄しない）
//   hi＝元の形、mid・lo＝群れの中・遠、mMid・mLo＝群生地の中・遠（根元の部品なし）
//   遠（lo・mLo）は描く回数を減らすため、光る芯以外の部品を1つの形にまとめ、素材の色の違いは頂点色へ焼き込む（素材は x:flower）
const LOD_CACHE = new WeakMap();
const BAKE = { 'x:flowerBase': 0x6aa0be, 'x:flowerBaseIce': 0x9cd2ea, 'x:flowerRock': 0x4c86b4 };
function mergeFar(parts, keepIce = false) {
  const sep = (pt) => pt.mat === 'x:flowerGlow' || (keepIce && pt.mat === 'x:flowerIce');
  const keep = parts.filter(sep), rest = parts.filter((pt) => !sep(pt));
  if (rest.length < 2) return parts;
  let n = 0; for (const pt of rest) n += pt.geo.attributes.position.count;
  const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), Cc = new Float32Array(n * 3), col = new THREE.Color();
  let o = 0;
  for (const pt of rest) {
    const g = pt.geo, m = g.attributes.position.count, c = g.attributes.color; col.setHex(BAKE[pt.mat] ?? 0xffffff);
    P.set(g.attributes.position.array, o * 3); Nn.set(g.attributes.normal.array, o * 3);
    for (let i = 0; i < m; i++) { Cc[(o + i) * 3] = (c ? c.getX(i) : 1) * col.r; Cc[(o + i) * 3 + 1] = (c ? c.getY(i) : 1) * col.g; Cc[(o + i) * 3 + 2] = (c ? c.getZ(i) : 1) * col.b; }
    o += m;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); geo.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  return [{ geo, mat: 'x:flower' }, ...keep];
}
function lodSets(ex, L) {
  let c = LOD_CACHE.get(ex);
  if (!c) { c = { hi: ex.parts }; LOD_CACHE.set(ex, c); }
  // 中・群生地の中も、氷（つや）と光る芯以外は1つにまとめて描く回数を減らす
  if (!c.midS) c.midS = ex.parts.map((pt) => ({ geo: simplifyGeometry(pt.geo, Math.max(L.mid, L.mMid)), mat: pt.mat }));
  const base = Math.max(L.mid, L.mMid);
  if (!c.mid) c.mid = mergeFar(c.midS.map((pt) => (L.mid >= base ? pt : { geo: simplifyGeometry(pt.geo, L.mid / base), mat: pt.mat })), true);
  if (!c.lo) c.lo = mergeFar(c.midS.map((pt) => ({ geo: simplifyGeometry(pt.geo, L.lo / base), mat: pt.mat })));
  const mm = c.midS.filter((pt) => !BASE_KEYS.has(pt.mat)).map((pt) => ({ geo: simplifyGeometry(pt.geo, L.mMid / base), mat: pt.mat }));
  if (!c.mMid) c.mMid = mergeFar(mm, true);
  if (!c.mLo) c.mLo = mergeFar(mm.map((pt) => ({ geo: simplifyGeometry(pt.geo, L.mLo / L.mMid), mat: pt.mat })));
  return c;
}

/* ---------------- 配置 ---------------- */
// ctx：field-3d-b2-water.js の build() から渡す（a, ch, wallCell, objAt, roles, role, H, X, Z, CELL, DIR_VEC, DIR_ORDER, groundY,
//      falls, openCells, propCells, monumentCells, keepClear, zones, sky, onBridge, spots, EX, mats, root, light）
export function createFlora(ctx) {
  const C = { ...FLORA_CONFIG, ...(ctx.config || {}) };
  const { a, ch, wallCell, objAt, roles, role, H, X, Z, CELL, DIR_VEC, DIR_ORDER, groundY, EX, mats } = ctx;
  const vec = (d) => DIR_VEC[d];
  const k2 = (tx, ty) => `${tx},${ty}`;
  const tags = a.tileTags || null;
  const tagAt = (tx, ty, names) => { const t = tags && tags[ty] && tags[ty][tx]; return !!t && (Array.isArray(t) ? t : [t]).some((q) => names.includes(q)); };
  const isWaterCell = (tx, ty) => !wallCell(tx, ty) && (ch(tx, ty) === '*' || (roles && C.waterRoles.includes(role(tx, ty))) || tagAt(tx, ty, C.waterRoles));
  const cellOf = (x, z) => [Math.round(x / CELL), Math.round(z / CELL)];
  // 株を植えられるマス（水の '*' は氷水芭蕉だけ）
  const plantable = (tx, ty) => {
    const k = k2(tx, ty), c = ch(tx, ty);
    if (tx < 0 || ty < 0 || tx >= a.w || ty >= a.h || wallCell(tx, ty) || objAt.has(k) || c === '<' || c === '>') return false;
    if (ctx.falls.has(k) || ctx.propCells.has(k) || ctx.monumentCells.has(k) || ctx.keepClear.has(k) || (ctx.onBridge && ctx.onBridge(tx, ty))) return false;
    if (roles && C.noPlantRoles.includes(role(tx, ty))) return false;
    if (tagAt(tx, ty, C.noPlantRoles)) return false;
    return true;
  };
  const avail = (kind) => !!EX[kind];
  const plants = [];   // { kind, x, y, z, ry, s, r, chunk, tint, set: 'group'|'meadow' }
  const dress = [];    // 足もとの霜の結晶・小石 { type, m }
  const patches = [];  // 霜の斑 { x, z, ra, rb, ang, amax }
  const groups = [], groupLog = [];
  let meadow = null;
  const closeups = [];   // 確認用：根元の接写の位置

  const sizeOf = (kind) => EX[kind].size;
  const plantScale = (kind, t) => { const [lo, hi] = HEIGHT[kind]; return (lo + (hi - lo) * t) / Math.max(sizeOf(kind).y, 0.01); };
  const radiusOf = (kind, s) => 0.5 * Math.max(sizeOf(kind).x, sizeOf(kind).z) * s * 0.85;
  const clash = (x, z, r, f = 0.5) => plants.some((p) => Math.hypot(p.x - x, p.z - z) < f * (p.r + r));
  // 足もと：霜の結晶・小石（水の中には置かない）
  function addDress(x, z, r, seed, ns, np) {
    const [tx, ty] = cellOf(x, z);
    for (let i = 0; i < ns + np; i++) {
      const ang = H(tx * 3 + i, ty + seed, 943) * Math.PI * 2, rad = r * (0.35 + H(tx + i, ty * 5 + seed, 944) * 0.6);
      const px = x + Math.cos(ang) * rad, pz = z + Math.sin(ang) * rad, [cx, cy] = cellOf(px, pz);
      if (!plantable(cx, cy) || ch(cx, cy) === '*') continue;
      const shard = i < ns, sc = shard ? 0.7 + H(i, seed, 945) * 0.9 : 0.7 + H(i, seed, 946) * 0.8;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((H(i, seed, 947) - 0.5) * (shard ? 0.8 : 0.3), H(i, seed, 948) * 6.28, (H(i, seed, 949) - 0.5) * (shard ? 0.8 : 0.3), 'YXZ'));
      const m = new THREE.Matrix4().compose(new THREE.Vector3(px, groundY(px, pz) - (shard ? 0.03 : 0.015), pz), q, new THREE.Vector3(sc, sc * (shard ? 0.8 + H(i, seed, 950) * 0.8 : 1), sc));
      dress.push({ type: shard ? 'shard' : 'pebble', m });
    }
  }
  function addPlant(kind, x, z, ry, s, chunk, seed, set = 'group') {
    const [tx, ty] = cellOf(x, z), wet = ch(tx, ty) === '*';
    const sink = (set === 'meadow' ? SINK_MEADOW : SINK)[kind] * s;
    const y = wet ? -0.1 : groundY(x, z) - sink;
    const r = radiusOf(kind, s), tint = 0.9 + H(tx * 7 + seed, ty * 3, 940) * 0.14;
    plants.push({ kind, x, y, z, ry, s, r, chunk, tint, wet, set });
    if (wet) return;
    if (set === 'meadow') addDress(x, z, r * 0.8, seed, 1 + Math.floor(H(tx + seed, ty, 941) * 2), H(tx, ty + seed, 942) < 0.35 ? 1 : 0);
    else addDress(x, z, r, seed, 2 + Math.floor(H(tx + seed, ty, 941) * 3), 1 + Math.floor(H(tx, ty + seed, 942) * 2));
  }

  /* ---- 群生地（F10b） ---- */
  function findMeadow() {
    if (ctx.findMeadow) { const m = ctx.findMeadow(); if (m) return m; }   // 差し替え口（迷宮班 M の情報で決めたいとき）
    // 迷宮班 M の群生地（ランダム階）：a.b2Features.meadow.cells → tileTags／tileRoles の meadow
    const fm = a.b2Features && a.b2Features.meadow && a.b2Features.meadow.cells;
    if (fm && fm.length) { const cells = fm.filter(([x, y]) => !wallCell(x, y)); if (cells.length) return { source: 'feature', cells }; }
    if (roles || tags) {
      const cells = [];
      for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) if (!wallCell(tx, ty) && ((roles && C.meadowRoles.includes(role(tx, ty))) || tagAt(tx, ty, C.meadowRoles))) cells.push([tx, ty]);
      if (cells.length) return { source: 'role', cells };
    }
    if (ctx.sky) { const cells = []; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) cells.push([ctx.sky.cx + dx, ctx.sky.cy + dz]); return { source: 'atrium', cells }; }
    // 部屋の中で、通れるマスが一番多い3×3（ランダム階は room/shore、固定階は全体）
    let best = null;
    for (let cy = 1; cy < a.h - 1; cy++) for (let cx = 1; cx < a.w - 1; cx++) {
      if (roles && !C.roomRoles.concat(C.shoreRoles).includes(role(cx, cy))) continue;
      const cells = []; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (plantable(cx + dx, cy + dz)) cells.push([cx + dx, cy + dz]);
      const sc = cells.length + H(cx, cy, 960) * 0.5;
      if (cells.length >= 4 && (!best || sc > best.sc)) best = { source: 'room', cells, sc };
    }
    return best;
  }
  // なめらかなゆらぎ（-1〜1）：同じ種類がまとまって咲く吹きだまりを作る
  const noise2 = (x, z, s) => (Math.sin(x * 0.83 + s * 1.7 + Math.sin(z * 0.61 + s) * 1.3) * Math.cos(z * 0.77 - s * 0.9 + Math.sin(x * 0.53 - s * 2.1) * 1.1));
  function plantMeadow() {
    const mz = findMeadow(); if (!mz || !mz.cells.length) return;
    const cellsOk = mz.cells.filter(([x, y]) => plantable(x, y));
    if (!cellsOk.length) return;
    const set = new Set(cellsOk.map(([x, y]) => k2(x, y)));
    const mx = cellsOk.reduce((s, c) => s + c[0], 0) / cellsOk.length, my = cellsOk.reduce((s, c) => s + c[1], 0) / cellsOk.length;
    const ccx = X(mx), ccz = Z(my);
    let R = 0; for (const [tx, ty] of cellsOk) R = Math.max(R, Math.hypot(X(tx) - ccx, Z(ty) - ccz) + CELL * 0.5);
    const kinds = FLORA_KINDS.filter(avail); if (!kinds.length) return;
    // 群生地のマスの縁（隣が群生地でない＝壁・通路の側）までの距離で、縁をまばらにする
    const edgeDist = (x, z) => {
      const [tx, ty] = cellOf(x, z), lx = x - X(tx), lz = z - Z(ty); let dm = 9;
      for (const d of DIR_ORDER) { const [dx, dz] = vec(d); if (set.has(k2(tx + dx, ty + dz))) continue; dm = Math.min(dm, CELL / 2 - (lx * dx + lz * dz)); }
      return dm;
    };
    const cands = [];
    const xs = cellsOk.map((c) => c[0]), ys = cellsOk.map((c) => c[1]);
    const x0 = X(Math.min(...xs)) - CELL / 2, x1 = X(Math.max(...xs)) + CELL / 2, z0 = Z(Math.min(...ys)) - CELL / 2, z1 = Z(Math.max(...ys)) + CELL / 2;
    // 乱数の種は床の絶対位置と階ごとの値から（群生地の外枠からの番号だと、どの階も同じ並び・同じ内訳になる）
    const step = C.meadowStep, seedK = H(Math.round(mx), Math.round(my), 959) * 10;
    let fseed = 0; for (const ch2 of String(a.buildKey || a.key || '')) fseed = (fseed * 31 + ch2.charCodeAt(0)) % 100003;
    let n = 0;
    for (let gz = z0 + step / 2; gz < z1; gz += step) for (let gx = x0 + step / 2; gx < x1; gx += step) {
      n = Math.round(gx / step) * 1013 + Math.round(gz / step) * 7 + fseed;
      const x = gx + (H(n, 3, 961) - 0.5) * step * 0.9, z = gz + (H(n, 5, 962) - 0.5) * step * 0.9, [tx, ty] = cellOf(x, z);
      if (!set.has(k2(tx, ty))) continue;
      const lx = x - X(tx), lz = z - Z(ty), dn = Math.min(1, Math.hypot(x - ccx, z - ccz) / R), ed = edgeDist(x, z);
      const wet = ch(tx, ty) === '*', nearWet = DIR_ORDER.some((d) => isWaterCell(tx + vec(d)[0], ty + vec(d)[1]));
      // 壁にはみ出さない
      let inWall = false;
      for (const d of DIR_ORDER) { const [dx, dz] = vec(d); if (wallCell(tx + dx, ty + dz) && lx * dx + lz * dz > CELL / 2 - 0.3) inWall = true; }
      if (inWall) continue;
      // 歩く筋：マスの中心の円と、隣の通れるマスへ向かう細い筋を空ける
      const lane = 0.42, center = Math.hypot(lx, lz);
      if (center < 0.62) continue;
      let laneD = center - 0.62;
      for (const d of DIR_ORDER) {
        const [dx, dz] = vec(d); if (wallCell(tx + dx, ty + dz) || isWaterCell(tx + dx, ty + dz)) continue;
        const along = lx * dx + lz * dz, side = Math.abs(lx * dz - lz * dx);
        if (along > 0) laneD = Math.min(laneD, side - lane);
      }
      if (laneD < 0) continue;
      // 種類：ゆらぎで吹きだまり。水の中・水辺は氷水芭蕉、壁ぎわ（縁）は氷晶花が混ざる
      const nz1 = noise2(x, z, seedK), nz2 = noise2(x * 1.3 + 7, z * 1.3 - 3, seedK + 4), hk = H(n, 7, 963);
      let kind;
      if (wet) { if (hk > 0.32) continue; kind = 'mizubasho'; }
      else if (nearWet && nz2 > 0.15 && hk < 0.55) kind = 'mizubasho';
      else if (nz1 > 0.5 || (ed < 0.9 && hk < 0.16)) kind = 'bloom';
      else if (nz2 > 0.62 && hk < 0.5) kind = 'mizubasho';
      else kind = hk < 0.94 ? 'snowdrop' : 'bloom';
      if (!avail(kind)) kind = kinds[Math.floor(hk * kinds.length) % kinds.length];
      if (wet && kind !== 'mizubasho') continue;
      // 密度：中心が濃く、縁がまばら
      const dens = 0.95 - dn * 0.45 - (ed < 0.6 ? 0.35 : 0) - (kind === 'mizubasho' ? 0.35 : 0);
      if (H(n, 11, 965) > dens) continue;
      // 高さ：中心ほど高く、縁・歩く筋の脇ほど低い（吹きだまりの中は高さをそろえすぎない）
      let t = 0.85 - dn * 0.5 + (H(n, 9, 964) - 0.5) * 0.5;
      if (laneD < 0.35) t -= 0.35; if (ed < 0.7) t -= 0.25;
      const s = plantScale(kind, Math.max(0, Math.min(1, t))) * (kind === 'mizubasho' ? 0.9 : 1.12), r = radiusOf(kind, s);
      cands.push({ kind, x, z, s, r, dn, k: dn * 0.6 + H(n, 13, 966) * 0.5, ry: H(n, 15, 967) * 6.28, seed: n });
    }
    cands.sort((p, q) => p.k - q.k);
    const chosen = [];
    for (const c of cands) {
      if (chosen.length >= C.meadowMax) break;
      const f = c.kind === 'mizubasho' || chosen.some((p) => p.kind === 'mizubasho' && Math.hypot(p.x - c.x, p.z - c.z) < p.r + c.r) ? 0.78 : 0.5;
      if (chosen.some((p) => Math.hypot(p.x - c.x, p.z - c.z) < f * (p.r + c.r)) || clash(c.x, c.z, c.r, 0.6)) continue;
      chosen.push(c);
    }
    // 3種がそろうように（足りない種類は、縁の株を入れ替える）
    for (const kind of kinds) if (chosen.filter((c) => c.kind === kind).length < 3) {
      for (const rep of [...chosen].reverse().filter((c) => c.kind === 'snowdrop' && ch(...cellOf(c.x, c.z)) !== '*').slice(0, 3)) { rep.kind = kind; rep.s = plantScale(kind, 0.4); rep.r = radiusOf(kind, rep.s); }
    }
    for (const c of chosen) {
      const [tx, ty] = cellOf(c.x, c.z);
      addPlant(c.kind, c.x, c.z, c.ry, c.s, `m${Math.floor(tx / C.meadowChunk)},${Math.floor(ty / C.meadowChunk)}`, c.seed + 500, 'meadow');
    }
    if (chosen.length) {
      // 群生地の床一面の霜（マスの外へ出さない）。中心ほど濃い
      for (const [tx, ty] of cellsOk) if (ch(tx, ty) !== '*') patches.push({ x: X(tx), z: Z(ty), ra: CELL * 0.62, rb: CELL * 0.62, ang: 0, amax: 0.15 - Math.min(1, Math.hypot(X(tx) - ccx, Z(ty) - ccz) / R) * 0.04, set, square: true });
      ctx.light(ccx, 1.1, ccz, 0x8fe6ff, 0.35, 7);
      // 根元の接写の位置（確認用）：中心に近い株を種類ごとに1つ、通路側から見る
      for (const kind of kinds) {
        const c = chosen.filter((q) => q.kind === kind && ch(...cellOf(q.x, q.z)) !== '*').sort((p, q) => p.dn - q.dn)[0]; if (!c) continue;
        const [tx, ty] = cellOf(c.x, c.z), vx = X(tx) - c.x, vz = Z(ty) - c.z, l = Math.hypot(vx, vz) || 1;
        closeups.push({ kind, x: +c.x.toFixed(2), z: +c.z.toFixed(2), vx: +(vx / l).toFixed(3), vz: +(vz / l).toFixed(3) });
      }
    }
    meadow = { source: mz.source, center: k2(Math.round(mx), Math.round(my)), cells: cellsOk.map((c) => k2(c[0], c[1])), plants: chosen.length, kinds: Object.fromEntries(kinds.map((k) => [k, chosen.filter((c) => c.kind === k).length])) };
  }

  /* ---- 群れ（F10a） ---- */
  // 群れの起点：{ tx, ty, d（寄せる壁・水の向き）, d2（角のもう一方の壁）, kind, edge: 'wall'|'water', pri }
  function anchors() {
    const out = [];
    const wallsOf = (tx, ty) => DIR_ORDER.filter((d) => wallCell(tx + vec(d)[0], ty + vec(d)[1]));
    const cornerOf = (ws) => ws.length === 2 && (DIR_ORDER.indexOf(ws[1]) - DIR_ORDER.indexOf(ws[0])) % 2 !== 0;
    // #203 の候補（光るキノコ・荊の位置＋結晶の溜まり場の脇。4F はこれだけ＝元の候補の範囲で群れにする）
    for (const sp of ctx.spots || []) {
      if (!sp.d) continue;
      const ws = wallsOf(sp.tx, sp.ty), d2 = cornerOf(ws) ? ws.find((q) => q !== sp.d) : null;
      out.push({ tx: sp.tx, ty: sp.ty, d: sp.d, d2, kind: sp.kind, edge: 'wall', pri: (sp.pri || 0) + (sp.water ? 0.3 : 0) });
    }
    if (roles) {
      for (let ty = 1; ty < a.h - 1; ty++) for (let tx = 1; tx < a.w - 1; tx++) {
        if (!plantable(tx, ty) || ch(tx, ty) === '*' || ctx.openCells.has(k2(tx, ty))) continue;
        const r0 = role(tx, ty), ws = wallsOf(tx, ty);
        const wd = DIR_ORDER.filter((d) => isWaterCell(tx + vec(d)[0], ty + vec(d)[1]));
        if (wd.length) out.push({ tx, ty, d: wd[Math.floor(H(tx, ty, 970) * wd.length)], d2: null, kind: 'mizubasho', edge: 'water', pri: -0.2 });
        else if (C.shoreRoles.includes(r0) && ws.length) out.push({ tx, ty, d: ws[0], d2: cornerOf(ws) ? ws[1] : null, kind: 'mizubasho', edge: 'wall', pri: -0.1 });
        else if (cornerOf(ws) && C.roomRoles.includes(r0)) out.push({ tx, ty, d: ws[0], d2: ws[1], kind: 'snowdrop', edge: 'wall', pri: 0 });
        else if (ws.length && C.wallSideRoles.includes(r0)) out.push({ tx, ty, d: ws[Math.floor(H(tx, ty, 971) * ws.length)], d2: null, kind: 'snowdrop', edge: 'wall', pri: r0 === 'deadend' ? 0.1 : 0.3 });
        // 結晶の溜まり場の脇＝氷晶花
        if (ws.length && ctx.zones.some((zq) => Math.max(Math.abs(zq.tx - tx), Math.abs(zq.ty - ty)) === 1)) out.push({ tx, ty, d: ws[0], d2: cornerOf(ws) ? ws[1] : null, kind: 'bloom', edge: 'wall', pri: -0.35 });
      }
    }
    return out;
  }
  function plantGroup(an, gi) {
    const [nx, nz] = vec(an.d), cx = X(an.tx), cz = Z(an.ty);
    const [qx, qz] = an.d2 ? vec(an.d2) : [-nz, nx];   // 壁に沿う向き（角ならもう一方の壁の向き）
    const want = C.groupMin + Math.floor(H(an.tx, an.ty, 972 + gi) * (C.groupMax - C.groupMin + 1));
    const main = avail(an.kind) ? an.kind : FLORA_KINDS.find(avail); if (!main) return null;
    const mix = MIX[main].filter(avail);
    const placed = [];
    for (let t = 0; t < 60 && placed.length < want; t++) {
      const h = (s) => H(an.tx * 11 + t, an.ty * 7 + gi, s);
      let kind = main;
      if (mix.length && (h(973) < 0.28 || (placed.length === 2 && want >= 4 && !placed.some((p) => p.kind !== main)))) kind = mix[Math.floor(h(974) * mix.length) % mix.length];
      // 高さ：1株目を高く、あとは低め〜中くらいに散らす（同じ高さに並ばない）
      const s = plantScale(kind, placed.length === 0 ? 0.75 + h(975) * 0.25 : h(975) * 0.85), r = radiusOf(kind, s);
      // 壁・水へ寄せる深さ u と、沿う向きの位置 v（角は角へ寄せる）。マスの中心から1m以内には置かない
      // 壁ぎわの石筍（壁から0.25〜0.55m）の手前に植え、石筍の根元に寄り添わせる（石筍の陰に隠れない）
      let u = 0.95 + h(976) * 0.55;
      const v = an.d2 ? 0.25 + h(977) * 1.5 : (h(977) * 2 - 1) * 1.6;
      if (an.edge === 'wall') u = Math.min(u, CELL / 2 - 0.15 - r * 0.4);
      else if (kind === 'mizubasho') u = 1.25 + h(976) * 1.15;   // 水辺：氷水芭蕉は水の中まで出してよい
      else u = Math.min(u, 1.8);
      const x = cx + nx * u + qx * v, z = cz + nz * u + qz * v, [tx, ty] = cellOf(x, z);
      if (!plantable(tx, ty) || (ch(tx, ty) === '*' && kind !== 'mizubasho')) continue;
      if (meadow && meadow.cells.includes(k2(tx, ty))) continue;
      const lx = x - X(tx), lz = z - Z(ty);
      if (Math.max(Math.abs(lx), Math.abs(lz)) < 0.92) continue;   // 通れるマスの中央は空ける
      // 違うマスへはみ出したら、そのマスの壁も確かめる（壁の中に植えない）
      let inWall = false;
      for (const d of DIR_ORDER) { const [dx, dz] = vec(d); if (wallCell(tx + dx, ty + dz) && lx * dx + lz * dz > CELL / 2 - 0.15 - r * 0.4) inWall = true; }
      if (inWall) continue;
      // 株どうしは寄り添わせる（株立ち）。ただし重なりすぎない。群れから離れすぎない
      if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < 0.55 * (p.r + r)) || clash(x, z, r, 0.6)) continue;
      if (placed.length && !placed.some((p) => Math.hypot(p.x - x, p.z - z) < 1.15 * (p.r + r) + 0.25)) continue;
      placed.push({ kind, x, z, s, r, ry: h(978) * 6.28, seed: gi * 31 + t });
    }
    if (placed.length < C.groupMin) return null;   // 単体・2株では置かない
    const chunk = `g${gi}`;
    for (const p of placed) addPlant(p.kind, p.x, p.z, p.ry, p.s, chunk, p.seed);
    // 霜の斑：群れを包む楕円（壁に沿って長い）
    const mx = placed.reduce((s, p) => s + p.x, 0) / placed.length, mzz = placed.reduce((s, p) => s + p.z, 0) / placed.length;
    let ra = 0.6, rb = 0.5;
    for (const p of placed) { const dx = p.x - mx, dz = p.z - mzz; ra = Math.max(ra, Math.abs(dx * qx + dz * qz) + p.r + 0.3); rb = Math.max(rb, Math.abs(dx * nx + dz * nz) + p.r + 0.25); }
    patches.push({ x: mx, z: mzz, ra, rb, ang: Math.atan2(qz, qx), amax: 0.2 });   // 氷晶花の芯が光るので、群れに点光源は足さない（床が白く飛ぶ）
    const kinds = [...new Set(placed.map((p) => p.kind))];
    return { cell: k2(an.tx, an.ty), kind: main, d: an.d, n: placed.length, kinds, edge: an.edge, at: [+(mx / CELL).toFixed(2), +(mzz / CELL).toFixed(2)] };
  }
  function plantGroups() {
    const list = anchors().map((an, i) => ({ an, k: H(an.tx * 5 + (i % 5), an.ty, 630) + an.pri })).sort((p, q) => p.k - q.k);
    const used = { mizubasho: 0, snowdrop: 0, bloom: 0 };
    const mc = meadow ? meadow.cells.map((s) => s.split(',').map(Number)) : [];
    for (const { an } of list) {
      if (groups.length >= C.groupsPerFloor) break;
      if (used[an.kind] >= (C.quota[an.kind] ?? 99)) continue;
      if (groups.some((gq) => Math.max(Math.abs(gq.tx - an.tx), Math.abs(gq.ty - an.ty)) < C.groupSpacing)) continue;
      if (mc.some(([x, y]) => Math.max(Math.abs(x - an.tx), Math.abs(y - an.ty)) < 3)) continue;
      const gr = plantGroup(an, groups.length);
      if (!gr) continue;
      groups.push({ tx: an.tx, ty: an.ty, ...gr }); used[an.kind]++;
      groupLog.push(`${gr.cell}:${gr.kind}:${gr.d}`);
    }
  }

  /* ---- 描画（InstancedMesh。区画ごとに、距離で形の段階を切り替える） ---- */
  const disposables = [], chunks = [];
  let group = null, triangles = 0, drawMeshes = 0;
  const triCount = (geo) => (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
  const tierTris = { hi: 0, mid: 0, lo: 0, mMid: 0, mLo: 0 };
  function frostTexture() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
    c.fillStyle = 'rgb(150,170,185)'; c.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) {
      const x = H(i, 1, 980) * 128, y = H(i, 2, 981) * 128, r = 1 + H(i, 3, 982) * (i < 40 ? 9 : 3);
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,255,255,${0.5 + H(i, 4, 983) * 0.5})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function buildPatches() {
    if (!patches.length) return;
    const pos = [], col = [], uv = [], idx = [], N = 14;
    for (const p of patches) {
      const base = pos.length / 3, ca = Math.cos(p.ang), sa = Math.sin(p.ang);
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
        const u = i / N * 2 - 1, v = j / N * 2 - 1, x = p.x + (u * p.ra) * ca - (v * p.rb) * sa, z = p.z + (u * p.ra) * sa + (v * p.rb) * ca;
        const [tx, ty] = cellOf(x, z), rr = p.square ? Math.max(u * u, v * v) : u * u + v * v;
        const bad = wallCell(tx, ty) || ch(tx, ty) === '*' || (p.set && !p.set.has(k2(tx, ty)) && rr > (p.square ? 0.9 : 0.5));
        const wob = 0.75 + 0.25 * Math.sin(x * 2.3 + z * 1.7) * Math.cos(z * 2.9 - x * 0.8);
        const al = bad ? 0 : (p.square ? Math.min(1, (1 - rr) * 3) : Math.pow(Math.max(0, 1 - rr), 1.4)) * p.amax * wob;
        pos.push(x, groundY(x, z) + 0.022, z); col.push(1, 1, 1, Math.max(0, al)); uv.push(x / 1.7, z / 1.7);
      }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const q = base + j * (N + 1) + i; idx.push(q, q + N + 1, q + 1, q + 1, q + N + 1, q + N + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
    const mat = floraMaterial('x:floraFrost'); mat.map = frostTexture();
    const mesh = new THREE.Mesh(geo, mat); mesh.name = 'b2:flora:frost'; mesh.renderOrder = 1; mesh.matrixAutoUpdate = false;
    group.add(mesh); disposables.push(geo, mat.map, mat); triangles += idx.length / 3; drawMeshes++;
  }
  function buildDress() {
    const byType = { shard: [], pebble: [] }; for (const d of dress) byType[d.type].push(d.m);
    const geos = {
      shard: new THREE.OctahedronGeometry(1, 0).scale(0.03, 0.1, 0.03).translate(0, 0.07, 0),
      pebble: new THREE.IcosahedronGeometry(1, 0).scale(0.075, 0.04, 0.06),
    };
    // 素材は頂点色を使うので、白の頂点色を持たせる（無いと黒くなる）。結晶は根元が床色、先が明るい
    for (const [type, geo] of Object.entries(geos)) {
      const P = geo.attributes.position, c = new Float32Array(P.count * 3);
      for (let i = 0; i < P.count; i++) { const t = type === 'shard' ? Math.min(1, Math.max(0, P.getY(i) / 0.17)) : 1, v = type === 'shard' ? 0.72 + 0.28 * t : 1; c[i * 3] = v * 0.94; c[i * 3 + 1] = v; c[i * 3 + 2] = v; }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    }
    const matOf = { shard: mats['x:flowerBaseIce'] || mats.crystalIce || mats['x:flowerIce'], pebble: mats['Wet slate stone'] || mats['Deep cavern rock'] };
    for (const type of Object.keys(byType)) {
      const list = byType[type]; disposables.push(geos[type]);
      if (!list.length || !matOf[type]) continue;
      const im = new THREE.InstancedMesh(geos[type], matOf[type], list.length); im.name = `b2:flora:${type}`;
      list.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.matrixAutoUpdate = false;
      group.add(im); disposables.push(im); triangles += triCount(geos[type]) * list.length; drawMeshes++;
    }
  }
  function buildPlants() {
    const byChunk = new Map();
    for (const p of plants) { if (!byChunk.has(p.chunk)) byChunk.set(p.chunk, []); byChunk.get(p.chunk).push(p); }
    const col = new THREE.Color(), sets = {};
    for (const kind of FLORA_KINDS) if (avail(kind)) sets[kind] = lodSets(EX[kind], { ...C.lod, ...(C.lodKind[kind] || {}) });
    for (const [ck, list] of byChunk) {
      const mode = list[0].set, tierNames = mode === 'meadow' ? ['mMid', 'mLo'] : (C.tiers.group[0] > 0 ? ['hi', 'mid', 'lo'] : ['mid', 'lo']);
      const cg = new THREE.Group(); cg.name = `b2:flora:${ck}`; group.add(cg);
      let mx = 0, mz = 0; for (const p of list) { mx += p.x; mz += p.z; } mx /= list.length; mz /= list.length;
      let rad = 0; for (const p of list) rad = Math.max(rad, Math.hypot(p.x - mx, p.z - mz) + p.r + 0.3);
      const tiers = {};
      for (const tn of tierNames) {
        const tg = new THREE.Group(); tg.name = `b2:flora:${ck}:${tn}`; tg.visible = false; cg.add(tg); tiers[tn] = tg;
        for (const kind of FLORA_KINDS) {
          const ps = list.filter((p) => p.kind === kind); if (!ps.length || !sets[kind]) continue;
          const ms = ps.map((p) => new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.ry), new THREE.Vector3(p.s, p.s, p.s)));
          for (const part of sets[kind][tn]) {
            const mat = mats[part.mat]; if (!mat) continue;
            const im = new THREE.InstancedMesh(part.geo, mat, ps.length); im.name = `b2:flora:${ck}:${tn}:${kind}:${part.mat}`;
            ps.forEach((p, i) => { im.setMatrixAt(i, ms[i]); im.setColorAt(i, col.setScalar(p.tint)); });
            im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
            im.computeBoundingSphere(); im.matrixAutoUpdate = false;
            tg.add(im); disposables.push(im); tierTris[tn] += triCount(part.geo) * ps.length; drawMeshes++;
          }
        }
      }
      // 最初の1枚（tick の前）は中の形
      tiers[mode === 'meadow' ? 'mMid' : 'mid'].visible = true;
      chunks.push({ group: cg, x: mx, z: mz, r: rad, mode, tiers, cur: mode === 'meadow' ? 'mMid' : 'mid' });
    }
    triangles += tierTris.mid + tierTris.mMid;
  }

  function place() {
    group = new THREE.Group(); group.name = 'b2:flora'; ctx.root.add(group);
    if (!FLORA_KINDS.some(avail)) return;
    plantMeadow();
    plantGroups();
    buildPlants(); buildDress(); buildPatches();
  }
  // 毎フレーム：区画の端までの距離で形の段階を選ぶ（遠い区画は描かない）
  function tick(camPos) {
    if (!camPos) return;
    for (const c of chunks) {
      const d = Math.hypot(c.x - camPos.x, c.z - camPos.z) - c.r;
      let tn = null;
      if (c.mode === 'meadow') { const [, m1, m2] = C.tiers.meadow; tn = d < m1 ? 'mMid' : d < m2 ? 'mLo' : null; }
      else { const [h0, m1, m2] = C.tiers.group; tn = d < h0 ? 'hi' : d < m1 ? 'mid' : d < m2 ? 'lo' : null; }
      if (tn && !c.tiers[tn]) tn = c.mode === 'meadow' ? 'mMid' : 'mid';
      if (tn === c.cur) continue;
      if (c.cur) c.tiers[c.cur].visible = false;
      if (tn) c.tiers[tn].visible = true;
      c.cur = tn;
    }
  }
  // 診断用（撮影・レビュー）：いま描く段階の三角形数・描く数（画面外の区画も含む上限）
  function visible() {
    let tris = 0, meshes = 0;
    for (const c of chunks) if (c.cur) c.tiers[c.cur].traverse((o) => { if (o.isInstancedMesh) { tris += triCount(o.geometry) * o.count; meshes++; } });
    return { tris, meshes, tiers: chunks.reduce((q, c) => { q[c.cur || 'off'] = (q[c.cur || 'off'] || 0) + 1; return q; }, {}) };
  }
  if (typeof window !== 'undefined') window.KotamaB2Flora = { visible, setVisible: (v) => { if (group) group.visible = !!v; } };
  function layout() {
    const byKind = Object.fromEntries(FLORA_KINDS.map((k) => [k, plants.filter((p) => p.kind === k).length]));
    const lod = {}; for (const kind of FLORA_KINDS) if (avail(kind)) { const s = lodSets(EX[kind], { ...C.lod, ...(C.lodKind[kind] || {}) }); lod[kind] = Object.fromEntries(Object.entries(s).map(([tn, parts]) => [tn, parts.reduce((q, pt) => q + triCount(pt.geo), 0)])); }
    return {
      flowers: plants.length, flowerSpots: (ctx.spots || []).length, flowerClusters: groupLog.slice(),
      flora: { groups: groups.map((gq) => ({ cell: gq.cell, kind: gq.kind, d: gq.d, n: gq.n, kinds: gq.kinds, edge: gq.edge, at: gq.at })), groupPlants: plants.filter((p) => p.set !== 'meadow').length, meadow, byKind, dress: dress.length, patches: patches.length, triangles, tierTris, lod, drawMeshes, chunks: chunks.length, closeups },
    };
  }
  return { place, tick, layout, disposables };
}
