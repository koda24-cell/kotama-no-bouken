"use strict";
/* ============================================================
   field/field-dialog.js — 会話ウィンドウ・選択肢・ストーリー再生
   共通状態・定数は field.js を参照。index.html の読み込み順を維持すること。
   ============================================================ */
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

