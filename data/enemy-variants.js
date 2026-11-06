"use strict";
/* ============================================================
   data/enemy-variants.js — 敵バリエーション（STAGE1〜3）
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
      ai:[ { name:"狙い撃ち", weight:60, kind:"phys", power:1.2, target:"rear", telegraph:true, status:{ type:"bindArms", chance:.35, turns:2 } }, { name:"毒矢", weight:40, kind:"phys", power:.9, status:{ type:"poison", chance:.5, turns:3, power:.06 } } ] },
    { variantId:"goblin-shaman", baseName:"ゴブリン", name:"ゴブリンシャーマン", element:"無属性", weaknesses:["炎","斬撃"], resistances:[], hp:340, attack:20, spAttack:46, defense:8, spDefense:25, gold:24, sprite:"goblin", speed:50,
      ai:[ { name:"火の玉", weight:45, kind:"sp", power:1.0, element:"炎", status:{ type:"burn", chance:.35, turns:2 } }, { name:"弱体の呪文", weight:30, all:true, kind:"sp", power:.5, telegraph:true, status:{ type:"bindHead", chance:.35, turns:2 } }, { name:"癒やしの祈り", weight:35, heal:.18, hpBelow:.6 } ] }
  ],
  3: [
    { variantId:"giant-bat", baseName:"オオカミ", name:"大コウモリ", element:"無属性", weaknesses:["雷","炎"], resistances:[], hp:520, attack:36, defense:14, gold:34, sprite:"wolf", speed:110,
      ai:[ { name:"吸血", weight:45, kind:"phys", power:1.0, drain:.4 }, { name:"麻痺の牙", weight:35, kind:"phys", power:.8, status:{ type:"paralysis", chance:.5, turns:2 } }, { name:"超音波", weight:20, all:true, kind:"sp", power:.5, status:{ type:"paralysis", chance:.25, turns:2 } } ] },
    { variantId:"giant-spider", baseName:"オオカミ", name:"大蜘蛛", element:"無属性", weaknesses:["炎"], resistances:[], hp:600, attack:38, spAttack:36, defense:22, spDefense:14, gold:38, sprite:"wolf", speed:60,
      ai:[ { name:"毒牙", weight:50, kind:"phys", power:1.0, status:{ type:"poison", chance:.7, turns:4, power:.06 } }, { name:"蜘蛛の糸", weight:30, kind:"phys", power:.6, telegraph:true, status:{ type:"bindLegs", chance:.65, turns:2 } }, { name:"麻痺糸", weight:20, all:true, kind:"sp", power:.4, telegraph:true, status:{ type:"paralysis", chance:.3, turns:2 } } ] }
  ]
};
