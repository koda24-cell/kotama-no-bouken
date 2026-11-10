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
    if (item.id === "leather-armor") {
      for (const id of EXT_NEW_JOB_IDS) if (!EXT_REAR_IDS.includes(id) && id !== "samurai" && !item.classes.includes(id)) item.classes.push(id);
      item.armorRole = "front";
    } else if (Array.isArray(item.classes) && item.classes.includes("samurai") && item.classes.includes("kotama") && item.classes.length >= 6) {
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
// 別名（data/status-effects.js の EXT_STATUS_ALIASES）を正式IDへ読み替える。
function extStatusId(type) { return (typeof EXT_STATUS_ALIASES === "object" && EXT_STATUS_ALIASES[type]) || type; }
function extHasStatus(t, type) { type = extStatusId(type); const b = extStatusBag(t, false); return !!(b && b[type] && b[type].turns > 0); }
function extStatusPower(t, type) { type = extStatusId(type); const b = extStatusBag(t, false); return b && b[type] ? b[type].power : 0; }

function extEnemyStatEffect(rec, type, apply, target) {
  const e = target || battleState.enemy; if (!e) return;
  if (type === "attackDown") {
    if (apply) { rec.lost = Math.floor((e.attack || 0) * rec.power); e.attack = Math.max(0, (e.attack || 0) - rec.lost); }
    else { e.attack = (e.attack || 0) + (rec.lost || 0); rec.lost = 0; }
  } else if (type === "defenseDown") {
    if (apply) { rec.lost = Math.floor((e.defense || 0) * rec.power); e.defense = Math.max(0, (e.defense || 0) - rec.lost); }
    else { e.defense = (e.defense || 0) + (rec.lost || 0); rec.lost = 0; }
  } else if (type === "bindArm" || type === "bindHead") {
    // 封じ：腕＝攻撃力、頭＝SP攻撃力を下げ、切れると元に戻す（強さは data/status-effects.js の EXT_AILMENT_RULES）。
    const key = type === "bindArm" ? "attack" : "spAttack";
    const mul = type === "bindArm" ? EXT_AILMENT_RULES.bindArm.attackMul : EXT_AILMENT_RULES.bindHead.enemySpAttackMul;
    if (apply) { rec.lost = Math.floor((e[key] || 0) * (1 - mul)); if (Number.isFinite(e[key])) e[key] = Math.max(0, e[key] - rec.lost); }
    else { if (Number.isFinite(e[key])) e[key] += (rec.lost || 0); rec.lost = 0; }
  }
}
// 戻り値："new"（新規）／"refresh"（持続か強さを更新）／"same"（変化なし）／false（付与できない）
function addStatus(t, type, opts = {}) {
  type = extStatusId(type);
  const def = EXT_STATUS_DEFS[type], bag = extStatusBag(t, true);
  if (!def || !bag) return false;
  // 同系統の強化・弱体化は相殺する（残存する効果を同時に保持しない）。
  const opposite = { attackDown:"attackUp", defenseDown:"defenseUp", attackUp:"attackDown", defenseUp:"defenseDown" }[type];
  if (opposite && bag[opposite]) { extRemoveStatus(t, opposite); return "same"; }
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
  type = extStatusId(type);
  const bag = extStatusBag(t, false); if (!bag || !bag[type]) return;
  if (!extIsParty(t)) extEnemyStatEffect(bag[type], type, false, t);
  delete bag[type];
  if (extIsParty(t)) extGrantPartyImmunity(t, type);
}
function extClearHarmful(t) {
  const bag = extStatusBag(t, false); if (!bag) return;
  for (const k of Object.keys(bag)) if (EXT_STATUS_DEFS[k]?.harm) extRemoveStatus(t, k);
}
// 味方への付与：ログ付き。
function extInflict(target, type, opts = {}) {
  const r = addStatus(target, type, opts);
  if (r === "new" || r === "refresh") { pushEvent(`${target.name}は${EXT_STATUS_DEFS[extStatusId(type)].label}状態になった！`); renderBattle(); }
  return r;
}
/* ============================================================
   1-b. 睡眠・混乱・封じ・耐性（Claude C / C2）
   - 効果量・ルールは data/status-effects.js の EXT_AILMENT_RULES。
   - 付与率は extStatusChance() の1か所で決める。付与の判定は extTryStatus()（乱数は従来どおり1回だけ使う）。
   - 付与に失敗したときは battle:status:resist を通知する（reason：immune／resisted／tolerance）。
   ============================================================ */
let extPartyImmunity = {};   // 味方ID → { 状態ID: このラウンドまで免疫 }
function extCurrentRound() { return (battleState?.turnCount || 0) + 1; }
// 味方の麻痺・睡眠が治ったとき、次のラウンドまで同じ状態にならない。
function extGrantPartyImmunity(c, type) {
  const rule = EXT_AILMENT_RULES.partyImmunity;
  if (!c || !rule || !rule.types.includes(type)) return;
  (extPartyImmunity[c.id] ||= {})[type] = extCurrentRound() + (rule.rounds || 1);
}
function extPartyImmune(c, type) { const until = extPartyImmunity[c?.id]?.[type]; return Number.isFinite(until) && extCurrentRound() <= until; }
function extTickPartyImmunity() {
  for (const id of Object.keys(extPartyImmunity)) for (const [type, until] of Object.entries(extPartyImmunity[id])) if (until < extCurrentRound()) delete extPartyImmunity[id][type];
}
// 確実に行動できない状態（睡眠・既存の拘束）。麻痺・混乱は確率なので含めない。
function extHardDisabled(c) { return !!c && (extHasStatus(c, "sleep") || extHasStatus(c, "petrify") || (typeof isActionIncapacitated === "function" && isActionIncapacitated(c))); }
// ラウンド開始時：生存者全員が行動不能なら連続回数を数える。
function extUpdatePartyLockStreak() {
  const alive = getParty().filter(c => c.hp > 0);
  battleState._partyLockStreak = alive.length && alive.every(extHardDisabled) ? (battleState._partyLockStreak || 0) + 1 : 0;
}
// 敵の状態異常耐性（1.0=通常、0=無効）。個体 → 敵本体 → ボスの既定値 → 1.0 の順に探す。
function extAilmentResist(unit, type) {
  type = extStatusId(type);
  const e = battleState.enemy;
  const own = unit?.ailmentResist?.[type] ?? e?.ailmentResist?.[type];
  if (Number.isFinite(own)) return Math.max(0, own);
  if (extToleranceTarget(e)) { const d = EXT_AILMENT_RULES.bossDefaultResist?.[type]; if (Number.isFinite(d)) return d; }
  return 1;
}
// 「付与されるたびに耐性が上がる」対象：ボス（EXT_BOSS_NAMES）、ステージ戦の階層ボス、ailmentTolerance:true の敵。
function extToleranceTarget(e) {
  if (!e) return false;
  if (typeof e.ailmentTolerance === "boolean") return e.ailmentTolerance;
  if (extIsBoss(e)) return true;
  return !battleState.encounterMode && !battleState.tutorialMode && Array.isArray(typeof enemyData !== "undefined" ? enemyData : null) && enemyData.some(d => d.name === e.name);
}
function extToleranceKey(unit) { return unit === battleState.enemy || unit?.id == null ? "enemy" : String(unit.id); }
function extToleranceCount(unit, type) { return battleState._ailmentTolerance?.[extToleranceKey(unit)]?.[extStatusId(type)] || 0; }
function extAddTolerance(unit, type) {
  const t = (battleState._ailmentTolerance ||= {}), k = extToleranceKey(unit);
  (t[k] ||= {})[extStatusId(type)] = extToleranceCount(unit, type) + 1;
}
// [#51 統合点] 味方の状態異常耐性（VIT など）。基準では 1（補正なし）。
function extPartyAilmentResistMul(target) { return 1; }
// [#52 統合点] 味方が敵に付与するときの付与率補正（LUC など）。基準では 1（補正なし）。
function extInflictorAilmentMul(source) { return 1; }
/* 付与率の唯一の計算式。
   付与率 = 基本付与率 × 全体倍率 × (味方→敵：bossMul × 敵の耐性 × ボスの耐性上昇 × 付与者補正)
                               (敵→味方：味方の耐性補正、治った直後の免疫・全員行動不能の上限なら 0)
   戻り値 { chance, reason }。reason は付与率を 0 にした理由（"immune"／"tolerance"）か null。 */
function extStatusChance(source, target, type, baseChance, opts = {}) {
  type = extStatusId(type);
  const rules = EXT_AILMENT_RULES, g = rules.globalMul || {};
  let chance = Number(baseChance) || 0, reason = null;
  if (extIsParty(target)) {
    chance *= source?.foe ? (g.toPartyFromFoe ?? 1) : (g.toParty ?? 1);
    chance *= extPartyAilmentResistMul(target);
    if (extPartyImmune(target, type)) { chance = 0; reason = "tolerance"; }
    else if (type === "sleep" && (battleState._partyLockStreak || 0) >= (rules.partyAllLockCap ?? 1)) {
      const others = getParty().filter(c => c.hp > 0 && c !== target);
      if (others.every(extHardDisabled)) { chance = 0; reason = "tolerance"; }
    }
  } else {
    const e = battleState.enemy;
    chance *= g.toEnemy ?? 1;
    if (extIsBoss(e)) chance *= opts.bossMul ?? .5;
    const resist = extAilmentResist(target, type);
    if (resist <= 0) { chance = 0; reason = "immune"; }
    chance *= resist;
    if (chance > 0 && extToleranceTarget(e) && (rules.bossTolerance?.types || []).includes(type)) {
      const n = extToleranceCount(target, type);
      if (n > 0) { chance *= Math.pow(1 - (rules.bossTolerance.step ?? .5), n); if (chance <= 0) reason = "tolerance"; }
    }
    if (source && extIsParty(source)) chance *= extInflictorAilmentMul(source);
  }
  return { chance: Math.max(0, Math.min(rules.maxChance ?? 1, chance)), reason };
}
// 付与の判定。乱数は付与率に関係なく1回だけ使う（既存の戦闘結果の再現性を保つ）。
function extTryStatus(source, target, type, baseChance, opts = {}) {
  const { chance, reason } = extStatusChance(source, target, type, baseChance, opts);
  const surprise = source?.id === "assassin" && !battleState._assassinHitPreviousTurn && !battleState._assassinHitThisTurn && !battleState._enemyActedThisTurn;
  const adjustedChance = surprise ? Math.min(1, chance * 1.5) : chance;
  const hit = Math.random() < adjustedChance;
  if (hit) { if (!extIsParty(target) && extToleranceTarget(battleState.enemy)) extAddTolerance(target, type); return true; }
  battleEmit("status:resist", {
    targetId: extIsParty(target) ? target.id : (target === battleState.enemy ? "enemy" : target?.id ?? "enemy"),
    targetName: target?.displayName || target?.name || battleState.enemy?.name || "",
    side: extIsParty(target) ? "party" : "enemy",
    type: extStatusId(type),
    reason: reason || "resisted",
    chance
  });
  return false;
}
// スキルが使う部位："head"／"arm"／null（封じの影響なし）
function extSkillBodyPart(skill) {
  if (!skill) return null;
  if (skill.bodyPart === "arm" || skill.bodyPart === "head" || skill.bodyPart === "none") return skill.bodyPart === "none" ? null : skill.bodyPart;
  if (EXT_SKILL_BODY_PART.none.includes(skill.type)) return null;
  if (EXT_SKILL_BODY_PART.arm.includes(skill.type)) return "arm";
  if (skill.xj) return ["phys", "physical"].includes(skill.xj.kind) ? "arm" : "head";
  return "head";
}
// 封じで使えない理由（使えるなら ""）。スキル選択の灰色表示と、行動直前の判定の両方で使う。
function extSkillSealReason(actor, skill) {
  const part = extSkillBodyPart(skill);
  if (part === "head" && extHasStatus(actor, "bindHead")) return "頭封じのため、このスキルは使えません。";
  if (part === "arm" && extHasStatus(actor, "bindArm")) return "腕封じのため、このスキルは使えません。";
  return "";
}
// 回避率の倍率（脚封じ中は回避できない）
function extEvasionMul(c) { return extHasStatus(c, "bindLeg") ? EXT_AILMENT_RULES.bindLeg.evasionMul : 1; }
// 逃走できないか（脚封じの味方がいる）。逃走処理（field.js の撤退など）から参照する想定。
function extEscapeBlocked() { return getParty().some(c => c.hp > 0 && extHasStatus(c, "bindLeg")); }
// 味方の行動直前（スピード順ラウンドのみ）：睡眠・混乱・封じ。行動を取りやめた場合は true。
async function extPartyAilmentTurn(actor, action) {
  if (!actor || actor.hp <= 0) return false;
  if (extHasStatus(actor, "petrify")) { extCancelCharge(actor); pushEvent(`${actor.name}は石化して動けない！`); renderBattle(); await wait(600); return true; }
  if (extHasStatus(actor, "sleep")) {
    extCancelCharge(actor); pushEvent(`${actor.name}は眠っていて動けない！`); renderBattle(); await wait(600); return true;
  }
  if (extHasStatus(actor, "confusion") && action && action.type !== "guard" && Math.random() < EXT_AILMENT_RULES.confusion.misactChance) {
    extCancelCharge(actor);
    const allies = getParty().filter(c => c.hp > 0 && c !== actor);
    const victim = allies.length ? allies[Math.floor(Math.random() * allies.length)] : null;
    if (!victim) { pushEvent(`${actor.name}は混乱してうろたえている！`); renderBattle(); await wait(600); return true; }
    pushEvent(`${actor.name}は混乱して${victim.name}を攻撃した！`, "warning");
    const d = calcPhysical(effectiveAttackPower(actor), effectiveStats(victim).defense, !!battleState.guarding[victim.id]);
    await applyPartyDamageAnimated(victim, d, { normalAttack: true });
    if (victim.hp <= 0) pushEvent(`${victim.name}は戦闘不能になった！`);
    return true;
  }
  if (action && action.type === "skill") {
    const skill = getCharacterSkills(actor).find(s => s.id === action.skillId);
    const sealed = extSkillSealReason(actor, skill);
    if (sealed) { pushEvent(`${actor.name}は封じられていて「${skill.name}」を使えない！`, "warning"); renderBattle(); await wait(600); return true; }
  }
  return false;
}
// 敵の行動直前（スピード順ラウンドのみ）：睡眠・混乱。行動を取りやめた場合は true。
async function extEnemyAilmentTurn(e) {
  if (!e) return false;
  if (extHasStatus(e, "sleep")) { pushEvent(`${e.name}は眠っている……。`); return true; }
  if (extHasStatus(e, "confusion") && Math.random() < EXT_AILMENT_RULES.confusion.misactChance) { pushEvent(`${e.name}は混乱してうろたえている！`); return true; }
  return false;
}
// 敵の被ダメージ倍率（睡眠中は増える）。applyDamageToEnemyTarget／applyDamageToEnemy の先頭から呼ばれる。
// target が "main" の場合は applyDamageToEnemy 側で掛けるので、ここでは掛けない（二重適用の防止）。
function extEnemyDamageTakenMul(enemy, target, amount) {
  if (!enemy || !(amount > 0) || battleState._statusTick) return amount;
  if (target && target.kind === "main") return amount;
  const unit = target ? target.ref : (enemy.members ? enemy.members.find(m => m.hp > 0) : enemy);
  return unit && extHasStatus(unit, "sleep") ? Math.floor(amount * EXT_AILMENT_RULES.sleep.damageTakenMul) : amount;
}
// ダメージを受けたら睡眠から覚める（毒・火傷などの状態異常ダメージを除く）。extEmitDamage から呼ばれる。
function extWakeOnDamage(targetId, side, extra) {
  if (extra?.statusDamage || battleState._statusTick) return;
  let unit = null;
  if (side === "party") unit = getCharacter(targetId);
  else if (battleState.enemy) {
    const e = battleState.enemy;
    unit = targetId === "enemy" ? e : (e.members || []).find(m => m.id === targetId) || (battleState.wolfClones || []).find(c => c.id === targetId) || (targetId === "wolf-main" ? e : null);
  }
  if (!unit || !extHasStatus(unit, "sleep")) return;
  extRemoveStatus(unit, "sleep");
  pushEvent(`${unit.displayName || unit.name}は目を覚ました！`);
}
function extDefenseDownAmount(c) {
  if (!extHasStatus(c, "defenseDown")) return 0;
  const p = extStatusPower(c, "defenseDown");
  return p >= 1 ? p : Math.floor((c.defense || 0) * p);
}
// 能力値への反映（effectiveStats から呼ばれる）
function extApplyStatusStats(c, raw) {
  const mul = (key, rate) => { raw[key] = Math.max(0, Math.floor(raw[key] * rate)); };
  raw.speed = Math.floor((Number.isFinite(raw.speed) ? raw.speed : (Number.isFinite(c.speed) ? c.speed : (EXT_JOB_SPEED[c.id] ?? 50))) * (1 + extStatusPower(c, "speedUp")));
  if (extHasStatus(c, "attackUp")) { const p = 1 + extStatusPower(c, "attackUp"); mul("attack", p); mul("spAttack", p); }
  if (extHasStatus(c, "attackDown")) { const p = 1 - Math.min(.9, extStatusPower(c, "attackDown")); mul("attack", p); mul("spAttack", p); }
  if (extHasStatus(c, "curse")) { const p = 1 - Math.min(.9, extStatusPower(c, "curse") || .15); mul("attack", p); mul("spAttack", p); }
  if (extHasStatus(c, "defenseUp")) { const p = 1 + extStatusPower(c, "defenseUp"); mul("defense", p); mul("spDefense", p); }
  if (extHasStatus(c, "bindArm")) mul("attack", EXT_AILMENT_RULES.bindArm.attackMul);
  if (extHasStatus(c, "bindLeg")) raw.speed = Math.floor(raw.speed * EXT_AILMENT_RULES.bindLeg.speedMul);
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
  extPartyImmunity = {};
  battleState._ailmentTolerance = {};
  battleState._partyLockStreak = 0;
  battleState._statusTick = false;
  battleState._assassinHitPreviousTurn = false;
  battleState._assassinHitThisTurn = false;
  battleState._enemyActedThisTurn = false;
  battleState._gunnerFlashUsed = false;
  battleState._gunnerFlashTurns = 0;
  battleState.enemyStatuses = {};
  battleState.enemyUnitStatuses = {};
  for (const c of characters) { c._xjCharge = null; c._heat = 0; c._overheat = false; }
  battleState._evSnap = {}; battleState._evAction = null;
}

/* 毎ターン開始時：毒のダメージ */
async function extRoundStart() {
  battleState._assassinHitPreviousTurn = !!battleState._assassinHitThisTurn;
  battleState._assassinHitThisTurn = false;
  battleState._enemyActedThisTurn = false;
  const e = battleState.enemy;
  if (!battleState._gunnerFlashUsed && getParty().some(c => c.id === "gunner" && c.hp > 0)) {
    battleState._gunnerFlashUsed = true;
    if (Math.random() < .30) { battleState._gunnerFlashTurns = 3; pushEvent("ガンナーの先制閃光弾！ 敵の命中率が3ターン低下！"); }
  }
  extUpdatePartyLockStreak();
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
      const pct = extStatusPower(unit, "poison") || .06;
      const damage = Math.max(1, Math.floor((unit.maxHp || e.maxHp) * pct));
      beginEnemyDamagePreview(e);
      battleState._statusTick = true;  // 毒のダメージでは睡眠から覚めない
      const dealt = applyDamageToEnemyTarget(e, target, damage);
      battleState._statusTick = false;
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
  extTickPartyImmunity();
  for (const holder of [...getParty(), ...enemyHolders]) {
    const bag = extStatusBag(holder, false); if (!bag) continue;
    for (const type of Object.keys(bag)) {
      const s = bag[type];
      if (s.fresh) { s.fresh = false; continue; }
      // 封じは各ターン終了時に解除判定。経過するほど解除率が上昇する。
      if (["bindHead","bindArm","bindLeg"].includes(type) && s.progressiveRelease) {
        s.bindElapsed = (s.bindElapsed || 0) + 1;
        const releaseChance = Math.min(.9, .15 + (s.bindElapsed - 1) * .20);
        if (Math.random() < releaseChance) s.turns = 1;
      }
      s.turns--;
      if (s.turns <= 0) {
        extRemoveStatus(holder, type);
        const def = EXT_STATUS_DEFS[type];
        if (holder.hp > 0) pushEvent(`${holder.name}の${def.label}が${def.harm ? "治まった" : "切れた"}。`);
      }
    }
  }
  for (const c of getParty()) if (c._princessEnchant && --c._princessEnchant.turns <= 0) delete c._princessEnchant;
  if (battleState._gunnerFlashTurns > 0) battleState._gunnerFlashTurns--;
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
function extEnemySpeed(e) {
  const base = Number.isFinite(e?.speed) ? e.speed : (EXT_ENEMY_SPEED[e?.name] ?? 50);
  return extHasStatus(e, "bindLeg") ? Math.floor(base * EXT_AILMENT_RULES.bindLeg.speedMul) : base;  // 脚封じ
}
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
    if (actor?.id === "imperial" && (en.action.type === "imperial-release" || (en.action.type === "skill" && (actor.spSkills || []).some(s => s.id === en.action.skillId && s.xj?.kind === "sp")))) en.speed = Math.max(1, Math.floor(en.speed * .35));
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
  const instantChance = extIsBoss(enemy) ? (x.bossInstaKill || 0) : (x.instaKill || 0);
  if (instantChance > 0 && Math.random() < instantChance) {
    const t = targets[0];
    const dealt = applyDamageToEnemyTarget(enemy, t, Math.max(1, t.ref.hp));
    pushLog(`${actor.name}の${skill.name}！ ${enemy.name}の魂を刈り取った！（即死）`);
    combatNumber(displayEnemyNode(), `-${dealt}`, "damage"); showHitEffect("slash"); flashEnemyDamage(); sound("damage", true);
    return dealt;
  }
  let total = 0;
  const hits = x.hits || 1;
  const reaperDrain = actor.id === "reaper" && targets.some(t => ["attackDown","defenseDown"].some(type => extHasStatus(t.ref,type)));
  for (let h = 0; h < hits; h++) {
    for (const t of targets) {
      if (enemyHpTotal(enemy) <= 0) break;
      // 混成編成では個体ごとの防御力・属性弱点・耐性を適用する。
      const ailmentBoost = x.ailmentBonus && ["poison","paralysis","sleep","confusion","petrify","burn"].some(type => extHasStatus(t.ref,type)) ? x.ailmentBonus : 1;
      const debuffBoost = x.debuffBonus && ["attackDown","defenseDown"].some(type => extHasStatus(t.ref,type)) ? x.debuffBonus : 1;
      const d = extSkillDamage(actor, t.ref, x, mult) * ailmentBoost * debuffBoost;
      const dealt = applyDamageToEnemyTarget(enemy, t, d);
      total += dealt;
      if (dealt > 0) addBreakDamage(enemy, "sp", x.element || "無属性", actor);
    }
    if (hits > 1) { showHitEffect(x.fx === "flame" ? "flame" : "magic"); renderBattle(); await wait(180); }
    if (enemyHpTotal(enemy) <= 0) break;
  }
  if (reaperDrain && total > 0) {
    const heal = Math.min(Math.max(0, effectiveStats(actor).maxHp - actor.hp), Math.max(1, Math.floor(total * .15)));
    if (heal > 0) { actor.hp += heal; pushEvent(`${actor.name}は鎌で生命力を${heal}吸収した！`); }
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
      const label = EXT_STATUS_DEFS[extStatusId(st.type)].label;
      for (const target of targets) {
        const unit = target.ref;
        if (!unit || unit.hp <= 0) continue;
        const unitName = unit.displayName || unit.name || enemy.name;
        // 付与率は extStatusChance() の1か所で決める（bossMul・敵の耐性・ボスの耐性上昇）。
        if (extTryStatus(actor, unit, st.type, st.chance, { bossMul: st.bossMul })) {
          const monkBind = actor.id === "warrior" && ["bindHead","bindArm","bindLeg"].includes(st.type);
          const r = addStatus(unit, st.type, { turns: monkBind ? 6 : st.turns, power: st.power });
          if (monkBind && (r === "new" || r === "refresh")) { const rec = extStatusBag(unit, false)?.[st.type]; if (rec) { rec.progressiveRelease = true; rec.bindElapsed = 0; } }
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
  if (x.enchant) {
    for (const t of getParty().filter(c => c.hp > 0)) t._princessEnchant = { element:x.enchant.element, turns:x.enchant.turns };
    pushLog(`${actor.name}の${skill.name}！ 味方全体の武器に${x.enchant.element}属性を付与した。`);
    sound("heal"); renderBattle(); return;
  }
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
  let mul = character && character._xjCharge && !options.statusDamage ? EXT_DEFENSELESS_MULT : 1;
  if (character && !options.statusDamage && extHasStatus(character, "sleep")) mul *= EXT_AILMENT_RULES.sleep.damageTakenMul;  // 睡眠中は被ダメージ増
  return mul;
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
  const weighted = (pool) => { const weights=pool.map(c=>c.id==="assassin"?.4:1), total=weights.reduce((a,b)=>a+b,0); let roll=Math.random()*total; for(let i=0;i<pool.length;i++){roll-=weights[i];if(roll<0)return pool[i];}return pool[pool.length-1]; };
  const adminTarget=alive.find(c=>c.id===window.kotamaAdminBattleSettings?.enemyTargetId);
  if(adminTarget)return adminTarget;
  const taunt = alive.find(c => c.id === battleState.tauntTarget);
  if (taunt) return taunt;
  if (act.target === "rear") { const rear = alive.filter(c => EXT_REAR_IDS.includes(c.id)); if (rear.length) return weighted(rear); }
  return weighted(alive);
}
async function extVariantAction(e, turn, opts = {}) {
  const alive = livingParty(); if (!alive.length) return;
  const ratio = enemyHpTotal(e) / e.maxHp;
  const eligible = e.ai.filter(a => (!a.minTurn || turn >= a.minTurn) && (!a.hpBelow || ratio <= a.hpBelow));
  // 頭封じ：術系の行動（kind:"sp"）は使えない。使える行動が無くなる場合は封じの影響を受けない行動に限る。
  const sealedHead = extHasStatus(e, "bindHead");
  const sealedArm = extHasStatus(e, "bindArm");
  const sealedLeg = extHasStatus(e, "bindLeg");
  const usable = eligible.filter(a => {
    const part = a.bodyPart || (a.kind === "sp" ? "head" : "arm");
    return !(sealedHead && part === "head") && !(sealedArm && part === "arm") && !(sealedLeg && part === "leg");
  });
  if (!usable.length) { pushEvent(`${e.name}は封じによって行動できなかった！`); return; }
  const adminActionName=window.kotamaAdminBattleSettings?.enemyActions?.[e.id||e.fieldEnemyId||e.name];
  const adminForced=adminActionName?usable.find(a=>a.name===adminActionName):null;
  const forced = usable.find(a => a.everyTurns && turn % a.everyTurns === 0);
  const act = adminForced || forced || extWeightedPick(usable.filter(a => !a.everyTurns).length ? usable.filter(a => !a.everyTurns) : usable);
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
    if (c.hp > 0 && act.status && extTryStatus(e, c, act.status.type, act.status.chance)) extInflict(c, act.status.type, act.status);
    if (c.hp <= 0) pushEvent(`${c.name}は戦闘不能になった！`);
  }
  if (!opts.preserveTaunt) battleState.tauntTarget = null;
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
      if (c.hp > 0 && extTryStatus(e, c, "curse", act.curse.chance)) extInflict(c, "curse", { turns: act.curse.turns, power: act.curse.power });
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
  if (side === "party" && targetId === "assassin" && amount > 0) battleState._assassinHitThisTurn = true;
  if (side === "enemy" && extra?.ko && amount > 0) {
    const e = battleState.enemy;
    const unit = (e?.members || []).find(m => String(m.id) === String(targetId)) || (e?.id === targetId ? e : null) || (targetId === "enemy" ? e : null);
    if (unit && ["poison","paralysis","sleep","confusion","petrify","burn"].some(type => extHasStatus(unit,type))) battleState._ailmentKill = true;
  }
  if (amount > 0) extWakeOnDamage(targetId, side, extra);
  battleEmit(amount > 0 ? "damage:applied" : "damage:missed", Object.assign({ targetId, side, amount, action: battleState._evAction || null }, extra));
}
