"use strict";
/* ============================================================
   field.js — 迷宮探索（自由移動）・ランダムエンカウント・会話（ストーリー）
   ------------------------------------------------------------
   担当：Claude（処理）。見た目は css/06-field.css（GPT）と css/07-labyrinth.css（Claude仮）。
   仕様：docs/field-and-story/FIELD_SPEC.md、docs/field-and-story/LABYRINTH_SPEC.md
   データ：data/field-maps.js（階層・フロア・雑魚敵・FOE）、data/story.js（会話）
   世界樹の迷宮を参考にしたしくみ：
     ・1エリア＝1階層（3フロア）。階段で上下し、最終フロアの奥にボス。
     ・視界は半径 FIELD_VISION マス（壁の向こうは見えない）。見た場所は自動でマッピングされ、
       ミニマップ／全体マップで確認できる。マップはセーブされる。
     ・エンカウントの危険度をHUDの色で表示（青→緑→黄→橙→赤）。
     ・FOE：マップ上に見えている強敵。プレイヤーが動いたときだけ動き、見つかると追ってくる。
     ・採取ポイント：素材を拾える（1回の探索で2回まで。ホームに戻ると復活）。
   script.js からは「// [FIELD]」の目印を付けた短いフックでこのファイルの関数を呼ぶ。
   ============================================================ */

const FIELD_TILE = 32;
const FIELD_HIT = { halfW: 9, top: 7, bottom: 5 };
const FIELD_VISION = 3.6;              // 視界の半径（マス）
const FIELD_FOE_SIGHT = 4.5;           // FOEがプレイヤーに気づく距離（マス）
const FIELD_GATHER_USES = 2;
const FIELD_SOLID = new Set(["#", "~", "S", "T", "?", "G"]);
const FIELD_SAFE = new Set(["_", "P", "E", "B", "<", ">"]);
const FIELD_TILE_CLASS = { "#":"tile-wall", ".":"tile-floor", ",":"tile-path", "*":"tile-grass", "~":"tile-water", "_":"tile-safe", "P":"tile-safe", "E":"tile-exit", "B":"tile-gate", "S":"tile-safe", "T":"tile-floor", "?":"tile-floor", "G":"tile-floor", "<":"tile-stairs-up", ">":"tile-stairs-down" };
const FIELD_DIRS = { up:{dx:0,dy:-1}, down:{dx:0,dy:1}, left:{dx:-1,dy:0}, right:{dx:1,dy:0} };
const FIELD_ENCOUNTER_DELAY = 900;
const FIELD_ENCOUNTER_INTERVAL_MULTIPLIER = 1.5;
const FIELD_MATERIAL_FALLBACK = { slime_jelly: "スライムゼリー" };

let fieldState = {
  area: 1, floor: 0, x: 0, y: 0, dir: "down", moving: false, step: 0,
  steps: 0, nextEncounter: 20, walked: 0,
  flags: {}, checkpoint: null, enemyEncounters: {},
  explored: {},            // "area-floor" → Uint8Array（1=マッピング済み）
  visible: new Set(),      // 今見えているマス "x,y"
  foes: [], foeDefeated: {}, gatherUsed: {}, foeGraceUntil: 0,
  lock: false, built: "", triggerTile: "", nearKey: "", positioned: false, mapOpen: false, lastTileKey: ""
};
const fieldInput = { keys: new Set(), pad: new Set(), pendingDir: null };
let fieldMoveAnimUntil = 0;
let fieldRaf = null, fieldLastTs = 0, fieldFrame = 0, fieldMiniDirty = true, fieldMiniTimer = 0;
let fieldDialogAdvance = null, fieldDialogTyping = null, fieldChoiceState = null;
const fieldAreaCache = {};

function fieldEmit(name, detail) {
  try { document.dispatchEvent(new CustomEvent("field:" + name, { detail: { ...detail } })); }
  catch (e) { console.warn("[field] イベント通知に失敗:", name, e); }
}

/* ------------------------------------------------------------
   階層・フロア
   ------------------------------------------------------------ */
function fieldFloorCount(n) { return FIELD_AREAS[n]?.floors?.length || 1; }
function fieldFloorNumber(n, f) { let total = 0; for (let i = 1; i < n; i++) total += fieldFloorCount(i); return total + f + 1; }
function fieldFloorLabel(n = fieldState.area, f = fieldState.floor) { return `${fieldFloorNumber(n, f)}F`; }
function fieldStratumLabel(n = fieldState.area) { return `第${n}階層`; }
function fieldFloorKey(n = fieldState.area, f = fieldState.floor) { return `${n}-${f}`; }
function fieldArea(n = fieldState.area, f = fieldState.floor) {
  n = Number(n) || 1; f = Math.max(0, Math.min(fieldFloorCount(n) - 1, Number(f) || 0));
  const key = `${n}-${f}`;
  if (fieldAreaCache[key]) return fieldAreaCache[key];
  const def = FIELD_AREAS[n]; if (!def) return null;
  const floor = def.floors[f];
  const grid = floor.map.map(row => row.split(""));
  const h = grid.length, w = Math.max(...grid.map(r => r.length));
  const objects = []; let start = { tx: 1, ty: 1 }, up = null, down = null, chestIndex = 0;
  grid.forEach((row, ty) => row.forEach((c, tx) => {
    if (c === "P") start = { tx, ty };
    if (c === "<") { up = { tx, ty }; objects.push({ key: `up:${key}`, kind: "stairs", dir: "up", tx, ty, sprite: "stairs-up", name: "上り階段", walk: true }); }
    else if (c === ">") { down = { tx, ty }; objects.push({ key: `down:${key}`, kind: "stairs", dir: "down", tx, ty, sprite: "stairs-down", name: "下り階段", walk: true }); }
    else if (c === "S") objects.push({ key: `save:${key}:${tx}:${ty}`, kind: "save", tx, ty, sprite: "save-lamp", name: "導きの灯" });
    else if (c === "T") { const reward = (floor.chests || [])[chestIndex++] || { gold: 10 }; objects.push({ key: `chest:${key}:${tx}:${ty}`, kind: "chest", tx, ty, sprite: "chest", name: "宝箱", reward }); }
    else if (c === "G") objects.push({ key: `gather:${key}:${tx}:${ty}`, kind: "gather", tx, ty, sprite: "gather", name: "採取ポイント" });
    else if (c === "?") objects.push({ key: `sign:${key}:${tx}:${ty}`, kind: "sign", tx, ty, sprite: "sign", name: "看板", scene: def.signScene });
    else if (c === "B") objects.push({ key: `gate:${n}`, kind: "gate", tx, ty, sprite: "boss-gate", name: "", walk: true });
    else if (c === "E") objects.push({ key: `exit:${n}`, kind: "exit", tx, ty, sprite: "exit", name: "", walk: true });
    else if (/[a-z]/.test(c) && def.objects && def.objects[c]) { const o = def.objects[c]; objects.push({ key: `npc:${n}:${o.id}`, kind: o.kind || "npc", tx, ty, sprite: o.sprite, name: o.name, scene: o.scene, id: o.id }); }
  }));
  // P が無いフロアは、出口（1F）または上り階段の上から始める
  if (!grid.some(r => r.includes("P"))) { const exit = objects.find(o => o.kind === "exit"); if (exit) start = { tx: exit.tx, ty: exit.ty }; else if (up) start = { ...up }; }
  return (fieldAreaCache[key] = { n, f, key, def, floor, grid, w, h, start, up, down, objects });
}
function fieldTileAt(a, tx, ty) { return (a.grid[ty] && a.grid[ty][tx]) || "#"; }
function fieldIsSolidChar(c) { return FIELD_SOLID.has(c) || /[a-z]/.test(c); }
function fieldSolidAt(a, px, py) { return fieldIsSolidChar(fieldTileAt(a, Math.floor(px / FIELD_TILE), Math.floor(py / FIELD_TILE))); }
function fieldBoxBlocked(a, x, y) {
  const l = x - FIELD_HIT.halfW, r = x + FIELD_HIT.halfW - .01, t = y - FIELD_HIT.top, b = y + FIELD_HIT.bottom - .01;
  return fieldSolidAt(a, l, t) || fieldSolidAt(a, r, t) || fieldSolidAt(a, l, b) || fieldSolidAt(a, r, b);
}
function fieldTileCenter(tx, ty) { return { x: tx * FIELD_TILE + FIELD_TILE / 2, y: ty * FIELD_TILE + FIELD_TILE / 2 + 4 }; }
function fieldPlayerTile() { return { tx: Math.floor(fieldState.x / FIELD_TILE), ty: Math.floor(fieldState.y / FIELD_TILE) }; }

/* ------------------------------------------------------------
   視界・マッピング
   ------------------------------------------------------------ */
function fieldExplored(a = fieldArea()) {
  if (!fieldState.explored[a.key] || fieldState.explored[a.key].length !== a.w * a.h) fieldState.explored[a.key] = new Uint8Array(a.w * a.h);
  return fieldState.explored[a.key];
}
function fieldOpaque(a, tx, ty) { const c = fieldTileAt(a, tx, ty); return c === "#"; }
// 2マス間の見通し（間に壁があれば見えない。終点の壁そのものは見える）
function fieldLos(a, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, x = x0, y = y0;
  while (!(x === x1 && y === y1)) {
    if ((x !== x0 || y !== y0) && fieldOpaque(a, x, y)) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return true;
}
function fieldUpdateVision(force = false) {
  const a = fieldArea(), { tx, ty } = fieldPlayerTile(), key = `${a.key}:${tx},${ty}`;
  if (!force && key === fieldState.lastTileKey) return;
  fieldState.lastTileKey = key;
  const exp = fieldExplored(a), vis = new Set(), r = Math.ceil(FIELD_VISION);
  const newly = [];
  for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) {
    if (x < 0 || y < 0 || x >= a.w || y >= a.h) continue;
    if (Math.hypot(x - tx, y - ty) > FIELD_VISION) continue;
    if (!fieldLos(a, tx, ty, x, y)) continue;
    vis.add(`${x},${y}`);
    const i = y * a.w + x; if (!exp[i]) { exp[i] = 1; newly.push(i); }
  }
  fieldState.visible = vis;
  const tiles = $("field-map")?.querySelector(".field-tiles")?.children;
  if (tiles) for (const i of newly) tiles[i]?.classList.remove("is-unexplored");
  if (newly.length) {
    document.querySelectorAll("#field-map .field-object.is-unexplored").forEach(el => {
      const ox = Number(el.dataset.tx), oy = Number(el.dataset.ty);
      if (exp[oy * a.w + ox]) el.classList.remove("is-unexplored");
    });
  }
  fieldMiniDirty = true;
}
function fieldExploredRate(a = fieldArea()) {
  const exp = fieldExplored(a); let open = 0, seen = 0;
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (!fieldOpaque(a, x, y)) { open++; if (exp[y * a.w + x]) seen++; }
  return open ? Math.round(seen / open * 100) : 0;
}

/* ------------------------------------------------------------
   描画（DOM）
   ------------------------------------------------------------ */
function fieldEnsureExtraDom() {
  const vp = $("field-viewport"), hud = document.querySelector("#field .field-hud"); if (!vp || !hud) return;
  if (!$("field-floor-label")) {
    const lab = document.createElement("span"); lab.id = "field-floor-label"; lab.className = "field-floor-label";
    $("field-area-name")?.after(lab);
    const danger = document.createElement("span"); danger.id = "field-danger"; danger.className = "field-danger"; danger.dataset.level = "0"; danger.title = "エンカウントの危険度"; danger.setAttribute("aria-label", "エンカウントの危険度");
    lab.after(danger);
    const mapBtn = document.createElement("button"); mapBtn.id = "field-map-button"; mapBtn.className = "field-map-button"; mapBtn.type = "button"; mapBtn.textContent = "MAP";
    $("field-home-button")?.before(mapBtn);
    mapBtn.addEventListener("click", () => fieldToggleFullMap());
  }
  if (!$("field-minimap")) {
    const mini = document.createElement("canvas"); mini.id = "field-minimap"; mini.className = "field-minimap"; mini.setAttribute("aria-label", "ミニマップ（タップで全体マップ）");
    const mapRail = document.querySelector("#field .field-map-rail");
    (mapRail || vp).appendChild(mini); mini.addEventListener("click", () => fieldToggleFullMap());
    const fog = document.createElement("div"); fog.id = "field-fog"; fog.className = "field-fog"; fog.setAttribute("aria-hidden", "true");
    vp.insertBefore(fog, vp.children[1] || null);
    const full = document.createElement("div"); full.id = "field-fullmap"; full.className = "field-fullmap"; full.hidden = true; full.setAttribute("role", "dialog"); full.setAttribute("aria-label", "全体マップ");
    full.innerHTML = `<div class="field-fullmap-head"><strong id="field-fullmap-title"></strong><span id="field-fullmap-rate"></span><button type="button" id="field-fullmap-close">閉じる</button></div><canvas id="field-fullmap-canvas"></canvas><div class="field-fullmap-legend"><span><i class="lg-player"></i>現在地</span><span><i class="lg-stairs"></i>階段</span><span><i class="lg-lamp"></i>導きの灯</span><span><i class="lg-chest"></i>宝箱</span><span><i class="lg-gather"></i>採取</span><span><i class="lg-foe"></i>FOE</span><span><i class="lg-gate"></i>ボス</span></div>`;
    vp.appendChild(full);
    $("field-fullmap-close").addEventListener("click", () => fieldToggleFullMap(false));
  }
}
function fieldBuildDom() {
  const a = fieldArea(), screen = $("field"), map = $("field-map"); if (!a || !screen || !map) return;
  fieldEnsureExtraDom();
  screen.dataset.area = String(a.n); screen.dataset.floor = String(a.f);
  screen.dataset.theme = a.def.theme || "forest";
  $("field-area-name").textContent = `${fieldStratumLabel(a.n)} ${a.def.name}`;
  $("field-floor-label").textContent = fieldFloorLabel(a.n, a.f);
  map.style.width = a.w * FIELD_TILE + "px"; map.style.height = a.h * FIELD_TILE + "px";
  map.style.setProperty("--tile", FIELD_TILE + "px");
  const exp = fieldExplored(a), tiles = [];
  for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
    const c = fieldTileAt(a, tx, ty);
    const edge = c === "#" && !fieldIsSolidChar(fieldTileAt(a, tx, ty + 1)) ? " is-edge" : "";
    const fog = exp[ty * a.w + tx] ? "" : " is-unexplored";
    tiles.push(`<i class="field-tile ${FIELD_TILE_CLASS[c] || "tile-floor"}${edge}${fog}" style="left:${tx * FIELD_TILE}px;top:${ty * FIELD_TILE}px"></i>`);
  }
  const objs = a.objects.map(o => {
    const opened = (o.kind === "chest" && fieldState.flags[o.key]) || (o.kind === "gather" && (fieldState.gatherUsed[o.key] || 0) >= FIELD_GATHER_USES) ? " is-opened" : "";
    const fog = exp[o.ty * a.w + o.tx] ? "" : " is-unexplored";
    return `<div class="field-object${opened}${fog}" data-kind="${esc(o.kind)}" data-object-id="${esc(o.id || o.key)}" data-key="${esc(o.key)}" data-sprite="${esc(o.sprite || "")}" data-tx="${o.tx}" data-ty="${o.ty}" style="left:${o.tx * FIELD_TILE}px;top:${o.ty * FIELD_TILE}px"><span class="field-object-sprite"></span>${o.name ? `<b class="field-object-label">${esc(o.name)}</b>` : ""}</div>`;
  }).join("");
  map.innerHTML = `<div class="field-tiles">${tiles.join("")}</div>${objs}<div id="field-foes" class="field-foes"></div><div id="field-player" class="field-player" data-dir="down" data-moving="false" data-step="0"><span class="field-player-shadow"></span><span class="field-player-sprite"></span></div>`;
  fieldState.built = a.key; fieldState.nearKey = ""; fieldState.lastTileKey = "";
  fieldSpawnFoes();
  fieldMiniDirty = true;
}
function fieldViewScale() {
  const vp = $("field-viewport"); if (!vp) return 1;
  return Math.max(1, Math.min(2, Math.floor((vp.clientWidth / (12 * FIELD_TILE)) * 4) / 4));
}
function fieldRender() {
  const a = fieldArea(), vp = $("field-viewport"), map = $("field-map"), p = $("field-player");
  if (!a || !vp || !map || !p) return;
  p.style.left = (fieldState.x - 16) + "px";
  p.style.top = (fieldState.y - 34) + "px";
  p.style.zIndex = String(10 + Math.floor(fieldState.y));
  p.dataset.dir = fieldState.dir; p.dataset.moving = String(fieldState.moving); p.dataset.step = String(fieldState.step);
  const s = fieldViewScale(), vw = vp.clientWidth, vh = vp.clientHeight, mw = a.w * FIELD_TILE * s, mh = a.h * FIELD_TILE * s;
  const tx = mw <= vw ? (vw - mw) / 2 : -Math.max(0, Math.min(mw - vw, fieldState.x * s - vw / 2));
  const ty = mh <= vh ? (vh - mh) / 2 : -Math.max(0, Math.min(mh - vh, (fieldState.y - 12) * s - vh / 2));
  map.style.transform = `translate(${Math.round(tx)}px,${Math.round(ty)}px) scale(${s})`;
  // 視界：主人公を中心に、外側ほど暗くする
  const fog = $("field-fog");
  if (fog) {
    const cx = Math.round(tx + fieldState.x * s), cy = Math.round(ty + (fieldState.y - 10) * s), r = FIELD_VISION * FIELD_TILE * s;
    fog.style.background = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${Math.round(r * .55)}px, rgba(0,0,0,.5) ${Math.round(r * .95)}px, rgba(0,0,0,.66) ${Math.round(r * 1.25)}px)`;
  }
  fieldRenderFoes();
  const now = performance.now();
  if (fieldMiniDirty || now - fieldMiniTimer > 250) { fieldMiniTimer = now; fieldMiniDirty = false; fieldDrawMinimap(); if (fieldState.mapOpen) fieldDrawFullMap(); }
}

/* ------------------------------------------------------------
   ミニマップ・全体マップ
   ------------------------------------------------------------ */
const FIELD_MAP_COLORS = { wall: "#3a4160", floor: "#a9b8d6", path: "#c9b98f", grass: "#8fbf7d", water: "#3d78c4", lava: "#e0612a", safe: "#d9e6b8", gate: "#ff5a5a", exit: "#ffffff" };
function fieldMapColor(a, c) {
  if (c === "#") return FIELD_MAP_COLORS.wall;
  if (c === "~") return a.def.theme === "lava" ? FIELD_MAP_COLORS.lava : FIELD_MAP_COLORS.water;
  if (c === ",") return FIELD_MAP_COLORS.path;
  if (c === "*") return FIELD_MAP_COLORS.grass;
  if (c === "B") return FIELD_MAP_COLORS.gate;
  if ("_PE<>S".includes(c)) return FIELD_MAP_COLORS.safe;
  return FIELD_MAP_COLORS.floor;
}
function fieldDrawMap(canvas, cell, full) {
  const a = fieldArea(); if (!canvas || !a) return;
  const W = a.w * cell, H = a.h * cell, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== W * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px"; }
  const g = canvas.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const exp = fieldExplored(a);
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
    if (!exp[y * a.w + x]) continue;
    g.fillStyle = fieldMapColor(a, fieldTileAt(a, x, y)); g.fillRect(x * cell, y * cell, cell, cell);
    if (full && fieldTileAt(a, x, y) !== "#") { g.strokeStyle = "rgba(0,0,0,.12)"; g.strokeRect(x * cell + .5, y * cell + .5, cell - 1, cell - 1); }
  }
  const dot = (x, y, color, size = .62, shape = "circle") => {
    g.fillStyle = color; const cx = (x + .5) * cell, cy = (y + .5) * cell, r = cell * size / 2;
    if (shape === "square") g.fillRect(cx - r, cy - r, r * 2, r * 2); else { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); }
  };
  for (const o of a.objects) {
    if (!exp[o.ty * a.w + o.tx]) continue;
    if (o.kind === "stairs") { dot(o.tx, o.ty, "#ffd84a", .8, "square"); if (full) { g.fillStyle = "#222"; g.font = `bold ${Math.floor(cell * .7)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(o.dir === "up" ? "▲" : "▼", (o.tx + .5) * cell, (o.ty + .55) * cell); } }
    else if (o.kind === "save") dot(o.tx, o.ty, "#ffe27a", .8);
    else if (o.kind === "chest") dot(o.tx, o.ty, fieldState.flags[o.key] ? "#7a6a55" : "#ff9a3c", .7, "square");
    else if (o.kind === "gather") dot(o.tx, o.ty, (fieldState.gatherUsed[o.key] || 0) >= FIELD_GATHER_USES ? "#5d7a5d" : "#3ee07a", .7);
    else if (o.kind === "npc") dot(o.tx, o.ty, "#c7a3ff", .7);
    else if (o.kind === "gate") dot(o.tx, o.ty, "#ff3030", .9);
  }
  for (const foe of fieldState.foes) {
    if (foe.defeated) continue;
    const fx = Math.floor(foe.x / FIELD_TILE), fy = Math.floor(foe.y / FIELD_TILE);
    if (exp[fy * a.w + fx]) dot(fx, fy, foe.mode === "chase" ? "#ff2d2d" : "#ff8a1c", .9);
  }
  const { tx, ty } = fieldPlayerTile();
  g.save(); g.translate((fieldState.x / FIELD_TILE) * cell, (fieldState.y / FIELD_TILE) * cell);
  g.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[fieldState.dir] || 0);
  g.fillStyle = "#fff"; g.strokeStyle = "#000"; g.lineWidth = Math.max(1, cell / 8);
  g.beginPath(); g.moveTo(0, -cell * .55); g.lineTo(cell * .42, cell * .4); g.lineTo(-cell * .42, cell * .4); g.closePath(); g.stroke(); g.fill(); g.restore();
  void tx; void ty;
}
function fieldDrawMinimap() { fieldDrawMap($("field-minimap"), 4, false); }
function fieldDrawFullMap() {
  const a = fieldArea(), vp = $("field-viewport"); if (!a || !vp) return;
  const cell = Math.max(6, Math.floor(Math.min((vp.clientWidth - 24) / a.w, (vp.clientHeight - 92) / a.h)));
  fieldDrawMap($("field-fullmap-canvas"), cell, true);
  $("field-fullmap-title").textContent = `${fieldStratumLabel(a.n)} ${a.def.name}　${fieldFloorLabel(a.n, a.f)}`;
  $("field-fullmap-rate").textContent = `踏破率 ${fieldExploredRate(a)}%`;
}
function fieldToggleFullMap(force) {
  const full = $("field-fullmap"); if (!full) return;
  const open = typeof force === "boolean" ? force : full.hidden;
  if (open && (fieldState.lock && !fieldState.mapOpen)) return;
  full.hidden = !open; fieldState.mapOpen = open;
  fieldInput.keys.clear(); fieldInput.pad.clear();
  if (open) fieldDrawFullMap();
  if (typeof sound === "function") sound(open ? "select" : "back");
}

/* ------------------------------------------------------------
   入力
   ------------------------------------------------------------ */
function fieldIsActive() { return state.screen === "field"; }
function fieldModalOpen() {
  return [...document.querySelectorAll(".game-dialog, #story-event, #tutorial-overlay")].some(el => !el.hidden) || !$("list-menu")?.hidden;
}
function fieldRequestStep(dir) {
  if (!fieldIsActive() || fieldState.lock || fieldState.mapOpen || fieldModalOpen() || fieldDialogAdvance || fieldChoiceState) return;
  if (FIELD_DIRS[dir]) fieldInput.pendingDir = dir;
}
function fieldSetupInput() {
  const keyName = e => e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const directionKeys = { ArrowUp:"up", w:"up", ArrowDown:"down", s:"down", ArrowLeft:"left", a:"left", ArrowRight:"right", d:"right" };
  document.addEventListener("keydown", e => {
    if (!fieldIsActive() || fieldModalOpen()) return;
    const k = keyName(e);
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(k)) e.preventDefault();
    if (fieldChoiceState) { fieldChoiceKey(k); return; }
    if (k === "m" && !e.repeat) { if (!fieldDialogAdvance) fieldToggleFullMap(); return; }
    if (fieldState.mapOpen) { if (["x", "Escape", "z", "Enter"].includes(k)) fieldToggleFullMap(false); return; }
    if (["z", "Enter", " "].includes(k)) { if (!e.repeat) fieldActionPressed(); return; }
    if (["x", "Escape"].includes(k)) { if (fieldDialogAdvance) fieldActionPressed(); return; }
    if (!e.repeat && directionKeys[k]) fieldRequestStep(directionKeys[k]);
  });
  window.addEventListener("blur", () => { fieldInput.keys.clear(); fieldInput.pad.clear(); fieldInput.pendingDir = null; });
  document.querySelectorAll("#field-pad [data-dir]").forEach(btn => {
    const dir = btn.dataset.dir;
    const on = e => { e.preventDefault(); fieldRequestStep(dir); btn.classList.add("is-pressed"); try { btn.setPointerCapture(e.pointerId); } catch (_) {} };
    const off = () => { btn.classList.remove("is-pressed"); };
    btn.addEventListener("pointerdown", on);
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(t => btn.addEventListener(t, off));
    btn.addEventListener("contextmenu", e => e.preventDefault());
  });
  $("field-action")?.addEventListener("pointerdown", e => { e.preventDefault(); if (fieldState.mapOpen) { fieldToggleFullMap(false); return; } fieldActionPressed(); });
  $("field-dialog")?.addEventListener("click", e => { if (!e.target.closest("[data-choice]")) fieldActionPressed(); });
  $("field-home-button")?.addEventListener("click", () => { if (!fieldState.lock) fieldAskReturnHome(); });
  fieldSetupRetreatChoice();
}
function fieldActionPressed() {
  if (fieldChoiceState) { fieldChoiceKey("z"); return; }
  if (fieldDialogTyping) { fieldDialogTyping(); return; }
  if (fieldDialogAdvance) { const r = fieldDialogAdvance; fieldDialogAdvance = null; r(); return; }
  if (fieldState.lock || fieldState.mapOpen) return;
  const o = fieldFacingObject(); if (o) fieldInteract(o);
}

/* ------------------------------------------------------------
   メインループ
   ------------------------------------------------------------ */
function fieldStartLoop() {
  if (fieldRaf) return;
  fieldLastTs = 0;
  const loop = ts => {
    if (!fieldIsActive()) { fieldRaf = null; fieldState.moving = false; return; }
    const dt = fieldLastTs ? Math.min(.05, (ts - fieldLastTs) / 1000) : 0; fieldLastTs = ts;
    try { fieldUpdate(dt); fieldRender(); } catch (e) { console.error("[field] 更新エラー:", e); }
    fieldRaf = requestAnimationFrame(loop);
  };
  fieldRaf = requestAnimationFrame(loop);
}
function fieldUpdate() {
  const a = fieldArea(); if (!a) return;
  const blocked = fieldState.lock || fieldState.mapOpen || fieldModalOpen() || !!fieldDialogAdvance || !!fieldChoiceState;
  const dir = blocked ? null : fieldInput.pendingDir;
  fieldInput.pendingDir = null;
  let moved = 0;
  if (dir && FIELD_DIRS[dir]) {
    const d = FIELD_DIRS[dir];
    fieldState.dir = dir;
    const current = fieldPlayerTile();
    const origin = fieldTileCenter(current.tx, current.ty);
    fieldState.x = origin.x; fieldState.y = origin.y;
    const tx = current.tx + d.dx, ty = current.ty + d.dy;
    const tile = fieldTileAt(a, tx, ty);
    const next = fieldTileCenter(tx, ty);
    // 1入力=1マス。移動先のマスと当たり判定を先に確認し、壁際での押し込み・滑りを防ぐ。
    if (!fieldIsSolidChar(tile) && !fieldBoxBlocked(a, next.x, next.y)) {
      fieldState.x = next.x; fieldState.y = next.y;
      moved = FIELD_TILE;
      fieldFrame++;
      fieldState.step = fieldFrame % 2 ? 1 : 3;
      fieldMoveAnimUntil = performance.now() + 140;
      // FOEもプレイヤーの1歩に対して最大1マスだけ行動する。
      fieldUpdateFoes();
      fieldAfterMove(a, moved);
    } else {
      fieldState.step = 0;
    }
  }
  fieldState.moving = performance.now() < fieldMoveAnimUntil;
  if (!fieldState.moving && moved === 0) fieldState.step = 0;
  fieldUpdateVision();
  if (!blocked) fieldCheckFoeContact();
  fieldUpdateNear();
  fieldUpdateDanger();
}
function fieldAfterMove(a, moved) {
  const { tx, ty } = fieldPlayerTile(), c = fieldTileAt(a, tx, ty);
  const key = `${tx},${ty}`;
  if (key !== fieldState.triggerTile) {
    fieldState.triggerTile = key;
    if (c === "B") { fieldOnGate(); return; }
    if (c === "E") { fieldAskReturnHome(); return; }
    if (c === ">") { fieldOnStairs("down"); return; }
    if (c === "<") { fieldOnStairs("up"); return; }
  }
  if (FIELD_SAFE.has(c)) return;
  fieldState.walked += moved * (c === "*" ? 1.5 : 1);
  while (fieldState.walked >= FIELD_TILE) {
    fieldState.walked -= FIELD_TILE;
    fieldState.steps++;
    fieldEmit("step", { area: fieldState.area, floor: fieldState.floor, tileX: tx, tileY: ty, steps: fieldState.steps });
    if (fieldState.steps >= fieldState.nextEncounter && !fieldState.lock) { fieldTriggerEncounter(); break; }
  }
}
function fieldUpdateDanger() {
  const el = $("field-danger"); if (!el) return;
  const r = fieldState.nextEncounter ? fieldState.steps / fieldState.nextEncounter : 0;
  const lv = r < .35 ? 0 : r < .6 ? 1 : r < .8 ? 2 : r < .92 ? 3 : 4;
  if (el.dataset.level !== String(lv)) { el.dataset.level = String(lv); el.title = ["安全", "注意", "警戒", "危険", "非常に危険"][lv]; }
}
function fieldFacingObject() {
  const a = fieldArea(); if (!a) return null;
  const d = FIELD_DIRS[fieldState.dir] || FIELD_DIRS.down;
  const fx = fieldState.x + d.dx * 20, fy = fieldState.y - 2 + d.dy * 20;
  const tx = Math.floor(fx / FIELD_TILE), ty = Math.floor(fy / FIELD_TILE);
  return a.objects.find(o => !o.walk && o.tx === tx && o.ty === ty) || null;
}
function fieldUpdateNear() {
  const o = fieldState.lock ? null : fieldFacingObject(), key = o ? o.key : "";
  if (key === fieldState.nearKey) return;
  fieldState.nearKey = key;
  document.querySelectorAll("#field-map .field-object.is-near").forEach(el => el.classList.remove("is-near"));
  if (key) document.querySelector(`#field-map .field-object[data-key="${CSS.escape(key)}"]`)?.classList.add("is-near");
  $("field-action")?.classList.toggle("is-ready", !!key);
}

/* ------------------------------------------------------------
   FOE
   ------------------------------------------------------------ */
function fieldFoeWalkable(a, tx, ty) { const c = fieldTileAt(a, tx, ty); return !fieldIsSolidChar(c) && !FIELD_SAFE.has(c); }
function fieldSpawnFoes() {
  const a = fieldArea(), host = $("field-foes");
  fieldState.foes = (a.floor.foes || []).map((def, i) => {
    const key = `foe:${a.key}:${i}`, p0 = def.path[0], c = fieldTileCenter(p0[0], p0[1]);
    return { key, def, enemy: FIELD_ENEMIES[def.enemy], x: c.x, y: c.y, sx: c.x, sy: c.y, mode: "patrol", pathIdx: 1, lostAt: 0, next: null, defeated: !!fieldState.foeDefeated[key] };
  });
  if (host) host.innerHTML = fieldState.foes.map(f => `<div class="field-object field-foe" data-kind="foe" data-key="${esc(f.key)}" data-sprite="foe-${esc(f.enemy?.sprite || "monster")}"${f.defeated ? " hidden" : ""}><span class="field-object-sprite"></span><b class="field-object-label">FOE ${esc(f.enemy?.name || "")}</b></div>`).join("");
}
// a→b の最短経路の最初の一歩（マス）
function fieldBfsStep(a, from, to) {
  if (from.tx === to.tx && from.ty === to.ty) return null;
  const W = a.w, start = from.ty * W + from.tx, goal = to.ty * W + to.tx, prev = new Int32Array(a.w * a.h).fill(-1);
  prev[start] = start; const q = [start];
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi]; if (cur === goal) break;
    const x = cur % W, y = (cur - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, ni = ny * W + nx;
      if (nx < 0 || ny < 0 || nx >= a.w || ny >= a.h || prev[ni] !== -1) continue;
      if (ni !== goal && !fieldFoeWalkable(a, nx, ny)) continue;
      prev[ni] = cur; q.push(ni);
    }
  }
  if (prev[goal] === -1) return null;
  let cur = goal; while (prev[cur] !== start) cur = prev[cur];
  return { tx: cur % W, ty: Math.floor(cur / W) };
}
function fieldUpdateFoes() {
  const a = fieldArea(), pt = fieldPlayerTile(), now = performance.now();
  if (now < fieldState.foeGraceUntil) return;
  for (const f of fieldState.foes) {
    if (f.defeated) continue;
    const ft = { tx: Math.floor(f.x / FIELD_TILE), ty: Math.floor(f.y / FIELD_TILE) };
    const dist = Math.hypot(fieldState.x - f.x, fieldState.y - f.y) / FIELD_TILE;
    const sees = dist <= FIELD_FOE_SIGHT && fieldLos(a, ft.tx, ft.ty, pt.tx, pt.ty);
    if (sees) { if (f.mode !== "chase") fieldEmit("foe:notice", { key: f.key, enemyName: f.enemy?.name }); f.mode = "chase"; f.lostAt = 0; }
    else if (f.mode === "chase") { if (!f.lostAt) f.lostAt = now; if (now - f.lostAt > 2600) f.mode = "patrol"; }
    let target;
    if (f.mode === "chase" && fieldFoeWalkable(a, pt.tx, pt.ty)) target = pt;
    else {
      const wp = f.def.path[f.pathIdx]; target = { tx: wp[0], ty: wp[1] };
      if (ft.tx === target.tx && ft.ty === target.ty) { f.pathIdx = (f.pathIdx + 1) % f.def.path.length; const w2 = f.def.path[f.pathIdx]; target = { tx: w2[0], ty: w2[1] }; }
    }
    const step = fieldBfsStep(a, ft, target) || (f.mode === "chase" ? null : null);
    const goal = step ? fieldTileCenter(step.tx, step.ty) : (f.mode === "chase" && fieldFoeWalkable(a, pt.tx, pt.ty) ? { x: fieldState.x, y: fieldState.y } : fieldTileCenter(ft.tx, ft.ty));
    const vx = goal.x - f.x, vy = goal.y - f.y, len = Math.hypot(vx, vy);
    // 探索者の1歩に対してFOEも1マス単位で移動。途中位置での接触判定をなくす。
    if (len > .01) { f.x = goal.x; f.y = goal.y; }
  }
  fieldMiniDirty = true;
}
function fieldCheckFoeContact() {
  if (fieldState.lock || performance.now() < fieldState.foeGraceUntil) return;
  for (const f of fieldState.foes) {
    if (f.defeated) continue;
    if (Math.hypot(fieldState.x - f.x, fieldState.y - (f.y)) < 24) { fieldTriggerFoeBattle(f); return; }
  }
}
function fieldRenderFoes() {
  const a = fieldArea(), exp = fieldExplored(a);
  for (const f of fieldState.foes) {
    const el = document.querySelector(`#field-foes [data-key="${CSS.escape(f.key)}"]`); if (!el) continue;
    if (f.defeated) { el.hidden = true; continue; }
    const tx = Math.floor(f.x / FIELD_TILE), ty = Math.floor(f.y / FIELD_TILE);
    el.hidden = false;
    el.classList.toggle("is-unexplored", !exp[ty * a.w + tx]);
    el.classList.toggle("is-chasing", f.mode === "chase");
    el.style.left = (f.x - 16) + "px"; el.style.top = (f.y - 20) + "px"; el.style.zIndex = String(10 + Math.floor(f.y));
  }
}
function fieldResetFoesAfterBattle(defeatedKey) {
  for (const f of fieldState.foes) {
    if (f.key === defeatedKey) { f.defeated = true; fieldState.foeDefeated[f.key] = true; continue; }
    // 逃げた後は、FOEを巡回の起点へ戻し、少しの間動かさない
    if (Math.hypot(fieldState.x - f.x, fieldState.y - f.y) < FIELD_TILE * 3) { f.x = f.sx; f.y = f.sy; f.pathIdx = 1; }
    f.mode = "patrol"; f.lostAt = 0;
  }
  fieldState.foeGraceUntil = performance.now() + 2500;
}

/* ------------------------------------------------------------
   会話ウィンドウ
   ------------------------------------------------------------ */
function fieldSpeaker(who) {
  const c = typeof getCharacter === "function" ? getCharacter(who) : null;
  if (c) return { id: who, name: c.name, portrait: c.image || null };
  const s = (typeof STORY_SPEAKERS !== "undefined" && STORY_SPEAKERS[who]) || { name: "" };
  return { id: who, name: s.name || "", portrait: s.portrait || null };
}
function fieldSceneLines(sceneId) {
  const scene = typeof STORY_SCENES !== "undefined" ? STORY_SCENES[sceneId] : null;
  if (!scene) return null;
  const seen = !!fieldState.flags[sceneId];
  let lines = scene.lines || [];
  if (seen && scene.repeat) lines = scene.repeat;
  else if (seen && scene.once) return null;
  return lines.filter(l => !l.ifParty || state.party.includes(l.who));
}
function fieldDialogShow(on) {
  const dlg = $("field-dialog"); if (!dlg) return;
  dlg.hidden = !on; $("field")?.classList.toggle("is-dialog", on);
  if (!on) { dlg.querySelector(".field-dialog-choices").hidden = true; dlg.querySelector(".field-dialog-choices").innerHTML = ""; }
}
function fieldTypeLine(line) {
  const dlg = $("field-dialog"), sp = fieldSpeaker(line.who);
  const nameEl = dlg.querySelector(".field-dialog-name"), textEl = dlg.querySelector(".field-dialog-text"), img = dlg.querySelector(".field-dialog-portrait img"), next = dlg.querySelector(".field-dialog-next");
  nameEl.textContent = sp.name; nameEl.hidden = !sp.name;
  dlg.dataset.speaker = sp.id || "";
  dlg.classList.toggle("has-portrait", !!sp.portrait);
  if (sp.portrait) { img.src = sp.portrait; img.alt = sp.name; } else { img.removeAttribute("src"); img.alt = ""; }
  dlg.classList.toggle("is-narration", line.who === "narration" || line.who === "lamp");
  next.hidden = true; textEl.textContent = "";
  const text = String(line.text || "");
  return new Promise(resolve => {
    let i = 0;
    const timer = setInterval(() => { i = Math.min(text.length, i + 1); textEl.textContent = text.slice(0, i); if (i >= text.length) finish(); }, 26);
    const finish = () => { clearInterval(timer); textEl.textContent = text; fieldDialogTyping = null; next.hidden = false; resolve(); };
    fieldDialogTyping = finish;
  });
}
async function fieldPlayScene(sceneId) {
  const lines = fieldSceneLines(sceneId); if (!lines || !lines.length) return false;
  const wasLocked = fieldState.lock; fieldState.lock = true; fieldInput.keys.clear(); fieldInput.pad.clear();
  fieldDialogShow(true);
  fieldEmit("dialog:open", { sceneId });
  for (let i = 0; i < lines.length; i++) {
    const sp = fieldSpeaker(lines[i].who);
    fieldEmit("dialog:line", { sceneId, index: i, speakerId: lines[i].who, speakerName: sp.name, portrait: sp.portrait, text: lines[i].text });
    await fieldTypeLine(lines[i]);
    await new Promise(resolve => { fieldDialogAdvance = resolve; });
    if (typeof sound === "function") sound("move");
  }
  fieldDialogShow(false);
  fieldState.flags[sceneId] = true;
  const scene = STORY_SCENES[sceneId]; if (scene && scene.setFlag) fieldState.flags[scene.setFlag] = true;
  fieldEmit("dialog:close", { sceneId });
  fieldState.lock = wasLocked;
  return true;
}
function fieldAsk(text, options = ["はい", "いいえ"], who = "narration") {
  const wasLocked = fieldState.lock; fieldState.lock = true; fieldInput.keys.clear(); fieldInput.pad.clear();
  fieldDialogShow(true);
  return fieldTypeLine({ who, text }).then(() => new Promise(resolve => {
    const box = $("field-dialog").querySelector(".field-dialog-choices");
    $("field-dialog").querySelector(".field-dialog-next").hidden = true;
    box.innerHTML = options.map((o, i) => `<button type="button" data-choice="${i}">${esc(o)}</button>`).join("");
    box.hidden = false;
    const done = i => { fieldChoiceState = null; fieldDialogShow(false); fieldState.lock = wasLocked; if (typeof sound === "function") sound(i === options.length - 1 ? "back" : "select"); resolve(i); };
    fieldChoiceState = { index: 0, count: options.length, done };
    const paint = () => box.querySelectorAll("[data-choice]").forEach((b, i) => b.classList.toggle("is-selected", i === fieldChoiceState?.index));
    fieldChoiceState.paint = paint; paint();
    box.querySelectorAll("[data-choice]").forEach(b => b.addEventListener("click", ev => { ev.stopPropagation(); if (fieldChoiceState) done(Number(b.dataset.choice)); }));
  }));
}
function fieldChoiceKey(k) {
  const c = fieldChoiceState; if (!c) return;
  if (["ArrowLeft", "ArrowUp", "a", "w"].includes(k)) { c.index = (c.index + c.count - 1) % c.count; c.paint(); if (typeof sound === "function") sound("move"); }
  else if (["ArrowRight", "ArrowDown", "d", "s"].includes(k)) { c.index = (c.index + 1) % c.count; c.paint(); if (typeof sound === "function") sound("move"); }
  else if (["z", "Enter", " "].includes(k)) c.done(c.index);
  else if (["x", "Escape"].includes(k)) c.done(c.count - 1);
}
async function fieldSay(text, who = "narration") {
  const id = "__say";
  STORY_SCENES[id] = { lines: [{ who, text }] };
  fieldState.flags[id] = false;
  await fieldPlayScene(id);
  delete STORY_SCENES[id]; delete fieldState.flags[id];
}

/* ------------------------------------------------------------
   調べる・踏む
   ------------------------------------------------------------ */
async function fieldInteract(o) {
  if (fieldState.lock) return;
  if (o.kind === "npc" || o.kind === "sign") { await fieldPlayScene(o.scene); return; }
  if (o.kind === "save") { await fieldUseSavePoint(o); return; }
  if (o.kind === "chest") { await fieldOpenChest(o); return; }
  if (o.kind === "gather") { await fieldGather(o); return; }
}
function fieldFullHeal() { for (const c of getParty()) { c.hp = effectiveStats(c).maxHp; c.sp = c.maxSp; } }
async function fieldUseSavePoint() {
  fieldFullHeal();
  fieldState.checkpoint = { area: fieldState.area, floor: fieldState.floor, x: fieldState.x, y: fieldState.y };
  if (typeof playSe === "function") playSe("assets/se/syouri/アイテムを入手2", .6);
  fieldEmit("save", { area: fieldState.area, floor: fieldState.floor, x: fieldState.x, y: fieldState.y });
  fieldState.flags["save-point"] = false;
  await fieldPlayScene("save-point");
  persistAutoSave();
  const choice = await fieldAsk("冒険の記録を残しますか？", ["セーブする", "やめる"], "lamp");
  if (choice === 0 && typeof openSaveDialog === "function") openSaveDialog();
}
async function fieldOpenChest(o) {
  if (fieldState.flags[o.key]) { await fieldSay("宝箱は空っぽだ。"); return; }
  fieldState.flags[o.key] = true;
  document.querySelector(`#field-map .field-object[data-key="${CSS.escape(o.key)}"]`)?.classList.add("is-opened");
  const r = o.reward || {}; let text = "";
  if (r.gold) { state.gold += r.gold; renderGold(); text = `宝箱を開けた！ ${r.gold}Gを手に入れた。`; }
  else if (r.item) { const item = itemById(r.item); inventory[r.item] = (inventory[r.item] || 0) + (r.count || 1); text = `宝箱を開けた！ ${item ? item.name : r.item}×${r.count || 1}を手に入れた。`; }
  if (typeof playSe === "function") playSe("assets/se/syouri/アイテムを入手2", .7);
  fieldEmit("chest", { area: fieldState.area, floor: fieldState.floor, objectId: o.key, reward: { ...r } });
  fieldMiniDirty = true;
  persistAutoSave();
  await fieldSay(text);
}
async function fieldGather(o) {
  const used = fieldState.gatherUsed[o.key] || 0;
  if (used >= FIELD_GATHER_USES) { await fieldSay("もう何も採れそうにない。（ホームに戻ると、また採れるようになる）"); return; }
  const table = fieldArea().floor.gathers || [["slime_jelly", 1]];
  const total = table.reduce((n, t) => n + t[1], 0); let r = Math.random() * total, mat = table[0][0];
  for (const [id, w] of table) { r -= w; if (r <= 0) { mat = id; break; } }
  const count = Math.random() < .25 ? 2 : 1;
  materials[mat] = (materials[mat] || 0) + count;
  fieldState.gatherUsed[o.key] = used + 1;
  if (used + 1 >= FIELD_GATHER_USES) document.querySelector(`#field-map .field-object[data-key="${CSS.escape(o.key)}"]`)?.classList.add("is-opened");
  if (typeof playSe === "function") playSe("assets/se/syouri/アイテムを入手2", .6);
  fieldEmit("gather", { area: fieldState.area, floor: fieldState.floor, objectId: o.key, material: mat, count });
  fieldMiniDirty = true;
  persistAutoSave();
  await fieldSay(`採取ポイントだ！ ${(typeof materialNames !== "undefined" && materialNames[mat]) || FIELD_MATERIAL_FALLBACK[mat] || mat}×${count}を手に入れた。（残り${FIELD_GATHER_USES - used - 1}回）`);
}
async function fieldAskReturnHome() {
  if (fieldState.lock) return;
  const choice = await fieldAsk("迷宮を出て、ふもとの村（ホーム）へ戻りますか？", ["戻る", "やめる"]);
  if (choice !== 0) return;
  fieldLeaveToHome("ホームに戻りました。STARTから、行ったことのあるフロアへ出発できます。");
}
function fieldLeaveToHome(message) {
  fieldEmit("leave", { area: fieldState.area, floor: fieldState.floor, reason: "home" });
  fieldToggleFullMap(false);
  persistAutoSave();
  showScreen("home");
  if (message) setSystemMessage(message);
}
async function fieldOnStairs(dir) {
  if (fieldState.lock) return;
  const target = dir === "down" ? fieldState.floor + 1 : fieldState.floor - 1;
  if (target < 0 || target >= fieldFloorCount(fieldState.area)) return;
  const choice = await fieldAsk(`${fieldFloorLabel(fieldState.area, target)}へ${dir === "down" ? "降り" : "上り"}ますか？`, [dir === "down" ? "降りる" : "上る", "やめる"]);
  if (choice !== 0) return;
  if (typeof sound === "function") sound("select");
  fieldGoFloor(target, dir === "down" ? "up" : "down");
}
// 別のフロアへ。arriveAt：到着する階段（"up"=上り階段の上、"down"=下り階段の上、"start"=開始位置）
async function fieldGoFloor(f, arriveAt = "start") {
  fieldEmit("leave", { area: fieldState.area, floor: fieldState.floor, reason: "stairs" });
  fieldState.floor = f;
  const a = fieldArea();
  const spot = arriveAt === "up" ? a.up : arriveAt === "down" ? a.down : null;
  const p = spot ? fieldTileCenter(spot.tx, spot.ty) : fieldTileCenter(a.start.tx, a.start.ty);
  fieldState.x = p.x; fieldState.y = p.y; fieldState.positioned = true;
  fieldState.flags[`floor:${a.key}`] = true;
  fieldRollNextEncounter();
  fieldBuildDom();
  fieldShow();
  persistAutoSave();
}
async function fieldOnGate() {
  if (fieldState.lock) return;
  const a = fieldArea(), req = a.def.gateRequires;
  if (req && !fieldState.flags[req.flag]) { if (req.scene) await fieldPlayScene(req.scene); else await fieldSay("この先へは、まだ進めないようだ。"); return; }
  await fieldPlayScene(a.def.bossScene);
  const choice = await fieldAsk("この先には強大な魔物の気配がする。進みますか？", ["進む", "やめる"]);
  if (choice !== 0) return;
  fieldState.lock = true;
  fieldEmit("boss:gate", { area: fieldState.area, floor: fieldState.floor, stage: a.def.stage });
  fieldEmit("leave", { area: fieldState.area, floor: fieldState.floor, reason: "boss" });
  startBattle(a.def.stage);
  fieldState.lock = false;
}

/* ------------------------------------------------------------
   エンカウント・戦闘との接続
   ------------------------------------------------------------ */
function fieldRollNextEncounter() {
  const enc = fieldArea()?.floor.encounter || { min: 16, max: 28 };
  fieldState.steps = 0; fieldState.walked = 0;
  const minSteps = Math.max(1, Math.ceil(enc.min * FIELD_ENCOUNTER_INTERVAL_MULTIPLIER));
  const maxSteps = Math.max(minSteps, Math.ceil(enc.max * FIELD_ENCOUNTER_INTERVAL_MULTIPLIER));
  fieldState.nextEncounter = minSteps + Math.floor(Math.random() * (maxSteps - minSteps + 1));
}
function fieldPickEnemyId() {
  const table = fieldArea()?.floor.encounter?.table || [];
  const total = table.reduce((n, t) => n + (t.weight || 1), 0);
  let r = Math.random() * total;
  for (const t of table) { r -= (t.weight || 1); if (r <= 0) return t.enemy; }
  return table.length ? table[table.length - 1].enemy : null;
}
// script.js の beginStageCore() から呼ばれる（// [FIELD]）。scale はフロアの強さ倍率
function fieldCreateEnemy(id, scale) {
  const base = FIELD_ENEMIES[id] || FIELD_ENEMIES[Object.keys(FIELD_ENEMIES)[0]];
  const e = JSON.parse(JSON.stringify(base));
  const k = Number.isFinite(scale) ? scale : (Number(battleState.fieldEnemyScale) || 1);
  if (k !== 1 && !e.foe) for (const key of ["hp", "attack", "spAttack", "defense", "spDefense", "exp", "gold"]) if (Number.isFinite(e[key])) e[key] = Math.round(e[key] * k);
  return { ...e, fieldEnemyId: id, maxHp: e.hp, spDefense: Number.isFinite(e.spDefense) ? e.spDefense : Math.floor((e.defense || 0) / 2) };
}
async function fieldEncounterEffect(id, extra = {}) {
  fieldState.lock = true; fieldState.moving = false; fieldInput.keys.clear(); fieldInput.pad.clear();
  fieldToggleFullMap(false);
  const name = FIELD_ENEMIES[id]?.name || "";
  fieldEmit("encounter", { area: fieldState.area, floor: fieldState.floor, enemyId: id, enemyName: name, delay: FIELD_ENCOUNTER_DELAY, foe: !!extra.foe });
  const screen = $("field"), alert = $("field-player-alert"), flash = $("field-encounter-flash");
  screen?.classList.add("is-encounter"); screen?.classList.toggle("is-foe-encounter", !!extra.foe);
  if (alert) { const vp = $("field-viewport"), p = $("field-player"); if (vp && p) { const pr = p.getBoundingClientRect(), vr = vp.getBoundingClientRect(); alert.style.left = (pr.left - vr.left + pr.width / 2) + "px"; alert.style.top = (pr.top - vr.top - 6) + "px"; } alert.textContent = extra.foe ? "！！" : "！"; alert.hidden = false; }
  if (typeof sound === "function") sound("error", true);
  await new Promise(r => setTimeout(r, FIELD_ENCOUNTER_DELAY * .45));
  if (flash) flash.hidden = false;
  await new Promise(r => setTimeout(r, FIELD_ENCOUNTER_DELAY * .55));
  if (alert) alert.hidden = true; if (flash) flash.hidden = true;
  screen?.classList.remove("is-encounter", "is-foe-encounter");
  fieldEmit("leave", { area: fieldState.area, floor: fieldState.floor, reason: "encounter" });
}
async function fieldTriggerEncounter() {
  const id = fieldPickEnemyId(); if (!id) { fieldRollNextEncounter(); return; }
  await fieldEncounterEffect(id);
  fieldStartEncounterBattle(id);
}
async function fieldTriggerFoeBattle(f) {
  await fieldEncounterEffect(f.def.enemy, { foe: true });
  fieldStartEncounterBattle(f.def.enemy, { foeKey: f.key });
}
function fieldStartEncounterBattle(id, opts = {}) {
  const a = fieldArea();
  battleBgmSelections = {}; stageIntroStoryPending = false; maouIntroBgmPersistent = false;
  retryContext = null;
  battleState.tutorialMode = false; battleState.hiddenBossMode = false; battleState.maxStage = 5;
  resetTransientBattleState();
  battleState.encounterMode = true; battleState.fieldEnemyId = id;
  battleState.fieldEnemyScale = opts.foeKey ? 1 : (a?.floor.encounter?.scale || 1);
  battleState.fieldFoeKey = opts.foeKey || null;
  battleState.koCount = 0; battleState.rankResult = null;
  battleState.stage = a ? a.def.stage : 1;
  battleState.unionGauges = { kotama: 0, knight: 0, healer: 0, warrior: 0, mage: 0, samurai: 0 };
  for (const c of getParty()) { c.hp = Math.max(0, Math.min(effectiveStats(c).maxHp, Number(c.hp) || 0)); c.sp = Math.max(0, Math.min(c.maxSp, Number(c.sp) || 0)); }
  if (getParty().every(c => c.hp <= 0)) fieldFullHeal();
  beginStage();
}
// 雑魚戦・FOE戦の勝利（script.js の finishStage() から：// [FIELD]）
async function fieldFinishEncounter(e) {
  await playEnemyDefeatAnimation();
  battleState.lastRewardGold = e.gold || 0;
  registerDefeat(e.compendiumAs || e.name);
  totalEnemyDefeats += 1;
  state.gold += e.gold || 0;
  const turns = Math.max(1, battleState.turnCount + 1);
  awardVictoryAchievements(e, turns, battleState.koCount || 0);
  const drops = awardMaterials(e);
  const levelResult = typeof levelAwardBattleExp === "function" ? levelAwardBattleExp(e) : null;
  if (battleState.fieldFoeKey) fieldState.foeDefeated[battleState.fieldFoeKey] = true;
  await showItemDropAnimation(drops);
  persistAutoSave();
  renderGold();
  if ($("bgm-toggle")?.checked) startBgm();
  $("battle-commands").hidden = true; $("battle-commands").replaceChildren();
  $("battle-bottom")?.classList.add("result-shown");
  $("battle-support").hidden = true;
  $("battle-result").hidden = false;
  $("retry-stage-button").hidden = true; $("formation-retry-button").hidden = true;
  $("result-title").textContent = battleState.fieldFoeKey ? "FOE撃破！" : "VICTORY!";
  $("result-message").textContent = `${e.name}を倒した！ ${e.gold || 0}Gを獲得！\n${turns}ターン ／ 戦闘不能 ${battleState.koCount || 0}人` + (levelResult ? `\n${levelResult.text}` : "");
  $("next-stage-button").hidden = false; $("next-stage-button").textContent = "迷宮へ戻る";
  $("return-home-button").hidden = false;
  pushLog(`${e.name}を倒した！ ${e.gold || 0}G獲得。`);
}
// 雑魚戦・FOE戦の敗北（script.js の finishDefeat() から：// [FIELD]）
function fieldOnDefeat() {
  retryContext = null;
  fieldState.positioned = false;
  $("result-message").innerHTML = "仲間が全員倒れてしまった……。ホームで態勢を立て直そう。<br><strong class=\"defeat-preparation-warning\">STARTから、行ったことのあるフロアへ出発し直せます。</strong>";
  persistAutoSave();
}
// 勝利・「逃げる」の後に迷宮へ戻る
function fieldReturnFromBattle(opts = {}) {
  const foeKey = battleState.fieldFoeKey;
  const won = !opts.retreat && foeKey && fieldState.foeDefeated[foeKey];
  battleState.encounterMode = false; battleState.fieldEnemyId = null; battleState.fieldFoeKey = null;
  battleStartSnapshot = null;
  if (opts.retreat) setSystemMessage("戦闘から逃げ出した。");
  fieldResetFoesAfterBattle(won ? foeKey : null);
  fieldRollNextEncounter();
  fieldShow({ returning: true });
}
// 雑魚戦の撤退ダイアログに「ホームへ帰還」を加える（ステージ戦では従来どおり）
function fieldSetupRetreatChoice() {
  const btn = $("retreat-button"), dlg = $("retreat-dialog"); if (!btn || !dlg) return;
  const title = $("retreat-dialog-title"), text = dlg.querySelector("p"), yes = $("retreat-yes"), no = $("retreat-no");
  const original = { title: title?.innerHTML, text: text?.innerHTML, yes: yes?.textContent, no: no?.textContent };
  let home = $("retreat-home");
  if (!home && yes) { home = document.createElement("button"); home.id = "retreat-home"; home.type = "button"; home.className = "secondary-button"; home.textContent = "ホームへ帰還"; home.hidden = true; yes.after(home); }
  // script.js 側のクリック処理（ダイアログを開く）より後に整えるため、1拍おいてから書き換える
  btn.addEventListener("click", () => setTimeout(() => {
    const enc = !!battleState.encounterMode && !dlg.hidden;
    if (title) title.innerHTML = enc ? "どうしますか？" : original.title;
    if (text) text.innerHTML = enc ? "<strong>逃げる</strong>：迷宮に戻って探索を続けます。<br><strong>ホームへ帰還</strong>：迷宮を出てホームに戻ります。<br>どちらも今回の戦闘報酬は獲得できません。" : original.text;
    if (yes) yes.textContent = enc ? "逃げる" : original.yes;
    if (no) no.textContent = enc ? "戦う" : original.no;
    if (home) home.hidden = !enc;
  }, 0));
  home?.addEventListener("click", () => {
    if (!battleState.encounterMode) return;
    battleEmit("end", { result: "retreat" });
    dlg.hidden = true; battleStartSnapshot = null; battleState.busy = true;
    battleState.encounterMode = false; battleState.fieldEnemyId = null; battleState.fieldFoeKey = null;
    fieldState.positioned = false;
    fieldLeaveToHome("迷宮から撤退し、ホームに戻りました。");
  });
}

/* ------------------------------------------------------------
   画面の出入り・フロア選択
   ------------------------------------------------------------ */
function fieldShow({ returning = false } = {}) {
  const a = fieldArea();
  if (fieldState.built !== a.key || !$("field-map")?.children.length) fieldBuildDom();
  if (!fieldState.positioned) fieldPlaceAtStart();
  fieldState.lock = false; fieldState.mapOpen = false; if ($("field-fullmap")) $("field-fullmap").hidden = true;
  const pt = fieldPlayerTile(); fieldState.triggerTile = `${pt.tx},${pt.ty}`;
  fieldInput.keys.clear(); fieldInput.pad.clear();
  showScreen("field");
  fieldUpdateVision(true);
  fieldRender();
  fieldStartLoop();
  fieldEmit("enter", { area: a.n, floor: a.f, floorLabel: fieldFloorLabel(a.n, a.f), areaName: a.def.name, theme: a.def.theme, x: fieldState.x, y: fieldState.y, returning });
}
function fieldPlaceAtStart() {
  const a = fieldArea(), p = fieldTileCenter(a.start.tx, a.start.ty);
  fieldState.x = p.x; fieldState.y = p.y; fieldState.dir = "up"; fieldState.positioned = true;
}
function fieldPlayStageIntro(stage) {
  const ids = { 1: "forest-intro", 2: "goblin-intro", 3: "wolf-intro", 4: "dragon-intro" };
  const ev = stageEvents.find(e => e.id === ids[stage] && !e.trigger);
  return new Promise(resolve => { if (ev && !eventRead[ev.id]) openEvent(ev, resolve); else resolve(); });
}
// 階層に入る。opts.floor：開始フロア（行ったことのあるフロアのみ）／ fromHome：ホームから（全回復・採取とFOEが復活）／ afterBoss：ボス撃破後
async function fieldEnterArea(n, opts = {}) {
  n = Math.max(1, Math.min(Number(n) || 1, Object.keys(FIELD_AREAS).length));
  if (n > (state.maxUnlockedStage || 1)) n = state.maxUnlockedStage || 1;
  let f = Math.max(0, Math.min(fieldFloorCount(n) - 1, Number(opts.floor) || 0));
  if (f > 0 && !fieldState.flags[`floor:${n}-${f}`]) f = 0;
  if (opts.fromHome || opts.afterBoss) { fieldFullHeal(); fieldState.gatherUsed = {}; fieldState.foeDefeated = {}; }
  fieldState.area = n; fieldState.floor = f; fieldState.positioned = false;
  fieldState.flags[`floor:${n}-${f}`] = true;
  state.firstStageStarted = true;
  battleState.encounterMode = false; battleState.fieldEnemyId = null; battleState.fieldFoeKey = null;
  battleState.stageFinished = false;
  stageEntered[FIELD_AREAS[n].stage] = true;
  fieldState.built = "";
  fieldRollNextEncounter();
  fieldShow();
  persistAutoSave();
  fieldState.lock = true;
  try {
    if (n === 1 && !fieldState.flags["prologue"]) await fieldPlayScene("prologue");
    if (f === 0) await fieldPlayStageIntro(FIELD_AREAS[n].stage);
    if ($("bgm-toggle")?.checked) startBgm();
    fieldState.lock = false;
    if (f === 0) await fieldPlayScene(FIELD_AREAS[n].enterScene);
    if (n === 1 && f === 0 && !fieldState.flags["labyrinth-tutorial"]) await fieldPlayScene("labyrinth-tutorial");
  } finally { fieldState.lock = false; }
  persistAutoSave();
}
// START ボタンから（// [FIELD]）
function fieldStartFromHome() {
  if (!state.firstStageStarted && !fieldState.flags["prologue"]) { fieldEnterArea(1, { fromHome: true }); return; }
  fieldOpenFloorSelect();
}
// 樹海磁軸（行ったことのあるフロアへ移動）。既存のステージ選択ダイアログを使う
function fieldOpenFloorSelect() {
  const dlg = $("stage-select-dialog"), box = $("stage-select-list"); if (!dlg || !box) return;
  $("stage-select-title").textContent = "迷宮の入口（磁軸）";
  const help = dlg.querySelector(".game-dialog-panel > p"); if (help) help.textContent = "階層と、行ったことのあるフロアを選んで出発します。ホームから出発するとHP・SPが全回復し、採取ポイントとFOEが復活します。";
  const max = state.maxUnlockedStage || 1;
  box.innerHTML = Object.entries(FIELD_AREAS).map(([key, a]) => {
    const n = Number(key), open = n <= max, cleared = !!stageCleared[a.stage];
    const floors = a.floors.map((_, f) => {
      const ok = open && (f === 0 || fieldState.flags[`floor:${n}-${f}`]);
      const rate = fieldState.explored[`${n}-${f}`] ? `${fieldExploredRate(fieldArea(n, f))}%` : "";
      return `<button type="button" class="field-floor-button" data-area="${n}" data-floor="${f}" ${ok ? "" : "disabled"}>${fieldFloorLabel(n, f)}${rate ? `<small>${rate}</small>` : ""}</button>`;
    }).join("");
    return `<div class="stage-select-card field-stratum-card ${cleared ? "stage-cleared" : ""} ${open ? "" : "is-locked"}"><strong>${fieldStratumLabel(n)}</strong><span>${esc(a.name)}</span><small>${cleared ? "ボス撃破済み" : open ? "探索可能" : "未解放"}</small><div class="field-floor-buttons">${floors}</div></div>`;
  }).join("");
  box.querySelectorAll("[data-floor]").forEach(b => b.onclick = () => { dlg.hidden = true; fieldEnterArea(Number(b.dataset.area), { floor: Number(b.dataset.floor), fromHome: true }); });
  dlg.hidden = false;
}

/* ------------------------------------------------------------
   BGM（// [FIELD]）
   ------------------------------------------------------------ */
function fieldBgmKey() { return "field" + fieldState.area; }
function fieldBgmPlaylists() { const out = {}; for (const [n, a] of Object.entries(FIELD_AREAS)) if (a.bgm) out["field" + n] = [a.bgm]; return out; }

/* ------------------------------------------------------------
   セーブ（// [FIELD]）
   ------------------------------------------------------------ */
function fieldEncodeBits(arr) { let s = ""; for (let i = 0; i < arr.length; i += 4) s += ((arr[i] ? 8 : 0) | (arr[i + 1] ? 4 : 0) | (arr[i + 2] ? 2 : 0) | (arr[i + 3] ? 1 : 0)).toString(16); return s; }
function fieldDecodeBits(str, len) { const out = new Uint8Array(len); for (let i = 0; i < str.length; i++) { const v = parseInt(str[i], 16) || 0; for (let b = 0; b < 4; b++) if (i * 4 + b < len) out[i * 4 + b] = (v >> (3 - b)) & 1; } return out; }
function fieldSerialize() {
  const fieldNames = new Set(Object.values(FIELD_ENEMIES).map(e => e.name));
  const enemyEncounters = {};
  for (const [name, count] of Object.entries(enemyEncounterCounts)) if (fieldNames.has(name)) enemyEncounters[name] = count;
  const maps = {};
  for (const [key, arr] of Object.entries(fieldState.explored)) if (arr && arr.some(v => v)) maps[key] = fieldEncodeBits(arr);
  return { area: fieldState.area, floor: fieldState.floor, x: Math.round(fieldState.x), y: Math.round(fieldState.y), positioned: !!fieldState.positioned,
    checkpoint: fieldState.checkpoint ? { ...fieldState.checkpoint, x: Math.round(fieldState.checkpoint.x), y: Math.round(fieldState.checkpoint.y) } : null,
    flags: Object.fromEntries(Object.entries(fieldState.flags).filter(([k, v]) => v === true && !k.startsWith("__"))), enemyEncounters, maps };
}
function fieldDeserialize(d) {
  fieldState.flags = {}; fieldState.checkpoint = null; fieldState.area = 1; fieldState.floor = 0; fieldState.positioned = false; fieldState.built = "";
  fieldState.explored = {}; fieldState.gatherUsed = {}; fieldState.foeDefeated = {};
  if (!d || typeof d !== "object") {
    if (state.firstStageStarted) fieldState.flags["prologue"] = true;
    fieldState.area = Math.max(1, Math.min(5, state.maxUnlockedStage || 1));
    return;
  }
  const areaCount = Object.keys(FIELD_AREAS).length;
  fieldState.area = Math.max(1, Math.min(areaCount, Math.floor(Number(d.area) || 1)));
  fieldState.floor = Math.max(0, Math.min(fieldFloorCount(fieldState.area) - 1, Math.floor(Number(d.floor) || 0)));
  if (d.flags && typeof d.flags === "object") for (const [k, v] of Object.entries(d.flags)) if (v === true) fieldState.flags[k] = true;
  // 旧版（フロア導入前）のセーブ：最終フロアにいたものとして扱い、そのフロアまで行ける
  if (d.floor === undefined) { for (let n = 1; n <= areaCount; n++) if (n <= (state.maxUnlockedStage || 1)) for (let f = 0; f < fieldFloorCount(n); f++) if (stageCleared[FIELD_AREAS[n].stage]) fieldState.flags[`floor:${n}-${f}`] = true; fieldState.floor = 0; }
  if (d.maps && typeof d.maps === "object") for (const [key, str] of Object.entries(d.maps)) {
    const [n, f] = key.split("-").map(Number); const a = FIELD_AREAS[n] && fieldArea(n, f);
    if (a && typeof str === "string") fieldState.explored[key] = fieldDecodeBits(str, a.w * a.h);
  }
  const a = fieldArea();
  if (d.positioned && d.floor !== undefined && Number.isFinite(Number(d.x)) && !fieldBoxBlocked(a, Number(d.x), Number(d.y))) { fieldState.x = Number(d.x); fieldState.y = Number(d.y); fieldState.positioned = true; }
  if (d.enemyEncounters && typeof d.enemyEncounters === "object") for (const [name, count] of Object.entries(d.enemyEncounters)) enemyEncounterCounts[name] = Math.max(0, Math.floor(Number(count) || 0));
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fieldSetupInput); else fieldSetupInput();
