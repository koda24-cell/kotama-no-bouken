"use strict";
/* ============================================================
   field.js — 迷宮探索の共通状態・マップ基礎処理
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
const FIELD_SPEED = 118;
const FIELD_HIT = { halfW: 9, top: 7, bottom: 5 };
const FIELD_VISION = 3.6;              // 視界の半径（マス）
const FIELD_FOE_SIGHT = 4.5;           // FOEがプレイヤーに気づく距離（マス）
const FIELD_FOE_SPEED = { patrol: 52, chase: 84 };   // プレイヤーが動いている間だけ、この速さで動く
const FIELD_GATHER_USES = 2;
const FIELD_SOLID = new Set(["#", "~", "S", "T", "?", "G"]);
const FIELD_SAFE = new Set(["_", "P", "E", "B", "<", ">"]);
const FIELD_TILE_CLASS = { "#":"tile-wall", ".":"tile-floor", ",":"tile-path", "*":"tile-grass", "~":"tile-water", "_":"tile-safe", "P":"tile-safe", "E":"tile-exit", "B":"tile-gate", "S":"tile-safe", "T":"tile-floor", "?":"tile-floor", "G":"tile-floor", "<":"tile-stairs-up", ">":"tile-stairs-down" };
const FIELD_DIRS = { up:{dx:0,dy:-1}, down:{dx:0,dy:1}, left:{dx:-1,dy:0}, right:{dx:1,dy:0} };
const FIELD_ENCOUNTER_DELAY = 900;
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
const fieldInput = { keys: new Set(), pad: new Set() };
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

