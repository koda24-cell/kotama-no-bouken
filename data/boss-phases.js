"use strict";
/* ============================================================
   data/boss-phases.js — ボスの行動パターン（数値・技名）
   ------------------------------------------------------------
   現在は魔王の「フェーズ行動」を管理します。
   処理は battle-ext.js の extMaouPhaseAction() にあります。

   thresholds：HP割合がこの値以下になると、2段階目・3段階目に入る。
   messages  ：段階が上がった瞬間に表示するメッセージ。
   phases    ：段階ごとの追加行動。上から順に判定し、chance（確率）を足し合わせた
               区間に乱数が入った行動が選ばれる。どれにも当たらなければ、通常の行動。
               例）3段階目は 連撃25% → 終焉の闇35% → 魂喰らい12% → 残り28%は通常行動。
               合計が100%を超えないようにすること。1段階目は追加行動なし。

   行動の種類（type）
     combo    ：複数回の物理連撃。hits=回数 / power=攻撃力に対する倍率
     darkness ：闇属性の全体攻撃。spMult=SP攻撃力の倍率 / hpRate=対象の最大HPの割合を加算
                curse=呪いの付与（chance=確率 / turns=持続 / power=攻撃低下の割合）
     soulEat  ：闇属性の単体攻撃。spMult=SP攻撃力の倍率 / healRate=魔王の最大HPに対する回復割合
   ============================================================ */
const EXT_MAOU_PHASES = {
  thresholds: [.66, .33],
  messages: {
    2: "魔王の瞳が妖しく光る……！ 攻撃が激しさを増す！",
    3: "魔王の魔力が暴走する……！ 終焉の闇が迫る！"
  },
  phases: {
    2: [
      { type:"combo",    name:"暗黒連撃", chance:.30, hits:3, power:.6 },
      { type:"soulEat",  name:"魂喰らい", chance:.15, spMult:1.3, healRate:.04 }
    ],
    3: [
      { type:"combo",    name:"暗黒連撃", chance:.25, hits:5, power:.6 },
      { type:"darkness", name:"終焉の闇", chance:.35, spMult:.5, hpRate:.14, curse:{ chance:.7, turns:3, power:.15 } },
      { type:"soulEat",  name:"魂喰らい", chance:.12, spMult:1.3, healRate:.04 }
    ]
  }
};
