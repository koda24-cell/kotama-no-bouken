"use strict";
/* ============================================================
   data/status-effects.js — 状態異常の定義（表示名・アイコン・性質）
   ------------------------------------------------------------
   label ：画面に出る名前
   icon  ：バッジに付く記号
   harm  ：true=悪い効果（回復・解除の対象） / false=強化効果
   fresh ：付与したラウンドの終了時に持続ターンを減らすかどうか
           "always"=常に減らさない（毒：次のラウンドから効く）
           "party" =味方に付いたときだけ減らさない
           省略   =付与したラウンドから数える
   ※ 効果量（毒の割合・持続ターンなど）は、付与するスキル・敵の行動データ側で指定します。
   ※ 状態異常のIDは、処理（battle-ext.js）が参照するため、増減する場合は処理側も確認してください。
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
  speedUp:     { label:"速度↑",  icon:"▲",  harm:false },
  bindHead:    { label:"頭封じ", icon:"⛓", harm:true, fresh:"party" },
  bindArms:    { label:"腕封じ", icon:"⛓", harm:true, fresh:"party" },
  bindLegs:    { label:"脚封じ", icon:"⛓", harm:true, fresh:"party" }
};
