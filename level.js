"use strict";
/* ============================================================
   level.js — レベル・経験値の処理（[LEVEL]）
   データ：data/levels.js。script.js / field.js からは typeof ガード付きで呼ぶ。
   ・characterLevels（既存・セーブ済み）をレベルの正本として使う。経験値は levelExp に保存。
   ============================================================ */
const levelExp = {};   // キャラID → 現在のレベル内で貯まっている経験値

function levelOf(c) { return Math.max(1, Math.min(LEVEL_CAP, Math.floor(Number(characterLevels[c?.id || c]) || 1))); }
function levelExpToNext(lv) { return Math.floor(LEVEL_EXP_CURVE.mult * Math.pow(lv, LEVEL_EXP_CURVE.pow) + LEVEL_EXP_CURVE.base); }
function levelExpNow(c) { return Math.max(0, Math.floor(Number(levelExp[c?.id || c]) || 0)); }

// effectiveStats / formationBaseStats から呼ばれ、レベル分の基礎能力値を加える
function levelApplyStats(c, raw) {
  const lv = levelOf(c); if (lv <= 1 || !c) return raw;
  const baseSpDef = Number.isFinite(c.spDefense) ? c.spDefense : Math.floor((c.defense || 0) / 2);
  const base = { maxHp: c.maxHp, attack: c.attack, spAttack: c.spAttack, defense: c.defense, spDefense: baseSpDef, speed: Number.isFinite(c.speed) ? c.speed : 50 };
  for (const [key, rate] of Object.entries(LEVEL_GROWTH)) if (Number.isFinite(raw[key])) raw[key] += Math.floor((Number(base[key]) || 0) * rate * (lv - 1));
  return raw;
}

// 敵1体（集団は全員分）の経験値
function levelEnemyExp(e) {
  if (!e) return 0;
  if (Number.isFinite(e.exp)) return e.exp;
  const per = LEVEL_ENEMY_EXP[e.name] ?? LEVEL_ENEMY_EXP[e.baseName] ?? LEVEL_ENEMY_EXP[e.dropAs] ?? 0;
  return Array.isArray(e.members) ? per * e.members.length : per;
}

// 勝利時に経験値を配る。戻り値 { exp, ups:[{id,name,from,to}], text }
function levelAwardBattleExp(e) {
  if (battleState.tutorialMode) return null;
  const exp = levelEnemyExp(e); if (!exp) return null;
  const ups = [];
  // 現在の編成メンバーだけでなく、解放済みの控えメンバーにも同じ経験値を配る。
  // 戦闘不能の現役メンバーは従来どおり経験値対象外。控えの戦闘不能者は経験値を得るが、HPは0のままにする。
  const activeIds = new Set((state.party || []).filter(Boolean));
  for (const c of characters) {
    const active = activeIds.has(c.id);
    if (active && c.hp <= 0) continue;
    if (!active && typeof extIsJobAvailable === "function" && !extIsJobAvailable(c)) continue;
    const wasAlive = c.hp > 0;
    const from = levelOf(c); let lv = from, cur = levelExpNow(c) + exp;
    while (lv < LEVEL_CAP && cur >= levelExpToNext(lv)) { cur -= levelExpToNext(lv); lv++; }
    if (lv >= LEVEL_CAP) cur = 0;
    // レベルアップで最大HPが伸びた分だけ、HPが残っている仲間の現在HPも増やす。
    const before = effectiveStats(c).maxHp;
    characterLevels[c.id] = lv; levelExp[c.id] = cur;
    if (lv > from) {
      if (wasAlive) c.hp = Math.min(effectiveStats(c).maxHp, c.hp + Math.max(0, effectiveStats(c).maxHp - before));
      trainingPoints[c.id] = (trainingPoints[c.id] || 0) + LEVEL_SKILL_POINTS * (lv - from);
      ups.push({ id: c.id, name: c.name, from, to: lv });
    }
  }
  const text = `経験値 +${exp}` + (ups.length ? `\n${ups.map(u => `${u.name} Lv.${u.from}→${u.to}`).join("　")}（スキルポイント獲得）` : "");
  if (ups.length) {
    try { document.dispatchEvent(new CustomEvent("battle:level:up", { detail: { ups: ups.map(u => ({ ...u })) } })); } catch (_) {}
    if (typeof showPurchasePopup === "function") showPurchasePopup(`レベルアップ！ ${ups.map(u => `${u.name} Lv.${u.to}`).join("・")}`);
    if (typeof playSe === "function") playSe("assets/se/syouri/アイテムを入手2", .8);
  }
  pushLog(text.replace("\n", " "));
  return { exp, ups, text };
}

// 表示用
function levelBadge(c) { return `<small class="lv-badge" title="レベル">Lv.${levelOf(c)}</small>`; }
function levelExpBar(c) {
  const lv = levelOf(c), need = levelExpToNext(lv), now = levelExpNow(c), rate = lv >= LEVEL_CAP ? 100 : Math.min(100, now / need * 100);
  return `<div class="lv-exp" title="次のレベルまで ${lv >= LEVEL_CAP ? 0 : need - now}"><span>Lv.${lv}</span><i><u style="width:${rate}%"></u></i><small>${lv >= LEVEL_CAP ? "MAX" : `NEXT ${need - now}`}</small></div>`;
}

// セーブ（script.js の createSaveData / loadGame から）
function levelSerialize() { return { ...levelExp }; }
function levelDeserialize(d) {
  for (const k of Object.keys(levelExp)) delete levelExp[k];
  if (d && typeof d === "object") for (const c of characters) { const v = Math.floor(Number(d[c.id]) || 0); if (v > 0) levelExp[c.id] = v; }
  for (const c of characters) if (characterLevels[c.id] > LEVEL_CAP) characterLevels[c.id] = LEVEL_CAP;
}
