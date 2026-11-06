"use strict";
/* ============================================================
   data/field-maps.js — フィールド（エリア）と雑魚敵のデータ
   ------------------------------------------------------------
   仕様：docs/field-and-story/FIELD_SPEC.md 4章
   ・map は1文字=1マス（32px）。全行を同じ幅にすること。外周は壁で閉じること。
       #=壁  .=地面  ,=道  *=草むら（出現率1.5倍）  ~=水/溶岩（通れない）
       _=安全地帯（エンカウントなし）  P=開始位置  E=出口（ホームへ）  B=ボスゲート
       S=導きの灯（全回復・セーブ）  T=宝箱  ?=看板  a〜z=objects で定義するNPCなど
   ・stage はボス戦で使う従来のステージ番号（数値・行動は data/enemies.js のまま）。
   ・encounter.min〜max：安全地帯以外をこのマス数歩くごとに1回、table から重み付きで出現。
   ・bgm は仮割り当て（ユーザー確認待ち）。
   ・chests はマップ上の T を左上から順に読んだ順番。
   ・sprite は見た目の識別子（GPTが css/06-field.css で絵を付ける）。
   ============================================================ */
const FIELD_AREAS = {
  1: {
    stage: 1, name: "はじまりの樹海", theme: "forest",
    bgm: "assets/music/仕分け雨/蒼獣シーガー.mp3",
    encounter: { min: 16, max: 28, table: [ { enemy: "stray-slime", weight: 65 }, { enemy: "mushroom", weight: 35 } ] },
    enterScene: "a1-enter", bossScene: "a1-boss",
    signScene: "a1-sign",
    chests: [ { gold: 30 } ],
    objects: {
      a: { kind: "npc", id: "woodcutter", name: "木こりボルド", sprite: "npc-woodcutter", scene: "a1-woodcutter" },
      b: { kind: "npc", id: "herb-girl", name: "薬草摘みのミナ", sprite: "npc-girl", scene: "a1-herb-girl" }
    },
    map: [
      "############################",
      "######...****.......##B#####",
      "#####...**####***....#___###",
      "####...**#####**......__S_##",
      "###.....,,,,,,,,,,,,,,,___##",
      "##..**..,#####****..,#######",
      "##.****.,#T*******.,########",
      "#..****.,###**~~~**.,..#####",
      "#.....,,,,..**~~~~~**...####",
      "#..***.,####.**~~~***.?.####",
      "#..****.,####*******....####",
      "#...**.,,,,,,,,,,,,,,,,..###",
      "##...****.....******...b.###",
      "###..####.....####**....####",
      "#__a.####..**####***..***###",
      "#_P_,,,,,,,,,,,,,,,,..****##",
      "#E__########################",
      "############################"
    ]
  },
  2: {
    stage: 2, name: "ゴブリンの森", theme: "goblin",
    bgm: "assets/music/仕分け雨/Digilune.mp3",
    encounter: { min: 14, max: 26, table: [ { enemy: "forest-goblin", weight: 55 }, { enemy: "goblin-scout", weight: 30 }, { enemy: "stray-slime", weight: 15 } ] },
    enterScene: "a2-enter", bossScene: "a2-boss",
    signScene: "a2-sign",
    chests: [ { item: "potion", count: 2 } ],
    objects: {
      a: { kind: "npc", id: "merchant", name: "行商人ロッコ", sprite: "npc-merchant", scene: "a2-merchant" },
      b: { kind: "npc", id: "watchman", name: "見張り番タオ", sprite: "npc-guard", scene: "a2-watchman" }
    },
    map: [
      "############################",
      "#__P_,,,,..****....#########",
      "#_E__..,..******...#T..#####",
      "##a__..,,,,,,,,,,,,,,..#####",
      "####.**..****.,###.,...*####",
      "####.***.###..,###.,..***###",
      "###..**..###..,,,,,,..****##",
      "###.,,,,,,,,,,,..**.,..**###",
      "##..,***####**...***,...####",
      "##..,**#####***..**.,b..####",
      "#?..,**######**.....,...####",
      "#...,,,,,,,,,,,,,,,,,..#####",
      "##....****...****...,..#####",
      "####..****#####**...,...####",
      "#####.....#####.....,,,,__##",
      "######..***...**....###_S_##",
      "##############......####_B##",
      "############################"
    ]
  },
  3: {
    stage: 3, name: "霧の森", theme: "mist",
    bgm: "assets/music/仕分け雨/夜闇に、風に紛れて.mp3",
    encounter: { min: 14, max: 24, table: [ { enemy: "mist-bat", weight: 45 }, { enemy: "forest-wolf", weight: 40 }, { enemy: "goblin-scout", weight: 15 } ] },
    enterScene: "a3-enter", bossScene: "a3-boss",
    signScene: "a3-sign",
    // 石像と話すまで霧が晴れず、ボスゲートに入れない
    gateRequires: { flag: "a3-statue", scene: "a3-gate-locked" },
    chests: [ { item: "high-potion", count: 1 } ],
    objects: {
      a: { kind: "npc", id: "statue", name: "魔法の石像", sprite: "statue", scene: "a3-statue" }
    },
    map: [
      "############################",
      "#B_S_....**********....T####",
      "#___.,,,,,,,,,,,,,,,..######",
      "##_..,..******#####,..######",
      "###..,.*******#####,...#####",
      "###..,.**~~~~***...,,,..####",
      "##...,..*~~~~~**..****,..###",
      "##.?.,..**~~~**...****,..###",
      "##...,,,,,,,,,,,,,,,,,,..###",
      "###..****....***....****.###",
      "####.****.a..****..*****.###",
      "####..**.....###...**,,,,###",
      "#####........###....,.######",
      "######...*****......,.######",
      "#######..*****..,,,,,.######",
      "#######_E.......,..#########",
      "#######_P_,,,,,,,..#########",
      "############################"
    ]
  },
  4: {
    stage: 4, name: "焦土の溶岩洞窟", theme: "lava",
    bgm: "assets/music/仕分け雨/あやしいお店.mp3",
    encounter: { min: 13, max: 24, table: [ { enemy: "fire-lizard", weight: 55 }, { enemy: "lava-golem", weight: 45 } ] },
    enterScene: "a4-enter", bossScene: "a4-boss",
    signScene: "a4-sign",
    chests: [ { gold: 120 } ],
    objects: {
      a: { kind: "npc", id: "miner", name: "鉱夫ガルド", sprite: "npc-miner", scene: "a4-miner" }
    },
    map: [
      "############################",
      "#_E_##~~~~~.....~~~~~~######",
      "#_P_,,,,,,......~~~~~~######",
      "#___.~~~..,....**...~~######",
      "##...~~~..,..****....T######",
      "###......,,,,,,,,,,,..######",
      "####~~~..,.~~~~~~..,..######",
      "####~~~..,.~~~~~~..,..~~####",
      "###......,.....a...,....~###",
      "##..**...,,,,,,,,,,,,...~###",
      "##.****..~~~~~~....**,..####",
      "##..**...~~~~~~...***,..####",
      "###....?.....~~...**.,..####",
      "####..........~......,,,..##",
      "######~~~~~......~~~...,__##",
      "######~~~~~~...~~~~~~..,S_##",
      "#############~~~~~~~~####B##",
      "############################"
    ]
  },
  5: {
    stage: 5, name: "魔王城・回廊", theme: "castle",
    bgm: "assets/music/仕分け雨/Sunny_day_shopping.mp3",
    encounter: { min: 12, max: 22, table: [ { enemy: "dark-knight", weight: 50 }, { enemy: "wraith", weight: 50 } ] },
    enterScene: "a5-enter", bossScene: "a5-boss",
    signScene: "a5-sign",
    chests: [ { item: "ether", count: 2 } ],
    objects: {
      a: { kind: "npc", id: "ghost-knight", name: "亡霊の騎士", sprite: "npc-ghost", scene: "a5-ghost-knight" }
    },
    map: [
      "############################",
      "##########___B___###########",
      "##########__S____###########",
      "##########_______###########",
      "######.....,,,,,.....#######",
      "######.***.,###,.***.#######",
      "######.***.,###,.***.#######",
      "####...,,,,,,,,,,,,,,...####",
      "####.T.,###.....###.,.?.####",
      "####...,###..a..###.,...####",
      "####...,###.....###.,...####",
      "######.,,,,,,,,,,,,,,.######",
      "######.***.,###,.***.#######",
      "######.***.,###,.***.#######",
      "######.....,,,,,.....#######",
      "###########__P__############",
      "###########__E__############",
      "############################"
    ]
  }
};

/* ------------------------------------------------------------
   雑魚敵（フィールドのランダムエンカウント用）
   ・ai は data/enemy-variants.js と同じ形式（battle-ext.js の処理で動く）。
   ・dropAs は素材ドロップ表の名前（script.js の awardMaterials）。無い敵は素材を落とさない。
   ・image は仮。専用画像ができたら差し替える（ファイル名は半角英数字）。
   ・ボス・既存の敵の数値には影響しない。
   ------------------------------------------------------------ */
const FIELD_ENEMIES = {
  "stray-slime": { name:"はぐれスライム", element:"無属性", weaknesses:["炎","氷","雷","聖"], resistances:[], physicalResistances:["打撃"], hp:180, attack:12, spAttack:8, defense:3, spDefense:18, gold:6, speed:60, dropAs:"スライム", image:"assets/monsters/suraimu.png", sprite:"slime",
    ai:[ { name:"体当たり", weight:70, kind:"phys", power:1.0 }, { name:"ねばねば", weight:30, kind:"phys", power:.6, status:{ type:"defenseDown", chance:.4, turns:2, power:3 } } ] },
  "mushroom": { name:"キノコもどき", element:"無属性", weaknesses:["炎","斬撃"], resistances:[], hp:200, attack:13, spAttack:12, defense:6, spDefense:8, gold:7, speed:48, image:"assets/monsters/suraimu.png", sprite:"slime",
    ai:[ { name:"頭突き", weight:60, kind:"phys", power:1.0 }, { name:"しびれ胞子", weight:40, all:true, kind:"sp", power:.4, status:{ type:"poison", chance:.25, turns:2, power:.04 } } ] },
  "forest-goblin": { name:"森ゴブリン", element:"無属性", weaknesses:["炎","斬撃"], resistances:[], hp:340, attack:26, spAttack:10, defense:8, spDefense:4, gold:12, speed:72, dropAs:"ゴブリン", image:"assets/monsters/goburinn.png", sprite:"goblin",
    ai:[ { name:"棍棒", weight:70, kind:"phys", power:1.0 }, { name:"石投げ", weight:30, kind:"phys", power:.8, target:"rear" } ] },
  "goblin-scout": { name:"ゴブリンの斥候", element:"無属性", weaknesses:["炎","斬撃"], resistances:[], hp:280, attack:28, spAttack:10, defense:6, spDefense:4, gold:12, speed:95, dropAs:"ゴブリン", image:"assets/monsters/goburinn.png", sprite:"goblin",
    ai:[ { name:"素早い突き", weight:60, kind:"phys", power:.9 }, { name:"毒ナイフ", weight:40, kind:"phys", power:.7, status:{ type:"poison", chance:.45, turns:3, power:.05 } } ] },
  "mist-bat": { name:"霧コウモリ", element:"無属性", weaknesses:["雷","炎"], resistances:[], hp:480, attack:32, spAttack:20, defense:12, spDefense:10, gold:18, speed:105, image:"assets/monsters/ookami.png", sprite:"wolf",
    ai:[ { name:"吸血", weight:55, kind:"phys", power:.9, drain:.35 }, { name:"超音波", weight:45, all:true, kind:"sp", power:.4, status:{ type:"paralysis", chance:.2, turns:1 } } ] },
  "forest-wolf": { name:"森オオカミ", element:"無属性", weaknesses:["雷","打撃","壊"], resistances:[], hp:560, attack:36, spAttack:12, defense:16, spDefense:8, gold:20, speed:85, dropAs:"オオカミ", image:"assets/monsters/ookami.png", sprite:"wolf",
    ai:[ { name:"噛みつき", weight:65, kind:"phys", power:1.0 }, { name:"飛びかかり", weight:35, kind:"phys", power:1.3, target:"rear", minTurn:2 } ] },
  "fire-lizard": { name:"火トカゲ", element:"炎", weaknesses:["氷"], resistances:["炎"], hp:430, attack:44, spAttack:46, defense:24, spDefense:16, gold:18, speed:60, image:"assets/monsters/dragon.svg", sprite:"dragon",
    ai:[ { name:"しっぽ打ち", weight:55, kind:"phys", power:1.0 }, { name:"火の息", weight:45, kind:"sp", power:1.0, element:"炎", status:{ type:"burn", chance:.3, turns:2 } } ] },
  "lava-golem": { name:"溶岩ゴーレム", element:"炎", weaknesses:["氷","打撃"], resistances:["炎"], hp:520, attack:50, spAttack:40, defense:44, spDefense:14, gold:22, speed:20, image:"assets/monsters/dragon.svg", sprite:"dragon",
    ai:[ { name:"岩の拳", weight:65, kind:"phys", power:1.15 }, { name:"溶岩投げ", weight:35, all:true, kind:"sp", power:.5, element:"炎", status:{ type:"burn", chance:.2, turns:2 } } ] },
  "dark-knight": { name:"魔王軍の騎士", element:"無属性", weaknesses:["雷","聖"], resistances:[], hp:760, attack:58, spAttack:50, defense:48, spDefense:30, gold:28, speed:50, image:"assets/monsters/maou.png", sprite:"maou",
    ai:[ { name:"黒鉄の斬撃", weight:65, kind:"phys", power:1.1 }, { name:"闇の剣", weight:35, kind:"sp", power:1.0, status:{ type:"curse", chance:.3, turns:3 } } ] },
  "wraith": { name:"さまよう亡霊", element:"無属性", weaknesses:["聖","炎"], resistances:["斬撃","突"], hp:440, attack:36, spAttack:50, defense:20, spDefense:48, gold:24, speed:70, image:"assets/monsters/chaos-phantom.svg", sprite:"maou",
    ai:[ { name:"呪いの声", weight:45, all:true, kind:"sp", power:.5, status:{ type:"curse", chance:.2, turns:2 } }, { name:"生命吸収", weight:55, kind:"sp", power:.8, drain:.4 } ] }
};
