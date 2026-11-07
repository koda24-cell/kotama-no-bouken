/* ============================================================
   field/field-movement-foe.js — 入力・移動・視界更新・FOEの巡回と追跡
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
function fieldUpdate(dt) {
  const a = fieldArea(); if (!a) return;
  const blocked = fieldState.lock || fieldState.mapOpen || fieldModalOpen() || !!fieldDialogAdvance || !!fieldChoiceState;
  const { dx, dy } = blocked ? { dx: 0, dy: 0 } : fieldInputVector();
  fieldState.moving = !!(dx || dy);
  let moved = 0;
  if (fieldState.moving) {
    if (dx && !dy) fieldState.dir = dx < 0 ? "left" : "right";
    else if (dy && !dx) fieldState.dir = dy < 0 ? "up" : "down";
    else {
      const keep = (fieldState.dir === "left" && dx < 0) || (fieldState.dir === "right" && dx > 0) || (fieldState.dir === "up" && dy < 0) || (fieldState.dir === "down" && dy > 0);
      if (!keep) fieldState.dir = dy < 0 ? "up" : "down";
    }
    const len = Math.hypot(dx, dy), v = FIELD_SPEED * dt / len;
    const ox = fieldState.x, oy = fieldState.y;
    const nx = fieldState.x + dx * v; if (!fieldBoxBlocked(a, nx, fieldState.y)) fieldState.x = nx;
    const ny = fieldState.y + dy * v; if (!fieldBoxBlocked(a, fieldState.x, ny)) fieldState.y = ny;
    moved = Math.hypot(fieldState.x - ox, fieldState.y - oy);
    fieldFrame++; if (fieldFrame % 8 === 0) fieldState.step = (fieldState.step + 1) % 4;
  } else { fieldState.step = 0; }
  fieldUpdateVision();
  // FOEはプレイヤーが動いた分だけ動く（世界樹の迷宮と同じく、止まって考えられる）
  if (moved > 0 && !blocked) fieldUpdateFoes(dt * Math.min(1, moved / Math.max(1e-6, FIELD_SPEED * dt)));
  if (moved > 0) fieldAfterMove(a, moved);
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
function fieldUpdateFoes(dt) {
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
    const speed = (f.mode === "chase" ? FIELD_FOE_SPEED.chase : FIELD_FOE_SPEED.patrol) * dt;
    const vx = goal.x - f.x, vy = goal.y - f.y, len = Math.hypot(vx, vy);
    if (len > .01) { const k = Math.min(1, speed / len); f.x += vx * k; f.y += vy * k; }
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

