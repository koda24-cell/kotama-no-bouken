"use strict";
/* ============================================================
   data/field-gathering.js — 採集ポイントの種別・素材テーブル・回数・再出現
   ------------------------------------------------------------
   担当：Claude B（宝箱・採集・探索記録・セーブ）
   処理：field/field-interactions.js の [LOOT] 節（fieldGather・fieldGatherPointDef など）。セーブは field/field-persistence.js
   ・マップ文字列（data/field-maps.js の map）は変えない。採集点は従来どおり "G" で置き、
     ここで「フロアキー → "x,y" → 種別・素材テーブル・回数」を上書きする。
   ・ここに無い採集点は、従来どおりフロアの gathers（data/field-maps.js）を使う「採取」として動く。
   ・素材 ID は data/items.js の materialNames にある既存 ID だけを使う（新規 ID はユーザー承認後）。
   ・各フロアで使う素材は、従来のフロアの gathers と同じ素材の中から選んでいる（素材の出る階層は変えない）。
   ・フロアキーは "階層-フロア"（フロアは 0 始まり）。座標は（列, 行）、0 始まり。
   ・参考：宝箱（data/field-maps.js の chests）の中身は次の形に対応する（組み合わせ可。fieldLootGrant）
       { gold }／{ item, count }／{ material, count }／{ items: [[ID,数]] }／{ materials: [[ID,数]] }
   ============================================================ */

// 採集の種類。label は画面表示、pointName は採集点の名前、verb は入手メッセージ
const FIELD_GATHER_KINDS = {
  take: { label: "採取", pointName: "採取ポイント", verb: "採取した", emptyText: "もう何も採れそうにない。" },
  chop: { label: "伐採", pointName: "伐採ポイント", verb: "木を切り出した", emptyText: "もう切り出せる木は残っていない。" },
  mine: { label: "採掘", pointName: "採掘ポイント", verb: "岩を掘り出した", emptyText: "もう掘れそうな岩は残っていない。" }
};

// 共通ルール（ユーザー決定 2026-11-07）
//   respawn: "time" … 採集点ごとに、その点で最初に採集してから実時間で respawnMinutes 分たつと、回数がすべて戻る。
//            時刻と回数はセーブされるので、ロードやホーム帰還では戻らない。ゲームを閉じている間も時間は進む。
//   bonusChance … 1回の採集で素材を2個得る確率（従来と同じ 25%）
const FIELD_GATHER_RULES = { respawn: "time", respawnMinutes: 30, bonusChance: .25 };

// 採集点ごとの定義。uses を省略すると field.js の FIELD_GATHER_USES（2回）
const FIELD_GATHER_POINTS = {
  // 第1階層 はじまりの樹海
  "1-0": {
    "1,1":  { kind: "take", table: [ ["slime_jelly", 70], ["goblin_cloth", 30] ] },
    "9,17": { kind: "chop", table: [ ["monster_hide", 60], ["slime_jelly", 25], ["goblin_cloth", 15] ] }
  },
  "1-1": {
    "13,7":  { kind: "take", table: [ ["slime_jelly", 70], ["goblin_cloth", 30] ] },
    "23,11": { kind: "chop", table: [ ["monster_hide", 60], ["slime_jelly", 25], ["goblin_cloth", 15] ] }
  },
  // 第2階層 ゴブリンの森
  "2-0": {
    "17,7": { kind: "chop", table: [ ["monster_fang", 55], ["goblin_cloth", 25], ["monster_hide", 20] ] },
    "9,13": { kind: "take", table: [ ["goblin_cloth", 65], ["monster_hide", 35] ] }
  },
  "2-1": {
    "1,1":   { kind: "take", table: [ ["goblin_cloth", 65], ["monster_hide", 35] ] },
    "15,17": { kind: "chop", table: [ ["monster_fang", 55], ["goblin_cloth", 25], ["monster_hide", 20] ] }
  },
  // 第3階層 霧の森
  "3-0": {
    "19,9":  { kind: "take", table: [ ["monster_hide", 60], ["slime_jelly", 20], ["monster_fang", 20] ] },
    "17,11": { kind: "chop", table: [ ["monster_fang", 65], ["monster_hide", 35] ] }
  },
  "3-1": {
    "23,3":  { kind: "chop", table: [ ["monster_fang", 65], ["monster_hide", 35] ] },
    "11,13": { kind: "take", table: [ ["monster_hide", 65], ["monster_fang", 35] ] }
  },
  // 第4階層 焦土の溶岩洞窟
  "4-0": {
    "11,9": { kind: "mine", table: [ ["monster_fang", 45], ["dragon_scale", 35], ["monster_hide", 20] ] },
    "3,17": { kind: "take", table: [ ["monster_hide", 70], ["monster_fang", 30] ] }
  },
  "4-1": {
    "9,1":  { kind: "mine", table: [ ["monster_fang", 45], ["monster_hide", 35], ["dragon_scale", 20] ] },
    "7,19": { kind: "mine", table: [ ["monster_fang", 45], ["monster_hide", 35], ["dragon_scale", 20] ] }
  },
  // 第5階層 魔王城・回廊
  "5-0": {
    "1,1":   { kind: "take", table: [ ["monster_fang", 55], ["monster_hide", 45] ] },
    "15,19": { kind: "mine", table: [ ["monster_fang", 45], ["dragon_scale", 35], ["maou_crystal", 20] ] }
  },
  "5-1": {
    "3,11":  { kind: "mine", table: [ ["dragon_scale", 35], ["monster_fang", 35], ["maou_crystal", 30] ] },
    "13,17": { kind: "take", table: [ ["monster_fang", 50], ["monster_hide", 50] ] }
  }
};
