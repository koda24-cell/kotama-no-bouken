"use strict";
/* ============================================================
   data/status-effects.js — 状態異常の定義（表示名・アイコン・性質）
   ------------------------------------------------------------
   label ：画面に出る名前
   icon  ：バッジに付く記号
   harm  ：true=悪い効果（回復・解除の対象） / false=強化効果
   kind  ："ailment"=状態異常 / "bind"=封じ / "debuff"=能力低下 / "buff"=強化（表示の分類用）
   fresh ：付与したラウンドの終了時に持続ターンを減らすかどうか
           "always"=常に減らさない（毒：次のラウンドから効く）
           "party" =味方に付いたときだけ減らさない
           省略   =付与したラウンドから数える
   ※ 効果量（毒の割合・持続ターンなど）は、付与するスキル・敵の行動データ側で指定します。
   ※ 状態異常のIDは、処理（battle-ext.js）が参照するため、増減する場合は処理側も確認してください。
   ============================================================ */
const EXT_STATUS_DEFS = {
  burn:        { label:"火傷",   icon:"🔥", harm:true,  kind:"ailment" },
  poison:      { label:"毒",     icon:"☠",  harm:true,  kind:"ailment", fresh:"always" },
  paralysis:   { label:"麻痺",   icon:"⚡", harm:true,  kind:"ailment", fresh:"party" },
  curse:       { label:"呪い",   icon:"☾",  harm:true,  kind:"ailment", fresh:"party" },
  defenseDown: { label:"防御↓",  icon:"▼",  harm:true,  kind:"debuff", fresh:"party" },
  attackDown:  { label:"攻撃↓",  icon:"▼",  harm:true,  kind:"debuff", fresh:"party" },
  attackUp:    { label:"攻撃↑",  icon:"▲",  harm:false, kind:"buff" },
  defenseUp:   { label:"防御↑",  icon:"▲",  harm:false, kind:"buff" },
  speedUp:     { label:"速度↑",  icon:"▲",  harm:false, kind:"buff" },
  // ---- 世界樹型の状態異常・封じ（Claude C / C2）。現時点では敵の行動・スキルには割り当てていない ----
  sleep:       { label:"睡眠",   icon:"💤", harm:true,  kind:"ailment", fresh:"party" },
  confusion:   { label:"混乱",   icon:"💫", harm:true,  kind:"ailment", fresh:"party" },
  bindHead:    { label:"頭封じ", icon:"⛓",  harm:true,  kind:"bind",    fresh:"party" },
  bindArm:     { label:"腕封じ", icon:"⛓",  harm:true,  kind:"bind",    fresh:"party" },
  bindLeg:     { label:"脚封じ", icon:"⛓",  harm:true,  kind:"bind",    fresh:"party" }
};

// 別名：未統合の GPT PR #47 は腕封じ・脚封じを bindArms / bindLegs と書いている。
// 付与・判定・解除のときに正式IDへ読み替えるので、どちらで書いても同じ状態として扱われる。
const EXT_STATUS_ALIASES = { bindArms:"bindArm", bindLegs:"bindLeg" };

/* ------------------------------------------------------------
   状態異常・封じの効果量と、付与率・耐性のルール（処理は battle-ext.js）
   ------------------------------------------------------------ */
const EXT_AILMENT_RULES = {
  // 睡眠：行動できない。眠っている間に受けるダメージが増え、ダメージ（毒・火傷を除く）を受けると目を覚ます。
  sleep:     { damageTakenMul: 1.5 },
  // 混乱：行動のたびにこの確率で行動が乱れる（味方：別の味方を通常攻撃／敵：うろたえて何もしない）。
  confusion: { misactChance: .5 },
  // 頭封じ：味方は「頭」を使うスキル（魔法・回復・補助）が使えない。敵は術系の行動（kind:"sp"）が使えず、SP攻撃力が下がる。
  bindHead:  { enemySpAttackMul: .6 },
  // 腕封じ：味方は「腕」を使うスキル（物理スキル）が使えず、攻撃力が下がる。敵は攻撃力が下がる。
  bindArm:   { attackMul: .6 },
  // 脚封じ：回避できず、速度が下がる。逃走もできない（逃走処理側が extEscapeBlocked() を参照した場合）。
  bindLeg:   { speedMul: .5, evasionMul: 0 },

  // 味方：麻痺・睡眠が治った（時間切れ・解除）あと、このラウンド数は同じ状態にならない。
  partyImmunity: { types: ["paralysis", "sleep"], rounds: 1 },
  // 味方：生存者全員が行動不能（睡眠・拘束）になったラウンドが、この回数続いたら、それ以上の行動不能付与を無効にする。
  partyAllLockCap: 1,
  // 階層ボス・特別な敵：行動不能系・封じは、付与に成功するたびに次の付与率が (1 - step) 倍になる（連続ハメ防止）。
  bossTolerance: { types: ["paralysis", "sleep", "confusion", "bindHead", "bindArm", "bindLeg"], step: .5 },
  // 階層ボス・特別な敵で ailmentResist に書かれていない状態の、既定の耐性（1.0=通常、0=無効）。
  // 既存の状態（毒・麻痺など）は従来の bossMul で扱うため、ここには新しい状態だけを書く。
  bossDefaultResist: { sleep: .3, confusion: .3, bindHead: .5, bindArm: .5, bindLeg: .5 },
  // 付与率全体の倍率（GPT #49 の「味方→敵 ×1.25」「敵→味方 ×1.35／FOE ×1.25」を統合する場合はここに書く）。
  globalMul: { toEnemy: 1, toParty: 1, toPartyFromFoe: 1 },
  // 付与率の上限
  maxChance: 1
};

// スキルが使う「部位」。頭封じ＝head、腕封じ＝arm のスキルが使えなくなる。none はどの封じでも使える。
// 新職業（xj）のスキルは xj.kind が "phys" なら arm、それ以外は head。
const EXT_SKILL_BODY_PART = {
  arm:  ["charge", "multiSlash", "pierce", "burst-blade", "bindArms", "bindLegs"],
  none: ["taunt", "defense-camp", "magic-guard", "full-guard", "guardian-stance"]
};
