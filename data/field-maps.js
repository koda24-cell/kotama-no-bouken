"use strict";
/* ============================================================
   data/field-maps.js — 迷宮（階層・フロア）と雑魚敵・FOEのデータ
   ------------------------------------------------------------
   仕様：docs/field-and-story/FIELD_SPEC.md ／ docs/field-and-story/LABYRINTH_SPEC.md
   ・1エリア＝1階層（例：第1階層 はじまりの樹海）。各階層は3フロア。最終フロアの奥にボス（従来のステージ戦）。
   ・map は1文字=1マス（32px）。全行を同じ幅にし、外周は壁で閉じること。
       #=壁  .=地面  ,=道  *=草むら（出現率1.5倍）  ~=水/溶岩（通れない）
       _=安全地帯  P=開始位置  E=出口（ホームへ）  <=上り階段（前のフロアへ）  >=下り階段（次のフロアへ）
       B=ボスゲート  S=導きの灯（全回復・セーブ）  T=宝箱  G=採取ポイント  ?=看板  a〜z=objects のNPCなど
       （objects の kind:"event" はサブイベントの調べられる物。内容は下の FIELD_SIDE_EVENTS）
   ・encounter.scale：そのフロアの雑魚敵の強さ倍率（HP・攻撃・防御・SP攻撃・SP防御・経験値・ゴールド）。
   ・chests はそのフロアの T を左上から順に読んだ順番。gathers は採取できる素材と重み。
   ・foes：FOE（見える強敵）。enemy は FIELD_ENEMIES のID、path は巡回する2地点（マス座標）。
   ・bgm は仮割り当て（ユーザー確認待ち）。
   ============================================================ */
const FIELD_AREAS = {
  1: {
    stage: 1, name: "はじまりの樹海", theme: "forest",
    bgm: "assets/music/仕分け雨/蒼獣シーガー.mp3",
    enterScene: "a1-enter", bossScene: "a1-boss", signScene: "a1-sign",
    objects: {
      a: { kind: "npc", id: "woodcutter", name: "木こりボルド", sprite: "npc-woodcutter", scene: "a1-woodcutter", sideEvents: ["a1-axe-return"] },
      b: { kind: "npc", id: "herb-girl", name: "薬草摘みのミナ", sprite: "npc-girl", scene: "a1-herb-girl", sideEvents: ["a1-herb-medicine"] },
      // [SIDE] サブイベント（1F：古い切り株／2F：木の根元の隠し物）
      c: { kind: "event", id: "a1-old-stump", name: "古い切り株", sprite: "ev-stump", event: "a1-old-stump" },
      d: { kind: "event", id: "a1-root-cache", name: "", sprite: "ev-hidden", event: "a1-root-cache", hidden: true }
    },
    floors: [
      { encounter: { min: 16, max: 28, scale: 1.0, table: [ { enemy: "stray-slime", weight: 70 }, { enemy: "mushroom", weight: 30 } ] },
        chests: [ { item: "potion", count: 2 }, { gold: 40 } ], gathers: [ ["slime_jelly", 60], ["monster_hide", 25], ["goblin_cloth", 15] ],
        foes: [ { enemy: "foe-bear", path: [[25, 14], [25, 9]] } ], map: [
        "###########################",
        "#G#.....................#c#",
        "#.#.#.#.###.###########.#.#",
        "#...#.#.#...#....*.>#...#.#",
        "#####.#.#.###.###***#.###.#",
        "#.....#...#......***#.#...#",
        "#.#########..*###.###.#.#.#",
        "#.#.......#**...#...#...#.#",
        "#.#.###.#.#####.###.#####.#",
        "#*.*..#.#.....#.#...#...#.#",
        "#..*###.#####.#.#.###.#.#.#",
        "#*.*..#.....#.#.#.....#.#.#",
        "#####.#.###.#.#.#######.#.#",
        "#.....#.#...#T#.#.....#.#.#",
        "#.#######.#.###.#.###.#.#.#",
        "#.#.......#.#...#.#.#.#...#",
        "#.#.###.###.#.###.#.#.#####",
        "#.#.#.#.#G..#.....#.#...#T#",
        "#.#.#.#.###########.###.#.#",
        "#E#...#...................#",
        "###########################"
      ] },
      { encounter: { min: 15, max: 26, scale: 1.15, table: [ { enemy: "stray-slime", weight: 50 }, { enemy: "mushroom", weight: 50 } ] },
        chests: [ { gold: 60 }, { item: "ether", count: 1 } ], gathers: [ ["slime_jelly", 55], ["monster_hide", 30], ["goblin_cloth", 15] ],
        foes: [ { enemy: "foe-bear", path: [[19, 14], [17, 16]] } ], map: [
        "###########################",
        "#...............#T#.....#>#",
        "#.#############.#.#.#.#.#.#",
        "#.#...........#.#...#.#...#",
        "#.#.#########.#.#####.#####",
        "#.#.#.....#...#.....#.....#",
        "#.#.#.###.#.#######.#.###.#",
        "#.#.#.#S....#G......#.#...#",
        "#.#.#.#########.#######.#.#",
        "#.#.#.........#......*..#.#",
        "#.#.#########.#####***###.#",
        "#.....#.....#...#.#**.#G#.#",
        "#####.#.###.###.#.#..*#.#.#",
        "#....*..#T....#.#.**.*#...#",
        "#.#***#########.#**.###.#.#",
        "#.#...#.........#.**#...#.#",
        "#.###.#.#########.#.#.###.#",
        "#.#...#.....#...#.#...#d..#",
        "#.#.#######.#.#.#.#######.#",
        "#<#.........#.#...........#",
        "###########################"
      ] },
      { encounter: { min: 15, max: 26, scale: 1.3, table: [ { enemy: "stray-slime", weight: 40 }, { enemy: "mushroom", weight: 40 }, { enemy: "forest-goblin", weight: 20 } ] },
        chests: [ { gold: 80 } ], gathers: [ ["slime_jelly", 60], ["monster_hide", 40] ], foes: [], map: [
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
        "#<__########################",
        "############################"
      ] }
    ]
  },
  2: {
    stage: 2, name: "ゴブリンの森", theme: "goblin",
    bgm: "assets/music/仕分け雨/Digilune.mp3",
    enterScene: "a2-enter", bossScene: "a2-boss", signScene: "a2-sign",
    objects: {
      a: { kind: "npc", id: "merchant", name: "行商人ロッコ", sprite: "npc-merchant", scene: "a2-merchant", sideEvents: ["a2-cargo-return"] },
      b: { kind: "npc", id: "watchman", name: "見張り番タオ", sprite: "npc-guard", scene: "a2-watchman", sideEvents: ["a2-watch-fangs"] },
      // [SIDE] サブイベント（1F・2F：ゴブリンに奪われた木箱）
      c: { kind: "event", id: "a2-crate-1", name: "壊れた木箱", sprite: "ev-crate", event: "a2-crate-1" },
      d: { kind: "event", id: "a2-crate-2", name: "壊れた木箱", sprite: "ev-crate", event: "a2-crate-2" }
    },
    floors: [
      { encounter: { min: 15, max: 26, scale: 1.0, table: [ { enemy: "forest-goblin", weight: 60 }, { enemy: "goblin-scout", weight: 25 }, { enemy: "mushroom", weight: 15 } ] },
        chests: [ { item: "potion", count: 3 }, { gold: 90 } ], gathers: [ ["goblin_cloth", 50], ["monster_fang", 30], ["monster_hide", 20] ],
        foes: [ { enemy: "foe-goblin-captain", path: [[22, 7], [25, 8]] } ], map: [
        "###########################",
        "#.......#>#...#....T#.....#",
        "#.###.#.#.#.#.#.#.###.###.#",
        "#.#...#.#...#.#.#.....#...#",
        "#.#.###.#####.#.#######.###",
        "#...#T........#.#.....#...#",
        "#.#############.#.#.#####.#",
        "#.#............*#G#.#.....#",
        "#.#.#########...###.#.###.#",
        "#.............*.....#...#.#",
        "#######################.#.#",
        "#...#.......#.........#.#.#",
        "#.#.#.#####.#.#####**.#.#.#",
        "#.#...#..G#.#...#...**..#.#",
        "#.#####.###.###.#.#######.#",
        "#.**#.......#...#.........#",
        "#**.#.#######.###.#########",
        "#*..#.....#...#...#...#...#",
        "###.#####.#.###.###.#.#.#.#",
        "#E..#...............#...#c#",
        "###########################"
      ] },
      { encounter: { min: 14, max: 25, scale: 1.15, table: [ { enemy: "forest-goblin", weight: 50 }, { enemy: "goblin-scout", weight: 50 } ] },
        chests: [ { item: "ether", count: 2 }, { gold: 110 } ], gathers: [ ["goblin_cloth", 45], ["monster_fang", 35], ["monster_hide", 20] ],
        foes: [ { enemy: "foe-goblin-captain", path: [[21, 1], [24, 3]] } ], map: [
        "###########################",
        "#G........................#",
        "#########.###########.###.#",
        "#...#...#.......#..d#.....#",
        "#.#.#.#.#.#####.#.#######.#",
        "#.#...#.#.....#.#.......#.#",
        "#.#####.#####.#.#######.#.#",
        "#.....#.**..#S#...#...*.#.#",
        "#.#.#.#**.*.###.#.#.#**.#.#",
        "#.#.#....*....#.#.#...**..#",
        "###.###***..#.#.#.#.#.#.###",
        "#...#.....**#.#.#.#.#.....#",
        "#.#.#.#####.#.#.#.#.#####.#",
        "#.#.#.....#.#.#.#.#.#T....#",
        "#.#.###.#.#.#.#.#.#.#####.#",
        "#.#.#...#...#.#.#.#.....#.#",
        "#.###.###.###.#.#.#####.#.#",
        "#.....#...#...#G#.#..>#.#.#",
        "#######.#.#.#####.#.###.#.#",
        "#<......#.........#.......#",
        "###########################"
      ] },
      { encounter: { min: 14, max: 25, scale: 1.3, table: [ { enemy: "forest-goblin", weight: 45 }, { enemy: "goblin-scout", weight: 45 }, { enemy: "mist-bat", weight: 8 } ] },
        chests: [ { item: "potion", count: 2 } ], gathers: [ ["goblin_cloth", 60], ["monster_fang", 40] ], foes: [], map: [
        "############################",
        "#__P_,,,,..****....#########",
        "#_<__..,..******...#T..#####",
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
      ] }
    ]
  },
  3: {
    stage: 3, name: "霧の森", theme: "mist",
    bgm: "assets/music/仕分け雨/夜闇に、風に紛れて.mp3",
    enterScene: "a3-enter", bossScene: "a3-boss", signScene: "a3-sign",
    // 最終フロアでは、石像と話すまで霧が晴れず、ボスゲートに入れない
    gateRequires: { flag: "a3-statue", scene: "a3-gate-locked" },
    objects: {
      a: { kind: "npc", id: "statue", name: "魔法の石像", sprite: "statue", scene: "a3-statue", sideEvents: ["a3-light-return"] },
      // [SIDE] サブイベント（1F・2F：石像の光のかけら）
      c: { kind: "event", id: "a3-shard-1", name: "光るかけら", sprite: "ev-shard", event: "a3-shard-1" },
      d: { kind: "event", id: "a3-shard-2", name: "光るかけら", sprite: "ev-shard", event: "a3-shard-2" }
    },
    floors: [
      { encounter: { min: 14, max: 24, scale: 1.0, table: [ { enemy: "mist-bat", weight: 50 }, { enemy: "forest-wolf", weight: 35 }, { enemy: "goblin-scout", weight: 15 } ] },
        chests: [ { item: "high-potion", count: 1 }, { gold: 160 } ], gathers: [ ["monster_fang", 45], ["monster_hide", 45], ["slime_jelly", 10] ],
        foes: [ { enemy: "foe-mist-stag", path: [[3, 7], [8, 6]] } ], map: [
        "###########################",
        "#.........#.......#.....#c#",
        "###.#####.#####.#.#.###.#.#",
        "#...#..**.*...#.#...#...#.#",
        "#.###.#**...#.#.#####.###.#",
        "#.#.....***.#...#....*....#",
        "#.#####*.***###.###*.*###.#",
        "#.......*..*..#.#..*....#.#",
        "#.#####.*..*#.###.#####.###",
        "#.#...#*.**.#.#...#G..#...#",
        "#.#.#.#.###.#.#.#####.###.#",
        "#...#.#.....#.#.#G....#...#",
        "#####.#######.#.###.#.#.###",
        "#...#.#.#.....#.....#.#...#",
        "#.#.#.#.#.#.#########.###.#",
        "#.#.....#.#T#.........#.#.#",
        "#.#####.#.###.#########.#.#",
        "#>#...#.#...............#.#",
        "###.#.###################.#",
        "#E..#.....................#",
        "###########################"
      ] },
      { encounter: { min: 14, max: 24, scale: 1.1, table: [ { enemy: "mist-bat", weight: 45 }, { enemy: "forest-wolf", weight: 55 } ] },
        chests: [ { item: "ether", count: 2 }, { gold: 200 } ], gathers: [ ["monster_fang", 50], ["monster_hide", 50] ],
        foes: [ { enemy: "foe-mist-stag", path: [[5, 7], [2, 9]] } ], map: [
        "###########################",
        "#..........*..#.....#..>..#",
        "#.#####.###**.#.###.#.###.#",
        "#....S#...#.*.#.#T#....G#.#",
        "#########.#..*#.#.#######.#",
        "#.......#.#***#.#.....#...#",
        "#.#####.#.#.#.#.#.###.#.###",
        "#.....#...#.#.#.#.#...#...#",
        "#.###.#####.#.#.###.#####.#",
        "#...#.....#...#.....#.....#",
        "###.#####.#########.#.#####",
        "#...#....*.......T#.#.....#",
        "#.###.#...###.#####.###.#.#",
        "#.#....**..G#*.*..#.....#.#",
        "#.#.#.#.**###..*#.#.#####.#",
        "#.#.#.#..*#..*..#...#...#.#",
        "#.#.#.#.#.#.#.*.#.###.#.#.#",
        "#...#.#.#...#.**#..d#.#...#",
        "#.#####.#####.#.#####.###.#",
        "#<........................#",
        "###########################"
      ] },
      { encounter: { min: 14, max: 24, scale: 1.2, table: [ { enemy: "forest-wolf", weight: 50 }, { enemy: "mist-bat", weight: 50 } ] },
        chests: [ { item: "high-potion", count: 1 } ], gathers: [ ["monster_fang", 50], ["monster_hide", 50] ], foes: [], map: [
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
        "#######_<.......,..#########",
        "#######_P_,,,,,,,..#########",
        "############################"
      ] }
    ]
  },
  4: {
    stage: 4, name: "焦土の溶岩洞窟", theme: "lava",
    bgm: "assets/music/仕分け雨/あやしいお店.mp3",
    enterScene: "a4-enter", bossScene: "a4-boss", signScene: "a4-sign",
    objects: {
      a: { kind: "npc", id: "miner", name: "鉱夫ガルド", sprite: "npc-miner", scene: "a4-miner", sideEvents: ["a4-tool-return"] },
      // [SIDE] サブイベント（1F：置き去りの道具袋／2F：岩壁の鉱脈）
      c: { kind: "event", id: "a4-toolbag", name: "道具袋", sprite: "ev-bag", event: "a4-toolbag" },
      d: { kind: "event", id: "a4-ore-vein", name: "", sprite: "ev-hidden", event: "a4-ore-vein", hidden: true }
    },
    floors: [
      { encounter: { min: 13, max: 24, scale: 1.0, table: [ { enemy: "fire-lizard", weight: 65 }, { enemy: "lava-golem", weight: 35 } ] },
        chests: [ { item: "high-potion", count: 2 }, { gold: 260 } ], gathers: [ ["monster_hide", 50], ["monster_fang", 35], ["dragon_scale", 15] ],
        foes: [ { enemy: "foe-salamander", path: [[9, 16], [11, 13]] } ], map: [
        "###########################",
        "#.........#...............#",
        "#.#.#####.#.#########.###.#",
        "#...#...#.#....T#...#..c#.#",
        "#.###.#.#.#.#####.#.#####.#",
        "#.#...#.#..***.*..#.#.....#",
        "#.#.###.###*.**.###.#.###.#",
        "#...#...#.....*...#.#...#.#",
        "###.#.###.#.#.###.#.###.#.#",
        "#...#....*#G#.#...#.....#.#",
        "#.###.*..*###.#.#.#######.#",
        "#.#....**...#.#.#..T#.....#",
        "#.#.#######.#.#.#####.#.###",
        "#...........#.#.......#...#",
        "###########.#.#####.#####.#",
        "#.....#...#.#....*#.#...#.#",
        "#.###.#.#.#.###...#.#.#.#.#",
        "#.#G#.#.#...#..*.*#...#...#",
        "#.#.#.#######.###########.#",
        "#E#...........#>..........#",
        "###########################"
      ] },
      { encounter: { min: 13, max: 23, scale: 1.15, table: [ { enemy: "fire-lizard", weight: 50 }, { enemy: "lava-golem", weight: 50 } ] },
        chests: [ { item: "ether", count: 3 }, { gold: 300 } ], gathers: [ ["monster_hide", 45], ["monster_fang", 35], ["dragon_scale", 20] ],
        foes: [ { enemy: "foe-salamander", path: [[3, 10], [1, 6]] } ], map: [
        "###########################",
        "#.......#G................#",
        "#.###.#.###.###.#####.###.#",
        "#.#...#...#.#d#.....#...#>#",
        "#.#.#####.#.#.#####.###.###",
        "#.#.#.......#.....#...#...#",
        "#.#.#.###########.###.#.#.#",
        "#.#..........***#.#...#S#.#",
        "#.#########..*.*#.#.#####.#",
        "#...#......***.*#.#...#...#",
        "###.#.#####.....#.###.#.###",
        "#.#.#...#T.*.**.....#.#...#",
        "#.#.###.###.#.#.###.#.###.#",
        "#.#...#...#.#.#.#...#...#.#",
        "#.###.###.#.#.#.#.#####.#.#",
        "#.#.......#...*..*..#.*...#",
        "#.#.#######.#..**.#.#...#.#",
        "#...#........**..*#.....#.#",
        "#####.#######.#.#.#######.#",
        "#<....#G........#.........#",
        "###########################"
      ] },
      { encounter: { min: 13, max: 23, scale: 1.3, table: [ { enemy: "fire-lizard", weight: 45 }, { enemy: "lava-golem", weight: 55 } ] },
        chests: [ { gold: 350 } ], gathers: [ ["monster_hide", 50], ["dragon_scale", 25], ["monster_fang", 25] ], foes: [], map: [
        "############################",
        "#_<_##~~~~~.....~~~~~~######",
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
      ] }
    ]
  },
  5: {
    stage: 5, name: "魔王城・回廊", theme: "castle",
    bgm: "assets/music/仕分け雨/Sunny_day_shopping.mp3",
    enterScene: "a5-enter", bossScene: "a5-boss", signScene: "a5-sign",
    objects: {
      a: { kind: "npc", id: "ghost-knight", name: "亡霊の騎士", sprite: "npc-ghost", scene: "a5-ghost-knight", sideEvents: ["a5-knights-rest"] },
      // [SIDE] サブイベント（1F：騎士団の紋章／2F：折れた剣）
      c: { kind: "event", id: "a5-emblem", name: "騎士団の紋章", sprite: "ev-emblem", event: "a5-emblem" },
      d: { kind: "event", id: "a5-broken-sword", name: "折れた剣", sprite: "ev-sword", event: "a5-broken-sword" }
    },
    floors: [
      { encounter: { min: 12, max: 22, scale: 1.0, table: [ { enemy: "dark-knight", weight: 55 }, { enemy: "wraith", weight: 45 } ] },
        chests: [ { item: "high-potion", count: 3 }, { gold: 400 } ], gathers: [ ["monster_fang", 45], ["monster_hide", 30], ["dragon_scale", 15], ["maou_crystal", 10] ],
        foes: [ { enemy: "foe-black-general", path: [[4, 13], [5, 9]] } ], map: [
        "###########################",
        "#G#.......#...#T........#.#",
        "#.#.#.###.#.#.###.#####.#.#",
        "#.#.#..*.*..#...#...#.#>#.#",
        "#.#.#.*.**#####.###.#.#.#.#",
        "#.#.#****.....#...#.#.#.#.#",
        "#.#.#*.**.###.###.#.#.#.#.#",
        "#.#...**..#T#...#.#.#.#.#.#",
        "#.#.#.#...#.###.#.#.#.#.#.#",
        "#.#...#***#.#...*...#.#...#",
        "#.###.#.#.#.#.#*..###.###.#",
        "#.#...#.#.#.#..*......#...#",
        "#.#.###.#.#.###...###.#.###",
        "#.#...#.#.......*.....#.#c#",
        "#.###.#.#####.#.###.###.#.#",
        "#.#...#.#.....#...#.....#.#",
        "#.#.###.###.###.#.#######.#",
        "#.....#...#.#...#...#...#.#",
        "#########.#.#.#####.#.#.#.#",
        "#E........#...#G......#...#",
        "###########################"
      ] },
      { encounter: { min: 12, max: 22, scale: 1.15, table: [ { enemy: "dark-knight", weight: 50 }, { enemy: "wraith", weight: 50 } ] },
        chests: [ { item: "ether", count: 3 }, { gold: 450 } ], gathers: [ ["monster_fang", 40], ["dragon_scale", 25], ["maou_crystal", 15], ["monster_hide", 20] ],
        foes: [ { enemy: "foe-black-general", path: [[11, 19], [16, 17]] } ], map: [
        "###########################",
        "#.....#.............#T....#",
        "#.#####.#########.#.###.#.#",
        "#.......#.......#.#.....#.#",
        "#.#########.###.#.#######.#",
        "#........***#...#.#.#.....#",
        "#######*****#.###.#.#.#####",
        "#........*.*#...#.#...#...#",
        "#######.**#.#####.#.#####.#",
        "#........*..#...#.#.......#",
        "#.#####.#####.#.#.#######.#",
        "#.#G..#...#...#...#.#.....#",
        "#.###.###.#.#######.#.#####",
        "#...#.....#.#...#...#.#>..#",
        "#.#.#.#####.#.#.###.#.###.#",
        "#d#.#...#.....#...#.#**.#.#",
        "###.#.#.#.#######.#.#***#.#",
        "#...#.#......G#...#..*..#.#",
        "#.###.#########.###.#####.#",
        "#<#S............#.........#",
        "###########################"
      ] },
      { encounter: { min: 12, max: 22, scale: 1.3, table: [ { enemy: "dark-knight", weight: 45 }, { enemy: "wraith", weight: 55 } ] },
        chests: [ { item: "ether", count: 2 } ], gathers: [ ["maou_crystal", 20], ["dragon_scale", 30], ["monster_fang", 50] ], foes: [], map: [
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
        "###########__<__############",
        "############################"
      ] }
    ]
  }
};

/* ------------------------------------------------------------
   サブイベント（探索コンテンツ）
   仕様：docs/specs/field-side-events/IMPLEMENTATION_NOTES.md
   ・各階層の 1F・2F に「調べられる物」（objects の kind:"event"）を置き、
     3F の既存NPC（objects の sideEvents）に「届ける・渡す」イベントを付ける。
   ・完了すると fieldState.flags["side:<イベントID>"] が立ち、セーブされる（報酬は1回だけ）。
   ・scene：はじめて達成したときの会話（data/story.js）。doneScene：達成後にもう一度調べたとき。
   ・requires：先に達成しておくイベントID。足りないときは hintScene を流す（NPCのイベントで使う）。
   ・needs：渡す素材と個数（materials のID）。足りないときは needText を表示する。
   ・reward：gold／items（消耗品 [ID, 個数]）／materials（素材 [ID, 個数]）。既存のものだけを使う。
   ・keyItem：報酬の代わりに手に入れる「だいじなもの」の名前（表示だけ。フラグで管理）。
   ------------------------------------------------------------ */
const FIELD_SIDE_EVENTS = {
  /* 第1階層 はじまりの樹海 */
  "a1-old-stump":   { scene: "side-a1-old-stump", doneScene: "side-a1-old-stump-done", keyItem: "木こりの手斧" },
  "a1-root-cache":  { scene: "side-a1-root-cache", reward: { gold: 30, items: [["potion", 2]] } },
  "a1-axe-return":  { requires: ["a1-old-stump"], hintScene: "side-a1-axe-hint", scene: "side-a1-axe-return", reward: { gold: 60, items: [["ether", 1]] } },
  "a1-herb-medicine": { needs: { slime_jelly: 3 }, speaker: "herb-girl", askText: "スライムゼリーを3つ、ミナに渡しますか？", needText: "ミナ「スライムゼリーが3つあれば、よく効く傷薬が作れるの！　採取ポイントやスライムから集めてきてくれる？」", scene: "side-a1-herb-medicine", reward: { items: [["potion", 3]] } },
  /* 第2階層 ゴブリンの森 */
  "a2-crate-1":     { scene: "side-a2-crate-1", doneScene: "side-a2-crate-done", keyItem: "ロッコの荷物（布地）" },
  "a2-crate-2":     { scene: "side-a2-crate-2", doneScene: "side-a2-crate-done", keyItem: "ロッコの荷物（薬瓶）" },
  "a2-cargo-return": { requires: ["a2-crate-1", "a2-crate-2"], hintScene: "side-a2-cargo-hint", scene: "side-a2-cargo-return", reward: { gold: 150, items: [["high-potion", 2]] } },
  "a2-watch-fangs": { needs: { monster_fang: 3 }, speaker: "watchman", askText: "魔物の牙を3つ、タオに渡しますか？", needText: "タオ「見張り台の鳴子に使う、魔物の牙が足りなくてな。3つ持ってきてくれたら礼をするぞ」", scene: "side-a2-watch-fangs", reward: { gold: 100, items: [["ether", 2]] } },
  /* 第3階層 霧の森 */
  "a3-shard-1":     { scene: "side-a3-shard-1", doneScene: "side-a3-shard-done", keyItem: "光るかけら" },
  "a3-shard-2":     { scene: "side-a3-shard-2", doneScene: "side-a3-shard-done", keyItem: "光るかけら" },
  "a3-light-return": { requires: ["a3-shard-1", "a3-shard-2"], hintScene: "side-a3-light-hint", scene: "side-a3-light-return", reward: { items: [["high-potion", 2], ["ether", 3]] } },
  /* 第4階層 焦土の溶岩洞窟 */
  "a4-toolbag":     { scene: "side-a4-toolbag", doneScene: "side-a4-toolbag-done", keyItem: "ガルドの道具袋" },
  "a4-ore-vein":    { scene: "side-a4-ore-vein", reward: { gold: 150, materials: [["dragon_scale", 1]] } },
  "a4-tool-return": { requires: ["a4-toolbag"], hintScene: "side-a4-tool-hint", scene: "side-a4-tool-return", reward: { gold: 300, items: [["high-potion", 3]] } },
  /* 第5階層 魔王城・回廊 */
  "a5-emblem":      { scene: "side-a5-emblem", doneScene: "side-a5-relic-done", keyItem: "騎士団の紋章" },
  "a5-broken-sword": { scene: "side-a5-broken-sword", doneScene: "side-a5-relic-done", keyItem: "団長の折れた剣" },
  "a5-knights-rest": { requires: ["a5-emblem", "a5-broken-sword"], hintScene: "side-a5-knights-hint", scene: "side-a5-knights-rest", reward: { gold: 500, items: [["high-potion", 3], ["ether", 3]] } }
};

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
