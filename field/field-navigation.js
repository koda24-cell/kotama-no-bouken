"use strict";
/* ============================================================
   field/field-navigation.js — 探索画面の出入り・階層選択
   共通状態・定数は field.js を参照。index.html の読み込み順を維持すること。
   ============================================================ */
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

