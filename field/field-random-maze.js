"use strict";
/* ============================================================
   field/field-random-maze.js — 第2階層「凍てつく水源」5F・6F のランダム迷宮
   ------------------------------------------------------------
   担当：Claude（迷宮システム）。仕様：docs/field-and-story/B2_RANDOM_MAZE_SPEC.md
   ・対象：FIELD_RANDOM_FLOORS のフロア（"2-1"=5F、"2-2"=6F）。4F と他の階層は data/field-maps.js のまま。
   ・形はホームから出発するたび（fieldState.expedition が増えるたび）に作り直す。
     シード = hash("kotama-b2|<フロア>|<expedition>|<試行>")。Math.random は使わない（ロードで同じ形を再現）。
   ・5F＝1マス幅の迷路（奇数座標の格子）＋小部屋。6F＝セルオートマトンの洞窟＋道「,」＋草むら「*」。
   ・固定エリア（階段まわり・ボス前）は既存マップから切り出してそのまま置く。
     仕掛け（5F：門h＋宝箱i＋立て札g）・NPCの部屋（6F：行商人a・見張り番b）はテンプレートとして位置だけランダム。
   ・生成後に必ず検証し（fieldRandomMazeValidate）、満たさなければ次の試行。最大 FIELD_RANDOM_MAX_TRIES 回で
     失敗したら既存の固定マップへ戻す（fieldRandomFloor が null を返す）。
   ・fieldArea（field.js）へは fieldRandomFloor／fieldRandomMazeDecorate の2か所だけで差し込む。
   ・index.html では data/*.js の後、field.js の前に読み込む。
   ============================================================ */
const FIELD_RANDOM_FLOORS = {
  // 5F：迷路＋小部屋。上り階段まわり（7×3）と下り階段まわり（5×3）を固定
  "2-1": {
    style: "maze", minGathers: 2,
    fixed: [ { tag: "start", x0: 1, y0: 17, x1: 7, y1: 19 }, { tag: "down", x0: 19, y0: 17, x1: 23, y1: 19 } ],
    cache: { door: "h", cache: "i", plaque: "g" }, west: "e", east: "f", events: ["d"], saves: 1
  },
  // 6F：洞窟状の広がり＋道。開始位置まわりと、ボス前（導きの灯S・ボスゲートB）を固定
  "2-2": {
    style: "cave", minGathers: 2,
    fixed: [ { tag: "start", x0: 1, y0: 1, x1: 4, y1: 3, replace: { a: "_" }, ports: [[5, 1], [5, 2]] },
             { tag: "boss", x0: 20, y0: 14, x1: 26, y1: 16, ports: [[19, 14]] } ],
    npcRoom: ["#######", "#a___b#", "._____."], signs: 1
  }
};
const FIELD_RANDOM_MAX_TRIES = 50;
const FIELD_RANDOM_FOE_START_CLEAR = 8;      // FOE はスタート固定エリアから このマス数より遠くに置く
const FIELD_RANDOM_ROLE_NAMES = ["wall", "shrine-candidate", "fixed", "template", "room", "corridor", "road", "deadend", "water", "shore"];

/* ------------------------------------------------------------
   決定的な乱数
   ------------------------------------------------------------ */
function frmHash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}
function frmRng(seed) {
  let s = seed >>> 0;
  const next = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  next.int = (a, b) => a + Math.floor(next() * (b - a + 1));
  next.pick = arr => arr[Math.floor(next() * arr.length)];
  next.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
  return next;
}
function frmSeedFor(floorKey, expedition, attempt = 0) { return frmHash(`kotama-b2|${floorKey}|${expedition}|${attempt}`); }

/* ------------------------------------------------------------
   共通の道具
   ------------------------------------------------------------ */
const FRM_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];   // field-movement-foe.js の fieldBfsStep と同じ順番
const FRM_SOLID = new Set(["#", "~", "S", "T", "?", "G"]);
const FRM_SAFE = new Set(["_", "P", "E", "B", "<", ">"]);
function frmIsLetter(c) { return c >= "a" && c <= "z"; }
// 通れるか（door：門hを開いた扱いにするか）
function frmPass(c, doorOpen, doorChar) { if (doorChar && c === doorChar) return !!doorOpen; return !FRM_SOLID.has(c) && !frmIsLetter(c); }
function frmFoeWalk(c) { return frmPass(c, false, null) && !FRM_SAFE.has(c); }
function frmInRect(r, x, y, pad = 0) { return x >= r.x0 - pad && x <= r.x1 + pad && y >= r.y0 - pad && y <= r.y1 + pad; }
function frmRectDist(r, x, y) { const dx = Math.max(r.x0 - x, 0, x - r.x1), dy = Math.max(r.y0 - y, 0, y - r.y1); return Math.hypot(dx, dy); }
function frmFloorSource(floorKey) { const [n, f] = floorKey.split("-").map(Number); return (typeof FIELD_AREAS !== "undefined" && FIELD_AREAS[n] && FIELD_AREAS[n].floors[f]) || null; }
function frmCount(map, ch) { let k = 0; for (const row of map) for (const c of row) if (c === ch) k++; return k; }

function frmNewCtx(floorKey, rng) {
  const rule = FIELD_RANDOM_FLOORS[floorKey], src = frmFloorSource(floorKey);
  const orig = src.map, H = orig.length, W = orig[0].length;
  const C = { floorKey, rule, src, orig, W, H, rng,
    g: Array.from({ length: H }, () => Array(W).fill("#")),
    locked: new Uint8Array(W * H), fixedMask: new Uint8Array(W * H), tplMask: new Uint8Array(W * H), roomMask: new Uint8Array(W * H), reserved: new Uint8Array(W * H),
    start: null, rects: rule.fixed.map(r => ({ ...r })) };
  C.at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? "#" : C.g[y][x];
  C.set = (x, y, c) => { C.g[y][x] = c; };
  C.idx = (x, y) => y * W + x;
  C.border = (x, y) => x <= 0 || y <= 0 || x >= W - 1 || y >= H - 1;
  return C;
}
// 固定エリアを既存マップから写す
function frmStampFixed(C) {
  C.rects.forEach((r, ri) => {
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
      let c = C.orig[y][x]; if (r.replace && r.replace[c]) c = r.replace[c];
      C.set(x, y, c); const i = C.idx(x, y); C.locked[i] = 1; C.fixedMask[i] = ri + 1;
      if (c === "P") C.start = { tx: x, ty: y };
      if (c === "<" && !C.up) C.up = { tx: x, ty: y };
    }
  });
  if (!C.start) C.start = C.up;
}
// start から通れるマスへの幅優先探索（距離。-1＝届かない）
function frmBfs(C, from, passFn) {
  const { W, H } = C, dist = new Int32Array(W * H).fill(-1), q = [C.idx(from.tx, from.ty)];
  dist[q[0]] = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi], x = cur % W, y = (cur - x) / W;
    for (const [dx, dy] of FRM_DIRS) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx; if (dist[ni] !== -1 || !passFn(C.g[ny][nx], nx, ny)) continue;
      dist[ni] = dist[cur] + 1; q.push(ni);
    }
  }
  return dist;
}
// 通れるマスがすべて start とつながっているか
function frmAllConnected(C, doorChar) {
  const dist = frmBfs(C, C.start, c => frmPass(c, true, doorChar));
  for (let y = 0; y < C.H; y++) for (let x = 0; x < C.W; x++) if (frmPass(C.g[y][x], true, doorChar) && dist[y * C.W + x] < 0) return false;
  return true;
}
// 物（通れない）を置いても、つながりと「隣の物が調べられること」が保たれるなら置く
function frmTryPlaceSolid(C, x, y, ch, doorChar) {
  const prev = C.at(x, y); C.set(x, y, ch);
  if (!frmAllConnected(C, doorChar)) { C.set(x, y, prev); return false; }
  const dist = frmBfs(C, C.start, c => frmPass(c, true, doorChar));
  for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
    const c = C.at(xx, yy); if (!(FRM_SOLID.has(c) && c !== "#" && c !== "~") && !frmIsLetter(c)) continue;
    if (!FRM_DIRS.some(([dx, dy]) => { const nx = xx + dx, ny = yy + dy; return nx >= 0 && ny >= 0 && nx < C.W && ny < C.H && dist[ny * C.W + nx] >= 0; })) { C.set(x, y, prev); return false; }
  }
  return true;
}
function frmWallCountOrth(C, x, y) { let k = 0; for (const [dx, dy] of FRM_DIRS) if (!frmPass(C.at(x + dx, y + dy), true, C.rule.cache && C.rule.cache.door)) k++; return k; }
function frmNearLetter(C, x, y, r = 1) { for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) { const c = C.at(xx, yy); if (c !== "#" && !frmPass(c, true, null)) return true; } return false; }
// 壁に付ける物（合図石）：床が1方向だけに接する壁マス
function frmPlaceOnWall(C, ch, xOk) {
  const cands = [];
  for (let y = 1; y < C.H - 1; y++) for (let x = 1; x < C.W - 1; x++) {
    if (C.g[y][x] !== "#" || C.locked[C.idx(x, y)] || !xOk(x)) continue;
    const opens = FRM_DIRS.filter(([dx, dy]) => frmPass(C.at(x + dx, y + dy), false, null));
    if (opens.length !== 1) continue;
    const nx = x + opens[0][0], ny = y + opens[0][1], ni = C.idx(nx, ny);
    if (C.fixedMask[ni] || C.tplMask[ni] || C.g[ny][nx] === "*") continue;
    if (frmNearLetter(C, x, y, 1) || frmNearLetter(C, nx, ny, 1)) continue;
    cands.push({ x, y, score: (C.roomMask[ni] ? 0 : 1) + C.rng() * 0.9 });
  }
  if (!cands.length) return false;
  cands.sort((p, q) => p.score - q.score);
  C.set(cands[0].x, cands[0].y, ch); C.locked[C.idx(cands[0].x, cands[0].y)] = 1;
  return true;
}
// FOE の巡回路。点はすべて「スタート固定エリアから8マスより遠い・固定エリアの外」。往復の最短経路も同じ条件
function frmFoeAllowed(C, x, y) {
  const i = C.idx(x, y); if (C.fixedMask[i] || C.tplMask[i] || !frmFoeWalk(C.g[y][x])) return false;
  for (const r of C.rects) {
    if (r.tag === "start" && frmRectDist(r, x, y) <= FIELD_RANDOM_FOE_START_CLEAR) return false;
    if (r.tag !== "start" && frmRectDist(r, x, y) <= 2) return false;
  }
  return true;
}
// fieldBfsStep と同じ探索で a→b の経路（マスの列）。届かなければ null
function frmFoeRoute(C, a, b) {
  const { W, H } = C, start = C.idx(a[0], a[1]), goal = C.idx(b[0], b[1]), prev = new Int32Array(W * H).fill(-1);
  prev[start] = start; const q = [start];
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi]; if (cur === goal) break;
    const x = cur % W, y = (cur - x) / W;
    for (const [dx, dy] of FRM_DIRS) {
      const nx = x + dx, ny = y + dy, ni = ny * W + nx;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev[ni] !== -1) continue;
      if (ni !== goal && !frmFoeWalk(C.g[ny][nx])) continue;
      prev[ni] = cur; q.push(ni);
    }
  }
  if (prev[goal] === -1) return null;
  const out = []; let cur = goal; while (cur !== start) { out.push(cur); cur = prev[cur]; } out.push(start);
  return out.reverse();
}
function frmPlaceFoes(C) {
  const out = [], used = new Set();
  for (const fd of (C.src.foes || [])) {
    let done = null;
    const cands = [];
    for (let y = 1; y < C.H - 1; y++) for (let x = 1; x < C.W - 1; x++) if (frmFoeAllowed(C, x, y) && !used.has(C.idx(x, y))) cands.push([x, y]);
    C.rng.shuffle(cands);
    for (const A of cands.slice(0, 40)) {
      const dist = frmBfs(C, { tx: A[0], ty: A[1] }, (c, x, y) => frmFoeAllowed(C, x, y));
      const bs = [];
      for (let i = 0; i < dist.length; i++) if (dist[i] >= 4 && dist[i] <= 8) bs.push([i % C.W, Math.floor(i / C.W)]);
      C.rng.shuffle(bs);
      for (const B of bs.slice(0, 12)) {
        const r1 = frmFoeRoute(C, A, B), r2 = frmFoeRoute(C, B, A);
        if (!r1 || !r2 || ![...r1, ...r2].every(i => frmFoeAllowed(C, i % C.W, Math.floor(i / C.W)))) continue;
        done = [A, B]; break;
      }
      if (done) break;
    }
    if (!done) return null;
    for (const p of done) used.add(C.idx(p[0], p[1]));
    out.push({ ...fd, path: done.map(p => [p[0], p[1]]) });
  }
  return out;
}
// Dijkstra で from→to の道を掘る経路（固定・テンプレートのマスは通らない。to はそのまま入れる）
function frmCarvePath(C, from, to, costFn) {
  const { W, H } = C, N = W * H, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const s = C.idx(from[0], from[1]), t = C.idx(to[0], to[1]);
  dist[s] = 0; const heap = [[0, s]];
  const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  while (heap.length) {
    const [d, cur] = pop(); if (done[cur]) continue; done[cur] = 1; if (cur === t) break;
    const x = cur % W, y = (cur - x) / W;
    for (const [dx, dy] of FRM_DIRS) {
      const nx = x + dx, ny = y + dy; if (C.border(nx, ny)) continue;
      const ni = ny * W + nx; if (done[ni]) continue;
      if (ni !== t && C.locked[ni]) continue;
      const nd = d + costFn(nx, ny); if (nd < dist[ni]) { dist[ni] = nd; prev[ni] = cur; push(nd, ni); }
    }
  }
  if (prev[t] === -1 && s !== t) return null;
  const out = []; let cur = t; while (cur !== s && cur !== -1) { out.push(cur); cur = prev[cur]; }
  return out.reverse();
}

/* ------------------------------------------------------------
   5F：迷路（奇数座標の格子）＋小部屋
   ------------------------------------------------------------ */
function frmGenMaze(C) {
  const { W, H, rng, rule } = C, R = rule.cache;
  const lat = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && (x & 1) && (y & 1);
  frmStampFixed(C);
  // 格子のマスは床にしておく（固定エリアの中は写したまま）
  for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) if (!C.locked[C.idx(x, y)]) C.set(x, y, ".");
  const uf = new Int32Array(W * H).map((_, i) => i);
  const find = i => { while (uf[i] !== i) { uf[i] = uf[uf[i]]; i = uf[i]; } return i; };
  const union = (a, b) => { a = find(a); b = find(b); if (a === b) return false; uf[a] = b; return true; };
  // 固定エリアの中のつながりを union
  C.rects.forEach((r, ri) => {
    const seen = new Set();
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
      if (!lat(x, y) || seen.has(C.idx(x, y))) continue;
      const root = C.idx(x, y), q = [[x, y]]; seen.add(root);
      while (q.length) { const [cx, cy] = q.pop(); for (const [dx, dy] of FRM_DIRS) { const nx = cx + dx, ny = cy + dy, ni = C.idx(nx, ny); if (!frmInRect(r, nx, ny) || seen.has(ni) || !frmPass(C.g[ny][nx], true, null)) continue; seen.add(ni); q.push([nx, ny]); if (lat(nx, ny)) union(ni, root); } }
    }
  });
  const nearFixed = (x, y, pad) => C.rects.some(r => frmInRect(r, x, y, pad));
  // --- 仕掛けの小部屋：C(外の通路)→門h→A→i(B)。立て札gはCの横の壁 ---
  let tplOk = false;
  for (let t = 0; t < 80 && !tplOk; t++) {
    const ax = 1 + 2 * rng.int(0, (W - 3) / 2), ay = 1 + 2 * rng.int(0, (H - 3) / 2);
    const [dx, dy] = rng.pick(FRM_DIRS), bx = ax + 2 * dx, by = ay + 2 * dy, cx = ax - 2 * dx, cy = ay - 2 * dy;
    if (![[ax, ay], [bx, by], [cx, cy]].every(([x, y]) => lat(x, y) && !nearFixed(x, y, 1))) continue;
    const side = rng() < 0.5 ? 1 : -1, px = dy * side, py = dx * side;   // dir に垂直
    const gx = cx + px, gy = cy + py;
    if (!lat(cx + 2 * px, cy + 2 * py)) continue;
    // C から格子の外へ出られる辺が少なくとも1本（門・立て札以外）
    const exits = FRM_DIRS.filter(([ex, ey]) => !(ex === dx && ey === dy) && !(ex === px && ey === py) && lat(cx + 2 * ex, cy + 2 * ey));
    if (!exits.length) continue;
    // A・B の辺をすべて閉じて固定
    for (const [x, y] of [[ax, ay], [bx, by]]) {
      for (const [ex, ey] of FRM_DIRS) { const tx = x + ex, ty = y + ey; C.set(tx, ty, "#"); C.locked[C.idx(tx, ty)] = 1; C.tplMask[C.idx(tx, ty)] = 1; }
      C.locked[C.idx(x, y)] = 1; C.tplMask[C.idx(x, y)] = 1;
    }
    C.set(ax, ay, "."); C.set(bx, by, R.cache);
    C.set(ax + dx, ay + dy, ".");                // A–B の間
    C.set(ax - dx, ay - dy, R.door);             // 門
    C.set(gx, gy, R.plaque); C.locked[C.idx(gx, gy)] = 1; C.tplMask[C.idx(gx, gy)] = 1;
    C.reserved[C.idx(cx, cy)] = 1;
    C.cacheTpl = { ax, ay, bx, by, cx, cy, door: [ax - dx, ay - dy], plaque: [gx, gy] };
    tplOk = true;
  }
  if (!tplOk) return false;
  // --- 小部屋（3×3〜7×5、格子にそろえる） ---
  const rooms = [], roomTarget = rng.int(2, 3);
  for (let t = 0; t < 60 && rooms.length < roomTarget; t++) {
    const cw = rng.int(2, 4), chh = rng.int(2, 3);
    const x0 = 1 + 2 * rng.int(0, (W - 1) / 2 - 1 - cw), y0 = 1 + 2 * rng.int(0, (H - 1) / 2 - 1 - chh);
    const x1 = x0 + 2 * (cw - 1), y1 = y0 + 2 * (chh - 1);
    if (x1 > W - 2 || y1 > H - 2) continue;
    let ok = true;
    for (let y = y0 - 1; y <= y1 + 1 && ok; y++) for (let x = x0 - 1; x <= x1 + 1 && ok; x++) { const i = C.idx(x, y); if (C.locked[i] && !C.border(x, y) || C.reserved[i] || nearFixed(x, y, 0)) ok = false; }
    for (const r of rooms) if (x0 <= r.x1 + 3 && x1 >= r.x0 - 3 && y0 <= r.y1 + 3 && y1 >= r.y0 - 3) ok = false;
    if (!ok) continue;
    const room = { x0, y0, x1, y1 };
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { C.set(x, y, "."); C.roomMask[C.idx(x, y)] = rooms.length + 1; }
    for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) union(C.idx(x, y), C.idx(x0, y0));
    rooms.push(room);
  }
  C.rooms = rooms;
  // --- 迷路（Kruskal）：全域木 ---
  const edges = [], cellOk = (x, y) => lat(x, y) && !C.tplMask[C.idx(x, y)];
  for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) {
    if (!cellOk(x, y)) continue;
    if (cellOk(x + 2, y) && !C.locked[C.idx(x + 1, y)]) edges.push([x, y, x + 2, y]);
    if (cellOk(x, y + 2) && !C.locked[C.idx(x, y + 1)]) edges.push([x, y, x, y + 2]);
  }
  rng.shuffle(edges);
  const closed = [];
  for (const e of edges) {
    const [x0, y0, x1, y1] = e, ex = (x0 + x1) >> 1, ey = (y0 + y1) >> 1;
    if (C.g[ey][ex] !== "#") continue;
    if (union(C.idx(x0, y0), C.idx(x1, y1))) C.set(ex, ey, "."); else closed.push(e);
  }
  // --- ループ（行き止まりばかりにしない） ---
  const loops = rng.int(6, 9);
  for (const e of rng.shuffle(closed).slice(0, loops)) { const ex = (e[0] + e[2]) >> 1, ey = (e[1] + e[3]) >> 1; C.set(ex, ey, "."); }
  // --- 行き止まり：置き物の分を確保し、空の行き止まりを2〜4個残して、残りは壁を抜いてつなぐ ---
  const isMazeCell = (x, y) => lat(x, y) && !C.fixedMask[C.idx(x, y)] && !C.tplMask[C.idx(x, y)] && !C.roomMask[C.idx(x, y)] && !C.reserved[C.idx(x, y)];
  const openEdges = (x, y) => FRM_DIRS.filter(([dx, dy]) => C.at(x + dx, y + dy) !== "#");
  const startDist = frmBfs(C, C.start, c => frmPass(c, true, R.door));
  let dead = [];
  for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) if (isMazeCell(x, y) && openEdges(x, y).length === 1) dead.push({ x, y, d: startDist[C.idx(x, y)], r: rng() });
  dead.sort((p, q) => (q.d + q.r * 8) - (p.d + p.r * 8));
  const nChest = (C.src.chests || []).length || frmCount(C.orig, "T");
  const nGather = Math.max(rule.minGathers || 0, frmCount(C.orig, "G"));
  const items = [];
  for (let i = 0; i < nChest; i++) items.push("T");
  for (let i = 0; i < nGather; i++) items.push("G");
  for (const e of (rule.events || [])) items.push(e);
  const assigned = [];
  // 宝箱は遠い順、採取・サブイベントは残りから
  for (const it of items) {
    if (!dead.length) break;
    const pickI = it === "T" ? 0 : rng.int(0, Math.min(dead.length - 1, 4));
    const d = dead.splice(pickI, 1)[0]; assigned.push({ ...d, it }); C.reserved[C.idx(d.x, d.y)] = 1;
  }
  const keep = rng.int(2, 4), keepCells = dead.splice(0, Math.min(keep, dead.length));
  for (const k of keepCells) C.reserved[C.idx(k.x, k.y)] = 2;
  for (const d of dead) {
    if (openEdges(d.x, d.y).length !== 1) continue;
    const opts = rng.shuffle(FRM_DIRS.filter(([dx, dy]) => {
      const nx = d.x + 2 * dx, ny = d.y + 2 * dy, ex = d.x + dx, ey = d.y + dy;
      return lat(nx, ny) && C.g[ey][ex] === "#" && !C.locked[C.idx(ex, ey)] && !C.tplMask[C.idx(nx, ny)] && !C.reserved[C.idx(nx, ny)];
    }));
    if (opts.length) C.set(d.x + opts[0][0], d.y + opts[0][1], ".");
  }
  // --- 浅瀬「*」：部屋の中に2マス以上の塊（第2階層の3Dでは水面として描かれる。歩ける） ---
  for (const room of rng.shuffle(rooms.slice()).slice(0, rng.int(1, Math.min(2, rooms.length)))) {
    const inner = [];
    for (let y = room.y0; y <= room.y1; y++) for (let x = room.x0; x <= room.x1; x++) {
      if (FRM_DIRS.some(([dx, dy]) => { const c = C.at(x + dx, y + dy); return c !== "#" && !C.roomMask[C.idx(x + dx, y + dy)]; })) continue;   // 入口の前は空ける
      inner.push([x, y]);
    }
    if (inner.length < 3) continue;
    const seed = rng.pick(inner), want = rng.int(2, Math.min(5, inner.length - 1)), blob = [seed], inSet = new Set(inner.map(([x, y]) => C.idx(x, y)));
    while (blob.length < want) {
      const [bx, by] = rng.pick(blob), [dx, dy] = rng.pick(FRM_DIRS), nx = bx + dx, ny = by + dy;
      if (inSet.has(C.idx(nx, ny)) && !blob.some(([x, y]) => x === nx && y === ny)) blob.push([nx, ny]);
      if (blob.length >= inner.length) break;
    }
    if (blob.length >= 2) for (const [x, y] of blob) C.set(x, y, "*");
  }
  // --- 置き物：行き止まりに宝箱・採取・サブイベント（足りなければ部屋の隅） ---
  const placeIn = (ch, cands) => { for (const [x, y] of cands) if (frmTryPlaceSolid(C, x, y, ch, R.door)) return true; return false; };
  const roomCorners = () => {
    const out = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!C.roomMask[C.idx(x, y)] || C.g[y][x] !== "." || frmWallCountOrth(C, x, y) < 2 || frmNearLetter(C, x, y, 1)) continue;
      if (FRM_DIRS.some(([dx, dy]) => { const c = C.at(x + dx, y + dy); return c !== "#" && !C.roomMask[C.idx(x + dx, y + dy)]; })) continue;
      out.push([x, y]);
    }
    return rng.shuffle(out);
  };
  for (const a of assigned) C.set(a.x, a.y, a.it);
  for (let i = assigned.length; i < items.length; i++) if (!placeIn(items[i], roomCorners())) return false;
  // 導きの灯：中央に近い部屋の壁ぎわ（入口の前は避ける）
  for (let s = 0; s < (rule.saves || 0); s++) {
    const mid = rooms.slice().sort((p, q) => Math.hypot((p.x0 + p.x1) / 2 - W / 2, (p.y0 + p.y1) / 2 - H / 2) - Math.hypot((q.x0 + q.x1) / 2 - W / 2, (q.y0 + q.y1) / 2 - H / 2));
    const cands = [];
    for (const room of mid) {
      const list = [];
      for (let y = room.y0; y <= room.y1; y++) for (let x = room.x0; x <= room.x1; x++) {
        if (C.g[y][x] !== "." || frmWallCountOrth(C, x, y) < 1 || frmNearLetter(C, x, y, 1)) continue;
        if (FRM_DIRS.some(([dx, dy]) => { const c = C.at(x + dx, y + dy); return c !== "#" && !C.roomMask[C.idx(x + dx, y + dy)]; })) continue;
        list.push([x, y]);
      }
      cands.push(...rng.shuffle(list));
    }
    if (!placeIn("S", cands)) {
      const any = []; for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) if (isMazeCell(x, y) && C.g[y][x] === "." && openEdges(x, y).length === 1) any.push([x, y]);
      if (!placeIn("S", rng.shuffle(any))) return false;
    }
  }
  // --- 合図石：西は西半分、東は東半分の壁（部屋の壁を優先） ---
  const mid = Math.floor(W / 2);
  if (!frmPlaceOnWall(C, rule.west, x => x < mid)) return false;
  if (!frmPlaceOnWall(C, rule.east, x => x > mid)) return false;
  return true;
}

/* ------------------------------------------------------------
   6F：洞窟（セルオートマトン）＋道「,」＋草むら「*」
   ------------------------------------------------------------ */
function frmGenCave(C) {
  const { W, H, rng, rule } = C;
  frmStampFixed(C);
  // --- 行商人・見張り番の部屋（テンプレート） ---
  const tpl = rule.npcRoom, tw = tpl[0].length, th = tpl.length;
  let room = null;
  for (let t = 0; t < 80 && !room; t++) {
    const x0 = rng.int(2, W - tw - 2), y0 = rng.int(1, H - th - 3);
    let ok = true;
    for (let y = y0 - 2; y <= y0 + th + 1 && ok; y++) for (let x = x0 - 2; x <= x0 + tw + 1 && ok; x++) if (C.rects.some(r => frmInRect(r, x, y, 1))) ok = false;
    if (!ok) continue;
    room = { x0, y0, x1: x0 + tw - 1, y1: y0 + th - 1, door: [x0 + (tw >> 1), y0 + th] };
  }
  if (!room) return false;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const i = C.idx(room.x0 + x, room.y0 + y); C.set(room.x0 + x, room.y0 + y, tpl[y][x]); C.locked[i] = 1; C.tplMask[i] = 1; }
  C.npcRoom = room;
  // --- ランダムに埋めて、なめらかにする ---
  const open = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = C.idx(x, y); open[i] = C.locked[i] ? (C.g[y][x] !== "#" ? 1 : 0) : (rng() < 0.56 ? 1 : 0); }
  for (let it = 0; it < 4; it++) {
    const nxt = open.slice();
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = C.idx(x, y); if (C.locked[i]) continue;
      let walls = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !open[C.idx(x + dx, y + dy)]) walls++;
      nxt[i] = walls >= 5 ? 0 : walls <= 3 ? 1 : open[i];
    }
    open.set(nxt);
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (!C.locked[C.idx(x, y)]) C.set(x, y, open[C.idx(x, y)] ? "." : "#");
  // 入口・ポートは必ず床
  const ports = [];
  for (const r of C.rects) for (const p of (r.ports || [])) ports.push(p);
  for (let x = room.x0 + 1; x <= room.x1 - 1; x++) if (!C.locked[C.idx(x, room.y1 + 1)]) C.set(x, room.y1 + 1, ".");
  for (const [x, y] of ports) C.set(x, y, ".");
  // --- 道：スタート→部屋の入口→ボス前、と寄り道を1本 ---
  const road = (from, to) => {
    const noise = new Float64Array(W * H).map(() => rng());
    const path = frmCarvePath(C, from, to, (x, y) => (C.g[y][x] === "#" ? 3.2 : 1) + noise[C.idx(x, y)] * 1.4);
    if (!path) return false;
    for (const i of path) { const x = i % W, y = (i - x) / W; if (!C.locked[i]) C.set(x, y, ","); }
    return true;
  };
  const sp = rule.fixed[0].ports[ports.length > 2 ? 1 : 0] || ports[0], bp = ports[ports.length - 1];
  if (!road(sp, room.door) || !road(room.door, bp)) return false;
  // 寄り道：まだ道の通っていない遠い場所へ（2本）
  for (let det = 0; det < 2; det++) {
    const far = [];
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (C.g[y][x] === "." && !C.locked[C.idx(x, y)]) far.push([x, y]);
    rng.shuffle(far);
    const roadCells = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (C.g[y][x] === ",") roadCells.push([x, y]);
    const best = far.slice(0, 30).map(p => ({ p, d: Math.min(...roadCells.map(q => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]))) })).sort((a, b) => b.d - a.d)[0];
    if (best && best.d >= 4 && roadCells.length) {
      const from = roadCells.slice().sort((a, b) => (Math.abs(a[0] - best.p[0]) + Math.abs(a[1] - best.p[1])) - (Math.abs(b[0] - best.p[0]) + Math.abs(b[1] - best.p[1])))[0];
      road(from, best.p);
    }
  }
  // --- 孤立した広がり：大きければ道でつなぎ、小さければ埋める ---
  for (let guard = 0; guard < 20; guard++) {
    const dist = frmBfs(C, C.start, c => frmPass(c, true, null));
    let found = null;
    for (let y = 1; y < H - 1 && !found; y++) for (let x = 1; x < W - 1 && !found; x++) if (frmPass(C.g[y][x], true, null) && dist[C.idx(x, y)] < 0) found = [x, y];
    if (!found) break;
    const comp = frmBfs(C, { tx: found[0], ty: found[1] }, c => frmPass(c, true, null));
    const cells = []; for (let i = 0; i < comp.length; i++) if (comp[i] >= 0) cells.push(i);
    if (cells.length >= 8) {
      let best = null, bd = Infinity;
      for (let i = 0; i < dist.length; i++) if (dist[i] >= 0 && !C.locked[i]) { const d = Math.abs(i % W - found[0]) + Math.abs(Math.floor(i / W) - found[1]); if (d < bd) { bd = d; best = i; } }
      const path = best === null ? null : frmCarvePath(C, found, [best % W, Math.floor(best / W)], (x, y) => (C.g[y][x] === "#" ? 2 : 1));
      if (path) for (const i of path) { const x = i % W, y = (i - x) / W; if (!C.locked[i] && C.g[y][x] === "#") C.set(x, y, "."); }
      else for (const i of cells) if (!C.locked[i]) C.set(i % W, Math.floor(i / W), "#");
    } else for (const i of cells) if (!C.locked[i]) C.set(i % W, Math.floor(i / W), "#");
  }
  // 既存の6Fと同じくらい開けた洞窟にする（狭すぎる形はやり直し）
  { let openN = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (frmPass(C.g[y][x], true, null)) openN++; if (openN < (W - 2) * (H - 2) * 0.46) return false; }
  // --- 草むら（浅瀬）「*」：道以外の床に塊で ---
  const blobs = rng.int(6, 9);
  for (let b = 0; b < blobs; b++) {
    const floor = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (C.g[y][x] === "." && !C.locked[C.idx(x, y)]) floor.push([x, y]);
    if (!floor.length) break;
    const blob = [rng.pick(floor)], want = rng.int(4, 10);
    for (let k = 0; k < want * 4 && blob.length < want; k++) {
      const [bx, by] = rng.pick(blob), [dx, dy] = rng.pick(FRM_DIRS), nx = bx + dx, ny = by + dy;
      if (C.g[ny] && C.g[ny][nx] === "." && !C.locked[C.idx(nx, ny)] && !blob.some(([x, y]) => x === nx && y === ny)) blob.push([nx, ny]);
    }
    if (blob.length >= 2) for (const [x, y] of blob) C.set(x, y, "*");
  }
  // --- 置き物：宝箱（スタートから遠いくぼみ）・採取・看板 ---
  const startDist = frmBfs(C, C.start, c => frmPass(c, true, null));
  const placed = [];
  const nook = (minWalls) => {
    const out = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = C.idx(x, y), c = C.g[y][x];
      if ((c !== "." && c !== "*") || C.locked[i]) continue;
      if (frmWallCountOrth(C, x, y) < minWalls) continue;
      if (C.rects.some(r => frmInRect(r, x, y, 1)) || frmInRect(room, x, y, 1)) continue;
      if (placed.some(([px, py]) => Math.abs(px - x) + Math.abs(py - y) < 5)) continue;
      out.push({ x, y, d: startDist[i] });
    }
    return out;
  };
  const place = (ch, farFirst) => {
    for (const minWalls of [3, 2]) {
      let cands = rng.shuffle(nook(minWalls));
      if (farFirst) cands.sort((p, q) => q.d - p.d), cands = cands.slice(0, Math.max(4, cands.length >> 1)), rng.shuffle(cands);
      for (const c of cands) if (frmTryPlaceSolid(C, c.x, c.y, ch, null)) { placed.push([c.x, c.y]); return true; }
    }
    return false;
  };
  const nChest = (C.src.chests || []).length || frmCount(C.orig, "T");
  const nGather = Math.max(rule.minGathers || 0, frmCount(C.orig, "G"));
  for (let i = 0; i < nChest; i++) if (!place("T", true)) return false;
  for (let i = 0; i < nGather; i++) if (!place("G", false)) return false;
  for (let i = 0; i < (rule.signs || 0); i++) if (!place("?", false)) return false;
  // --- 空の行き止まりを2〜3個（3Dの滝・祭壇の置き場）。足りなければ洞窟の壁を1マス掘ってくぼみにする ---
  const emptyDead = () => { let k = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const c = C.g[y][x]; if ((c === "." || c === "*" || c === ",") && !C.locked[C.idx(x, y)] && frmWallCountOrth(C, x, y) === 3) k++; } return k; };
  const wantDead = rng.int(2, 3);
  if (emptyDead() < wantDead) {
    const cands = [];
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      if (C.g[y][x] !== "#" || C.locked[C.idx(x, y)] || C.rects.some(r => frmInRect(r, x, y, 1)) || frmInRect(room, x, y, 1)) continue;
      const opens = FRM_DIRS.filter(([dx, dy]) => frmPass(C.at(x + dx, y + dy), true, null));
      if (opens.length !== 1 || FRM_DIRS.filter(([dx, dy]) => C.at(x + dx, y + dy) === "#").length !== 3) continue;
      const nc = C.at(x + opens[0][0], y + opens[0][1]); if (nc !== "." && nc !== "*") continue;
      if (frmNearLetter(C, x, y, 1)) continue;
      cands.push([x, y]);
    }
    for (const [x, y] of rng.shuffle(cands)) {
      if (emptyDead() >= wantDead) break;
      if (C.g[y][x] === "#" && FRM_DIRS.filter(([dx, dy]) => frmPass(C.at(x + dx, y + dy), true, null)).length === 1) C.set(x, y, ".");
    }
  }
  return true;
}

/* ------------------------------------------------------------
   各マスの役割（3D 用）
   ------------------------------------------------------------ */
function frmRoles(C) {
  const { W, H } = C, door = C.rule.cache && C.rule.cache.door;
  const pass = (x, y) => frmPass(C.at(x, y), true, door);
  const objDefs = (FIELD_AREAS[Number(C.floorKey.split("-")[0])] || {}).objects || {};
  const out = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const i = C.idx(x, y), c = C.g[y][x];
      let role;
      if (C.fixedMask[i]) role = "fixed";
      else if (C.tplMask[i]) role = "template";
      else if (c === "#") {
        const opens = FRM_DIRS.filter(([dx, dy]) => pass(x + dx, y + dy));
        const walls = FRM_DIRS.filter(([dx, dy]) => C.at(x + dx, y + dy) === "#");
        role = !C.border(x, y) && opens.length === 1 && walls.length === 3 && C.at(x + opens[0][0], y + opens[0][1]) !== "*" ? "shrine-candidate" : "wall";
      } else if (frmIsLetter(c) && objDefs[c] && objDefs[c].onWall) role = "wall";   // 壁に付いた物（合図石・立て札）
      else if (c === "*") role = "water";
      else {
        const walls = FRM_DIRS.filter(([dx, dy]) => !pass(x + dx, y + dy)).length;
        const shore = FRM_DIRS.some(([dx, dy]) => C.at(x + dx, y + dy) === "*");
        const narrow = (!pass(x - 1, y) && !pass(x + 1, y)) || (!pass(x, y - 1) && !pass(x, y + 1));
        if (walls >= 3) role = "deadend";
        else if (shore) role = "shore";
        else if (C.roomMask[i]) role = "room";
        else if (c === ",") role = "road";
        else if (C.rule.style === "cave") role = narrow ? "corridor" : "room";
        else role = "corridor";
      }
      row.push(role);
    }
    out.push(row);
  }
  return out;
}

/* ------------------------------------------------------------
   検証（生成とは独立に、出来上がったマップだけを見る）
   ------------------------------------------------------------ */
function fieldRandomMazeValidate(floorKey, floor) {
  const errs = [], rule = FIELD_RANDOM_FLOORS[floorKey], src = frmFloorSource(floorKey);
  if (!rule || !src || !floor || !Array.isArray(floor.map)) return ["no-floor"];
  const map = floor.map, H = map.length, W = map[0].length;
  if (H !== src.map.length || W !== src.map[0].length || map.some(r => r.length !== W)) errs.push("size");
  const C = { W, H, g: map.map(r => r.split("")), rule, rects: rule.fixed };
  C.idx = (x, y) => y * W + x; C.at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? "#" : C.g[y][x];
  for (let x = 0; x < W; x++) if (map[0][x] !== "#" || map[H - 1][x] !== "#") errs.push("border");
  for (let y = 0; y < H; y++) if (map[y][0] !== "#" || map[y][W - 1] !== "#") errs.push("border");
  const find = ch => { const out = []; map.forEach((r, y) => [...r].forEach((c, x) => { if (c === ch) out.push([x, y]); })); return out; };
  const door = rule.cache ? rule.cache.door : null;
  const P = find("P")[0], up = find("<")[0];
  const start = P || up; if (!start) return errs.concat("no-start");
  C.start = { tx: start[0], ty: start[1] };
  const closedD = frmBfs(C, C.start, c => frmPass(c, false, door)), openD = frmBfs(C, C.start, c => frmPass(c, true, door));
  const reach = (d, x, y) => d[y * W + x] >= 0;
  const adjReach = (d, x, y) => FRM_DIRS.some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < W && ny < H && reach(d, nx, ny); });
  // 出口：5F＝下り階段、6F＝ボスゲート（扉を開けずに）
  const goals = rule.style === "maze" ? find(">") : find("B");
  if (goals.length !== 1) errs.push("goal-count");
  else if (!reach(closedD, goals[0][0], goals[0][1])) errs.push("goal-unreachable");
  if (find("<").length !== 1) errs.push("up-count");
  // 置き物の数
  const expectCount = (ch, n) => { if (find(ch).length !== n) errs.push(`count-${ch}`); };
  expectCount("T", (src.chests || []).length || frmCount(src.map, "T"));
  expectCount("G", Math.max(rule.minGathers || 0, frmCount(src.map, "G")));
  expectCount("S", frmCount(src.map, "S"));
  expectCount("?", frmCount(src.map, "?"));
  for (const ch of "abcdefghijklmnopqrstuvwxyz") expectCount(ch, frmCount(src.map, ch));
  // 置き物に隣接する到達可能な床（扉を開けずに）。宝箱iだけは門を開けたときだけ
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = map[y][x];
    if (!(c === "T" || c === "G" || c === "S" || c === "?" || frmIsLetter(c))) continue;
    if (rule.cache && c === rule.cache.cache) {
      if (adjReach(closedD, x, y)) errs.push("cache-without-door");
      if (!adjReach(openD, x, y)) errs.push("cache-unreachable");
    } else if (!adjReach(closedD, x, y)) errs.push(`unreachable-${c}@${x},${y}`);
  }
  // 合図石：西は西半分、東は東半分。壁に付く物は、床が1方向だけ
  if (rule.west) { const [p] = find(rule.west); if (!p || p[0] >= Math.floor(W / 2)) errs.push("west-stone-side"); }
  if (rule.east) { const [p] = find(rule.east); if (!p || p[0] <= Math.floor(W / 2)) errs.push("east-stone-side"); }
  // 孤立した床がない（門を開けた状態で、通れるマスはすべてつながる）
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (frmPass(map[y][x], true, door) && !reach(openD, x, y)) { errs.push(`isolated@${x},${y}`); y = H; break; }
  // 固定エリアは既存マップのまま
  for (const r of rule.fixed) for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
    let c = src.map[y][x]; if (r.replace && r.replace[c]) c = r.replace[c];
    if (map[y][x] !== c) { errs.push(`fixed-changed@${x},${y}`); y = r.y1 + 1; break; }
  }
  // FOE：巡回点はすべて到達可能・FOEが歩けるマス・互いにつながる。スタート固定エリアの8マス以内とボス前固定エリアには入らない
  const startRect = rule.fixed.find(r => r.tag === "start");
  const foes = floor.foes || [];
  if (foes.length !== (src.foes || []).length) errs.push("foe-count");
  for (const fd of foes) {
    const path = fd.path || [];
    if (!path.length) { errs.push("foe-no-path"); continue; }
    for (const [x, y] of path) {
      if (!frmFoeWalk(C.at(x, y)) || !reach(closedD, x, y)) errs.push("foe-point-unreachable");
      if (startRect && frmRectDist(startRect, x, y) <= FIELD_RANDOM_FOE_START_CLEAR) errs.push("foe-near-start");
      if (rule.fixed.some(r => r.tag !== "start" && frmInRect(r, x, y))) errs.push("foe-in-fixed");
    }
    for (let k = 0; k < path.length; k++) {
      const a = path[k], b = path[(k + 1) % path.length]; if (a === b) continue;
      const route = frmFoeRoute(C, a, b);
      if (!route) { errs.push("foe-route-broken"); continue; }
      if (route.some(i => rule.fixed.some(r => frmInRect(r, i % W, Math.floor(i / W))))) errs.push("foe-route-in-fixed");
    }
  }
  return errs;
}

/* ------------------------------------------------------------
   生成（純粋関数：同じ floorKey・expedition なら同じ結果）
   ------------------------------------------------------------ */
function fieldRandomMazeGenerate(floorKey, expedition) {
  const rule = FIELD_RANDOM_FLOORS[floorKey], src = frmFloorSource(floorKey);
  if (!rule || !src) return null;
  for (let attempt = 0; attempt < FIELD_RANDOM_MAX_TRIES; attempt++) {
    const seed = frmSeedFor(floorKey, expedition, attempt), C = frmNewCtx(floorKey, frmRng(seed));
    let ok = false;
    try { ok = rule.style === "maze" ? frmGenMaze(C) : frmGenCave(C); } catch (e) { ok = false; if (typeof console !== "undefined") console.warn("[random-maze] 生成エラー", floorKey, attempt, e); }
    if (!ok) continue;
    const foes = frmPlaceFoes(C); if (!foes) continue;
    const floor = { ...src, map: C.g.map(r => r.join("")), foes, random: true };
    const errs = fieldRandomMazeValidate(floorKey, floor);
    if (errs.length) continue;
    return { floorKey, expedition, attempt, seed, tag: `e${expedition}s${seed.toString(36)}`, floor, roles: frmRoles(C),
      meta: { rooms: C.rooms || null, cacheRoom: C.cacheTpl || null, npcRoom: C.npcRoom || null, fixed: rule.fixed.map(r => ({ tag: r.tag, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 })) } };
  }
  return null;   // 既存の固定マップへ
}

/* ------------------------------------------------------------
   ゲームとの接続（field.js の fieldArea・出発・ロード）
   ------------------------------------------------------------ */
const fieldRandomMazeCache = {};
function fieldRandomMazeExpedition() { return typeof fieldState !== "undefined" ? Math.max(0, Math.floor(Number(fieldState.expedition) || 0)) : 0; }
function fieldRandomMazeIsTarget(n, f) { return !!FIELD_RANDOM_FLOORS[`${n}-${f}`]; }
// fieldArea から毎回呼ばれる（ランダム対象でなければ null。結果は探索回数ごとにキャッシュ）
function fieldRandomFloor(n, f) {
  const key = `${n}-${f}`; if (!FIELD_RANDOM_FLOORS[key]) return null;
  const exp = fieldRandomMazeExpedition(), ck = `${key}|${exp}`;
  if (ck in fieldRandomMazeCache) return fieldRandomMazeCache[ck];
  for (const k of Object.keys(fieldRandomMazeCache)) if (k.startsWith(key + "|")) delete fieldRandomMazeCache[k];
  const r = fieldRandomMazeGenerate(key, exp);
  if (!r && typeof console !== "undefined") console.warn("[random-maze] 生成に失敗したため固定マップを使います:", key, exp);
  return (fieldRandomMazeCache[ck] = r);
}
// fieldLootIndex のキャッシュを作り直す目印（探索回数が変わると変わる）
function fieldRandomMazeSig() { return `e${fieldRandomMazeExpedition()}`; }
// fieldArea の戻り値に、キー・3D用の役割を足す
function fieldRandomMazeDecorate(a, rnd) {
  a.random = { seed: rnd.seed, expedition: rnd.expedition, attempt: rnd.attempt, tag: rnd.tag, meta: rnd.meta };
  a.buildKey = `${a.key}@${rnd.tag}`;
  a.tileRoles = rnd.roles;
  // 宝箱：探索ごとに復活（キーに探索回数を含める）
  for (const o of a.objects) if (o.kind === "chest") o.key = `chest:${a.key}:e${rnd.expedition}:${o.tx}:${o.ty}`;
  // 採集点：位置が毎回変わるので「何番目の採集点か」で数える（30分で戻るルールを探索をまたいで保つ）
  const pts = (typeof FIELD_GATHER_POINTS !== "undefined" && FIELD_GATHER_POINTS[a.key]) || {};
  const slots = [];
  (FIELD_AREAS[a.n].floors[a.f].map || []).forEach((row, y) => [...row].forEach((c, x) => { if (c === "G") slots.push(pts[`${x},${y}`] || null); }));
  let gi = 0;
  for (const o of a.objects) if (o.kind === "gather") {
    const def = slots[gi] || null;
    o.key = `gather:${a.key}:g${gi}`; o.gatherSlot = gi;
    o.gatherDef = def || {}; if (def && ["take", "chop", "mine"].includes(def.kind)) o.gatherKind = def.kind;
    gi++;
  }
}
function fieldRandomMazeIsRandomKey(k) {
  return Object.keys(FIELD_RANDOM_FLOORS).some(fk => k.startsWith(`chest:${fk}:`) || k.startsWith(`gather:${fk}:`));
}
// 踏破マップ・発見済み・前回までの宝箱フラグを片付け、今回の探索の目印を付ける
function fieldRandomMazeReset(exp) {
  for (const fk of Object.keys(FIELD_RANDOM_FLOORS)) delete fieldState.explored[fk];
  if (fieldState.discovered) for (const k of Object.keys(fieldState.discovered)) if (fieldRandomMazeIsRandomKey(k)) delete fieldState.discovered[k];
  for (const k of Object.keys(fieldState.flags)) {
    const m = /^chest:(\d+-\d+):e(\d+):/.exec(k);
    if (m && FIELD_RANDOM_FLOORS[m[1]] && Number(m[2]) !== exp) delete fieldState.flags[k];
    if (/^rmaze:e\d+$/.test(k) && k !== `rmaze:e${exp}`) delete fieldState.flags[k];
  }
  fieldState.flags[`rmaze:e${exp}`] = true;
}
// ホームから出発したとき（field/field-navigation.js の fieldEnterArea。expedition を増やした後）
function fieldRandomMazeOnDeparture() { fieldRandomMazeReset(fieldRandomMazeExpedition()); }
// ロード時（field/field-persistence.js）。今回の探索の目印が無い（旧セーブ・固定マップ時代の踏破）なら片付ける
function fieldRandomMazeOnLoad() { const exp = fieldRandomMazeExpedition(); if (!fieldState.flags[`rmaze:e${exp}`]) fieldRandomMazeReset(exp); }
// 保存された位置がランダム階で使えるか（壁の中・門の奥に閉じ込められる位置は不可）
function fieldRandomMazePosOk(a, px, py) {
  if (!a || !a.random) return true;
  const tx = Math.floor(px / FIELD_TILE), ty = Math.floor(py / FIELD_TILE);
  if (tx < 0 || ty < 0 || tx >= a.w || ty >= a.h) return false;
  const seen = new Uint8Array(a.w * a.h), q = [a.start.ty * a.w + a.start.tx]; seen[q[0]] = 1;
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi], x = cur % a.w, y = (cur - x) / a.w;
    if (x === tx && y === ty) return true;
    for (const [dx, dy] of FRM_DIRS) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= a.w || ny >= a.h) continue;
      const ni = ny * a.w + nx; if (seen[ni] || fieldCharSolid(a, fieldTileAt(a, nx, ny))) continue;
      seen[ni] = 1; q.push(ni);
    }
  }
  return false;
}
