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
  {id:"leather-armor",name:"革の鎧",category:"armor",icon:"ARMOR",description:"軽く扱いやすい防具。",price:20,effect:"防御力 +5",defenseBonus:5,classes:["warrior","knight","kotama","mage","healer","samurai"],unlock:1},
  {id:"iron-armor",name:"鉄の鎧",category:"armor",icon:"ARMOR",description:"頑丈な防具。",price:80,effect:"防御力 +10",defenseBonus:10,classes:["warrior","knight","kotama"],unlock:3},
  {id:"shield",name:"木の盾",category:"armor",icon:"SHIELD",description:"物理・魔法攻撃への備え。",price:55,effect:"防御力 +4／SP防御力 +4",defenseBonus:4,spDefenseBonus:4,classes:["warrior","knight","kotama"],unlock:2},
  {id:"charm-hp",name:"生命の護符",category:"accessory",icon:"CHARM",description:"最大HPを高める護符。",price:45,effect:"最大HP +15",hpBonus:15,classes:["kotama","knight","healer","warrior","mage","samurai"],unlock:1},
  {id:"charm-atk",name:"剛力の護符",category:"accessory",icon:"CHARM",description:"攻撃力を高める護符。",price:70,effect:"攻撃力 +10",attackBonus:10,classes:["kotama","knight","healer","warrior","mage","samurai"],unlock:2},
  {id:"charm-magic",name:"魔力の護符",category:"accessory",icon:"CHARM",description:"SP攻撃力を高める護符。",price:70,effect:"SP攻撃力 +6",spAttackBonus:6,classes:["kotama","knight","healer","warrior","mage","samurai"],unlock:2},
  {id:"potion",name:"回復薬",category:"healing",icon:"POTION",description:"味方1人のHPを30回復。",price:10,effect:"HP +30",kind:"heal",amount:30,unlock:1},
  {id:"high-potion",name:"上級回復薬",category:"healing",icon:"POTION",description:"味方1人のHPを70回復。",price:25,effect:"HP +70",kind:"heal",amount:70,unlock:3},
  {id:"ether",name:"SPエーテル",category:"healing",icon:"ETHER",description:"味方1人のSPを30回復。",price:15,effect:"SP +30",kind:"sp",amount:30,unlock:2},
  {id:"swift-shoes",name:"疾風の靴",category:"accessory",icon:"BOOTS",description:"AGIを高め、行動順で先手を取りやすくする靴。",price:180,effect:"AGI +18",speedBonus:18,classes:["kotama","knight","healer","warrior","mage","samurai"],unlock:2},
  {id:"wind-boots",name:"風読みのブーツ",category:"accessory",icon:"BOOTS",description:"風の流れを読む軽量ブーツ。",price:420,effect:"AGI +32／回避補助",speedBonus:32,evasionRate:.04,classes:["kotama","knight","healer","warrior","mage","samurai"],unlock:4}
];
// 第2段階：素材・製作・強化・育成データ
const materialNames={chaos_crystal:"混沌の結晶",slime_jelly:"スライムゼリー",monster_fang:"魔物の牙",goblin_cloth:"ゴブリンの布",monster_hide:"魔物の皮",dragon_scale:"炎竜の鱗",dragon_claw:"炎竜の爪",maou_crystal:"魔王の結晶",maou_horn:"魔王の角",foe_bear_pelt:"暴れ熊の剛毛",foe_captain_medal:"親衛隊長の勲章",foe_mist_horn:"霧纏いの大角",foe_salamander_core:"灼熱核",foe_black_crest:"黒騎士団長の紋章"};
const recipes=[
{id:"slime-rod",name:"スライムロッド",icon:"STAFF",classes:["mage","healer","kotama"],spAttackBonus:20,physicalElement:"打撃",cost:100,needs:{slime_jelly:1}},
{id:"wolf-fang-sword",name:"狼牙の剣",icon:"SWORD",classes:["warrior","kotama","knight"],attackBonus:30,physicalElement:"斬撃",cost:150,needs:{monster_fang:1}},
{id:"goblin-shield",name:"ゴブリンシールド",icon:"SHIELD",classes:["knight","warrior","kotama"],defenseBonus:10,cost:150,needs:{goblin_cloth:1}},
{id:"beast-knuckle",name:"ビーストナックル",icon:"KNUCKLE",classes:["warrior","kotama"],attackBonus:45,physicalElement:"打撃",cost:250,needs:{monster_hide:1,monster_fang:1}},
{id:"dragon-greatsword",name:"炎竜の大剣",icon:"SWORD",classes:["warrior"],attackBonus:70,physicalElement:"斬撃",cost:500,needs:{dragon_scale:1,dragon_claw:1}},
{id:"dragon-staff",name:"炎竜の杖",icon:"STAFF",classes:["mage","healer"],spAttackBonus:70,physicalElement:"打撃",cost:500,needs:{dragon_scale:1,slime_jelly:1}},
{id:"maou-sword",name:"魔王の剣",icon:"SWORD",classes:["warrior","samurai","kotama"],attackBonus:100,physicalElement:"斬撃",cost:1000,needs:{maou_crystal:1,maou_horn:1}},
{id:"maou-staff",name:"魔王の杖",icon:"STAFF",classes:["mage","healer"],spAttackBonus:100,physicalElement:"打撃",cost:1000,needs:{maou_crystal:1,dragon_scale:1}},
{id:"foe-bear-breaker",name:"暴れ熊の粉砕斧",icon:"AXE",classes:["warrior","knight","kotama"],attackBonus:38,physicalElement:"打撃",cost:280,foeRequirement:"森の暴れ熊を討伐",needs:{foe_bear_pelt:1,monster_fang:2}},
{id:"foe-captain-sabre",name:"親衛隊長の軍刀",icon:"SWORD",classes:["samurai","warrior","kotama"],attackBonus:50,physicalElement:"斬撃",cost:400,foeRequirement:"ゴブリン親衛隊長を討伐",needs:{foe_captain_medal:1,goblin_cloth:2}},
{id:"foe-mist-staff",name:"霧角の魔杖",icon:"STAFF",classes:["mage","healer"],spAttackBonus:65,physicalElement:"打撃",cost:520,foeRequirement:"霧纏いの大鹿を討伐",needs:{foe_mist_horn:1,monster_hide:2}},
{id:"foe-salamander-blade",name:"灼熱の竜刃",icon:"SWORD",classes:["warrior","samurai","kotama"],attackBonus:82,physicalElement:"斬撃",cost:760,foeRequirement:"灼熱のサラマンダーを討伐",needs:{foe_salamander_core:1,dragon_scale:2}},
{id:"foe-black-general-katana",name:"黒騎士団長の太刀",icon:"SWORD",classes:["samurai","warrior"],attackBonus:105,physicalElement:"斬撃",cost:1050,foeRequirement:"黒騎士団長を討伐",needs:{foe_black_crest:1,maou_crystal:1}}
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
  "maou-sword":"maou_crystal", "maou-staff":"maou_crystal", "foe-bear-breaker":"foe_bear_pelt", "foe-captain-sabre":"foe_captain_medal", "foe-mist-staff":"foe_mist_horn", "foe-salamander-blade":"foe_salamander_core", "foe-black-general-katana":"foe_black_crest"
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
  { id:"magic-sword", name:"魔法剣", category:"weapon", icon:"SWORD", description:"魔力を宿す剣。SP攻撃力も高める。", price:90, effect:"攻撃力 +15／SP攻撃力 +20", attackBonus:15, spAttackBonus:20, physicalElement:"斬撃", classes:["imperial"], unlock:1 }
];
const EXT_ENH_MATERIALS = { "iron-spear":"monster_fang", "knight-lance":"dragon_scale", dagger:"monster_fang", "assassin-dagger":"monster_fang", "princess-rod":"slime_jelly", flintlock:"monster_hide", rifle:"dragon_scale", scythe:"monster_fang", "magic-sword":"slime_jelly" };

