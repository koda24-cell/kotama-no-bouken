"use strict";
/* ============================================================
   job.js — 職業変更（[JOB]）
   ------------------------------------------------------------
   ・キャラクター個体（characters の各要素）と職業を分離する。
     - 個体の識別子は従来どおり c.id（変更しない）。Lv・経験値・装備・育成値・
       スキルツリー・育成ポイント・ユニオンは個体（c.id）に紐づいたまま。
     - 職業は characterJobs[個体ID] = 職業ID で持つ。未設定なら個体ID＝職業ID（従来どおり）。
   ・職業テンプレートは、起動直後の各キャラクターの素データ（＝その職業の基礎値）から作る。
     職業を変えると、テンプレートの基礎能力値・SPスキル・素早さを個体に写す。
   ・script.js からは typeof ガード付きで呼ぶ（[JOB] の目印）。
   ・詳細は docs/specs/job-change/IMPLEMENTATION_NOTES.md。
   ============================================================ */

const JOB_LEVEL_PENALTY = 5;      // 職業変更で下がるレベル
const JOB_BASE_IDS = ["kotama", "knight", "healer", "warrior", "mage", "samurai"];
const JOB_BASE_NAMES = { kotama: "冒険者", knight: "騎士", healer: "治癒士", warrior: "戦士", mage: "魔術師", samurai: "武士" };
// テンプレートとして個体に写す項目（職業の基礎データ）。名前・画像・紋章は個体側のまま。
const JOB_TEMPLATE_FIELDS = ["maxHp", "attack", "spAttack", "defense", "spDefense", "guardCut", "maxSp", "spSkills", "speed"];

const characterJobs = {};          // 個体ID → 職業ID（個体IDと同じ職業のときは保存しない）
let jobTemplateCache = null;

/* ---------- 職業データ ---------- */
// 最初に呼ばれた時点（＝職業を一度も写していない状態）の素データを控える。
function jobTemplates() {
  if (jobTemplateCache) return jobTemplateCache;
  jobTemplateCache = {};
  for (const c of characters) {
    const t = {};
    for (const key of JOB_TEMPLATE_FIELDS) if (key in c) t[key] = JSON.parse(JSON.stringify(c[key]));
    jobTemplateCache[c.id] = t;
  }
  return jobTemplateCache;
}
function jobIsKnown(jobId) { return Object.prototype.hasOwnProperty.call(jobTemplates(), jobId); }
function jobOf(c) {
  const id = typeof c === "string" ? c : c?.id;
  const job = characterJobs[id];
  return job && jobIsKnown(job) ? job : id;
}
function jobDisplayName(jobId) {
  if (JOB_BASE_NAMES[jobId]) return JOB_BASE_NAMES[jobId];
  const ext = (typeof EXT_NEW_JOBS !== "undefined" ? EXT_NEW_JOBS : []).find(j => j.id === jobId);
  return ext ? ext.name : jobId;
}
// 解放済みの職業：基本6職業は常に解放。新職業は既存の解放条件（state.unlockedJobs）に従う。
function jobIsUnlocked(jobId) {
  if (JOB_BASE_IDS.includes(jobId)) return true;
  return typeof extJobsUnlocked === "function" && extJobsUnlocked().includes(jobId);
}
function jobUnlockedList() { return Object.keys(jobTemplates()).filter(jobIsUnlocked); }

/* ---------- 個体への適用 ---------- */
function jobApplyTemplate(c, jobId) {
  const t = jobTemplates()[jobId]; if (!c || !t) return;
  for (const key of JOB_TEMPLATE_FIELDS) {
    if (key in t) c[key] = JSON.parse(JSON.stringify(t[key]));
    else delete c[key];   // 例：spDefense を持たない職業では防御力から算出する従来の扱いに戻す
  }
}
// 職業ごとの装備枠（武士は刀2本、それ以外は武器1つ）。script.js の equipmentSlots と同じ構成。
function jobSlotKeys(jobId) {
  return jobId === "samurai" ? ["katana1", "katana2", "armor", "accessory1", "accessory2"] : ["weapon", "armor", "accessory1", "accessory2"];
}
// 新しい職業で外れる装備（枠が無い／適性が無い）
function jobGearToRemove(charId, jobId) {
  const slots = jobSlotKeys(jobId), eq = equipment[charId] || {}, out = [];
  for (const [slot, itemId] of Object.entries(eq)) {
    if (!itemId) continue;
    const item = itemById(itemId);
    if (!slots.includes(slot)) out.push({ slot, itemId, reason: "装備枠なし" });
    else if (item && Array.isArray(item.classes) && !item.classes.includes(jobId)) out.push({ slot, itemId, reason: "適性なし" });
  }
  return out;
}

/* ---------- 変更の可否 ---------- */
function jobChangeBlockReason(charId, jobId) {
  const c = getCharacter(charId);
  if (!c) return "キャラクターが見つかりません。";
  if (!jobIsKnown(jobId)) return "職業データが見つかりません。";
  if (!jobIsUnlocked(jobId)) return `${jobDisplayName(jobId)}はまだ解放されていません。`;
  if (jobOf(c) === jobId) return "現在の職業と同じです。";
  if (state.screen === "battle") return "戦闘中は職業を変更できません。";
  if (typeof tutorialState !== "undefined" && tutorialState.started && !tutorialState.completed) return "チュートリアル中は職業を変更できません。";
  return "";
}

/* ---------- プレビュー（データは変更しない） ---------- */
// 一時的に職業・レベル・装備を切り替えて effectiveStats を計算し、必ず元に戻す。
function jobWithTemporaryState(c, jobId, level, removeGear, fn) {
  const saved = { job: characterJobs[c.id], level: characterLevels[c.id], eq: { ...(equipment[c.id] || {}) }, fields: {} };
  for (const key of JOB_TEMPLATE_FIELDS) saved.fields[key] = key in c ? c[key] : undefined;
  try {
    if (jobId === c.id) delete characterJobs[c.id]; else characterJobs[c.id] = jobId;
    jobApplyTemplate(c, jobId);
    characterLevels[c.id] = level;
    if (removeGear) for (const g of removeGear) equipment[c.id][g.slot] = null;
    return fn();
  } finally {
    if (saved.job === undefined) delete characterJobs[c.id]; else characterJobs[c.id] = saved.job;
    for (const key of JOB_TEMPLATE_FIELDS) { if (saved.fields[key] === undefined) delete c[key]; else c[key] = saved.fields[key]; }
    characterLevels[c.id] = saved.level;
    equipment[c.id] = saved.eq;
  }
}
function jobChangePreview(charId, jobId) {
  const c = getCharacter(charId); if (!c) return null;
  const fromJob = jobOf(c), fromLevel = levelOf(c), toLevel = Math.max(1, fromLevel - JOB_LEVEL_PENALTY);
  const gear = jobGearToRemove(c.id, jobId);
  const before = effectiveStats(c);
  const after = jobWithTemporaryState(c, jobId, toLevel, gear, () => effectiveStats(c));
  const skillNames = job => (jobTemplates()[job]?.spSkills || []).map(s => s.name);
  return {
    c, fromJob, toJob: jobId, fromLevel, toLevel, gear,
    before, after,
    skillsBefore: skillNames(fromJob), skillsAfter: skillNames(jobId),
    expLost: levelExpNow(c)
  };
}

/* ---------- 確定 ---------- */
function jobChange(charId, jobId) {
  const reason = jobChangeBlockReason(charId, jobId);
  if (reason) return { ok: false, reason };
  const c = getCharacter(charId);
  const fromJob = jobOf(c), fromLevel = levelOf(c), toLevel = Math.max(1, fromLevel - JOB_LEVEL_PENALTY);
  const hpRate = effectiveStats(c).maxHp > 0 ? c.hp / effectiveStats(c).maxHp : 1;
  const spRate = c.maxSp > 0 ? c.sp / c.maxSp : 1;
  // 1) 合わない装備を所持品へ戻す（消失させない）
  const removed = jobGearToRemove(c.id, jobId);
  for (const g of removed) { equipment[c.id][g.slot] = null; inventory[g.itemId] = (inventory[g.itemId] || 0) + 1; }
  // 2) 職業を切り替え、基礎データを写す
  if (jobId === c.id) delete characterJobs[c.id]; else characterJobs[c.id] = jobId;
  jobApplyTemplate(c, jobId);
  // 3) レベルを5下げる（下限1）。レベル内の経験値は0に戻す（level.js：レベルが正本、経験値はそのレベル内の進捗）
  characterLevels[c.id] = toLevel;
  if (typeof levelExp !== "undefined") delete levelExp[c.id];
  // 4) 現在HP・SPは割合を保つ（戦闘不能の個体は0のまま）
  const maxHp = effectiveStats(c).maxHp;
  c.hp = c.hp <= 0 ? 0 : Math.max(1, Math.min(maxHp, Math.round(maxHp * hpRate)));
  c.sp = Math.max(0, Math.min(c.maxSp, Math.round(c.maxSp * spRate)));
  return { ok: true, fromJob, toJob: jobId, fromLevel, toLevel, removed };
}

/* ---------- セーブ／ロード ---------- */
function jobSerialize() {
  const out = {};
  for (const [id, job] of Object.entries(characterJobs)) if (job && job !== id && jobIsKnown(job)) out[id] = job;
  return out;
}
// loadGame から、能力値を使う処理（combatants のHP復元など）より前に呼ぶ。
// 旧セーブ（characterJobs なし）では全員が本来の職業のまま。
function jobDeserialize(d) {
  jobTemplates();
  for (const k of Object.keys(characterJobs)) delete characterJobs[k];
  if (d && typeof d === "object") {
    for (const c of characters) {
      const job = d[c.id];
      if (typeof job === "string" && job !== c.id && jobIsKnown(job) && jobIsUnlocked(job)) characterJobs[c.id] = job;
    }
  }
  for (const c of characters) jobApplyTemplate(c, jobOf(c));
}

/* ---------- 画面（育成画面に差し込む） ---------- */
let jobSelectedCharId = null;
function jobRenderSection(box) {
  if (!box || box.querySelector(".job-change-section")) return;
  const list = typeof extAvailableCharacters === "function" ? extAvailableCharacters() : characters;
  if (!list.length) return;
  if (!list.some(c => c.id === jobSelectedCharId)) jobSelectedCharId = (list.find(c => c.id === shopBuyerId) || list[0]).id;
  const c = getCharacter(jobSelectedCharId), current = jobOf(c);
  const jobs = jobUnlockedList().filter(id => id !== current);
  const section = document.createElement("section");
  section.className = "job-change-section";
  section.innerHTML =
    `<h3>職業変更</h3>` +
    `<p class="job-change-note">解放済みの職業に変更できます。変更すると<strong>レベルが${JOB_LEVEL_PENALTY}下がります</strong>（下限Lv.1）。装備・育成値・スキルツリーは引き継がれます。</p>` +
    `<label class="job-change-picker">対象<select data-job-char>${list.map(x => `<option value="${esc(x.id)}" ${x.id === c.id ? "selected" : ""}>${esc(x.name)}（${esc(jobDisplayName(jobOf(x)))} Lv.${levelOf(x)}）</option>`).join("")}</select></label>` +
    `<p class="job-change-current">現在の職業：<strong>${esc(jobDisplayName(current))}</strong>${current !== c.id ? `（本来：${esc(jobDisplayName(c.id))}）` : ""} ／ Lv.${levelOf(c)}</p>` +
    `<div class="job-change-list">${jobs.map(id => `<button type="button" data-job-to="${esc(id)}">${esc(jobDisplayName(id))}に変更</button>`).join("") || "<p>変更できる職業がありません。</p>"}</div>`;
  box.appendChild(section);
  section.querySelector("[data-job-char]").onchange = e => { jobSelectedCharId = e.target.value; renderProgressionPanel(); };
  section.querySelectorAll("[data-job-to]").forEach(btn => btn.onclick = () => jobOpenDialog(c.id, btn.dataset.jobTo, btn));
}

function jobCloseDialog() {
  const d = document.getElementById("job-change-dialog"); if (d) d.remove();
}
function jobOpenDialog(charId, jobId, returnFocus) {
  const reason = jobChangeBlockReason(charId, jobId);
  if (reason) { setSystemMessage(reason); return; }
  const p = jobChangePreview(charId, jobId); if (!p) return;
  jobCloseDialog();
  const rows = [["最大HP", "maxHp"], ["攻撃力", "attack"], ["防御力", "defense"], ["SP攻撃力", "spAttack"], ["SP防御力", "spDefense"], ["最大SP", "maxSp"], ["素早さ", "speed"]];
  const itemName = id => itemById(id)?.name || id;
  const dialog = document.createElement("section");
  dialog.id = "job-change-dialog"; dialog.className = "game-dialog job-change-dialog";
  dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true"); dialog.setAttribute("aria-labelledby", "job-change-title");
  dialog.innerHTML =
    `<div class="game-dialog-panel job-change-panel">` +
      `<h2 id="job-change-title">職業変更の確認</h2>` +
      `<p class="job-change-name">${esc(p.c.name)}：${esc(jobDisplayName(p.fromJob))} → <strong>${esc(jobDisplayName(p.toJob))}</strong></p>` +
      `<table class="job-change-table"><thead><tr><th></th><th>変更前</th><th>変更後</th></tr></thead><tbody>` +
        `<tr><th>レベル</th><td>Lv.${p.fromLevel}</td><td>Lv.${p.toLevel}</td></tr>` +
        rows.map(([label, key]) => `<tr><th>${label}</th><td>${p.before[key] ?? "-"}</td><td>${p.after[key] ?? "-"}</td></tr>`).join("") +
        `<tr><th>SPスキル</th><td>${esc(p.skillsBefore.join("・") || "なし")}</td><td>${esc(p.skillsAfter.join("・") || "なし")}</td></tr>` +
      `</tbody></table>` +
      (p.gear.length ? `<p class="job-change-warn">外れて所持品に戻る装備：${p.gear.map(g => `${esc(itemName(g.itemId))}（${g.reason}）`).join("、")}</p>` : "") +
      `<p class="job-change-warn">レベル内の経験値（${p.expLost}）は0に戻ります。獲得済みの育成ポイントはそのままです。</p>` +
      `<p class="job-change-note">スキルツリー・ユニオンスキル・職業固有の戦闘補正は、現時点では個体側に残ります。</p>` +
      `<div class="dialog-actions"><button type="button" class="secondary-button" data-job-cancel>キャンセル</button><button type="button" class="primary-button" data-job-confirm disabled>変更する</button></div>` +
    `</div>`;
  document.body.appendChild(dialog);
  const cancel = dialog.querySelector("[data-job-cancel]"), confirm = dialog.querySelector("[data-job-confirm]");
  const close = () => { jobCloseDialog(); if (returnFocus && returnFocus.isConnected) returnFocus.focus(); };
  cancel.onclick = close;
  dialog.addEventListener("click", e => { if (e.target === dialog) close(); });
  dialog.addEventListener("keydown", e => { if (e.key === "Escape") { e.preventDefault(); close(); } });
  // 開いた直後の連打で確定しないよう、少し待ってから押せるようにする（PR #26 A-01 の教訓）
  setTimeout(() => { if (confirm.isConnected) confirm.disabled = false; }, 400);
  let done = false;
  confirm.onclick = () => {
    if (done) return; done = true; confirm.disabled = true;
    const r = jobChange(charId, jobId);
    jobCloseDialog();
    renderAll();
    if (!r.ok) { setSystemMessage(r.reason); return; }
    if (typeof persistAutoSave === "function") persistAutoSave();
    const removedText = r.removed.length ? ` 外れた装備：${r.removed.map(g => itemName(g.itemId)).join("、")}（所持品に戻しました）。` : "";
    setSystemMessage(`${p.c.name}が${jobDisplayName(r.toJob)}に転職しました（Lv.${r.fromLevel}→Lv.${r.toLevel}）。${removedText}`);
  };
  cancel.focus();
}
