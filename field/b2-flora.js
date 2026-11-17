// [B2V4-F] 第2階層「凍てつく水源」の花（霜鈴草・氷水芭蕉・氷晶花）の配置と見た目（設計書 docs/3d/B2_V4_FEEDBACK_DESIGN.md の F10a・F10b）
//
// ・花の形（assets/models/floor2/claude-flowers-candidates/*.glb）は変えない。素材の色・明るさ・発光と、置き方だけをここで決める。
// ・根元（F10a）：霜鈴草の白い盛り土は床へ沈め、床の色になじむ青白い霜の素材（x:flowerBase）にする。
//   株の足もとに小さな霜の結晶・小石を添え、群れの下に薄い霜の斑（床の光る水脈が透ける半透明）を敷いて「床から生えている」ように見せる。
// ・群れ（F10a）：1か所に3〜7株。高さ・向き・間隔を変え、種類を混ぜる（水辺＝氷水芭蕉、壁ぎわ・部屋の隅＝霜鈴草、結晶の溜まり場の脇＝氷晶花が主）。
//   単体では置かない（3株そろわない場所は群れごと置かない）。通れるマスの中央は空け、壁ぎわ・角・水辺の縁にだけ植える。
// ・群生地（F10b）：各階1か所。3種を混ぜ、中心が濃く縁がまばら・縁ほど小さい株。歩く筋（マスの中心どうしを結ぶ線）は空ける。
//   場所は FLORA_CONFIG.meadowRoles の役割（迷宮班 M の `meadow`）があればそこ、無ければ吹き抜けの光の下、無ければ部屋の広い所。
// ・負荷：1株約2万三角形と重いので、種類×素材×区画ごとの InstancedMesh で描く（形は1つを共有）。区画ごとに画面外は描かず、
//   カメラから FLORA_CONFIG.far（m）より遠い区画も描かない（霧でほぼ見えない距離）。
import * as THREE from 'three';

export const FLORA_KINDS = ['snowdrop', 'mizubasho', 'bloom'];

// 迷宮班 M の新しい役割（tileRoles）が決まったら、ここを差し替えるだけで群生地・水辺の扱いが変わる
export const FLORA_CONFIG = {
  meadowRoles: ['meadow'],                         // 花の群生地（各階1）。あればこのマスの集まりを群生地にする
  waterRoles: ['water', 'water-hazard', 'puddle'], // 水辺とみなす隣のマス（'*' の浅瀬も水辺）
  noPlantRoles: ['water-hazard', 'bridge', 'fixed', 'setpiece-watergate'],   // 株を植えないマス
  shoreRoles: ['shore'],
  roomRoles: ['room', 'template', 'vista', 'meadow'],
  wallSideRoles: ['corridor', 'road', 'deadend', 'room', 'shore', 'vista'],
  groupsPerFloor: 7,      // 群れの数（各階）
  groupSpacing: 4,        // 群れどうしの間隔（マス、チェビシェフ距離）
  groupMin: 3, groupMax: 7,
  quota: { mizubasho: 3, snowdrop: 4, bloom: 2 },  // 主になる種類ごとの群れの上限
  meadowMax: 16,          // 群生地の株数の上限（1株約2万三角形）
  far: 30,                // これより遠い区画は描かない（m）
  chunk: 4,               // 区画（マス）
};

// 目の高さ1.6mの一人称から見えるように拡大した高さ（m）。[低い, 高い]
const HEIGHT = { snowdrop: [0.66, 1.18], bloom: [0.5, 0.84], mizubasho: [0.78, 1.12] };
// 根元を床へ沈める量（原寸の高さに対する値）：霜鈴草の盛り土は高さ0.029、氷晶花の岩は0.062、氷水芭蕉の泥と薄氷は0.016
const SINK = { snowdrop: 0.025, bloom: 0.034, mizubasho: 0.009 };
const MIX = { mizubasho: ['snowdrop', 'snowdrop', 'bloom'], snowdrop: ['bloom', 'bloom', 'mizubasho'], bloom: ['snowdrop', 'snowdrop', 'mizubasho'] };

/* ---------------- 素材（field-3d-b2-water.js の追加素材の読み込みから呼ぶ） ---------------- */
// GLB の素材名から、花の素材の仲間を選ぶ
export function floraMaterialClass(m) {
  const nm = (m.name || '').toLowerCase(), trans = (m.transmission || 0) > 0 || m.transparent;
  if (/snow_mound/.test(nm)) return 'x:flowerBase';   // 盛り土 → 床になじむ青白い霜
  if (/core_glow/.test(nm)) return 'x:flowerGlow';
  return (trans || /ice|frost/.test(nm)) && !/mud|crack|grass/.test(nm) ? 'x:flowerIce' : 'x:flower';
}
// 花の素材を作る（花以外の key は null）
export function floraMaterial(key) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  switch (key) {
    case 'x:flower': return std({ color: 0xffffff, vertexColors: true, roughness: 0.48, metalness: 0.0, emissive: 0x0e4c6a, emissiveIntensity: 0.55, envMapIntensity: 1.0, side: THREE.DoubleSide });
    case 'x:flowerIce': return std({ color: 0xffffff, vertexColors: true, roughness: 0.08, metalness: 0.0, emissive: 0x1898d0, emissiveIntensity: 0.6, envMapIntensity: 1.7, side: THREE.DoubleSide });
    case 'x:flowerGlow': return std({ color: 0xffffff, vertexColors: true, roughness: 0.3, emissive: 0x3cc4ff, emissiveIntensity: 1.1, envMapIntensity: 1.0 });
    // 盛り土：床（caveFloor 0x82bcd8・光る水脈 0x52e2ff）と同じ色域の、少しだけ明るい霜。白く飛ばない
    case 'x:flowerBase': return std({ color: 0x7fb6d2, vertexColors: true, roughness: 0.62, metalness: 0.0, emissive: 0x1a6688, emissiveIntensity: 0.42, envMapIntensity: 0.8 });
    case 'x:floraFrost': return std({ color: 0xc4ecff, vertexColors: true, roughness: 0.7, metalness: 0.0, emissive: 0x2a86aa, emissiveIntensity: 0.3, envMapIntensity: 0.6, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    default: return null;
  }
}
// 頂点色 × 素材の色。緑（葉・茎）は霜の青緑へ寄せる。盛り土は青白い霜の濃淡にする
export function floraTint(src, m, n, key) {
  const col = new Float32Array(n * 3), base = m.color || new THREE.Color(1, 1, 1), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    c.setRGB(src ? src.getX(i) : 1, src ? src.getY(i) : 1, src ? src.getZ(i) : 1).multiply(base);
    const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
    if (key === 'x:flowerBase') { const v = 0.82 + 0.18 * Math.min(1, lum); col[i * 3] = v * 0.9; col[i * 3 + 1] = v * 0.97; col[i * 3 + 2] = v; continue; }
    const green = Math.max(0, Math.min(1, (c.g - Math.max(c.r, c.b)) * 6)), k = 0.25 + 0.45 * green;
    col[i * 3] = c.r * (1 - k) + lum * 0.78 * k; col[i * 3 + 1] = c.g * (1 - k) + lum * 1.0 * k; col[i * 3 + 2] = c.b * (1 - k) + lum * 1.18 * k;
  }
  return col;
}

/* ---------------- 配置 ---------------- */
// ctx：field-3d-b2-water.js の build() から渡す（a, ch, wallCell, objAt, roles, role, H, X, Z, CELL, DIR_VEC, DIR_ORDER, groundY,
//      falls, openCells, propCells, monumentCells, keepClear, zones, sky, onBridge, spots, EX, mats, root, light）
export function createFlora(ctx) {
  const C = { ...FLORA_CONFIG, ...(ctx.config || {}) };
  const { a, ch, wallCell, objAt, roles, role, H, X, Z, CELL, DIR_VEC, DIR_ORDER, groundY, EX, mats } = ctx;
  const vec = (d) => DIR_VEC[d];
  const k2 = (tx, ty) => `${tx},${ty}`;
  const isWaterCell = (tx, ty) => !wallCell(tx, ty) && (ch(tx, ty) === '*' || (roles && C.waterRoles.includes(role(tx, ty))));
  const cellOf = (x, z) => [Math.round(x / CELL), Math.round(z / CELL)];
  // 株を植えられるマス（水の '*' は氷水芭蕉だけ）
  const plantable = (tx, ty) => {
    const k = k2(tx, ty), c = ch(tx, ty);
    if (tx < 0 || ty < 0 || tx >= a.w || ty >= a.h || wallCell(tx, ty) || objAt.has(k) || c === '<' || c === '>') return false;
    if (ctx.falls.has(k) || ctx.propCells.has(k) || ctx.monumentCells.has(k) || ctx.keepClear.has(k) || (ctx.onBridge && ctx.onBridge(tx, ty))) return false;
    if (roles && C.noPlantRoles.includes(role(tx, ty))) return false;
    return true;
  };
  const avail = (kind) => !!EX[kind];
  const plants = [];   // { kind, x, y, z, ry, s, r, chunk, tint }
  const dress = [];    // 足もとの霜の結晶・小石 { type, m }
  const patches = [];  // 霜の斑 { x, z, ra, rb, ang, amax }
  const groups = [], groupLog = [];
  let meadow = null;

  const sizeOf = (kind) => EX[kind].size;
  const plantScale = (kind, t) => { const [lo, hi] = HEIGHT[kind]; return (lo + (hi - lo) * t) / Math.max(sizeOf(kind).y, 0.01); };
  const radiusOf = (kind, s) => 0.5 * Math.max(sizeOf(kind).x, sizeOf(kind).z) * s * 0.85;
  const clash = (x, z, r, f = 0.5) => plants.some((p) => Math.hypot(p.x - x, p.z - z) < f * (p.r + r));
  function addPlant(kind, x, z, ry, s, chunk, seed) {
    const [tx, ty] = cellOf(x, z), wet = ch(tx, ty) === '*';
    const y = wet ? -0.1 : groundY(x, z) - SINK[kind] * s;
    const r = radiusOf(kind, s), tint = 0.9 + H(tx * 7 + seed, ty * 3, 940) * 0.14;
    plants.push({ kind, x, y, z, ry, s, r, chunk, tint, wet });
    // 足もと：霜の結晶2〜4本・小石1〜2個（水の中には置かない）
    if (wet) return;
    const ns = 2 + Math.floor(H(tx + seed, ty, 941) * 3), np = 1 + Math.floor(H(tx, ty + seed, 942) * 2);
    for (let i = 0; i < ns + np; i++) {
      const ang = H(tx * 3 + i, ty + seed, 943) * Math.PI * 2, rad = r * (0.45 + H(tx + i, ty * 5 + seed, 944) * 0.55);
      const px = x + Math.cos(ang) * rad, pz = z + Math.sin(ang) * rad, [cx, cy] = cellOf(px, pz);
      if (!plantable(cx, cy) || ch(cx, cy) === '*') continue;
      const shard = i < ns, sc = shard ? 0.7 + H(i, seed, 945) * 0.9 : 0.7 + H(i, seed, 946) * 0.8;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((H(i, seed, 947) - 0.5) * (shard ? 0.8 : 0.3), H(i, seed, 948) * 6.28, (H(i, seed, 949) - 0.5) * (shard ? 0.8 : 0.3), 'YXZ'));
      const m = new THREE.Matrix4().compose(new THREE.Vector3(px, groundY(px, pz) - (shard ? 0.03 : 0.012), pz), q, new THREE.Vector3(sc, sc * (shard ? 0.8 + H(i, seed, 950) * 0.8 : 1), sc));
      dress.push({ type: shard ? 'shard' : 'pebble', m });
    }
  }

  /* ---- 群生地（F10b） ---- */
  function findMeadow() {
    if (ctx.findMeadow) { const m = ctx.findMeadow(); if (m) return m; }   // 差し替え口（迷宮班 M の情報で決めたいとき）
    if (roles) {
      const cells = [];
      for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) if (C.meadowRoles.includes(role(tx, ty)) && !wallCell(tx, ty)) cells.push([tx, ty]);
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
  function plantMeadow() {
    const mz = findMeadow(); if (!mz || !mz.cells.length) return;
    const set = new Set(mz.cells.map(([x, y]) => k2(x, y)));
    const mx = mz.cells.reduce((s, c) => s + c[0], 0) / mz.cells.length, my = mz.cells.reduce((s, c) => s + c[1], 0) / mz.cells.length;
    const ccx = X(mx), ccz = Z(my);
    let R = 0; for (const [tx, ty] of mz.cells) R = Math.max(R, Math.hypot(X(tx) - ccx, Z(ty) - ccz) + CELL * 0.5);
    const kinds = FLORA_KINDS.filter(avail); if (!kinds.length) return;
    const cands = [];
    const xs = mz.cells.map((c) => c[0]), ys = mz.cells.map((c) => c[1]);
    const x0 = X(Math.min(...xs)) - CELL / 2, x1 = X(Math.max(...xs)) + CELL / 2, z0 = Z(Math.min(...ys)) - CELL / 2, z1 = Z(Math.max(...ys)) + CELL / 2;
    const step = 0.62;
    let n = 0;
    for (let gz = z0 + step / 2; gz < z1; gz += step) for (let gx = x0 + step / 2; gx < x1; gx += step) {
      n++;
      const x = gx + (H(n, 3, 961) - 0.5) * step * 0.8, z = gz + (H(n, 5, 962) - 0.5) * step * 0.8, [tx, ty] = cellOf(x, z);
      if (!set.has(k2(tx, ty)) || !plantable(tx, ty)) continue;
      const lx = x - X(tx), lz = z - Z(ty), dn = Math.min(1, Math.hypot(x - ccx, z - ccz) / R);
      const wet = ch(tx, ty) === '*', nearWet = DIR_ORDER.some((d) => isWaterCell(tx + vec(d)[0], ty + vec(d)[1]));
      // 種類：水の中・水辺は氷水芭蕉を多め、中心は霜鈴草、縁は氷晶花と霜鈴草
      const hk = H(n, 7, 963);
      let kind = wet ? 'mizubasho' : nearWet && hk < 0.4 ? 'mizubasho' : dn < 0.45 ? (hk < 0.58 ? 'snowdrop' : hk < 0.88 ? 'bloom' : 'mizubasho') : (hk < 0.47 ? 'bloom' : hk < 0.92 ? 'snowdrop' : 'mizubasho');
      if (!avail(kind)) kind = kinds[Math.floor(hk * kinds.length) % kinds.length];
      if (wet && kind !== 'mizubasho') continue;
      // 中心ほど高く、縁ほど低い（奥・縁は小さい株）
      const s = plantScale(kind, Math.max(0, Math.min(1, 0.95 - dn * 0.75 + (H(n, 9, 964) - 0.5) * 0.35))), r = radiusOf(kind, s);
      // 歩く筋（マスの中心と、隣の通れるマスへ向かう線）を空ける
      const lane = 0.62 + r * 0.45;
      if (Math.hypot(lx, lz) < lane + 0.25) continue;
      let ok = true;
      for (const d of DIR_ORDER) {
        const [dx, dz] = vec(d), along = lx * dx + lz * dz, side = Math.abs(lx * dz - lz * dx);
        if (wallCell(tx + dx, ty + dz)) { if (along > CELL / 2 - 0.2 - r * 0.45) ok = false; continue; }
        if (along > 0 && side < lane) ok = false;
      }
      if (!ok) continue;
      // 密度：中心が濃く、縁がまばら
      if (H(n, 11, 965) > 1.08 - dn * 0.9) continue;
      cands.push({ kind, x, z, s, r, dn, k: dn + H(n, 13, 966) * 0.35, ry: H(n, 15, 967) * 6.28, seed: n });
    }
    cands.sort((p, q) => p.k - q.k);
    const chosen = [];
    for (const c of cands) {
      if (chosen.length >= C.meadowMax) break;
      if (chosen.some((p) => Math.hypot(p.x - c.x, p.z - c.z) < 0.6 * (p.r + c.r)) || clash(c.x, c.z, c.r, 0.6)) continue;
      chosen.push(c);
    }
    // 3種がそろうように（足りない種類は、縁の株を1つ入れ替える）
    for (const kind of kinds) if (!chosen.some((c) => c.kind === kind)) {
      const rep = [...chosen].reverse().find((c) => chosen.filter((q) => q.kind === c.kind).length > 2 && ch(...cellOf(c.x, c.z)) !== '*');
      if (rep) { rep.kind = kind; rep.s = plantScale(kind, 0.4); rep.r = radiusOf(kind, rep.s); }
    }
    for (const c of chosen) addPlant(c.kind, c.x, c.z, c.ry, c.s, 'meadow', c.seed + 500);
    if (chosen.length) {
      patches.push({ x: ccx, z: ccz, ra: R * 0.95, rb: R * 0.95, ang: 0, amax: 0.36, set });
      ctx.light(ccx, 0.9, ccz, 0x8fe6ff, 0.9, 7);
    }
    meadow = { source: mz.source, center: k2(Math.round(mx), Math.round(my)), cells: mz.cells.map((c) => k2(c[0], c[1])), plants: chosen.length, kinds: Object.fromEntries(kinds.map((k) => [k, chosen.filter((c) => c.kind === k).length])) };
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
    for (let t = 0; t < 46 && placed.length < want; t++) {
      const h = (s) => H(an.tx * 11 + t, an.ty * 7 + gi, s);
      let kind = main;
      if (mix.length && (h(973) < 0.28 || (placed.length === 2 && want >= 4 && !placed.some((p) => p.kind !== main)))) kind = mix[Math.floor(h(974) * mix.length) % mix.length];
      const s = plantScale(kind, h(975)), r = radiusOf(kind, s);
      // 壁・水へ寄せる深さ u と、沿う向きの位置 v（角は角へ寄せる）。マスの中心から1m以内には置かない
      let u = 1.0 + h(976) * 0.85;
      const v = an.d2 ? 0.25 + h(977) * 1.5 : (h(977) * 2 - 1) * 1.7;
      if (an.edge === 'wall') u = Math.min(u, CELL / 2 - 0.15 - r * 0.4);
      else if (kind === 'mizubasho') u = 1.25 + h(976) * 1.15;   // 水辺：氷水芭蕉は水の中まで出してよい
      else u = Math.min(u, 1.8);
      const x = cx + nx * u + qx * v, z = cz + nz * u + qz * v, [tx, ty] = cellOf(x, z);
      if (!plantable(tx, ty) || (ch(tx, ty) === '*' && kind !== 'mizubasho')) continue;
      if (meadow && meadow.cells.includes(k2(tx, ty))) continue;
      const lx = x - X(tx), lz = z - Z(ty);
      if (Math.max(Math.abs(lx), Math.abs(lz)) < 1.0) continue;   // 通れるマスの中央は空ける
      // 違うマスへはみ出したら、そのマスの壁も確かめる（壁の中に植えない）
      let inWall = false;
      for (const d of DIR_ORDER) { const [dx, dz] = vec(d); if (wallCell(tx + dx, ty + dz) && lx * dx + lz * dz > CELL / 2 - 0.15 - r * 0.4) inWall = true; }
      if (inWall) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < 0.62 * (p.r + r)) || clash(x, z, r, 0.6)) continue;
      placed.push({ kind, x, z, s, r, ry: h(978) * 6.28, seed: gi * 31 + t });
    }
    if (placed.length < C.groupMin) return null;   // 単体・2株では置かない
    const chunk = `${Math.floor(an.tx / C.chunk)},${Math.floor(an.ty / C.chunk)}`;
    for (const p of placed) addPlant(p.kind, p.x, p.z, p.ry, p.s, chunk, p.seed);
    // 霜の斑：群れを包む楕円（壁に沿って長い）
    const mx = placed.reduce((s, p) => s + p.x, 0) / placed.length, mzz = placed.reduce((s, p) => s + p.z, 0) / placed.length;
    let ra = 0.6, rb = 0.5;
    for (const p of placed) { const dx = p.x - mx, dz = p.z - mzz; ra = Math.max(ra, Math.abs(dx * qx + dz * qz) + p.r + 0.3); rb = Math.max(rb, Math.abs(dx * nx + dz * nz) + p.r + 0.25); }
    patches.push({ x: mx, z: mzz, ra, rb, ang: Math.atan2(qz, qx), amax: 0.42 });
    if (placed.some((p) => p.kind === 'bloom')) ctx.light(mx, 0.5, mzz, 0x6fd8ff, 0.6, 3.5);
    const kinds = [...new Set(placed.map((p) => p.kind))];
    return { cell: k2(an.tx, an.ty), kind: main, d: an.d, n: placed.length, kinds, edge: an.edge };
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

  /* ---- 描画（InstancedMesh） ---- */
  const disposables = [], chunks = [];
  let group = null, triangles = 0, drawMeshes = 0;
  const triCount = (geo) => (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
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
        const [tx, ty] = cellOf(x, z), rr = u * u + v * v;
        const bad = wallCell(tx, ty) || ch(tx, ty) === '*' || (p.set && !p.set.has(k2(tx, ty)) && rr > 0.5);
        const wob = 0.75 + 0.25 * Math.sin(x * 2.3 + z * 1.7) * Math.cos(z * 2.9 - x * 0.8);
        const al = bad ? 0 : Math.pow(Math.max(0, 1 - rr), 1.4) * p.amax * wob;
        pos.push(x, groundY(x, z) + 0.022, z); col.push(1, 1, 1, al); uv.push(x / 1.7, z / 1.7);
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
    const matOf = { shard: mats.crystalIce || mats['x:flowerIce'], pebble: mats['Wet slate stone'] || mats['Deep cavern rock'] };
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
    const col = new THREE.Color();
    for (const [ck, list] of byChunk) {
      const cg = new THREE.Group(); cg.name = `b2:flora:${ck}`; group.add(cg);
      let mx = 0, mz = 0; for (const p of list) { mx += p.x; mz += p.z; } mx /= list.length; mz /= list.length;
      let rad = 0; for (const p of list) rad = Math.max(rad, Math.hypot(p.x - mx, p.z - mz) + p.r + 0.5);
      for (const kind of FLORA_KINDS) {
        const ps = list.filter((p) => p.kind === kind); if (!ps.length) continue;
        const ms = ps.map((p) => new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.ry), new THREE.Vector3(p.s, p.s, p.s)));
        for (const part of EX[kind].parts) {
          const mat = mats[part.mat]; if (!mat) continue;
          const im = new THREE.InstancedMesh(part.geo, mat, ps.length); im.name = `b2:flora:${ck}:${kind}:${part.mat}`;
          ps.forEach((p, i) => { im.setMatrixAt(i, ms[i]); im.setColorAt(i, col.setScalar(p.tint)); });
          im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
          im.computeBoundingSphere(); im.matrixAutoUpdate = false;
          cg.add(im); disposables.push(im); triangles += triCount(part.geo) * ps.length; drawMeshes++;
        }
      }
      chunks.push({ group: cg, x: mx, z: mz, r: rad });
    }
  }

  function place() {
    group = new THREE.Group(); group.name = 'b2:flora'; ctx.root.add(group);
    if (!FLORA_KINDS.some(avail)) return;
    plantMeadow();
    plantGroups();
    buildPlants(); buildDress(); buildPatches();
  }
  // 毎フレーム：遠い区画を描かない
  function tick(camPos) {
    if (!camPos) return;
    for (const c of chunks) c.group.visible = Math.hypot(c.x - camPos.x, c.z - camPos.z) - c.r < C.far;
  }
  function layout() {
    const byKind = Object.fromEntries(FLORA_KINDS.map((k) => [k, plants.filter((p) => p.kind === k).length]));
    return {
      flowers: plants.length, flowerSpots: (ctx.spots || []).length, flowerClusters: groupLog.slice(),
      flora: { groups: groups.map((gq) => ({ cell: gq.cell, kind: gq.kind, d: gq.d, n: gq.n, kinds: gq.kinds, edge: gq.edge })), groupPlants: plants.filter((p) => p.chunk !== 'meadow').length, meadow, byKind, dress: dress.length, patches: patches.length, triangles, drawMeshes, chunks: chunks.length },
    };
  }
  return { place, tick, layout, disposables };
}
