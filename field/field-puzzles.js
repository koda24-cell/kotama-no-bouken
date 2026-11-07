"use strict";
/* ============================================================
   field/field-puzzles.js — 仕掛け（スイッチ・扉）、扉・ショートカット・隠し通路
   ------------------------------------------------------------
   担当：Claude A。共通状態・通行判定（fieldCharSolid・fieldDoorOpen・fieldWallLike・fieldCanEnter）は field.js。
   データ：data/field-maps.js の objects（kind:"switch"／"door"／"cache"）と FIELD_PUZZLES。会話：data/story.js の pz-*。
   扉の奥の宝箱の報酬（fieldPuzzleOpenCache）とサブイベント（[SIDE]）は Claude B の担当で、field/field-interactions.js にある。
   index.html では field-interactions.js の後に読み込む。
   ============================================================ */

// 探索画面のオブジェクトに付ける状態クラス（field/field-render.js の fieldBuildDom から呼ばれる）
function fieldObjectStateClass(o) {
  if (o.kind === "switch" || o.kind === "door" || o.kind === "cache") return fieldPuzzleObjectClass(o);
  if (o.kind === "event") {
    const done = typeof fieldSideDone === "function" && fieldSideDone(o.event);
    return (done ? " is-opened" : "") + (o.hidden ? " is-hidden-event" : "");
  }
  return "";
}
/* ------------------------------------------------------------
   [PUZZLE] 仕掛け・謎解き（任意攻略）
   データ：data/field-maps.js の FIELD_PUZZLES ／ 会話：data/story.js の pz-*
   ・解決 fieldState.flags["puzzle:<ID>"]、報酬 ["puzzle:<ID>:reward"]、all のスイッチ ["puzzle:<ID>:sw:<スイッチID>"] を保存する。
   ・順番（order）の途中経過は fieldPuzzleProgress に持ち、保存しない（フロアを出ると最初から）。
   ------------------------------------------------------------ */
let fieldPuzzleProgress = {}, fieldPuzzleProgressFloor = "";
// 順番の仕掛けの途中経過は、フロアが変わると最初からになる
function fieldPuzzleProgressSync() { const k = fieldArea()?.key || ""; if (k !== fieldPuzzleProgressFloor) { fieldPuzzleProgress = {}; fieldPuzzleProgressFloor = k; } }
function fieldPuzzleDef(id) { return (typeof FIELD_PUZZLES !== "undefined" && FIELD_PUZZLES[id]) || null; }
function fieldPuzzleSolved(id) { return !!(id && fieldState.flags[`puzzle:${id}`]); }
function fieldPuzzleSwitchOn(o) {
  const pz = fieldPuzzleDef(o.puzzle); if (!pz) return false;
  fieldPuzzleProgressSync();
  if (fieldPuzzleSolved(o.puzzle)) return true;
  if (pz.type === "all") return !!fieldState.flags[`puzzle:${o.puzzle}:sw:${o.id}`];
  if (pz.type === "order") return (fieldPuzzleProgress[o.puzzle] || []).includes(o.id);
  return false;
}
function fieldPuzzleObjectClass(o) {
  if (o.kind === "switch") return fieldPuzzleSwitchOn(o) ? " is-on" : "";
  if (o.kind === "door") { const open = fieldDoorOpen(o); return (open ? " is-open" : "") + (o.hidden ? " is-hidden-door" : "") + (!open && o.oneWay ? " is-one-way" : "") + (!open && o.requires ? " is-locked" : ""); }
  if (o.kind === "cache") return fieldState.flags[`puzzle:${o.puzzle}:reward`] ? " is-opened" : "";
  return "";
}
// 仕掛けの見た目（スイッチ・扉・宝箱・壁のタイル）を今の状態に合わせる
function fieldPuzzleRefresh(id) {
  const a = fieldArea(), exp = fieldExplored(a), tiles = $("field-map")?.querySelector(".field-tiles")?.children;
  for (const o of a.objects) {
    if (o.puzzle !== id) continue;
    const el = document.querySelector(`#field-map .field-object[data-key="${CSS.escape(o.key)}"]`);
    if (el) { el.classList.remove("is-on", "is-open", "is-opened"); for (const k of fieldPuzzleObjectClass(o).split(" ").filter(Boolean)) el.classList.add(k); }
    if (o.kind === "door" && tiles) {
      const tile = tiles[o.ty * a.w + o.tx], wall = fieldWallLike(a, fieldTileAt(a, o.tx, o.ty));
      if (tile) { tile.classList.toggle("tile-wall", wall); tile.classList.toggle("tile-floor", !wall); tile.classList.toggle("is-edge", false); if (!exp[o.ty * a.w + o.tx]) tile.classList.add("is-unexplored"); }
    }
  }
  fieldUpdateVision(true);
  fieldMiniDirty = true;
}
function fieldPuzzleFill(text, pz, n) { return String(text || "").replace("{n}", n).replace("{total}", (pz.order || pz.switches || []).length); }
async function fieldPuzzleSolve(id) {
  const pz = fieldPuzzleDef(id); if (!pz || fieldPuzzleSolved(id)) return;
  fieldState.flags[`puzzle:${id}`] = true;
  delete fieldPuzzleProgress[id];
  persistAutoSave();
  fieldEmit("puzzle:solve", { area: fieldState.area, floor: fieldState.floor, puzzleId: id });
  if (typeof playSe === "function") playSe("assets/se/unionskill/キラーン！", .6);
  fieldPuzzleRefresh(id);
  if (pz.solveScene) await fieldPlayScene(pz.solveScene);
}
async function fieldPuzzleInteract(o) {
  const id = o.puzzle, pz = fieldPuzzleDef(id); if (!pz || fieldState.lock) return;
  fieldPuzzleProgressSync();
  const solved = fieldPuzzleSolved(id);
  if (o.kind === "cache") {
    // 扉の奥の宝箱：報酬の受け渡しは Claude B の fieldPuzzleOpenCache（field/field-interactions.js の [SIDE]／[LOOT]）
    if (!solved) return;
    if (fieldState.flags[`puzzle:${id}:reward`]) { await fieldSay("宝箱は空っぽだ。"); return; }
    if (typeof fieldPuzzleOpenCache === "function") await fieldPuzzleOpenCache(o, pz);
    else await fieldSay("古い宝箱だ。今はまだ開けられない。");
    return;
  }
  if (o.kind === "door") {
    if (solved) return;
    if (pz.type === "hidden") {
      const choice = await fieldAsk(pz.askText || "調べてみますか？", ["体当たりする", "やめる"]);
      if (choice === 0 && !fieldPuzzleSolved(id)) await fieldPuzzleSolve(id);
      return;
    }
    if (pz.lockedScene) await fieldPlayScene(pz.lockedScene); else await fieldSay("固く閉ざされていて、びくともしない。");
    return;
  }
  // スイッチ
  if (solved) { await fieldSay("仕掛けはもう動いている。"); return; }
  if (pz.type === "all" && fieldState.flags[`puzzle:${id}:sw:${o.id}`]) { await fieldSay(pz.alreadyText || "このスイッチはもう入っている。"); return; }
  if (pz.type === "order" && (fieldPuzzleProgress[id] || []).includes(o.id)) { await fieldSay(pz.litText || "これはもう作動している。"); return; }
  const choice = await fieldAsk(pz.askText || "スイッチを入れますか？", ["はい", "いいえ"]);
  if (choice !== 0 || fieldPuzzleSolved(id)) return;
  if (typeof sound === "function") sound("select");
  if (pz.type === "lever") { await fieldPuzzleSolve(id); return; }
  if (pz.type === "all") {
    fieldState.flags[`puzzle:${id}:sw:${o.id}`] = true;
    persistAutoSave();
    fieldPuzzleRefresh(id);
    const on = pz.switches.filter(sw => fieldState.flags[`puzzle:${id}:sw:${sw}`]).length;
    await fieldSay(fieldPuzzleFill(pz.onText || "カチリ、と音がした。（{n}/{total}）", pz, on));
    if (on >= pz.switches.length) await fieldPuzzleSolve(id);
    return;
  }
  if (pz.type === "order") {
    const prog = [...(fieldPuzzleProgress[id] || []), o.id];
    const correct = prog.every((sw, i) => pz.order[i] === sw);
    if (!correct) {
      fieldPuzzleProgress[id] = [];
      fieldPuzzleRefresh(id);
      if (typeof sound === "function") sound("error");
      await fieldSay(pz.wrongText || "仕掛けが元に戻ってしまった……。");
      return;
    }
    fieldPuzzleProgress[id] = prog;
    fieldPuzzleRefresh(id);
    await fieldSay(fieldPuzzleFill(pz.progressText || "カチリ、と音がした。（{n}/{total}）", pz, prog.length));
    if (prog.length >= pz.order.length) await fieldPuzzleSolve(id);
  }
}

/* ------------------------------------------------------------
   [DOOR] 扉・ショートカット・隠し通路（仕掛け FIELD_PUZZLES に属さないもの）
   objects の定義：{ kind:"door", id, name, sprite,
     hidden:true        … 隠し通路。発見までは壁と同じ（描画・ミニマップ・視界・踏破率に出ない）。正面の壁を調べると見つかる
     oneWay:"left"等    … ショートカット扉。その向き側（例 "left"＝扉の西側）に立って調べたときだけ開く。反対側からは開かない
     requires:{ flag } または { item } … 鍵。条件を満たすまで開かない（lockedText で理由を表示） }
   開いた扉は fieldState.flags["door:<ID>:open"] に保存され、以後は床として通れる（FOE も通る）。
   ------------------------------------------------------------ */
function fieldDoorSideOk(o) {
  if (!o.oneWay || !FIELD_DIRS[o.oneWay]) return true;
  const d = FIELD_DIRS[o.oneWay], p = fieldPlayerTile();
  return p.tx === o.tx + d.dx && p.ty === o.ty + d.dy;
}
function fieldDoorReqOk(o) {
  const r = o.requires; if (!r) return true;
  if (r.flag && !fieldState.flags[r.flag]) return false;
  if (r.item && !((typeof inventory !== "undefined" && inventory[r.item]) > 0)) return false;
  return true;
}
function fieldDoorRefresh(o) {
  const a = fieldArea(), exp = fieldExplored(a), tiles = $("field-map")?.querySelector(".field-tiles")?.children;
  const el = document.querySelector(`#field-map .field-object[data-key="${CSS.escape(o.key)}"]`);
  if (el) { el.classList.remove("is-open", "is-one-way", "is-locked"); for (const k of fieldPuzzleObjectClass(o).split(" ").filter(Boolean)) el.classList.add(k); }
  const tile = tiles?.[o.ty * a.w + o.tx], wall = fieldWallLike(a, fieldTileAt(a, o.tx, o.ty));
  if (tile) { tile.classList.toggle("tile-wall", wall); tile.classList.toggle("tile-floor", !wall); tile.classList.toggle("is-edge", false); if (!exp[o.ty * a.w + o.tx]) tile.classList.add("is-unexplored"); }
  fieldState.lastTileKey = ""; fieldUpdateVision(true);
  fieldFoePlanAll(a);
  fieldMiniDirty = true;
}
async function fieldDoorOpenNow(o) {
  fieldState.flags[`door:${o.id}:open`] = true;
  persistAutoSave();
  fieldEmit(o.hidden ? "hidden:found" : "door:open", { area: fieldState.area, floor: fieldState.floor, objectId: o.key, doorId: o.id, oneWay: o.oneWay || null });
  if (typeof playSe === "function") playSe("assets/se/unionskill/キラーン！", .6);
  fieldDoorRefresh(o);
  if (o.openScene) await fieldPlayScene(o.openScene);
}
async function fieldDoorInteract(o) {
  if (fieldState.lock || fieldDoorOpen(o)) return;
  if (o.hidden) {
    const choice = await fieldAsk(o.askText || "壁の一部が、ほかと少し違う気がする……。調べてみますか？", ["調べる", "やめる"]);
    if (choice !== 0 || fieldDoorOpen(o)) return;
    await fieldDoorOpenNow(o);
    if (!o.openScene) await fieldSay("壁の向こうに、隠された通路を見つけた！");
    return;
  }
  if (!fieldDoorSideOk(o)) { await fieldSay(o.lockedText || "向こう側からかんぬきが掛かっていて、こちらからは開かない。"); return; }
  if (!fieldDoorReqOk(o)) { await fieldSay(o.lockedText || "鍵が掛かっている。"); return; }
  const choice = await fieldAsk(o.askText || (o.oneWay ? "かんぬきを外して、扉を開けますか？（近道になりそうだ）" : "扉を開けますか？"), ["開ける", "やめる"]);
  if (choice !== 0 || fieldDoorOpen(o)) return;
  await fieldDoorOpenNow(o);
  if (!o.openScene) await fieldSay(o.oneWay ? "扉が開いた。これで近道が通れるようになった。" : "扉が開いた。");
}
