"use strict";
/* ============================================================
   field/field-random-maze.js — 第2階層「凍てつく水源」5F・6F のランダム迷宮
   ------------------------------------------------------------
   担当：Claude（迷宮システム）。仕様：docs/field-and-story/B2_RANDOM_MAZE_SPEC.md
   ・対象：FIELD_RANDOM_FLOORS のフロア（"2-1"=5F、"2-2"=6F）。4F と他の階層は data/field-maps.js のまま。
   ・形はホームから出発するたび（fieldState.expedition が増えるたび）に作り直す。
     シード = hash("kotama-b2|<フロア>|<expedition>|<試行>")。Math.random は使わない（ロードで同じ形を再現）。
   ・v4（2026-11-17、ユーザー実機フィードバック）：5F・6F とも1マス幅の細い道（奇数座標の格子の迷路。6F は岩を多めにして洞窟らしく）。
     開けた所は「見せ場の広間（vista）」1〜2か所だけ。危険な水面「~」（通行不可）を広間の一辺・通路の脇・水路・水門の池に置き、
     通れる水たまり「*」と分ける。スタート側とゴール側は水路で分かれ、橋を渡らないとゴールへ行けない。6F は水門の展示区画あり。
     群生地・背景スロット・階段の向きも features として 3D の班へ渡す（仕様書 §10「v4」）。
   ・固定エリア（階段まわり・ボス前）は既存マップから切り出してそのまま置く。
     仕掛け（5F：門h＋宝箱i＋立て札g）・NPCの部屋（6F：行商人a・見張り番b）はテンプレートとして位置だけランダム。
   ・生成後に必ず検証し（fieldRandomMazeValidate）、満たさなければ次の試行。最大 FIELD_RANDOM_MAX_TRIES 回で
     失敗したら既存の固定マップへ戻す（fieldRandomFloor が null を返す）。
   ・fieldArea（field.js）へは fieldRandomFloor／fieldRandomMazeDecorate の2か所だけで差し込む。
   ・index.html では data/*.js の後、field.js の前に読み込む。
   ============================================================ */
const FIELD_RANDOM_FLOORS = {
  // 5F：細い迷路。上り階段まわり（7×3）と下り階段まわり（5×3）を固定。見せ場の広間1つ（水辺＝群生地）・左右を分ける水路の橋
  "2-1": {
    goal: ">", minGathers: 2,
    fixed: [ { tag: "start", x0: 1, y0: 17, x1: 7, y1: 19 }, { tag: "down", x0: 19, y0: 17, x1: 23, y1: 19 } ],
    cache: { door: "h", cache: "i", plaque: "g" }, west: "e", east: "f", events: ["d"], saves: 1,
    cut: { axes: ["v"] }, vistas: [1, 1], vista: { cw: [3, 5], ch: [2, 3] }, watergates: 0, loops: [5, 8], puddles: [1, 2], sideWater: [1, 2]
  },
  // 6F：岩の多い細い洞窟。開始位置まわりと、ボス前（導きの灯S・ボスゲートB）を固定。広間1〜2・水路の橋・水門の展示区画
  "2-2": {
    goal: "B", minGathers: 2,
    fixed: [ { tag: "start", x0: 1, y0: 1, x1: 4, y1: 3, replace: { a: "_" }, ports: [[5, 1], [5, 2]] },
             { tag: "boss", x0: 20, y0: 14, x1: 26, y1: 16, ports: [[19, 14]] } ],
    npcRoom: ["#######", "#a___b#", "._____."], signs: 1,
    cut: { axes: ["v", "h"] }, vistas: [1, 2], vista: { cw: [3, 4], ch: [2, 3] }, watergates: 1, rock: 0.12, loops: [3, 6], puddles: [2, 3], sideWater: [1, 2]
  }
};
const FIELD_RANDOM_MAX_TRIES = 50;
const FIELD_RANDOM_FOE_START_CLEAR = 8;      // FOE はスタート固定エリアから このマス数より遠くに置く
const FIELD_RANDOM_ROLE_NAMES = ["wall", "shrine-candidate", "fixed", "template", "room", "corridor", "road", "deadend", "water", "shore", "water-hazard", "bridge"];
const FIELD_RANDOM_TAG_NAMES = ["water-hazard", "bridge", "puddle", "vista", "meadow", "backdrop-slot", "backdrop-view", "setpiece-watergate", "watergate-gate", "watergate-view", "waterside"];

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
    waterMask: new Uint8Array(W * H), bridgeMask: new Uint8Array(W * H), vistaMask: new Uint8Array(W * H), meadowMask: new Uint8Array(W * H),
    gateMask: new Uint8Array(W * H), removed: new Uint8Array(W * H), protect: new Uint8Array(W * H), portMask: new Uint8Array(W * H),
    forced: [], bridges: [], vistas: [], watergates: [], sideWater: [],
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
    if (C.fixedMask[ni] || C.tplMask[ni] || C.bridgeMask[ni] || C.gateMask[ni] || C.portMask[ni] || C.g[ny][nx] === "*") continue;
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
  const i = C.idx(x, y); if (C.fixedMask[i] || C.tplMask[i] || C.bridgeMask[i] || C.gateMask[i] || !frmFoeWalk(C.g[y][x])) return false;   // 橋（必ず通る所）と水門を見る床には FOE を入れない
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
   5F・6F 共通：細い道の迷路（奇数座標の格子）＋見せ場の広間＋水路と橋＋水門の展示区画（v4）
   ・通路は1マス幅（格子の柱 (偶数,偶数) は常に壁なので、3×3 の開けた床は広間・固定エリアにしか出来ない）
   ・水面「~」は危険で進入不可（field.js の FIELD_SOLID に元から含まれる）。外周から2マス以上離す
   ・橋：スタート側とゴール側を分ける「切れ目の線」を1本引き、そこを渡れるのは水路の上の橋だけにする（迂回不可）
   ------------------------------------------------------------ */
const FRM_DIR_NAME = { "1,0": "right", "-1,0": "left", "0,1": "down", "0,-1": "up" };
const FRM_NAME_VEC = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] };
const FRM_OPPOSITE = { right: "left", left: "right", up: "down", down: "up" };
function frmLastLat(n) { return (n - 2) % 2 === 1 ? n - 2 : n - 3; }
function frmWaterOk(C, x, y) { return x >= 2 && y >= 2 && x <= C.W - 3 && y <= C.H - 3; }   // 水面は外周（とその隣）に置かない
function frmNearFixed(C, x, y, pad) { return C.rects.some(r => frmInRect(r, x, y, pad)); }

// 切れ目の線と水路・橋。axis "v"＝縦の線（左右を分ける）、"h"＝横の線（上下を分ける）
function frmPlaceCut(C) {
  const { W, H, rng, rule } = C;
  const startR = C.rects.find(r => r.tag === "start"), goalR = C.rects.find(r => r.tag !== "start");
  const opts = [];
  for (const axis of (rule.cut && rule.cut.axes) || ["v"]) {
    const L = axis === "v" ? H : W, A = axis === "v" ? W : H;
    const cell = (u, v) => axis === "v" ? [u, v] : [v, u];
    const span = r => { const xs = [r.x0, r.x1], ys = [r.y0, r.y1]; for (const p of r.ports || []) { xs.push(p[0]); ys.push(p[1]); } const s = axis === "v" ? xs : ys; return [Math.min(...s), Math.max(...s)]; };
    const sS = span(startR), gS = span(goalR);
    for (let k = 2; k + 3 <= frmLastLat(A); k += 2) {
      const side = s => s[1] < k ? -1 : s[0] > k + 2 ? 1 : 0, a = side(sS), b = side(gS);
      if (!a || !b || a === b) continue;
      for (let bb = 3; bb <= frmLastLat(L) - 2; bb += 2) for (const d0 of [1, 3]) for (const d1 of [1, 3]) {
        if (d0 + d1 < 4) continue;
        const v0 = bb - d0, v1 = bb + d1; if (v0 < 2 || v1 > L - 3) continue;
        opts.push({ axis, k, b: bb, v0, v1, cell, L });
      }
    }
  }
  for (const o of rng.shuffle(opts).slice(0, 60)) {
    const { k, b, v0, v1, cell, L } = o;
    let ok = true;
    for (let u = k - 1; u <= k + 3 && ok; u++) for (let v = v0 - 1; v <= v1 + 1 && ok; v++) { const [x, y] = cell(u, v); if (frmNearFixed(C, x, y, 0) || C.locked[C.idx(x, y)]) ok = false; }
    for (let u = k; u <= k + 2 && ok; u++) for (let v = v0; v <= v1; v++) { const [x, y] = cell(u, v); if (!frmWaterOk(C, x, y)) { ok = false; break; } }
    for (let v = 1; v <= L - 2 && ok; v++) { const [x, y] = cell(k, v); if (frmNearFixed(C, x, y, 0)) ok = false; }
    const e0 = cell(k - 1, b), e1 = cell(k + 3, b);
    if (!ok || frmNearFixed(C, ...e0, 0) || frmNearFixed(C, ...e1, 0)) continue;
    // 線（格子のつなぎ目）を全部ふさぐ
    for (let v = 1; v <= L - 2; v++) { const [x, y] = cell(k, v); C.set(x, y, "#"); C.locked[C.idx(x, y)] = 1; }
    const cells = [], water = [];
    for (let u = k; u <= k + 2; u++) for (let v = v0; v <= v1; v++) {
      const [x, y] = cell(u, v), i = C.idx(x, y); C.locked[i] = 1;
      if (v === b) { C.set(x, y, "."); C.bridgeMask[i] = 1; cells.push([x, y]); }
      else { C.set(x, y, "~"); C.waterMask[i] = 1; water.push([x, y]); }
    }
    for (const e of [e0, e1]) C.protect[C.idx(...e)] = 1;
    C.forced.push([e0, e1]);
    const p0 = cell(k, v0), p1 = cell(k + 2, v1), ch = { x0: Math.min(p0[0], p1[0]), y0: Math.min(p0[1], p1[1]), x1: Math.max(p0[0], p1[0]), y1: Math.max(p0[1], p1[1]) };
    // dir＝橋を渡る向き（スタート側→ゴール側の軸）。axis "v" なら左右に渡る
    C.bridges.push({ cells, ends: [e0, e1], dir: o.axis === "v" ? "x" : "y", channel: ch, water, cutAxis: o.axis, cutLine: k });
    return true;
  }
  return false;
}

// 見せ場の広間（格子にそろえた長方形）。pool＝広間の一辺に沿った危険な水面
function frmPlaceVista(C, wantPool) {
  const { W, H, rng, rule } = C, vr = rule.vista || {};
  for (let t = 0; t < 120; t++) {
    const cw = rng.int(vr.cw ? vr.cw[0] : 3, vr.cw ? vr.cw[1] : 4), chh = rng.int(vr.ch ? vr.ch[0] : 2, vr.ch ? vr.ch[1] : 3);
    const x0 = 1 + 2 * rng.int(0, Math.max(0, (frmLastLat(W) - 1) / 2 - (cw - 1))), y0 = 1 + 2 * rng.int(0, Math.max(0, (frmLastLat(H) - 1) / 2 - (chh - 1)));
    const x1 = x0 + 2 * (cw - 1), y1 = y0 + 2 * (chh - 1);
    if (x1 > frmLastLat(W) || y1 > frmLastLat(H)) continue;
    let ok = true;
    for (let y = y0 - 1; y <= y1 + 1 && ok; y++) for (let x = x0 - 1; x <= x1 + 1 && ok; x++) {
      if (C.border(x, y)) continue;
      const i = C.idx(x, y); if (C.locked[i] || C.reserved[i] || C.protect[i] || C.vistaMask[i] || frmNearFixed(C, x, y, 1)) ok = false;
    }
    for (const v of C.vistas) if (x0 <= v.x1 + 3 && x1 >= v.x0 - 3 && y0 <= v.y1 + 3 && y1 >= v.y0 - 3) ok = false;
    if (!ok) continue;
    // 水面：上下左右のどれかの辺に沿って、長さ3以上・奥行き1〜2（残りの床が2列以上・両端に床）
    let pool = [];
    if (wantPool) {
      const sides = rng.shuffle(["up", "down", "left", "right"]);
      for (const s of sides) {
        const horiz = s === "up" || s === "down", len = horiz ? x1 - x0 + 1 : y1 - y0 + 1, depthMax = (horiz ? y1 - y0 + 1 : x1 - x0 + 1) - 2;
        if (len < 5 || depthMax < 1) continue;
        const depth = rng.int(1, Math.min(2, depthMax)), pl = rng.int(3, len - 2), off = rng.int(1, len - 1 - pl);
        const cells = [];
        for (let a = off; a < off + pl; a++) for (let d = 0; d < depth; d++) {
          const x = horiz ? x0 + a : (s === "left" ? x0 + d : x1 - d), y = horiz ? (s === "up" ? y0 + d : y1 - d) : y0 + a;
          cells.push([x, y]);
        }
        if (cells.every(([x, y]) => frmWaterOk(C, x, y))) { pool = cells; break; }
      }
      if (!pool.length) continue;
    }
    const vi = C.vistas.length, poolSet = new Set(pool.map(([x, y]) => C.idx(x, y))), cells = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = C.idx(x, y); C.vistaMask[i] = vi + 1;
      if (poolSet.has(i)) { C.set(x, y, "~"); C.waterMask[i] = 1; C.locked[i] = 1; }
      else { C.set(x, y, "."); C.roomMask[i] = vi + 1; cells.push([x, y]); }
    }
    C.vistas.push({ x0, y0, x1, y1, cells, pool });
    return true;
  }
  return false;
}

// 水門の展示区画：見る床 V（行き止まり）→ 手前の水 → 水門（水の中）。水門の左右と裏は水と壁で、回り込めない
function frmPlaceWatergate(C) {
  const { rng } = C, cands = [];
  for (let y = 1; y < C.H - 1; y += 2) for (let x = 1; x < C.W - 1; x += 2) for (const d of ["up", "down", "left", "right"]) cands.push([x, y, d]);
  for (const [vx, vy, dn] of rng.shuffle(cands).slice(0, 400)) {
    const [fx, fy] = FRM_NAME_VEC[dn], px = fy, py = fx;   // p は f に垂直
    const P = (t, s) => [vx + t * fx + s * px, vy + t * fy + s * py];
    const basin = [P(1, -1), P(1, 0), P(1, 1), P(2, -1), P(2, 0), P(2, 1)], gate = P(2, 0);
    const removeLat = [P(2, -2), P(2, 2)], walls = [P(0, -1), P(0, 1), P(1, -2), P(1, 2), P(3, -1), P(3, 0), P(3, 1)];
    const back1 = P(-1, 0), back2 = P(-2, 0);
    const inside = ([x, y]) => x > 0 && y > 0 && x < C.W - 1 && y < C.H - 1;
    const bad = ([x, y], pad = 1) => { const i = C.idx(x, y); return C.locked[i] || C.protect[i] || C.reserved[i] || C.vistaMask[i] || C.tplMask[i] || frmNearFixed(C, x, y, pad); };
    const anyVistaNear = ([x, y]) => { for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (xx >= 0 && yy >= 0 && xx < C.W && yy < C.H && (C.vistaMask[C.idx(xx, yy)] || C.waterMask[C.idx(xx, yy)] || C.bridgeMask[C.idx(xx, yy)])) return true; return false; };
    if (!inside([vx, vy]) || bad([vx, vy], 2) || !inside(back2) || bad(back2) || bad(back1)) continue;
    if (!basin.every(c => frmWaterOk(C, ...c) && !bad(c) && !anyVistaNear(c))) continue;
    if (!removeLat.every(c => !inside(c) || !bad(c))) continue;
    if (!walls.every(c => !inside(c) || (!C.waterMask[C.idx(...c)] && !C.bridgeMask[C.idx(...c)] && !C.vistaMask[C.idx(...c)] && !C.tplMask[C.idx(...c)] && !frmNearFixed(C, ...c, 0)))) continue;
    for (const [x, y] of basin) { const i = C.idx(x, y); C.set(x, y, "~"); C.waterMask[i] = 1; C.locked[i] = 1; C.gateMask[i] = 1; }
    for (const c of removeLat) if (inside(c)) { const i = C.idx(...c); C.set(c[0], c[1], "#"); C.removed[i] = 1; C.locked[i] = 1; }
    for (const c of walls) if (inside(c)) { C.set(c[0], c[1], "#"); C.locked[C.idx(...c)] = 1; }
    C.set(back1[0], back1[1], "."); C.locked[C.idx(...back1)] = 1;
    const vi = C.idx(vx, vy); C.reserved[vi] = 3; C.protect[vi] = 1; C.protect[C.idx(...back2)] = 1; C.gateMask[vi] = 2;
    C.forced.push([[vx, vy], back2]);
    C.watergates.push({ gate, view: [vx, vy], facing: dn, basin, walls: walls.filter(inside).concat(removeLat.filter(inside)) });
    return true;
  }
  return false;
}

function frmGenNarrow(C) {
  const { W, H, rng, rule } = C, R = rule.cache;
  const lat = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && (x & 1) && (y & 1);
  frmStampFixed(C);
  for (const r of C.rects) for (const [x, y] of (r.ports || [])) { C.set(x, y, "."); C.locked[C.idx(x, y)] = 1; C.portMask[C.idx(x, y)] = 1; }
  // 格子のマスは床にしておく（固定エリアの中は写したまま）
  for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) if (!C.locked[C.idx(x, y)]) C.set(x, y, ".");
  // --- 水路と橋（必須） ---
  if (!frmPlaceCut(C)) return false;
  const uf = new Int32Array(W * H).map((_, i) => i);
  const find = i => { while (uf[i] !== i) { uf[i] = uf[uf[i]]; i = uf[i]; } return i; };
  const union = (a, b) => { a = find(a); b = find(b); if (a === b) return false; uf[a] = b; return true; };
  const cellOk = (x, y) => { const i = C.idx(x, y); return lat(x, y) && !C.tplMask[i] && !C.waterMask[i] && !C.bridgeMask[i] && !C.removed[i]; };
  // --- 仕掛けの小部屋（5F）：C(外の通路)→門h→A→i(B)。立て札gはCの横の壁 ---
  if (R) {
    let tplOk = false;
    for (let t = 0; t < 120 && !tplOk; t++) {
      const ax = 1 + 2 * rng.int(0, (frmLastLat(W) - 1) / 2), ay = 1 + 2 * rng.int(0, (frmLastLat(H) - 1) / 2);
      const [dx, dy] = rng.pick(FRM_DIRS), bx = ax + 2 * dx, by = ay + 2 * dy, cx = ax - 2 * dx, cy = ay - 2 * dy;
      const free = (x, y) => !C.locked[C.idx(x, y)] && !C.protect[C.idx(x, y)];
      if (![[ax, ay], [bx, by], [cx, cy]].every(([x, y]) => lat(x, y) && !frmNearFixed(C, x, y, 1) && free(x, y))) continue;
      if (!free(ax - dx, ay - dy) || !free(ax + dx, ay + dy)) continue;
      const side = rng() < 0.5 ? 1 : -1, px = dy * side, py = dx * side;
      const gx = cx + px, gy = cy + py;
      if (!lat(cx + 2 * px, cy + 2 * py) || !free(gx, gy)) continue;
      const exits = FRM_DIRS.filter(([ex, ey]) => !(ex === dx && ey === dy) && !(ex === px && ey === py) && lat(cx + 2 * ex, cy + 2 * ey) && free(cx + ex, cy + ey) && free(cx + 2 * ex, cy + 2 * ey));
      if (!exits.length) continue;
      if ([[ax, ay], [bx, by]].some(([x, y]) => FRM_DIRS.some(([ex, ey]) => C.bridgeMask[C.idx(x + ex, y + ey)] || C.waterMask[C.idx(x + ex, y + ey)]))) continue;
      for (const [x, y] of [[ax, ay], [bx, by]]) {
        for (const [ex, ey] of FRM_DIRS) { const tx = x + ex, ty = y + ey; C.set(tx, ty, "#"); C.locked[C.idx(tx, ty)] = 1; C.tplMask[C.idx(tx, ty)] = 1; }
        C.locked[C.idx(x, y)] = 1; C.tplMask[C.idx(x, y)] = 1;
      }
      C.set(ax, ay, "."); C.set(bx, by, R.cache);
      C.set(ax + dx, ay + dy, ".");
      C.set(ax - dx, ay - dy, R.door);
      C.set(gx, gy, R.plaque); C.locked[C.idx(gx, gy)] = 1; C.tplMask[C.idx(gx, gy)] = 1;
      C.reserved[C.idx(cx, cy)] = 1; C.protect[C.idx(cx, cy)] = 1;
      C.cacheTpl = { ax, ay, bx, by, cx, cy, door: [ax - dx, ay - dy], plaque: [gx, gy] };
      tplOk = true;
    }
    if (!tplOk) return false;
  }
  // --- 行商人・見張り番の部屋（6F テンプレート）。下の段は左右に抜ける通路、入口は中央の下 ---
  if (rule.npcRoom) {
    const tpl = rule.npcRoom, tw = tpl[0].length, th = tpl.length;
    let room = null;
    for (let t = 0; t < 120 && !room; t++) {
      const x0 = 2 * rng.int(1, Math.floor((frmLastLat(W) - tw) / 2)), y0 = 1 + 2 * rng.int(0, Math.floor((frmLastLat(H) - 4 - 1) / 2));
      if (x0 + tw > frmLastLat(W) + 1 || y0 + th + 1 > frmLastLat(H)) continue;
      let ok = true;
      for (let y = y0 - 1; y <= y0 + th + 1 && ok; y++) for (let x = x0 - 1; x <= x0 + tw && ok; x++) { if (C.border(x, y)) continue; const i = C.idx(x, y); if (C.locked[i] || C.protect[i] || C.reserved[i] || frmNearFixed(C, x, y, 1)) ok = false; }
      const links = [[x0 - 1, y0 + 2], [x0 + tw, y0 + 2], [x0 + (tw >> 1), y0 + th + 1]];
      if (!ok || !links.every(([x, y]) => cellOk(x, y) && !C.locked[C.idx(x, y)])) continue;
      room = { x0, y0, x1: x0 + tw - 1, y1: y0 + th - 1, door: [x0 + (tw >> 1), y0 + th], links };
    }
    if (!room) return false;
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const i = C.idx(room.x0 + x, room.y0 + y); C.set(room.x0 + x, room.y0 + y, tpl[y][x]); C.locked[i] = 1; C.tplMask[i] = 1; }
    const [dx0, dy0] = room.door; C.set(dx0, dy0, "."); C.locked[C.idx(dx0, dy0)] = 1; C.tplMask[C.idx(dx0, dy0)] = 1;
    for (const l of room.links) { C.protect[C.idx(...l)] = 1; C.forced.push([l, room.links[0]]); }
    C.npcRoom = room;
  }
  // --- 見せ場の広間（1つ目は水辺＝花の群生地） ---
  const vistaN = rng.int(...(rule.vistas || [1, 1]));
  for (let v = 0; v < vistaN; v++) if (!frmPlaceVista(C, v === 0 || rng() < 0.5) && v === 0) return false;
  // --- 水門の展示区画 ---
  for (let k = 0; k < (rule.watergates || 0); k++) if (!frmPlaceWatergate(C)) return false;
  // --- 固定エリアの入口（ports）以外から固定エリアへ直接つながる格子は岩にする ---
  for (const r of C.rects) {
    for (const [px, py] of (r.ports || [])) {
      if (lat(px, py)) C.forced.push([[px, py], [r.x0, r.y0]]);
      for (const [dx, dy] of FRM_DIRS) { const nx = px + dx, ny = py + dy; if (lat(nx, ny) && !frmInRect(r, nx, ny) && cellOk(nx, ny)) { C.protect[C.idx(nx, ny)] = 1; C.forced.push([[nx, ny], [px, py]]); } }
    }
  }
  for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) {
    const i = C.idx(x, y); if (!cellOk(x, y) || C.fixedMask[i] || C.protect[i] || C.portMask[i]) continue;
    if (FRM_DIRS.some(([dx, dy]) => { const j = C.idx(x + dx, y + dy); return C.fixedMask[j] && frmPass(C.g[y + dy][x + dx], true, null); })) { C.set(x, y, "#"); C.removed[i] = 1; }
  }
  // --- 6F：格子の一部を岩にして洞窟らしく（道はさらにうねる） ---
  if (rule.rock) for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) {
    const i = C.idx(x, y); if (!cellOk(x, y) || C.locked[i] || C.protect[i] || C.reserved[i] || C.vistaMask[i]) continue;
    if (rng() < rule.rock) { C.set(x, y, "#"); C.removed[i] = 1; }
  }
  // --- つながりの初期化：固定エリアの中・広間・強制のつながり ---
  C.rects.forEach((r) => {
    const seen = new Set();
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
      if (!frmPass(C.g[y][x], true, null) || seen.has(C.idx(x, y))) continue;
      const root = C.idx(x, y), q = [[x, y]]; seen.add(root);
      while (q.length) { const [cx, cy] = q.pop(); for (const [dx, dy] of FRM_DIRS) { const nx = cx + dx, ny = cy + dy, ni = C.idx(nx, ny); if (!frmInRect(r, nx, ny) || seen.has(ni) || !frmPass(C.g[ny][nx], true, null)) continue; seen.add(ni); q.push([nx, ny]); union(ni, root); } }
    }
  });
  for (const v of C.vistas) for (const [x, y] of v.cells) union(C.idx(x, y), C.idx(v.cells[0][0], v.cells[0][1]));
  for (const [p, q] of C.forced) union(C.idx(p[0], p[1]), C.idx(q[0], q[1]));
  // --- 迷路（Kruskal）：全域木 ---
  const edges = [];
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
  // --- ループ（行き止まりばかりにしない。道幅は1マスのまま） ---
  const loops = rng.int(...(rule.loops || [5, 8]));
  for (const e of rng.shuffle(closed).slice(0, loops)) { const ex = (e[0] + e[2]) >> 1, ey = (e[1] + e[3]) >> 1; C.set(ex, ey, "."); }
  // --- 行き止まり：置き物の分を確保し、空の行き止まりを2〜4個残して、残りは壁を抜いてつなぐ ---
  const isMazeCell = (x, y) => { const i = C.idx(x, y); return cellOk(x, y) && !C.fixedMask[i] && !C.roomMask[i] && !C.reserved[i] && !C.portMask[i]; };
  const openEdges = (x, y) => FRM_DIRS.filter(([dx, dy]) => { const c = C.at(x + dx, y + dy); return c !== "#" && c !== "~"; });
  const startDist = frmBfs(C, C.start, c => frmPass(c, true, R && R.door));
  let dead = [];
  for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) if (isMazeCell(x, y) && openEdges(x, y).length === 1 && startDist[C.idx(x, y)] >= 0) dead.push({ x, y, d: startDist[C.idx(x, y)], r: rng() });
  dead.sort((p, q) => (q.d + q.r * 8) - (p.d + p.r * 8));
  const nChest = (C.src.chests || []).length || frmCount(C.orig, "T");
  const nGather = Math.max(rule.minGathers || 0, frmCount(C.orig, "G"));
  const items = [];
  for (let i = 0; i < nChest; i++) items.push("T");
  for (let i = 0; i < nGather; i++) items.push("G");
  for (const e of (rule.events || [])) items.push(e);
  for (let i = 0; i < (rule.signs || 0); i++) items.push("?");
  const assigned = [];
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
      return cellOk(nx, ny) && C.g[ey][ex] === "#" && !C.locked[C.idx(ex, ey)] && !C.reserved[C.idx(nx, ny)];
    }));
    if (opts.length) C.set(d.x + opts[0][0], d.y + opts[0][1], ".");
  }
  // --- 届かない床（岩で切り離された格子）は埋める。広間・固定・仕掛けが届かなければやり直し ---
  {
    const dist = frmBfs(C, C.start, c => frmPass(c, true, R && R.door));
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = C.idx(x, y); if (!frmPass(C.g[y][x], true, R && R.door) || dist[i] >= 0) continue;
      if (C.locked[i] || C.vistaMask[i] || C.protect[i] || C.reserved[i]) return false;
      C.set(x, y, "#"); C.removed[i] = 1;
    }
  }
  // --- 置き物：行き止まりに宝箱・採取・サブイベント・看板（足りなければ広間の隅） ---
  const placeIn = (ch, cands) => { for (const [x, y] of cands) if (frmTryPlaceSolid(C, x, y, ch, R && R.door)) return true; return false; };
  const nearWater = (x, y) => { for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (C.at(xx, yy) === "~") return true; return false; };
  const roomEdge = (minWalls) => {
    const out = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = C.idx(x, y); if (!C.roomMask[i] || C.meadowMask[i] || C.g[y][x] !== "." || frmWallCountOrth(C, x, y) < minWalls || frmNearLetter(C, x, y, 1) || nearWater(x, y)) continue;
      if (FRM_DIRS.some(([dx, dy]) => { const c = C.at(x + dx, y + dy); return c !== "#" && c !== "~" && !C.roomMask[C.idx(x + dx, y + dy)]; })) continue;
      out.push([x, y]);
    }
    return rng.shuffle(out);
  };
  for (const a of assigned) C.set(a.x, a.y, a.it);
  for (let i = assigned.length; i < items.length; i++) if (!placeIn(items[i], roomEdge(2).concat(roomEdge(1)))) return false;
  // 導きの灯（5F）：広間の壁ぎわ（入口・水辺・群生地は避ける）。無理なら空の行き止まり
  for (let s = 0; s < (rule.saves || 0); s++) {
    if (!placeIn("S", roomEdge(1))) {
      const any = []; for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) if (isMazeCell(x, y) && C.reserved[C.idx(x, y)] !== 1 && C.g[y][x] === "." && openEdges(x, y).length === 1) any.push([x, y]);
      if (!placeIn("S", rng.shuffle(any))) return false;
    }
  }
  // --- 合図石（5F）：西は西半分、東は東半分の壁（広間の壁を優先） ---
  const mid = Math.floor(W / 2);
  if (rule.west && !frmPlaceOnWall(C, rule.west, x => x < mid)) return false;
  if (rule.east && !frmPlaceOnWall(C, rule.east, x => x > mid)) return false;
  // --- 水たまり「*」（通れる浅い水）：通路に1〜3マス。危険な水面とは2マス以上離す ---
  const puddleN = rng.int(...(rule.puddles || [1, 2]));
  for (let p = 0; p < puddleN; p++) {
    const okCell = (x, y) => { const i = C.idx(x, y); if (C.g[y][x] !== "." || C.locked[i] || C.reserved[i] || C.roomMask[i] || C.fixedMask[i] || C.tplMask[i] || C.portMask[i] || C.protect[i] || frmNearLetter(C, x, y, 1)) return false; for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) if (C.at(xx, yy) === "~" || C.at(xx, yy) === "*") return false; return true; };
    const cands = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (okCell(x, y)) cands.push([x, y]);
    if (!cands.length) break;
    const [sx, sy] = rng.pick(cands), blob = [[sx, sy]], want = rng.int(1, 3);
    for (const [dx, dy] of rng.shuffle(FRM_DIRS.slice())) { if (blob.length >= want) break; const nx = sx + dx, ny = sy + dy; if (C.g[ny] && C.g[ny][nx] === "." && okCell(nx, ny)) blob.push([nx, ny]); }
    for (const [x, y] of blob) C.set(x, y, "*");
  }
  // --- 通路の脇の水路（危険な水面）：壁の列を2〜3マス水にする。片側はまっすぐな通路 ---
  const sideN = rng.int(...(rule.sideWater || [1, 2]));
  for (let s = 0, tries = 0; s < sideN && tries < 200; tries++) {
    const horiz = rng() < 0.5, L = rng.int(2, 3);
    const r = 2 * rng.int(1, Math.floor(((horiz ? H : W) - 3) / 2)), a0 = rng.int(2, (horiz ? W : H) - 3 - L + 1);
    const cells = []; for (let a = a0; a < a0 + L; a++) cells.push(horiz ? [a, r] : [r, a]);
    if (!cells.every(([x, y]) => frmWaterOk(C, x, y) && C.g[y][x] === "#" && !C.locked[C.idx(x, y)] && !frmNearFixed(C, x, y, 1))) continue;
    const sideCells = sgn => cells.map(([x, y]) => horiz ? [x, y + sgn] : [x + sgn, y]);
    const walkable = ([x, y]) => frmPass(C.at(x, y), false, null) && !C.bridgeMask[C.idx(x, y)] && !C.tplMask[C.idx(x, y)];
    if (![-1, 1].some(sgn => sideCells(sgn).every(walkable))) continue;
    let clash = false;
    for (const [x, y] of cells) for (let yy = y - 2; yy <= y + 2 && !clash; yy++) for (let xx = x - 2; xx <= x + 2; xx++) { const c = C.at(xx, yy); if (c === "~" || c === "*" || (c !== "#" && !frmPass(c, true, R && R.door))) { clash = true; break; } }
    if (clash) continue;
    for (const [x, y] of cells) { C.set(x, y, "~"); C.waterMask[C.idx(x, y)] = 1; C.sideWater.push([x, y]); }
    s++;
  }
  return true;
}

/* ------------------------------------------------------------
   見た目の班へ渡す情報（群生地・背景スロット・階段の向き）
   ------------------------------------------------------------ */
// 階段の向き。flight＝段が続く向き（上り階段は上へ、下り階段は下へ伸びる方向。壁側＝背中側／奥）、face＝階段から通路へ向く向き（到着時に向く方向）
function frmStairInfo(map, tx, ty) {
  const H = map.length, W = map[0].length, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? "#" : map[y][x];
  const walk = c => frmPass(c, false, null);
  const run = (d, wantWalk) => { const [dx, dy] = FRM_NAME_VEC[d]; let n = 0; for (let x = tx + dx, y = ty + dy; n < 12 && walk(at(x, y)) === wantWalk; x += dx, y += dy) n++; return n; };
  const open = ["up", "down", "left", "right"].filter(d => walk(at(tx + FRM_NAME_VEC[d][0], ty + FRM_NAME_VEC[d][1])));
  let best = null;
  for (const d of ["up", "down", "left", "right"]) {
    const wallDist = run(d, true), face = FRM_OPPOSITE[d], ahead = run(face, true);
    if (!open.includes(face) && open.length) continue;
    const score = wallDist * 10 - ahead + (open.includes(d) ? 0 : -50);
    if (!best || score < best.score) best = { flight: d, face, score };
  }
  return { tx, ty, flight: best ? best.flight : "up", face: best ? best.face : "down", open };
}
function fieldRandomMazeStairInfo(a) {
  const map = a.floor ? a.floor.map : a.map, out = {};
  map.forEach((row, y) => [...row].forEach((c, x) => { if (c === "<" && !out.up) out.up = frmStairInfo(map, x, y); if (c === ">" && !out.down) out.down = frmStairInfo(map, x, y); }));
  return out;
}
function frmFeatures(C) {
  const { W, H, rng } = C, map = C.g.map(r => r.join(""));
  const walk = (x, y) => frmPass(C.at(x, y), true, C.rule.cache && C.rule.cache.door);
  // 群生地：1つ目の広間の、水辺から2マス以内の床（足りなければ広間全体）
  const v0 = C.vistas[0];
  let meadow = [];
  if (v0) {
    meadow = v0.cells.filter(([x, y]) => C.g[y][x] === "." || C.g[y][x] === "*").filter(([x, y]) => v0.pool.some(([px, py]) => Math.max(Math.abs(px - x), Math.abs(py - y)) <= 2));
    if (meadow.length < 6) meadow = v0.cells.filter(([x, y]) => C.g[y][x] === "." || C.g[y][x] === "*");
  }
  // 背景スロット：外周の壁（角を除く3マス）に正面から向き合う床。奥へまっすぐ見通せるほど良い
  const slots = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!walk(x, y) || C.fixedMask[C.idx(x, y)] || C.tplMask[C.idx(x, y)] || C.gateMask[C.idx(x, y)]) continue;   // 固定エリア（手置きの装飾）・仕掛け部屋・水門は除く
    for (const d of ["up", "down", "left", "right"]) {
      // 見る床から外周までの壁の厚み 1〜2（6F の右・下は外周の内側にもう1列の壁がある）
      const [dx, dy] = FRM_NAME_VEC[d], thick = [];
      let wx = x + dx, wy = y + dy;
      while (thick.length < 3 && wx >= 0 && wy >= 0 && wx < W && wy < H && C.at(wx, wy) === "#") { thick.push([wx, wy]); if (C.border(wx, wy)) break; wx += dx; wy += dy; }
      if (!thick.length || thick.length > 2 || !C.border(...thick[thick.length - 1])) continue;
      [wx, wy] = thick[thick.length - 1];
      const span = [[wx - Math.abs(dy), wy - Math.abs(dx)], [wx, wy], [wx + Math.abs(dy), wy + Math.abs(dx)]];
      if (!span.every(([sx, sy]) => (dy ? sx >= 1 && sx <= W - 2 : sy >= 1 && sy <= H - 2) && C.at(sx, sy) === "#")) continue;
      if (thick.length === 2 && ![-1, 1].every(k => C.at(thick[0][0] + k * Math.abs(dy), thick[0][1] + k * Math.abs(dx)) === "#")) continue;
      const sight = []; for (let sx = x, sy = y; walk(sx, sy) && sight.length < 12; sx -= dx, sy -= dy) sight.push([sx, sy]);
      const vista = C.vistaMask[C.idx(x, y)] ? 1 : 0;
      slots.push({ wall: [wx, wy], dir: d, view: [x, y], far: sight[sight.length - 1], sight, span, depth: thick.length, walls: thick, vista: !!vista, score: sight.length + vista * 4 - (thick.length - 1) + rng() * 0.5 });
    }
  }
  slots.sort((p, q) => q.score - p.score);
  const backdrops = [];
  for (const s of slots) {
    if (backdrops.length >= 2) break;
    if (backdrops.length && (s.sight.length < 3 || backdrops.some(b => b.dir === s.dir && Math.abs(b.wall[0] - s.wall[0]) + Math.abs(b.wall[1] - s.wall[1]) < 8))) continue;
    delete s.score; backdrops.push(s);
  }
  const stairs = {};
  map.forEach((row, y) => [...row].forEach((c, x) => { if (c === "<" && !stairs.up) stairs.up = frmStairInfo(map, x, y); if (c === ">" && !stairs.down) stairs.down = frmStairInfo(map, x, y); }));
  const water = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (C.g[y][x] === "~") water.push([x, y]);
  const puddles = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (C.g[y][x] === "*") puddles.push([x, y]);
  const xs = meadow.map(p => p[0]), ys = meadow.map(p => p[1]);
  return {
    version: 4,
    waterHazard: water, puddles,
    bridges: C.bridges.map(b => ({ cells: b.cells, ends: b.ends, dir: b.dir, channel: b.channel, water: b.water })),
    sideWater: C.sideWater.slice(),
    vistas: C.vistas.map(v => ({ x0: v.x0, y0: v.y0, x1: v.x1, y1: v.y1, cells: v.cells, pool: v.pool })),
    meadow: meadow.length ? { cells: meadow, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), vista: 0, nearWater: !!(v0 && v0.pool.length) } : null,
    backdropSlots: backdrops,
    watergates: C.watergates.map(g => ({ gate: g.gate, view: g.view, facing: g.facing, basin: g.basin, walls: g.walls })),
    stairs
  };
}

/* ------------------------------------------------------------
   各マスの役割（3D 用）
   tileRoles[y][x]：基本の役割1つ（従来の値＋ water-hazard／bridge）
   tileTags[y][x]：重ねる役割の配列（water-hazard／bridge／puddle／vista／meadow／backdrop-slot／backdrop-view／
                   setpiece-watergate／watergate-gate／watergate-view／waterside）
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
      else if (C.bridgeMask[i]) role = "bridge";
      else if (c === "~") role = "water-hazard";
      else if (c === "#") {
        const opens = FRM_DIRS.filter(([dx, dy]) => pass(x + dx, y + dy));
        const walls = FRM_DIRS.filter(([dx, dy]) => C.at(x + dx, y + dy) === "#");
        role = !C.border(x, y) && opens.length === 1 && walls.length === 3 && C.at(x + opens[0][0], y + opens[0][1]) !== "*" && !C.gateMask[C.idx(x + opens[0][0], y + opens[0][1])] ? "shrine-candidate" : "wall";
      } else if (frmIsLetter(c) && objDefs[c] && objDefs[c].onWall) role = "wall";
      else if (c === "*") role = "water";
      else {
        const walls = FRM_DIRS.filter(([dx, dy]) => !pass(x + dx, y + dy)).length;
        const shore = FRM_DIRS.some(([dx, dy]) => C.at(x + dx, y + dy) === "*");
        if (C.gateMask[i] === 2) role = "corridor";          // 水門を見る床（行き止まりだが滝・祭壇は置かない）
        else if (walls >= 3) role = "deadend";
        else if (shore) role = "shore";
        else if (C.roomMask[i]) role = "room";
        else if (c === ",") role = "road";
        else role = "corridor";
      }
      row.push(role);
    }
    out.push(row);
  }
  return out;
}
function frmTags(C, feat) {
  const { W, H } = C, tags = Array.from({ length: H }, () => Array.from({ length: W }, () => []));
  const add = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H && !tags[y][x].includes(t)) tags[y][x].push(t); };
  for (const [x, y] of feat.waterHazard) add(x, y, "water-hazard");
  for (const b of feat.bridges) for (const [x, y] of b.cells) add(x, y, "bridge");
  for (const [x, y] of feat.puddles) add(x, y, "puddle");
  for (const v of feat.vistas) for (let y = v.y0; y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++) add(x, y, "vista");
  if (feat.meadow) for (const [x, y] of feat.meadow.cells) add(x, y, "meadow");
  for (const s of feat.backdropSlots) { for (const [x, y] of s.span.concat(s.walls || [])) add(x, y, "backdrop-slot"); for (const [x, y] of s.sight) add(x, y, "backdrop-view"); }
  for (const g of feat.watergates) {
    for (const [x, y] of g.basin.concat([g.view], g.walls)) add(x, y, "setpiece-watergate");
    add(g.gate[0], g.gate[1], "watergate-gate"); add(g.view[0], g.view[1], "watergate-view");
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (frmPass(C.g[y][x], true, null) && FRM_DIRS.some(([dx, dy]) => C.at(x + dx, y + dy) === "~")) add(x, y, "waterside");
  return tags;
}

/* ------------------------------------------------------------
   検証（生成とは独立に、出来上がったマップと features だけを見る）
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
  const goals = find(rule.goal);
  if (goals.length !== 1) errs.push("goal-count");
  else if (!reach(closedD, goals[0][0], goals[0][1])) errs.push("goal-unreachable");
  if (find("<").length !== 1) errs.push("up-count");
  const expectCount = (ch, n) => { if (find(ch).length !== n) errs.push(`count-${ch}`); };
  expectCount("T", (src.chests || []).length || frmCount(src.map, "T"));
  expectCount("G", Math.max(rule.minGathers || 0, frmCount(src.map, "G")));
  expectCount("S", frmCount(src.map, "S"));
  expectCount("?", frmCount(src.map, "?"));
  for (const ch of "abcdefghijklmnopqrstuvwxyz") expectCount(ch, frmCount(src.map, ch));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = map[y][x];
    if (!(c === "T" || c === "G" || c === "S" || c === "?" || frmIsLetter(c))) continue;
    if (rule.cache && c === rule.cache.cache) {
      if (adjReach(closedD, x, y)) errs.push("cache-without-door");
      if (!adjReach(openD, x, y)) errs.push("cache-unreachable");
    } else if (!adjReach(closedD, x, y)) errs.push(`unreachable-${c}@${x},${y}`);
  }
  if (rule.west) { const [p] = find(rule.west); if (!p || p[0] >= Math.floor(W / 2)) errs.push("west-stone-side"); }
  if (rule.east) { const [p] = find(rule.east); if (!p || p[0] <= Math.floor(W / 2)) errs.push("east-stone-side"); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (frmPass(map[y][x], true, door) && !reach(openD, x, y)) { errs.push(`isolated@${x},${y}`); y = H; break; }
  for (const r of rule.fixed) for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
    let c = src.map[y][x]; if (r.replace && r.replace[c]) c = r.replace[c];
    if (map[y][x] !== c) { errs.push(`fixed-changed@${x},${y}`); y = r.y1 + 1; break; }
  }
  // --- v4：危険な水面（~）は通れず、外周とその隣に無い ---
  for (const [x, y] of find("~")) { if (frmPass("~", true, door)) errs.push("water-passable"); if (x < 2 || y < 2 || x > W - 3 || y > H - 3) errs.push(`water-near-border@${x},${y}`); }
  const F = floor.features;
  if (!F) errs.push("no-features");
  else {
    // 橋：1つ以上。橋のマスは通れて、渡る向きの左右（水路の上下流）が水面。橋を全部ふさぐとゴールへ行けない
    if (!F.bridges || !F.bridges.length) errs.push("no-bridge");
    const bridgeSet = new Set();
    for (const b of F.bridges || []) for (const [x, y] of b.cells) {
      bridgeSet.add(y * W + x);
      if (!frmPass(map[y][x], false, door) || !reach(closedD, x, y)) errs.push("bridge-not-walkable");
      const side = b.dir === "x" ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
      if (!side.every(([dx, dy]) => C.at(x + dx, y + dy) === "~")) errs.push("bridge-not-over-water");
    }
    if (goals.length === 1 && bridgeSet.size) {
      const noBridge = frmBfs(C, C.start, (c, x, y) => frmPass(c, true, door) && !bridgeSet.has(y * W + x));
      if (reach(noBridge, goals[0][0], goals[0][1])) errs.push("bridge-bypassable");
    }
    // 道幅：3×3 の通れる床は、広間（vista・meadow）と固定エリア（周り1マスを含む）の中だけ
    const allowed = new Uint8Array(W * H);
    for (const v of F.vistas || []) for (let y = v.y0; y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++) allowed[y * W + x] = 1;
    if (F.meadow) for (const [x, y] of F.meadow.cells) allowed[y * W + x] = 1;
    for (const r of rule.fixed) for (let y = Math.max(0, r.y0 - 1); y <= Math.min(H - 1, r.y1 + 1); y++) for (let x = Math.max(0, r.x0 - 1); x <= Math.min(W - 1, r.x1 + 1); x++) allowed[y * W + x] = 1;
    for (let y = 1; y + 2 < H - 1 + 1; y++) for (let x = 1; x + 2 < W; x++) {
      let open = true, inside = true;
      for (let dy = 0; dy < 3 && open; dy++) for (let dx = 0; dx < 3; dx++) { if (!frmPass(C.at(x + dx, y + dy), true, door)) { open = false; break; } if (!allowed[(y + dy) * W + x + dx]) inside = false; }
      if (open && !inside) { errs.push(`wide-open@${x},${y}`); y = H; break; }
    }
    const vc = (F.vistas || []).length; if (vc < 1 || vc > 2) errs.push("vista-count");
    if (!F.meadow || F.meadow.cells.length < 4 || F.meadow.cells.some(([x, y]) => !frmPass(map[y][x], true, door))) errs.push("meadow");
    // 水門：水門のマスは水面。周り8マスに通れる床が無い。水門の水に接する通れる床は「見る床」だけ
    if ((F.watergates || []).length !== (rule.watergates || 0)) errs.push("watergate-count");
    for (const g of F.watergates || []) {
      const [gx, gy] = g.gate, [vx, vy] = g.view;
      if (map[gy][gx] !== "~") errs.push("watergate-not-water");
      for (let yy = gy - 1; yy <= gy + 1; yy++) for (let xx = gx - 1; xx <= gx + 1; xx++) if (frmPass(C.at(xx, yy), true, door)) errs.push("watergate-reachable-side");
      for (const [bx, by] of g.basin) {
        if (map[by][bx] !== "~") errs.push("watergate-basin");
        for (const [dx, dy] of FRM_DIRS) { const nx = bx + dx, ny = by + dy; if (frmPass(C.at(nx, ny), true, door) && !(nx === vx && ny === vy)) errs.push("watergate-extra-shore"); }
      }
      if (!frmPass(map[vy][vx], false, door) || !reach(closedD, vx, vy)) errs.push("watergate-view-unreachable");
    }
    // 背景スロット：1〜2か所。外周の壁で、見る床は到達可能で壁に接する
    const bs = F.backdropSlots || [];
    if (bs.length < 1 || bs.length > 2) errs.push("backdrop-count");
    for (const s of bs) {
      const [wx, wy] = s.wall, [vx, vy] = s.view, [dx, dy] = FRM_NAME_VEC[s.dir] || [0, 0];
      if (!(wx === 0 || wy === 0 || wx === W - 1 || wy === H - 1) || map[wy][wx] !== "#") errs.push("backdrop-not-border");
      const dep = s.depth || 1;
      if (vx + dx * dep !== wx || vy + dy * dep !== wy || !reach(openD, vx, vy)) errs.push("backdrop-view");
      for (let k = 1; k <= dep; k++) if (C.at(vx + dx * k, vy + dy * k) !== "#") errs.push("backdrop-wall");
    }
    if (!F.stairs || !F.stairs.up || (rule.goal === ">" && !F.stairs.down)) errs.push("stairs-info");
  }
  const startRect = rule.fixed.find(r => r.tag === "start");
  const foes = floor.foes || [], fBridge = new Set();
  for (const b of (floor.features && floor.features.bridges) || []) for (const [x, y] of b.cells) fBridge.add(y * W + x);
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
      if (route.some(i => fBridge.has(i))) errs.push("foe-route-on-bridge");
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
    try { ok = frmGenNarrow(C); } catch (e) { ok = false; if (typeof console !== "undefined") console.warn("[random-maze] 生成エラー", floorKey, attempt, e); }
    if (!ok) continue;
    const foes = frmPlaceFoes(C); if (!foes) continue;
    const features = frmFeatures(C);
    const floor = { ...src, map: C.g.map(r => r.join("")), foes, random: true, features };
    const errs = fieldRandomMazeValidate(floorKey, floor);
    if (errs.length) continue;
    return { floorKey, expedition, attempt, seed, tag: `e${expedition}s${seed.toString(36)}`, floor, roles: frmRoles(C), tags: frmTags(C, features),
      meta: { rooms: C.vistas.map(v => ({ x0: v.x0, y0: v.y0, x1: v.x1, y1: v.y1 })), cacheRoom: C.cacheTpl || null, npcRoom: C.npcRoom || null,
        fixed: rule.fixed.map(r => ({ tag: r.tag, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 })), features, stairs: features.stairs } };
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
  a.tileTags = rnd.tags;              // v4：重ねる役割（water-hazard／bridge／puddle／vista／meadow／backdrop-slot／setpiece-watergate など）
  a.b2Features = rnd.meta.features;   // v4：橋・水面・広間・群生地・背景スロット・水門・階段の向き（a.random.meta.features と同じもの）
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
