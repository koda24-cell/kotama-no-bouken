"use strict";
/* ============================================================
   field/field-interactions.js — 調べる・宝箱・採集・階段・戦闘遷移
   共通状態・定数は field.js を参照。index.html の読み込み順を維持すること。
   ============================================================ */
/* ------------------------------------------------------------
   調べる・踏む
   ------------------------------------------------------------ */
async function fieldInteract(o) {
  if (fieldState.lock) return;
  if (o.kind === "npc" || o.kind === "sign") {
    await fieldPlayScene(o.scene);
    if (o.sideEvents && typeof fieldRunNpcSideEvents === "function") await fieldRunNpcSideEvents(o);   // [SIDE]（Claude B）
    return;
  }
  if (o.kind === "event") { if (typeof fieldRunSideEvent === "function") await fieldRunSideEvent(o.event, o); return; }   // [SIDE]（Claude B）
  if (o.kind === "door" && !o.puzzle) { await fieldDoorInteract(o); return; }   // [DOOR] field/field-puzzles.js
  if (o.kind === "switch" || o.kind === "door" || o.kind === "cache") { await fieldPuzzleInteract(o); return; }   // [PUZZLE] field/field-puzzles.js
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
  fieldState.nextEncounter = enc.min + Math.floor(Math.random() * (enc.max - enc.min + 1));
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

