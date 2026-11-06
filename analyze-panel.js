"use strict";
/* ============================================================
   analyze-panel.js — 戦闘中の「敵」「味方」状態パネル（[ANALYZE]）
   - 戦闘画面の右端のボタンで開閉する。常時表示はしない。
   - 読み取り専用。戦闘の進行・数値・乱数には一切触れない。
   - script.js の renderEnemyAnalysis() の末尾（// [ANALYZE]）から
     renderAnalyzePanel() が呼ばれ、開いている間は再描画のたびに更新される。
   - DOM・クラスは docs/field-and-story/FIELD_SPEC.md 6章。
   ============================================================ */
let analyzePanelTab = "enemy";

function analyzeStatusChip(label, turns, bad) {
  return `<span class="analyze-status ${bad ? "is-bad" : "is-good"}">${esc(label)}${Number.isFinite(turns) ? ` <b>${turns}T</b>` : ""}</span>`;
}

// 敵の状態変化（拡張の状態異常＋従来の個別フラグ）
function analyzeEnemyStatuses(e) {
  const chips = [];
  const bag = typeof extStatusBag === "function" ? extStatusBag(e, false) : null;
  if (bag) for (const [type, s] of Object.entries(bag)) {
    if (!(s.turns > 0)) continue;
    const def = EXT_STATUS_DEFS[type] || { label: type, icon: "", harm: true };
    chips.push(analyzeStatusChip(`${def.icon}${def.label}`, s.turns, def.harm));
  }
  if (Number(e._defenseDownTurns) > 0) chips.push(analyzeStatusChip("▼防御力低下", Number(e._defenseDownTurns), true));
  if (e.name === "オオカミ" && battleState.wolfEvasionTurns > 0) chips.push(analyzeStatusChip("警鐘・回避上昇", battleState.wolfEvasionTurns, false));
  if (battleState.enemyStunned) chips.push(analyzeStatusChip("行動不能", undefined, true));
  return chips;
}

// 味方の状態異常（拡張の状態異常＋火傷・防御低下・行動不能などの従来表示）
function analyzePartyStatuses(c) {
  const chips = [];
  const bag = typeof extStatusBag === "function" ? extStatusBag(c, false) : null;
  if (bag) for (const [type, s] of Object.entries(bag)) {
    if (!(s.turns > 0)) continue;
    const def = EXT_STATUS_DEFS[type] || { label: type, icon: "", harm: true };
    chips.push(analyzeStatusChip(`${def.icon}${def.label}`, s.turns, def.harm));
  }
  if (burnedTurns[c.id] > 0 && !(bag && bag.burn && bag.burn.turns > 0)) chips.push(analyzeStatusChip("🔥火傷", burnedTurns[c.id], true));
  if (c._defenseDownTurns > 0) chips.push(analyzeStatusChip("▼防御↓", c._defenseDownTurns, true));
  if (c.id === "imperial") {
    if (c._overheat) chips.push(analyzeStatusChip("OVERHEAT", undefined, true));
    else chips.push(analyzeStatusChip(`熱 ${c._heat || 0}/${typeof EXT_HEAT_LIMIT !== "undefined" ? EXT_HEAT_LIMIT : 6}`, undefined, false));
    if (c._xjCharge) chips.push(analyzeStatusChip("⚠無防備", undefined, true));
  }
  if (c.hp > 0 && typeof isActionIncapacitated === "function" && isActionIncapacitated(c)) chips.push(analyzeStatusChip("行動不能", undefined, true));
  if (battleState.guarding && battleState.guarding[c.id]) chips.push(analyzeStatusChip("防御中", undefined, false));
  if (battleState.tauntTarget === c.id) chips.push(analyzeStatusChip("挑発中", undefined, false));
  return chips;
}

function analyzeEnemyHtml() {
  const e = battleState.enemy;
  if (!e) return `<p class="analyze-empty">敵の情報はありません。</p>`;
  const counts = (typeof fieldEnemyEncounterCount === "function" && fieldEnemyEncounterCount(e)) || Number(enemyEncounterCounts[e.compendiumAs || e.name]) || 0;
  const known = counts >= 2;
  const data = enemyData.find(x => x.name === e.name) || e;
  const val = v => !known ? "？？？" : (v !== undefined && v !== null && Number.isFinite(Number(v)) ? Math.floor(Number(v)).toLocaleString("ja-JP") : "-");
  const list = v => known ? (Array.isArray(v) && v.length ? v.map(esc).join("・") : "なし") : "？？？";
  const spDefense = data.spDefense !== undefined ? data.spDefense : (Number.isFinite(data.defense) ? Math.floor(data.defense / 2) : undefined);
  const resist = [...(data.resistances || []), ...(data.physicalResistances || [])];
  const hpNow = typeof enemyHpTotal === "function" ? enemyHpTotal(e) : e.hp;
  const speed = typeof extEnemySpeed === "function" ? extEnemySpeed(e) : e.speed;
  const statuses = analyzeEnemyStatuses(e);
  const members = Array.isArray(e.members) ? `<span class="analyze-wide">残り <b>${e.members.filter(m => m.alive !== false && m.hp > 0).length} / ${e.members.length}体</b></span>` : "";
  const brk = e._breakMax ? `<span class="analyze-wide">ブレイク <b>${Math.max(0, Math.floor(e._breakCurrent || 0))} / ${e._breakMax}</b></span>` : "";
  return `<article class="analyze-card analyze-enemy ${known ? "is-known" : ""}">
    <header><strong>${esc(e.name)}</strong><small>${known ? "情報開示済み" : "未解析（もう一度遭遇すると開示）"}</small></header>
    <div class="analyze-grid">
      <span class="analyze-wide">HP <b>${known ? `${Math.max(0, Math.floor(hpNow)).toLocaleString("ja-JP")} / ${Math.floor(e.maxHp).toLocaleString("ja-JP")}` : "？？？"}</b></span>
      ${members}${brk}
      <span>攻撃 <b>${val(e.attack)}</b></span><span>防御 <b>${val(e.defense)}</b></span>
      <span>SP攻撃 <b>${val(e.spAttack)}</b></span><span>SP防御 <b>${val(spDefense)}</b></span>
      <span>速さ <b>${val(speed)}</b></span><span>属性 <b>${known ? esc(data.element || "無属性") : "？？？"}</b></span>
      <span class="analyze-wide">弱点 <b>${list(data.weaknesses)}</b></span>
      <span class="analyze-wide">耐性 <b>${list(resist)}</b></span>
    </div>
    <div class="analyze-statuses"><em>状態</em>${statuses.length ? statuses.join("") : `<span class="analyze-none">変化なし</span>`}</div>
  </article>`;
}

function analyzePartyHtml() {
  const party = getParty();
  if (!party.length) return `<p class="analyze-empty">味方の情報はありません。</p>`;
  return party.map(c => {
    const s = effectiveStats(c), u = unionSkills[c.id], g = battleState.unionGauges[c.id] || 0;
    const statuses = analyzePartyStatuses(c);
    const hpRate = Math.max(0, c.hp) / Math.max(1, s.maxHp) * 100, spRate = Math.max(0, c.sp) / Math.max(1, c.maxSp) * 100;
    return `<article class="analyze-card analyze-member ${c.hp <= 0 ? "is-down" : ""}" data-party-id="${esc(c.id)}">
      <header><strong>${typeof levelBadge === "function" ? levelBadge(c) : ""}${esc(c.name)}</strong><small>${c.hp <= 0 ? "戦闘不能" : ""}</small></header>${typeof levelExpBar === "function" ? levelExpBar(c) : ""}
      <div class="analyze-bars">
        <span>HP <b>${Math.max(0, c.hp)} / ${s.maxHp}</b><i><u style="width:${hpRate}%"></u></i></span>
        <span class="is-sp">SP <b>${Math.max(0, c.sp)} / ${c.maxSp}</b><i><u style="width:${spRate}%"></u></i></span>
      </div>
      <div class="analyze-grid analyze-grid-compact">
        <span>攻撃 <b>${typeof effectiveAttackPower === "function" ? effectiveAttackPower(c) : s.attack}</b></span>
        <span>防御 <b>${s.defense}</b></span>
        <span>SP攻撃 <b>${typeof effectiveSpAttackPower === "function" ? effectiveSpAttackPower(c) : s.spAttack}</b></span>
        <span>SP防御 <b>${s.spDefense}</b></span>
        <span>速さ <b>${Number.isFinite(s.speed) ? s.speed : "-"}</b></span>
        <span>UNION <b>${u ? `${g}/${u.requiredHits}` : "-"}</b></span>
      </div>
      <div class="analyze-statuses"><em>状態</em>${statuses.length ? statuses.join("") : `<span class="analyze-none">正常</span>`}</div>
    </article>`;
  }).join("");
}

function renderAnalyzePanel() {
  const panel = $("analyze-panel"), body = $("analyze-panel-body");
  document.querySelectorAll("[data-analyze]").forEach(b => b.setAttribute("aria-expanded", String(!!panel && !panel.hidden && b.dataset.analyze === analyzePanelTab)));
  if (!panel || !body || panel.hidden) return;
  panel.dataset.tab = analyzePanelTab;
  panel.querySelectorAll("[data-analyze-tab]").forEach(b => { const on = b.dataset.analyzeTab === analyzePanelTab; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
  try { body.innerHTML = analyzePanelTab === "party" ? analyzePartyHtml() : analyzeEnemyHtml(); }
  catch (error) { console.warn("[analyze] 表示に失敗:", error); body.innerHTML = `<p class="analyze-empty">情報を表示できません。</p>`; }
}

function openAnalyzePanel(tab) {
  const panel = $("analyze-panel"); if (!panel) return;
  // 同じタブのボタンをもう一度押したら閉じる（開閉式）
  if (!panel.hidden && analyzePanelTab === tab) { closeAnalyzePanel(); return; }
  analyzePanelTab = tab === "party" ? "party" : "enemy";
  panel.hidden = false;
  renderAnalyzePanel();
  if (typeof sound === "function") sound("select");
}
function closeAnalyzePanel() {
  const panel = $("analyze-panel"); if (!panel || panel.hidden) return;
  panel.hidden = true;
  renderAnalyzePanel();
  if (typeof sound === "function") sound("back");
}

function setupAnalyzePanel() {
  document.querySelectorAll("[data-analyze]").forEach(b => b.addEventListener("click", () => openAnalyzePanel(b.dataset.analyze)));
  document.querySelectorAll("[data-analyze-tab]").forEach(b => b.addEventListener("click", () => { analyzePanelTab = b.dataset.analyzeTab; renderAnalyzePanel(); if (typeof sound === "function") sound("move"); }));
  $("analyze-close")?.addEventListener("click", closeAnalyzePanel);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("analyze-panel")?.hidden) closeAnalyzePanel(); });
  // 戦闘画面を離れたら閉じる（次の戦闘で開きっぱなしにならないように）
  document.addEventListener("battle:start", () => { const p = $("analyze-panel"); if (p) p.hidden = true; renderAnalyzePanel(); });
  document.addEventListener("battle:end", () => { const p = $("analyze-panel"); if (p) p.hidden = true; renderAnalyzePanel(); });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupAnalyzePanel); else setupAnalyzePanel();
