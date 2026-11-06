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
  // インペリアル専用パネル（script.js の renderImperialStatus）との接続口。
  // パネルは heatGauge / overheated / exposed という標準名で状態を読むため、内部の _heat / _overheat / _xjCharge を読み取り専用で公開する。
  // enumerable:false なので、セーブデータや JSON には含まれない。
  const imperial = characters.find(c => c.id === "imperial");
  if (imperial) {
    Object.defineProperties(imperial, {
      heatGauge: { get() { return this._heat || 0; }, enumerable: false },
      overheated: { get() { return this._overheat === true; }, enumerable: false },
      exposed: { get() { return !!this._xjCharge; }, enumerable: false }
    });
  }
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
function extAvailableCharacters() { return characters.filter(c => extIsJobAvailable(c)); }  // インペリアルも解放後は選べる
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
// 状態異常の定義（表示名・アイコン・性質）は data/status-effects.js を参照。
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
  battleState._evSnap = {}; battleState._evAction = null;
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
   - 優先度3：ユニオンスキル（最優先）
   - 優先度2：挑発・防御系スキル
   - 優先度1：通常防御・速攻指定された攻撃スキル
   - 優先度なし：その他の行動と敵行動（速度順）
   - 数字が大きいほど優先。同一優先度内は速度順。同速なら味方を先にする。
   ============================================================ */
const EXT_ACTION_PRIORITY = Object.freeze({
  QUICK_ATTACK: 1,
  GUARD: 1,
  DEFENSIVE_SKILL: 2,
  UNION: 3,
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
   データ（敵の能力・行動パターン）は data/enemy-variants.js にあります。
   ここには、出現判定と行動の処理だけを置いています。
   ============================================================ */
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
  if (act.all && battleState.tauntTarget && alive.some(c => c.id === battleState.tauntTarget)) pushEvent("騎士の挑発で敵の注意を引いた！ ただし全体攻撃は防ぎきれない。");
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
// 魔王のフェーズ行動。行動した場合は true を返す。数値・技名は data/boss-phases.js。
async function extMaouPhaseAction(e, turn, alive) {
  const cfg = EXT_MAOU_PHASES;
  const ratio = enemyHpTotal(e) / e.maxHp;
  const phase = ratio > cfg.thresholds[0] ? 1 : ratio > cfg.thresholds[1] ? 2 : 3;
  if (phase > (e._phase || 1)) {
    e._phase = phase;
    pushEvent(cfg.messages[phase], "warning");
    await wait(900);
  }
  const list = cfg.phases[phase];
  if (!list) return false;
  const r = Math.random();
  // chance を上から足し合わせた区間のどこに r が入るかで、行動を選ぶ（誤差が出ないよう小数6桁で丸める）。
  let upTo = 0, act = null;
  for (const a of list) { upTo = Math.round((upTo + a.chance) * 1e6) / 1e6; if (r < upTo) { act = a; break; } }
  if (!act) return false;
  const arena = () => document.querySelector(".battle-arena");
  const guardRate = c => battleState.fullGuardActive && c.id === "knight" ? 1 - (battleState._fullGuardReduction || .4) : battleState.guarding[c.id] ? .5 : 1;
  if (act.type === "combo") {
    pushEvent(`魔王は「${act.name}」を繰り出した！（${act.hits}連撃）`, "warning");
    for (let i = 0; i < act.hits; i++) {
      const live = livingParty(); if (!live.length) break;
      const t = live.find(c => c.id === battleState.tauntTarget) || live[Math.floor(Math.random() * live.length)];
      animateEnemyAttack(); sound("damage", true);
      const d = Math.floor(calcPhysical(e.attack * act.power, effectiveStats(t).defense, !!battleState.guarding[t.id]) * (1 - (battleState.guarding[t.id] || 0)));
      await applyPartyDamageAnimated(t, d, { normalAttack: true });
      await wait(200);
    }
    return true;
  }
  if (act.type === "darkness") {
    pushEvent(`魔王は「${act.name}」を放った！`, "warning"); animateEnemyAttack(); sound("damage", true);
    arena()?.classList.add("maou-dark-flames"); setTimeout(() => arena()?.classList.remove("maou-dark-flames"), battleDelayMs(850));
    for (const c of alive.slice()) {
      if (c.hp <= 0) continue;
      const d = Math.floor((Math.floor((e.spAttack || 100) * act.spMult) + Math.floor(effectiveStats(c).maxHp * act.hpRate)) * guardRate(c));
      await applyPartyDamageAnimated(c, d, { element: "闇", magic: true });
      if (c.hp > 0 && Math.random() < act.curse.chance) extInflict(c, "curse", { turns: act.curse.turns, power: act.curse.power });
    }
    return true;
  }
  if (act.type === "soulEat") {
    const t = extPickPartyTarget(alive, {});
    pushEvent(`魔王は「${act.name}」で${t.name}を襲った！`, "warning"); animateEnemyAttack(); sound("damage", true);
    const d = Math.floor(calcSp((e.spAttack || 100) * act.spMult, effectiveSpDefense(t)) * (battleState.guarding[t.id] ? .5 : 1));
    const dealt = await applyPartyDamageAnimated(t, d, { spAttack: true, magic: true, element: "闇" });
    if (dealt > 0) { const before = e.hp; e.hp = Math.min(e.maxHp, e.hp + Math.floor(e.maxHp * act.healRate)); if (e.hp > before) pushEvent(`魔王はHPを${e.hp - before}回復した！`); }
    return true;
  }
  return false;
}

/* ============================================================
   5. 戦闘イベント（演出・UI側への通知）
   ------------------------------------------------------------
   戦闘の処理が「いま起きたこと」を document に CustomEvent で知らせます。
   イベント名は "battle:" + 名前（例: battle:damage:applied）。詳細は event.detail。
   ・通知するだけで、戦闘の計算・順序・乱数は変えません（待ちもしません）。
   ・リスナーが無くても、あっても、戦闘の結果は同じです。
   ・リスナー側で例外が出ても、戦闘は止まりません。
   仕様の一覧は docs/battle-visual-refresh/EVENT_SPEC.md を参照してください。
   ============================================================ */
function battleEmit(name, detail) {
  try {
    const d = Object.assign({ turn: (battleState?.turnCount || 0) + 1 }, detail);
    document.dispatchEvent(new CustomEvent("battle:" + name, { detail: d }));
  } catch (err) { /* 通知の失敗で戦闘を止めない */ }
}

// 味方の「悪い状態異常」の識別子（拡張側の状態異常 + 行動不能）。表示の背景色などの判定に使う。
// 返す識別子：burn / poison / paralysis / curse / defenseDown / attackDown / stun
function extGetStatusIds(c, includeBeneficial) {
  if (!c) return [];
  const bag = extStatusBag(c, false), ids = [];
  if (bag) for (const [type, s] of Object.entries(bag)) {
    if (!(s.turns > 0)) continue;
    if (includeBeneficial || EXT_STATUS_DEFS[type]?.harm) ids.push(type);
  }
  if (isActionIncapacitated(c)) ids.push("stun");
  return ids;
}

// インペリアルの熱（SP攻撃コマンド右側の縦線の本数）。現在値・最大値・直前の値を返す。
function extImperialGauge(c) {
  c = c || getCharacter("imperial");
  if (!c) return null;
  return { characterId: c.id, heat: c._heat || 0, max: EXT_HEAT_LIMIT, overheated: c._overheat === true, charging: !!c._xjCharge };
}

// renderBattle の末尾から呼ばれ、前回との差分から「状態異常の付与／解除」と「熱の増減」を通知する。
// 付与・解除の経路（時間切れ・解除スキル・スタン消費など）がいくつあっても、ここで1か所にまとまる。
function extEmitStateChanges() {
  try {
    const snap = battleState._evSnap || (battleState._evSnap = {});
    for (const c of getParty()) {
      const prev = snap[c.id] || { status: [], heat: 0, overheated: false };
      const status = extGetStatusIds(c);
      for (const id of status) if (!prev.status.includes(id)) battleEmit("status:added", { targetId: c.id, statusId: id, statuses: status.slice() });
      for (const id of prev.status) if (!status.includes(id)) battleEmit("status:cleared", { targetId: c.id, statusId: id, statuses: status.slice() });
      const heat = c._heat || 0, overheated = c._overheat === true;
      if (c.id === "imperial" && (heat !== prev.heat || overheated !== prev.overheated)) {
        battleEmit("imperial:changed", { characterId: c.id, heat, before: prev.heat, max: EXT_HEAT_LIMIT, overheated });
      }
      snap[c.id] = { status, heat, overheated };
    }
  } catch (err) { /* 通知の失敗で戦闘を止めない */ }
}

// 行動の種類を演出向けに分類する：normal / sp / magic / guard / union / item
function extActionInfo(action) {
  const actor = getCharacter(action.actor);
  const info = { actorId: action.actor, side: "party", kind: "normal", skillId: null, skillName: null, element: null, targetIds: [], partnerId: action.partner || null };
  if (action.type === "guard") info.kind = "guard";
  else if (action.type === "union") { info.kind = "union"; info.skillName = unionSkills[action.actor]?.name || null; info.participantIds = [action.actor, ...(action.partner ? [action.partner] : [])]; }
  else if (action.type === "item") { info.kind = "item"; info.targetIds = [action.target].filter(Boolean); }
  else if (action.type === "imperial-release") {
    const skill = (actor?.spSkills || []).find(s => s.id === actor._xjCharge?.skillId);
    info.kind = "sp"; info.skillId = skill?.id || null; info.skillName = skill?.name || null; info.element = skill?.element || null; info.released = true;
  } else if (action.type === "skill") {
    const skill = getCharacterSkills(actor).find(s => s.id === action.skillId);
    const magicTypes = ["level-lightning-all", "level-lightning-single", "level-flare", "level-magic-bomb", "holy-light"];
    info.skillId = action.skillId; info.skillName = skill?.name || null; info.element = skill?.element || null;
    info.kind = (skill && (magicTypes.includes(skill.type) || (actor?.id === "mage" && !skill.xj))) ? "magic" : "sp";
    info.targetIds = action.targetIds ? action.targetIds.slice() : (action.targetId ? [action.targetId] : (action.target ? [action.target] : []));
  } else if (action.targetId) info.targetIds = [action.targetId];
  return info;
}

// 行動の開始／終了。行動中は battleState._evAction に現在の行動を持ち、ダメージ通知に添える。
function extEmitActionStart(info) {
  battleState._evAction = info;
  battleEmit("action:start", info);
}
function extEmitActionEnd() {
  const info = battleState._evAction; battleState._evAction = null;
  if (info) battleEmit("action:end", info);
}
function extEmitEnemyActionStart() {
  const e = battleState.enemy; if (!e) return;
  const name = describeEnemyAction(e, battleState.turnCount + 1);
  // 敵の「特殊攻撃」かどうかは行動名で判定する。実際に当たった攻撃の詳細は damage:applied を参照。
  extEmitActionStart({ actorId: "enemy", side: "enemy", kind: name === (e.actionName || "通常攻撃") ? "enemy-normal" : "enemy-special", skillId: null, skillName: name, element: e.element || null, targetIds: [] });
}

// ダメージの確定（HPが実際に減った直後）。miss=true は回避・ミスで、ダメージ0。
function extEmitDamage(targetId, side, amount, extra) {
  battleEmit(amount > 0 ? "damage:applied" : "damage:missed", Object.assign({ targetId, side, amount, action: battleState._evAction || null }, extra));
}
