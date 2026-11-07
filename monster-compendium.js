"use strict";
/* ============================================================
   monster-compendium.js — モンスター図鑑（全敵対応）
   - 図鑑の対象：ステージボス5種・隠しボス・ステージ亜種（data/enemy-variants.js）・
     迷宮の通常敵とFOE（data/field-maps.js の FIELD_ENEMIES）。
   - 敵IDを主キーにして、遭遇・討伐を monsterRecords に記録する。
       boss-1〜boss-5 … ステージボス（enemyData の順）
       hidden-boss     … 隠しボス「混沌の幻影」
       variant:<variantId> … ステージ亜種
       field:<FIELD_ENEMIES のID> … 迷宮の通常敵・FOE（foe:true で区別）
   - 能力値は既存の敵データを参照する（図鑑用に複製しない）。
   - 既存の名前キーの compendium（ボス5種＋隠しボス）は、隠しボス解放条件・実績が
     参照しているため、従来どおり script.js の registerEncounter／registerDefeat で更新する。
     ここではそれに加えて ID 単位の記録を行うだけで、既存の判定は変えない。
   - セーブ：createSaveData() の monsterRecords。旧セーブ（項目なし）は全敵を未遭遇で
     初期化し、旧 compendium・迷宮の遭遇回数から分かる範囲だけ引き継ぐ。
   ============================================================ */
const monsterRecords = {};

const MONSTER_CATEGORY_LABELS = { boss: "ステージボス", hidden: "隠しボス", normal: "迷宮の通常敵", variant: "亜種", foe: "FOE" };
const MONSTER_CATEGORY_ORDER = ["boss", "hidden", "normal", "foe", "variant"];

// 図鑑の対象一覧。実データへの参照（data()）だけを持ち、数値はコピーしない。
function monsterCompendiumEntries() {
  const list = [];
  (typeof enemyData !== "undefined" ? enemyData : []).forEach((d, i) => {
    list.push({ id: `boss-${i + 1}`, category: "boss", name: d.name, data: () => enemyData[i], where: `STAGE ${i + 1} のボス`, legacyName: d.name });
  });
  list.push({ id: "hidden-boss", category: "hidden", name: "混沌の幻影", data: () => (typeof hiddenBossData !== "undefined" ? hiddenBossData : null), where: "隠しステージのボス", legacyName: "混沌の幻影" });
  if (typeof FIELD_ENEMIES !== "undefined") {
    for (const [id, e] of Object.entries(FIELD_ENEMIES)) {
      list.push({ id: `field:${id}`, category: e.foe ? "foe" : "normal", name: e.name, data: () => FIELD_ENEMIES[id], where: monsterFieldWhere(id, !!e.foe), fieldScaled: !e.foe });
    }
  }
  if (typeof EXT_ENEMY_VARIANTS !== "undefined") {
    for (const [stage, vs] of Object.entries(EXT_ENEMY_VARIANTS)) {
      vs.forEach((v, i) => {
        list.push({ id: `variant:${v.variantId}`, category: "variant", name: v.name, data: () => EXT_ENEMY_VARIANTS[stage][i], where: `STAGE ${stage}（クリア後、${v.baseName}の代わりに出現）` });
      });
    }
  }
  return list;
}
function monsterEntryById(id) { return monsterCompendiumEntries().find(e => e.id === id) || null; }

// 迷宮のどの階層・フロアに出るかを data/field-maps.js から求める（表示用）。
function monsterFieldWhere(fieldId, isFoe) {
  if (typeof FIELD_AREAS === "undefined") return "迷宮";
  const parts = [];
  for (const [n, area] of Object.entries(FIELD_AREAS)) {
    const floors = [];
    (area.floors || []).forEach((f, fi) => {
      const hit = isFoe ? (f.foes || []).some(x => x.enemy === fieldId) : (f.encounter?.table || []).some(x => x.enemy === fieldId);
      if (hit) floors.push(`${fi + 1}F`);
    });
    if (floors.length) parts.push(`第${n}階層 ${floors.join("・")}`);
  }
  return parts.length ? parts.join("／") + (isFoe ? "（マップを巡回）" : "") : "迷宮";
}

// 戦闘中の敵オブジェクトから図鑑IDを決める。チュートリアル戦は対象外。
function monsterCompendiumIdForEnemy(e) {
  if (!e || battleState.tutorialMode) return null;
  if (battleState.hiddenBossMode || e.name === "混沌の幻影") return "hidden-boss";
  if (e.variantId) return `variant:${e.variantId}`;
  if (e.fieldEnemyId) return `field:${e.fieldEnemyId}`;
  if (battleState.encounterMode && battleState.fieldEnemyId) return `field:${battleState.fieldEnemyId}`;
  const stage = Number(battleState.stage) || 0;
  if (stage >= 1 && typeof enemyData !== "undefined" && enemyData[stage - 1]?.name === e.name) return `boss-${stage}`;
  return null;
}

function monsterRecord(id) {
  if (!monsterRecords[id]) monsterRecords[id] = { encountered: false, defeated: false, encounters: 0, defeats: 0 };
  return monsterRecords[id];
}

// 遭遇の記録。敵オブジェクトに印を付け、同じ戦闘で二重に数えない。
// 中断からの再開（resumed）は遭遇済みにするだけで回数は増やさない。
function compendiumRecordEncounter(e, resumed) {
  const id = monsterCompendiumIdForEnemy(e); if (!id || e._compendiumEncounterRecorded) return;
  e._compendiumEncounterRecorded = true;
  const r = monsterRecord(id);
  r.encountered = true;
  if (!resumed) r.encounters += 1;
}

// 討伐の記録。finishStage()（勝利時のみ呼ばれる）から1戦闘につき1回。
function compendiumRecordDefeat(e) {
  const id = monsterCompendiumIdForEnemy(e); if (!id || e._compendiumDefeatRecorded) return;
  e._compendiumDefeatRecorded = true;
  const r = monsterRecord(id);
  r.encountered = true; r.defeated = true; r.defeats += 1;
  if (!r.encounters) r.encounters = 1;
}

function compendiumSerialize() {
  const out = {};
  for (const [id, r] of Object.entries(monsterRecords)) {
    if (!r || (!r.encountered && !r.defeated)) continue;
    out[id] = { encountered: !!r.encountered, defeated: !!r.defeated, encounters: Math.max(0, Math.floor(Number(r.encounters) || 0)), defeats: Math.max(0, Math.floor(Number(r.defeats) || 0)) };
  }
  return out;
}

// ロード。旧セーブ（monsterRecords なし）でもエラーにせず、分かる範囲だけ引き継ぐ。
function compendiumDeserialize(d) {
  for (const key of Object.keys(monsterRecords)) delete monsterRecords[key];
  const saved = d && typeof d.monsterRecords === "object" && d.monsterRecords ? d.monsterRecords : null;
  if (saved) {
    for (const [id, r] of Object.entries(saved)) {
      if (!r || typeof r !== "object" || typeof id !== "string") continue;
      monsterRecords[id] = { encountered: !!(r.encountered || r.defeated), defeated: !!r.defeated, encounters: Math.max(0, Math.floor(Number(r.encounters) || 0)), defeats: Math.max(0, Math.floor(Number(r.defeats) || 0)) };
    }
  }
  // 旧 compendium（ボス・隠しボス）と、迷宮の遭遇回数（名前キー）からの引き継ぎ。
  // monsterRecords がある新しいセーブでも、取りこぼしを補うだけで値を減らすことはない。
  const entries = monsterCompendiumEntries();
  for (const entry of entries) {
    if (entry.legacyName) {
      const old = d?.compendium?.[entry.legacyName];
      if (old?.encountered || old?.defeated) { const r = monsterRecord(entry.id); r.encountered = true; if (old.defeated) { r.defeated = true; r.defeats = Math.max(1, r.defeats); } r.encounters = Math.max(1, r.encounters); }
    }
  }
  const fieldCounts = d?.field?.enemyEncounters;
  if (fieldCounts && typeof fieldCounts === "object") {
    for (const entry of entries) {
      if (!entry.id.startsWith("field:")) continue;
      const n = Math.max(0, Math.floor(Number(fieldCounts[entry.name]) || 0));
      if (n > 0) { const r = monsterRecord(entry.id); r.encountered = true; r.encounters = Math.max(r.encounters, n); }
    }
  }
}

/* ---------------- 表示 ---------------- */
function monsterListText(list) { return (list || []).filter(Boolean).join("・") || "なし"; }
function monsterDescription(d, entry) {
  const moves = Array.isArray(d.ai) && d.ai.length ? d.ai.map(a => a.name).filter(Boolean) : (d.actionName ? [d.actionName] : []);
  const lines = [];
  if (moves.length) lines.push(`主な行動：${moves.join("・")}`);
  if (entry.where) lines.push(`出現：${entry.where}`);
  if (entry.fieldScaled) lines.push("※ 深いフロアほど強くなる（表示はフロア補正なしの値）");
  return lines;
}
function monsterCardHtml(entry, r, legacy) {
  // ステージボスと隠しボスは、従来どおり名前キーの compendium で表示する（隠しボス条件と表示を一致させるため）。
  const encountered = legacy ? !!legacy.encountered : !!r?.encountered;
  const defeated = legacy ? !!legacy.defeated : !!r?.defeated;
  const d = entry.data() || {};
  const img = d.image;
  const art = defeated && img ? `<img src="${esc(img)}" alt="${esc(entry.name)}" onerror="this.remove()">` : `<span>${encountered ? "影" : "?"}</span>`;
  let body;
  if (!encountered) body = "未遭遇";
  else if (!defeated) body = "名前のみ登録（討伐すると詳細が解放されます）";
  else {
    const stats = [`HP ${d.hp ?? d.maxHp ?? "?"}`, `ATK ${d.attack ?? "?"}`, `DEF ${d.defense ?? "?"}`];
    if (Number.isFinite(d.spAttack)) stats.push(`SP攻撃 ${d.spAttack}`);
    if (Number.isFinite(d.spDefense)) stats.push(`SP防御 ${d.spDefense}`);
    body = [stats.join(" ／ "), `属性：${esc(d.element || "無属性")}`, `弱点：${esc(monsterListText(d.weaknesses))} ／ 耐性：${esc(monsterListText([...(d.resistances || []), ...(d.physicalResistances || [])]))}`, ...monsterDescription(d, entry).map(esc)].join("<br>");
  }
  const counts = !legacy && r && encountered ? `　遭遇 ${r.encounters || 0} ／ 討伐 ${r.defeats || 0}` : "";
  return `<article class="compendium-card compendium-${entry.category} ${defeated ? "unlocked" : ""}" data-monster-id="${esc(entry.id)}"><div class="compendium-art">${art}</div><span class="compendium-category">${esc(MONSTER_CATEGORY_LABELS[entry.category])}</span><h3>${encountered ? esc(entry.name) : "？？？？"}</h3><p>${body}</p><small>${defeated ? "討伐済み" : encountered ? "未討伐" : "未発見"}${counts}</small></article>`;
}
// [UI-P4] 一覧（区分タブ＋1行ずつ）と詳細（選んだ1体のカード）に分ける。記録・判定は変更しない。
let compendiumSelectedId = null, compendiumFilter = "all";
function compendiumEntryState(e) {
  const legacy = e.legacyName ? (compendium[e.legacyName] || {}) : null, r = monsterRecords[e.id];
  return { legacy, r, encountered: legacy ? !!legacy.encountered : !!r?.encountered, defeated: legacy ? !!legacy.defeated : !!r?.defeated };
}
function renderMonsterCompendium() {
  const box = $("compendium-list"); if (!box) return;
  const entries = monsterCompendiumEntries();
  const cats = MONSTER_CATEGORY_ORDER.filter(cat => entries.some(e => e.category === cat));
  if (compendiumFilter !== "all" && !cats.includes(compendiumFilter)) compendiumFilter = "all";
  const shown = entries.filter(e => compendiumFilter === "all" || e.category === compendiumFilter);
  if (!shown.some(e => e.id === compendiumSelectedId)) compendiumSelectedId = (shown.find(e => compendiumEntryState(e).encountered) || shown[0] || {}).id || null;
  const tabs = `<div class="cmp-tabs" role="tablist" aria-label="図鑑の区分">${["all", ...cats].map(cat => { const items = cat === "all" ? entries : entries.filter(e => e.category === cat); const done = items.filter(e => compendiumEntryState(e).defeated).length; return `<button type="button" role="tab" data-compendium-filter="${cat}" class="${compendiumFilter === cat ? "active" : ""}" aria-selected="${compendiumFilter === cat}">${cat === "all" ? "すべて" : esc(MONSTER_CATEGORY_LABELS[cat])}<small>${done}/${items.length}</small></button>`; }).join("")}</div>`;
  const list = (compendiumFilter === "all" ? cats : [compendiumFilter]).map(cat => {
    const items = shown.filter(e => e.category === cat); if (!items.length) return "";
    const done = items.filter(e => compendiumEntryState(e).defeated).length;
    return `<h3 class="compendium-section-title">${esc(MONSTER_CATEGORY_LABELS[cat])}　<small>${done} / ${items.length} 討伐</small></h3>` + items.map(e => {
      const st = compendiumEntryState(e), d = e.data() || {}, on = e.id === compendiumSelectedId;
      const thumb = st.defeated && d.image ? `<img src="${esc(d.image)}" alt="" onerror="this.remove()">` : `<span>${st.encountered ? "影" : "?"}</span>`;
      return `<button type="button" class="cmp-row compendium-${e.category} ${st.defeated ? "unlocked" : ""} ${on ? "is-selected" : ""}" data-monster-select="${esc(e.id)}" aria-pressed="${on}"><span class="cmp-thumb">${thumb}</span><span class="cmp-row-name">${st.encountered ? esc(e.name) : "？？？？"}</span><small class="cmp-row-state">${st.defeated ? "討伐済み" : st.encountered ? "未討伐" : "未発見"}</small></button>`;
    }).join("");
  }).join("");
  const selEntry = shown.find(e => e.id === compendiumSelectedId);
  const detail = selEntry ? (() => { const st = compendiumEntryState(selEntry); return monsterCardHtml(selEntry, st.r, st.legacy); })() : '<p class="empty-note">モンスターを選んでください。</p>';
  box.innerHTML = `${tabs}<div class="cmp-layout"><div class="cmp-list" aria-label="モンスター一覧">${list}</div><div class="cmp-detail" aria-live="polite">${detail}</div></div>`;
  box.querySelectorAll("[data-compendium-filter]").forEach(b => b.onclick = () => { compendiumFilter = b.dataset.compendiumFilter; compendiumSelectedId = null; renderMonsterCompendium(); });
  box.querySelectorAll("[data-monster-select]").forEach(b => b.onclick = () => {
    compendiumSelectedId = b.dataset.monsterSelect; const scroll = box.querySelector(".cmp-list")?.scrollTop || 0; renderMonsterCompendium();
    const l = box.querySelector(".cmp-list"); if (l) l.scrollTop = scroll;
    if (window.matchMedia && window.matchMedia("(max-width:700px)").matches) box.querySelector(".cmp-detail")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  // 見出しの数字は従来どおり「ステージボス5種の討伐数」（隠しボス解放条件の基準）。全体の数も併記する。
  const bossNames = compendiumNames().slice(0, 5);
  const allDone = entries.filter(e => (e.legacyName ? compendium[e.legacyName]?.defeated : monsterRecords[e.id]?.defeated)).length;
  const progress = $("compendium-progress");
  if (progress) progress.textContent = `ボス ${bossNames.filter(n => compendium[n]?.defeated).length} / 5 討伐 ／ 全体 ${allDone} / ${entries.length}`;
  const unlock = $("hidden-boss-unlock");
  if (unlock) {
    unlock.innerHTML = hiddenBossUnlocked() ? `<h3>隠しステージ解放！</h3><p>「混沌の幻影」への挑戦条件を達成しました。</p><button id="hidden-boss-start" class="primary-button">隠しボスに挑戦</button>` : '<h3>隠しステージ</h3><p>解放条件：魔王・ドラゴン討伐、ステージボス図鑑（5種）80%以上</p>';
    $("hidden-boss-start")?.addEventListener("click", startHiddenBoss);
  }
}
