"use strict";
/* ============================================================
   item-compendium.js — アイテム図鑑（武器・防具・アクセサリー・消耗品・素材・製作レシピ）
   - 対象は data/items.js の shopItems / accessoryItems / EXT_NEW_ITEMS / recipes /
     materialNames / enhancementMaterials から実行時に作る（データは複製しない）。
     新しいアイテムを data/items.js に足せば、図鑑にも自動で載る。
   - 状態は3段階：未解放 ／ 未入手（解放済み） ／ 入手済み。
       入手済み ＝「今持っている（所持品・装備中・素材）」または「入手記録がある」。
       図鑑を開いただけでは入手済みにしない。
   - 入手記録 itemRecords は、購入・製作・ドロップ等の処理から itemCompendiumRecord() を
     呼んでもらう前提の API。script.js は GPT の作業と競合するため、このPRでは呼び出しを
     追加していない（必要な箇所は docs/specs/item-compendium/IMPLEMENTATION_NOTES.md）。
     呼び出しが入るまでは「今持っているもの」だけが入手済みとして表示される。
   ============================================================ */
const itemRecords = {};

const ITEM_CATEGORY_LABELS = { weapon: "武器", armor: "防具", accessory: "アクセサリー", consumable: "消耗品", material: "素材", recipe: "製作レシピ" };
const ITEM_CATEGORY_ORDER = ["weapon", "armor", "accessory", "consumable", "material", "recipe"];
// data/items.js から入手方法を読み取れないアイテムの補足（表示専用）。
const ITEM_SOURCE_NOTES = { "acc-chaos-charm": "隠しボス「混沌の幻影」初回討伐の報酬", chaos_crystal: "隠しボス「混沌の幻影」初回討伐の報酬" };

function itemCompendiumBaseItems() {
  const seen = new Set(), out = [];
  const add = list => { for (const i of (Array.isArray(list) ? list : [])) { if (!i || !i.id || i.craftedOnly || seen.has(i.id)) continue; seen.add(i.id); out.push(i); } };
  add(typeof shopItems !== "undefined" ? shopItems : []);
  add(typeof accessoryItems !== "undefined" ? accessoryItems : []);
  add(typeof EXT_NEW_ITEMS !== "undefined" ? EXT_NEW_ITEMS : []);
  return out;
}
function itemCategoryOf(i) {
  if (i.category === "weapon") return "weapon";
  if (i.category === "armor") return "armor";
  if (i.category === "accessory") return "accessory";
  if (i.category === "healing" || i.kind) return "consumable";
  return "accessory";
}
// 図鑑の対象一覧。data() は元データへの参照を返す。
function itemCompendiumEntries() {
  const list = itemCompendiumBaseItems().map(i => ({ id: i.id, kind: "item", category: itemCategoryOf(i), name: i.name, data: () => i }));
  for (const [id, name] of Object.entries(typeof materialNames !== "undefined" ? materialNames : {})) list.push({ id, kind: "material", category: "material", name, data: () => ({ id, name }) });
  for (const r of (typeof recipes !== "undefined" ? recipes : [])) list.push({ id: r.id, kind: "recipe", category: "recipe", name: r.name, data: () => r });
  return list;
}

/* ---------------- 記録・セーブ（呼び出し側のフックは実装メモ参照） ---------------- */
function itemCompendiumRecord(id, source) {
  if (!id) return;
  const r = itemRecords[id] || (itemRecords[id] = { obtained: false, count: 0, first: "" });
  r.obtained = true; r.count += 1; if (!r.first && source) r.first = String(source);
}
function itemCompendiumSerialize() {
  const out = {};
  for (const [id, r] of Object.entries(itemRecords)) if (r?.obtained) out[id] = { obtained: true, count: Math.max(1, Math.floor(Number(r.count) || 1)), first: String(r.first || "") };
  return out;
}
// 旧セーブ（itemRecords なし）でもエラーにしない。今の所持品から分かる範囲を補完する。
function itemCompendiumDeserialize(d) {
  for (const k of Object.keys(itemRecords)) delete itemRecords[k];
  const saved = d && typeof d.itemRecords === "object" && d.itemRecords ? d.itemRecords : null;
  if (saved) for (const [id, r] of Object.entries(saved)) if (r && typeof r === "object" && r.obtained) itemRecords[id] = { obtained: true, count: Math.max(1, Math.floor(Number(r.count) || 1)), first: String(r.first || "") };
  for (const entry of itemCompendiumEntries()) if (itemIsHeld(entry) && !itemRecords[entry.id]) itemRecords[entry.id] = { obtained: true, count: 1, first: "所持品から復元" };
}

/* ---------------- 状態判定（既存データを読むだけ） ---------------- */
function itemEquippedBy(id) {
  const eq = typeof equipment !== "undefined" ? equipment : {};
  return Object.entries(eq).filter(([, slots]) => slots && Object.values(slots).includes(id)).map(([cid]) => cid);
}
function itemIsHeld(entry) {
  if (entry.kind === "material") return (Number((typeof materials !== "undefined" ? materials : {})[entry.id]) || 0) > 0;
  return (Number((typeof inventory !== "undefined" ? inventory : {})[entry.id]) || 0) > 0 || itemEquippedBy(entry.id).length > 0;
}
function itemIsUnlocked(entry) {
  if (entry.kind !== "item") return true;
  const i = entry.data();
  if (i.tutorialOnly) return !!itemRecords[i.id]?.obtained || itemIsHeld(entry);
  if (ITEM_SOURCE_NOTES[i.id]) return !!itemRecords[i.id]?.obtained || itemIsHeld(entry);
  return (i.unlock || 1) <= ((typeof state !== "undefined" && state.maxUnlockedStage) || 1);
}
function itemStatus(entry) {
  const held = itemIsHeld(entry), recorded = !!itemRecords[entry.id]?.obtained;
  if (held || recorded) return { key: "obtained", label: held ? "所持中" : "入手済み" };
  if (!itemIsUnlocked(entry)) return { key: "locked", label: "未解放" };
  return { key: "unseen", label: "未入手" };
}

/* ---------------- 表示用の文字列 ---------------- */
function itemJobNames(ids) {
  const name = id => (typeof getCharacter === "function" && getCharacter(id)?.name) || (typeof EXT_NEW_JOBS !== "undefined" && EXT_NEW_JOBS.find(j => j.id === id)?.name) || id;
  return (ids || []).map(name).join("・") || "—";
}
function itemMaterialName(id) { return (typeof materialNames !== "undefined" && materialNames[id]) || id; }
function itemRecipeEffect(r) {
  const parts = [];
  if (r.attackBonus) parts.push(`攻撃力 +${r.attackBonus}`);
  if (r.spAttackBonus) parts.push(`SP攻撃力 +${r.spAttackBonus}`);
  if (r.defenseBonus) parts.push(`防御力 +${r.defenseBonus}`);
  if (r.spDefenseBonus) parts.push(`SP防御力 +${r.spDefenseBonus}`);
  return parts.join("／") || "—";
}
function itemUnlockText(entry) {
  const i = entry.data();
  if (entry.kind === "material") return ITEM_SOURCE_NOTES[i.id] || itemMaterialSourceText(i.id);
  if (entry.kind === "recipe") return "強化・育成画面の「武器製作」で製作";
  if (i.tutorialOnly) return "チュートリアルで入手";
  if (ITEM_SOURCE_NOTES[i.id]) return ITEM_SOURCE_NOTES[i.id];
  return `ショップ：STAGE ${i.unlock || 1} ${Number(i.unlock || 1) <= 1 ? "から販売" : "クリア後に販売"}`;
}
// 素材の入手先（迷宮の採取ポイント）。敵ドロップ表は awardMaterials 内のローカル定数のため参照できない（実装メモ参照）。
function itemMaterialSourceText(id) {
  const parts = [];
  if (typeof FIELD_AREAS !== "undefined") {
    for (const [n, area] of Object.entries(FIELD_AREAS)) {
      const floors = (area.floors || []).map((f, fi) => (f.gathers || []).some(g => g[0] === id) ? `${fi + 1}F` : null).filter(Boolean);
      if (floors.length) parts.push(`第${n}階層 ${floors.join("・")}`);
    }
  }
  return parts.length ? `採取：${parts.join("／")}（ほか敵のドロップ）` : "敵のドロップ・報酬";
}
function itemMaterialUses(id) {
  const rs = (typeof recipes !== "undefined" ? recipes : []).filter(r => r.needs && r.needs[id]).map(r => r.name);
  const enh = Object.entries(typeof enhancementMaterials !== "undefined" ? enhancementMaterials : {}).filter(([, m]) => m === id).map(([wid]) => (typeof itemById === "function" && itemById(wid)?.name) || wid);
  const out = [];
  if (rs.length) out.push(`製作：${rs.join("・")}`);
  if (enh.length) out.push(`武器強化：${enh.join("・")}`);
  return out;
}
function itemEnhanceText(id) {
  const m = typeof enhancementMaterials !== "undefined" ? enhancementMaterials[id] : null;
  if (!m) return "";
  const lv = Number((typeof weaponLevels !== "undefined" ? weaponLevels : {})[id]) || 0;
  return `強化素材：${itemMaterialName(m)}（最大+5${lv ? `／現在+${lv}` : ""}）`;
}

function itemCardHtml(entry) {
  const st = itemStatus(entry), i = entry.data(), rows = [];
  if (entry.kind === "item") {
    if (i.description) rows.push(esc(i.description));
    if (i.effect) rows.push(`効果：${esc(i.effect)}`);
    if (Number.isFinite(i.price) && i.price > 0) rows.push(`価格：${i.price} G`);
    if (entry.category !== "consumable") rows.push(`装備：${esc(itemJobNames(i.classes))}`);
    const enh = itemEnhanceText(i.id); if (enh) rows.push(esc(enh));
    const who = itemEquippedBy(i.id); if (who.length) rows.push(`装備中：${esc(itemJobNames(who))}`);
    const n = Number((typeof inventory !== "undefined" ? inventory : {})[i.id]) || 0; if (n) rows.push(`所持数：${n}`);
  } else if (entry.kind === "material") {
    itemMaterialUses(i.id).forEach(t => rows.push(esc(t)));
    const n = Number((typeof materials !== "undefined" ? materials : {})[i.id]) || 0; if (n) rows.push(`所持数：${n}`);
  } else {
    rows.push(`完成品：${esc(i.name)}（${esc(itemRecipeEffect(i))}）`);
    rows.push(`必要素材：${esc(Object.entries(i.needs || {}).map(([m, n]) => `${itemMaterialName(m)}×${n}`).join("、") || "なし")}`);
    rows.push(`費用：${i.cost || 0} G`);
    rows.push(`装備：${esc(itemJobNames(i.classes))}`);
    const enh = itemEnhanceText(i.id); if (enh) rows.push(esc(enh));
  }
  rows.push(`入手：${esc(itemUnlockText(entry))}`);
  return `<article class="item-dex-card is-${st.key}" data-item-id="${esc(entry.id)}"><div class="item-dex-head"><strong>${esc(entry.name)}</strong><span class="item-dex-status">${esc(st.label)}</span></div><p>${rows.join("<br>")}</p></article>`;
}

let itemCompendiumFilter = "all";
function renderItemCompendium() {
  const box = $("item-compendium-list"); if (!box) return;
  const entries = itemCompendiumEntries();
  const tabs = $("item-compendium-tabs");
  if (tabs) {
    tabs.innerHTML = [["all", "すべて"], ...ITEM_CATEGORY_ORDER.map(c => [c, ITEM_CATEGORY_LABELS[c]])].map(([k, l]) => `<button type="button" data-item-filter="${k}" class="${itemCompendiumFilter === k ? "active" : ""}" aria-pressed="${itemCompendiumFilter === k}">${esc(l)}</button>`).join("");
    tabs.querySelectorAll("[data-item-filter]").forEach(b => b.onclick = () => { itemCompendiumFilter = b.dataset.itemFilter; renderItemCompendium(); });
  }
  box.innerHTML = ITEM_CATEGORY_ORDER.filter(c => itemCompendiumFilter === "all" || itemCompendiumFilter === c).map(cat => {
    const items = entries.filter(e => e.category === cat); if (!items.length) return "";
    const got = items.filter(e => itemStatus(e).key === "obtained").length;
    return `<section class="item-dex-section"><h3>${esc(ITEM_CATEGORY_LABELS[cat])}　<small>${got} / ${items.length} 入手</small></h3><div class="item-dex-grid">${items.map(itemCardHtml).join("")}</div></section>`;
  }).join("");
  const progress = $("item-compendium-progress");
  if (progress) progress.textContent = `${entries.filter(e => itemStatus(e).key === "obtained").length} / ${entries.length} 入手`;
}

// データの整合チェック（ID重複・未定義参照）。開発時の確認用で、画面には出さない。
function itemCompendiumValidate() {
  const issues = [], ids = new Map();
  for (const e of itemCompendiumEntries()) { const k = e.id; if (ids.has(k)) issues.push(`ID重複：${k}（${ids.get(k)} と ${e.category}）`); else ids.set(k, e.category); }
  const itemIds = new Set(itemCompendiumBaseItems().map(i => i.id)), recipeIds = new Set((typeof recipes !== "undefined" ? recipes : []).map(r => r.id)), mats = typeof materialNames !== "undefined" ? materialNames : {};
  for (const r of (typeof recipes !== "undefined" ? recipes : [])) for (const m of Object.keys(r.needs || {})) if (!mats[m]) issues.push(`レシピ ${r.id} の素材 ${m} が materialNames にない`);
  for (const [w, m] of Object.entries(typeof enhancementMaterials !== "undefined" ? enhancementMaterials : {})) { if (!itemIds.has(w) && !recipeIds.has(w)) issues.push(`強化表の武器 ${w} が未定義`); if (!mats[m]) issues.push(`強化表の素材 ${m}（${w}）が materialNames にない`); }
  const jobIds = new Set([...(typeof characters !== "undefined" ? characters.map(c => c.id) : []), ...(typeof EXT_NEW_JOBS !== "undefined" ? EXT_NEW_JOBS.map(j => j.id) : [])]);
  for (const x of [...itemCompendiumBaseItems(), ...(typeof recipes !== "undefined" ? recipes : [])]) for (const c of (x.classes || [])) if (jobIds.size && !jobIds.has(c)) issues.push(`${x.id} の装備職業 ${c} が未定義`);
  return issues;
}

/* ---------------- 画面の接続（index.html の図鑑メニューから開く） ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  // 入手記録はセーブ／ロードのフック（実装メモ参照）が入るまで空のまま。
  // ここで所持品から記録を作ると、別スロットをロードしたときに古い記録が残るため作らない
  // （所持中かどうかは表示のたびに itemIsHeld() で判定している）。
  $("item-compendium-menu-button")?.addEventListener("click", () => {
    if (typeof showScreen === "function") showScreen("item-compendium");
    const m = $("list-menu"); if (m) m.hidden = true;
    $("list-button")?.setAttribute("aria-expanded", "false");
    renderItemCompendium();
  });
});
