// 物理武器にはphysicalElementを設定する（斬撃／打撃／壊／突）。魔法スキルはこの値を参照しない。
const shopItems=[
  {id:"hero-sword",name:"勇者の剣",category:"weapon",icon:"SWORD",description:"チュートリアルで入手する特別な剣。",price:0,effect:"攻撃力 +25",attackBonus:25,physicalElement:"斬撃",classes:["kotama"],unlock:1,tutorialOnly:true},
  {id:"sword",name:"冒険者の剣",category:"weapon",icon:"SWORD",description:"扱いやすい基本の剣。",price:20,effect:"攻撃力 +15",attackBonus:15,physicalElement:"斬撃",classes:["kotama","warrior","knight"],unlock:1},
  {id:"great-sword",name:"炎の大剣",category:"weapon",icon:"SWORD",description:"炎の力を宿した大剣。",price:90,effect:"攻撃力 +30",attackBonus:30,physicalElement:"斬撃",classes:["warrior"],unlock:3},
  {id:"mage-staff",name:"見習いの杖",category:"weapon",icon:"STAFF",description:"魔力を高める杖。",price:35,effect:"SP攻撃力 +20",spAttackBonus:20,physicalElement:"打撃",classes:["kotama","mage","healer"],unlock:1},
  {id:"healer-staff",name:"祈りの杖",category:"weapon",icon:"STAFF",description:"治癒士向けの杖。",price:100,effect:"SP攻撃力 +35",spAttackBonus:35,physicalElement:"打撃",classes:["healer"],unlock:3},
  {id:"knuckles",name:"鍛錬の籠手",category:"weapon",icon:"KNUCKLE",description:"素早い格闘に適した武器。",price:55,effect:"攻撃力 +20",attackBonus:20,physicalElement:"打撃",classes:["kotama","warrior"],unlock:2},
  {id:"katana",name:"旅人の刀",category:"weapon",icon:"KATANA",description:"武士が扱う基本の刀。二刀流用。",price:45,effect:"攻撃力 +20",attackBonus:20,physicalElement:"斬撃",classes:["samurai"],slot:"katana",unlock:1},
  {id:"iron-katana",name:"鋼の刀",category:"weapon",icon:"KATANA",description:"切れ味を高めた刀。",price:130,effect:"攻撃力 +40",attackBonus:40,physicalElement:"斬撃",classes:["samurai"],slot:"katana",unlock:4},
  {id:"leather-armor",name:"革の鎧",category:"armor",icon:"ARMOR",description:"軽く扱いやすい防具。",price:20,effect:"防御力 +5",defenseBonus:5,classes:["warrior","knight","kotama","mage","healer"],unlock:1},
  {id:"iron-armor",name:"鉄の鎧",category:"armor",icon:"ARMOR",description:"頑丈な防具。",price:80,effect:"防御力 +10",defenseBonus:10,classes:["warrior","knight","kotama"],unlock:3},
  {id:"shield",name:"木の盾",category:"armor",icon:"SHIELD",description:"物理・魔法攻撃への備え。",price:55,effect:"防御力 +4／SP防御力 +4",defenseBonus:4,spDefenseBonus:4,classes:["warrior","knight","kotama"],unlock:2},
  {id:"charm-hp",name:"生命の護符",category:"accessory",icon:"CHARM",description:"最大HPを高める護符。",price:45,effect:"最大HP +15",hpBonus:15,classes:["kotama","knight","healer","warrior","mage","samurai"],unlock:1},
  {id:"charm-atk",name:"剛力の護符",category:"accessory",icon:"CHARM",description:"攻撃力を高める護符。",price:70,effect:"攻撃力 +10",attackBonus:10,classes:["kotama","knight","healer","warrior","mage","samurai"],unlock:2},
  {id:"charm-magic",name:"魔力の護符",category:"accessory",icon:"CHARM",description:"SP攻撃力を高める護符。",price:70,effect:"SP攻撃力 +6",spAttackBonus:6,classes:["kotama","knight","healer","warrior","mage","samurai"],unlock:2},
  {id:"potion",name:"回復薬",category:"healing",icon:"POTION",description:"味方1人のHPを30回復。",price:10,effect:"HP +30",kind:"heal",amount:30,unlock:1},
  {id:"high-potion",name:"上級回復薬",category:"healing",icon:"POTION",description:"味方1人のHPを70回復。",price:25,effect:"HP +70",kind:"heal",amount:70,unlock:3},
  {id:"ether",name:"SPエーテル",category:"healing",icon:"ETHER",description:"味方1人のSPを30回復。",price:15,effect:"SP +30",kind:"sp",amount:30,unlock:2}
];
// 第2段階：素材・製作・強化・育成データ
const materialNames={chaos_crystal:"混沌の結晶",slime_jelly:"スライムゼリー",monster_fang:"魔物の牙",goblin_cloth:"ゴブリンの布",monster_hide:"魔物の皮",dragon_scale:"炎竜の鱗",dragon_claw:"炎竜の爪",maou_crystal:"魔王の結晶",maou_horn:"魔王の角"};
const recipes=[
{id:"slime-rod",name:"スライムロッド",icon:"STAFF",classes:["mage","healer","kotama"],spAttackBonus:20,physicalElement:"打撃",cost:100,needs:{slime_jelly:1}},
{id:"wolf-fang-sword",name:"狼牙の剣",icon:"SWORD",classes:["warrior","kotama","knight"],attackBonus:30,physicalElement:"斬撃",cost:150,needs:{monster_fang:1}},
{id:"goblin-shield",name:"ゴブリンシールド",icon:"SHIELD",classes:["knight","warrior","kotama"],defenseBonus:10,cost:150,needs:{goblin_cloth:1}},
{id:"beast-knuckle",name:"ビーストナックル",icon:"KNUCKLE",classes:["warrior","kotama"],attackBonus:45,physicalElement:"打撃",cost:250,needs:{monster_hide:1,monster_fang:1}},
{id:"dragon-greatsword",name:"炎竜の大剣",icon:"SWORD",classes:["warrior"],attackBonus:70,physicalElement:"斬撃",cost:500,needs:{dragon_scale:1,dragon_claw:1}},
{id:"dragon-staff",name:"炎竜の杖",icon:"STAFF",classes:["mage","healer"],spAttackBonus:70,physicalElement:"打撃",cost:500,needs:{dragon_scale:1,slime_jelly:1}},
{id:"maou-sword",name:"魔王の剣",icon:"SWORD",classes:["warrior","samurai","kotama"],attackBonus:100,physicalElement:"斬撃",cost:1000,needs:{maou_crystal:1,maou_horn:1}},
{id:"maou-staff",name:"魔王の杖",icon:"STAFF",classes:["mage","healer"],spAttackBonus:100,physicalElement:"打撃",cost:1000,needs:{maou_crystal:1,dragon_scale:1}},

{id:"shadowfang",name:"影喰らい",icon:"SWORD",classes:["assassin"],attackBonus:92,physicalElement:"斬撃",cost:800,needs:{maou_crystal:1,maou_horn:1}},
{id:"maou-rifle",name:"魔王砲",icon:"銃",classes:["gunner"],attackBonus:98,physicalElement:"壊",cost:900,needs:{maou_crystal:1,dragon_scale:2}},
{id:"maou-spear",name:"天穿つ魔槍",icon:"SWORD",classes:["highlander"],attackBonus:105,physicalElement:"突",cost:900,needs:{maou_crystal:1,dragon_claw:1}},
{id:"maou-scepter",name:"星冠の聖杖",icon:"STAFF",classes:["princess"],spAttackBonus:105,physicalElement:"打撃",cost:900,needs:{maou_crystal:1,dragon_scale:2}},
{id:"maou-scythe",name:"終焉の大鎌",icon:"SWORD",classes:["reaper"],attackBonus:92,physicalElement:"斬撃",cost:900,needs:{maou_crystal:1,maou_horn:1}},
{id:"maou-imperial-sword",name:"魔王機関剣",icon:"SWORD",classes:["imperial"],attackBonus:65,spAttackBonus:105,physicalElement:"斬撃",cost:1000,needs:{maou_crystal:2,maou_horn:1}},
{id:"maou-katana",name:"無明の魔刀",icon:"KATANA",classes:["samurai"],slot:"katana",attackBonus:62,physicalElement:"斬撃",cost:1000,needs:{maou_crystal:2,maou_horn:1}},
{id:"maou-guardian-blade",name:"不落の守護剣",icon:"SWORD",classes:["knight"],attackBonus:72,physicalElement:"斬撃",cost:900,needs:{maou_crystal:1,dragon_claw:1}}

];
const enhancementCosts=[0,100,200,300,500,800];
// 武器強化素材の割り当て。仕様書に武器別対応表がないため、初期値として仮設定。
// 調整時はこの表だけを変更する。
const enhancementMaterials={
  // 店売り武器：序盤素材を使用する仮設定
  sword:"slime_jelly", "mage-staff":"slime_jelly", "knuckles":"monster_hide",
  "great-sword":"dragon_scale", "healer-staff":"dragon_scale",
  katana:"monster_fang", "iron-katana":"monster_fang",
  // 製作武器：レシピに含まれる代表素材を使用
  "slime-rod":"slime_jelly", "wolf-fang-sword":"monster_fang",
  "goblin-shield":"goblin_cloth", "beast-knuckle":"monster_hide",
  "dragon-greatsword":"dragon_scale", "dragon-staff":"dragon_scale",
  "maou-sword":"maou_crystal", "maou-staff":"maou_crystal",

  "forest-guard-sword":"slime_jelly","thunder-hero-sword":"dragon_scale",
  "iron-guard-blade":"goblin_cloth","aegis-blade":"dragon_scale",
  "blessing-staff":"slime_jelly","saint-staff":"dragon_scale",
  "battle-greatsword":"monster_hide","dragon-breaker":"dragon_scale",
  "crystal-wand":"slime_jelly","star-oracle-staff":"dragon_scale",
  "kagero-katana":"monster_fang","dragon-katana":"dragon_scale",
  "shadow-dagger":"monster_fang","nightfang-dagger":"dragon_scale",
  "long-barrel-rifle":"monster_hide","dragon-rifle":"dragon_scale",
  "wyvern-lance":"monster_fang","sky-piercer-lance":"dragon_scale",
  "royal-scepter":"slime_jelly","queen-oracle":"dragon_scale",
  "soul-scythe":"monster_fang","death-scythe":"dragon_scale",
  "magitech-sword":"slime_jelly","astral-imperial-sword":"dragon_scale",
  "shadowfang":"maou_crystal","maou-rifle":"maou_crystal","maou-spear":"maou_crystal",
  "maou-scepter":"maou_crystal","maou-scythe":"maou_crystal","maou-imperial-sword":"maou_crystal",
  "maou-katana":"maou_crystal","maou-guardian-blade":"maou_crystal"

};
const accessoryItems=[
{id:"acc-hp-ring",name:"生命の指輪",category:"accessory",icon:"RING",description:"最大HP+15%。",price:200,hpRate:.15,effect:"最大HP +15%",classes:["kotama","knight","healer","warrior","mage","samurai"]},
{id:"acc-strength",name:"剛力の腕輪",category:"accessory",icon:"RING",description:"攻撃力+10%。",price:200,attackRate:.10,effect:"攻撃力 +10%",classes:["kotama","knight","healer","warrior","mage","samurai"]},
{id:"acc-magic",name:"魔力の首飾り",category:"accessory",icon:"CHARM",description:"SP攻撃力+10%。",price:200,spAttackRate:.10,effect:"SP攻撃力 +10%",classes:["kotama","knight","healer","warrior","mage","samurai"]},
{id:"acc-guardian",name:"守護のブローチ",category:"accessory",icon:"CHARM",description:"被ダメージ-10%。",price:300,damageReduction:.10,effect:"被ダメージ -10%",classes:["kotama","knight","healer","warrior","mage","samurai"]},
{id:"acc-evasion",name:"回避のイヤリング",category:"accessory",icon:"RING",description:"回避率+10%。",price:300,evasionRate:.10,effect:"回避率 +10%",classes:["kotama","knight","healer","warrior","mage","samurai"]},
{id:"acc-sp-save",name:"魔力節約のお守り",category:"accessory",icon:"CHARM",description:"SP消費-15%。",price:350,spCostReduction:.15,effect:"SP消費 -15%",classes:["kotama","knight","healer","warrior","mage","samurai"]},
{id:"acc-heal",name:"癒やしの指輪",category:"accessory",icon:"RING",description:"回復量+15%。",price:350,healingRate:.15,effect:"回復量 +15%",classes:["kotama","knight","healer","warrior","mage","samurai"]},
{id:"acc-fire-resist",name:"火耐性のお守り",category:"accessory",icon:"CHARM",description:"炎属性ダメージ-30%。",price:300,fireDamageReduction:.30,effect:"炎属性被ダメージ -30%",classes:["kotama","knight","healer","warrior","mage","samurai"]},
{id:"acc-break",name:"ブレイクの腕輪",category:"accessory",icon:"RING",description:"ブレイクダメージ+20%。",price:400,breakRate:.20,effect:"ブレイクダメージ +20%",classes:["kotama","knight","healer","warrior","mage","samurai"]},
{id:"acc-indomitable",name:"不屈のペンダント",category:"accessory",icon:"CHARM",description:"HP30%以下で被ダメージ-20%。",price:400,lowHpReduction:.20,effect:"HP30%以下で被ダメージ -20%",classes:["kotama","knight","healer","warrior","mage","samurai"]},
{id:"acc-chaos-charm",name:"混沌の護符",category:"accessory",icon:"CHARM",description:"最大HP+20%、SP攻撃力+10%。",price:0,hpRate:.20,spAttackRate:.10,effect:"最大HP +20%／SP攻撃力 +10%",classes:["kotama","knight","healer","warrior","mage","samurai"]}
];

const EXT_NEW_ITEMS = [
  { id:"iron-spear", name:"鉄の槍", category:"weapon", icon:"SWORD", description:"ハイランダーの基本の槍。", price:60, effect:"攻撃力 +22", attackBonus:22, physicalElement:"突", classes:["highlander"], unlock:1 },
  { id:"knight-lance", name:"騎士の大槍", category:"weapon", icon:"SWORD", description:"貫通力に優れた大槍。", price:140, effect:"攻撃力 +45", attackBonus:45, physicalElement:"突", classes:["highlander"], unlock:4 },
  { id:"dagger", name:"短剣", category:"weapon", icon:"SWORD", description:"素早く扱える短剣。", price:40, effect:"攻撃力 +14", attackBonus:14, physicalElement:"斬撃", classes:["assassin"], unlock:1 },
  { id:"assassin-dagger", name:"暗殺者の短剣", category:"weapon", icon:"SWORD", description:"毒を塗り込める特別な短剣。", price:120, effect:"攻撃力 +32", attackBonus:32, physicalElement:"斬撃", classes:["assassin"], unlock:3 },
  { id:"princess-rod", name:"王女の杖", category:"weapon", icon:"STAFF", description:"魔力を高める気品ある杖。", price:60, effect:"SP攻撃力 +25", spAttackBonus:25, physicalElement:"打撃", classes:["princess"], unlock:1 },
  { id:"flintlock", name:"火打ち銃", category:"weapon", icon:"銃", description:"扱いやすい基本の銃。", price:55, effect:"攻撃力 +20", attackBonus:20, physicalElement:"壊", classes:["gunner"], unlock:1 },
  { id:"rifle", name:"ライフル", category:"weapon", icon:"銃", description:"長射程の高性能な銃。", price:130, effect:"攻撃力 +42", attackBonus:42, physicalElement:"壊", classes:["gunner"], unlock:4 },
  { id:"scythe", name:"死神の鎌", category:"weapon", icon:"SWORD", description:"魂を刈り取る大鎌。", price:70, effect:"攻撃力 +25", attackBonus:25, physicalElement:"斬撃", classes:["reaper"], unlock:1 },
  { id:"magic-sword", name:"魔法剣", category:"weapon", icon:"SWORD", description:"魔力を宿す剣。SP攻撃力も高める。", price:90, effect:"攻撃力 +15／SP攻撃力 +20", attackBonus:15, spAttackBonus:20, physicalElement:"斬撃", classes:["imperial"], unlock:1 },

  // 初期6職：既存装備の間を埋める中盤・終盤装備
  {id:"forest-guard-sword",name:"樹守りの剣",category:"weapon",icon:"SWORD",description:"樹海の素材で鍛えた、扱いやすい剣。",price:80,effect:"攻撃力 +28",attackBonus:28,physicalElement:"斬撃",classes:["kotama"],unlock:2},
  {id:"thunder-hero-sword",name:"雷光の勇剣",category:"weapon",icon:"SWORD",description:"雷の力を帯びた勇者の剣。",price:240,effect:"攻撃力 +55",attackBonus:55,physicalElement:"斬撃",classes:["kotama"],unlock:4},
  {id:"iron-guard-blade",name:"鉄衛の剣",category:"weapon",icon:"SWORD",description:"騎士の扱いやすさを重視した片手剣。",price:90,effect:"攻撃力 +28",attackBonus:28,physicalElement:"斬撃",classes:["knight"],unlock:2},
  {id:"aegis-blade",name:"蒼盾の剣",category:"weapon",icon:"SWORD",description:"守りを崩さず攻めるための騎士剣。",price:260,effect:"攻撃力 +55",attackBonus:55,physicalElement:"斬撃",classes:["knight"],unlock:4},
  {id:"blessing-staff",name:"祝福の杖",category:"weapon",icon:"STAFF",description:"回復術を安定させる治癒士の杖。",price:150,effect:"SP攻撃力 +48",spAttackBonus:48,physicalElement:"打撃",classes:["healer"],unlock:3},
  {id:"saint-staff",name:"聖樹の杖",category:"weapon",icon:"STAFF",description:"聖なる術式を増幅する杖。",price:340,effect:"SP攻撃力 +78",spAttackBonus:78,physicalElement:"打撃",classes:["healer"],unlock:5},
  {id:"battle-greatsword",name:"闘士の大剣",category:"weapon",icon:"SWORD",description:"重さと威力を両立した戦士用の大剣。",price:170,effect:"攻撃力 +48",attackBonus:48,physicalElement:"斬撃",classes:["warrior"],unlock:3},
  {id:"dragon-breaker",name:"竜砕き",category:"weapon",icon:"SWORD",description:"竜の鱗を断つために鍛えられた大剣。",price:380,effect:"攻撃力 +85",attackBonus:85,physicalElement:"斬撃",classes:["warrior"],unlock:5},
  {id:"crystal-wand",name:"晶石の魔杖",category:"weapon",icon:"STAFF",description:"結晶の共鳴で術式を強める杖。",price:150,effect:"SP攻撃力 +48",spAttackBonus:48,physicalElement:"打撃",classes:["mage"],unlock:3},
  {id:"star-oracle-staff",name:"星詠みの杖",category:"weapon",icon:"STAFF",description:"星の魔力を集める高位の魔杖。",price:360,effect:"SP攻撃力 +85",spAttackBonus:85,physicalElement:"打撃",classes:["mage"],unlock:5},
  {id:"kagero-katana",name:"陽炎の刀",category:"weapon",icon:"KATANA",description:"軽さと切れ味を追求した二刀流用の刀。",price:180,effect:"攻撃力 +55",attackBonus:55,physicalElement:"斬撃",classes:["samurai"],slot:"katana",unlock:3},
  {id:"dragon-katana",name:"竜鱗の刀",category:"weapon",icon:"KATANA",description:"竜鱗を鍛え込んだ二刀流用の刀。",price:320,effect:"攻撃力 +65",attackBonus:65,physicalElement:"斬撃",classes:["samurai"],slot:"katana",unlock:5},

  // 追加6職：専用武器の中盤・終盤段階
  {id:"shadow-dagger",name:"影縫いの短剣",category:"weapon",icon:"SWORD",description:"素早い連撃と状態異常を支える短剣。",price:150,effect:"攻撃力 +48",attackBonus:48,physicalElement:"斬撃",classes:["assassin"],unlock:3},
  {id:"nightfang-dagger",name:"夜牙の短剣",category:"weapon",icon:"SWORD",description:"闇に紛れて急所を狙う暗殺者の短剣。",price:330,effect:"攻撃力 +68",attackBonus:68,physicalElement:"斬撃",classes:["assassin"],unlock:5},
  {id:"long-barrel-rifle",name:"長銃身ライフル",category:"weapon",icon:"銃",description:"狙撃の威力と命中精度を高めた銃。",price:180,effect:"攻撃力 +60",attackBonus:60,physicalElement:"壊",classes:["gunner"],unlock:3},
  {id:"dragon-rifle",name:"竜骨ライフル",category:"weapon",icon:"銃",description:"竜の素材で反動を抑えた高威力銃。",price:360,effect:"攻撃力 +82",attackBonus:82,physicalElement:"壊",classes:["gunner"],unlock:5},
  {id:"wyvern-lance",name:"飛竜の槍",category:"weapon",icon:"SWORD",description:"突撃の勢いを損なわない長槍。",price:190,effect:"攻撃力 +65",attackBonus:65,physicalElement:"突",classes:["highlander"],unlock:3},
  {id:"sky-piercer-lance",name:"天穿ちの槍",category:"weapon",icon:"SWORD",description:"高所からの一撃に特化した長槍。",price:380,effect:"攻撃力 +88",attackBonus:88,physicalElement:"突",classes:["highlander"],unlock:5},
  {id:"royal-scepter",name:"王家の錫杖",category:"weapon",icon:"STAFF",description:"味方を鼓舞する王族の魔力を宿す。",price:160,effect:"SP攻撃力 +50",spAttackBonus:50,physicalElement:"打撃",classes:["princess"],unlock:3},
  {id:"queen-oracle",name:"女王の星杖",category:"weapon",icon:"STAFF",description:"広域支援の術式を増幅する王杖。",price:360,effect:"SP攻撃力 +82",spAttackBonus:82,physicalElement:"打撃",classes:["princess"],unlock:5},
  {id:"soul-scythe",name:"魂刈りの鎌",category:"weapon",icon:"SWORD",description:"弱体化した敵を刈り取る大鎌。",price:170,effect:"攻撃力 +55",attackBonus:55,physicalElement:"斬撃",classes:["reaper"],unlock:3},
  {id:"death-scythe",name:"冥府の大鎌",category:"weapon",icon:"SWORD",description:"呪詛を帯びた高位の大鎌。",price:350,effect:"攻撃力 +78",attackBonus:78,physicalElement:"斬撃",classes:["reaper"],unlock:5},
  {id:"magitech-sword",name:"魔導機剣",category:"weapon",icon:"SWORD",description:"物理と魔法の両方を扱う魔剣。",price:180,effect:"攻撃力 +32／SP攻撃力 +45",attackBonus:32,spAttackBonus:45,physicalElement:"斬撃",classes:["imperial"],unlock:3},
  {id:"astral-imperial-sword",name:"星導機剣",category:"weapon",icon:"SWORD",description:"高出力の魔力機関を搭載した魔剣。",price:380,effect:"攻撃力 +55／SP攻撃力 +75",attackBonus:55,spAttackBonus:75,physicalElement:"斬撃",classes:["imperial"],unlock:5},

  // 職業専用防具：能力の役割を伸ばしつつ、アクセサリと重ねても過剰にならない値に設定
  {id:"forest-ranger-armor",name:"樹守りの胸当て",category:"armor",icon:"ARMOR",description:"探索者向けの軽い胸当て。",price:90,effect:"防御力 +8／最大HP +15",defenseBonus:8,hpBonus:15,classes:["kotama"],unlock:2},
  {id:"hero-guardian-armor",name:"勇護の鎧",category:"armor",icon:"ARMOR",description:"攻守の均衡を取った勇者の鎧。",price:260,effect:"防御力 +18／SP防御力 +6／最大HP +35",defenseBonus:18,spDefenseBonus:6,hpBonus:35,classes:["kotama"],unlock:4},
  {id:"iron-knight-mail",name:"鉄衛の鎧",category:"armor",icon:"ARMOR",description:"物理・魔法の両方に備える騎士鎧。",price:120,effect:"防御力 +18／SP防御力 +8／最大HP +25",defenseBonus:18,spDefenseBonus:8,hpBonus:25,classes:["knight"],unlock:2},
  {id:"aegis-plate",name:"蒼盾の重鎧",category:"armor",icon:"ARMOR",description:"守りを極めた重装鎧。",price:380,effect:"防御力 +30／SP防御力 +16／最大HP +45／被ダメージ -5%",defenseBonus:30,spDefenseBonus:16,hpBonus:45,damageReduction:.05,classes:["knight"],unlock:5},
  {id:"herbalist-robe",name:"薬草師のローブ",category:"armor",icon:"ARMOR",description:"術への備えを重視した治癒士のローブ。",price:100,effect:"防御力 +5／SP防御力 +14／最大HP +10",defenseBonus:5,spDefenseBonus:14,hpBonus:10,classes:["healer"],unlock:2},
  {id:"saint-vestment",name:"聖樹の法衣",category:"armor",icon:"ARMOR",description:"聖なる術式を守る高位の法衣。",price:340,effect:"防御力 +10／SP防御力 +25／最大HP +25／回復量 +5%",defenseBonus:10,spDefenseBonus:25,hpBonus:25,healingRate:.05,classes:["healer"],unlock:5},
  {id:"battle-plate",name:"闘士の胸甲",category:"armor",icon:"ARMOR",description:"前線で戦い続けるための重装胸甲。",price:120,effect:"防御力 +15／最大HP +35",defenseBonus:15,hpBonus:35,classes:["warrior"],unlock:2},
  {id:"dragon-war-plate",name:"竜砕きの重鎧",category:"armor",icon:"ARMOR",description:"竜の攻撃を受け止めるための重鎧。",price:380,effect:"防御力 +26／SP防御力 +8／最大HP +55",defenseBonus:26,spDefenseBonus:8,hpBonus:55,classes:["warrior"],unlock:5},
  {id:"sage-robe",name:"賢者のローブ",category:"armor",icon:"ARMOR",description:"魔力の流れを妨げない軽装ローブ。",price:100,effect:"防御力 +5／SP防御力 +16／最大HP +10",defenseBonus:5,spDefenseBonus:16,hpBonus:10,classes:["mage"],unlock:2},
  {id:"archmage-robe",name:"大賢者のローブ",category:"armor",icon:"ARMOR",description:"強大な術式に耐える高位のローブ。",price:340,effect:"防御力 +9／SP防御力 +28／最大HP +20",defenseBonus:9,spDefenseBonus:28,hpBonus:20,classes:["mage"],unlock:5},
  {id:"shadow-cloak",name:"影走りの外套",category:"armor",icon:"ARMOR",description:"身軽さを損なわず、攻撃をかわしやすい外套。",price:100,effect:"防御力 +6／SP防御力 +4／最大HP +5／回避率 +6%",defenseBonus:6,spDefenseBonus:4,hpBonus:5,evasionRate:.06,classes:["assassin"],unlock:2},
  {id:"night-cloak",name:"夜渡りの外套",category:"armor",icon:"ARMOR",description:"暗殺者の身のこなしを助ける上質な外套。",price:340,effect:"防御力 +12／SP防御力 +8／最大HP +15／回避率 +10%",defenseBonus:12,spDefenseBonus:8,hpBonus:15,evasionRate:.10,classes:["assassin"],unlock:5},
  {id:"gunner-coat",name:"射手の強化服",category:"armor",icon:"ARMOR",description:"銃の反動と敵の反撃に備える強化服。",price:110,effect:"防御力 +8／SP防御力 +6／最大HP +15",defenseBonus:8,spDefenseBonus:6,hpBonus:15,classes:["gunner"],unlock:2},
  {id:"sniper-armor",name:"狙撃手の装甲服",category:"armor",icon:"ARMOR",description:"遠距離からの攻撃を支える装甲服。",price:350,effect:"防御力 +16／SP防御力 +12／最大HP +30",defenseBonus:16,spDefenseBonus:12,hpBonus:30,classes:["gunner"],unlock:5},
  {id:"lancer-mail",name:"槍騎兵の鎧",category:"armor",icon:"ARMOR",description:"突撃時の負傷を抑える槍騎兵の鎧。",price:130,effect:"防御力 +17／SP防御力 +6／最大HP +30",defenseBonus:17,spDefenseBonus:6,hpBonus:30,classes:["highlander"],unlock:2},
  {id:"wyvern-lancer-plate",name:"飛竜騎兵の重鎧",category:"armor",icon:"ARMOR",description:"強敵への突撃を想定した重装鎧。",price:390,effect:"防御力 +27／SP防御力 +12／最大HP +50",defenseBonus:27,spDefenseBonus:12,hpBonus:50,classes:["highlander"],unlock:5},
  {id:"royal-dress",name:"王族の礼装",category:"armor",icon:"ARMOR",description:"支援術式を守る王族の礼装。",price:110,effect:"防御力 +6／SP防御力 +15／最大HP +15",defenseBonus:6,spDefenseBonus:15,hpBonus:15,classes:["princess"],unlock:2},
  {id:"queen-regalia",name:"女王の宝衣",category:"armor",icon:"ARMOR",description:"広域支援の負担に耐える女王の宝衣。",price:350,effect:"防御力 +12／SP防御力 +26／最大HP +30／回復量 +5%",defenseBonus:12,spDefenseBonus:26,hpBonus:30,healingRate:.05,classes:["princess"],unlock:5},
  {id:"reaper-mantle",name:"冥府の外套",category:"armor",icon:"ARMOR",description:"呪詛を受け流すリーパーの外套。",price:120,effect:"防御力 +9／SP防御力 +8／最大HP +15／被ダメージ -3%",defenseBonus:9,spDefenseBonus:8,hpBonus:15,damageReduction:.03,classes:["reaper"],unlock:2},
  {id:"soul-shroud",name:"魂守りの衣",category:"armor",icon:"ARMOR",description:"窮地で生き残るための呪衣。",price:360,effect:"防御力 +16／SP防御力 +16／最大HP +25／HP30%以下で被ダメージ -8%",defenseBonus:16,spDefenseBonus:16,hpBonus:25,lowHpReduction:.08,classes:["reaper"],unlock:5},
  {id:"magitech-coat",name:"魔導機関服",category:"armor",icon:"ARMOR",description:"魔力機関の熱と反動を抑える防護服。",price:130,effect:"防御力 +11／SP防御力 +12／最大HP +20",defenseBonus:11,spDefenseBonus:12,hpBonus:20,classes:["imperial"],unlock:2},
  {id:"imperial-armor",name:"帝国式魔導装甲",category:"armor",icon:"ARMOR",description:"高出力の魔剣運用に耐える装甲。",price:380,effect:"防御力 +20／SP防御力 +22／最大HP +40／被ダメージ -3%",defenseBonus:20,spDefenseBonus:22,hpBonus:40,damageReduction:.03,classes:["imperial"],unlock:5}

];
const EXT_ENH_MATERIALS = { "iron-spear":"monster_fang", "knight-lance":"dragon_scale", dagger:"monster_fang", "assassin-dagger":"monster_fang", "princess-rod":"slime_jelly", flintlock:"monster_hide", rifle:"dragon_scale", scythe:"monster_fang", "magic-sword":"slime_jelly" };

