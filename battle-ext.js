"use strict";
/* ============================================================
   battle-ext.js — 戦闘拡張（Claude担当）
   1. 状態異常の統一管理（火傷・毒・麻痺・呪い・防御ダウン・攻撃ダウン・各種バフ）
   2. スピード（素早さ）と行動順
   3. 職業データは data/jobs.js から読み込み
   4. 敵バリエーション（STAGE1〜3）と、ドラゴン／魔王の行動差別化
   ------------------------------------------------------------
   このファイルは script.js より先に読み込まれる。
   script.js のグローバル（characters / battleState など）は、関数の中でのみ参照する。
   script.js 側のフックは「// [EXT]」のコメントで目印を付けている。
   ============================================================ */

/* ---------- 基本データ ---------- */
// 戦闘拡張の処理を管理。職業の数値・スキル定義は data/jobs.js を参照。
// 職業・職業解放データは data/jobs.js、職業専用装備は data/items.js に分離。

/* script.js から呼ばれる初期化 */
function extInstallCharacters(characters) {
  for (const job of EXT_NEW_JOBS) characters.push(JSON.parse(JSON.stringify(job)));
  for (const c of characters) if (!Number.isFinite(c.speed)) c.speed = EXT_JOB_SPEED[c.id] ?? 50;
}
function extInstallItems(shopItems, enhancementMaterials) {
  const known = new Set(shopItems.map(i => i.id));
  for (const item of EXT_NEW_ITEMS) if (!known.has(item.id)) shopItems.push(item);
  // 全職業共用の防具・護符・装飾品には、新職業のIDも追加する。
  for (const item of shopItems) {
    if (Array.isArray(item.classes) && item.classes.includes("samurai") && item.classes.includes("kotama") && item.classes.length >= 6) {
      for (const id of EXT_NEW_JOB_IDS) if (!item.classes.includes(id)) item.classes.push(id);
    }
  }
  Object.assign(enhancementMaterials, EXT_ENH_MATERIALS);
}

/* ---------- 新職業の解放 ---------- */
function extJobsUnlocked() { if (!Array.isArray(state.unlockedJobs)) state.unlockedJobs = []; return state.unlockedJobs; }
function extIsJobAvailable(c) { return !!c && (!EXT_NEW_JOB_IDS.includes(c.id) || extJobsUnlocked().includes(c.id)); }
function extAvailableCharacters() { return characters.filter(c => c.id !== "imperial" && extIsJobAvailable(c)); }
function extJobUnlockRequirement(id) {
  const stageEntry = Object.entries(EXT_JOB_UNLOCK_BY_STAGE).find(([, jobId]) => jobId === id);
  if (stageEntry) return `STAGE ${stageEntry[0]} クリアで解放`;
  if (id === EXT_JOB_UNLOCK_HIDDEN) return '隠しボス「混沌の幻影」の初回討伐で解放';
  return '解放条件未設定';
}
function extUnlockJob(id) {
  const list = extJobsUnlocked();
  if (!EXT_NEW_JOB_IDS.includes(id) || list.includes(id)) return false;
  list.push(id);
  const slots = equipment[id];
  const gear = EXT_STARTER_GEAR[id] || {};
  if (slots) for (const [slot, itemId] of Object.entries(gear)) if (!slots[slot]) slots[slot] = itemId;
  return true;
}
// 通常ステージのクリア／隠しボス討伐で新しい仲間を解放し、新しく加わった職業名を返す。
function extUnlockForClear(stage, hiddenBoss) {
  const id = hiddenBoss ? EXT_JOB_UNLOCK_HIDDEN : EXT_JOB_UNLOCK_BY_STAGE[stage];
  if (!id || !extUnlockJob(id)) return [];
  return [getCharacter(id).name];
}
// 読み込み時：クリア記録から、解放済みのはずの職業を補完する（既存セーブ対応）。
function extSyncJobUnlocks() {
  for (const [stage, id] of Object.entries(EXT_JOB_UNLOCK_BY_STAGE)) if (stageCleared[stage]) extUnlockJob(id);
  if (hiddenBossFirstClear) extUnlockJob(EXT_JOB_UNLOCK_HIDDEN);
}

/* ============================================================
   1. 状態異常の統一管理
   - 同じ状態異常を重ねがけしても効果は重複しない（持続ターンと強さは大きい方に更新）。
   - fresh：付与されたラウンドの終了時には持続が減らない（毒など、次ラウンドから効果が出るもの）。
   - 敵への攻撃力ダウン／防御ダウンは、敵の数値を直接下げ、切れると元に戻す。
   ============================================================ */
const EXT_STATUS_DEFS = {
  burn:        { label:"火傷",   icon:"🔥", harm:true },
  poison:      { label:"毒",     icon:"☠",  harm:true, fresh:"always" },
  paralysis:   { label:"麻痺",   icon:"⚡", harm:true, fresh:"party" },
  curse:       { label:"呪い",   icon:"☾",  harm:true, fresh:"party" },
  defenseDown: { label:"防御↓",  icon:"▼",  harm:true, fresh:"party" },
  attackDown:  { label:"攻撃↓",  icon:"▼",  harm:true, fresh:"party" },
  attackUp:    { label:"攻撃↑",  icon:"▲",  harm:false },
  defenseUp:   { label:"防御↑",  icon:"▲",  harm:false },
  speedUp:     { label:"速度↑",  icon:"▲",  harm:false }
};
let extPartyStatuses = {};

function extIsParty(t) { return !!t && characters.includes(t); }
function extIsBoss(e) { return !!e && EXT_BOSS_NAMES.includes(e.name); }
function extStatusBag(t, create) {
  if (!t) return null;
  if (extIsParty(t)) return extPartyStatuses[t.id] || (create ? (extPartyStatuses[t.id] = {}) : null);
  if (!battleState.enemy) return null;
  // 敵本体・集団の各個体・分身をID単位で管理し、状態異常を共有させない。
  if (t === battleState.enemy) return battleState.enemyStatuses || (create ? (battleState.enemyStatuses = {}) : null);
  if (t.id != null) {
    const id = String(t.id);
    battleState.enemyUnitStatuses ||= {};
    return battleState.enemyUnitStatuses[id] || (create ? (battleState.enemyUnitStatuses[id] = {}) : null);
  }
  return battleState.enemyStatuses || (create ? (battleState.enemyStatuses = {}) : null);
}
function extHasStatus(t, type) { const b = extStatusBag(t, false); return !!(b && b[type] && b[type].turns > 0); }
function extStatusPower(t, type) { const b = extStatusBag(t, false); return b && b[type] ? b[type].power : 0; }

function extEnemyStatEffect(rec, type, apply, target) {
  const e = target || battleState.enemy; if (!e) return;
  if (type === "attackDown") {
    if (apply) { rec.lost = Math.floor((e.attack || 0) * rec.power); e.attack = Math.max(0, (e.attack || 0) - rec.lost); }
    else { e.attack = (e.attack || 0) + (rec.lost || 0); rec.lost = 0; }
  } else if (type === "defenseDown") {
    if (apply) { rec.lost = Math.floor((e.defense || 0) * rec.power); e.defense = Math.max(0, (e.defense || 0) - rec.lost); }
    else { e.defense = (e.defense || 0) + (rec.lost || 0); rec.lost = 0; }
  }
}
// 戻り値："new"（新規）／"refresh"（持続か強さを更新）／"same"（変化なし）／false（付与できない）
function addStatus(t, type, opts = {}) {
  const def = EXT_STATUS_DEFS[type], bag = extStatusBag(t, true);
  if (!def || !bag) return false;
  const turns = Math.max(1, Math.floor(opts.turns ?? def.turns ?? 3));
  const power = Number.isFinite(opts.power) ? opts.power : (def.power ?? 0);
  const party = extIsParty(t);
  const cur = bag[type];
  if (cur) {
    const changed = turns > cur.turns || power > cur.power;
    cur.turns = Math.max(cur.turns, turns);
    if (power > cur.power) {
      if (!party) extEnemyStatEffect(cur, type, false, t);
      cur.power = power;
      if (!party) extEnemyStatEffect(cur, type, true, t);
    }
    return changed ? "refresh" : "same";
  }
  const rec = { turns, power, fresh: def.fresh === "always" || (def.fresh === "party" && party) };
  bag[type] = rec;
  if (!party) extEnemyStatEffect(rec, type, true, t);
  return "new";
}
function extRemoveStatus(t, type) {
  const bag = extStatusBag(t, false); if (!bag || !bag[type]) return;
  if (!extIsParty(t)) extEnemyStatEffect(bag[type], type, false, t);
  delete bag[type];
}
function extClearHarmful(t) {
  const bag = extStatusBag(t, false); if (!bag) return;
  for (const k of Object.keys(bag)) if (EXT_STATUS_DEFS[k]?.harm) extRemoveStatus(t, k);
}
// 味方への付与：ログ付き。
function extInflict(target, type, opts = {}) {
  const r = addStatus(target, type, opts);
  if (r === "new" || r === "refresh") { pushEvent(`${target.name}は${EXT_STATUS_DEFS[type].label}状態になった！`); renderBattle(); }
  return r;
}
function extDefenseDownAmount(c) {
  if (!extHasStatus(c, "defenseDown")) return 0;
  const p = extStatusPower(c, "defenseDown");
  return p >= 1 ? p : Math.floor((c.defense || 0) * p);
}
// 能力値への反映（effectiveStats から呼ばれる）
function extApplyStatusStats(c, raw) {
  const mul = (key, rate) => { raw[key] = Math.max(0, Math.floor(raw[key] * rate)); };
  raw.speed = Math.floor((Number.isFinite(c.speed) ? c.speed : (EXT_JOB_SPEED[c.id] ?? 50)) * (1 + extStatusPower(c, "speedUp")));
  if (extHasStatus(c, "attackUp")) { const p = 1 + extStatusPower(c, "attackUp"); mul("attack", p); mul("spAttack", p); }
  if (extHasStatus(c, "attackDown")) { const p = 1 - Math.min(.9, extStatusPower(c, "attackDown")); mul("attack", p); mul("spAttack", p); }
  if (extHasStatus(c, "curse")) { const p = 1 - Math.min(.9, extStatusPower(c, "curse") || .15); mul("attack", p); mul("spAttack", p); }
  if (extHasStatus(c, "defenseUp")) { const p = 1 + extStatusPower(c, "defenseUp"); mul("defense", p); mul("spDefense", p); }
}
// 呪い：回復量が半分になる。
function extHealMul(target) { return extHasStatus(target, "curse") ? .5 : 1; }

function extStatusBadges(c) {
  const bag = extStatusBag(c, false); if (!bag) return "";
  return Object.entries(bag).filter(([, s]) => s.turns > 0).map(([type, s]) => {
    const def = EXT_STATUS_DEFS[type];
    return ` <span class="status-ext ${def.harm ? "status-ext-bad" : "status-ext-good"}" title="${def.label}：残り${s.turns}ターン">${def.icon}${def.label} ${s.turns}</span>`;
  }).join("");
}
function extJobBadges(c) {
  let html = "";
  if (c.id === "imperial") {
    html += c._overheat ? ' <span class="status-ext status-ext-bad">🔥OVERHEAT</span>' : ` <span class="status-ext status-heat" title="熱が${EXT_HEAT_LIMIT}たまるとオーバーヒート">熱 ${c._heat || 0}/${EXT_HEAT_LIMIT}</span>`;
    if (c._xjCharge) html += ' <span class="status-ext status-ext-bad" title="チャージ中は無防備。受けるダメージが増える">⚠無防備</span>';
  }
  return html;
}
function extEnemyStatusBadges(e) {
  const bag = extStatusBag(e, false); if (!bag) return [];
  return Object.entries(bag).filter(([, s]) => s.turns > 0).map(([type, s]) => {
    const def = EXT_STATUS_DEFS[type];
    return `<span class="${def.harm ? "enemy-status-debuff" : "enemy-status-buff"}">${def.icon}${def.label} ${s.turns}T</span>`;
  });
}
function extBattlePortrait(c) {
  if (!c.image) return `<span class="image-fallback job-emblem" role="img" aria-label="${esc(c.name)}">${esc(c.emblem || c.name.slice(0, 1))}</span>`;
  return `<img src="${esc(c.image)}" alt="${esc(c.name)}" onerror="this.parentElement.classList.add('portrait-missing');this.remove()">`;
}

function extResetBattle() {
  extPartyStatuses = {};
  battleState.enemyStatuses = {};
  battleState.enemyUnitStatuses = {};
  for (const c of characters) { c._xjCharge = null; c._heat = 0; c._overheat = false; }
}

/* 毎ターン開始時：毒のダメージ */
async function extRoundStart() {
  const e = battleState.enemy;
  for (const c of getParty()) {
    if (c.hp <= 0 || !extHasStatus(c, "poison")) continue;
    const d = Math.max(6, Math.floor(effectiveStats(c).maxHp * (extStatusPower(c, "poison") || .06)));
    const dealt = await applyPartyDamageAnimated(c, d, { sureHit: true, statusDamage: true, bypassMitigation: true });
    if (dealt > 0) pushEvent(`${c.name}は毒で${dealt}ダメージを受けた！`);
    if (c.hp <= 0) pushEvent(`${c.name}は戦闘不能になった！`);
  }
  if (e && enemyHpTotal(e) > 0) {
    const units = e.members
      ? e.members.filter(m => m.hp > 0).map(m => ({ kind: "member", ref: m }))
      : livingEnemyTargets(e);
    for (const target of units) {
      const unit = target.ref;
      if (!unit || unit.hp <= 0 || !extHasStatus(unit, "poison")) continue;
      const pct = extIsBoss(e) ? Math.min(.025, extStatusPower(unit, "poison") || .025) : (extStatusPower(unit, "poison") || .06);
      const damage = Math.max(1, Math.floor((unit.maxHp || e.maxHp) * pct));
      beginEnemyDamagePreview(e);
      const dealt = applyDamageToEnemyTarget(e, target, damage);
      if (dealt > 0) {
        combatNumber(target.kind === "member" ? document.querySelector(`[data-enemy-id="${unit.id}"]`) : displayEnemyNode(), `-${dealt}`, "damage");
        flashEnemyDamage();
        pushEvent(`${unit.displayName || unit.name || e.name}は毒で${dealt}ダメージを受けた！`);
      }
    }
  }
  renderBattle();
  await wait(300);
}

/* ターン終了時：火傷ダメージ・持続ターンの経過・ガード類の解除・熱の自然冷却 */
async function extEndOfTurnStatuses() {
  const e = battleState.enemy;
  for (const c of getParty()) {
    if (c.hp > 0 && extHasStatus(c, "burn")) {
      const dealt = await applyPartyDamageAnimated(c, 10, { sureHit: true, element: "炎", statusDamage: true });
      if (dealt > 0) pushEvent(`${c.name}は火傷で${dealt}ダメージを受けた！`);
      if (c.hp <= 0) pushEvent(`${c.name}は戦闘不能になった！`);
    }
  }
  const enemyHolders = e ? (e.members ? e.members : [e, ...(battleState.wolfClones || [])]) : [];
  for (const holder of [...getParty(), ...enemyHolders]) {
    const bag = extStatusBag(holder, false); if (!bag) continue;
    for (const type of Object.keys(bag)) {
      const s = bag[type];
      if (s.fresh) { s.fresh = false; continue; }
      s.turns--;
      if (s.turns <= 0) {
        extRemoveStatus(holder, type);
        const def = EXT_STATUS_DEFS[type];
        if (holder.hp > 0) pushEvent(`${holder.name}の${def.label}が${def.harm ? "治まった" : "切れた"}。`);
      }
    }
  }
  if (battleState.defenseCampTurns > 0) battleState.defenseCampTurns--;
  battleState.magicGuardActive = false; battleState._magicGuardRate = .5;
  battleState.fullGuardActive = false; delete battleState.guarding.knight;
  if (battleState.knightFullGuardCooldown > 0) battleState.knightFullGuardCooldown--;
  // インペリアルの熱は、1ターンごとに1下がる（オーバーヒート中は戦闘終了まで戻らない）。
  for (const c of getParty()) if (!c._overheat && c._heat > 0) c._heat--;
  renderBattle();
}

/* ============================================================
   2. 行動優先度とスピード順
   - 優先度4：ユニオンスキル（最優先）
   - 優先度3：挑発・防御系スキル
   - 優先度2：通常防御
   - 優先度1：速攻指定された攻撃スキル
   - 優先度なし：その他の行動と敵行動（速度順）
   - 同一優先度内は速度順。同速なら味方を先にする。
   ============================================================ */
const EXT_ACTION_PRIORITY = Object.freeze({
  QUICK_ATTACK: 1,
  GUARD: 2,
  DEFENSIVE_SKILL: 3,
  UNION: 4,
  NONE: 0
});
function extEnemySpeed(e) { return Number.isFinite(e?.speed) ? e.speed : (EXT_ENEMY_SPEED[e?.name] ?? 50); }
function extActionPriority(action) {
  if (action.type === "guard") return EXT_ACTION_PRIORITY.GUARD;
  if (action.type === "union") return EXT_ACTION_PRIORITY.UNION;
  if (action.type === "skill") {
    const actor = getCharacter(action.actor);
    const skill = getCharacterSkills(actor).find(x => x.id === action.skillId);
    const configuredPriority = Number(skill?.priority ?? skill?.xj?.priority);
    if (Number.isFinite(configuredPriority) && configuredPriority >= EXT_ACTION_PRIORITY.QUICK_ATTACK && configuredPriority <= EXT_ACTION_PRIORITY.UNION) {
      return configuredPriority;
    }
    if (skill && ["taunt", "defense-camp", "magic-guard", "full-guard", "guardian-stance"].includes(skill.type)) {
      return EXT_ACTION_PRIORITY.DEFENSIVE_SKILL;
    }
    if (skill?.quick === true || skill?.xj?.quick === true) return EXT_ACTION_PRIORITY.QUICK_ATTACK;
  }
  return EXT_ACTION_PRIORITY.NONE;
}
function extBuildRoundOrder() {
  const entries = [];
  let index = 0;
  for (const action of battleState.actions.filter(Boolean)) entries.push({ kind: "party", action, index: index++ });
  for (const c of characters) {
    if (c._xjCharge && c.hp <= 0) c._xjCharge = null;
    if (c._xjCharge && getParty().includes(c)) entries.push({ kind: "party", action: { type: "imperial-release", actor: c.id }, index: index++ });
  }
  for (const en of entries) {
    const actor = getCharacter(en.action.actor);
    en.priority = extActionPriority(en.action);
    en.speed = actor ? effectiveStats(actor).speed : 0;
  }
  entries.push({ kind: "enemy", priority: EXT_ACTION_PRIORITY.NONE, speed: extEnemySpeed(battleState.enemy), index: index++ });
  entries.sort((a, b) => b.priority - a.priority || b.speed - a.speed || (a.kind === "enemy" ? 1 : 0) - (b.kind === "enemy" ? 1 : 0) || a.index - b.index);
  const names = entries.filter(en => en.priority >= EXT_ACTION_PRIORITY.UNION || en.kind === "enemy").map(en => en.kind === "enemy" ? battleState.enemy.name : getCharacter(en.action.actor)?.name).filter(Boolean);
  pushLog(`行動順：${entries.map(en => en.kind === "enemy" ? battleState.enemy.name : getCharacter(en.action.actor)?.name).filter(Boolean).join(" → ")}`);
  return entries;
}
function extEnemyParalyzed(e) {
  return extHasStatus(e, "paralysis") && Math.random() < (extIsBoss(e) ? .25 : .5);
}
function extPartyParalyzed(c) {
  return extHasStatus(c, "paralysis") && Math.random() < .5;
}
// 行動不能になった時、チャージ中のSP攻撃は中断される。
function extCancelCharge(c) {
  if (c && c._xjCharge) { c._xjCharge = null; pushEvent(`${c.name}のチャージが中断された！`); }
}
function extIsChargeLocked(c) { return !!c && !!c._xjCharge; }

/* ============================================================
   3. 新職業のスキル実行
   ============================================================ */
function extSkillBlocked(actor, skill) { return !!skill.xj && actor._overheat === true; }
function extSkillLabelExtra(actor, skill) {
  if (!skill.xj?.heat) return "";
  return ` ／ 熱 ${skill.xj.heat}${actor._overheat ? " ／ オーバーヒート" : ""}`;
}
function extSkillDamage(actor, enemy, x, mult) {
  let d;
  if (x.kind === "sp") {
    d = calcSp(effectiveSpAttackPower(actor) * x.mult * mult, Number.isFinite(enemy.spDefense) ? enemy.spDefense : Math.floor(enemy.defense / 2));
    d = applyElementalDamage(enemy, d, x.element);
  } else {
    d = calcEnemyPhysicalDamage(enemy, effectiveAttackPower(actor) * x.mult * mult);
    d = applyElementalDamage(enemy, d, x.element || getWeaponPhysicalElement(actor));
  }
  return Math.max(0, Math.floor(d));
}
function extPickTargets(enemy, a, all) {
  const living = livingEnemyTargets(enemy);
  if (all) return living;
  const chosen = (a.targetId ? living.find(t => t.ref.id === a.targetId || t.kind === a.targetId) : null) || living[0];
  return chosen ? [chosen] : [];
}
async function extDamageSkill(actor, skill, a, x, mult) {
  const enemy = battleState.enemy;
  const targets = extPickTargets(enemy, a, skill.target === "allEnemies");
  if (!targets.length) return 0;
  beginEnemyDamagePreview(enemy);
  // 首狩り：ボス以外は一定確率で即死
  if (x.instaKill && !extIsBoss(enemy) && Math.random() < x.instaKill) {
    const t = targets[0];
    const dealt = applyDamageToEnemyTarget(enemy, t, Math.max(1, t.ref.hp));
    pushLog(`${actor.name}の${skill.name}！ ${enemy.name}の魂を刈り取った！（即死）`);
    combatNumber(displayEnemyNode(), `-${dealt}`, "damage"); showHitEffect("slash"); flashEnemyDamage(); sound("damage", true);
    return dealt;
  }
  const d = extSkillDamage(actor, enemy, x, mult);
  let total = 0;
  const hits = x.hits || 1;
  for (let h = 0; h < hits; h++) {
    for (const t of targets) {
      if (enemyHpTotal(enemy) <= 0) break;
      const dealt = applyDamageToEnemyTarget(enemy, t, d);
      total += dealt;
      if (dealt > 0) addBreakDamage(enemy, "sp", x.element || "無属性", actor);
    }
    if (hits > 1) { showHitEffect(x.fx === "flame" ? "flame" : "magic"); renderBattle(); await wait(180); }
    if (enemyHpTotal(enemy) <= 0) break;
  }
  animateEnemyIcons(targets[0]);
  if (lastEnemyAttackMissed && total === 0) pushLog(`${enemy.name}は攻撃を回避した！`);
  else {
    pushLog(`${actor.name}の${skill.name}！ ${skill.target === "allEnemies" ? "敵全体" : enemy.name}に${total}ダメージ。`);
    combatNumber(displayEnemyNode(), `-${total}`, "damage");
    showHitEffect(x.fx === "slash" ? "slash" : x.fx === "flame" ? "flame" : "magic");
    flashEnemyDamage();
  }
  sound("damage", true);
  // 状態異常は命中した対象ごとに独立判定・独立管理する。
  if (x.status && enemyHpTotal(enemy) > 0 && total > 0) {
    for (const st of Array.isArray(x.status) ? x.status : [x.status]) {
      const label = EXT_STATUS_DEFS[st.type].label;
      for (const target of targets) {
        const unit = target.ref;
        if (!unit || unit.hp <= 0) continue;
        const chance = st.chance * (extIsBoss(enemy) ? (st.bossMul ?? .5) : 1);
        const unitName = unit.displayName || unit.name || enemy.name;
        if (Math.random() < chance) {
          const r = addStatus(unit, st.type, { turns: st.turns, power: st.power });
          if (r === "new" || r === "refresh") pushEvent(`${unitName}は${label}状態になった！`);
          else pushEvent(`${unitName}の${label}は変わらなかった。`);
        } else pushEvent(`${unitName}には${label}が効かなかった。`);
      }
    }
    renderBattle();
  }
  return total;
}
async function extExecuteSkill(actor, skill, a) {
  const x = skill.xj;
  if (x.buff) {
    for (const t of getParty().filter(c => c.hp > 0)) for (const [type, cfg] of Object.entries(x.buff)) addStatus(t, type, cfg);
    pushLog(`${actor.name}の${skill.name}！ 味方全体を強化した。`);
    for (const t of getParty().filter(c => c.hp > 0)) combatNumber(t.id, "UP", "heal");
    sound("heal"); renderBattle();
    return;
  }
  if (x.charge) {
    // SP攻撃は1ターンかけてチャージし、次のターンの行動順で放たれる。チャージ中は無防備。
    actor._xjCharge = { skillId: skill.id, targetId: a.targetId || null };
    pushLog(`${actor.name}は${skill.name}のチャージを開始した。`);
    pushEvent(`${actor.name}は魔力を集中している……！ 無防備だ！`, "warning");
    renderBattle();
    return;
  }
  await extDamageSkill(actor, skill, a, x, 1);
}
async function extImperialRelease(actor) {
  const st = actor._xjCharge; actor._xjCharge = null;
  const skill = (actor.spSkills || []).find(s => s.id === st?.skillId);
  if (!skill || enemyHpTotal(battleState.enemy) <= 0) return;
  animatePartyIcon(actor.id);
  pushEvent(`${actor.name}の「${skill.name}」が放たれる！`);
  await extDamageSkill(actor, skill, { targetId: st.targetId }, skill.xj, EXT_RELEASE_MULT);
  actor._heat = (actor._heat || 0) + (skill.xj.heat || 0);
  if (actor._heat >= EXT_HEAT_LIMIT) {
    actor._overheat = true;
    pushEvent(`${actor.name}はオーバーヒートした！ この戦闘中、スキルが使えない！`, "warning");
  }
  renderBattle();
}
// チャージ中の味方が受けるダメージ（applyPartyDamageAnimated から呼ばれる）
function extDefenselessMul(character, options) {
  return character && character._xjCharge && !options.statusDamage ? EXT_DEFENSELESS_MULT : 1;
}

/* ============================================================
   4. 敵バリエーション（STAGE1〜3）
   - クリア済みのステージでは、一定確率で別の敵が現れる（初回は従来どおり）。
   - ai：行動パターン。weight=選ばれやすさ / all=全体 / kind=phys|sp / status=付与する状態異常
     heal=自己回復の割合 / drain=与ダメージの割合だけ回復 / hpBelow=HPがこの割合以下で使用
     everyTurns=そのターン周期で必ず使用 / minTurn=このターン以降 / target=rear で後衛を狙う
   ============================================================ */
const EXT_ENEMY_VARIANTS = {
  1: [
    { variantId:"poison-slime", baseName:"スライム", name:"毒スライム", element:"無属性", weaknesses:["炎","氷","雷","聖"], resistances:[], physicalResistances:["斬撃","打撃","壊","突"], hp:200, attack:14, defense:4, spDefense:35, physicalDamageRate:.18, slimeLike:true, gold:12, sprite:"slime", speed:35,
      ai:[ { name:"毒液", weight:60, kind:"phys", power:1.0, status:{ type:"poison", chance:.65, turns:3, power:.06 } }, { name:"溶解液", weight:40, kind:"sp", power:1.0, status:{ type:"defenseDown", chance:.8, turns:3, power:5 } } ] },
    { variantId:"fire-slime", baseName:"スライム", name:"炎スライム", element:"炎", weaknesses:["氷"], resistances:["炎"], physicalResistances:["斬撃","打撃","壊","突"], hp:210, attack:13, spAttack:30, defense:4, spDefense:30, physicalDamageRate:.18, slimeLike:true, gold:12, sprite:"slime", speed:40,
      ai:[ { name:"火の粉", weight:60, kind:"sp", power:1.0, element:"炎", status:{ type:"burn", chance:.40, turns:2 } }, { name:"燃え広がる", weight:40, all:true, kind:"sp", power:.6, element:"炎", status:{ type:"burn", chance:.30, turns:2 }, everyTurns:3 } ] }
  ],
  2: [
    { variantId:"goblin-archer", baseName:"ゴブリン", name:"ゴブリンアーチャー", element:"無属性", weaknesses:["炎","斬撃"], resistances:[], hp:320, attack:40, defense:8, gold:22, sprite:"goblin", speed:70,
      ai:[ { name:"狙い撃ち", weight:60, kind:"phys", power:1.2, target:"rear" }, { name:"毒矢", weight:40, kind:"phys", power:.9, status:{ type:"poison", chance:.5, turns:3, power:.06 } } ] },
    { variantId:"goblin-shaman", baseName:"ゴブリン", name:"ゴブリンシャーマン", element:"無属性", weaknesses:["炎","斬撃"], resistances:[], hp:340, attack:20, spAttack:46, defense:8, spDefense:25, gold:24, sprite:"goblin", speed:50,
      ai:[ { name:"火の玉", weight:45, kind:"sp", power:1.0, element:"炎", status:{ type:"burn", chance:.35, turns:2 } }, { name:"弱体の呪文", weight:30, all:true, kind:"sp", power:.5, status:{ type:"attackDown", chance:.6, turns:3, power:.2 } }, { name:"癒やしの祈り", weight:35, heal:.18, hpBelow:.6 } ] }
  ],
  3: [
    { variantId:"giant-bat", baseName:"オオカミ", name:"大コウモリ", element:"無属性", weaknesses:["雷","炎"], resistances:[], hp:520, attack:36, defense:14, gold:34, sprite:"wolf", speed:110,
      ai:[ { name:"吸血", weight:45, kind:"phys", power:1.0, drain:.4 }, { name:"麻痺の牙", weight:35, kind:"phys", power:.8, status:{ type:"paralysis", chance:.5, turns:2 } }, { name:"超音波", weight:20, all:true, kind:"sp", power:.5, status:{ type:"paralysis", chance:.25, turns:2 } } ] },
    { variantId:"giant-spider", baseName:"オオカミ", name:"大蜘蛛", element:"無属性", weaknesses:["炎"], resistances:[], hp:600, attack:38, spAttack:36, defense:22, spDefense:14, gold:38, sprite:"wolf", speed:60,
      ai:[ { name:"毒牙", weight:50, kind:"phys", power:1.0, status:{ type:"poison", chance:.7, turns:4, power:.06 } }, { name:"蜘蛛の糸", weight:30, kind:"phys", power:.6, status:{ type:"defenseDown", chance:.8, turns:3, power:6 } }, { name:"麻痺糸", weight:20, all:true, kind:"sp", power:.4, status:{ type:"paralysis", chance:.3, turns:2 } } ] }
  ]
};
// クリア済みのステージのみ、約半分の確率で別の敵が現れる。
function extPickEnemyVariant(stage) {
  const list = EXT_ENEMY_VARIANTS[stage];
  if (!list || battleState.tutorialMode || battleState.hiddenBossMode || !stageCleared[stage] || Math.random() >= .5) return null;
  const v = JSON.parse(JSON.stringify(list[Math.floor(Math.random() * list.length)]));
  const base = enemyData[stage - 1];
  return { ...v, image: base.image, maxHp: v.hp, spDefense: Number.isFinite(v.spDefense) ? v.spDefense : Math.floor(v.defense / 2), compendiumAs: v.baseName, dropAs: v.baseName };
}
function extWeightedPick(list) {
  const total = list.reduce((n, a) => n + (a.weight || 1), 0);
  let r = Math.random() * total;
  for (const a of list) { r -= (a.weight || 1); if (r <= 0) return a; }
  return list[list.length - 1];
}
function extPickPartyTarget(alive, act) {
  const taunt = alive.find(c => c.id === battleState.tauntTarget);
  if (taunt) return taunt;
  if (act.target === "rear") { const rear = alive.filter(c => EXT_REAR_IDS.includes(c.id)); if (rear.length) return rear[Math.floor(Math.random() * rear.length)]; }
  return alive[Math.floor(Math.random() * alive.length)];
}
async function extVariantAction(e, turn) {
  const alive = livingParty(); if (!alive.length) return;
  const ratio = enemyHpTotal(e) / e.maxHp;
  const usable = e.ai.filter(a => (!a.minTurn || turn >= a.minTurn) && (!a.hpBelow || ratio <= a.hpBelow));
  const forced = usable.find(a => a.everyTurns && turn % a.everyTurns === 0);
  const act = forced || extWeightedPick(usable.filter(a => !a.everyTurns).length ? usable.filter(a => !a.everyTurns) : usable);
  if (act.heal) {
    const before = e.hp; e.hp = Math.min(e.maxHp, e.hp + Math.floor(e.maxHp * act.heal));
    pushEvent(`${e.name}は「${act.name}」を唱えた！ HPが${e.hp - before}回復した。`); renderBattle(); return;
  }
  animateEnemyAttack();
  const sp = act.kind === "sp";
  pushEvent(`${e.name}は「${act.name}」${act.all ? "を放った" : "で攻撃した"}！`);
  sound("damage", true);
  const targets = act.all ? alive.slice() : [extPickPartyTarget(alive, act)];
  for (const c of targets) {
    if (c.hp <= 0) continue;
    let d;
    if (sp) d = Math.floor(calcSp((e.spAttack || e.attack) * (act.power || 1), effectiveSpDefense(c)) * (battleState.guarding[c.id] ? .5 : 1));
    else d = Math.floor(calcPhysical(e.attack * (act.power || 1), effectiveStats(c).defense, !!battleState.guarding[c.id]) * (1 - (battleState.guarding[c.id] || 0)));
    const dealt = await applyPartyDamageAnimated(c, d, { normalAttack: !sp, spAttack: sp, magic: sp, element: act.element });
    if (dealt > 0 && !act.all) pushEvent(`${c.name}に${dealt}ダメージ。`);
    if (act.drain && dealt > 0) { const before = e.hp; e.hp = Math.min(e.maxHp, e.hp + Math.floor(dealt * act.drain)); if (e.hp > before) pushEvent(`${e.name}はHPを${e.hp - before}吸い取った！`); }
    if (c.hp > 0 && act.status && Math.random() < act.status.chance) extInflict(c, act.status.type, act.status);
    if (c.hp <= 0) pushEvent(`${c.name}は戦闘不能になった！`);
  }
  battleState.tauntTarget = null;
}

/* ============================================================
   ボスの行動拡張
   - ドラゴン：炎属性・SP攻撃主体の全体攻撃＋火傷（ダメージは持続）
   - 魔王    ：闇属性・最大HP割合の全体攻撃＋呪い（回復と攻撃が落ちる）
   ============================================================ */
// 魔王のフェーズ行動。行動した場合は true を返す。
async function extMaouPhaseAction(e, turn, alive) {
  const ratio = enemyHpTotal(e) / e.maxHp;
  const phase = ratio > .66 ? 1 : ratio > .33 ? 2 : 3;
  if (phase > (e._phase || 1)) {
    e._phase = phase;
    pushEvent(phase === 2 ? "魔王の瞳が妖しく光る……！ 攻撃が激しさを増す！" : "魔王の魔力が暴走する……！ 終焉の闇が迫る！", "warning");
    await wait(900);
  }
  if (phase === 1) return false;
  const r = Math.random();
  const arena = () => document.querySelector(".battle-arena");
  const guardRate = c => battleState.fullGuardActive && c.id === "knight" ? 1 - (battleState._fullGuardReduction || .4) : battleState.guarding[c.id] ? .5 : 1;
  const hits = (phase === 3 && r < .25) ? 5 : (phase === 2 && r < .30) ? 3 : 0;
  if (hits) {
    pushEvent(`魔王は「暗黒連撃」を繰り出した！（${hits}連撃）`, "warning");
    for (let i = 0; i < hits; i++) {
      const live = livingParty(); if (!live.length) break;
      const t = live.find(c => c.id === battleState.tauntTarget) || live[Math.floor(Math.random() * live.length)];
      animateEnemyAttack(); sound("damage", true);
      const d = Math.floor(calcPhysical(e.attack * .6, effectiveStats(t).defense, !!battleState.guarding[t.id]) * (1 - (battleState.guarding[t.id] || 0)));
      await applyPartyDamageAnimated(t, d, { normalAttack: true });
      await wait(200);
    }
    return true;
  }
  if (phase === 3 && r >= .25 && r < .60) {
    pushEvent("魔王は「終焉の闇」を放った！", "warning"); animateEnemyAttack(); sound("damage", true);
    arena()?.classList.add("maou-dark-flames"); setTimeout(() => arena()?.classList.remove("maou-dark-flames"), battleDelayMs(850));
    for (const c of alive.slice()) {
      if (c.hp <= 0) continue;
      const d = Math.floor((Math.floor((e.spAttack || 100) * .5) + Math.floor(effectiveStats(c).maxHp * .14)) * guardRate(c));
      await applyPartyDamageAnimated(c, d, { element: "闇", magic: true });
      if (c.hp > 0 && Math.random() < .7) extInflict(c, "curse", { turns: 3, power: .15 });
    }
    return true;
  }
  if (r >= (phase === 3 ? .60 : .30) && r < (phase === 3 ? .72 : .45)) {
    const t = extPickPartyTarget(alive, {});
    pushEvent(`魔王は「魂喰らい」で${t.name}を襲った！`, "warning"); animateEnemyAttack(); sound("damage", true);
    const d = Math.floor(calcSp((e.spAttack || 100) * 1.3, effectiveSpDefense(t)) * (battleState.guarding[t.id] ? .5 : 1));
    const dealt = await applyPartyDamageAnimated(t, d, { spAttack: true, magic: true, element: "闇" });
    if (dealt > 0) { const before = e.hp; e.hp = Math.min(e.maxHp, e.hp + Math.floor(e.maxHp * .04)); if (e.hp > before) pushEvent(`魔王はHPを${e.hp - before}回復した！`); }
    return true;
  }
  return false;
}
