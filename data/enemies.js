const enemyData=[
  {name:"スライム",element:"無属性",weaknesses:["炎","氷","雷","聖"],resistances:[],physicalResistances:["斬撃","打撃","壊","突"],hp:180,attack:12,defense:4,spDefense:35,physicalDamageRate:.18,gold:7,sprite:"slime",actionName:"粘液攻撃",image:"assets/monsters/suraimu.png"},
  {name:"ゴブリン",element:"無属性",weaknesses:["炎","斬撃"],resistances:[],hp:360,attack:32,defense:10,gold:10,sprite:"goblin",actionName:"棍棒の一撃",image:"assets/monsters/goburinn.png"},
  {name:"オオカミ",element:"無属性",weaknesses:["雷","打撃","壊"],resistances:[],hp:660,attack:38,defense:20,gold:25,sprite:"wolf",actionName:"鋭い牙",image:"assets/monsters/ookami.png"},
  {name:"ドラゴン",element:"炎",weaknesses:["氷","斬撃"],resistances:["炎"],hp:1600,attack:65,defense:40,spAttack:90,spDefense:20,gold:60,sprite:"dragon",actionName:"鋭い爪",image:"assets/monsters/dragon.svg"},
  {name:"魔王",element:"無属性",weaknesses:["雷"],resistances:["炎","氷","聖","斬撃","打撃","壊","突"],hp:2700,attack:70,spAttack:100,defense:100,gold:100,sprite:"maou",actionName:"深淵の斬撃",image:"assets/monsters/maou.png"}
];
// 第1階層3Fボス「スノードリフト」。通常のステージボス配列には含めず、迷宮ボスとして扱う。
const SNOWDRIFT_BOSS_DATA = {
  name:"スノードリフト", element:"氷", weaknesses:["炎"], resistances:["氷"],
  hp:2350, attack:82, spAttack:76, defense:34, spDefense:28, speed:78,
  gold:180, exp:950, sprite:"wolf", image:"assets/monsters/ookami.png", actionName:"氷爪",
  ai:[
    { name:"氷爪", weight:45, kind:"phys", power:1.35 },
    { name:"白銀の吹雪", weight:30, all:true, kind:"sp", power:.72, element:"氷", status:{ type:"attackDown", chance:.35, turns:2, power:.15 } },
    { name:"雪狼の遠吠え", weight:25, all:true, kind:"sp", power:.48, element:"氷", status:{ type:"paralysis", chance:.18, turns:1 } }
  ]
};

// 隠しボス「混沌の幻影」。戦闘（script.js の createEnemy）と図鑑（monster-compendium.js）の両方がこの値を参照する。
const hiddenBossData={name:"混沌の幻影",element:"無属性",weaknesses:[],resistances:["炎","氷","雷","聖","斬撃","打撃","壊","突"],hp:7200,attack:145,defense:155,spAttack:165,spDefense:95,gold:0,sprite:"maou",image:"assets/monsters/chaos-phantom.svg",actionName:"混沌の一撃"};
