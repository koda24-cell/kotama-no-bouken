"use strict";
/* ============================================================
   data/field-enemies.js — 迷宮探索で使用する敵・FOEの能力値と行動データ
   階層・フロア・マップ配置は data/field-maps.js で管理する。
   ============================================================ */
/* ------------------------------------------------------------
   雑魚敵・FOE
   ・ai は data/enemy-variants.js と同じ形式（battle-ext.js の処理で動く）。
   ・exp：倒したときの経験値（生き残っている味方全員が得る。data/levels.js 参照）。
   ・dropAs は素材ドロップ表の名前（script.js の awardMaterials）。無い敵は素材を落とさない。
   ・foe:true はFOE（マップ上に見えている強敵）。避けることもできる。
   ・image は仮。専用画像ができたら差し替える（ファイル名は半角英数字）。
   ------------------------------------------------------------ */
const FIELD_ENEMIES = {
  "stray-slime": { name:"はぐれスライム", element:"無属性", weaknesses:["炎","氷","雷","聖"], resistances:[], physicalResistances:["打撃"], hp:380, attack:36, spAttack:20, defense:6, spDefense:24, gold:6, exp:14, speed:60, dropAs:"スライム", image:"assets/monsters/suraimu.png", sprite:"slime",
    ai:[ { name:"体当たり", weight:70, kind:"phys", power:1.0 }, { name:"ねばねば", weight:30, kind:"phys", power:.7, status:{ type:"defenseDown", chance:.45, turns:2, power:4 } } ] },
  "mushroom": { name:"キノコもどき", element:"無属性", weaknesses:["炎","斬撃"], resistances:[], hp:400, attack:30, spAttack:32, defense:9, spDefense:12, gold:7, exp:16, speed:48, image:"assets/monsters/suraimu.png", sprite:"slime",
    ai:[ { name:"頭突き", weight:55, kind:"phys", power:1.0 }, { name:"しびれ胞子", weight:45, all:true, kind:"sp", power:.55, status:{ type:"poison", chance:.3, turns:3, power:.05 } } ] },
  "forest-goblin": { name:"森ゴブリン", element:"無属性", weaknesses:["炎","斬撃"], resistances:[], hp:720, attack:54, spAttack:20, defense:12, spDefense:6, gold:12, exp:62, speed:72, dropAs:"ゴブリン", image:"assets/monsters/goburinn.png", sprite:"goblin",
    ai:[ { name:"棍棒", weight:65, kind:"phys", power:1.0 }, { name:"石投げ", weight:35, kind:"phys", power:.9, target:"rear" } ] },
  "goblin-scout": { name:"ゴブリンの斥候", element:"無属性", weaknesses:["炎","斬撃"], resistances:[], hp:600, attack:57, spAttack:20, defense:9, spDefense:6, gold:12, exp:64, speed:95, dropAs:"ゴブリン", image:"assets/monsters/goburinn.png", sprite:"goblin",
    ai:[ { name:"素早い突き", weight:55, kind:"phys", power:1.0 }, { name:"毒ナイフ", weight:45, kind:"phys", power:.8, status:{ type:"poison", chance:.5, turns:3, power:.06 } } ] },
  "mist-bat": { name:"霧コウモリ", element:"無属性", weaknesses:["雷","炎"], resistances:[], hp:980, attack:66, spAttack:48, defense:16, spDefense:14, gold:18, exp:140, speed:105, image:"assets/monsters/ookami.png", sprite:"wolf",
    ai:[ { name:"吸血", weight:55, kind:"phys", power:1.0, drain:.4 }, { name:"超音波", weight:45, all:true, kind:"sp", power:.55, status:{ type:"paralysis", chance:.22, turns:1 } } ] },
  "forest-wolf": { name:"森オオカミ", element:"無属性", weaknesses:["雷","打撃","壊"], resistances:[], hp:1120, attack:72, spAttack:24, defense:22, spDefense:12, gold:20, exp:150, speed:85, dropAs:"オオカミ", image:"assets/monsters/ookami.png", sprite:"wolf",
    ai:[ { name:"噛みつき", weight:60, kind:"phys", power:1.0 }, { name:"飛びかかり", weight:40, kind:"phys", power:1.35, target:"rear", minTurn:2 } ] },
  "fire-lizard": { name:"火トカゲ", element:"炎", weaknesses:["氷"], resistances:["炎"], hp:880, attack:62, spAttack:66, defense:32, spDefense:22, gold:26, exp:310, speed:60, image:"assets/monsters/dragon.svg", sprite:"dragon",
    ai:[ { name:"しっぽ打ち", weight:55, kind:"phys", power:1.0 }, { name:"火の息", weight:45, kind:"sp", power:1.0, element:"炎", status:{ type:"burn", chance:.35, turns:2 } } ] },
  "lava-golem": { name:"溶岩ゴーレム", element:"炎", weaknesses:["氷","打撃"], resistances:["炎"], hp:1000, attack:70, spAttack:56, defense:58, spDefense:20, gold:30, exp:340, speed:20, image:"assets/monsters/dragon.svg", sprite:"dragon",
    ai:[ { name:"岩の拳", weight:65, kind:"phys", power:1.15 }, { name:"溶岩投げ", weight:35, all:true, kind:"sp", power:.6, element:"炎", status:{ type:"burn", chance:.25, turns:2 } } ] },
  "dark-knight": { name:"魔王軍の騎士", element:"無属性", weaknesses:["雷","聖"], resistances:[], hp:1350, attack:82, spAttack:70, defense:64, spDefense:40, gold:36, exp:520, speed:50, image:"assets/monsters/maou.png", sprite:"maou",
    ai:[ { name:"黒鉄の斬撃", weight:65, kind:"phys", power:1.1 }, { name:"闇の剣", weight:35, kind:"sp", power:1.0, status:{ type:"curse", chance:.3, turns:3 } } ] },
  "wraith": { name:"さまよう亡霊", element:"無属性", weaknesses:["聖","炎"], resistances:["斬撃","突"], hp:1000, attack:52, spAttack:74, defense:28, spDefense:62, gold:32, exp:500, speed:70, image:"assets/monsters/chaos-phantom.svg", sprite:"maou",
    ai:[ { name:"呪いの声", weight:45, all:true, kind:"sp", power:.55, status:{ type:"curse", chance:.25, turns:2 } }, { name:"生命吸収", weight:55, kind:"sp", power:.9, drain:.4 } ] },

  "fire-slime": { name:"炎スライム", element:"炎", weaknesses:["氷"], resistances:["炎"], hp:210, attack:18, spAttack:30, defense:4, spDefense:30, gold:8, exp:16, speed:40, dropAs:"スライム", image:"assets/monsters/suraimu.png", sprite:"slime" },
  "poison-slime": { name:"毒スライム", element:"無属性", weaknesses:["炎","氷","雷","聖"], resistances:[], physicalResistances:["斬撃","打撃","壊","突"], hp:200, attack:20, spAttack:18, defense:4, spDefense:35, gold:8, exp:16, speed:35, dropAs:"スライム", image:"assets/monsters/suraimu.png", sprite:"slime" },
  "foe-goblin-pack": { foe:true, name:"ゴブリン隊長と護衛", element:"無属性", weaknesses:["炎","斬撃"], resistances:[], hp:1080, attack:68, spAttack:20, defense:18, spDefense:10, gold:70, exp:220, speed:72, dropAs:"ゴブリン", image:"assets/monsters/goburinn.png", sprite:"goblin" },
  "goblin-archer": { name:"ゴブリンアーチャー", element:"無属性", weaknesses:["炎","斬撃"], resistances:[], hp:520, attack:58, defense:10, spDefense:8, gold:14, exp:70, speed:86, dropAs:"ゴブリン", image:"assets/monsters/goburinn.png", sprite:"goblin",
    ai:[ { name:"狙い撃ち", weight:60, kind:"phys", power:1.2, target:"rear", ranged:true }, { name:"毒矢", weight:40, kind:"phys", power:.9, target:"rear", ranged:true, status:{ type:"poison", chance:.5, turns:3, power:.05 } } ] },
  "goblin-shaman": { name:"ゴブリンシャーマン", element:"無属性", weaknesses:["炎","斬撃"], resistances:[], hp:560, attack:30, spAttack:58, defense:10, spDefense:24, gold:16, exp:82, speed:48, dropAs:"ゴブリン", image:"assets/monsters/goburinn.png", sprite:"goblin",
    ai:[ { name:"火の玉", weight:45, kind:"sp", power:1, element:"炎", status:{ type:"burn", chance:.3, turns:2 } }, { name:"弱体の呪文", weight:30, all:true, kind:"sp", power:.45, status:{ type:"attackDown", chance:.5, turns:2, power:.15 } }, { name:"癒やしの祈り", weight:25, heal:.15, hpBelow:.6 } ] },

  "water-fish": { name:"氷晶魚", element:"氷", weaknesses:["雷"], resistances:["氷"], hp:920, attack:62, spAttack:78, defense:24, spDefense:30, gold:28, exp:190, speed:78, image:"assets/monsters/ookami.png", sprite:"wolf",
    ai:[ { name:"氷の尾びれ", weight:55, kind:"sp", power:1.0, element:"氷" }, { name:"冷気の鱗粉", weight:45, all:true, kind:"sp", power:.55, element:"氷", status:{ type:"attackDown", chance:.55, turns:3, power:.15 } } ] },
  "water-ray": { name:"水鏡エイ", element:"氷", weaknesses:["雷"], resistances:["氷"], hp:1180, attack:58, spAttack:88, defense:30, spDefense:38, gold:34, exp:240, speed:88, image:"assets/monsters/ookami.png", sprite:"wolf",
    ai:[ { name:"氷刃", weight:60, kind:"sp", power:1.15, element:"氷" }, { name:"凍てつく波紋", weight:40, all:true, kind:"sp", power:.5, element:"氷", status:{ type:"defenseDown", chance:.55, turns:3, power:7 } } ] },
  "ore-crab": { name:"晶石ガニ", element:"氷", weaknesses:["雷"], resistances:["氷"], hp:1480, attack:70, spAttack:48, defense:78, spDefense:42, gold:42, exp:280, speed:28, image:"assets/monsters/dragon.svg", sprite:"dragon",
    ai:[ { name:"氷塊の鋏", weight:65, kind:"phys", power:1.15, element:"氷" }, { name:"石化の泡", weight:35, kind:"sp", power:.45, element:"氷", status:{ type:"petrify", chance:.25, turns:2 } } ], counterRate:.35 },
  "crystal-golem": { name:"氷晶ゴーレム", element:"氷", weaknesses:["雷"], resistances:["氷","斬撃"], hp:2200, attack:82, spAttack:70, defense:105, spDefense:62, gold:65, exp:420, speed:18, image:"assets/monsters/dragon.svg", sprite:"dragon",
    ai:[ { name:"氷柱落とし", weight:50, all:true, kind:"sp", power:.55, element:"氷" }, { name:"石化の視線", weight:30, kind:"sp", power:.4, element:"氷", status:{ type:"petrify", chance:.35, turns:2 } }, { name:"鈍化の波動", weight:20, all:true, kind:"sp", power:.3, status:{ type:"attackDown", chance:.65, turns:3, power:.18 } } ], counterRate:.5 },
  "foe-crystal-guardian": { foe:true, name:"水源の晶石守", element:"氷", weaknesses:["雷"], resistances:["氷","斬撃"], hp:7200, attack:110, spAttack:96, defense:125, spDefense:78, gold:520, exp:2600, speed:22, image:"assets/monsters/dragon.svg", sprite:"dragon",
    ai:[ { name:"氷河の拳", weight:45, kind:"phys", power:1.5, element:"氷" }, { name:"永久凍土", weight:30, all:true, kind:"sp", power:.7, element:"氷", status:{ type:"defenseDown", chance:.45, turns:3, power:10 } }, { name:"石化の眼光", weight:25, all:true, kind:"sp", power:.3, status:{ type:"petrify", chance:.18, turns:2 } } ], counterRate:.6 },
  /* ---------- FOE（各階層に1種。マップ上を巡回し、近づくと追ってくる） ---------- */
  "foe-bear": { foe:true, name:"森の暴れ熊", element:"無属性", weaknesses:["炎","斬撃"], resistances:[], hp:2000, attack:58, spAttack:10, defense:16, spDefense:8, gold:60, exp:120, speed:40, dropAs:"オオカミ", image:"assets/monsters/ookami.png", sprite:"wolf",
    ai:[ { name:"薙ぎ払い", weight:45, all:true, kind:"phys", power:.7 }, { name:"剛腕", weight:55, kind:"phys", power:1.5 } ] },
  "foe-goblin-captain": { foe:true, name:"ゴブリン親衛隊長", element:"無属性", weaknesses:["炎"], resistances:["斬撃"], hp:2600, attack:56, spAttack:20, defense:24, spDefense:14, gold:140, exp:480, speed:70, dropAs:"ゴブリン", image:"assets/monsters/goburinn.png", sprite:"goblin",
    ai:[ { name:"号令の一撃", weight:50, kind:"phys", power:1.4 }, { name:"毒刃の乱舞", weight:30, all:true, kind:"phys", power:.6, status:{ type:"poison", chance:.4, turns:3, power:.06 } }, { name:"鼓舞の雄叫び", weight:20, heal:.12, hpBelow:.5 } ] },
  "foe-mist-stag": { foe:true, name:"霧纏いの大鹿", element:"無属性", weaknesses:["雷"], resistances:["打撃"], hp:3600, attack:70, spAttack:60, defense:32, spDefense:30, gold:260, exp:1050, speed:90, dropAs:"オオカミ", image:"assets/monsters/ookami.png", sprite:"wolf",
    ai:[ { name:"突進", weight:50, kind:"phys", power:1.45 }, { name:"幻惑の霧", weight:30, all:true, kind:"sp", power:.6, status:{ type:"paralysis", chance:.3, turns:1 } }, { name:"角の一閃", weight:20, kind:"phys", power:1.8, minTurn:3 } ] },
  "foe-salamander": { foe:true, name:"灼熱のサラマンダー", element:"炎", weaknesses:["氷"], resistances:["炎"], hp:4800, attack:84, spAttack:100, defense:46, spDefense:34, gold:420, exp:2300, speed:65, image:"assets/monsters/dragon.svg", sprite:"dragon",
    ai:[ { name:"灼熱の牙", weight:45, kind:"phys", power:1.3, status:{ type:"burn", chance:.4, turns:2 } }, { name:"業火", weight:35, all:true, kind:"sp", power:.75, element:"炎", status:{ type:"burn", chance:.3, turns:2 } }, { name:"溶岩の鎧", weight:20, heal:.1, hpBelow:.5 } ] },
  "foe-black-general": { foe:true, name:"黒騎士団長", element:"無属性", weaknesses:["雷","聖"], resistances:["斬撃"], hp:6400, attack:100, spAttack:96, defense:72, spDefense:50, gold:600, exp:3700, speed:60, image:"assets/monsters/maou.png", sprite:"maou",
    ai:[ { name:"断罪の剣", weight:45, kind:"phys", power:1.4 }, { name:"黒炎の陣", weight:35, all:true, kind:"sp", power:.7, status:{ type:"curse", chance:.35, turns:3 } }, { name:"不屈", weight:20, heal:.1, hpBelow:.4 } ] }
};
