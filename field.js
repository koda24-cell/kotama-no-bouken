"use strict";
/* ============================================================
   field.js — フィールド探索（自由移動）・ランダムエンカウント・会話（ストーリー）
   ------------------------------------------------------------
   担当：Claude（処理）。見た目は css/06-field.css（GPTへ引き継ぎ）。
   仕様：docs/field-and-story/FIELD_SPEC.md
   データ：data/field-maps.js（エリア・雑魚敵）、data/story.js（会話）
   script.js からは「// [FIELD]」の目印を付けた短いフックでこのファイルの関数を呼ぶ。
   ・戦闘の数値・行動順・ボスの内容には触れない。雑魚戦は battleState.encounterMode で区別する。
   ・index.html で script.js の後に読み込む（script.js の関数・変数を使うため）。
   ============================================================ */

const FIELD_TILE = 32;                 // 論理座標での1マスの大きさ（当たり判定もこの単位）
const FIELD_SPEED = 118;               // 歩く速さ（px/秒）
const FIELD_HIT = { halfW: 9, top: 7, bottom: 5 };   // 足元の当たり判定（中心からの距離）
const FIELD_SOLID = new Set(["#", "~", "S", "T", "?"]);
const FIELD_SAFE = new Set(["_", "P", "E", "B"]);
const FIELD_TILE_CLASS = { "#":"tile-wall", ".":"tile-floor", ",":"tile-path", "*":"tile-grass", "~":"tile-water", "_":"tile-safe", "P":"tile-safe", "E":"tile-exit", "B":"tile-gate", "S":"tile-safe", "T":"tile-floor", "?":"tile-floor" };
const FIELD_DIRS = { up:{dx:0,dy:-1}, down:{dx:0,dy:1}, left:{dx:-1,dy:0}, right:{dx:1,dy:0} };
const FIELD_ENCOUNTER_DELAY = 900;     // 「！」表示から戦闘画面に移るまで（ms）

// プレイ中に変化する状態（flags・checkpoint・area・x・y はセーブ対象）
let fieldState = {
  area: 1, x: 0, y: 0, dir: "down", moving: false, step: 0,
  steps: 0, nextEncounter: 20, walked: 0,
  flags: {}, checkpoint: null, enemyEncounters: {},
  lock: false, built: 0, triggerTile: "", nearKey: "", positioned: false
};
const fieldInput = { keys: new Set(), pad: new Set() };
let fieldRaf = null, fieldLastTs = 0, fieldFrame = 0;
let fieldDialogAdvance = null, fieldDialogTyping = null, fieldChoiceState = null;
const fieldAreaCache = {};

/* ------------------------------------------------------------
   イベント通知（演出用・処理は待たない）
   ------------------------------------------------------------ */
function fieldEmit(name, detail) {
  try { document.dispatchEvent(new CustomEvent("field:" + name, { detail: { ...detail } })); }
  catch (e) { console.warn("[field] イベント通知に失敗:", name, e); }
}

/* ------------------------------------------------------------
   マップ解析
   ------------------------------------------------------------ */
function fieldArea(n) {
  n = Number(n) || 1;
  if (fieldAreaCache[n]) return fieldAreaCache[n];
  const def = FIELD_AREAS[n]; if (!def) return null;
  const grid = def.map.map(row => row.split(""));
  const h = grid.length, w = Math.max(...grid.map(r => r.length));
  const objects = []; let start = { tx: 1, ty: 1 }, chestIndex = 0;
  grid.forEach((row, ty) => row.forEach((c, tx) => {
    if (c === "P") start = { tx, ty };
    if (c === "S") objects.push({ key: `save:${n}:${tx}:${ty}`, kind: "save", tx, ty, sprite: "save-lamp", name: "導きの灯" });
    else if (c === "T") { const reward = (def.chests || [])[chestIndex++] || { gold: 10 }; objects.push({ key: `chest:${n}:${tx}:${ty}`, kind: "chest", tx, ty, sprite: "chest", name: "宝箱", reward }); }
    else if (c === "?") objects.push({ key: `sign:${n}:${tx}:${ty}`, kind: "sign", tx, ty, sprite: "sign", name: "看板", scene: def.signScene });
    else if (c === "B") objects.push({ key: `gate:${n}`, kind: "gate", tx, ty, sprite: "boss-gate", name: "", walk: true });
    else if (c === "E") objects.push({ key: `exit:${n}`, kind: "exit", tx, ty, sprite: "exit", name: "", walk: true });
    else if (/[a-z]/.test(c) && def.objects && def.objects[c]) { const o = def.objects[c]; objects.push({ key: `npc:${n}:${o.id}`, kind: o.kind || "npc", tx, ty, sprite: o.sprite, name: o.name, scene: o.scene, id: o.id }); }
  }));
  return (fieldAreaCache[n] = { n, def, grid, w, h, start, objects });
}
function fieldTileAt(a, tx, ty) { return (a.grid[ty] && a.grid[ty][tx]) || "#"; }
function fieldIsSolidChar(c) { return FIELD_SOLID.has(c) || /[a-z]/.test(c); }
function fieldSolidAt(a, px, py) { return fieldIsSolidChar(fieldTileAt(a, Math.floor(px / FIELD_TILE), Math.floor(py / FIELD_TILE))); }
function fieldBoxBlocked(a, x, y) {
  const l = x - FIELD_HIT.halfW, r = x + FIELD_HIT.halfW - .01, t = y - FIELD_HIT.top, b = y + FIELD_HIT.bottom - .01;
  return fieldSolidAt(a, l, t) || fieldSolidAt(a, r, t) || fieldSolidAt(a, l, b) || fieldSolidAt(a, r, b);
}
function fieldTileCenter(tx, ty) { return { x: tx * FIELD_TILE + FIELD_TILE / 2, y: ty * FIELD_TILE + FIELD_TILE / 2 + 4 }; }

/* ------------------------------------------------------------
   描画（DOM）
   ------------------------------------------------------------ */
function fieldBuildDom(n) {
  const a = fieldArea(n), screen = $("field"), map = $("field-map"); if (!a || !screen || !map) return;
  screen.dataset.area = String(n);
  screen.dataset.theme = a.def.theme || "forest";
  $("field-area-name").textContent = a.def.name;
  map.style.width = a.w * FIELD_TILE + "px"; map.style.height = a.h * FIELD_TILE + "px";
  map.style.setProperty("--tile", FIELD_TILE + "px");
  const tiles = [];
  for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
    const c = fieldTileAt(a, tx, ty);
    // 壁の下端（手前に見える面）を区別できるようにする
    const edge = c === "#" && !fieldIsSolidChar(fieldTileAt(a, tx, ty + 1)) ? " is-edge" : "";
    tiles.push(`<i class="field-tile ${FIELD_TILE_CLASS[c] || (/[a-z]/.test(c) ? "tile-floor" : "tile-floor")}${edge}" style="left:${tx * FIELD_TILE}px;top:${ty * FIELD_TILE}px"></i>`);
  }
  const objs = a.objects.map(o => {
    const opened = o.kind === "chest" && fieldState.flags[o.key] ? " is-opened" : "";
    return `<div class="field-object${opened}" data-kind="${esc(o.kind)}" data-object-id="${esc(o.id || o.key)}" data-key="${esc(o.key)}" data-sprite="${esc(o.sprite || "")}" style="left:${o.tx * FIELD_TILE}px;top:${o.ty * FIELD_TILE}px"><span class="field-object-sprite"></span>${o.name ? `<b class="field-object-label">${esc(o.name)}</b>` : ""}</div>`;
  }).join("");
  map.innerHTML = `<div class="field-tiles">${tiles.join("")}</div>${objs}<div id="field-player" class="field-player" data-dir="down" data-moving="false" data-step="0"><span class="field-player-shadow"></span><span class="field-player-sprite"></span></div>`;
  fieldState.built = n; fieldState.nearKey = "";
}
function fieldViewScale() {
  const vp = $("field-viewport"); if (!vp) return 1;
  // スマホ幅で約11マス、PCでは拡大してドット感を残す
  return Math.max(1, Math.min(2, Math.floor((vp.clientWidth / (12 * FIELD_TILE)) * 4) / 4));
}
function fieldRender() {
  const a = fieldArea(fieldState.area), vp = $("field-viewport"), map = $("field-map"), p = $("field-player");
  if (!a || !vp || !map || !p) return;
  p.style.left = (fieldState.x - 16) + "px";
  p.style.top = (fieldState.y - 34) + "px";
  p.style.zIndex = String(10 + Math.floor(fieldState.y));
  p.dataset.dir = fieldState.dir; p.dataset.moving = String(fieldState.moving); p.dataset.step = String(fieldState.step);
  const s = fieldViewScale(), vw = vp.clientWidth, vh = vp.clientHeight, mw = a.w * FIELD_TILE * s, mh = a.h * FIELD_TILE * s;
  const tx = mw <= vw ? (vw - mw) / 2 : -Math.max(0, Math.min(mw - vw, fieldState.x * s - vw / 2));
  const ty = mh <= vh ? (vh - mh) / 2 : -Math.max(0, Math.min(mh - vh, (fieldState.y - 12) * s - vh / 2));
  map.style.transform = `translate(${Math.round(tx)}px,${Math.round(ty)}px) scale(${s})`;
}

/* ------------------------------------------------------------
   入力
   ------------------------------------------------------------ */
function fieldIsActive() { return state.screen === "field"; }
function fieldModalOpen() {
  return [...document.querySelectorAll(".game-dialog, #story-event, #tutorial-overlay")].some(el => !el.hidden) || !$("list-menu")?.hidden;
}
function fieldInputVector() {
  const k = fieldInput.keys, p = fieldInput.pad;
  let dx = 0, dy = 0;
  if (k.has("ArrowLeft") || k.has("a") || p.has("left")) dx -= 1;
  if (k.has("ArrowRight") || k.has("d") || p.has("right")) dx += 1;
  if (k.has("ArrowUp") || k.has("w") || p.has("up")) dy -= 1;
  if (k.has("ArrowDown") || k.has("s") || p.has("down")) dy += 1;
  return { dx, dy };
}
function fieldSetupInput() {
  const keyName = e => e.key.length === 1 ? e.key.toLowerCase() : e.key;
  document.addEventListener("keydown", e => {
    if (!fieldIsActive() || fieldModalOpen()) return;
    const k = keyName(e);
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(k)) e.preventDefault();
    if (fieldChoiceState) { fieldChoiceKey(k); return; }
    if (["z", "Enter", " "].includes(k)) { if (!e.repeat) fieldActionPressed(); return; }
    if (["x", "Escape"].includes(k)) { if (fieldDialogAdvance) fieldActionPressed(); return; }
    fieldInput.keys.add(k);
  });
  document.addEventListener("keyup", e => fieldInput.keys.delete(keyName(e)));
  window.addEventListener("blur", () => { fieldInput.keys.clear(); fieldInput.pad.clear(); });
  document.querySelectorAll("#field-pad [data-dir]").forEach(btn => {
    const dir = btn.dataset.dir;
    const on = e => { e.preventDefault(); fieldInput.pad.add(dir); btn.classList.add("is-pressed"); try { btn.setPointerCapture(e.pointerId); } catch (_) {} };
    const off = () => { fieldInput.pad.delete(dir); btn.classList.remove("is-pressed"); };
    btn.addEventListener("pointerdown", on);
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(t => btn.addEventListener(t, off));
    btn.addEventListener("contextmenu", e => e.preventDefault());
  });
  $("field-action")?.addEventListener("pointerdown", e => { e.preventDefault(); fieldActionPressed(); });
  $("field-dialog")?.addEventListener("click", e => { if (!e.target.closest("[data-choice]")) fieldActionPressed(); });
  $("field-home-button")?.addEventListener("click", () => { if (!fieldState.lock) fieldAskReturnHome(); });
}
function fieldActionPressed() {
  if (fieldChoiceState) { fieldChoiceKey("z"); return; }
  if (fieldDialogTyping) { fieldDialogTyping(); return; }
  if (fieldDialogAdvance) { const r = fieldDialogAdvance; fieldDialogAdvance = null; r(); return; }
  if (fieldState.lock) return;
  const o = fieldFacingObject(); if (o) fieldInteract(o);
}

/* ------------------------------------------------------------
   メインループ（移動・当たり判定・歩数・トリガー）
   ------------------------------------------------------------ */
function fieldStartLoop() {
  if (fieldRaf) return;
  fieldLastTs = 0;
  const loop = ts => {
    if (!fieldIsActive()) { fieldRaf = null; fieldState.moving = false; return; }
    const dt = fieldLastTs ? Math.min(.05, (ts - fieldLastTs) / 1000) : 0; fieldLastTs = ts;
    fieldUpdate(dt);
    fieldRender();
    fieldRaf = requestAnimationFrame(loop);
  };
  fieldRaf = requestAnimationFrame(loop);
}
function fieldUpdate(dt) {
  const a = fieldArea(fieldState.area); if (!a) return;
  const blocked = fieldState.lock || fieldModalOpen() || !!fieldDialogAdvance || !!fieldChoiceState;
  const { dx, dy } = blocked ? { dx: 0, dy: 0 } : fieldInputVector();
  fieldState.moving = !!(dx || dy);
  if (fieldState.moving) {
    if (dx && !dy) fieldState.dir = dx < 0 ? "left" : "right";
    else if (dy && !dx) fieldState.dir = dy < 0 ? "up" : "down";
    else {
      // 斜め移動中は、今の向きが入力方向の一部なら向きを保つ（向きがちらつかないように）
      const keep = (fieldState.dir === "left" && dx < 0) || (fieldState.dir === "right" && dx > 0) || (fieldState.dir === "up" && dy < 0) || (fieldState.dir === "down" && dy > 0);
      if (!keep) fieldState.dir = dy < 0 ? "up" : "down";
    }
    const len = Math.hypot(dx, dy), v = FIELD_SPEED * dt / len;
    const ox = fieldState.x, oy = fieldState.y;
    const nx = fieldState.x + dx * v; if (!fieldBoxBlocked(a, nx, fieldState.y)) fieldState.x = nx;
    const ny = fieldState.y + dy * v; if (!fieldBoxBlocked(a, fieldState.x, ny)) fieldState.y = ny;
    const moved = Math.hypot(fieldState.x - ox, fieldState.y - oy);
    if (moved > 0) fieldAfterMove(a, moved);
    fieldFrame++; if (fieldFrame % 8 === 0) fieldState.step = (fieldState.step + 1) % 4;
  } else { fieldState.step = 0; }
  fieldUpdateNear();
}
function fieldAfterMove(a, moved) {
  const tx = Math.floor(fieldState.x / FIELD_TILE), ty = Math.floor(fieldState.y / FIELD_TILE), c = fieldTileAt(a, tx, ty);
  // 踏むと発動するマス（ボスゲート・出口）。同じマスにいる間は再発動しない
  const key = `${tx},${ty}`;
  if (key !== fieldState.triggerTile) {
    fieldState.triggerTile = key;
    if (c === "B") { fieldOnGate(); return; }
    if (c === "E") { fieldAskReturnHome(); return; }
  }
  if (FIELD_SAFE.has(c)) return;
  fieldState.walked += moved * (c === "*" ? 1.5 : 1);
  while (fieldState.walked >= FIELD_TILE) {
    fieldState.walked -= FIELD_TILE;
    fieldState.steps++;
    fieldEmit("step", { area: fieldState.area, tileX: tx, tileY: ty, steps: fieldState.steps });
    if (fieldState.steps >= fieldState.nextEncounter && !fieldState.lock) { fieldTriggerEncounter(); break; }
  }
}
function fieldFacingObject() {
  const a = fieldArea(fieldState.area); if (!a) return null;
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
    const timer = setInterval(() => {
      i = Math.min(text.length, i + 1); textEl.textContent = text.slice(0, i);
      if (i >= text.length) finish();
    }, 26);
    const finish = () => { clearInterval(timer); textEl.textContent = text; fieldDialogTyping = null; next.hidden = false; resolve(); };
    fieldDialogTyping = finish;
  });
}
// 会話シーンを再生する。戻り値は再生したかどうか
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
// 1行の文章＋選択肢。戻り値は選んだ番号（キャンセル時は最後の選択肢）
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

/* ------------------------------------------------------------
   調べる・踏む
   ------------------------------------------------------------ */
async function fieldInteract(o) {
  if (fieldState.lock) return;
  if (o.kind === "npc" || o.kind === "sign") { await fieldPlayScene(o.scene); return; }
  if (o.kind === "save") { await fieldUseSavePoint(o); return; }
  if (o.kind === "chest") { await fieldOpenChest(o); return; }
}
function fieldFullHeal() {
  for (const c of getParty()) { c.hp = effectiveStats(c).maxHp; c.sp = c.maxSp; }
}
async function fieldUseSavePoint(o) {
  fieldFullHeal();
  fieldState.checkpoint = { area: fieldState.area, x: fieldState.x, y: fieldState.y };
  if (typeof playSe === "function") playSe("assets/se/syouri/アイテムを入手2", .6);
  fieldEmit("save", { area: fieldState.area, x: fieldState.x, y: fieldState.y });
  fieldState.flags["save-point"] = false;   // 毎回同じ文章を出す
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
  fieldEmit("chest", { area: fieldState.area, objectId: o.key, reward: { ...r } });
  persistAutoSave();
  await fieldSay(text);
}
async function fieldSay(text, who = "narration") {
  const id = "__say";
  STORY_SCENES[id] = { lines: [{ who, text }] };
  fieldState.flags[id] = false;
  await fieldPlayScene(id);
  delete STORY_SCENES[id]; delete fieldState.flags[id];
}
async function fieldAskReturnHome() {
  if (fieldState.lock) return;
  const choice = await fieldAsk("ふもとの村（ホーム）へ戻りますか？", ["戻る", "やめる"]);
  if (choice !== 0) return;
  fieldEmit("leave", { area: fieldState.area, reason: "home" });
  persistAutoSave();
  showScreen("home");
  setSystemMessage("ホームに戻りました。STARTから冒険を再開できます。");
}
async function fieldOnGate() {
  if (fieldState.lock) return;
  const a = fieldArea(fieldState.area), req = a.def.gateRequires;
  if (req && !fieldState.flags[req.flag]) { if (req.scene) await fieldPlayScene(req.scene); else await fieldSay("この先へは、まだ進めないようだ。"); return; }
  await fieldPlayScene(a.def.bossScene);
  const choice = await fieldAsk("この先には強大な魔物の気配がする。進みますか？", ["進む", "やめる"]);
  if (choice !== 0) return;
  fieldState.lock = true;
  fieldEmit("boss:gate", { area: fieldState.area, stage: a.def.stage });
  fieldEmit("leave", { area: fieldState.area, reason: "boss" });
  // ボス戦は従来のステージ戦そのもの（HP/SP全回復・数値は不変）
  fieldState.checkpoint = { area: fieldState.area, x: fieldState.x, y: fieldState.y + 6 };
  startBattle(a.def.stage);
  fieldState.lock = false;
}

/* ------------------------------------------------------------
   ランダムエンカウント
   ------------------------------------------------------------ */
function fieldRollNextEncounter() {
  const enc = fieldArea(fieldState.area)?.def.encounter || { min: 16, max: 28 };
  fieldState.steps = 0; fieldState.walked = 0;
  fieldState.nextEncounter = enc.min + Math.floor(Math.random() * (enc.max - enc.min + 1));
}
function fieldPickEnemyId() {
  const table = fieldArea(fieldState.area)?.def.encounter?.table || [];
  const total = table.reduce((n, t) => n + (t.weight || 1), 0);
  let r = Math.random() * total;
  for (const t of table) { r -= (t.weight || 1); if (r <= 0) return t.enemy; }
  return table.length ? table[table.length - 1].enemy : null;
}
// script.js の beginStageCore() から呼ばれる（// [FIELD]）
function fieldCreateEnemy(id) {
  const base = FIELD_ENEMIES[id] || FIELD_ENEMIES[Object.keys(FIELD_ENEMIES)[0]];
  const e = JSON.parse(JSON.stringify(base));
  return { ...e, fieldEnemyId: id, maxHp: e.hp, spDefense: Number.isFinite(e.spDefense) ? e.spDefense : Math.floor((e.defense || 0) / 2) };
}
async function fieldTriggerEncounter() {
  const id = fieldPickEnemyId(); if (!id) { fieldRollNextEncounter(); return; }
  fieldState.lock = true; fieldState.moving = false; fieldInput.keys.clear(); fieldInput.pad.clear();
  const name = FIELD_ENEMIES[id]?.name || "";
  fieldEmit("encounter", { area: fieldState.area, enemyId: id, enemyName: name, delay: FIELD_ENCOUNTER_DELAY });
  const screen = $("field"), alert = $("field-player-alert"), flash = $("field-encounter-flash");
  screen?.classList.add("is-encounter");
  if (alert) { const vp = $("field-viewport"), p = $("field-player"); if (vp && p) { const pr = p.getBoundingClientRect(), vr = vp.getBoundingClientRect(); alert.style.left = (pr.left - vr.left + pr.width / 2) + "px"; alert.style.top = (pr.top - vr.top - 6) + "px"; } alert.hidden = false; }
  if (typeof sound === "function") sound("error", true);
  await new Promise(r => setTimeout(r, FIELD_ENCOUNTER_DELAY * .45));
  if (flash) flash.hidden = false;
  await new Promise(r => setTimeout(r, FIELD_ENCOUNTER_DELAY * .55));
  if (alert) alert.hidden = true; if (flash) flash.hidden = true;
  screen?.classList.remove("is-encounter");
  fieldEmit("leave", { area: fieldState.area, reason: "encounter" });
  fieldStartEncounterBattle(id);
}
function fieldStartEncounterBattle(id) {
  const a = fieldArea(fieldState.area);
  battleBgmSelections = {}; stageIntroStoryPending = false; maouIntroBgmPersistent = false;
  retryContext = null;
  battleState.tutorialMode = false; battleState.hiddenBossMode = false; battleState.maxStage = 5;
  resetTransientBattleState();
  battleState.encounterMode = true; battleState.fieldEnemyId = id;
  battleState.koCount = 0; battleState.rankResult = null;
  battleState.stage = a ? a.def.stage : 1;
  battleState.unionGauges = { kotama: 0, knight: 0, healer: 0, warrior: 0, mage: 0, samurai: 0 };
  // 雑魚戦はHP/SPを持ち越す（全員戦闘不能のままにはならない：敗北時はホームへ戻る）
  for (const c of getParty()) { c.hp = Math.max(0, Math.min(effectiveStats(c).maxHp, Number(c.hp) || 0)); c.sp = Math.max(0, Math.min(c.maxSp, Number(c.sp) || 0)); }
  if (getParty().every(c => c.hp <= 0)) fieldFullHeal();
  beginStage();
}
// 雑魚戦の勝利処理。script.js の finishStage() から呼ばれる（// [FIELD]）
async function fieldFinishEncounter(e) {
  await playEnemyDefeatAnimation();
  battleState.lastRewardGold = e.gold || 0;
  registerDefeat(e.compendiumAs || e.name);
  totalEnemyDefeats += 1;
  state.gold += e.gold || 0;
  const turns = Math.max(1, battleState.turnCount + 1);
  awardVictoryAchievements(e, turns, battleState.koCount || 0);
  const drops = awardMaterials(e);
  await showItemDropAnimation(drops);
  persistAutoSave();
  renderGold();
  if ($("bgm-toggle")?.checked) startBgm();
  $("battle-commands").hidden = true; $("battle-commands").replaceChildren();
  $("battle-bottom")?.classList.add("result-shown");
  $("battle-support").hidden = true;
  $("battle-result").hidden = false;
  $("retry-stage-button").hidden = true; $("formation-retry-button").hidden = true;
  $("result-title").textContent = "VICTORY!";
  $("result-message").textContent = `${e.name}を倒した！ ${e.gold || 0}Gを獲得！\n${turns}ターン ／ 戦闘不能 ${battleState.koCount || 0}人`;
  $("next-stage-button").hidden = false; $("next-stage-button").textContent = "フィールドへ戻る";
  $("return-home-button").hidden = false;
  pushLog(`${e.name}を倒した！ ${e.gold || 0}G獲得。`);
}
// 雑魚戦の敗北。script.js の finishDefeat() から呼ばれる（// [FIELD]）
function fieldOnDefeat() {
  retryContext = null;
  const cp = fieldState.checkpoint;
  if (cp && cp.area === fieldState.area) { fieldState.x = cp.x; fieldState.y = cp.y; }
  else { fieldState.positioned = false; }
  $("result-message").innerHTML = "仲間が全員倒れてしまった……。ホームで態勢を立て直そう。<br><strong class=\"defeat-preparation-warning\">次は最後に触れた導きの灯（またはエリアの入口）から再開します。</strong>";
  persistAutoSave();
}
// 雑魚戦の勝利・撤退後にフィールドへ戻る（next-stage-button / 撤退から）
function fieldReturnFromBattle(opts = {}) {
  battleState.encounterMode = false; battleState.fieldEnemyId = null;
  battleStartSnapshot = null;
  if (opts.retreat) setSystemMessage("戦闘から逃げ出した。");
  fieldRollNextEncounter();
  fieldShow({ returning: true });
}

/* ------------------------------------------------------------
   画面の出入り
   ------------------------------------------------------------ */
function fieldShow({ returning = false } = {}) {
  if (fieldState.built !== fieldState.area || !$("field-map")?.children.length) fieldBuildDom(fieldState.area);
  if (!fieldState.positioned) fieldPlaceAtStart();
  fieldState.lock = false; fieldState.triggerTile = `${Math.floor(fieldState.x / FIELD_TILE)},${Math.floor(fieldState.y / FIELD_TILE)}`;
  fieldInput.keys.clear(); fieldInput.pad.clear();
  showScreen("field");
  fieldRender();
  fieldStartLoop();
  const a = fieldArea(fieldState.area);
  fieldEmit("enter", { area: fieldState.area, areaName: a.def.name, theme: a.def.theme, x: fieldState.x, y: fieldState.y, returning });
}
function fieldPlaceAtStart() {
  const a = fieldArea(fieldState.area), p = fieldTileCenter(a.start.tx, a.start.ty);
  fieldState.x = p.x; fieldState.y = p.y; fieldState.dir = "up"; fieldState.positioned = true;
}
// 既存のステージ導入イベント（stageEvents）をエリア初回入場時に再生する。魔王戦の導入はボス戦開始時のまま
function fieldPlayStageIntro(stage) {
  const ids = { 1: "forest-intro", 2: "goblin-intro", 3: "wolf-intro", 4: "dragon-intro" };
  const ev = stageEvents.find(e => e.id === ids[stage] && !e.trigger);
  return new Promise(resolve => { if (ev && !eventRead[ev.id]) openEvent(ev, resolve); else resolve(); });
}
// エリアに入る。opts.fromHome：ホーム・エリア選択から（HP/SP全回復） / opts.afterBoss：ボス撃破後の次エリア
async function fieldEnterArea(n, opts = {}) {
  n = Math.max(1, Math.min(Number(n) || 1, Object.keys(FIELD_AREAS).length));
  if (n > (state.maxUnlockedStage || 1)) n = state.maxUnlockedStage || 1;
  const sameArea = fieldState.area === n && fieldState.positioned;
  if (!sameArea || opts.afterBoss) {
    fieldState.area = n; fieldState.positioned = false;
    const cp = fieldState.checkpoint;
    if (!opts.afterBoss && cp && cp.area === n) { fieldState.x = cp.x; fieldState.y = cp.y; fieldState.positioned = true; }
  }
  if (opts.fromHome || opts.afterBoss) fieldFullHeal();
  state.firstStageStarted = true;
  battleState.encounterMode = false; battleState.fieldEnemyId = null;
  battleState.stageFinished = false;
  stageEntered[fieldArea(n).def.stage] = true;
  fieldRollNextEncounter();
  fieldShow();
  if (opts.afterBoss || !fieldState.checkpoint || fieldState.checkpoint.area !== n) fieldState.checkpoint = { area: n, x: fieldState.x, y: fieldState.y };
  persistAutoSave();
  // 初回のストーリー：プロローグ → 既存の導入イベント → エリア入場の会話
  fieldState.lock = true;
  try {
    if (n === 1 && !fieldState.flags["prologue"]) await fieldPlayScene("prologue");
    await fieldPlayStageIntro(fieldArea(n).def.stage);
    if ($("bgm-toggle")?.checked) startBgm();
    fieldState.lock = false;
    await fieldPlayScene(fieldArea(n).def.enterScene);
  } finally { fieldState.lock = false; }
  persistAutoSave();
}
// START ボタンから（// [FIELD]）
function fieldStartFromHome() {
  if (!state.firstStageStarted || (state.maxUnlockedStage || 1) <= 1) { fieldEnterArea(1, { fromHome: true }); return; }
  openStageSelectDialog();
}

/* ------------------------------------------------------------
   BGM（script.js の currentBgmTrack / startBgm から参照：// [FIELD]）
   ------------------------------------------------------------ */
function fieldBgmKey() { return "field" + fieldState.area; }
function fieldBgmPlaylists() {
  const out = {};
  for (const [n, a] of Object.entries(FIELD_AREAS)) if (a.bgm) out["field" + n] = [a.bgm];
  return out;
}

/* ------------------------------------------------------------
   セーブ（script.js の createSaveData / loadGame から：// [FIELD]）
   ------------------------------------------------------------ */
function fieldSerialize() {
  // 雑魚敵の遭遇回数（アナライズ開示用）。既存の enemyEncounterCounts は図鑑名だけを読み込むため別に保存する
  const fieldNames = new Set(Object.values(FIELD_ENEMIES).map(e => e.name));
  const enemyEncounters = {};
  for (const [name, count] of Object.entries(enemyEncounterCounts)) if (fieldNames.has(name)) enemyEncounters[name] = count;
  return { area: fieldState.area, x: Math.round(fieldState.x), y: Math.round(fieldState.y), positioned: !!fieldState.positioned,
    checkpoint: fieldState.checkpoint ? { ...fieldState.checkpoint, x: Math.round(fieldState.checkpoint.x), y: Math.round(fieldState.checkpoint.y) } : null,
    flags: Object.fromEntries(Object.entries(fieldState.flags).filter(([k, v]) => v === true && !k.startsWith("__"))), enemyEncounters };
}
function fieldDeserialize(d) {
  fieldState.flags = {}; fieldState.checkpoint = null; fieldState.area = 1; fieldState.positioned = false; fieldState.built = 0;
  if (!d || typeof d !== "object") {
    // 旧セーブ：すでにステージを進めている場合はプロローグを既読扱いにし、解放済みの最も先のエリアから
    if (state.firstStageStarted) fieldState.flags["prologue"] = true;
    fieldState.area = Math.max(1, Math.min(5, state.maxUnlockedStage || 1));
    return;
  }
  const areaCount = Object.keys(FIELD_AREAS).length;
  fieldState.area = Math.max(1, Math.min(areaCount, Math.floor(Number(d.area) || 1)));
  if (d.flags && typeof d.flags === "object") for (const [k, v] of Object.entries(d.flags)) if (v === true) fieldState.flags[k] = true;
  const validPos = (area, x, y) => { const a = fieldArea(area); return a && Number.isFinite(x) && Number.isFinite(y) && !fieldBoxBlocked(a, x, y); };
  if (d.positioned && validPos(fieldState.area, Number(d.x), Number(d.y))) { fieldState.x = Number(d.x); fieldState.y = Number(d.y); fieldState.positioned = true; }
  const cp = d.checkpoint;
  if (cp && validPos(Number(cp.area), Number(cp.x), Number(cp.y))) fieldState.checkpoint = { area: Number(cp.area), x: Number(cp.x), y: Number(cp.y) };
  if (d.enemyEncounters && typeof d.enemyEncounters === "object") for (const [name, count] of Object.entries(d.enemyEncounters)) enemyEncounterCounts[name] = Math.max(0, Math.floor(Number(count) || 0));
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fieldSetupInput); else fieldSetupInput();
