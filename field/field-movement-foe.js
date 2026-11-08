"use strict";
/* ============================================================
   field/field-movement-foe.js — 入力・グリッド移動（1歩＝1ターン）・視界更新・ターン制FOEの巡回と追跡
   共通状態・定数は field.js を参照。index.html の読み込み順を維持すること。
   ============================================================ */
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
    if (k === "m" && !e.repeat) { if (!fieldDialogAdvance) fieldToggleFullMap(); return; }
    if (fieldState.mapOpen) { if (["x", "Escape", "z", "Enter"].includes(k)) fieldToggleFullMap(false); return; }
    if (["z", "Enter", " "].includes(k)) { if (!e.repeat) fieldActionPressed(); return; }
    if (["x", "Escape"].includes(k)) { if (fieldDialogAdvance) fieldActionPressed(); return; }
    fieldInput.keys.add(k);
    const tapDir = { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "up", w: "up", ArrowDown: "down", s: "down" }[k];
    if (tapDir && !e.repeat) fieldInput.tap = tapDir;   // [GRID] 一瞬のキー押下でも1歩進む
  });
  document.addEventListener("keyup", e => fieldInput.keys.delete(keyName(e)));
  window.addEventListener("blur", () => { fieldInput.keys.clear(); fieldInput.pad.clear(); fieldInput.tap = null; });
  document.querySelectorAll("#field-pad [data-dir]").forEach(btn => {
    const dir = btn.dataset.dir;
    const on = e => { e.preventDefault(); fieldInput.pad.add(dir); fieldInput.tap = dir; btn.classList.add("is-pressed"); try { btn.setPointerCapture(e.pointerId); } catch (_) {} };
    const off = () => { fieldInput.pad.delete(dir); btn.classList.remove("is-pressed"); };
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
// [GRID] 押している方向（1つ）。今の向きが押されていればそれを優先する
function fieldHeldDir() {
  const { dx, dy } = fieldInputVector();
  if (!dx && !dy) return null;
  const want = { left: dx < 0, right: dx > 0, up: dy < 0, down: dy > 0 };
  if (want[fieldState.dir]) return fieldState.dir;
  if (dy) return dy < 0 ? "up" : "down";
  return dx < 0 ? "left" : "right";
}
// [GRID] 1入力＝1マス。世界樹の迷宮と同じく、プレイヤーの1歩＝1ターンで、FOEもその1歩に対して動く
function fieldUpdate(dt) {
  const a = fieldArea(); if (!a) return;
  const blocked = fieldState.lock || fieldState.mapOpen || fieldModalOpen() || !!fieldDialogAdvance || !!fieldChoiceState;
  const now = performance.now();
  if (blocked) fieldInput.tap = null;
  if (!blocked && now >= fieldState.stepUntil) {
    const dir = fieldHeldDir() || fieldInput.tap;
    fieldInput.tap = null;
    if (dir) fieldTryStep(a, dir, now);
  }
  fieldState.moving = now < fieldState.stepUntil;
  if (!fieldState.moving) fieldState.step = 0;
  fieldAnimateView(dt);
  fieldUpdateVision();
  fieldUpdateNear();
  fieldUpdateDanger();
}
function fieldTryStep(a, dir, now = performance.now()) {
  const d = FIELD_DIRS[dir]; if (!d) return false;
  fieldSnapToTile();
  const turned = fieldState.dir !== dir;
  fieldState.dir = dir;
  const p = fieldPlayerTile(), tx = p.tx + d.dx, ty = p.ty + d.dy;
  if (!fieldCanEnter(a, tx, ty, "player")) {
    // 壁や扉に向き直るだけ（正面を調べられるように）。ターンは進まない
    if (turned) fieldState.stepUntil = now + FIELD_STEP_MS * .5;
    return false;
  }
  const from = { tx: p.tx, ty: p.ty }, c = fieldTileCenter(tx, ty);
  if (!fieldState.view) fieldState.view = { x: fieldState.x, y: fieldState.y };
  fieldState.x = c.x; fieldState.y = c.y;
  fieldState.stepUntil = now + FIELD_STEP_MS;
  fieldFrame++; fieldState.step = fieldFrame % 2 ? 1 : 3;
  fieldUpdateVision();
  // 1ターンの処理順：プレイヤー移動 → 接触判定 → FOE移動（すれ違いも接触） → 接触判定 → 歩数・エンカウント
  if (fieldFoeTurn(a, from)) return true;
  fieldAfterMove(a, FIELD_TILE);
  return true;
}
// 描画用の位置を論理位置へ近づける（見た目のなめらかさのためだけ）
function fieldAnimateView(dt) {
  const lerp = (v, target) => {
    if (!v) return null;
    const k = Math.min(1, (dt * 1000) / Math.max(1, FIELD_STEP_MS * .55));
    v.x += (target.x - v.x) * k; v.y += (target.y - v.y) * k;
    return Math.hypot(target.x - v.x, target.y - v.y) < .5 ? null : v;
  };
  fieldState.view = lerp(fieldState.view, fieldState);
  for (const f of fieldState.foes) f.view = lerp(f.view, f);
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
  // [GRID] 正面の1マス。開いた扉は調べる対象から外す
  const d = FIELD_DIRS[fieldState.dir] || FIELD_DIRS.down, p = fieldPlayerTile();
  const tx = p.tx + d.dx, ty = p.ty + d.dy;
  return a.objects.find(o => !o.walk && !(o.kind === "door" && fieldDoorOpen(o)) && o.tx === tx && o.ty === ty) || null;
}
function fieldUpdateNear() {
  const o = fieldState.lock ? null : fieldFacingObject(), key = o ? o.key : "";
  if (key === fieldState.nearKey) return;
  fieldState.nearKey = key;
  document.querySelectorAll("#field-map .field-object.is-near").forEach(el => el.classList.remove("is-near"));
  if (key) document.querySelector(`#field-map .field-object[data-key="${CSS.escape(key)}"]`)?.classList.add("is-near");
  $("field-action")?.classList.toggle("is-ready", !!key);
  if (typeof fieldRenderNear === "function") fieldRenderNear(o);   // 正面の案内（表示だけ。field-render.js）
}

/* ------------------------------------------------------------
   FOE
   ------------------------------------------------------------ */
function fieldFoeWalkable(a, tx, ty) { const c = fieldTileAt(a, tx, ty); return !fieldCharSolid(a, c) && !FIELD_SAFE.has(c); }
/* [FOE] FOEの定義（data/field-maps.js の floors[].foes[]）
     enemy  : FIELD_ENEMIES のID
     path   : 巡回する地点の列（マス座標）。1点だけなら、その場から動かない
     loop   : "pingpong"（往復・既定）｜"cycle"（周回）
     type   : "chaser"（既定。巡回し、見つけると追う）｜"patrol"（決まった道を巡回し続け、追わない）
              ｜"sentinel"（持ち場で向きを変えて見張り、見つけると追い、見失うと持ち場へ戻る）
     sight  : 気づく距離（既定 FIELD_FOE_SIGHT）。fov："front"（既定。前方と真横・すぐ隣だけ見える）｜"all"
     pace   : 1ターンに動くマス数（既定1。0.5＝2歩に1回、2＝1歩に2マス）
     dir    : 最初の向き。turns／turnEvery：sentinel が見張る向きの順番と、向きを変える間隔（ターン）
   ルール：1ターン＝プレイヤーの1歩。FOEは壁・閉じた扉・安全地帯（階段・出口・ボス門など）・物・他のFOEのマスに入らない。
           同じマスに入ったら接触（FOE戦）。見失うと最後に見た地点を確かめ、loseTurns ターンで巡回へ戻る。 */
function fieldFoeDirTo(from, to) {
  const dx = to.tx - from.tx, dy = to.ty - from.ty;
  if (!dx && !dy) return null;
  return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
}
function fieldFoePlace(f, tx, ty) { const c = fieldTileCenter(tx, ty); f.tx = tx; f.ty = ty; f.x = c.x; f.y = c.y; }
function fieldSpawnFoes() {
  const a = fieldArea(), host = $("field-foes");
  fieldState.foes = [];
  (a.floor.foes || []).forEach((def, i) => {
    const key = `foe:${a.key}:${i}`, path = (def.path || []).filter(p => Array.isArray(p) && p.length >= 2);
    if (!path.length) return;
    const p0 = path[0], c = fieldTileCenter(p0[0], p0[1]);
    const type = ["patrol", "sentinel"].includes(def.type) ? def.type : "chaser";
    const second = path[1] ? { tx: path[1][0], ty: path[1][1] } : null;
    const dir = FIELD_DIRS[def.dir] ? def.dir : (second && fieldFoeDirTo({ tx: p0[0], ty: p0[1] }, second)) || "down";
    fieldState.foes.push({ key, def, enemy: FIELD_ENEMIES[def.enemy], type, path, tx: p0[0], ty: p0[1], x: c.x, y: c.y, sx: c.x, sy: c.y, view: null,
      dir, mode: "patrol", pathIdx: path.length > 1 ? 1 : 0, pathStep: 1, paceAcc: 0, lostTurns: 0, lastSeen: null, nextTile: null, turnIdx: 0,
      lostAt: 0, next: null, defeated: !!fieldState.foeDefeated[key] });
  });
  if (host) host.innerHTML = fieldState.foes.map(f => `<div class="field-object field-foe" data-kind="foe" data-key="${esc(f.key)}" data-sprite="foe-${esc(f.enemy?.sprite || "monster")}" data-dir="${esc(f.dir)}" data-mode="${esc(f.mode)}" data-type="${esc(f.type)}"${f.defeated ? " hidden" : ""}><span class="field-object-sprite"></span><b class="field-object-label">FOE ${esc(f.enemy?.name || "")}</b></div>`).join("");
  fieldFoePlanAll(a);
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
// FOEにプレイヤーが見えているか（前方視野・距離・壁による見通し）
function fieldFoeSees(a, f, pt) {
  if (FIELD_SAFE.has(fieldTileAt(a, pt.tx, pt.ty))) return false;   // 安全地帯の上は見つからない
  const dx = pt.tx - f.tx, dy = pt.ty - f.ty, dist = Math.hypot(dx, dy);
  if (dist > (Number(f.def.sight) || FIELD_FOE_SIGHT)) return false;
  if (dist > FIELD_FOE_RULES.nearSight && f.def.fov !== "all") {
    const d = FIELD_DIRS[f.dir] || FIELD_DIRS.down;
    if (dx * d.dx + dy * d.dy < 0) return false;   // 真後ろ側は見えない（真横は見える）
  }
  return fieldLos(a, f.tx, f.ty, pt.tx, pt.ty);
}
// 気づく・見失う（ターンの最初と、動いた後に判定）
function fieldFoeAwareness(a, f, pt, countTurn) {
  if (f.type === "patrol") { f.mode = "patrol"; return; }
  if (fieldFoeSees(a, f, pt)) {
    if (f.mode !== "chase") fieldEmit("foe:notice", { key: f.key, enemyName: f.enemy?.name });
    f.mode = "chase"; f.lostTurns = 0; f.lastSeen = { tx: pt.tx, ty: pt.ty };
    return;
  }
  if (f.mode === "chase") { f.mode = "search"; f.lostTurns = 0; }
  if (f.mode === "search" && countTurn) {
    f.lostTurns++;
    const there = f.lastSeen && f.tx === f.lastSeen.tx && f.ty === f.lastSeen.ty;
    if (there || f.lostTurns > FIELD_FOE_RULES.loseTurns) {
      f.mode = "return"; f.lastSeen = null;
      // 巡回路のうち、いちばん近い地点へ戻る
      let best = 0, bd = Infinity;
      f.path.forEach((p, i) => { const d = Math.abs(p[0] - f.tx) + Math.abs(p[1] - f.ty); if (d < bd) { bd = d; best = i; } });
      f.pathIdx = best;
      fieldEmit("foe:lost", { key: f.key, enemyName: f.enemy?.name });
    }
  }
}
// 次に向かうマス（commit=true のとき巡回の進み具合を更新する）
function fieldFoeTarget(a, f, pt, commit) {
  if (f.mode === "chase") return fieldFoeWalkable(a, pt.tx, pt.ty) ? pt : f.lastSeen;
  if (f.mode === "search") return f.lastSeen;
  let idx = f.pathIdx, stepDir = f.pathStep;
  let wp = f.path[idx];
  if (f.tx === wp[0] && f.ty === wp[1]) {
    if (f.mode === "return" && commit) f.mode = "patrol";
    if (f.path.length > 1) {
      if (f.def.loop === "cycle") idx = (idx + 1) % f.path.length;
      else { if (idx + stepDir < 0 || idx + stepDir >= f.path.length) stepDir = -stepDir; idx += stepDir; }
      wp = f.path[idx];
    }
    if (commit) { f.pathIdx = idx; f.pathStep = stepDir; }
  }
  return { tx: wp[0], ty: wp[1] };
}
function fieldFoeNextStep(a, f, pt, commit) {
  const target = fieldFoeTarget(a, f, pt, commit);
  if (!target) return null;
  const step = fieldBfsStep(a, { tx: f.tx, ty: f.ty }, target);
  if (!step) return null;
  // 接触のため、プレイヤーのマスにだけは入れる（安全地帯は fieldFoeWalkable で除外済み）
  const onPlayer = step.tx === pt.tx && step.ty === pt.ty && fieldFoeWalkable(a, pt.tx, pt.ty);
  if (!onPlayer && !fieldCanEnter(a, step.tx, step.ty, "foe", f)) return null;
  return step;
}
function fieldFoeContact(f, pt) { return !f.defeated && f.tx === pt.tx && f.ty === pt.ty; }
// 1ターン分のFOEの行動。接触したら FOE 戦を始めて true を返す
function fieldFoeTurn(a, playerFrom) {
  fieldState.turn++;
  const pt = fieldPlayerTile();
  // 自分からFOEのマスに入れば、止まっている間でも接触になる（FOEは動いていない）
  for (const f of fieldState.foes) if (fieldFoeContact(f, pt)) { fieldFoeStartContact(f, null, playerFrom); return true; }
  if (fieldState.foeGraceSteps > 0) { fieldState.foeGraceSteps--; fieldFoePlanAll(a); fieldMiniDirty = true; return false; }
  for (const f of fieldState.foes) {
    if (f.defeated) continue;
    fieldFoeAwareness(a, f, pt, true);
    f.paceAcc += Number(f.def.pace) > 0 ? Number(f.def.pace) : 1;
    let moved = false;
    while (f.paceAcc >= 1) {
      f.paceAcc -= 1;
      const step = fieldFoeNextStep(a, f, pt, true);
      if (!step) break;
      if (!f.view) f.view = { x: f.x, y: f.y };
      const from = { tx: f.tx, ty: f.ty };
      f.dir = fieldFoeDirTo(from, step) || f.dir;
      fieldFoePlace(f, step.tx, step.ty); moved = true;
      if (fieldFoeContact(f, pt)) { fieldFoeStartContact(f, from, playerFrom); return true; }
      fieldFoeAwareness(a, f, pt, false);
    }
    // 持ち場で止まっている見張りは、決まった順に向きを変える
    if (!moved && f.mode === "patrol" && f.path.length === 1) {
      const turns = (f.def.turns || []).filter(d => FIELD_DIRS[d]), every = Math.max(1, Number(f.def.turnEvery) || 2);
      if (turns.length && fieldState.turn % every === 0) { f.turnIdx = (f.turnIdx + 1) % turns.length; f.dir = turns[f.turnIdx]; fieldFoeAwareness(a, f, pt, false); }
    }
  }
  fieldFoePlanAll(a);
  fieldMiniDirty = true;
  return false;
}
// FOE戦の開始。逃げたときに位置を戻せるよう、接触の直前の位置を覚えておく
function fieldFoeStartContact(f, foeFrom, playerFrom) {
  fieldState.foeContact = { key: f.key, foeFrom: foeFrom ? { ...foeFrom } : null, playerFrom: playerFrom ? { tx: playerFrom.tx, ty: playerFrom.ty } : null };
  fieldTriggerFoeBattle(f);
}
// 表示用：次の1歩の予定（状態は変えない）
function fieldFoePlanAll(a) {
  const pt = fieldPlayerTile();
  for (const f of fieldState.foes) {
    if (f.defeated) { f.nextTile = null; continue; }
    const saved = { pathIdx: f.pathIdx, pathStep: f.pathStep, mode: f.mode };
    f.nextTile = fieldState.foeGraceSteps > 0 ? null : fieldFoeNextStep(a, f, pt, false);
    Object.assign(f, saved);
  }
}
// 旧API（互換用）：同じマスにいるFOEとの接触
function fieldCheckFoeContact() {
  if (fieldState.lock) return;
  const pt = fieldPlayerTile();
  for (const f of fieldState.foes) if (fieldFoeContact(f, pt)) { fieldFoeStartContact(f, null, null); return; }
}
// 旧API（互換用）：1ターン進める
function fieldUpdateFoes() { const a = fieldArea(); if (a) fieldFoeTurn(a, fieldPlayerTile()); }
function fieldRenderFoes() {
  const a = fieldArea(), exp = fieldExplored(a);
  for (const f of fieldState.foes) {
    const el = document.querySelector(`#field-foes [data-key="${CSS.escape(f.key)}"]`); if (!el) continue;
    if (f.defeated) { el.hidden = true; continue; }
    const v = f.view || f;
    el.hidden = false;
    el.classList.toggle("is-unexplored", !exp[f.ty * a.w + f.tx]);
    el.classList.toggle("is-chasing", f.mode === "chase");
    if (el.dataset.mode !== f.mode) el.dataset.mode = f.mode;
    if (el.dataset.dir !== f.dir) el.dataset.dir = f.dir;
    el.style.left = (v.x - 16) + "px"; el.style.top = (v.y - 20) + "px"; el.style.zIndex = String(10 + Math.floor(v.y));
  }
}
// FOE戦のあと。世界樹の迷宮と同じく、逃げたときはプレイヤーはそのマスに残り、FOEが移動前のマスへ戻る（1歩分の猶予ができる）。
// プレイヤーが自分からFOEのマスに入った場合（FOEは動いていない）は、プレイヤーが入る前のマスへ戻る（この場合の扱いは推測）。
// 他のFOEは動かさない。
function fieldResetFoesAfterBattle(defeatedKey) {
  const a = fieldArea(), contact = fieldState.foeContact;
  fieldState.foeContact = null;
  for (const f of fieldState.foes) {
    if (f.key === defeatedKey) { f.defeated = true; fieldState.foeDefeated[f.key] = true; continue; }
    f.lostAt = 0; f.paceAcc = 0;
  }
  const f = contact && fieldState.foes.find(x => x.key === contact.key && !x.defeated);
  if (f && a) {
    const free = p => p && fieldCanEnter(a, p.tx, p.ty, "player") && !fieldState.foes.some(x => x !== f && !x.defeated && x.tx === p.tx && x.ty === p.ty);
    const pt = fieldPlayerTile();
    if (contact.foeFrom && free(contact.foeFrom) && !(contact.foeFrom.tx === pt.tx && contact.foeFrom.ty === pt.ty)) {
      fieldFoePlace(f, contact.foeFrom.tx, contact.foeFrom.ty); f.view = null;
    } else if (contact.playerFrom && free(contact.playerFrom)) {
      const c = fieldTileCenter(contact.playerFrom.tx, contact.playerFrom.ty);
      fieldState.x = c.x; fieldState.y = c.y; fieldState.view = null;
    }
    if (f.type !== "patrol") { f.mode = "chase"; f.lostTurns = 0; f.lastSeen = { ...fieldPlayerTile() }; }
  }
  fieldState.foeGraceSteps = FIELD_FOE_RULES.graceSteps;
  fieldState.foeGraceUntil = 0;
  if (a) fieldFoePlanAll(a);
}
