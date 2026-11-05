"use strict";

// Fantasy RPG - Battle風の固定フレーム / ターン制コマンド入力
const PARTY_LIMIT = 4;
// 追加ゲームシステム・第1段階の数値設定。調整時はここを変更する。
const BATTLE_RULES = {
  classBonuses: { warrior:{attack:1.10}, knight:{defense:1.15,attack:1.0}, kotama:{maxHp:1.10,attack:1.05}, mage:{spAttack:1.15}, healer:{healing:1.20}, samurai:{attack:1.20,defense:.90} },
  passives: { warrior:{normalDamage:1.10}, knight:{normalDamageTaken:.90}, kotama:{lowHpDefense:1.20,threshold:.50}, mage:{spDamage:1.10}, healer:{healing:1.10}, samurai:{} },
  elements: { weak:1.5, normal:1, resist:.5, immune:0 },
  break: { normal:10, sp:20, ultimate:30, union:40, weak:1.5, resist:.5 },
  bosses: { ドラゴン:{break:100}, 魔王:{break:150}, 混沌の幻影:{break:200} }
};
const characters = [
  { id:"kotama", name:"コタマ", image:"assets/characters/kotama.png", hp:100,maxHp:100,attack:150,spAttack:100,defense:35,guardCut:.60,sp:60,maxSp:60,spSkills:[{id:"magic-bullet",name:"魔力弾",cost:15,target:"enemy",type:"spAttack",element:"雷"}] },
  { id:"knight", name:"騎士", image:"assets/characters/kishi.png", hp:120,maxHp:120,attack:35,spAttack:10,defense:60,guardCut:.80,sp:50,maxSp:50,spSkills:[{id:"taunt",name:"挑発",cost:5,target:"self",type:"taunt"}] },
  { id:"healer", name:"治癒士", image:"assets/characters/hi-ra-.png", hp:80,maxHp:80,attack:5,spAttack:90,defense:10,guardCut:.25,sp:120,maxSp:120,spSkills:[{id:"heal",name:"ヒール",cost:15,target:"ally",type:"heal"},{id:"revive",name:"死者蘇生",cost:30,target:"deadAlly",type:"revive"}] },
  { id:"warrior", name:"戦士", image:"assets/characters/sennshi.png", hp:130,maxHp:130,attack:50,spAttack:180,defense:20,guardCut:.50,sp:80,maxSp:80,spSkills:[{id:"charge",name:"突撃",cost:10,hpCost:20,target:"enemy",type:"charge"}] },
  { id:"mage", name:"魔術師", image:"assets/characters/mahoutukai.png", hp:70,maxHp:70,attack:2,spAttack:95,defense:5,guardCut:.20,sp:180,maxSp:180,spSkills:[{id:"fire",name:"ファイア",cost:15,target:"allEnemies",type:"fire",element:"炎"},{id:"freeze",name:"フリーズ",cost:20,target:"allEnemies",type:"ice",element:"氷"},{id:"thunder",name:"サンダー",cost:25,target:"allEnemies",type:"thunder",element:"雷"}] },
  { id:"samurai", name:"武士", image:"assets/characters/samurai.png", hp:105,maxHp:105,attack:72,spAttack:35,defense:18,spDefense:12,guardCut:.35,sp:75,maxSp:75,spSkills:[{id:"many-slashes",name:"乱れ斬り",cost:20,target:"enemy",type:"multiSlash"},{id:"helmet-break",name:"兜割",cost:25,target:"enemy",type:"pierce"}] }
];
const unionSkills = {
  kotama:{id:"magic-bullet-union",name:"至高の魔弾",requiredHits:4,type:"stun",damage:300},
  knight:{id:"aegis-union",name:"イージスの大盾",requiredHits:4,type:"aegis"},
  healer:{id:"full-healing-union",name:"フルヒーリング",requiredHits:5,type:"full-heal"},
  warrior:{id:"cross-break-union",name:"クロスブレイク",requiredHits:4,type:"cross-break",requiredMembers:2},
  mage:{id:"meteor-union",name:"メテオ",requiredHits:5,type:"meteor",damage:666},
  samurai:{id:"samurai-union",name:"一刀両断",requiredHits:4,type:"samurai-slash",damage:420}
};
const state={screen:"home",gold:50,maxUnlockedStage:1,firstStageStarted:false,party:["kotama","knight","mage","healer"]};
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
  {id:"ether",name:"SPエーテル",category:"healing",icon:"ETHER",description:"味方1人のSPを30回復。",price:15,effect:"SP +30",kind:"sp",amount:30,unlock:2}
];
// 第2段階：素材・製作・強化・育成データ
const materialNames={chaos_crystal:"混沌の結晶",slime_jelly:"スライムゼリー",monster_fang:"魔物の牙",goblin_cloth:"ゴブリンの布",monster_hide:"魔物の皮",dragon_scale:"炎竜の鱗",dragon_claw:"炎竜の爪",maou_crystal:"魔王の結晶",maou_horn:"魔王の角"};
const materials={};
const recipes=[
{id:"slime-rod",name:"スライムロッド",icon:"STAFF",classes:["mage","healer","kotama"],spAttackBonus:20,physicalElement:"打撃",cost:100,needs:{slime_jelly:1}},
{id:"wolf-fang-sword",name:"狼牙の剣",icon:"SWORD",classes:["warrior","kotama","knight"],attackBonus:30,physicalElement:"斬撃",cost:150,needs:{monster_fang:1}},
{id:"goblin-shield",name:"ゴブリンシールド",icon:"SHIELD",classes:["knight","warrior","kotama"],defenseBonus:10,cost:150,needs:{goblin_cloth:1}},
{id:"beast-knuckle",name:"ビーストナックル",icon:"KNUCKLE",classes:["warrior","kotama"],attackBonus:45,physicalElement:"打撃",cost:250,needs:{monster_hide:1,monster_fang:1}},
{id:"dragon-greatsword",name:"炎竜の大剣",icon:"SWORD",classes:["warrior"],attackBonus:70,physicalElement:"斬撃",cost:500,needs:{dragon_scale:1,dragon_claw:1}},
{id:"dragon-staff",name:"炎竜の杖",icon:"STAFF",classes:["mage","healer"],spAttackBonus:70,physicalElement:"打撃",cost:500,needs:{dragon_scale:1,slime_jelly:1}},
{id:"maou-sword",name:"魔王の剣",icon:"SWORD",classes:["warrior","samurai","kotama"],attackBonus:100,physicalElement:"斬撃",cost:1000,needs:{maou_crystal:1,maou_horn:1}},
{id:"maou-staff",name:"魔王の杖",icon:"STAFF",classes:["mage","healer"],spAttackBonus:100,physicalElement:"打撃",cost:1000,needs:{maou_crystal:1,dragon_scale:1}}
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
  "maou-sword":"maou_crystal", "maou-staff":"maou_crystal"
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
shopItems.push(...accessoryItems);
for(const r of recipes)shopItems.push({...r,category:"weapon",craftedOnly:true,description:"素材から製作する武器。",effect:r.attackBonus?`攻撃力 +${r.attackBonus}`:`SP攻撃力 +${r.spAttackBonus}`,unlock:99});
const compendium = Object.fromEntries(["スライム","ゴブリン","オオカミ","ドラゴン","魔王","混沌の幻影"].map(name=>[name,{encountered:false,defeated:false}]));
const eventRead = {};
let hiddenBossFirstClear=false;
const stageEvents = [
 {id:"forest-intro",title:"はじまりの樹海",pages:["コタマたちは、魔法の石像が眠るという樹海へ足を踏み入れた。","木々の間から、小さな影がこちらを見つめている。冒険の始まりだ。"]},
 {id:"goblin-intro",title:"森の奥へ",pages:["樹海の奥では、ゴブリンたちが道を塞いでいた。","仲間と力を合わせて、先へ進もう。"]},
 {id:"dragon-intro",title:"炎の竜",pages:["熱風が吹き荒れ、巨大な翼が空を覆う。","この先に待つのは、炎をまとうドラゴンだ。"]},
 {id:"maou-intro",title:"魔王の城",pages:["長い冒険の果てに、魔王の城へたどり着いた。","仲間たちとともに、最後の戦いへ。"]},
 {id:"slime-clear",trigger:"clear",stage:1,title:"樹海の小さな勝利",pages:["スライムを退け、コタマたちは樹海の奥へ進む。","まだ冒険は始まったばかり。仲間と一緒なら、きっと大丈夫だ。"]},
 {id:"goblin-clear",trigger:"clear",stage:2,title:"ゴブリンの包囲を抜けて",pages:["ゴブリンたちの包囲を突破した。","森の奥から、さらに強い気配が近づいてくる。"]},
 {id:"wolf-clear",trigger:"clear",stage:3,title:"静かな森を越えて",pages:["オオカミの幻影が霧の中へ消えていった。","木々の向こうには、赤い光が揺れている。"]},
 {id:"dragon-clear",trigger:"clear",stage:4,title:"炎竜を越えて",pages:["炎竜との激闘を乗り越えた。","残る道は、魔王の城へと続いている。"]},
 {id:"maou-clear",trigger:"clear",stage:5,title:"冒険の終わり",pages:["魔王を倒し、世界に平穏が戻った。","コタマたちの冒険は、仲間との絆とともに語り継がれていく。"]},
 {id:"hidden-boss-clear",trigger:"clear",hiddenBoss:true,title:"混沌を越えて",pages:["混沌の幻影を打ち破り、深い静寂が訪れた。","新たな強敵に挑んだ経験は、仲間たちの胸に刻まれた。"]}
];
const growth={};
characters.forEach(c=>growth[c.id]={spent:{maxHp:0,attack:0,defense:0,maxSp:0,spAttack:0,spDefense:0},unspent:0});
// レベル値は既存仕様に経験値・必要経験値がないため初期値のみ管理する。
// 経験値システムからレベル変更を通知すると、その上昇分だけ成長ポイントを付与する。
const characterLevels={};
characters.forEach(c=>characterLevels[c.id]=1);
// 成長配分の編集中データ。確定するまで実際の能力値・セーブデータには反映しない。
const growthKeys=["maxHp","attack","defense","maxSp","spAttack","spDefense"];
const growthLabels={maxHp:"最大HP",attack:"攻撃力",defense:"防御力",maxSp:"最大SP",spAttack:"SP攻撃力",spDefense:"SP防御力"};
const growthPerPoint={maxHp:10,attack:2,defense:2,maxSp:5,spAttack:2,spDefense:2};
// 第4段階：実績・討伐数・最高ランク・使用職業の永続記録
const achievementDefinitions=[
{id:"first_win",name:"はじめての勝利",description:"初めて戦闘に勝利する",reward:50},
{id:"defeat_10",name:"駆け出しの討伐者",description:"敵を合計10体倒す",reward:100},
{id:"defeat_50",name:"百戦錬磨",description:"敵を合計50体倒す",reward:200},
{id:"dragon_slayer",name:"竜殺し",description:"ドラゴンを倒す",reward:300},
{id:"maou_slayer",name:"魔王討伐",description:"魔王を倒す",reward:500},
{id:"perfect_victory",name:"無傷の勝利",description:"戦闘不能者を出さずに勝利する",reward:100},
{id:"lightning",name:"電光石火",description:"3ターン以内に勝利する",reward:200},
{id:"weapon_smith",name:"はじめての武器職人",description:"武器を初めて製作する",reward:100},
{id:"enhancement_master",name:"強化の極み",description:"武器を+5にする",reward:200},
{id:"compendium_80",name:"図鑑コレクター",description:"通常モンスター図鑑を80%以上埋める",reward:300},
{id:"all_jobs",name:"みんなで冒険",description:"全職業を勝利編成に参加させる",reward:200},
{id:"hidden_boss",name:"さらなる強敵",description:"隠しボスを倒す",reward:500}
];
const achievementUnlocked={};
let totalEnemyDefeats=0;
let bestRanks={};
let jobVictoryRoster=[];
let battleSpeed=1;
let tutorialState={started:false,completed:false,phase:"intro",battlePhase:"tutorial-intro",heroSwordGranted:false,heroSwordEquipped:false,armorBought:false,potionBought:false,healerRemoved:false,healerReadded:false,accessoryExplained:false};
let tutorialSpotlightTarget=null;
let retryContext=null;
const unlockedSkills={};
characters.forEach(c=>unlockedSkills[c.id]=[]);
const trainingPoints={};characters.forEach(c=>trainingPoints[c.id]=0);
const mageCompressionStacks={mage:0};
let stageCleared={};
let stageEntered={};
let stageSkillPointAwarded={};
let selectedTrainingSkill=null;
let selectedStartStage=1;
let battleStartSnapshot=null;
let pendingBattleResumeEnemy=null;
let bgmVolume=.15,seVolume=.2;
const weaponLevels={};
const inventory={};
const equipment={};
characters.forEach(c=>equipment[c.id]={weapon:null,armor:null,accessory1:null,accessory2:null,katana1:null,katana2:null});
// 初期装備：新規開始時から最低限の武器・防具を装備している状態にする。
equipment.kotama.weapon="sword";equipment.kotama.armor="leather-armor";
equipment.knight.weapon="sword";equipment.knight.armor="leather-armor";
equipment.mage.weapon="mage-staff";equipment.mage.armor="leather-armor";
equipment.healer.weapon="mage-staff";equipment.healer.armor="leather-armor";
equipment.samurai.katana1="katana";equipment.samurai.armor="leather-armor";
const enemyData=[
  {name:"スライム",element:"無属性",weaknesses:["炎","氷","雷","聖"],resistances:[],physicalResistances:["斬撃","打撃","壊","突"],hp:180,attack:12,defense:4,spDefense:35,physicalDamageRate:.18,gold:7,sprite:"slime",actionName:"粘液攻撃",image:"assets/monsters/suraimu.png"},
  {name:"ゴブリン",element:"無属性",weaknesses:["炎","斬撃"],resistances:[],hp:360,attack:32,defense:10,gold:10,sprite:"goblin",actionName:"棍棒の一撃",image:"assets/monsters/goburinn.png"},
  {name:"オオカミ",element:"無属性",weaknesses:["雷","打撃","壊"],resistances:[],hp:660,attack:30,defense:20,gold:14,sprite:"wolf",actionName:"鋭い牙",image:"assets/monsters/ookami.png"},
  {name:"ドラゴン",element:"炎",weaknesses:["氷","斬撃"],resistances:["炎"],hp:1600,attack:65,defense:40,spAttack:90,spDefense:20,gold:35,sprite:"dragon",actionName:"鋭い爪"},
  {name:"魔王",element:"無属性",weaknesses:["雷"],resistances:["炎","氷","聖","斬撃","打撃","壊","突"],hp:2700,attack:70,spAttack:100,defense:100,gold:35,sprite:"maou",actionName:"深淵の斬撃",image:"assets/monsters/maou.png"}
];
const $=id=>document.getElementById(id);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const getCharacter=id=>characters.find(c=>c.id===id);
const getParty=()=>state.party.map(getCharacter).filter(Boolean);
const itemById=id=>shopItems.find(i=>i.id===id);
let formationTargetSlot=0;
let currentCategory="weapon", shopBuyerId="kotama", purchasePopupTimer, audioContext=null, bgmTimer=null, bossBgmAudio=null, previewAudio=null, previewTimer=null, bgmStep=0, currentBgmKey="", prioritySoundUntil=0, readyChimeKey="", maouOmenTimer=null, goblinCharging=false, goblinTeamAttackPending=false, burnedTurns={}, specialOmenShown={}, soundtrackPreviewActive=false, storyTypingTimer=null, storyTypingComplete=true, retreatConfirmed=false, lastMp3SeAt=0, stageIntroStoryPending=false, maouIntroBgmPersistent=false, battleBgmSelections={}, lastBattleBgmSelections={};
let battleState={stage:1,maxStage:5,hiddenBossMode:false,enemy:null,turnCount:0,busy:false,fast:false,turnOrder:[],currentActorIndex:0,actions:[],consumedActors:[],guarding:{},tauntTarget:null,enemyStunned:false,aegisActive:false,defenseCampTurns:0,magicGuardActive:false,fullGuardActive:false,knightFullGuardCooldown:0,unionGauges:{kotama:0,knight:0,healer:0,warrior:0,mage:0,samurai:0},log:[],pending:null,menuMode:"main",targetIds:[],stageFinished:false,lastRewardGold:0,bossBgmChoice:null,koCount:0,rankResult:null,wolfEvasionTurns:0,wolfLastTargetId:null,wolfClones:[],wolfDisplayOrder:[],wolfCloneTurns:0,wolfCloneLastTargetId:null,wolfSplitPending:false,wolfHalfHpEvasionUsed:false,tutorialMode:false};
let goblinTeamAttackUsed=false, defenseDownFresh=new Set(), lastEnemyAttackMissed=false;

function playSe(file,volumeScale=1){
  const toggle=$("se-toggle");if(toggle&&!toggle.checked)return;
  lastMp3SeAt=performance.now();
  try{
    const path=file.endsWith(".mp3")?file:`${file}.mp3`;
    const audio=new Audio(encodeURI(path));
    audio.volume=Math.max(0,Math.min(1,seVolume*(0.5/3)*volumeScale));
    audio.preload="auto";
    audio.play().catch(error=>console.warn("SE再生に失敗:",path,error));
    return audio;
  }catch(error){console.warn("SE読み込みに失敗:",file,error);}
}
function sound(type="move",force=false){
  const toggle=$("se-toggle"); if(toggle&&!toggle.checked)return;
  if(performance.now()-lastMp3SeAt<700)return;
  if(!force&&performance.now()<prioritySoundUntil&&type!=="union")return;
  try{
    audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==="suspended")audioContext.resume();
    const osc=audioContext.createOscillator(),gain=audioContext.createGain();
    const now=audioContext.currentTime;
    const settings={move:[610,.035,"square",.018],select:[980,.065,"square",.035],back:[520,.07,"triangle",.025],error:[260,.11,"square",.03],damage:[190,.16,"sawtooth",.052],guard:[285,.28,"triangle",.055],heal:[1120,.13,"sine",.03],union:[1320,.22,"square",.04],buy:[880,.12,"triangle",.03]};
    const [freq,dur,wave,baseVol]=settings[type]||settings.select;const vol=Math.min(.9,baseVol*3*seVolume);
    osc.type=wave;osc.frequency.setValueAtTime(freq,now);if(type==="damage")osc.frequency.exponentialRampToValueAtTime(72,now+dur);if(type==="guard")osc.frequency.exponentialRampToValueAtTime(105,now+dur);
    gain.gain.setValueAtTime(vol,now);gain.gain.exponentialRampToValueAtTime(.0001,now+dur);
    osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+dur);if(type==="guard"){const clang=audioContext.createOscillator(),cg=audioContext.createGain();clang.type="sine";clang.frequency.setValueAtTime(920,now);clang.frequency.exponentialRampToValueAtTime(420,now+.2);cg.gain.setValueAtTime(Math.min(.9,.075*seVolume),now);cg.gain.exponentialRampToValueAtTime(.0001,now+.22);clang.connect(cg);cg.connect(audioContext.destination);clang.start(now);clang.stop(now+.23);}
  }catch(e){}
}
function currentBgmTrack(){
  if(state.screen==="home")return "home";
  if(state.screen==="clear")return "ending";
  if(state.screen!=="battle")return "normal";
  if(battleState.stageFinished)return "normal";
  if(battleState.hiddenBossMode||battleState.enemy?.name==="混沌の幻影")return "hiddenBoss";
  // BGMは敵の撃破・次の敵出現では切り替えず、ステージ番号に固定する。
  if(battleState.stage===1)return "slime";
  if(battleState.stage===2)return "goblin";
  if(battleState.stage===4)return "dragon";
  if(battleState.stage===5)return "boss";
  return "normal";
}
function startBgm(){
  if(soundtrackPreviewActive)return;
  if((activeEvent&&activeEvent.id!=="maou-intro")||(stageIntroStoryPending&&activeEvent?.id!=="maou-intro"&&!maouIntroBgmPersistent)){stopBgm();return;}
  const toggle=$("bgm-toggle");
  if(toggle&&!toggle.checked){stopBgm();return;}
  const key=currentBgmTrack();
  if(bossBgmAudio&&currentBgmKey===key){if(bossBgmAudio.paused)bossBgmAudio.play().catch(()=>{});return;}
  if(bgmTimer||bossBgmAudio||currentBgmKey)stopBgm();
  const playlists={
    ending:["assets/music/March_for__delightful_future.mp3"],
    boss:["assets/music/Final%20Battle%20Arc.mp3","assets/music/Final%20Battle%20Overture.mp3"],
    dragon:["assets/music/戦闘/Deckrail.mp3","assets/music/戦闘/Derringer.mp3"],
    hiddenBoss:["assets/music/戦闘/Zero_Defects.mp3","assets/music/戦闘/Do_not_go_against_me.mp3","assets/music/戦闘/Swirling_Black.mp3"],
    goblin:["assets/music/戦闘/Soldiers.mp3","assets/music/戦闘/Leathers_Motorcycle.mp3"],
    slime:["assets/music/戦闘/Lower_Sanctum.mp3","assets/music/戦闘/Sakura_Mellows.mp3"]
  };
  if(playlists[key]){
    try{
      let track;
      if(key==="ending")track=playlists[key][0];
      else {
        if(!battleBgmSelections[key]){
          const choices=playlists[key].filter(candidate=>candidate!==lastBattleBgmSelections[key]);
          const pool=choices.length?choices:playlists[key];
          battleBgmSelections[key]=pool[Math.floor(Math.random()*pool.length)];
          lastBattleBgmSelections[key]=battleBgmSelections[key];
          if(key==="boss")battleState.bossBgmChoice=battleBgmSelections[key].includes("Overture")?"overture":"arc";
        }
        track=battleBgmSelections[key];
      }
      bossBgmAudio=new Audio(track);bossBgmAudio.loop=true;bossBgmAudio.preload="auto";
      // 魔王戦の音量を基準に、他の戦闘BGMは少し抑える。
      const baseVolume=key==="boss"?.2625:(key==="ending"?.0875:.20/3);bossBgmAudio.volume=Math.min(1,baseVolume*bgmVolume);currentBgmKey=key;
      const playback=bossBgmAudio.play();if(playback&&typeof playback.catch==="function")playback.catch(()=>{});
    }catch(e){bossBgmAudio=null;currentBgmKey="";}
    return;
  }
  try{
    audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==="suspended")audioContext.resume();
    const tracks={home:{notes:[261.63,329.63,392,329.63,293.66,349.23,440,392],wave:"sine",gain:.0175/3,interval:1100,duration:1.22},normal:{notes:[220,277.18,329.63,277.18,196,246.94,293.66,246.94],wave:"sine",gain:.02/3,interval:420,duration:.28}};
    const track=tracks[key]||tracks.normal;currentBgmKey=key;bgmStep=0;
    bgmTimer=setInterval(()=>{const liveToggle=$("bgm-toggle");if(liveToggle&&!liveToggle.checked){stopBgm();return;}if(currentBgmTrack()!==currentBgmKey){stopBgm();startBgm();return;}try{const o=audioContext.createOscillator(),g=audioContext.createGain(),now=audioContext.currentTime;o.type=track.wave;o.frequency.setValueAtTime(track.notes[bgmStep++%track.notes.length],now);g.gain.setValueAtTime(Math.min(.9,track.gain*(bgmVolume*1.5)),now);g.gain.exponentialRampToValueAtTime(.0001,now+track.duration);o.connect(g);g.connect(audioContext.destination);o.start(now);o.stop(now+track.duration+.01);}catch(e){}},track.interval);
  }catch(e){stopBgm();}
}
function playReadyChime(){
  prioritySoundUntil=performance.now()+520;
  playSe("assets/se/unionskill/キラーン！",.65/3);
}
function stopBgm(){if(bgmTimer){clearInterval(bgmTimer);bgmTimer=null;}if(bossBgmAudio){bossBgmAudio.pause();try{bossBgmAudio.currentTime=0;}catch(e){}bossBgmAudio=null;}currentBgmKey="";}
function equippedItems(c){return Object.entries(equipment[c.id]||{}).map(([slot,id])=>{const item=itemById(id);if(!item)return null;const lv=weaponLevels[id]||0;if(item.category!=="weapon"||!lv)return item;const mult=1+lv*.1;return {...item,attackBonus:Math.floor((item.attackBonus||0)*mult),spAttackBonus:Math.floor((item.spAttackBonus||0)*mult)};}).filter(Boolean);}
// 同じアクセサリを2枠に装備しても同一効果は重複しない。別種類の効果は合算する。
function uniqueEquippedItems(c){const seen=new Set();return equippedItems(c).filter(item=>{const id=item.id||item.name;if(seen.has(id))return false;seen.add(id);return true;});}
function effectiveStats(c,growthOverride=null){const items=equippedItems(c);const sum=k=>items.reduce((n,i)=>n+(i[k]||0),0);const rate=k=>{const seen=new Set();return items.reduce((n,i)=>{if(!i[k])return n;const id=i.id||i.name;if(seen.has(id))return n;seen.add(id);return n+i[k];},0);};const g=growthOverride||growth[c.id]||{spent:{}};const bonus=BATTLE_RULES.classBonuses[c.id]||{};const raw={maxHp:c.maxHp+sum("hpBonus")+(g.spent.maxHp||0)*10,attack:c.attack+sum("attackBonus")+(g.spent.attack||0)*2,spAttack:c.spAttack+sum("spAttackBonus")+(g.spent.spAttack||0)*2,defense:Math.max(0,c.defense+sum("defenseBonus")+(g.spent.defense||0)*2-(c._defenseDownTurns>0?(c._defenseDown||0):0)),spDefense:(Number.isFinite(c.spDefense)?c.spDefense:Math.floor(c.defense/2))+sum("spDefenseBonus")+(g.spent.spDefense||0)*2,maxSp:c.maxSp+(g.spent.maxSp||0)*5};if(battleState.defenseCampTurns>0)raw.defense+=50+5*Math.max(0,battleState._defenseCampLevel-1);const passiveRate=treeStatBonus(c.id);if(passiveRate){const statType=skillTreeDefinitions[c.id]?.passive?.stat;if(statType==="attack"){raw.attack=Math.floor(raw.attack*(1+passiveRate));}else if(statType==="defense"){raw.defense=Math.floor(raw.defense*(1+passiveRate));}else if(statType==="balanced"){raw.maxHp=Math.floor(raw.maxHp*(1+passiveRate));raw.attack=Math.floor(raw.attack*(1+passiveRate));raw.spAttack=Math.floor(raw.spAttack*(1+passiveRate));}else if(statType==="healer"){raw.maxHp=Math.floor(raw.maxHp*(1+passiveRate));raw.spAttack=Math.floor(raw.spAttack*(1+passiveRate));raw.spDefense=Math.floor(raw.spDefense*(1+passiveRate));}else if(statType==="warrior"){raw.maxHp=Math.floor(raw.maxHp*(1+passiveRate));raw.attack=Math.floor(raw.attack*(1+passiveRate));raw.defense=Math.floor(raw.defense*(1+passiveRate));}else if(statType==="mage"){raw.spAttack=Math.floor(raw.spAttack*(1+passiveRate));}else if(statType==="samurai"){raw.attack=Math.floor(raw.attack*(1+passiveRate));raw.maxHp=Math.floor(raw.maxHp*(1+passiveRate));raw.defense=Math.floor(raw.defense*(1+passiveRate));}}for(const key of ["maxHp","attack","spAttack","defense","spDefense"])if(Number.isFinite(bonus[key]))raw[key]=Math.floor(raw[key]*bonus[key]);raw.maxHp=Math.floor(raw.maxHp*(1+rate("hpRate")));raw.attack=Math.floor(raw.attack*(1+rate("attackRate")));raw.spAttack=Math.floor(raw.spAttack*(1+rate("spAttackRate")));return {...c,...raw};}
function effectiveAttackPower(c){const stats=effectiveStats(c);return burnedTurns[c.id]>0?Math.floor(stats.attack/2):stats.attack;}
function effectiveSpAttackPower(c){const power=effectiveStats(c).spAttack;return burnedTurns[c.id]>0?Math.floor(power/2):power;}
function getEquippedName(c,slot){const item=itemById(equipment[c.id]?.[slot]);return item?item.name:"なし";}
function statWithBonus(base,bonus){return `${base}${bonus?` <b class="stat-bonus">+${bonus}</b>`:""}`;}
function tutorialSave(){
  if(!tutorialState.started||tutorialState.completed)return;
  try{localStorage.setItem("fantasyRpgSave",JSON.stringify(createSaveData()));}catch(e){}
}
function tutorialOverlay(title,message,button="次へ"){
  const overlay=$("tutorial-overlay");if(!overlay)return;
  // 親画面のtransform等によるスタッキングコンテキストの影響を避け、画面直下に配置する。
  if(overlay.parentElement!==document.body)document.body.appendChild(overlay);
  // ガイド本文は画面最上部に表示し、対象箇所のスポットライトとは独立させる。
  $("tutorial-title").textContent=title;$("tutorial-message").textContent=message;
  $("tutorial-next").textContent=button||"次へ";overlay.hidden=false;
  overlay.setAttribute("data-tutorial-phase",tutorialState.phase||"intro");overlay.classList.toggle("tutorial-battle-mode",!!battleState.tutorialMode);
  overlay.classList.toggle("tutorial-welcome",tutorialState.phase==="welcome");
  tutorialSyncNextButton();syncTutorialActive();
  if(tutorialSpotlightTarget)updateTutorialSpotlight();
}
// 「次へ」を押しても次の説明に進まず消えるだけの段階では、ボタンを出さず、
// 光っている対象を直接操作させる。
const TUTORIAL_NO_NEXT=["welcome","battle-command","battle-sp-command","battle-guard-command","battle-union-command","battle-retreat","formation-intro","formation-remove","formation-add","equip-hero-sword","shop-nav","shop-armor","shop-potion","complete"];
function tutorialSyncNextButton(){const b=$("tutorial-next");if(!b)return;const hide=TUTORIAL_NO_NEXT.includes(tutorialState.phase);b.hidden=hide;if(b.parentElement)b.parentElement.hidden=hide;}
function syncTutorialActive(){document.body.classList.toggle("tutorial-active",!!(tutorialState.started&&!tutorialState.completed));}
// 初期装備：コタマ以外は最初から装備している状態にする（空きスロットのみ補完）。
function ensureStarterGear(){
  const starters={knight:{weapon:"sword",armor:"leather-armor"},mage:{weapon:"mage-staff",armor:"leather-armor"},healer:{weapon:"mage-staff",armor:"leather-armor"},samurai:{katana1:"katana",armor:"leather-armor"}};
  for(const [cid,slots] of Object.entries(starters))for(const [slot,id] of Object.entries(slots))if(equipment[cid]&&!equipment[cid][slot])equipment[cid][slot]=id;
}
function updateTutorialSpotlight(){
  const spot=$("tutorial-spotlight"),overlay=$("tutorial-overlay"),target=tutorialSpotlightTarget;
  if(!spot)return;
  if(!target||!target.isConnected||!overlay||overlay.hidden){spot.hidden=true;return;}
  const r=target.getBoundingClientRect(),pad=7;
  spot.style.left=`${Math.max(3,r.left-pad)}px`;
  spot.style.top=`${Math.max(3,r.top-pad)}px`;
  spot.style.width=`${Math.max(8,r.width+pad*2)}px`;
  spot.style.height=`${Math.max(8,r.height+pad*2)}px`;
  spot.hidden=false;
  positionTutorialPanel(r,pad);
}
// 説明パネルが緑の発光エリアと重なる場合は、重ならない側（上／下）へ移動する。
function positionTutorialPanel(r,pad=7){
  const overlay=$("tutorial-overlay"),panel=overlay?.querySelector(".tutorial-panel");
  if(!overlay||!panel||overlay.classList.contains("tutorial-welcome"))return;
  const hits=p=>r.top-pad<p.bottom&&r.bottom+pad>p.top&&r.left-pad<p.right&&r.right+pad>p.left;
  overlay.classList.remove("tutorial-panel-top");
  const bottomRect=panel.getBoundingClientRect();
  if(!hits(bottomRect))return;
  overlay.classList.add("tutorial-panel-top");
  const topRect=panel.getBoundingClientRect();
  // 上側でも重なる場合は、重なりの少ない下側へ戻す。
  if(hits(topRect)){
    const ov=p=>Math.max(0,Math.min(r.bottom,p.bottom)-Math.max(r.top,p.top));
    if(ov(bottomRect)<=ov(topRect))overlay.classList.remove("tutorial-panel-top");
  }
}
function tutorialClose(){const overlay=$("tutorial-overlay");if(overlay)overlay.hidden=true;tutorialSpotlightTarget=null;const spot=$("tutorial-spotlight");if(spot)spot.hidden=true;document.querySelectorAll(".tutorial-highlight").forEach(n=>n.classList.remove("tutorial-highlight"));tutorialSyncCommandLock();syncTutorialActive();}
function tutorialCommandAllowed(button){
  const phase=tutorialState.phase, mode=battleState.menuMode;
  if(!battleState.tutorialMode)return true;
  // 画面説明中はコマンド操作を全面禁止。指定された段階の指定操作だけ許可する。
  if(["battle","battle-enemy","battle-event","battle-event-warning","battle-party","battle-command-ui","battle-info-ui"].includes(phase))return false;
  if(phase==="battle-command")return mode==="target"?button.hasAttribute("data-enemy-target"):button.dataset.action==="attack";
  if(phase==="battle-sp-command")return mode==="target"?button.hasAttribute("data-enemy-target"):mode==="skill"?button.hasAttribute("data-skill"):button.dataset.action==="skill";
  if(phase==="battle-guard-command")return button.dataset.action==="guard";
  if(phase==="battle-union-command")return button.matches(".union-command,[data-union]");
  return false;
}
function tutorialSyncCommandLock(){
  const box=$("battle-commands");if(!box)return;
  const active=tutorialState.started&&!tutorialState.completed&&battleState.tutorialMode;
  box.querySelectorAll("button").forEach(b=>{
    if(!active){
      b.classList.remove("tutorial-command-allowed","tutorial-command-blocked");
      if(b.dataset.tutorialLocked==="1"){b.disabled=b.dataset.tutorialWasDisabled==="1";delete b.dataset.tutorialLocked;delete b.dataset.tutorialWasDisabled;}
      return;
    }
    const allowed=tutorialCommandAllowed(b);
    if(!b.dataset.tutorialLocked)b.dataset.tutorialWasDisabled=b.disabled?"1":"0";
    if(!allowed){b.dataset.tutorialLocked="1";b.disabled=true;b.classList.add("tutorial-command-blocked");b.classList.remove("tutorial-command-allowed");}
    else{b.dataset.tutorialLocked="0";b.disabled=b.dataset.tutorialWasDisabled==="1";b.classList.add("tutorial-command-allowed");b.classList.remove("tutorial-command-blocked");}
  });
}
function tutorialHighlight(selector){
  document.querySelectorAll(".tutorial-highlight").forEach(n=>n.classList.remove("tutorial-highlight"));
  const el=selector?document.querySelector(selector):null;
  tutorialSpotlightTarget=el||null;
  if(el){el.classList.add("tutorial-highlight");el.scrollIntoView({block:"nearest",behavior:"auto"});}
  updateTutorialSpotlight();
  tutorialSyncCommandLock();tutorialSyncNextButton();
  return el;
}
window.addEventListener("resize",updateTutorialSpotlight);
window.addEventListener("scroll",updateTutorialSpotlight,true);
function tutorialAdvancePhase(phase,title,message,selector=null,button="次へ"){
  tutorialState.phase=phase;tutorialSave();tutorialHighlight(selector||"");tutorialOverlay(title,message,button);
}
function showTutorialWelcome(){
  tutorialState.started=true;
  tutorialState.completed=false;
  tutorialState.phase="welcome";
  tutorialState.battlePhase="tutorial-intro";
  tutorialSave();
  tutorialHighlight(null);
  tutorialOverlay(
    "ようこそ、冒険者！",
    "FANTASY RPGの世界へようこそ！ これから仲間との冒険を始めよう。画面の見方や戦い方を、ひとつずつ案内するよ。準備ができたら、緑に光っている「チュートリアル開始」ボタンを押してね。",
    "チュートリアル開始"
  );
  const overlay=$("tutorial-overlay");
  if(overlay)overlay.classList.add("tutorial-welcome");
}
function beginTutorial(resume=false){
  document.body.classList.remove("tutorial-home-focus");
  if(!resume) tutorialState={started:true,completed:false,phase:"battle",battlePhase:"tutorial-intro",heroSwordGranted:false,heroSwordEquipped:false,armorBought:false,potionBought:false,healerRemoved:false,healerReadded:false,accessoryExplained:false};
  else {tutorialState.started=true;tutorialState.completed=false;}
  battleState.tutorialMode=true;battleState.hiddenBossMode=false;battleState.maxStage=5;battleState.stage=1;resetTransientBattleState();
  state.party=["kotama","knight","mage","healer"];
  equipment.kotama.weapon=null;equipment.kotama.armor=null;ensureStarterGear();
  getParty().forEach(c=>{c.hp=effectiveStats(c).maxHp;c.sp=c.maxSp;});
  battleState.unionGauges={kotama:0,knight:0,healer:0,warrior:0,mage:0,samurai:0};
  battleState.enemy={name:"スライムa",element:"無属性",weaknesses:["炎","氷","雷","聖"],resistances:[],physicalResistances:["斬撃","打撃","壊","突"],hp:2400,maxHp:2400,attack:12,defense:999,spDefense:35,physicalDamageRate:.03,gold:0,sprite:"slime",image:"assets/monsters/suraimu.png",members:[{id:"slime-a-1",name:"スライム",displayName:"スライムa",hp:1200,maxHp:1200,attack:12,defense:999,spDefense:35,gold:0,sprite:"slime",image:"assets/monsters/suraimu.png",alive:true},{id:"slime-a-2",name:"スライム",displayName:"スライムa",hp:1200,maxHp:1200,attack:12,defense:999,spDefense:35,gold:0,sprite:"slime",image:"assets/monsters/suraimu.png",alive:true}],memberCount:2};
  battleState.turnCount=tutorialState.battlePhase==="sp"||tutorialState.battlePhase==="sp-resolved"?1:tutorialState.battlePhase==="guard"||tutorialState.battlePhase==="guard-resolved"?2:tutorialState.battlePhase==="union"||tutorialState.battlePhase==="union-resolved"||tutorialState.battlePhase==="retreat"?3:0;battleState.koCount=0;battleState.rankResult=null;battleState.busy=true;battleState.actions=[];battleState.consumedActors=[];battleState.guarding={};battleState.tauntTarget=null;battleState.enemyStunned=false;battleState.defenseCampTurns=0;battleState.magicGuardActive=false;battleState.fullGuardActive=false;battleState.knightFullGuardCooldown=0;battleState.aegisActive=false;battleState.log=[];battleState.stageFinished=false;battleState.lastRewardGold=0;battleState.turnOrder=tutorialState.battlePhase==="sp"?["kotama"]:tutorialState.battlePhase==="guard"?["kotama","knight","mage","healer"]:tutorialState.battlePhase==="union"?["kotama"]:["kotama","knight","mage","healer"];battleState.currentActorIndex=0;
  battleState.unionGauges.kotama=tutorialState.battlePhase==="union"?unionSkills.kotama.requiredHits:0;goblinCharging=false;goblinTeamAttackPending=false;goblinTeamAttackUsed=false;specialOmenShown={};
  $("stage-title").textContent="TUTORIAL BATTLE";$("battle-result").hidden=true;$("battle-commands").hidden=false;$("battle-support").hidden=false;$("battle-support").textContent="チュートリアル戦闘";$("event-log").replaceChildren();$("battle-log").replaceChildren();
  showScreen("battle");$("battle-commands").inert=false;battleState.busy=false;renderBattle();if(tutorialState.battlePhase!=="retreat")renderActionMenu();tutorialSyncCommandLock();
  if(resume&&tutorialState.battlePhase==="sp")pushEvent("このスライムは物理攻撃に強いみたいだ。通常攻撃ではほとんどダメージを与えられないぞ！");
  if(resume&&tutorialState.battlePhase==="guard")pushEvent("次のターン、強力な攻撃が来るみたいだ……！ 全員で防御しよう。","warning");
  if(resume&&tutorialState.battlePhase==="union")pushEvent("強力な全体攻撃を防いだ！ コタマのユニオンスキルを使おう。");
  if(tutorialState.phase==="battle"||tutorialState.phase==="intro"){
    tutorialState.phase="battle-enemy";
    tutorialOverlay("冒険へようこそ！","まずは敵の表示を確認しよう。敵のHPゲージを見ながら戦うのが基本だよ。");
    tutorialHighlight("#battle-enemy");
  }else if(tutorialState.battlePhase==="sp")tutorialOverlay("SPスキルを使おう","SPスキルはSPゲージを消費して発動するよ。スライムaは物理攻撃に強いけれど、防御を貫通するSP攻撃なら大きくダメージを与えられるよ。スキルを選んで右側の説明も確認しよう。");else if(tutorialState.battlePhase==="guard")tutorialOverlay("防御しよう","強力な全体攻撃が来るよ。味方全員で防御してダメージを軽減しよう。");else if(tutorialState.battlePhase==="union")tutorialOverlay("ユニオンスキルを使おう","コタマのユニオンゲージが満タンになったよ。ユニオンスキルを発動しよう。");tutorialSave();
}
function resumeTutorial(){
  if(!tutorialState.started||tutorialState.completed){openStageSelectDialog();return;}
  if(["intro","battle","battle-enemy","battle-event","battle-event-warning","battle-party","battle-command-ui","battle-info-ui","battle-command","battle-sp","battle-sp-command","battle-guard","battle-guard-command","battle-union","battle-union-command","battle-retreat"].includes(tutorialState.phase)){
    if(tutorialState.phase==="battle-retreat"){
      beginTutorial(true);tutorialState.battlePhase="retreat";battleState.turnOrder=[];battleState.busy=true;$("battle-commands").hidden=true;tutorialOverlay("戦い方の基本は完了！","撤退ボタンを押して拠点に戻ろう。");tutorialHighlight("#retreat-button");return;
    }
    beginTutorial(tutorialState.phase!=="intro");
    if(tutorialState.phase==="battle-enemy")tutorialOverlay("敵の表示","敵のHPゲージを確認しよう。敵のHPを減らして撃破するのが戦闘の基本だよ。");
    else if(tutorialState.phase==="battle-event")tutorialOverlay("EVENT画面","戦闘中の重要な情報や、大技の予告がここに表示されるよ。");
    else if(tutorialState.phase==="battle-event-warning")tutorialOverlay("赤い警告表示について","赤い警告は、敵が次の行動で強力な攻撃や特殊行動を行う合図です。表示されたら敵の属性や攻撃範囲を確認し、防御・回復・ユニオンスキルなどで備えましょう。警告はイベント欄に追加されるので、見逃さないようにしてください。");else if(tutorialState.phase==="battle-party"){tutorialOverlay("プレイヤー枠","HPは体力、SPを消費してスキルを発動するよ。");tutorialHighlight("#battle-party");}
    else if(tutorialState.phase==="battle-command-ui")tutorialOverlay("コマンド欄について","ここから攻撃・SPスキル・防御・道具を選びます。今はまだ操作せず、次に右側の説明欄を確認しよう。");
    else if(tutorialState.phase==="battle-info-ui")tutorialOverlay("コマンド説明欄について","ここには選択中の攻撃やスキルの効果、消費SPなどが表示されます。内容を確認してから行動を決めよう。");
    else if(tutorialState.phase==="battle-command")tutorialOverlay("通常攻撃を試そう","まずは全員でスライムに【攻撃】をしてみよう。緑に光っている攻撃コマンドを押してね。");else if(tutorialState.phase==="battle-sp"||tutorialState.phase==="battle-sp-command")tutorialOverlay("SP攻撃を使おう","SPスキルを選択して説明を確認し、使ってみよう。");else if(tutorialState.phase==="battle-guard"||tutorialState.phase==="battle-guard-command")tutorialOverlay("防御しよう","全員で防御して強力な攻撃に備えよう。");else if(tutorialState.phase==="battle-union"||tutorialState.phase==="battle-union-command")tutorialOverlay("ユニオンスキルを使おう","コタマのユニオンスキルを発動しよう。");
    return;
  }
  if(tutorialState.phase==="shop-nav"){showScreen("formation");tutorialOverlay("SHOPへ移動しよう","装備できたね！装備品はSHOPで購入できるよ。画面上部のショップを押して移動しよう。");tutorialHighlight('.main-nav [data-screen="shop"]');return;}
  if(tutorialState.phase==="formation-intro"){showScreen("home");tutorialOverlay("拠点に戻ってきた！","編成タブを開いて、仲間の編成を確認しよう。");tutorialHighlight('.main-nav [data-screen="formation"]');return;}
  if(tutorialState.phase.startsWith("formation")||tutorialState.phase==="equipment-intro"||tutorialState.phase==="equipment-grant"||tutorialState.phase==="equip-hero-sword"){
    showScreen("formation");
    const messages={"formation-intro":["拠点に戻ってきた！","編成を確認しよう。仲間は最大4人まで編成できるよ。"],"formation-remove":["治癒士を外そう","編成中の治癒士の『編成から外す』を押してみよう。"],"formation-add":["治癒士を編成に戻そう","仲間候補から治癒士を選んで、再び編成に加えよう。"],"equipment-intro":["装備を確認しよう","各キャラクターの装備欄から武器・防具・アクセサリを管理できるよ。"],"equipment-grant":["勇者の剣を入手！","勇者の剣を1本受け取ったよ。コタマの武器欄から装備してみよう。"],"equip-hero-sword":["勇者の剣を装備しよう","コタマの武器欄から勇者の剣を装備してみよう。"]};
    const m=messages[tutorialState.phase]||messages["formation-intro"];tutorialOverlay(m[0],m[1]);return;
  }
  if(tutorialState.phase==="shop-accessory"){showScreen("formation");tutorialOverlay("アクセサリについて","アクセサリは2種類装備できるよ。次は回復薬を購入しよう。");tutorialHighlight('#selected-party select[data-equip^="accessory"]');return;}
  if(tutorialState.phase.startsWith("shop")){
    showScreen("shop");shopBuyerId="kotama";currentCategory=tutorialState.phase==="shop-potion"?"other":"armor";renderShop();
    const m=tutorialState.phase==="shop-potion"?["回復薬を購入しよう","その他カテゴリから回復薬を1個購入しよう。"]:tutorialState.phase==="shop-accessory"?["アクセサリについて","アクセサリは2種類装備できるよ。次は回復薬を購入しよう。"]:["革の鎧を購入しよう","防具は防御力を高める装備だよ。革の鎧をコタマに購入して装備しよう。"];
    tutorialOverlay(m[0],m[1]);return;
  }
}
function tutorialAfterRetreat(){
  battleState.tutorialMode=false;tutorialState.phase="formation-intro";tutorialState.battlePhase="done";tutorialSave();
  showScreen("home");tutorialOverlay("拠点に戻ってきた！","次は編成タブを開いて、仲間の編成を確認しよう。");tutorialHighlight('.main-nav [data-screen="formation"]');tutorialSave();
}
function tutorialFinish(){tutorialState.completed=true;tutorialState.started=false;tutorialState.phase="complete";battleState.tutorialMode=false;tutorialClose();tutorialSave();try{localStorage.setItem("fantasyRpgSave",JSON.stringify(createSaveData()));}catch(e){}showScreen("home");if($("start-button"))$("start-button").textContent="START";tutorialOverlay("チュートリアル完了！","編成・装備・買い物の準備ができたよ。これでチュートリアルは終了。STARTを押して、冒険に出発しよう！");tutorialHighlight("#start-button");}
function showScreen(name){const el=$(name);if(!el||!el.classList.contains("screen"))return;if(tutorialState.phase==="complete"&&name!=="home"&&$("tutorial-overlay")&&!$("tutorial-overlay").hidden)tutorialClose();if(name==="home")retryContext=null;document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s===el));if(name!=="settings")stopPreview(false);state.screen=name;document.body.dataset.screen=name;if($("list-menu"))$("list-menu").hidden=true;$("list-button")?.setAttribute("aria-expanded","false");updateListMenuForScreen();if($("bgm-toggle")?.checked)startBgm();else stopBgm();document.querySelectorAll(".main-nav [data-screen]").forEach(b=>b.toggleAttribute("aria-current",b.dataset.screen===name));renderAll();window.scrollTo({top:0,behavior:"auto"});}
function getCharacterImage(c){if(c.id==="samurai")return `<span class="image-fallback samurai-emblem" role="img" aria-label="武士の仮アイコン">武</span>`;return c.image?`<img src="${esc(c.image)}" alt="${esc(c.name)}" onerror="this.style.display='none';if(!this.parentElement.querySelector('.image-fallback')){const f=document.createElement('span');f.className='image-fallback';f.textContent='画像未配置';this.parentElement.appendChild(f)}">`:`<span class="image-fallback">画像準備中</span>`;}
function renderGold(){if($("gold"))$("gold").textContent=state.gold;}
function renderHome(){const box=$("home-party");if(!box)return;box.innerHTML=getParty().map(c=>`<article class="character-card home-character"><div class="character-art">${getCharacterImage(c)}</div><h3>${esc(c.name)}</h3><p>HP ${effectiveStats(c).maxHp}　SP ${c.maxSp}</p><p>武器：${esc(getEquippedName(c,"weapon"))}</p><p>防具：${esc(getEquippedName(c,"armor"))}</p></article>`).join("");}
function renderAchievements(){const box=$("achievement-list");if(!box)return;const unlocked=achievementDefinitions.filter(a=>achievementUnlocked[a.id]).length;const progress=$("achievement-progress");if(progress)progress.textContent=`${unlocked} / ${achievementDefinitions.length} 達成`;
 box.innerHTML=achievementDefinitions.map(a=>`<article class="achievement-card ${achievementUnlocked[a.id]?"unlocked":"locked"}"><div><strong>${esc(a.name)}</strong><p>${esc(a.description)}</p></div><span>${achievementUnlocked[a.id]?"達成済み":`報酬 ${a.reward}G`}</span></article>`).join("");
}
function unlockAchievement(id){const def=achievementDefinitions.find(a=>a.id===id);if(!def||achievementUnlocked[id])return false;achievementUnlocked[id]=true;state.gold+=def.reward;pushLog(`実績達成：「${def.name}」！ ${def.reward}G獲得。`);showPurchasePopup(`実績達成：${def.name}（${def.reward}G獲得）`);renderGold();renderAchievements();return true;}
function updateJobVictoryRoster(){for(const id of state.party.filter(Boolean))if(!jobVictoryRoster.includes(id))jobVictoryRoster.push(id);if(characters.every(c=>jobVictoryRoster.includes(c.id)))unlockAchievement("all_jobs");}
function battleRankFor(turns,kos){if(kos===0&&turns<=5)return "S";if(kos===0&&turns<=8)return "A";if(turns<=12)return "B";return "C";}
// ランク報酬：ステージが進むほど上限が上がる（STAGE1は最大10G、以降10Gずつ増え最大50G）。
function rankReward(rank,stage=battleState.stage){const cap=battleState.hiddenBossMode?50:Math.min(50,10*Math.max(1,Number(stage)||1));return Math.round(cap*({S:1,A:.8,B:.5,C:.2})[rank]||0);}
function recordBattleRank(){const turns=Math.max(1,battleState.turnCount+1),rank=battleRankFor(turns,battleState.koCount||0),key=battleState.hiddenBossMode?"hidden-boss":`stage-${battleState.stage}`,previous=bestRanks[key]||null,score={S:4,A:3,B:2,C:1};let bonus=0;
 if(!previous){bestRanks[key]=rank;bonus=rankReward(rank);}else if(score[rank]>score[previous]){bonus=Math.max(0,rankReward(rank)-rankReward(previous));bestRanks[key]=rank;}
 if(bonus>0)state.gold+=bonus;
 battleState.rankResult={rank,turns,kos:battleState.koCount||0,bonus,previous};
 return battleState.rankResult;
}
function awardVictoryAchievements(enemy,turns,kos){
 unlockAchievement("first_win");
 if(totalEnemyDefeats>=10)unlockAchievement("defeat_10");
 if(totalEnemyDefeats>=50)unlockAchievement("defeat_50");
 if(enemy?.name==="ドラゴン")unlockAchievement("dragon_slayer");
 if(enemy?.name==="魔王")unlockAchievement("maou_slayer");
 if(kos===0)unlockAchievement("perfect_victory");
 if(turns<=3)unlockAchievement("lightning");
 if(compendiumNames().slice(0,5).filter(n=>compendium[n]?.defeated).length>=4)unlockAchievement("compendium_80");
 if(enemy?.name==="混沌の幻影")unlockAchievement("hidden_boss");
 updateJobVictoryRoster();
}
function compendiumNames(){return ["スライム","ゴブリン","オオカミ","ドラゴン","魔王","混沌の幻影"];}
function compendiumCount(){return compendiumNames().filter(n=>compendium[n]?.defeated).length;}
function hiddenBossUnlocked(){return !!compendium["魔王"]?.defeated&&!!compendium["ドラゴン"]?.defeated&&compendiumNames().slice(0,5).filter(n=>compendium[n]?.defeated).length/5>=.8;}
function registerEncounter(name){if(compendium[name])compendium[name].encountered=true;}
function registerDefeat(name){if(compendium[name]){compendium[name].encountered=true;compendium[name].defeated=true;}renderCompendium();}
function renderCompendium(){
 const box=$("compendium-list");if(!box)return;
 const names=compendiumNames().slice(0,5);
 box.innerHTML=names.map((name,i)=>{const d=enemyData[i],r=compendium[name]||{},img=d?.image;return `<article class="compendium-card ${r.defeated?"unlocked":""}"><div class="compendium-art">${r.defeated&&img?`<img src="${esc(img)}" alt="${esc(name)}" onerror="this.remove()">`:`<span>${r.encountered?"影":"?"}</span>`}</div><h3>${r.encountered?esc(name):"？？？？"}</h3><p>${!r.encountered?"未遭遇":r.defeated?`HP ${d.hp} ／ ATK ${d.attack} ／ DEF ${d.defense}<br>属性：${esc(d.element)}<br>弱点：${esc((d.weaknesses||[]).join("・")||"なし")} ／ 耐性：${esc([...(d.resistances||[]),...(d.physicalResistances||[])].join("・")||"なし")}`:"シルエットと名前のみ登録"}</p><small>${r.defeated?"討伐済み":r.encountered?"未討伐":"未発見"}</small></article>`;}).join("");
 const hidden=compendium["混沌の幻影"]||{};box.insertAdjacentHTML("beforeend",`<article class="compendium-card ${hidden.defeated?"unlocked":""}"><div class="compendium-art"><span>${hidden.defeated?"✦":hidden.encountered?"影":"?"}</span></div><h3>${hidden.encountered?"混沌の幻影":"？？？？"}</h3><p>${!hidden.encountered?"未遭遇":hidden.defeated?"HP 4500 ／ ATK 100 ／ DEF 120<br>SP攻撃力 100 ／ SP防御力 60<br>属性：無属性 ／ 弱点：なし ／ 耐性：全属性":"シルエットと名前のみ登録"}</p><small>${hidden.defeated?"討伐済み":hidden.encountered?"未討伐":"未発見"}</small></article>`);
 const progress=$("compendium-progress");if(progress)progress.textContent=`${names.filter(n=>compendium[n]?.defeated).length} / 5 討伐`;
 const unlock=$("hidden-boss-unlock");if(unlock){unlock.innerHTML=hiddenBossUnlocked()?`<h3>隠しステージ解放！</h3><p>「混沌の幻影」への挑戦条件を達成しました。</p><button id="hidden-boss-start" class="primary-button">隠しボスに挑戦</button>`:'<h3>隠しステージ</h3><p>解放条件：魔王・ドラゴン討伐、通常モンスター図鑑80%以上</p>';$("hidden-boss-start")?.addEventListener("click",startHiddenBoss);}
}
function renderEventGallery(){const box=$("event-gallery");if(!box)return;box.innerHTML=stageEvents.filter(e=>{const st=e.hiddenBoss?6:(e.stage||({"forest-intro":1,"goblin-intro":2,"dragon-intro":4,"maou-intro":5}[e.id]));return st?!!stageEntered[st]:!!stageEntered[1];}).map(e=>`<article><strong>${esc(e.title)}</strong><p>${eventRead[e.id]?"閲覧済み":"未読"}</p><button class="secondary-button" data-event-open="${esc(e.id)}">読む</button></article>`).join("")||"<p>ステージに到達すると、ここに冒険の記録が追加されます。</p>";box.querySelectorAll("[data-event-open]").forEach(b=>b.addEventListener("click",()=>playEventById(b.dataset.eventOpen)));}
let activeEvent=null,activeEventPage=0,eventAfterAction=null,storyRun=0,storySkip=false,storyWake=null,storyBgmAudio=null,storyBgmFadeTimer=null;
// ストーリー演出：黒い暗転画面に白い文字が一文字ずつ現れ、ゆっくり消えていく。
// ボタンやタブは無い。画面をクリック（またはEnter/Space）すると演出を飛ばせる。
function stopStoryBgm(){if(storyBgmFadeTimer){clearInterval(storyBgmFadeTimer);storyBgmFadeTimer=null;}if(storyBgmAudio){storyBgmAudio.pause();try{storyBgmAudio.currentTime=0;}catch(e){}storyBgmAudio=null;}}
function startStoryBgm(){stopStoryBgm();if($("bgm-toggle")&&!$("bgm-toggle").checked)return;const tracks=["assets/music/ストーリー/古き剣.mp3","assets/music/ストーリー/沈黙の聖堂.mp3"];try{storyBgmAudio=new Audio(tracks[Math.floor(Math.random()*tracks.length)]);storyBgmAudio.loop=true;storyBgmAudio.volume=Math.min(1,.09*bgmVolume);storyBgmAudio.play().catch(()=>{});}catch(e){stopStoryBgm();}}
function storySleep(ms){return new Promise(resolve=>{if(storySkip){resolve();return;}const t=setTimeout(()=>{storyWake=null;resolve();},ms);storyWake=()=>{clearTimeout(t);storyWake=null;resolve();};});}
function openEvent(event,onDone){
  const modal=$("story-event");
  if(!modal){if(onDone)onDone();return;}
  if(activeEvent)closeStoryEvent(false);
  stopBgm();
  activeEvent=event;activeEventPage=0;eventAfterAction=onDone||null;storySkip=false;
  if(event.id==="maou-intro"){maouIntroBgmPersistent=!!(state.screen==="battle"&&battleState.stage===5&&stageIntroStoryPending);stopStoryBgm();startBgm();}else startStoryBgm();
  const run=++storyRun;
  modal.hidden=false;modal.classList.remove("story-visible");void modal.offsetWidth;modal.classList.add("story-visible");
  playStorySequence(event,run);
}
async function playStorySequence(event,run){
  const text=$("story-event-text");if(!text)return;
  text.classList.remove("story-text-fade");text.textContent="";
  await storySleep(900);
  for(const page of event.pages){
    if(run!==storyRun||storySkip)break;
    text.classList.remove("story-text-fade");text.textContent="";void text.offsetWidth;
    for(let i=1;i<=page.length;i++){
      if(run!==storyRun||storySkip)break;
      text.textContent=page.slice(0,i);
      await storySleep(85);
    }
    if(run!==storyRun||storySkip)break;
    await storySleep(1400);
    if(run!==storyRun||storySkip)break;
    text.classList.add("story-text-fade");
    await storySleep(1800);
  }
  if(run!==storyRun)return;
  const modal=$("story-event");
  modal?.classList.remove("story-visible");
  await storySleep(storySkip?0:700);
  if(run!==storyRun)return;
  closeStoryEvent(true);
}
function closeStoryEvent(markRead=true){
  if(!activeEvent)return;
  if(storyBgmFadeTimer){clearInterval(storyBgmFadeTimer);storyBgmFadeTimer=null;}
  const closingStoryAudio=storyBgmAudio;storyBgmAudio=null;
  storyRun++;storySkip=false;if(storyWake)storyWake();
  const id=activeEvent.id;if(markRead)eventRead[id]=true;activeEvent=null;
  const modal=$("story-event");if(modal){modal.hidden=true;modal.classList.remove("story-visible");}
  const text=$("story-event-text");if(text){text.textContent="";text.classList.remove("story-text-fade");}
  renderEventGallery();
  const finish=()=>{if(closingStoryAudio){closingStoryAudio.pause();try{closingStoryAudio.currentTime=0;}catch(e){}}const cb=eventAfterAction;eventAfterAction=null;if(cb)cb();if($("bgm-toggle")?.checked)startBgm();};
  if(closingStoryAudio){const initial=closingStoryAudio.volume,started=performance.now(),duration=850;const fade=setInterval(()=>{const t=Math.min(1,(performance.now()-started)/duration);closingStoryAudio.volume=initial*(1-t);if(t>=1){clearInterval(fade);finish();}},50);}else finish();
}
function playEventById(id){const ev=stageEvents.find(e=>e.id===id);if(ev)openEvent(ev);}
function playStageEvent(stage,done){const ids={1:"forest-intro",2:"goblin-intro",4:"dragon-intro",5:"maou-intro"};const ev=stageEvents.find(e=>e.id===ids[stage]&&!e.trigger);if(ev&&!eventRead[ev.id])openEvent(ev,done);else if(done)done();}
function playStageClearEvent(stage,hiddenBoss,done){const ev=stageEvents.find(e=>e.trigger==="clear"&&(hiddenBoss?e.hiddenBoss===true:e.stage===stage));if(ev&&!eventRead[ev.id])openEvent(ev,done);else if(done)done();}
function setupStoryEvents(){
  const skip=()=>{if(!activeEvent)return;storySkip=true;if(storyWake)storyWake();};
  $("story-event")?.addEventListener("click",skip);
  document.addEventListener("keydown",e=>{if(activeEvent&&(e.key==="Enter"||e.key===" "||e.key==="Escape")){e.preventDefault();e.stopImmediatePropagation();skip();}},true);
}
function renderAll(){
  // 画面共通の再描画で一つのパネルが失敗しても、他画面の描画まで巻き込まない。
  const jobs=[renderHome,renderGold,renderFormation,renderShop,renderProgressionPanel,renderClearSummary,renderCompendium,renderEventGallery,renderAchievements];
  for(const job of jobs){try{job();}catch(error){console.error(`[Render] ${job.name} failed:`,error);if(job===renderProgressionPanel){const box=$("progression-panel");if(box)box.innerHTML='<p class="empty-note">強化・育成データの表示中にエラーが発生しました。画面を再読み込みしてください。</p>';}}}
}
function renderClearSummary(){const summary=$("clear-gold-summary");if(!summary)return;const reward=Number(battleState.lastRewardGold)||0;summary.textContent=`魔王討伐報酬：${reward}G ／ 現在の所持金：${state.gold}G`; }
function formationBaseStats(c){
  const g=growth[c.id]?.spent||{},bonus=BATTLE_RULES.classBonuses[c.id]||{},items=uniqueEquippedItems(c);
  const rate=k=>items.reduce((n,i)=>n+(Number(i[k])||0),0);
  const stat=(key,raw)=>Math.floor(raw*(Number(bonus[key])||1));
  const base={
    maxHp:stat("maxHp",c.maxHp+(g.maxHp||0)*10),
    attack:stat("attack",c.attack+(g.attack||0)*2),
    spAttack:stat("spAttack",c.spAttack+(g.spAttack||0)*2),
    defense:stat("defense",Math.max(0,c.defense+(g.defense||0)*2-(c._defenseDownTurns>0?(c._defenseDown||0):0))),
    spDefense:stat("spDefense",(Number.isFinite(c.spDefense)?c.spDefense:Math.floor(c.defense/2))+(g.spDefense||0)*2),
    maxSp:c.maxSp+(g.maxSp||0)*5
  };
  return base;
}
function renderFormation(){const selected=$("selected-party"),roster=$("character-roster"),count=$("party-count");if(!selected||!roster)return;if(count)count.textContent=`${state.party.filter(Boolean).length} / ${PARTY_LIMIT}`;
  selected.innerHTML=Array.from({length:PARTY_LIMIT},(_,index)=>{const id=state.party[index],c=getCharacter(id);if(!c)return `<article class="character-card selected-character empty-party-slot"><h3>空き枠 ${index+1}</h3><p>下の仲間候補から配置できます。</p><button class="secondary-button" data-select-slot="${index}">この枠に配置</button></article>`;const s=effectiveStats(c),base=formationBaseStats(c),bonus={maxHp:s.maxHp-base.maxHp,attack:s.attack-base.attack,spAttack:s.spAttack-base.spAttack,defense:s.defense-base.defense,spDefense:s.spDefense-base.spDefense,maxSp:s.maxSp-base.maxSp};return `<article class="character-card selected-character"><div class="character-art">${getCharacterImage(c)}</div><h3>${esc(c.name)}</h3><div class="character-stats"><span>HP ${base.maxHp}${bonus.maxHp?` <b class="stat-bonus">+${bonus.maxHp}</b>`:""}</span><span>攻撃 ${base.attack}${bonus.attack?` <b class="stat-bonus">+${bonus.attack}</b>`:""}</span><span>SP攻撃 ${base.spAttack}${bonus.spAttack?` <b class="stat-bonus">+${bonus.spAttack}</b>`:""}</span><span>防御 ${base.defense}${bonus.defense?` <b class="stat-bonus">+${bonus.defense}</b>`:""}</span><span>SP防御 ${base.spDefense}${bonus.spDefense?` <b class="stat-bonus">+${bonus.spDefense}</b>`:""}</span><span>最大SP ${base.maxSp}${bonus.maxSp?` <b class="stat-bonus">+${bonus.maxSp}</b>`:""}</span></div>${equipmentSlots(c).map(([slot,label])=>`<label class="equip-row">${label}<select data-equip="${slot}" data-character="${c.id}">${equipmentOptions(slot,c.id)}</select></label>`).join("")}<button class="secondary-button" data-remove-character="${c.id}">編成から外す</button></article>`;}).join("");
  roster.innerHTML=characters.map(c=>{const chosen=state.party.includes(c.id),full=state.party.filter(Boolean).length>=PARTY_LIMIT;return `<article class="character-card selectable ${chosen?"selected":""}"><div class="character-art">${getCharacterImage(c)}</div><h3>${esc(c.name)}</h3><div class="character-stats"><span>HP ${effectiveStats(c).maxHp}</span><span>攻撃 ${effectiveStats(c).attack}</span><span>防御 ${effectiveStats(c).defense}</span></div><button class="${chosen?"secondary-button":"primary-button"}" data-toggle-character="${c.id}" ${!chosen&&full?"disabled":""}>${chosen?"選択中":"編成に加える"}</button></article>`;}).join("");
  selected.querySelectorAll("[data-remove-character]").forEach(b=>b.onclick=()=>removeCharacter(b.dataset.removeCharacter));selected.querySelectorAll("[data-select-slot]").forEach(b=>b.onclick=()=>{formationTargetSlot=Number(b.dataset.selectSlot);setSystemMessage(`空き枠${formationTargetSlot+1}を選択しました。仲間候補を選んでください。`);});roster.querySelectorAll("[data-toggle-character]").forEach(b=>b.onclick=()=>toggleCharacter(b.dataset.toggleCharacter));selected.querySelectorAll("[data-equip]").forEach(sel=>sel.onchange=()=>equipItem(sel.dataset.character,sel.dataset.equip,sel.value));}
function equipmentSlots(c){return c.id==="samurai"?[["katana1","武器1"],["katana2","武器2"],["armor","防具"],["accessory1","装飾品1"],["accessory2","装飾品2"]]:[["weapon","武器"],["armor","防具"],["accessory1","装飾品1"],["accessory2","装飾品2"]];}
function equipmentOptions(slot,charId){const current=equipment[charId][slot]||"";const cat=(slot==="armor"?"armor":slot.startsWith("accessory")?"accessory":"weapon");const owned=shopItems.filter(i=>i.category===cat&&(inventory[i.id]>0||equipment[charId]?.[slot]===i.id)&&((slot.startsWith("katana")?i.slot==="katana":!i.slot)));return `<option value="" ${!current?"selected":""}>なし</option>`+owned.map(i=>`<option value="${i.id}" ${current===i.id?"selected":""}>${esc(i.name)}</option>`).join("");}
function equipItem(charId,slot,newId){const c=getCharacter(charId);if(!c||!equipment[c.id]||!(slot in equipment[c.id]))return;const item=itemById(newId);if(newId&&(!item||!(inventory[newId]>0))){setSystemMessage("所持していない装備です。");sound("error");renderFormation();return;}if(newId&&!(item.classes||[]).includes(charId)&&!window.confirm(`${item.name}は${c.name}の適性装備ではありません。装備するとSPスキルとユニオンスキルが使用できなくなります。装備しますか？`)){renderFormation();return;}const old=equipment[charId][slot];if(old===newId)return;if(old)inventory[old]=(inventory[old]||0)+1;if(newId){inventory[newId]--;if(inventory[newId]<=0)delete inventory[newId];}equipment[charId][slot]=newId||null;renderAll();sound("select");if(tutorialState.started&&!tutorialState.completed&&tutorialState.phase==="equip-hero-sword"&&charId==="kotama"&&slot==="weapon"&&equipment.kotama?.weapon==="hero-sword"){tutorialState.heroSwordEquipped=true;tutorialState.phase="shop-nav";tutorialOverlay("SHOPへ移動しよう","装備できたね！装備品はSHOPで購入できるよ。画面上部のショップを押して移動しよう。");tutorialHighlight('.main-nav [data-screen="shop"]');tutorialSave();}
  // 勇者の剣を装備するまでは、武器欄の発光を保つ（再描画で対象が作り直されるため付け直す）。
  else if(tutorialState.started&&!tutorialState.completed&&tutorialState.phase==="equip-hero-sword")tutorialHighlight('#selected-party select[data-character="kotama"][data-equip="weapon"]');}
function toggleCharacter(id){if(state.party.includes(id)){removeCharacter(id);return;}const used=state.party.filter(Boolean).length;if(used>=PARTY_LIMIT){sound("error");return;}let slot=Number.isInteger(formationTargetSlot)?formationTargetSlot:state.party.findIndex(x=>!x);if(slot<0||slot>=PARTY_LIMIT||state.party[slot])slot=state.party.findIndex(x=>!x);if(slot<0)slot=used;state.party[slot]=id;formationTargetSlot=state.party.findIndex(x=>!x);if(formationTargetSlot<0)formationTargetSlot=0;renderAll();sound("select");if(tutorialState.started&&!tutorialState.completed&&tutorialState.phase==="formation-add"&&id==="healer"&&state.party.includes("healer")){tutorialState.healerReadded=true;tutorialState.phase="equipment-intro";tutorialOverlay("装備を確認しよう","キャラクターごとに武器・防具・アクセサリを管理できるよ。");tutorialHighlight("#selected-party");tutorialSave();}}
function removeCharacter(id){const slot=state.party.indexOf(id);if(slot>=0)delete state.party[slot];formationTargetSlot=slot>=0?slot:state.party.findIndex(x=>!x);renderAll();sound("back");if(tutorialState.started&&!tutorialState.completed&&tutorialState.phase==="formation-remove"&&id==="healer"){tutorialState.healerRemoved=true;tutorialState.phase="formation-add";tutorialOverlay("治癒士を編成に戻そう","仲間候補から治癒士を選び、もう一度編成に加えてみよう。");tutorialHighlight('#character-roster [data-toggle-character="healer"]');tutorialSave();}}
function shopDisplayCategory(item){
  if(item.category==="accessory")return "accessory";
  if(item.category==="healing")return "other";
  if(item.category==="armor")return item.icon==="SHIELD"?"shield":"armor";
  if(item.category==="weapon"){
    if(item.icon==="STAFF")return "staff";
    if(item.icon==="KNUCKLE")return "knuckle";
    return "weapon";
  }
  return "other";
}
function renderShop(){
  const box=$("shop-items");if(!box)return;
  const buyer=getCharacter(shopBuyerId)||characters[0];
  const categoryNames={weapon:"武器",armor:"防具",shield:"盾",staff:"杖",knuckle:"ナックル",accessory:"アクセサリ",other:"その他"};
  const availableCategories=[...new Set(shopItems.filter(i=>!i.craftedOnly).map(shopDisplayCategory))];
  const orderedCategories=["weapon","armor","shield","staff","knuckle","accessory","other"].filter(c=>availableCategories.includes(c));
  if(!orderedCategories.includes(currentCategory))currentCategory=orderedCategories[0]||"weapon";
  const tabs=$("shop-category-tabs");
  if(tabs)tabs.innerHTML=orderedCategories.map(c=>`<button data-category="${c}" class="${currentCategory===c?"active":""}">${categoryNames[c]}</button>`).join("");
  const buyerBox=$("shop-buyer");
  const before=effectiveStats(buyer);
  const jobNames={kotama:"冒険者",knight:"騎士",healer:"治癒士",warrior:"戦士",mage:"魔術師",samurai:"武士"};
  if(buyerBox)buyerBox.innerHTML=`<div class="shop-buyer-head"><button type="button" data-buyer-prev aria-label="前の仲間">◀</button><div class="shop-buyer-portrait">${getCharacterImage(buyer)}</div><div class="shop-buyer-info"><strong>${esc(buyer.name)}</strong><div class="shop-buyer-job">職業：${jobNames[buyer.id]||buyer.name}</div><div class="shop-buyer-stats">HP ${before.maxHp}／攻撃 ${before.attack}／SP攻撃 ${before.spAttack}／防御 ${before.defense}／SP防御 ${before.spDefense}</div></div><button type="button" data-buyer-next aria-label="次の仲間">▶</button></div>`;
  const items=shopItems.filter(i=>!i.craftedOnly&&(!i.tutorialOnly||tutorialState.started&&!tutorialState.completed)&&shopDisplayCategory(i)===currentCategory&&(i.category==="healing"||(i.classes||[]).includes(buyer.id)));
  box.innerHTML=items.map(i=>{
    const locked=(i.unlock||1)>(state.maxUnlockedStage||1),owned=inventory[i.id]||0,canUse=(i.classes||[]).includes(buyer.id)||i.category==="healing";
    const slot=getShopItemSlot(i,buyer.id);
    const preview=slot?previewEquipmentStats(buyer,i,slot):null;
    const previewText=preview?renderShopStatPreview(before,preview):"";
    return `<article class="shop-item ${locked?"shop-locked":""}"><div class="item-icon">${i.icon}</div><h3>${esc(i.name)}</h3><p>${esc(i.description)}</p><p>${esc(i.effect)}</p><p>所持数：${owned}</p>${Object.values(equipment[buyer.id]||{}).includes(i.id)?`<p class="currently-equipped">現在装備中</p>`:""}${previewText}<p class="price">${i.price} GOLD</p>${locked?`<p class="shop-lock-note">STAGE ${i.unlock} クリア後に解放</p>`:i.category==="healing"?`<button class="primary-button" data-buy-item="${i.id}" data-buy-mode="store" ${state.gold<i.price?"disabled":""}>購入する</button>`:slot?`<div class="shop-buy-choices"><button class="primary-button" data-buy-item="${i.id}" data-buy-mode="equip" ${state.gold<i.price||!canUse?"disabled":""}>購入して装備</button><button class="secondary-button" data-buy-item="${i.id}" data-buy-mode="store" ${state.gold<i.price?"disabled":""}>購入して保管</button></div>`:`<button class="primary-button" data-buy-item="${i.id}" data-buy-mode="store" ${state.gold<i.price?"disabled":""}>購入して保管</button>`}</article>`;
  }).join("")||'<p class="empty-note">この職業に対応する商品はありません。</p>';
  box.querySelectorAll("[data-buy-item]").forEach(b=>b.onclick=()=>buyItem(b.dataset.buyItem,b.dataset.buyMode||"store"));
  tabs?.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{currentCategory=b.dataset.category;renderShop();sound("select");});
  buyerBox?.querySelector("[data-buyer-prev]")?.addEventListener("click",()=>{shopBuyerId=characters[(characters.findIndex(c=>c.id===shopBuyerId)+characters.length-1)%characters.length].id;renderShop();});
  buyerBox?.querySelector("[data-buyer-next]")?.addEventListener("click",()=>{shopBuyerId=characters[(characters.findIndex(c=>c.id===shopBuyerId)+1)%characters.length].id;renderShop();});
}
const skillTreeDefinitions={
 kotama:{passive:{id:"kotama-mastery",name:"剣マスタリー",desc:"レベルごとに攻撃力が2%上昇する。",effect:"stats",stat:"attack"},a:{id:"kotama-shock-spark",name:"ショックスパーク",desc:"敵全体に雷属性のSP攻撃。レベルに応じて威力が上昇する。",effect:"none"},b:{id:"kotama-shock-bolt",name:"ショックボルト",desc:"敵単体に雷属性のSP攻撃。低SP消費で扱いやすい。",effect:"none"},derived:{id:"kotama-burst-blade",name:"バーストブレイド",desc:"ショックスパークとショックボルトを習得すると解放。敵単体に威力400%の強力な一撃。",effect:"none"}},
 knight:{passive:{id:"knight-mastery",name:"盾マスタリー",desc:"レベルごとに防御力が2%上昇する。",effect:"stats",stat:"defense"},a:{id:"knight-defense-camp",name:"防衛陣地",desc:"3ターンの間、味方全体の防御力を上昇させる。",effect:"none"},b:{id:"knight-magic-guard",name:"マジックガード",desc:"使用ターン、味方全体が受ける魔法ダメージを軽減する。",effect:"none"},derived:{id:"knight-full-guard",name:"フルガード",desc:"使用ターン、味方への攻撃を騎士が引き受け、自身も防御状態になる。5ターンの再使用待機。",effect:"none"}},
 healer:{passive:{id:"healer-mastery",name:"回復マスタリー",desc:"レベルごとに回復量が3%上昇する。",effect:"heal"},a:{id:"healer-line-heal",name:"ラインヒール",desc:"横列の味方3人を自動的に回復する。",effect:"none"},b:{id:"healer-refresh",name:"リフレッシュ",desc:"味方の状態異常を解除する。Lv.5で全体化し、Lv.6以降は消費SPが減少する。",effect:"none"},derived:{id:"healer-holy-light",name:"聖なる光",desc:"敵全体に聖属性のSP攻撃。敵ごとの聖属性相性に応じて威力が変化する。",effect:"none"}},
 mage:{passive:{id:"mage-mastery",name:"術マスタリー",desc:"レベルごとにSP攻撃力が2%上昇する。",effect:"stats",stat:"mage"},a:{id:"mage-flare",name:"フレア",desc:"敵単体に強力な炎属性SP攻撃。",effect:"none"},b:{id:"mage-magic-bomb",name:"マジックボム",desc:"敵単体に魔法耐性の影響を受けない無属性SP攻撃。",effect:"none"},derived:{id:"mage-compression",name:"術式圧縮",desc:"次に実行する攻撃の攻撃回数を2倍にする。重ねがけ可能。",effect:"none"}},
 warrior:{passive:{id:"warrior-passive",name:"猛攻の基礎",desc:"最大HP・攻撃力・防御力を高める。",effect:"stats",stat:"warrior"},a:{id:"warrior-branch-a",name:"闘志の連鎖",desc:"SP攻撃を強化し、SPスキル「旋風斬り」を習得する。",effect:"sp"},b:{id:"warrior-branch-b",name:"破砕の一撃",desc:"ブレイク値を追加で蓄積し、SPスキル「連撃」を習得する。",effect:"break",effects:["sp"]},derived:{id:"warrior-derived",name:"戦場の覇気",desc:"派生SPスキル「剛覇斬」を習得する。",effect:"sp"}},
 samurai:{passive:{id:"samurai-passive",name:"剣技の基礎",desc:"攻撃力・最大HP・防御力を高める。",effect:"stats",stat:"samurai"},a:{id:"samurai-branch-a",name:"流水の太刀",desc:"通常攻撃を強化し、SPスキル「居合」を習得する。",effect:"normal"},b:{id:"samurai-branch-b",name:"鋭刃",desc:"SP攻撃の威力を高め、SPスキル「斬鉄」を習得する。",effect:"sp",effects:["normal"]},derived:{id:"samurai-derived",name:"一刀両断の極意",desc:"派生SPスキル「秘剣・無双」を習得する。",effect:"sp"}}
};
const legacyEffectMap={kotama:[["element","sp","union"]],knight:[["guard","taunt","guard"]],healer:[["heal","revive","unionHeal"]],warrior:[["normal","sp","break"]],mage:[["sp","element","union"]],samurai:[["normal","normal","union"]]};
const legacySkillMap={kotama:["kotama-arc","kotama-overload","kotama-finish"],knight:["knight-wall","knight-taunt","knight-aegis"],healer:["healer-care","healer-revive","healer-union"],warrior:["warrior-power","warrior-charge","warrior-break"],mage:["mage-focus","mage-element","mage-meteor"],samurai:["samurai-edge","samurai-flow","samurai-iaido"]};
const skillTreeExtraSkills={
 kotama:{node:"kotama-shock-spark",skill:{id:"kotama-shock-spark-skill",name:"ショックスパーク",cost:25,target:"allEnemies",type:"level-lightning-all",element:"雷"}},
 knight:{node:"knight-defense-camp",skill:{id:"knight-defense-camp-skill",name:"防衛陣地",cost:7,target:"self",type:"defense-camp"}},
 healer:{node:"healer-line-heal",skill:{id:"healer-line-heal-skill",name:"ラインヒール",cost:20,target:"self",type:"line-heal"}},
 mage:{node:"mage-flare",skill:{id:"mage-flare-skill",name:"フレア",cost:15,target:"enemy",type:"level-flare",element:"炎"}},
 warrior:{node:"warrior-branch-a",skill:{id:"warrior-whirlwind",name:"旋風斬り",cost:25,target:"enemy",type:"multiSlash"}},
 samurai:{node:"samurai-branch-a",skill:{id:"samurai-iaido",name:"居合",cost:30,target:"enemy",type:"pierce"}}
};
const skillTreeBranchBSkills={
 kotama:{id:"kotama-shock-bolt-skill",name:"ショックボルト",cost:8,target:"enemy",type:"level-lightning-single",element:"雷"},
 knight:{id:"knight-magic-guard-skill",name:"マジックガード",cost:3,target:"self",type:"magic-guard"},
 healer:{id:"healer-refresh-skill",name:"リフレッシュ",cost:5,target:"self",type:"refresh"},
 mage:{id:"mage-magic-bomb-skill",name:"マジックボム",cost:10,target:"enemy",type:"level-magic-bomb"},
 warrior:{id:"warrior-double-strike",name:"連撃",cost:20,target:"enemy",type:"multiSlash"},
 samurai:{id:"samurai-sever",name:"斬鉄",cost:25,target:"enemy",type:"pierce"}
};
const skillTreeDerivedSkills={
 kotama:{id:"kotama-burst-blade-skill",name:"バーストブレイド",cost:40,target:"enemy",type:"burst-blade"},
 knight:{id:"knight-full-guard-skill",name:"フルガード",cost:30,target:"self",type:"full-guard"},
 healer:{id:"healer-holy-light-skill",name:"聖なる光",cost:15,target:"allEnemies",type:"holy-light",element:"聖"},
 mage:{id:"mage-compression-skill",name:"術式圧縮",cost:10,target:"self",type:"compression"},
 warrior:{id:"warrior-overdrive",name:"剛覇斬",cost:40,hpCost:25,target:"enemy",type:"charge"},
 samurai:{id:"samurai-mugen",name:"秘剣・無双",cost:50,target:"enemy",type:"multiSlash"}
};
const skillLevels={};characters.forEach(c=>skillLevels[c.id]={});
const legacyTreeBonuses={};characters.forEach(c=>legacyTreeBonuses[c.id]={});
function treeNodes(charId){const t=skillTreeDefinitions[charId];return t?[t.passive,t.a,t.b,t.derived]:[];}
function getTreeLevel(charId,nodeId){return Math.max(0,Math.min(["kotama","knight","healer","mage"].includes(charId)?10:5,Math.floor(Number(skillLevels[charId]?.[nodeId])||0)));}
function setTreeLevel(charId,nodeId,level){if(!skillLevels[charId])skillLevels[charId]={};skillLevels[charId][nodeId]=Math.max(0,Math.min(["kotama","knight","healer","mage"].includes(charId)?10:5,Math.floor(level)));}
function hasTreeSkill(charId,id){const node=treeNodes(charId).find(n=>n.id===id);if(node)return getTreeLevel(charId,id)>0;return (unlockedSkills[charId]||[]).includes(id);}
function treeBonus(charId,effect){return treeNodes(charId).filter(n=>n.effect===effect||(n.effects||[]).includes(effect)).reduce((v,n)=>v+getTreeLevel(charId,n.id)*.03,0)+(legacyTreeBonuses[charId]?.[effect]||0);}
const newTreeCharacterIds=["kotama","knight","healer","mage"];
function getCharacterSkills(c){
 if(!c)return [];
 const tree=skillTreeDefinitions[c.id],extra=skillTreeExtraSkills[c.id],branchB=skillTreeBranchBSkills[c.id],derived=skillTreeDerivedSkills[c.id];
 const skills=[...c.spSkills];
 if(extra&&getTreeLevel(c.id,extra.node)>0)skills.push({...extra.skill,treeLevel:getTreeLevel(c.id,extra.node)});
 if(branchB&&getTreeLevel(c.id,tree.b.id)>0){const lv=getTreeLevel(c.id,tree.b.id);skills.push({...branchB,treeLevel:lv,target:c.id==="healer"&&lv<5?"ally":branchB.target,cost:c.id==="healer"&&lv>=6?Math.max(1,10-lv):branchB.cost});}
 if(derived&&getTreeLevel(c.id,tree.derived.id)>0)skills.push({...derived,treeLevel:getTreeLevel(c.id,tree.derived.id),disabled:c.id==="knight"&&derived.type==="full-guard"&&(battleState.knightFullGuardCooldown||0)>0});
 return skills;
}
function treeStatBonus(charId){const node=skillTreeDefinitions[charId]?.passive;return node&&getTreeLevel(charId,node.id)>0?getTreeLevel(charId,node.id)*.02:0;}
function renderProgressionPanelUnsafe(){
 const box=$("progression-panel");if(!box)return;
 const c=getCharacter(shopBuyerId)||characters[0],stats=effectiveStats(c),tree=skillTreeDefinitions[c.id],points=trainingPoints[c.id]||0;
 const passive=tree.passive,a=tree.a,b=tree.b,derived=tree.derived;
 const isNewTree=newTreeCharacterIds.includes(c.id);
 const level=getTreeLevel(c.id,passive.id),la=getTreeLevel(c.id,a.id),lb=getTreeLevel(c.id,b.id),ld=getTreeLevel(c.id,derived.id);
 const selectedNode=treeNodes(c.id).find(n=>n.id===selectedTrainingSkill)||passive;
 const stageForLevel=n=>n===0?1:n<=2?2:n===3?3:n===4?4:5;
 const conditionFor=node=>{if(!isNewTree){if(node===passive)return "第1ステージ到達・キャラクターLv.1";if(node===a||node===b)return `基礎パッシブ取得後・第${stageForLevel(Math.max(getTreeLevel(c.id,node.id)+1,1))}ステージ到達・キャラクターLv.1以上`;return "2つの通常SPスキルが両方Lv.2以上・第4ステージ到達";}if(node===passive)return "第1ステージ到達";if(node===a||node===b)return "基礎マスタリーLv.1以上・第2ステージ到達";return "SP A・SP Bを両方習得（Lv.1以上）・第4ステージ到達";};
 const canUpgrade=node=>{const lv=getTreeLevel(c.id,node.id),max=isNewTree?10:(node===a||node===b?5:1);if(lv>=max)return false;if(node===passive)return !!stageEntered[1]&&points>=1;if(node===a||node===b)return (isNewTree?level>=1&&!!stageEntered[2]:level>=1&&!!stageEntered[stageForLevel(lv+1)])&&points>=1;return (isNewTree?la>=1&&lb>=1&&!!stageEntered[4]&&points>=1:la>=2&&lb>=2&&!!stageEntered[4]&&points>=2);};
 const stateLabel=node=>{const lv=getTreeLevel(c.id,node.id),max=isNewTree?10:(node===a||node===b?5:1);if(lv>=max)return "最大レベル";return canUpgrade(node)?(lv>0?"強化可能":"取得可能"):"条件未達成";};
 const nodeCard=(node,kind)=>{const lv=getTreeLevel(c.id,node.id),max=isNewTree?10:(kind==="branch"?5:1),available=canUpgrade(node),selected=selectedNode.id===node.id,linkedSkill=kind==="branch"?(node===a?skillTreeExtraSkills[c.id].skill.name:skillTreeBranchBSkills[c.id].name):kind==="derived"?skillTreeDerivedSkills[c.id].name:"",cost=node===derived&&!isNewTree?2:1;return `<article class="skill-node skill-${available?"available":lv>0?"opened":"locked"} ${selected?"selected":""}" data-node-kind="${kind}"><span class="skill-node-step">${kind==="passive"?"基礎":kind==="derived"?"派生":node===a?"SP A":"SP B"}</span><strong>${esc(node.name)}</strong><p>${esc(node.desc)}</p><div class="skill-level">${isNewTree?`Lv.${lv}/${max}`:kind==="branch"?`SPスキル（${lv}/5）`:lv?"取得済み":"未取得"}</div>${linkedSkill?`<small>習得SPスキル：${esc(linkedSkill)}</small>`:""}<small>${esc(conditionFor(node))}</small><button type="button" class="skill-detail-button" data-select-skill="${node.id}">詳細</button><button type="button" data-upgrade-skill="${node.id}" ${available?"":"disabled"}>${lv>=max?"最大":lv?"強化する":"取得する"}（${cost}pt）</button></article>`;};
 const mat=Object.entries(materials).map(([id,n])=>`${materialNames[id]||id} ×${n||0}`).join("　／　")||"素材なし";
 const selectedLevel=getTreeLevel(c.id,selectedNode.id),selectedMax=isNewTree?10:selectedNode===a||selectedNode===b?5:1;
 const selectedNext=isNewTree?(selectedNode===passive?`レベルごとに${c.id==="healer"?"回復量3%":"対応能力2%"}上昇`:selectedNode===derived?`派生スキル「${skillTreeDerivedSkills[c.id].name}」の効果が強化`:`「${(selectedNode===a?skillTreeExtraSkills[c.id].skill:skillTreeBranchBSkills[c.id]).name}」の効果がレベルに応じて上昇`):(selectedNode===passive?"最大HP・攻撃力などの基礎能力が2%上昇":selectedNode===derived?`派生SPスキル「${skillTreeDerivedSkills[c.id].name}」を習得`:`対応する${selectedNode.effect}効果が3%上昇`);
 box.innerHTML=`<div class="training-character-select"><h2>強化・育成</h2><div class="training-character-tabs">${characters.map(ch=>`<button type="button" data-training-character="${ch.id}" class="${ch.id===c.id?"active":""}">${esc(ch.name)}</button>`).join("")}</div></div>
 <section class="training-tree"><div class="training-section-head"><div><h3>${esc(c.name)}のスキルツリー</h3><p>基礎パッシブを取得し、2系統のSPスキルを育成。両方を習得すると派生スキルが解放されます。</p></div><strong>育成ポイント：${points}pt</strong></div>
 <div class="skill-tree-scroll"><div class="skill-tree-layout"><div class="skill-tree-passive">${nodeCard(passive,"passive")}</div><div class="skill-tree-branches"><div class="skill-branch-top">${nodeCard(a,"branch")}</div><div class="skill-branch-bottom">${nodeCard(b,"branch")}</div></div><div class="skill-tree-derived">${nodeCard(derived,"derived")}</div></div></div>
 <div class="skill-detail-panel"><strong>選択中：${esc(selectedNode.name)}</strong><p>${esc(selectedNode.desc)}</p><small>現在レベル：${selectedLevel}/${selectedMax} ／ 次の強化：${esc(selectedNext)} ／ 取得条件：${esc(conditionFor(selectedNode))} ／ 状態：${stateLabel(selectedNode)}</small></div></section>
 <section class="training-stats"><h3>${esc(c.name)}のステータス</h3><p>Lv.${characterLevels[c.id]||1}　／　取得スキル：${treeNodes(c.id).filter(n=>getTreeLevel(c.id,n.id)>0).length}系統</p><div class="training-stat-grid"><span>HP <b>${stats.maxHp}</b></span><span>ATK <b>${stats.attack}</b></span><span>DEF <b>${stats.defense}</b></span><span>最大SP <b>${stats.maxSp}</b></span><span>SP攻撃力 <b>${stats.spAttack}</b></span><span>SP防御力 <b>${stats.spDefense}</b></span></div><p>装備補正：${equippedItems(c).map(i=>`${esc(i.name)}（${esc(i.effect||"装備効果")}）`).join("、")||"なし"}</p><p>取得済み：${treeNodes(c.id).filter(n=>getTreeLevel(c.id,n.id)>0).map(n=>`${esc(n.name)} Lv.${getTreeLevel(c.id,n.id)}`).join("、")||"なし"}</p></section>
 <p class="material-line">所持素材：${esc(mat)}</p><div class="progression-grid"><section><h3>武器製作</h3>${recipes.map(r=>{const ok=Object.entries(r.needs).every(([id,n])=>(materials[id]||0)>=n)&&state.gold>=r.cost;return `<article><strong>${esc(r.name)}</strong><small>${r.attackBonus?`ATK +${r.attackBonus}`:`SP攻撃 +${r.spAttackBonus}`} ／ ${r.classes.map(id=>getCharacter(id)?.name).join("・")}</small><small>${Object.entries(r.needs).map(([id,n])=>`${materialNames[id]}×${n}（${materials[id]||0}）`).join("、")} ／ ${r.cost}G</small><button data-craft="${r.id}" ${ok?"":"disabled"}>製作</button></article>`;}).join("")}</section><section><h3>装備中の武器強化</h3><p>${esc(c.name)}が現在装備している武器のみ対象です。最大+5。</p>${[...new Set(Object.values(equipment[c.id]||{}).filter(Boolean))].filter(id=>itemById(id)?.category==="weapon").map(id=>{const lv=weaponLevels[id]||0,cost=enhancementCosts[lv+1]||0,material=enhancementMaterials[id]||"slime_jelly",need=lv+1;return `<article><strong>${esc(itemById(id).name)} +${lv}</strong><small>強化後：${itemById(id).attackBonus?"攻撃力":"SP攻撃力"}補正 +${Math.floor((itemById(id).attackBonus||itemById(id).spAttackBonus||0)*(1+(lv+1)*.1))}</small><small>必要：${lv<5?`${cost}G・${materialNames[material]}×${need}（所持 ${materials[material]||0}）`:"最大強化"}</small><button data-enhance="${id}" ${lv>=5||state.gold<cost||(materials[material]||0)<need?"disabled":""}>${lv>=5?"強化上限":"強化する"}</button></article>`;}).join("")||"<p>装備中の武器がありません。</p>"}</section></div>`;
 box.querySelectorAll("[data-training-character]").forEach(btn=>btn.onclick=()=>{shopBuyerId=btn.dataset.trainingCharacter;selectedTrainingSkill=null;renderProgressionPanel();});
 box.querySelectorAll("[data-select-skill]").forEach(btn=>btn.onclick=()=>{selectedTrainingSkill=btn.dataset.selectSkill;renderProgressionPanel();});
 box.querySelectorAll("[data-upgrade-skill]").forEach(btn=>btn.onclick=()=>{const node=treeNodes(c.id).find(n=>n.id===btn.dataset.upgradeSkill);if(!node||!canUpgrade(node))return;const cost=node===derived&&!newTreeCharacterIds.includes(c.id)?2:1;trainingPoints[c.id]-=cost;setTreeLevel(c.id,node.id,getTreeLevel(c.id,node.id)+1);unlockedSkills[c.id]=treeNodes(c.id).filter(n=>getTreeLevel(c.id,n.id)>0).map(n=>n.id);selectedTrainingSkill=node.id;renderAll();setSystemMessage(`${c.name}の「${node.name}」を${node===a||node===b?`Lv.${getTreeLevel(c.id,node.id)}に強化`:`取得`}しました。`);});
 box.querySelectorAll("[data-craft]").forEach(btn=>btn.onclick=()=>craftRecipe(btn.dataset.craft));
 box.querySelectorAll("[data-enhance]").forEach(btn=>btn.onclick=()=>enhanceWeapon(btn.dataset.enhance));
}


function renderProgressionPanel(){
  const box=$("progression-panel");if(!box)return;
  try{return renderProgressionPanelUnsafe();}
  catch(error){console.error("[Training] 育成画面の描画エラー:",error);box.innerHTML=`<p class="empty-note">強化・育成画面の描画に失敗しました。</p><p class="empty-note">${esc(error?.message||"原因不明のエラー")}</p><button type="button" class="secondary-button" data-training-retry>再表示</button>`;box.querySelector("[data-training-retry]")?.addEventListener("click",renderProgressionPanel);}
}

function craftRecipe(id){const r=recipes.find(x=>x.id===id);if(!r||state.gold<r.cost||!Object.entries(r.needs).every(([m,n])=>(materials[m]||0)>=n))return;state.gold-=r.cost;for(const [m,n] of Object.entries(r.needs))materials[m]-=n;inventory[r.id]=(inventory[r.id]||0)+1;unlockAchievement("weapon_smith");renderAll();setSystemMessage(`${r.name}を製作しました。`);}
function enhanceWeapon(id){const item=itemById(id),lv=weaponLevels[id]||0,cost=enhancementCosts[lv+1];const equippedNow=Object.values(equipment[shopBuyerId]||{}).includes(id);if(!item||item.category!=="weapon"||!equippedNow||lv>=5||state.gold<cost)return;const material=enhancementMaterials[id]||"slime_jelly";if((materials[material]||0)<lv+1){setSystemMessage(`${materialNames[material]}が不足しています。`);return;}state.gold-=cost;materials[material]-=lv+1;weaponLevels[id]=lv+1;playSe("assets/se/bukikyouka/決定ボタンを押す10");if(lv+1>=5)unlockAchievement("enhancement_master");renderAll();setSystemMessage(`${item.name}を+${lv+1}に強化しました（${materialNames[material]}×${lv+1}消費）。`);}
// 経験値・必要経験値が決まった際、この関数をレベルアップ処理から呼び出す。
// 現在レベルより大きい値だけを受け付けるため、同じレベル通知の重複付与を防止する。
function registerCharacterLevel(characterId,nextLevel){
  const c=getCharacter(characterId);
  const level=Math.floor(Number(nextLevel));
  if(!c||!Number.isFinite(level)||level<1)return {ok:false,reason:"invalid"};
  const current=characterLevels[characterId]||1;
  if(level<=current)return {ok:true,awarded:0,level:current};
  characterLevels[characterId]=level;
  setSystemMessage(`${c.name}がレベル${level}になりました。スキルツリーの開放条件を確認してください。`);
  renderProgressionPanel();
  return {ok:true,awarded:0,level};
}
// 将来の経験値・レベル機能から利用する公開連携口。
window.KotamaGameProgression=Object.freeze({setCharacterLevel:registerCharacterLevel,getCharacterLevel:id=>characterLevels[id]||1});
function awardMaterials(enemy){
  const drops=[];const name=enemy?.name;
  const table={"スライム":[["slime_jelly",.5]],"オオカミ":[["monster_fang",.4],["monster_hide",.2]],"ゴブリン":[["goblin_cloth",.4]],"ドラゴン":[["dragon_scale",1],["dragon_claw",.5]],"魔王":[["maou_crystal",1],["maou_horn",.5]]}[name]||[];
  const attempts=name==="ゴブリン"&&Array.isArray(enemy.members)?enemy.members.length:1;
  for(let n=0;n<attempts;n++)for(const [id,chance] of table){if(Math.random()<chance){materials[id]=(materials[id]||0)+1;const existing=drops.find(x=>x.id===id);if(existing)existing.count++;else drops.push({id,name:materialNames[id],count:1});}}
  if(drops.length)pushLog(`素材を入手：${drops.map(x=>`${x.name}×${x.count}`).join("、")}`);
  return drops;
}
async function showItemDropAnimation(drops){
  if(!Array.isArray(drops)||!drops.length)return;
  const arena=document.querySelector(".battle-arena");if(!arena)return;
  arena.querySelector(".drop-reward-layer")?.remove();
  const layer=document.createElement("div");layer.className="drop-reward-layer";layer.setAttribute("aria-label","ドロップアイテム");
  layer.innerHTML=drops.map((item,index)=>`<div class="drop-reward-item" style="--drop-index:${index}"><span class="drop-reward-image" aria-hidden="true">◇</span><strong>${esc(item.name)}</strong><small>×${item.count}</small></div>`).join("");
  arena.appendChild(layer);await wait(1450);layer.classList.add("drop-reward-fade");await wait(260);layer.remove();
}
function getShopItemSlot(item,charId){
  if(item.category==="healing")return null;
  const c=getCharacter(charId),slots=c?equipmentSlots(c).map(x=>x[0]):[];
  const eq=equipment[charId]||{};
  if(item.slot==="katana"){
    if(!slots.includes("katana1"))return null;
    return !eq.katana1?"katana1":!eq.katana2?"katana2":"katana1";
  }
  if(item.category==="armor")return slots.includes("armor")?"armor":null;
  if(item.category==="accessory")return !eq.accessory1?"accessory1":"accessory2";
  if(item.category==="weapon")return slots.includes("weapon")?"weapon":null;
  return null;
}
function previewEquipmentStats(c,item,slot){
  const before=effectiveStats(c),oldId=equipment[c.id]?.[slot];
  const old=equippedItems(c).find(x=>x.id===oldId)||itemById(oldId);
  const candidateLevel=weaponLevels[item.id]||0,candidateMultiplier=item.category==="weapon"?1+candidateLevel*.1:1;
  const candidate={...item,attackBonus:Math.floor((item.attackBonus||0)*candidateMultiplier),spAttackBonus:Math.floor((item.spAttackBonus||0)*candidateMultiplier)};
  const values={maxHp:before.maxHp,attack:before.attack,spAttack:before.spAttack,defense:before.defense,spDefense:before.spDefense};
  const bonusKeys={maxHp:"hpBonus",attack:"attackBonus",spAttack:"spAttackBonus",defense:"defenseBonus",spDefense:"spDefenseBonus"};
  if(old){for(const key of Object.keys(bonusKeys))values[key]-=old[bonusKeys[key]]||0;}
  for(const key of Object.keys(bonusKeys))values[key]+=candidate[bonusKeys[key]]||0;
  return values;
}
function formatDelta(n){return n>0?`+${n}`:String(n);}
function renderShopStatPreview(before,after){const rows=[["HP","maxHp",220],["攻撃","attack",220],["SP攻撃","spAttack",220],["防御","defense",120],["SP防御","spDefense",120]];return `<div class="shop-stat-preview"><strong>装備した場合の能力値</strong>${rows.map(([label,key,scale])=>{const a=before[key],b=after[key],diff=b-a,delta=Math.abs(diff),base=Math.min(100,(diff<0?b:a)/scale*100),segment=Math.min(100,delta/scale*100),left=diff<0?Math.min(base,100-segment):base;const deltaText=diff>0?`+${diff}`:diff<0?`−${delta}`:"±0";const deltaClass=diff>0?"shop-preview-added":diff<0?"shop-preview-decreased":"shop-preview-neutral";const segmentClass=diff<0?"decrease":"increase";return `<div class="shop-preview-row"><span>${label} ${a} <b class="${deltaClass}">${deltaText}</b> → <b>${b}</b></span><div class="shop-preview-track"><i style="width:${base}%"></i>${diff?`<em class="${segmentClass}" style="left:${left}%;width:${segment}%"></em>`:""}</div></div>`;}).join("")}</div>`;}
function buyItem(id,mode="store"){
  const i=itemById(id);if(!i)return;
  if((i.unlock||1)>(state.maxUnlockedStage||1)){setSystemMessage("この商品はまだ解放されていません。");sound("error");return;}
  if(state.gold<i.price){setSystemMessage("ゴールドが足りません。");sound("error");return;}
  const buyer=getCharacter(shopBuyerId),compatible=(i.classes||[]).includes(shopBuyerId);
  let slot=mode==="equip"?getShopItemSlot(i,shopBuyerId):null;
  if(mode==="equip"&&(!slot||!compatible)){setSystemMessage("この仲間には装備できません。");sound("error");return;}
  state.gold-=i.price;inventory[id]=(inventory[id]||0)+1;
  if(mode==="equip"&&slot){
    const old=equipment[shopBuyerId][slot];
    if(old){inventory[old]=(inventory[old]||0)+1;}
    inventory[id]--;if(inventory[id]<=0)delete inventory[id];
    equipment[shopBuyerId][slot]=id;
    setSystemMessage(`${i.name}を購入して${buyer.name}に装備しました。${old?`以前の装備「${itemById(old)?.name||old}」は所持品に戻りました。`:""}`);
  }else setSystemMessage(`${i.name}を購入し、所持品に保管しました。`);
  renderAll();showPurchasePopup(`${i.name}を購入しました。`);playSe("assets/se/shop/決定ボタンを押す14");
  if(tutorialState.started&&!tutorialState.completed&&tutorialState.phase==="shop-armor"&&id==="leather-armor"&&mode==="equip"){
    tutorialState.armorBought=true;tutorialState.phase="shop-accessory";tutorialSave();showScreen("formation");tutorialOverlay("アクセサリについて","装備品には武器・防具のほかに、アクセサリを2種類装備できるよ。今回は説明だけ確認しよう。次はSHOPで回復薬を1つ購入しよう。");tutorialHighlight('#selected-party select[data-equip^="accessory"]');
  }else if(tutorialState.started&&!tutorialState.completed&&tutorialState.phase==="shop-potion"&&id==="potion"){
    tutorialState.potionBought=true;tutorialState.phase="complete";tutorialSave();tutorialFinish();
  }
}
function showPurchasePopup(message){const p=$("purchase-popup"),m=$("purchase-popup-message");if(!p||!m)return;clearTimeout(purchasePopupTimer);m.textContent=message;p.hidden=false;purchasePopupTimer=setTimeout(()=>p.hidden=true,2200);}
function setSystemMessage(m){if($("system-message"))$("system-message").textContent=m;}
function stopPreview(resumeBgm=true){
  const wasActive=soundtrackPreviewActive;
  soundtrackPreviewActive=false;
  if(previewAudio){previewAudio.pause();try{previewAudio.currentTime=0;}catch(e){}previewAudio=null;}
  if(previewTimer){clearInterval(previewTimer);previewTimer=null;}
  document.querySelectorAll(".track-preview").forEach(x=>{if(x.checked)x.checked=false;});
  if(resumeBgm&&wasActive&&state.screen==="settings"&&$("bgm-toggle")?.checked)startBgm();
}
function previewTrack(key){
  stopPreview(false);
  stopBgm(); // 試聴中はゲーム内BGMを停止し、選択した音源だけを再生する。
  const toggle=document.querySelector(`.track-preview[data-track="${key}"]`);
  if(toggle)toggle.checked=true;
  soundtrackPreviewActive=true;
  const mp3Tracks={
    arc:"assets/music/Final Battle Arc.mp3",
    overture:"assets/music/Final Battle Overture.mp3",
    ending:"assets/music/March_for__delightful_future.mp3",
    dragonDeckrail:"assets/music/戦闘/Deckrail.mp3",
    dragonDerringer:"assets/music/戦闘/Derringer.mp3",
    hiddenZero:"assets/music/戦闘/Zero_Defects.mp3",
    hiddenAgainst:"assets/music/戦闘/Do_not_go_against_me.mp3",
    hiddenSwirling:"assets/music/戦闘/Swirling_Black.mp3",
    goblinSoldiers:"assets/music/戦闘/Soldiers.mp3",
    goblinLeathers:"assets/music/戦闘/Leathers_Motorcycle.mp3",
    slimeLower:"assets/music/戦闘/Lower_Sanctum.mp3",
    slimeSakura:"assets/music/戦闘/Sakura_Mellows.mp3",
    storySword:"assets/music/ストーリー/古き剣.mp3",
    storySanctum:"assets/music/ストーリー/沈黙の聖堂.mp3"
  };
  if(mp3Tracks[key]){
    previewAudio=new Audio(encodeURI(mp3Tracks[key]));previewAudio.loop=true;previewAudio.preload="auto";const isStoryTrack=key==="storySword"||key==="storySanctum";const isBossTrack=key==="arc"||key==="overture";previewAudio.volume=Math.min(1,.65625*bgmVolume*(isStoryTrack||isBossTrack?1:1/3));
    previewAudio.play().catch(error=>{console.warn("BGM試聴に失敗:",mp3Tracks[key],error);if(toggle)toggle.checked=false;stopPreview(true);});
    return;
  }
  try{
    audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==="suspended")audioContext.resume();
    const tracks={home:{notes:[261.63,329.63,392,329.63,293.66,349.23,440,392],interval:1100,duration:1.22},normal:{notes:[220,277.18,329.63,277.18,196,246.94,293.66,246.94],interval:420,duration:.28}};
    const t=tracks[key];if(!t){stopPreview(true);return;}
    let i=0;
    previewTimer=setInterval(()=>{
      if(!toggle?.checked||!soundtrackPreviewActive){stopPreview(true);return;}
      const o=audioContext.createOscillator(),g=audioContext.createGain(),now=audioContext.currentTime;
      o.type="sine";o.frequency.setValueAtTime(t.notes[i++%t.notes.length],now);
      g.gain.setValueAtTime(Math.min(.9,(key==="home"?.04375/3:.05/3)*(bgmVolume*1.5)),now);g.gain.exponentialRampToValueAtTime(.0001,now+t.duration);
      o.connect(g);g.connect(audioContext.destination);o.start(now);o.stop(now+t.duration+.01);
    },t.interval);
  }catch(e){if(toggle)toggle.checked=false;stopPreview(true);}
}
function setupNavigation(){
  const tutorialCommandBox=$("battle-commands");
  if(tutorialCommandBox&&!tutorialCommandBox.dataset.tutorialObserver){
    tutorialCommandBox.dataset.tutorialObserver="1";
    const observer=new MutationObserver(()=>tutorialSyncCommandLock());
    observer.observe(tutorialCommandBox,{childList:true,subtree:true});
  }
  $("tutorial-next")?.addEventListener("click",()=>{
    const phase=tutorialState.phase;
    if(phase==="welcome"){
      tutorialClose();
      beginTutorial(false);
      return;
    }
    if(phase==="battle"){
      tutorialClose();tutorialState.battlePhase="enemy-ui";tutorialOverlay("敵の表示","敵のHPゲージを確認しよう。敵のHPを減らして撃破するのが戦闘の基本だよ。");tutorialHighlight("#battle-enemy");tutorialState.phase="battle-enemy";
    }else if(phase==="battle-enemy"){
      tutorialClose();tutorialState.battlePhase="event-ui";tutorialOverlay("EVENT画面","戦闘中の重要な情報や、大技の予告がここに表示されるよ。");tutorialHighlight(".event-window");tutorialState.phase="battle-event";
    }else if(phase==="battle-event"){
      tutorialClose();tutorialState.battlePhase="party-ui";tutorialOverlay("プレイヤー枠","HPは体力、SPを消費してスキルを発動するよ。");tutorialHighlight("#battle-party");tutorialState.phase="battle-party";
    }else if(phase==="battle-event-warning"){
      // 赤文字の予告が出た後の説明が終わったら、ターン数の説明へ進む。
      tutorialClose();tutorialState.phase="battle-guard-command";tutorialOverlay("全員で防御しよう","コマンドから防御を選択してね。チュートリアルでは味方全員が防御するよ。");tutorialHighlight('#battle-commands [data-action="guard"]');
    }else if(phase==="battle-party"){
      tutorialClose();tutorialOverlay("コマンド欄について","ここから攻撃・SPスキル・防御・道具を選びます。今はまだ操作せず、次に右側の説明欄を確認しよう。");tutorialHighlight(".command-window");tutorialState.phase="battle-command-ui";
    }else if(phase==="battle-command-ui"){
      tutorialClose();tutorialOverlay("コマンド説明欄について","ここには選択中の攻撃やスキルの効果、消費SP、属性、対象などの様々な情報が表示されます。SPスキルを選んだときは特にここを確認しよう。");tutorialHighlight(".command-info-window");tutorialState.phase="battle-info-ui";
    }else if(phase==="battle-info-ui"){
      tutorialClose();tutorialOverlay("通常攻撃を試そう","まずは全員でスライムに【攻撃】をしてみよう。緑に光っている攻撃コマンドを押してね。");tutorialHighlight('#battle-commands [data-action="attack"]');tutorialState.phase="battle-command";tutorialState.battlePhase="intro";
    }else if(phase==="battle-command"||phase==="battle-sp-command"||phase==="battle-guard-command"){
      tutorialClose();tutorialSave();
      const selector=phase==="battle-command"?'#battle-commands [data-action="attack"]':phase==="battle-sp-command"?'#battle-commands [data-action="skill"]':'#battle-commands [data-action="guard"]';tutorialHighlight(selector);
    }else if(phase==="battle-sp"){
      tutorialClose();tutorialOverlay("SPスキルを選ぼう","SPスキルを押すと、技の名前・消費SP・効果を確認できるよ。選択したら右側のCOMMAND INFOが点滅するので、ここに表示されるスキルや様々な情報を確認してから使用しよう。");tutorialHighlight('#battle-commands [data-action="skill"]');tutorialState.phase="battle-sp-command";
    }else if(phase==="battle-guard"){
      tutorialClose();tutorialOverlay("全員で防御しよう","コマンドから防御を選択してね。チュートリアルでは味方全員が防御するよ。");tutorialHighlight('#battle-commands [data-action="guard"]');tutorialState.phase="battle-guard-command";
    }else if(phase==="battle-union"){
      tutorialClose();tutorialState.phase="battle-union-command";tutorialHighlight("#battle-commands .union-command");
    }else if(phase==="battle-union-command"){
      tutorialClose();tutorialHighlight("#battle-commands .union-command");
    }else if(phase==="battle-retreat"){
      tutorialClose();tutorialHighlight("#retreat-button");
    }else if(phase==="formation-intro"){
      tutorialClose();tutorialOverlay("編成タブを開こう","編成タブをクリックして、仲間の編成を確認しよう。");tutorialHighlight('.main-nav [data-screen="formation"]');
    }else if(phase==="formation-remove"){
      tutorialClose();tutorialHighlight('#selected-party [data-remove-character="healer"]');
    }else if(phase==="formation-add"){
      tutorialClose();tutorialHighlight('#character-roster [data-toggle-character="healer"]');
    }else if(phase==="equipment-intro"){
      tutorialClose();if(!tutorialState.heroSwordGranted){inventory["hero-sword"]=(inventory["hero-sword"]||0)+1;tutorialState.heroSwordGranted=true;showPurchasePopup("勇者の剣を手に入れた！");}renderAll();tutorialState.phase="equip-hero-sword";tutorialOverlay("勇者の剣を入手！","勇者の剣を1本受け取ったよ。コタマの武器欄から装備してみよう。");tutorialHighlight('#selected-party select[data-character="kotama"][data-equip="weapon"]');
    }else if(phase==="equip-hero-sword"){
      tutorialClose();tutorialHighlight('#selected-party select[data-character="kotama"][data-equip="weapon"]');
    }else if(phase==="shop-intro"){
      tutorialClose();showScreen("shop");shopBuyerId="kotama";currentCategory="armor";renderShop();tutorialState.phase="shop-armor";tutorialOverlay("革の鎧を購入しよう","防具は防御力を高める装備だよ。革の鎧をコタマに購入して装備しよう。");tutorialHighlight('#shop-items [data-buy-item="leather-armor"][data-buy-mode="equip"]');
    }else if(phase==="shop-armor"){
      tutorialClose();tutorialHighlight('#shop-items [data-buy-item="leather-armor"][data-buy-mode="equip"]');
    }else if(phase==="shop-accessory"){
      tutorialClose();showScreen("shop");shopBuyerId="kotama";tutorialState.phase="shop-potion";currentCategory="other";renderShop();tutorialOverlay("回復薬を購入しよう","その他カテゴリから回復薬を1個購入しよう。回復薬は冒険中にHPを回復できるよ。");tutorialHighlight('#shop-items [data-buy-item="potion"]');
    }else if(phase==="shop-potion"){
      tutorialClose();tutorialHighlight('#shop-items [data-buy-item="potion"]');
    }else if(phase==="complete"){
      tutorialClose();
    }
    // フェーズ更新後に必ず再同期する。ハイライト対象だけでなく、操作可否も最新段階に合わせる。
    tutorialSyncCommandLock();
    tutorialSave();
  });
  document.addEventListener("click",e=>{
    if(!tutorialState.started||tutorialState.completed)return;
    const target=e.target instanceof Element?e.target:null;if(!target)return;
    if(target.closest("#tutorial-overlay .tutorial-panel"))return;
    const phase=tutorialState.phase;
    const hit=(selector)=>!!target.closest(selector);
    // 最初の案内：STARTを押すとガイドが消え、そのままチュートリアル戦闘が始まる。
    if((phase==="intro"||phase==="welcome")&&hit("#start-button")){e.preventDefault();e.stopImmediatePropagation();tutorialClose();beginTutorial(false);return;}
    if(phase==="formation-intro"&&hit('.main-nav [data-screen="formation"]')){e.preventDefault();e.stopImmediatePropagation();showScreen("formation");tutorialState.phase="formation-remove";tutorialOverlay("治癒士を外そう","編成中の治癒士の『編成から外す』を押してみよう。");tutorialHighlight('#selected-party [data-remove-character="healer"]');tutorialSave();return;}
    if(phase==="shop-nav"&&hit('.main-nav [data-screen="shop"]')){e.preventDefault();e.stopImmediatePropagation();showScreen("shop");shopBuyerId="kotama";currentCategory="armor";renderShop();tutorialState.phase="shop-armor";tutorialOverlay("革の鎧を購入しよう","防具は防御力を高める装備だよ。革の鎧をコタマに購入して装備しよう。");tutorialHighlight('#shop-items [data-buy-item="leather-armor"][data-buy-mode="equip"]');tutorialSave();return;}
    if(phase==="battle-enemy"&&hit("#battle-enemy")){e.preventDefault();e.stopImmediatePropagation();$("tutorial-next").click();return;}
    if((phase==="battle-event"||phase==="battle-event-warning")&&hit(".event-window")){e.preventDefault();e.stopImmediatePropagation();$("tutorial-next").click();return;}
    if(phase==="battle-party"&&hit("#battle-party")){e.preventDefault();e.stopImmediatePropagation();$("tutorial-next").click();return;}
    let allowed=hit("#tutorial-next");
    // 初回ホーム画面では、チュートリアル開始ボタンだけは必ず押せるようにする。
    if(phase==="intro"&&hit("#start-button"))allowed=true;
    if(battleState.tutorialMode&&hit("#battle-commands button")){
      const command=target.closest("#battle-commands button");
      allowed=!!command&&tutorialCommandAllowed(command);
    }
    if(["battle-command","battle-sp-command","battle-guard-command","battle-union-command"].includes(phase)&&!hit("#battle-commands button"))allowed=false;
    if(phase==="battle-command-ui"||phase==="battle-info-ui")allowed=allowed||hit("#tutorial-next");
    else if(phase==="battle-command")allowed=allowed||(battleState.menuMode==="target"?hit("#battle-commands [data-enemy-target]"):hit('#battle-commands [data-action="attack"]'));
    else if(phase==="battle-sp-command")allowed=allowed||(battleState.menuMode==="target"?hit("#battle-commands [data-enemy-target]"):battleState.menuMode==="skill"?hit("#battle-commands [data-skill]"):hit('#battle-commands [data-action="skill"]'));
    else if(phase==="battle-guard-command")allowed=allowed||hit('#battle-commands [data-action="guard"]');
    else if(phase==="battle-union-command")allowed=allowed||hit("#battle-commands .union-command")||hit("#battle-commands [data-union]");
    else if(phase==="battle-retreat")allowed=allowed||hit("#retreat-button")||hit("#retreat-yes")||hit("#retreat-no");
    else if(phase==="formation-remove")allowed=allowed||hit('[data-remove-character="healer"]');
    else if(phase==="formation-add")allowed=allowed||hit('[data-toggle-character="healer"]');
    else if(phase==="equip-hero-sword")allowed=allowed||hit('select[data-character="kotama"][data-equip="weapon"]');
    else if(phase==="shop-armor")allowed=allowed||hit('[data-buy-item="leather-armor"][data-buy-mode="equip"]');
    else if(phase==="shop-potion")allowed=allowed||hit('[data-buy-item="potion"]');
    // 「次へ」の無い案内中は、光っている対象を押した時点でガイドを閉じる。
    if(allowed&&TUTORIAL_NO_NEXT.includes(phase)&&phase!=="equip-hero-sword"&&!hit("#tutorial-next")&&!$("tutorial-overlay")?.hidden)tutorialClose();
    if(!allowed){e.preventDefault();e.stopImmediatePropagation();setSystemMessage("チュートリアルで案内している操作を進めよう。");}
  },true);
  document.addEventListener("change",e=>{
    if(!tutorialState.started||tutorialState.completed)return;
    const target=e.target;if(!(target instanceof HTMLSelectElement))return;
    if(tutorialState.phase==="equip-hero-sword"&&target.matches('select[data-character="kotama"][data-equip="weapon"]'))return;
    e.preventDefault();e.stopImmediatePropagation();setSystemMessage("今は案内している装備欄だけ操作できます。");
  },true);
  $("battle-log-open")?.addEventListener("click",()=>{const modal=$("battle-log-dialog");if(modal){renderBattleLogDialog();modal.hidden=false;const content=$("battle-log-dialog-content");if(content)content.scrollTop=content.scrollHeight;}});$("battle-log-close")?.addEventListener("click",()=>{$("battle-log-dialog").hidden=true;});$("battle-log-dialog")?.addEventListener("click",e=>{if(e.target===$("battle-log-dialog"))$("battle-log-dialog").hidden=true;});
  setupStoryEvents();$("event-gallery-button")?.addEventListener("click",()=>{$("event-gallery").hidden=!$("event-gallery").hidden;if(!$("event-gallery").hidden)renderEventGallery();});document.querySelectorAll("[data-screen]").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();if(tutorialState.started&&!tutorialState.completed)return;if(state.screen==="battle"&&b.dataset.screen!=="battle")return;showScreen(b.dataset.screen);playSe("assets/se/home/決定ボタンを押す33");if(b.dataset.screen==="training")renderProgressionPanel();}));document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>{currentCategory=b.dataset.category;renderShop();sound("select");}));$("formation-done")?.addEventListener("click",()=>{if(tutorialState.started&&!tutorialState.completed){setSystemMessage("チュートリアルの指示に沿って操作を進めよう。");return;}if(state.party.filter(Boolean).length!==PARTY_LIMIT){setSystemMessage("仲間を4人選んでください。");sound("error");return;}if(retryContext){startStageFromRetryContext();return;}showScreen("home");});$("start-button")?.addEventListener("click",()=>{if(tutorialState.phase==="complete"&&!$("tutorial-overlay")?.hidden)tutorialClose();if(tutorialState.started&&!tutorialState.completed){if(tutorialState.phase==="intro"||tutorialState.phase==="welcome"){tutorialClose();beginTutorial(false);}else resumeTutorial();return;}if(state.party.filter(Boolean).length!==PARTY_LIMIT){$("start-warning").textContent="戦闘を始めるには仲間を4人編成してください。";sound("error");return;}if(!state.firstStageStarted){startBattle(1);return;}openStageSelectDialog();});$("se-toggle")?.addEventListener("change",()=>{persistAudioSettings();sound("select");});$("bgm-toggle")?.addEventListener("change",()=>{persistAudioSettings();$("bgm-toggle").checked?startBgm():stopBgm();});$("bgm-volume")?.addEventListener("input",e=>{bgmVolume=Number(e.target.value)/100;applyVolumeControls();persistAudioSettings();if(bossBgmAudio)bossBgmAudio.volume=(currentBgmKey==="boss"?.2625:(currentBgmKey==="ending"?.0875:.20/3))*bgmVolume;if(storyBgmAudio&&!storyBgmFadeTimer)storyBgmAudio.volume=.09*bgmVolume;if(previewAudio){const selectedTrack=document.querySelector(".track-preview:checked")?.dataset.track;const fullVolumeTrack=["arc","overture","storySword","storySanctum"].includes(selectedTrack);previewAudio.volume=.65625*bgmVolume*(fullVolumeTrack?1:1/3);}});$("se-volume")?.addEventListener("input",e=>{seVolume=Number(e.target.value)/100;applyVolumeControls();persistAudioSettings();});document.querySelectorAll(".track-preview").forEach(ch=>ch.addEventListener("change",()=>{if(ch.checked)previewTrack(ch.dataset.track);else if(soundtrackPreviewActive)stopPreview(true);}));$("save-button")?.addEventListener("click",saveGame);$("load-button")?.addEventListener("click",openLoadDialog);$("skip-button")?.addEventListener("click",()=>{battleSpeed=battleSpeed===1?2:1;battleState.fast=battleSpeed===2;syncBattleSpeedUI();setSystemMessage(battleSpeed===2?"戦闘速度を2.0倍にしました。":"戦闘速度を1.0倍に戻しました。");});$("list-button")?.addEventListener("click",()=>{const m=$("list-menu");m.hidden=!m.hidden;$("list-button").setAttribute("aria-expanded",String(!m.hidden));updateListMenuForScreen();});document.addEventListener("click",e=>{const m=$("list-menu"),b=$("list-button");if(!m||m.hidden)return;const target=e.target;if(m.contains(target)||b?.contains(target))return;m.hidden=true;b?.setAttribute("aria-expanded","false");});$("compendium-menu-button")?.addEventListener("click",()=>{showScreen("compendium");$("list-menu").hidden=true;});$("achievements-menu-button")?.addEventListener("click",()=>{showScreen("achievements");$("list-menu").hidden=true;});$("save-dialog-close")?.addEventListener("click",()=>$("save-dialog").hidden=true);$("load-dialog-close")?.addEventListener("click",()=>$("load-dialog").hidden=true);$("new-game-button")?.addEventListener("click",startNewGameFromLoad);$("retreat-button")?.addEventListener("click",()=>{playSe("assets/se/senntou/決定ボタンを押す15");if(battleState.tutorialMode&&tutorialState.phase!=="battle-retreat"){setSystemMessage("まずはチュートリアルの戦闘を進めよう。");return;}if((battleState.busy&&!(battleState.tutorialMode&&tutorialState.phase==="battle-retreat"))||battleState.stageFinished){setSystemMessage("行動処理中は撤退できません。行動選択中に操作してください。");return;}if(battleState.tutorialMode)tutorialClose();const modal=$("retreat-dialog");if(modal){$("retreat-stage-name").textContent=battleState.tutorialMode?"チュートリアル戦（スライムa）":`${battleState.enemy?.name||`STAGE ${battleState.stage}`}戦`;modal.hidden=false;retreatConfirmed=false;}});$("retreat-no")?.addEventListener("click",()=>{$("retreat-dialog").hidden=true;if(battleState.tutorialMode&&tutorialState.phase==="battle-retreat"){tutorialOverlay("戦い方の基本は完了！","撤退ボタンを押して拠点へ戻ろう。");tutorialHighlight("#retreat-button");}});$("retreat-yes")?.addEventListener("click",()=>{if(retreatConfirmed)return;retreatConfirmed=true;const modal=$("retreat-dialog");if(modal)modal.hidden=true;retryContext=null;battleStartSnapshot=null;battleState.busy=true;if(battleState.tutorialMode){tutorialClose();tutorialAfterRetreat();return;}showScreen("home");setSystemMessage("撤退しました。次の冒険ではステージを選択できます。");});$("save-dialog")?.addEventListener("click",e=>{if(e.target===$("save-dialog"))$("save-dialog").hidden=true;});$("load-dialog")?.addEventListener("click",e=>{if(e.target===$("load-dialog"))$("load-dialog").hidden=true;});}


function openStageSelectDialog(){const dlg=$("stage-select-dialog");if(!dlg)return;const box=$("stage-select-list");box.innerHTML=Array.from({length:5},(_,i)=>i+1).map(n=>{const open=n<=(state.maxUnlockedStage||1),clear=!!stageCleared[n];return `<button type="button" class="stage-select-card ${clear?"stage-cleared":""}" data-stage="${n}" ${open?"":"disabled"}><strong>STAGE ${n}</strong><span>${["樹海の入り口","ゴブリンの森","霧の森","炎竜の巣","魔王の城"][n-1]}</span><small>${clear?"CLEAR済み":open?"挑戦可能":"未解放"}</small></button>`;}).join("");box.querySelectorAll("[data-stage]").forEach(b=>b.onclick=()=>{const n=Number(b.dataset.stage);dlg.hidden=true;startBattle(n);});dlg.hidden=false;}
function persistAudioSettings(){try{localStorage.setItem("kotamaAudioSettings",JSON.stringify({bgmEnabled:$("bgm-toggle")?.checked??true,seEnabled:$("se-toggle")?.checked??true,bgmVolume,seVolume}));}catch(e){}}
function applyVolumeControls(){const b=$("bgm-volume"),s=$("se-volume");if(b){b.value=String(Math.round(bgmVolume*100));$("bgm-volume-value").textContent=`${b.value}%`;}if(s){s.value=String(Math.round(seVolume*100));$("se-volume-value").textContent=`${s.value}%`;}if(bossBgmAudio)bossBgmAudio.volume=(currentBgmKey==="boss"?.2625:(currentBgmKey==="ending"?.0875:.20/3))*bgmVolume;if(storyBgmAudio&&!storyBgmFadeTimer)storyBgmAudio.volume=.09*bgmVolume;if(previewAudio){const selectedTrack=document.querySelector(".track-preview:checked")?.dataset.track;const fullVolumeTrack=["arc","overture","storySword","storySanctum"].includes(selectedTrack);previewAudio.volume=.65625*bgmVolume*(fullVolumeTrack?1:1/3);}}
function updateListMenuForScreen(){const inBattle=state.screen==="battle";["compendium-menu-button","achievements-menu-button"].forEach(id=>{const el=$(id);if(el)el.hidden=inBattle;});$("save-button")?.toggleAttribute("hidden",false);$("load-button")?.toggleAttribute("hidden",false);$("skip-button")?.toggleAttribute("hidden",false);}

function buildEquipmentState(savedEquipment,migrateStarterGear=true){
  const clean={};
  for(const c of characters)clean[c.id]={weapon:null,armor:null,accessory1:null,accessory2:null,katana1:null,katana2:null};
  if(savedEquipment&&typeof savedEquipment==="object")for(const c of characters){
    const saved=savedEquipment[c.id];if(!saved||typeof saved!=="object")continue;
    for(const [slot,itemId] of Object.entries(saved)){
      if(!(slot in clean[c.id])||typeof itemId!=="string")continue;
      const item=itemById(itemId);if(!item)continue;
      const valid=slot==="armor"?item.category==="armor":slot.startsWith("accessory")?item.category==="accessory":slot.startsWith("katana")?item.category==="weapon"&&item.slot==="katana":slot==="weapon"&&item.category==="weapon"&&!item.slot;
      if(valid)clean[c.id][slot]=itemId;
    }
  }
  // 旧バージョンのセーブデータだけ、初期装備が空の場合に補完する。
  const starters={kotama:{weapon:"sword",armor:"leather-armor"},knight:{weapon:"sword",armor:"leather-armor"},mage:{weapon:"mage-staff",armor:"leather-armor"},healer:{weapon:"mage-staff",armor:"leather-armor"},samurai:{katana1:"katana",armor:"leather-armor"}};
  if(migrateStarterGear)for(const [cid,slots] of Object.entries(starters))for(const [slot,id] of Object.entries(slots))if(!clean[cid][slot])clean[cid][slot]=id;
  return clean;
}
function createSaveData(){return {saveVersion:9,tutorial:JSON.parse(JSON.stringify(tutorialState)),state:{gold:state.gold,party:[...state.party],maxUnlockedStage:state.maxUnlockedStage||1,firstStageStarted:state.firstStageStarted===true},inventory:{...inventory},equipment:JSON.parse(JSON.stringify(equipment)),materials:{...materials},weaponLevels:{...weaponLevels},growth:JSON.parse(JSON.stringify(growth)),characterLevels:{...characterLevels},unlockedSkills:JSON.parse(JSON.stringify(unlockedSkills)),skillLevels:JSON.parse(JSON.stringify(skillLevels)),legacyTreeBonuses:JSON.parse(JSON.stringify(legacyTreeBonuses)),trainingPoints:{...trainingPoints},stageCleared:{...stageCleared},stageEntered:{...stageEntered},stageSkillPointAwarded:JSON.parse(JSON.stringify(stageSkillPointAwarded)),compendium:JSON.parse(JSON.stringify(compendium)),eventRead:{...eventRead},hiddenBossFirstClear,achievementUnlocked:{...achievementUnlocked},totalEnemyDefeats,bestRanks:{...bestRanks},jobVictoryRoster:[...jobVictoryRoster],battleSpeed,audioSettings:{bgmEnabled:$("bgm-toggle")?.checked??true,seEnabled:$("se-toggle")?.checked??true,bgmVolume,seVolume},combatants:characters.map(c=>({id:c.id,hp:c.hp,sp:c.sp}))};}

function persistAutoSave(){try{localStorage.setItem("fantasyRpgSave",JSON.stringify(createSaveData()));return true;}catch(error){console.warn("オートセーブに失敗:",error);return false;}}
function createBattleStartSnapshot(){return {game:createSaveData(),battle:{stage:battleState.stage,hiddenBossMode:!!battleState.hiddenBossMode,maxStage:battleState.maxStage,enemy:JSON.parse(JSON.stringify(battleState.enemy)),bossBgmChoice:battleState.bossBgmChoice,unionGauges:{...battleState.unionGauges}}};}
function migrateLegacySlot(){if(localStorage.getItem("kotamaSaveSlot1"))return;const old=localStorage.getItem("fantasyRpgSave");if(!old)return;try{const game=JSON.parse(old);localStorage.setItem("kotamaSaveSlot1",JSON.stringify({savedAt:new Date().toISOString(),game,battle:null}));}catch(e){}}
function openSaveDialog(){migrateLegacySlot();renderSaveSlots("save");$("save-dialog").hidden=false;$("list-menu").hidden=true;$("list-button")?.setAttribute("aria-expanded","false");}
function openLoadDialog(){if(state.screen==="battle"&&battleState.busy&&$("battle-result")?.hidden){setSystemMessage("戦闘処理中はロードできません。行動選択中に操作してください。");return;}migrateLegacySlot();renderSaveSlots("load");$("load-dialog").hidden=false;$("list-menu").hidden=true;$("list-button")?.setAttribute("aria-expanded","false");}
function startNewGameFromLoad(){if(!window.confirm("最初からゲームを開始しますか？現在のオートセーブは初期化されます。LOAD画面のセーブスロットは残ります。"))return;try{localStorage.removeItem("fantasyRpgSave");localStorage.setItem("kotamaStartNewGameNow","1");window.location.reload();}catch(e){setSystemMessage("新規開始の準備に失敗しました。ブラウザーの保存領域を確認してください。");}}
function saveProgressLabel(slot){if(slot?.battle)return `STAGE ${slot.battle.stage}（戦闘開始地点）`;const reached=Object.keys(slot?.game?.stageEntered||{}).map(Number).filter(n=>Number.isFinite(n)&&n>0);const last=reached.length?Math.max(...reached):Math.max(0,(Number(slot?.game?.state?.maxUnlockedStage)||1)-1);return last?`STAGE ${last} 到達`:"冒険開始前";}
function renderSaveSlots(mode){const box=$(mode==="save"?"save-slot-list":"load-slot-list");if(!box)return;box.innerHTML=[1,2].map(n=>{let d=null;try{d=JSON.parse(localStorage.getItem(`kotamaSaveSlot${n}`)||"null");}catch(e){}const g=d?.game||null,stamp=d?.savedAt?new Date(d.savedAt).toLocaleString("ja-JP"):"未保存",stage=g?saveProgressLabel(d):"データなし",exists=!!g;return `<article class="save-slot"><div><strong>セーブデータ ${n}</strong><p>${exists?stamp:"空きスロット"}</p><small>${stage}</small></div><button type="button" data-slot="${n}" ${mode==="load"&&!exists?"disabled":""}>${mode==="save"?(exists?"上書き保存":"保存する"):"ロード"}</button></article>`;}).join("");box.querySelectorAll("[data-slot]").forEach(b=>b.onclick=()=>{const n=Number(b.dataset.slot);if(mode==="save"){let old=null;try{old=JSON.parse(localStorage.getItem(`kotamaSaveSlot${n}`)||"null");}catch(e){}if(old&&!window.confirm(`セーブデータ${n}を上書きしますか？`))return;const inBattle=state.screen==="battle"&&battleStartSnapshot&&$("battle-result")?.hidden;const snap=inBattle?battleStartSnapshot:{game:createSaveData(),battle:null};localStorage.setItem(`kotamaSaveSlot${n}`,JSON.stringify({...snap,savedAt:new Date().toISOString()}));$("save-dialog").hidden=true;setSystemMessage(`セーブデータ${n}に保存しました。${inBattle?"ロードすると現在の戦闘開始地点から再開します。":""}`);sound("select");}else loadSaveSlot(n);});}
function saveGame(){openSaveDialog();}
function loadSaveSlot(n){const raw=localStorage.getItem(`kotamaSaveSlot${n}`);if(!raw)return;let slot;try{slot=JSON.parse(raw);}catch(e){setSystemMessage("セーブデータを読み込めませんでした。");return;}if(!window.confirm(`セーブデータ${n}をロードしますか？現在の進行状況は失われる可能性があります。`))return;try{localStorage.setItem("fantasyRpgSave",JSON.stringify(slot.game));loadGame();if(slot.battle){battleState.hiddenBossMode=!!slot.battle.hiddenBossMode;battleState.maxStage=slot.battle.maxStage||5;battleState.stage=slot.battle.stage;pendingBattleResumeEnemy=slot.battle.enemy;resetTransientBattleState();battleState.bossBgmChoice=slot.battle.bossBgmChoice||null;battleState.unionGauges={kotama:0,knight:0,healer:0,warrior:0,mage:0,samurai:0,...(slot.battle.unionGauges||{})};beginStage();}else showScreen("home");$("load-dialog").hidden=true;setSystemMessage(`セーブデータ${n}をロードしました。`);}catch(e){setSystemMessage("ロードに失敗しました。");}}

function loadGame(){try{
  const d=JSON.parse(localStorage.getItem("fantasyRpgSave")||"null");
  let repairedStageProgress=false;
  if(!d||!d.state||!Number.isFinite(d.state.gold)||!Array.isArray(d.state.party)||d.state.party.some(id=>id!==null&&!characters.some(c=>c.id===id))||d.state.party.length>PARTY_LIMIT)throw new Error("invalid save");
  state.gold=Math.max(0,Math.floor(d.state.gold));state.party=d.state.party.map(id=>id===null?null:id);state.maxUnlockedStage=Math.max(1,Math.min(5,Number(d.state.maxUnlockedStage)||1));state.firstStageStarted=d.state.firstStageStarted!==false;
  if(d.tutorial&&typeof d.tutorial==="object"){tutorialState={...tutorialState,...d.tutorial};}else{tutorialState={...tutorialState,started:false,completed:true,phase:"complete"};}
  Object.keys(inventory).forEach(k=>delete inventory[k]);
  if(d.inventory&&typeof d.inventory==="object")for(const [id,count] of Object.entries(d.inventory)){if(shopItems.some(i=>i.id===id)&&Number.isFinite(count)&&count>0)inventory[id]=Math.floor(count);}
  const migrated=buildEquipmentState(d.equipment,Number(d.saveVersion)<5);for(const id of Object.keys(equipment))equipment[id]=migrated[id];
  for(const k of Object.keys(materials))delete materials[k];if(d.materials&&typeof d.materials==="object")for(const [k,v] of Object.entries(d.materials))if(materialNames[k]&&Number.isFinite(v)&&v>0)materials[k]=Math.floor(v);
  for(const k of Object.keys(weaponLevels))delete weaponLevels[k];if(d.weaponLevels&&typeof d.weaponLevels==="object")for(const [k,v] of Object.entries(d.weaponLevels))if(Number.isFinite(v))weaponLevels[k]=Math.max(0,Math.min(5,Math.floor(v)));
  for(const c of characters){const src=d.growth?.[c.id];growth[c.id]={spent:Object.fromEntries(growthKeys.map(k=>[k,Math.max(0,Math.min(20,Math.floor(Number(src?.spent?.[k])||0)))])),unspent:Math.max(0,Math.floor(Number(src?.unspent)||0))};characterLevels[c.id]=Math.max(1,Math.floor(Number(d.characterLevels?.[c.id])||1));const legacy=Array.isArray(d.unlockedSkills?.[c.id])?d.unlockedSkills[c.id]:[];const tree=skillTreeDefinitions[c.id];const savedLevels=d.skillLevels?.[c.id];const oldNodeIds={kotama:["kotama-passive","kotama-branch-a","kotama-branch-b","kotama-derived"],knight:["knight-passive","knight-branch-a","knight-branch-b","knight-derived"],healer:["healer-passive","healer-branch-a","healer-branch-b","healer-derived"],mage:["mage-passive","mage-branch-a","mage-branch-b","mage-derived"]};treeNodes(c.id).forEach((node,index)=>setTreeLevel(c.id,node.id,Number(savedLevels?.[node.id]??(newTreeCharacterIds.includes(c.id)?savedLevels?.[oldNodeIds[c.id]?.[index]]:0))||0));if(d.legacyTreeBonuses?.[c.id])legacyTreeBonuses[c.id]={...d.legacyTreeBonuses[c.id]};else legacyTreeBonuses[c.id]={};if(!savedLevels){const map=legacySkillMap[c.id]||[],effects=legacyEffectMap[c.id]?.[0]||[];if(legacy.includes(map[0])){setTreeLevel(c.id,tree.passive.id,1);legacyTreeBonuses[c.id][effects[0]]=(legacyTreeBonuses[c.id][effects[0]]||0)+.08;}if(legacy.includes(map[1])){setTreeLevel(c.id,tree.a.id,1);legacyTreeBonuses[c.id][effects[1]]=(legacyTreeBonuses[c.id][effects[1]]||0)+.08;}if(legacy.includes(map[2])){setTreeLevel(c.id,tree.b.id,1);legacyTreeBonuses[c.id][effects[2]]=(legacyTreeBonuses[c.id][effects[2]]||0)+.08;}}unlockedSkills[c.id]=treeNodes(c.id).filter(n=>getTreeLevel(c.id,n.id)>0).map(n=>n.id);}
  const legacyTrainingPoints=Math.max(0,Math.floor(Number(d.trainingPoints)||Math.max(0,(Number(d.state.maxUnlockedStage)||1)-1)));for(const c of characters){const basePoints=Math.max(0,Math.floor(Number(d.trainingPoints?.[c.id]??(typeof d.trainingPoints==="object"?0:legacyTrainingPoints))||0));const priorAwards=d.stageSkillPointAwarded?Object.values(d.stageSkillPointAwarded).filter(stage=>stage?.[c.id]).length:Object.values(d.stageCleared||{}).filter(Boolean).length;trainingPoints[c.id]=basePoints+((Number(d.saveVersion)||0)<7?priorAwards*2:0);}stageCleared={...(d.stageCleared||{})};stageEntered={...(d.stageEntered||{})};stageSkillPointAwarded=JSON.parse(JSON.stringify(d.stageSkillPointAwarded||{}));if(!d.stageEntered){for(let i=1;i<(Number(d.state.maxUnlockedStage)||1);i++)stageEntered[i]=true;}if(!d.stageCleared){for(let i=1;i<(Number(d.state.maxUnlockedStage)||1);i++)stageCleared[i]=true;}if(!d.stageSkillPointAwarded){for(const stage of Object.keys(stageCleared))if(stageCleared[stage])stageSkillPointAwarded[stage]=Object.fromEntries(characters.map(c=>[c.id,true]));}
  if(Array.isArray(d.combatants))for(const saved of d.combatants){const c=getCharacter(saved.id);if(c){c.hp=Math.max(0,Math.min(effectiveStats(c).maxHp,Number(saved.hp)||0));c.sp=Math.max(0,Math.min(c.maxSp,Number(saved.sp)||0));}}
  for(const name of compendiumNames()){compendium[name]={encountered:!!d.compendium?.[name]?.encountered,defeated:!!d.compendium?.[name]?.defeated};}
  // ドラゴン討伐記録が残っている旧セーブでは、STAGE 5（魔王の城）を解放する。
  // 討伐記録を根拠にするため、所持品・育成値・他ステージの進行は変更しない。
  if(compendium["ドラゴン"]?.defeated){if(!stageCleared[4]||state.maxUnlockedStage<5)repairedStageProgress=true;stageCleared[4]=true;state.maxUnlockedStage=Math.max(state.maxUnlockedStage,5);}
  // ステージクリア記録と解放番号が食い違う場合も、既存の進行を後退させず次の段階まで補正する。
  for(let stage=1;stage<=4;stage++)if(stageCleared[stage]===true&&state.maxUnlockedStage<stage+1){state.maxUnlockedStage=stage+1;repairedStageProgress=true;}
  hiddenBossFirstClear=!!d.hiddenBossFirstClear;
  for(const k of Object.keys(achievementUnlocked))delete achievementUnlocked[k];
  if(d.achievementUnlocked&&typeof d.achievementUnlocked==="object")for(const def of achievementDefinitions)achievementUnlocked[def.id]=d.achievementUnlocked[def.id]===true;
  totalEnemyDefeats=Math.max(0,Math.floor(Number(d.totalEnemyDefeats)||0));
  bestRanks={};if(d.bestRanks&&typeof d.bestRanks==="object")for(const [k,v] of Object.entries(d.bestRanks))if(["S","A","B","C"].includes(v))bestRanks[k]=v;
  jobVictoryRoster=Array.isArray(d.jobVictoryRoster)?[...new Set(d.jobVictoryRoster.filter(id=>characters.some(c=>c.id===id)))]:[];
  battleSpeed=Number(d.battleSpeed)===2?2:1;battleState.fast=battleSpeed===2;syncBattleSpeedUI();
  for(const k of Object.keys(eventRead))delete eventRead[k];if(d.eventRead&&typeof d.eventRead==="object")for(const [k,v] of Object.entries(d.eventRead))if(stageEvents.some(e=>e.id===k)&&v===true)eventRead[k]=true;
  if(d.audioSettings){if($("bgm-toggle")&&typeof d.audioSettings.bgmEnabled==="boolean")$("bgm-toggle").checked=d.audioSettings.bgmEnabled;if($("se-toggle")&&typeof d.audioSettings.seEnabled==="boolean")$("se-toggle").checked=d.audioSettings.seEnabled;bgmVolume=Math.max(0,Math.min(1,Number(d.audioSettings.bgmVolume??.15)));seVolume=Math.max(0,Math.min(1,Number(d.audioSettings.seVolume??.5)));}applyVolumeControls();persistAudioSettings();
  if(repairedStageProgress)persistAutoSave();
  if($("bgm-toggle")?.checked)startBgm();else stopBgm();renderAll();setSystemMessage(Number(d.saveVersion)>=2?"ロードしました。":"旧セーブデータを新しい装備形式に変換してロードしました。");sound("select");
}catch(e){setSystemMessage("セーブデータが不正か、存在しません。");sound("error");}}
function createEnemy(stage){
  if(battleState.hiddenBossMode){return {name:"混沌の幻影",element:"無属性",weaknesses:[],resistances:["炎","氷","雷","聖","斬撃","打撃","壊","突"],hp:7200,maxHp:7200,attack:145,defense:155,spAttack:165,spDefense:95,gold:0,sprite:"maou",actionName:"混沌の一撃",_breakMax:260,_breakCurrent:260};}
  const d=enemyData[stage-1];
  if(stage===2){
    const count=3+Math.floor(Math.random()*3);
    const members=Array.from({length:count},(_,i)=>({id:`goblin-${i+1}`,name:"ゴブリン",hp:d.hp,maxHp:d.hp,attack:d.attack,defense:d.defense,spDefense:Math.floor(d.defense/2),gold:d.gold,sprite:d.sprite,image:d.image,actionName:d.actionName,alive:true}));
    return {...d,spDefense:Math.floor(d.defense/2),members,hp:count*d.hp,maxHp:count*d.hp,gold:count*d.gold,memberCount:count};
  }
  return {...d,spDefense:Number.isFinite(d.spDefense)?d.spDefense:Math.floor(d.defense/2),hp:d.hp,maxHp:d.hp};
}
function resetTransientBattleState(){
  burnedTurns={};mageCompressionStacks.mage=0;goblinCharging=false;goblinTeamAttackUsed=false;goblinTeamAttackPending=false;defenseDownFresh=new Set();lastEnemyAttackMissed=false;specialOmenShown={};
  for(const c of characters){c._defenseDown=0;c._defenseDownTurns=0;for(const key of ["_stunTurns","stunTurns","_actionDisabledTurns","actionDisabledTurns"])if(key in c)c[key]=0;for(const key of ["_stunned","stunned","actionDisabled"])if(key in c)c[key]=false;}
  battleState.wolfEvasionTurns=0;battleState.wolfHalfHpEvasionUsed=false;battleState.wolfLastTargetId=null;battleState.wolfClones=[];battleState.wolfDisplayOrder=[];battleState.wolfCloneTurns=0;battleState.wolfCloneLastTargetId=null;battleState.wolfSplitPending=false;battleState.tauntTarget=null;battleState.enemyStunned=false;battleState.defenseCampTurns=0;battleState.magicGuardActive=false;battleState.fullGuardActive=false;battleState.knightFullGuardCooldown=0;battleState.aegisActive=false;battleState.bossBgmChoice=null;
}
function startBattle(stage=1){battleBgmSelections={};stageIntroStoryPending=false;maouIntroBgmPersistent=false;battleState.tutorialMode=false;state.firstStageStarted=true;try{localStorage.setItem("fantasyRpgSave",JSON.stringify(createSaveData()));}catch(e){}retryContext=null;battleState.hiddenBossMode=false;battleState.maxStage=5;resetTransientBattleState();battleState.koCount=0;battleState.rankResult=null;battleState.stage=Math.max(1,Math.min(state.maxUnlockedStage||1,Number(stage)||1));battleState.unionGauges={kotama:0,knight:0,healer:0,warrior:0,mage:0,samurai:0};getParty().forEach(c=>{c.hp=effectiveStats(c).maxHp;c.sp=c.maxSp;});beginStage();}
async function beginStageCore(){
  battleState.enemy=pendingBattleResumeEnemy||createEnemy(battleState.stage);pendingBattleResumeEnemy=null;registerEncounter(battleState.enemy.name);
  stageEntered[battleState.stage]=true;
  const breakMax=BATTLE_RULES.bosses[battleState.enemy.name]?.break||0;if(breakMax){battleState.enemy._breakMax=breakMax;battleState.enemy._breakCurrent=breakMax;}goblinCharging=false;goblinTeamAttackUsed=false;goblinTeamAttackPending=false;burnedTurns={};specialOmenShown={};battleState.wolfEvasionTurns=0;battleState.wolfHalfHpEvasionUsed=false;battleState.wolfLastTargetId=null;battleState.wolfClones=[];battleState.wolfDisplayOrder=[];battleState.wolfCloneTurns=0;battleState.wolfCloneLastTargetId=null;battleState.wolfSplitPending=false;if(battleState.stage===5&&!battleState.bossBgmChoice)battleState.bossBgmChoice=Math.random()<.5?"arc":"overture";
  battleState.turnCount=0;
  battleState.defenseCampTurns=0;battleState.magicGuardActive=false;battleState.fullGuardActive=false;battleState.knightFullGuardCooldown=0;mageCompressionStacks.mage=0;
  battleState.koCount=0;
  battleState.rankResult=null;
  battleState.busy=true;
  battleState.actions=[];
  battleState.consumedActors=[];
  battleState.guarding={};
  battleState.tauntTarget=null;
  battleState.enemyStunned=false;
  battleState.aegisActive=false;
  battleState.log=[];
  battleState.stageFinished=false;
  battleState.lastRewardGold=0;
  battleState.turnOrder=getParty().filter(c=>c.hp>0).map(c=>c.id);
  battleState.currentActorIndex=0;
  readyChimeKey="";
  $("battle-bottom")?.classList.remove("result-shown");
  $("battle-support").hidden=false;
  $("event-log").replaceChildren();
  $("stage-title").textContent=battleState.hiddenBossMode?"HIDDEN BOSS":"STAGE "+battleState.stage+" / "+battleState.maxStage;
  $("battle-result").hidden=true;
  $("retry-stage-button").hidden=true;$("formation-retry-button").hidden=true;$("return-home-button").hidden=true;
  $("battle-commands").hidden=false;
  $("next-stage-button").textContent="次へ";

  const arena=document.querySelector(".battle-arena");
  const isMaouStage=battleState.stage===5;
  arena?.classList.remove("maou-awaiting","maou-arrival","enemy-defeating","enemy-defeated","stage-arrival-pending");
  arena?.classList.add("stage-arrival-pending");
  if(isMaouStage)arena?.classList.add("maou-awaiting");

  const stageEventIds={1:"forest-intro",2:"goblin-intro",4:"dragon-intro",5:"maou-intro"};
  const introEvent=stageEvents.find(e=>e.id===stageEventIds[battleState.stage]&&!e.trigger);
  stageIntroStoryPending=!!(introEvent&&!eventRead[introEvent.id]);
  maouIntroBgmPersistent=false;
  battleStartSnapshot=createBattleStartSnapshot();
  showScreen("battle");
  renderBattle();
  const commandBox=$("battle-commands");
  if(commandBox){commandBox.inert=false;renderActionMenu(true);commandBox.inert=true;}
  if(!battleState.hiddenBossMode){await new Promise(resolve=>playStageEvent(battleState.stage,resolve));}
  stageIntroStoryPending=false;
  maouIntroBgmPersistent=false;
  if($("bgm-toggle")?.checked)startBgm();
  renderBattle();
  if(battleState.stage===1)pushEvent("スライムは物理攻撃が効きにくいようだ……SP攻撃を試そう！");
  const overlay=$("stage-transition");
  if(overlay){
    const title=$("stage-transition-title");
    title.textContent=isMaouStage?"第５ステージ":`第${battleState.stage}ステージ`;
    title.dataset.text=title.textContent;
    overlay.classList.remove("playing","maou-stage","maou-clear");
    overlay.classList.toggle("maou-stage",isMaouStage);
    overlay.hidden=false;
    overlay.setAttribute("aria-hidden","false");
    void overlay.offsetWidth;
    createStageParticles(isMaouStage?"maou-stage":"stage");
    overlay.classList.add("playing");
    await wait(isMaouStage?4600:4000);
    overlay.hidden=true;
    overlay.setAttribute("aria-hidden","true");
    overlay.classList.remove("playing","maou-stage");
  }
  if(isMaouStage&&arena){
    arena.classList.remove("stage-arrival-pending","maou-awaiting");
    arena.classList.add("maou-arrival");
    await wait(1500);
    arena.classList.remove("maou-arrival");
  }else if(battleState.enemy?.name==="ドラゴン"&&arena){
    arena.classList.remove("stage-arrival-pending");
    arena.classList.add("dragon-arrival");
    await wait(1050);
    arena.classList.remove("dragon-arrival");
  }else{
    arena?.classList.remove("stage-arrival-pending");
  }
  battleState.busy=false;
  if(commandBox)commandBox.inert=false;
  // showScreen() already selected the correct track. Do not restart it here:
  // restarting the boss MP3 after the stage intro caused the audible dip.
  $("battle-support").textContent="コマンドを選ぶと説明がここに表示されます。全員の選択後、行動が順番に再生されます。";
  pushEvent(`${battleState.enemy.name}が現れた！`);
  if(battleState.enemy.name==="ドラゴン")playSe(Math.random()<.5?"assets/se/tekikoudou/ドラゴンの鳴き声1":"assets/se/tekikoudou/ドラゴンの鳴き声2");
  renderBattle();
  if(battleState.enemy.name==="ドラゴン"){
    showEnemyOmen("dragon");
    await wait(650);
  }
  if(battleState.enemy.name==="魔王"){
    pushEvent("魔王「よくぞここまで辿り着いた、人間よ。」","maou-shake");
    await wait(2100);
    pushEvent("魔王「だが、この先に待つのは絶望のみだ。」","maou-shake");
    await wait(2100);
  }
  battleStartSnapshot=createBattleStartSnapshot();
  renderActionMenu();
}
// ステージ開始中の例外で戦闘画面が永久に操作不能にならないようにする。
async function beginStage(){
  try {
    await beginStageCore();
  } catch (error) {
    console.error("[Battle startup] ステージ開始処理でエラー:", error);
    battleState.busy=false;
    const arena=document.querySelector(".battle-arena");
    arena?.classList.remove("stage-arrival-pending","maou-awaiting","maou-arrival","dragon-arrival");
    const commands=$("battle-commands");
    if(commands) commands.inert=false;
    // 描画処理自体に問題がある場合でも、敵名と最低限の操作を復旧する。
    try { renderBattle(); } catch (renderError) {
      console.error("[Battle startup] 戦闘画面の描画復旧にも失敗:", renderError);
      const display=$("battle-enemy");
      if(display){
        display.querySelector(".enemy-image")?.remove();
        const placeholder=display.querySelector(".enemy-placeholder");
        if(placeholder){placeholder.hidden=false;placeholder.textContent=battleState.enemy?.name||"MONSTER";}
        const name=$("enemy-name");if(name)name.textContent=battleState.enemy?.name||"敵";
      }
      const party=$("battle-party");
      if(party)party.innerHTML=getParty().map(c=>`<article class="battle-member"><strong>${esc(c.name)}</strong><div>HP ${Math.max(0,c.hp)} / ${effectiveStats(c).maxHp}</div><div>SP ${c.sp} / ${c.maxSp}</div></article>`).join("");
    }
    try { renderActionMenu(); } catch (menuError) {
      console.error("[Battle startup] コマンド復旧にも失敗:", menuError);
      const title=$("command-title"),box=$("battle-commands");
      if(title)title.textContent="コマンドを選択してください";
      if(box){box.hidden=false;box.innerHTML='<button class="command-option" data-recovery-action="attack">攻撃</button><button class="command-option" data-recovery-action="guard">防御</button>';box.querySelector('[data-recovery-action="attack"]')?.addEventListener("click",()=>targetEnemy({type:"attack",actor:currentActor()?.id}));box.querySelector('[data-recovery-action="guard"]')?.addEventListener("click",()=>{const actor=currentActor();if(actor)commitAction({type:"guard",actor:actor.id});});}
    }
    pushLog("戦闘開始時に問題が発生したため、操作可能な状態に復旧しました。画面を確認してください。");
    setSystemMessage(`戦闘開始エラー：${error?.message||"原因不明"}。操作状態を復旧しました。`);
  }
}

function createStageParticles(mode="stage"){
  const particles=$("stage-particles");
  if(!particles)return;
  particles.replaceChildren();
  const count=mode==="maou-clear"?54:mode==="maou-stage"?52:48;
  for(let i=0;i<count;i++){
    const dot=document.createElement("i");
    if(mode==="maou-stage"){
      dot.style.setProperty("--x",`${Math.random()*100}vw`);
      dot.style.setProperty("--y",`${Math.random()*100}vh`);
      dot.style.setProperty("--delay",`${Math.random()*.7}s`);
    }else if(mode==="maou-clear"){
      dot.style.setProperty("--x","50%");
      dot.style.setProperty("--y","50%");
      dot.style.setProperty("--dx",`${(Math.random()-.5)*560}px`);
      dot.style.setProperty("--dy",`${(Math.random()-.5)*460}px`);
      dot.style.setProperty("--delay",`${Math.random()*.35}s`);
    }else{
      const titleRect=$("stage-transition-title")?.getBoundingClientRect();
      const hasTitle=!!titleRect&&titleRect.width>0&&titleRect.height>0;
      const x=hasTitle?titleRect.left+Math.random()*titleRect.width:window.innerWidth*(.2+Math.random()*.6);
      const y=hasTitle?titleRect.top+Math.random()*titleRect.height:window.innerHeight*(.35+Math.random()*.3);
      // Start at the title, then send each particle to a different point across the full viewport.
      const targetX=Math.random()*window.innerWidth;
      const targetY=Math.random()*window.innerHeight;
      dot.style.setProperty("--x",`${x}px`);
      dot.style.setProperty("--y",`${y}px`);
      dot.style.setProperty("--dx",`${targetX-x}px`);
      dot.style.setProperty("--dy",`${targetY-y}px`);
      dot.style.setProperty("--delay",`${2.35+Math.random()*.35}s`);
    }
    particles.appendChild(dot);
  }
}
async function playMaouClearAnimation(){
  const overlay=$("stage-transition");
  if(!overlay)return;
  const title=$("stage-transition-title");
  title.textContent="魔王討伐";
  title.dataset.text=title.textContent;
  overlay.classList.remove("playing","maou-stage");
  overlay.classList.add("maou-clear");
  overlay.hidden=false;
  overlay.setAttribute("aria-hidden","false");
  void overlay.offsetWidth;
  createStageParticles("maou-clear");
  overlay.classList.add("playing");
  await wait(3300);
  overlay.hidden=true;
  overlay.setAttribute("aria-hidden","true");
  overlay.classList.remove("playing","maou-clear");
}
function refreshBattleLog(){
  const currentTurn=battleState.turnCount+1;
  battleState.log=battleState.log.filter(entry=>entry.turn>=currentTurn-1&&entry.turn<=currentTurn);
  const box=$("battle-log");
  if(box){box.innerHTML=battleState.log.map(entry=>`<p>${esc(entry.message)}</p>`).join("");box.scrollTop=box.scrollHeight;}
}
function pushLog(message){
  const turn=battleState.turnCount+1;
  const last=battleState.log[battleState.log.length-1];
  if(!last||last.message!==message||last.turn!==turn)battleState.log.push({turn,message});
  refreshBattleLog();renderBattleLogDialog();
  const m=$("battle-message");if(m)m.textContent=message;
}
function renderBattleLogDialog(){const source=$("battle-log"),target=$("battle-log-dialog-content");if(source&&target){target.innerHTML=source.innerHTML;target.scrollTop=target.scrollHeight;}}
function pushEvent(message,variant=""){
  const box=$("event-log");
  if(box){const p=document.createElement("p");if(variant)p.className=`event-${variant}`;if(variant==="maou-shake"){p.innerHTML=[...message].map((ch,i)=>`<span class="maou-shake-char" style="--shake-index:${i}">${esc(ch)}</span>`).join("");}else p.textContent=message;box.replaceChildren(p);box.scrollTop=0;}
  pushLog(message);
}
function animateEnemyAttack(){const display=$("battle-enemy");if(!display)return;display.classList.remove("enemy-attacking");void display.offsetWidth;display.classList.add("enemy-attacking");setTimeout(()=>{display.querySelectorAll(".enemy-group-unit").forEach(el=>{el.classList.remove("battle-bob");void el.offsetWidth;el.classList.add("battle-bob");});},0);clearTimeout(display._enemyAttackTimer);display._enemyAttackTimer=setTimeout(()=>display.classList.remove("enemy-attacking"),battleDelayMs(700));}
function animatePartyIcon(id){const el=document.querySelector(`.battle-member[data-party-id="${id}"]`);if(!el)return;el.classList.remove("battle-bob");void el.offsetWidth;el.classList.add("battle-bob");clearTimeout(el._battleBobTimer);el._battleBobTimer=setTimeout(()=>el.classList.remove("battle-bob"),battleDelayMs(720));}
function flashPartyGuard(id){const el=document.querySelector(`.battle-member[data-party-id="${id}"]`);if(!el)return;el.classList.remove("guard-flash");void el.offsetWidth;el.classList.add("guard-flash");clearTimeout(el._guardFlashTimer);el._guardFlashTimer=setTimeout(()=>el.classList.remove("guard-flash"),battleDelayMs(520));}
function animateEnemyIcons(target){setTimeout(()=>{const enemy=battleState.enemy;let el=null;if(target?.kind==="member")el=document.querySelector(`[data-enemy-id="${target.ref?.id}"]`);else if(target?.kind==="clone")el=document.querySelector(`[data-enemy-id="${target.ref?.id}"]`);else if(enemy?.name==="オオカミ")el=document.querySelector(`[data-enemy-id="wolf-main"]`);else el=$("battle-enemy")?.querySelector(".enemy-image,.enemy-placeholder");if(!el&&enemy?.members)el=document.querySelector(".enemy-group-unit");if(!el)return;el.classList.remove("battle-bob");void el.offsetWidth;el.classList.add("battle-bob");},0);}
function showEnemyOmen(kind="generic"){
  const lines={
    generic:["何かが起こりそうな気配がする……","不穏な空気が辺りを包む……","敵の様子が変わった……","嫌な予感がする……","周囲の空気が張り詰める……","敵から異様な気配が漂う……"],
    maou:["魔王の周囲に不気味な力が集まり始めた……","魔王の気配が、さらに禍々しくなる……","魔王の魔力が大きく揺らいでいる……","魔王の周囲に、暗い気配が渦巻く……","魔王は静かに力を蓄えている……"],
    dragon:["ドラゴンの周囲に不穏な炎が渦巻いている……！"]
  };
  const list=lines[kind]||lines.generic;
  const message=list[Math.floor(Math.random()*list.length)];
  pushEvent(message,"warning");
  const display=$("battle-enemy");if(!display)return;
  const cls=kind==="maou"?"maou-ominous":kind==="dragon"?"dragon-ominous":"enemy-ominous";
  display.classList.remove("maou-ominous","enemy-ominous","dragon-ominous");void display.offsetWidth;display.classList.add(cls);
  clearTimeout(maouOmenTimer);maouOmenTimer=setTimeout(()=>display.classList.remove(cls),battleDelayMs(3200));
}
function showMaouOmen(){showEnemyOmen("maou");}
function displayEnemyNode(){return $("battle-enemy");}
function combatNumber(target,text,kind="damage"){const node=typeof target==="string"?document.querySelector(`[data-party-id="${target}"]`):target;if(!node)return;const n=document.createElement("span");n.className=`combat-number ${kind}`;n.textContent=text;node.appendChild(n);setTimeout(()=>n.remove(),battleDelayMs(1350));}
function flashEnemyDamage(){
  const target=$("battle-enemy")?.querySelector(".enemy-image,.enemy-placeholder");
  if(!target)return;
  clearTimeout(target._damageFlashTimer);target.classList.remove("damage-flash");void target.offsetWidth;target.classList.add("damage-flash");
  target._damageFlashTimer=setTimeout(()=>target.classList.remove("damage-flash"),battleDelayMs(300));
}
async function applyPartyDamageAnimated(character,damage,options={}){
  let requested=Math.max(0,Math.floor(Number(damage)||0));
  if(!character||requested<=0||character.hp<=0)return 0;
  if(battleState.fullGuardActive&&character.id!=="knight"&&!options.bypassMitigation&&!options.statusDamage){
    const knight=getCharacter("knight");
    if(knight&&knight.hp>0){
      const originalStats=effectiveStats(character),knightStats=effectiveStats(knight);
      if(options.normalAttack){const priorGuard=battleState.guarding[character.id]||0;const unguarded=priorGuard<1?requested/(1-priorGuard):requested;const raw=unguarded+originalStats.defense;requested=calcPhysical(raw,knightStats.defense);}
      else if(options.element||options.magic||options.spAttack){const priorGuard=battleState.guarding[character.id]?0.5:0;const unguarded=priorGuard<1?requested/(1-priorGuard):requested;const raw=unguarded+originalStats.spDefense;requested=calcSp(raw,knightStats.spDefense);}
      requested=Math.floor(requested*(1-(battleState._fullGuardReduction||.4)));
      character=knight;
    }
  }
  if(!options.sureHit&&Math.random()<partyEvasionRate(character)){
    pushEvent(`${character.name}は攻撃を回避した！`);
    renderBattle();
    return 0;
  }
  if(!options.bypassMitigation){
    if(battleState.guarding[character.id])requested=Math.floor(requested*(1-treeBonus(character.id,"guard")));
    if(battleState.tauntTarget===character.id)requested=Math.floor(requested*(1-treeBonus(character.id,"taunt")));
    if(options.normalAttack&&character.id==="knight")requested=Math.floor(requested*BATTLE_RULES.passives.knight.normalDamageTaken);
    if(options.element)requested=Math.floor(requested*(1-partyElementalDamageReduction(character,options.element)));
    if(battleState.magicGuardActive&&!options.statusDamage&&(options.magic||options.element||options.spAttack))requested=Math.floor(requested*(1-(battleState._magicGuardRate||.5)));
    requested=Math.floor(requested*(1-partyDamageReduction(character)));
  }
  if(requested<=0)return 0;
  const previousHp=character.hp, amount=Math.min(character.hp,requested);
  if(!battleState.guarding[character.id])playSe("assets/se/senntou/ダメージ");
  animatePartyIcon(character.id);
  character._hpBeforeDamage=previousHp;
  clearTimeout(character._hpPreviewTimer);
  character.hp=Math.max(0,character.hp-amount);
  if(previousHp>0&&character.hp<=0){if(character.id==="mage")mageCompressionStacks.mage=0;battleState.koCount=(battleState.koCount||0)+1;battleState.unionGauges[character.id]=0;pushEvent(`${character.name}は戦闘不能になった！ ユニオンゲージが0に戻った。`,"warning");}
  renderBattle();
  character._hpPreviewTimer=setTimeout(()=>{delete character._hpBeforeDamage;renderBattle();},battleDelayMs(720));
  const card=document.querySelector(`.battle-member[data-party-id="${character.id}"]`);
  if(card){clearTimeout(card._damageFlashTimer);card.classList.remove("damage-flash");void card.offsetWidth;card.classList.add("damage-flash");card._damageFlashTimer=setTimeout(()=>card.classList.remove("damage-flash"),battleDelayMs(300));}
  combatNumber(character.id,`-${amount}`,"damage");
  await wait(720);
  return amount;
}
function battleDelayMs(ms){return Math.max(0,Math.round(ms/(battleSpeed===2?2:1)));}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,battleDelayMs(ms)));}
function syncBattleSpeedUI(){const b=$("skip-button");if(b){b.textContent=battleSpeed===2?"戦闘速度：2.0x":"戦闘速度：1.0x";b.setAttribute("aria-pressed",String(battleSpeed===2));}document.body?.classList.toggle("battle-speed-fast",battleSpeed===2);}
function calcDamage(attack,defense,guarding=false){
  const atk=Math.max(0,Math.floor(Number(attack)||0));
  const def=Math.max(0,Math.floor(Number(defense)||0));
  const raw=atk-def;
  if(guarding||atk<=0)return raw>0?raw:0;
  return Math.max(Math.floor(atk*.1),raw,1);
}
function calcPhysical(attack,defense,guarding=false){return calcDamage(attack,defense,guarding);}
function beginEnemyDamagePreview(enemy){if(!enemy)return;enemy._hpBeforeDamage=enemy.hp;clearTimeout(enemy._hpPreviewTimer);enemy._hpPreviewTimer=setTimeout(()=>{delete enemy._hpBeforeDamage;renderBattle();},battleDelayMs(720));}
function calcEnemyPhysicalDamage(enemy,attack){
  const target=enemy?.members?.find(m=>m.hp>0)||enemy;
  const base=calcPhysical(attack,target.defense);
  if(battleState.tutorialMode&&enemy?.name==="スライムa")return Math.max(1,Math.floor(base*.03));
  if(target.name!=="スライム")return base;
  return base>0?Math.max(Math.floor(attack*.1),Math.floor(base*(target.physicalDamageRate??enemy.physicalDamageRate??.18)),1):0;
}
function enemyHpTotal(enemy){if(!enemy)return 0;if(enemy.members)return enemy.members.reduce((n,m)=>n+Math.max(0,m.hp),0);return Math.max(0,enemy.hp);}
// 乱れ斬り用：現在生存している「個体」を列挙する。集団敵は個体ごと、
// オオカミ戦では本体と幻影を別々の対象として扱う。
function livingEnemyTargets(enemy){
  if(!enemy)return [];
  if(enemy.members)return enemy.members.filter(m=>m.hp>0).map(member=>({kind:"member",ref:member}));
  const targets=[];
  if(enemy.hp>0)targets.push({kind:"main",ref:enemy});
  if(enemy.name==="オオカミ")(battleState.wolfClones||[]).filter(c=>c.hp>0).forEach(clone=>targets.push({kind:"clone",ref:clone}));
  return targets;
}
function applyDamageToEnemyTarget(enemy,target,amount){
  if(!target||!target.ref||amount<=0)return 0;
  const value=Math.max(0,Math.floor(amount));
  if(target.kind==="clone")animateEnemyIcons(target);
  if(target.kind==="main")return applyDamageToEnemy(enemy,value);
  if(target.kind==="clone"){
    const clone=target.ref;const dealt=Math.min(clone.hp,value);clone.hp=Math.max(0,clone.hp-dealt);
    if(clone.hp<=0)pushEvent("オオカミの偽物は霧となって消えた……！");
    return dealt;
  }
  const unit=target.ref;
  if(target.kind==="member"){
    animateEnemyIcons(target);
    const dealt=Math.min(unit.hp,value);unit.hp=Math.max(0,unit.hp-dealt);
    enemy.hp=enemy.members.reduce((n,m)=>n+Math.max(0,m.hp),0);
    return dealt;
  }
  return 0;
}
function applyDamageToEnemy(enemy,amount){
  if(!enemy||amount<=0)return 0;
  animateEnemyIcons({kind:"main"});
  if(enemy.members){const target=enemy.members.find(m=>m.hp>0);if(!target)return 0;const dealt=Math.min(target.hp,Math.max(0,Math.floor(amount)));target.hp-=dealt;enemy.hp=enemy.members.reduce((n,m)=>n+Math.max(0,m.hp),0);return dealt;}
  lastEnemyAttackMissed=false;
  if(enemy.name==="オオカミ"&&enemy.hp>0&&enemy.hp<=enemy.maxHp*.5&&!battleState.wolfHalfHpEvasionUsed){battleState.wolfHalfHpEvasionUsed=true;lastEnemyAttackMissed=true;combatNumber(displayEnemyNode(),"MISS","miss");pushEvent("オオカミは危機を察知し、攻撃を回避した！");return 0;}
  if(enemy.name==="オオカミ"&&battleState.wolfEvasionTurns>0&&Math.random()<.30){lastEnemyAttackMissed=true;combatNumber(displayEnemyNode(),"MISS","miss");return 0;}
  // 本体への攻撃は本体に適用する。幻影を狙った攻撃だけが幻影HPを減らす。
  const breakMultiplier=enemy._brokenTurns>0?1.2:1;const dealt=Math.min(enemy.hp,Math.max(0,Math.floor(amount*breakMultiplier)));enemy.hp=Math.max(0,enemy.hp-dealt);if(enemy.name==="オオカミ"&&enemy.hp<=0){battleState.wolfClones=[];battleState.wolfDisplayOrder=[];battleState.wolfCloneTurns=0;}return dealt;
}
function calcSp(spAttack,spDefense,guarding=false){return calcDamage(spAttack,spDefense,guarding);}
function effectiveSpDefense(c){const s=effectiveStats(c);return s.spDefense;}
function currentActor(){return getCharacter(battleState.turnOrder[battleState.currentActorIndex]);}
function isActionIncapacitated(c){return !!c&&((c._actionDisabledTurns||0)>0||(c._stunTurns||0)>0||(c.actionDisabledTurns||0)>0||(c.stunTurns||0)>0||c._stunned||c.stunned||c.actionDisabled);}
function consumeIncapacitatedTurn(c){if(!c)return;const remaining=Math.max(0,(c._actionDisabledTurns||c._stunTurns||c.actionDisabledTurns||c.stunTurns||1)-1);if("_actionDisabledTurns" in c||"_stunTurns" in c){c._actionDisabledTurns=remaining;c._stunTurns=remaining;}else if("actionDisabledTurns" in c||"stunTurns" in c){c.actionDisabledTurns=remaining;c.stunTurns=remaining;}if(remaining===0){c._stunned=false;c.stunned=false;c.actionDisabled=false;}if(c.id==="mage")mageCompressionStacks.mage=0;pushLog(`${c.name}は拘束されて行動できなかった！${remaining>0?` 残り${remaining}ターン。`:""}`);renderBattle();}
function livingParty(){return getParty().filter(c=>c.hp>0);}
function chargeGauge(c,n=1){const u=unionSkills[c.id];if(u)battleState.unionGauges[c.id]=Math.min(u.requiredHits,(battleState.unionGauges[c.id]||0)+n);}
function partyDamageReduction(character){const items=uniqueEquippedItems(character);return Math.min(.5,items.reduce((n,i)=>n+(i.damageReduction||0),0)+(character.hp<=effectiveStats(character).maxHp*.3?items.reduce((n,i)=>n+(i.lowHpReduction||0),0):0));}
function partyEvasionRate(character){return Math.min(.5,uniqueEquippedItems(character).reduce((n,i)=>n+(i.evasionRate||0),0));}
function partyElementalDamageReduction(character,element){const values=uniqueEquippedItems(character).map(item=>{if(item.elementResistances?.includes(element))return Number(item.elementDamageReduction)||0;if(element==="炎")return Number(item.fireDamageReduction)||0;return 0;});return Math.min(.5,values.reduce((a,b)=>a+b,0));}
function getWeaponPhysicalElement(character){
  if(!character)return "無属性";
  const slots=equipment[character.id]||{};
  const weaponId=slots.weapon||slots.katana1||slots.katana2;
  const weapon=itemById(weaponId);
  return weapon?.physicalElement||"無属性";
}
function enemyElementMultiplier(enemy,element){if(!element||element==="無属性")return 1;if(enemy?.immunities?.includes(element))return BATTLE_RULES.elements.immune;if(enemy?.weaknesses?.includes(element))return BATTLE_RULES.elements.weak;if(enemy?.physicalResistances?.includes(element))return BATTLE_RULES.elements.resist;if(enemy?.resistances?.includes(element))return BATTLE_RULES.elements.resist;return 1;}
function applyElementalDamage(enemy,damage,element){const mult=enemyElementMultiplier(enemy,element);const value=Math.max(0,Math.floor(damage*mult));if(mult>1)pushLog("弱点！");else if(mult<1)pushLog("耐性！");return value;}
function applyWeaponAttributeDamage(enemy,damage,character){return applyElementalDamage(enemy,damage,getWeaponPhysicalElement(character));}
function addBreakDamage(enemy,kind="normal",element="無属性",actor=null){
  if(!enemy||!enemy._breakMax||enemy.hp<=0)return 0;
  const mult=enemyElementMultiplier(enemy,element);
  const base=BATTLE_RULES.break[kind]||BATTLE_RULES.break.normal;
  const accessoryBonus=actor?uniqueEquippedItems(actor).reduce((n,item)=>n+(item.breakRate||0),0):0;
  const elemental=mult>1?BATTLE_RULES.break.weak:mult<1?BATTLE_RULES.break.resist:1;
  const amount=Math.floor(base*elemental*(1+accessoryBonus+treeBonus(actor?.id,"break"))*(enemy._breakDamageTakenMultiplier||1));
  enemy._breakCurrent=Math.max(0,(enemy._breakCurrent??enemy._breakMax)-amount);
  if(enemy._breakCurrent<=0&&!enemy._brokenTurns){enemy._brokenTurns=1;pushEvent("BREAK！ 敵の体勢を崩した！","warning");sound("guard",true);}
  return amount;
}
function checkBossTransformation(enemy){if(!enemy||!(["ドラゴン","魔王"].includes(enemy.name))||enemy._transformed||enemy.hp>enemy.maxHp*.5)return;enemy._transformed=true;if(enemy.name==="ドラゴン"){enemy.attack=Math.floor(enemy.attack*1.2);enemy.spAttack=Math.floor((enemy.spAttack||0)*1.2);enemy._breakDamageTakenMultiplier=.8;enemy._burnChance=.4;enemy._form="awakened";pushEvent("ドラゴンは怒りに燃え、真の力を解放した！","warning");}else{enemy.attack=Math.floor(enemy.attack*1.25);enemy.spAttack=Math.floor((enemy.spAttack||0)*1.25);enemy.defense=Math.floor(enemy.defense*1.2);enemy._breakDamageTakenMultiplier=.8;enemy._form="awakened";pushEvent("魔王は第二形態へと変貌した！","warning");}const display=$("battle-enemy");display?.classList.add("boss-transformed");setTimeout(()=>display?.classList.remove("boss-transformed"),battleDelayMs(1500));}
function displayBreakTrack(){const track=document.getElementById("enemy-break-track");return track;}
function renderBattle(){const e=battleState.enemy;if(!e)return;$("turn-counter").textContent=`第${battleState.turnCount+1}ターン　${battleState.busy?"行動処理中":"行動選択"}`;$("enemy-name").textContent=e.name;$("enemy-hp-text").textContent="";$("enemy-hp-text").setAttribute("aria-hidden","true");const enemyCurrentPct=enemyHpTotal(e)/e.maxHp*100;
  const enemyBar=$("enemy-hp-bar");enemyBar.style.width=`${enemyCurrentPct}%`;
  const breakMax=e._breakMax||0;let breakTrack=displayBreakTrack();breakTrack?.classList.toggle("maou-break-track",e.name==="魔王");if(breakMax){breakTrack.hidden=false;breakTrack.querySelector("i").style.width=`${Math.max(0,e._breakCurrent??breakMax)/breakMax*100}%`;breakTrack.querySelector("span").textContent=e._brokenTurns>0?"BREAK！":`BREAK ${Math.max(0,e._breakCurrent??breakMax)} / ${breakMax}`;}else if(breakTrack)breakTrack.hidden=true;
  let enemyTrack=enemyBar.parentElement;let enemyLoss=enemyTrack.querySelector(".hp-loss-preview");if(!enemyLoss){enemyLoss=document.createElement("div");enemyLoss.className="hp-loss-preview";enemyTrack.appendChild(enemyLoss);}const enemyBefore=Number(e._hpBeforeDamage);if(Number.isFinite(enemyBefore)&&enemyBefore>e.hp){enemyLoss.style.left=`${Math.max(0,e.hp)/e.maxHp*100}%`;enemyLoss.style.width=`${(Math.min(e.maxHp,enemyBefore)-Math.max(0,e.hp))/e.maxHp*100}%`;enemyLoss.hidden=false;}else enemyLoss.hidden=true;
  const display=$("battle-enemy"),placeholder=display.querySelector(".enemy-placeholder");
  const liveWolfClones=(battleState.wolfClones||[]).filter(c=>c.hp>0);const splitWolf=e.name==="オオカミ"&&liveWolfClones.length>0;
  display.classList.toggle("enemy-individual-hp",!!e.members||splitWolf);
  let img=display.querySelector(".enemy-image");
  if(e.members){
    img?.remove();placeholder.hidden=true;
    let group=display.querySelector(".enemy-group");if(!group){group=document.createElement("div");group.className="enemy-group";display.prepend(group);}
    group.innerHTML=e.members.map(m=>m.hp>0?`<div class="enemy-group-unit" data-enemy-id="${esc(m.id)}"><img src="${esc(m.image)}" alt="${esc(m.name||"ゴブリン")}"><span>${esc(m.displayName||m.name||m.id.replace("goblin-","ゴブリン "))}</span><div class="enemy-unit-hp"><i style="width:${Math.max(0,m.hp)/m.maxHp*100}%"></i></div><small>${Math.max(0,m.hp)} / ${m.maxHp}</small></div>`:"").join("");
  }else{
    display.querySelector(".enemy-group")?.remove();
    if(e.image){
      if(!img||img.dataset.enemyImage!==e.image){img?.remove();img=document.createElement("img");img.className="enemy-image";img.dataset.enemyImage=e.image;img.src=e.image;img.alt=e.name;img.onerror=()=>{img.remove();if(placeholder){placeholder.hidden=false;placeholder.textContent=({slime:"SLIME",goblin:"GOBLIN",wolf:"WOLF",dragon:"DRAGON",maou:"MAOU"})[e.sprite]||"MONSTER";};};display.prepend(img);}else img.alt=e.name;
      if(placeholder)placeholder.hidden=true;
    }else{img?.remove();if(placeholder){placeholder.hidden=false;placeholder.textContent=({slime:"SLIME",goblin:"GOBLIN",wolf:"WOLF",dragon:"DRAGON",maou:"MAOU"})[e.sprite]||"MONSTER";}}
    display.classList.remove("wolf-split");
    document.querySelector(".wolf-clone-panel")?.remove();
    if(e.name==="オオカミ"&&liveWolfClones.length>0){
      img?.remove();
      let group=display.querySelector(".enemy-group");if(!group){group=document.createElement("div");group.className="enemy-group wolf-enemy-group";display.prepend(group);}
      const wolfBuffs=battleState.wolfEvasionTurns>0?`<span class="enemy-unit-buff">警鐘・回避上昇 ${battleState.wolfEvasionTurns}T</span>`:"";
      const realUnit=`<div class="enemy-group-unit wolf-unit" data-enemy-id="wolf-main"><img src="${esc(e.image||"")}" alt="オオカミ"><span>オオカミ</span><div class="enemy-unit-hp"><i style="width:${Math.max(0,e.hp)/e.maxHp*100}%"></i></div><div class="enemy-unit-buffs">${wolfBuffs}</div></div>`;
      const fakeUnits=liveWolfClones.map(c=>`<div class="enemy-group-unit wolf-unit" data-enemy-id="${esc(c.id)}"><img src="${esc(e.image||"")}" alt="オオカミ"><span>オオカミ</span><div class="enemy-unit-hp"><i style="width:${Math.max(0,c.hp)/c.maxHp*100}%"></i></div><div class="enemy-unit-buffs">${wolfBuffs}</div></div>`);
      // 表示順だけ毎回の分身時にランダム化。本物のHPは本体、偽物は個別HPで管理。
      const unitMarkup={"wolf-main":realUnit,...Object.fromEntries(liveWolfClones.map((c,i)=>[c.id,fakeUnits[i]]))};
      group.innerHTML=(battleState.wolfDisplayOrder?.length?battleState.wolfDisplayOrder:["wolf-main",...liveWolfClones.map(c=>c.id)]).filter(id=>unitMarkup[id]).map(id=>unitMarkup[id]).join("");
    }
  }
  const statusHost=display.querySelector(".enemy-status-list")||document.createElement("div");statusHost.className="enemy-status-list";
  const enemyStatuses=[];
  if(e.name==="オオカミ"&&!splitWolf&&battleState.wolfEvasionTurns>0)enemyStatuses.push(`<span class="enemy-status-buff">警鐘 回避上昇 ${battleState.wolfEvasionTurns}T</span>`);
  
  if(Number(e._defenseDownTurns)>0)enemyStatuses.push(`<span class="enemy-status-debuff">防御力低下 ${e._defenseDownTurns}T</span>`);
  statusHost.innerHTML=enemyStatuses.join("");
  const hpTrack=display.querySelector(".hp-track");if(hpTrack&&statusHost.parentElement!==display)display.insertBefore(statusHost,hpTrack);
  statusHost.hidden=enemyStatuses.length===0;
  $("battle-party").innerHTML=getParty().map(c=>{const u=unionSkills[c.id],g=battleState.unionGauges[c.id]||0,ready=!!u&&g>=u.requiredHits,active=c.id===currentActor()?.id,incapacitated=isActionIncapacitated(c);return `<article class="battle-member ${active&&!battleState.busy?"active-turn":""} ${(battleState.actingIds||[]).includes(c.id)?"acting-turn":""} ${incapacitated&&c.hp>0?"action-incapacitated":""}${c.hp<=0?"dead":""} ${ready?"union-ready":""}" data-party-id="${c.id}"><div class="battle-portrait ${c.id==="healer"?"healer-portrait":c.id==="mage"?"mage-portrait":""}"><img src="${esc(c.image)}" alt="${esc(c.name)}" onerror="this.parentElement.classList.add('portrait-missing');this.remove()"></div><div class="member-head"><strong>${esc(c.name)}${burnedTurns[c.id]>0?' <span class="status-burn" title="火傷：残り'+burnedTurns[c.id]+'ターン">🔥火傷 '+burnedTurns[c.id]+'</span>':""}${c._defenseDownTurns>0?' <span class="status-down" title="防御力低下：残り'+c._defenseDownTurns+'ターン">▼防御↓ '+c._defenseDownTurns+'</span>':""}</strong><span>${c.hp<=0?"戦闘不能":incapacitated?"行動不能":active&&!battleState.busy?"> 行動選択中":""}</span></div><div class="battle-gauge-label"><span>HP</span><strong>${Math.max(0,c.hp)} / ${effectiveStats(c).maxHp}</strong></div><div class="hp-track"><div class="hp-fill" style="width:${Math.max(0,c.hp)/effectiveStats(c).maxHp*100}%"></div><div class="hp-loss-preview" style="left:${Math.max(0,c.hp)/effectiveStats(c).maxHp*100}%;width:${Number.isFinite(c._hpBeforeDamage)&&c._hpBeforeDamage>c.hp?(Math.min(effectiveStats(c).maxHp,c._hpBeforeDamage)-Math.max(0,c.hp))/effectiveStats(c).maxHp*100:0}%" ${Number.isFinite(c._hpBeforeDamage)&&c._hpBeforeDamage>c.hp?"":"hidden"}></div></div><div class="battle-gauge-label sp-gauge-label"><span>SP</span><strong>${c.sp} / ${c.maxSp}</strong></div><div class="sp-track"><div class="sp-fill" style="width:${c.sp/c.maxSp*100}%"></div></div><div class="union-mini">UNION ${g}/${u?.requiredHits||0}<div class="union-track"><i style="width:${u?g/u.requiredHits*100:0}%"></i></div></div></article>`;}).join("");}
function renderActionMenu(forceRender=false){if(battleState.busy&&!forceRender)return;let skipped=0;while(currentActor()&&currentActor().hp>0&&isActionIncapacitated(currentActor())){const blocked=currentActor();consumeIncapacitatedTurn(blocked);battleState.currentActorIndex++;skipped++;}if(skipped)renderBattle();if(skipped&&battleState.currentActorIndex>=battleState.turnOrder.length){battleState.busy=true;renderBattle();executeTurn();return;}setCommandDescription("攻撃：敵に通常攻撃を行います。敵の防御力によってダメージが変化します。SPスキル：SPを消費して、敵の防御を貫通する攻撃などを行います。防御：敵の攻撃に備えて受けるダメージを軽減します。");const actor=currentActor(),box=$("battle-commands");if(!actor){executeTurn();return;}const uReady=unionSkills[actor.id]&&(battleState.unionGauges[actor.id]||0)>=unionSkills[actor.id].requiredHits;const chimeKey=`${battleState.stage}:${battleState.turnCount}:${actor.id}`;if(uReady&&readyChimeKey!==chimeKey){readyChimeKey=chimeKey;playReadyChime();}$("command-title").textContent=`${actor.name}　どうする？`;box.hidden=false;battleState.menuMode="main";box.innerHTML=`<button class="command-option" data-action="attack" data-description="敵に通常攻撃を行います。敵の防御力によってダメージが変化します。">攻撃</button><button class="command-option" data-action="skill" data-description="SPを消費して強力なスキルを使用します。スキルごとに効果や属性が異なります。" ${isSkillRestricted(actor)?"disabled":""}>SPスキル${isSkillRestricted(actor)?"（装備適性なし）":""}</button><button class="command-option" data-action="guard" data-description="このターンに受けるダメージを軽減します。防御中はユニオンゲージが増加しません。">防御</button><button class="command-option" data-action="item" data-description="所持している道具を使用します。回復薬などで味方を支援できます。">道具</button><div class="union-panel"><div class="window-title">ユニオンスキル</div><div class="union-list">${unionOption(actor)}</div></div>${battleState.currentActorIndex>0?'<button class="command-option back-option" data-action="back">前のキャラへ戻る</button>':''}`;
  box.querySelectorAll("[data-description]").forEach(b=>b.addEventListener("focus",()=>setCommandDescription(b.dataset.description)));box.querySelectorAll("[data-description]").forEach(b=>b.addEventListener("pointerenter",()=>setCommandDescription(b.dataset.description)));box.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.description)setCommandDescription(b.dataset.description);sound("select");const a=b.dataset.action;if(a==="attack")targetEnemy({type:"attack",actor:actor.id});else if(a==="guard")commitAction({type:"guard",actor:actor.id});else if(a==="skill")renderSkillMenu(actor);else if(a==="item")renderItemMenu(actor);else if(a==="back")undoPrevious();}));box.querySelectorAll("[data-union]").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.description)setCommandDescription(b.dataset.description);sound("select",true);const type=b.dataset.union;if(type==="cross-break")renderPartnerMenu(actor);else commitAction({type:"union",actor:actor.id});}));$("command-hint").textContent=`${actor.name}の行動を選択してください。全員の選択後、行動が順番に再生されます。`;tutorialSyncCommandLock();}
function setCommandDescription(message){const panel=$("command-description");if(panel)panel.textContent=message||"コマンドを選択すると、効果の説明がここに表示されます。";}
function isSkillRestricted(c){return equippedItems(c).some(i=>!(i.classes||[]).includes(c.id));}
function unionSkillDescription(c,u){const details={stun:"敵単体に大ダメージを与え、行動を妨害するコタマ専用のユニオンスキルです。",aegis:"味方全体を強力な障壁で守り、次に受けるダメージを大幅に軽減する騎士専用スキルです。", "full-heal":"味方全体のHPを大きく回復する治癒士専用スキルです。", "cross-break":"仲間と連携して敵に強烈な連続攻撃を行う戦士専用スキルです。",meteor:"敵全体に強力な魔法ダメージを与える魔法使い専用スキルです。", "samurai-slash":"敵を一刀で斬り伏せる高威力の単体攻撃です。"};return `${u.name}：${details[u.type]||"キャラクター固有の強力な必殺技です。"} 発動にはユニオンゲージが必要です。`;}
function unionOption(c){const u=unionSkills[c.id],g=battleState.unionGauges[c.id]||0;if(!u)return "";const ready=g>=u.requiredHits,blocked=isSkillRestricted(c);return `<button class="command-option union-command ${ready?"union-command-ready":""}" data-union="${u.type}" data-description="${esc(unionSkillDescription(c,u))}" ${ready&&!blocked?"":"disabled"}>${esc(u.name)} <small>${blocked?"装備適性なし":`${g}/${u.requiredHits}`}</small></button>`;}
function describeSkill(skill){
  if(!skill)return "スキルの詳細情報はありません。";
  const cost=`消費SP：${skill.cost}。`;
  if(skill.type==="level-lightning-all"||skill.type==="level-lightning-single")return `${skill.name}：レベル${skill.treeLevel}。雷属性のSP攻撃です。${cost}`;
   if(skill.type==="level-flare")return `${skill.name}：レベル${skill.treeLevel}。敵単体に強力な炎属性SP攻撃。${cost}`;
   if(skill.type==="level-magic-bomb")return `${skill.name}：レベル${skill.treeLevel}。敵の魔法耐性を無視する無属性SP攻撃。${cost}`;
   if(skill.type==="burst-blade")return `${skill.name}：レベル${skill.treeLevel}。攻撃力の${400+(skill.treeLevel-1)*20}%の単体攻撃。${cost}`;
   if(skill.type==="defense-camp")return `${skill.name}：3ターン、味方全体の防御力を${50+5*(skill.treeLevel-1)}上昇。${cost}`;
   if(skill.type==="magic-guard")return `${skill.name}：このターン、味方全体の魔法ダメージを${50+2*(skill.treeLevel-1)}%軽減。${cost}`;
   if(skill.type==="full-guard")return `${skill.name}：味方への攻撃を騎士が引き受ける。ダメージ軽減${Math.min(80,35+5*skill.treeLevel)}%。再使用待機：5ターン。${cost}`;
   if(skill.type==="line-heal")return `${skill.name}：横列の味方3人を回復。回復量はレベルに応じて上昇。${cost}`;
   if(skill.type==="refresh")return `${skill.name}：${skill.treeLevel>=5?"味方全体":"味方1人"}の状態異常を解除。${cost}`;
   if(skill.type==="holy-light")return `${skill.name}：敵全体に聖属性攻撃。敵ごとの聖属性相性に応じて威力が変化します。${cost}`;
   if(skill.type==="compression")return `${skill.name}：次の魔法攻撃の攻撃回数を2倍にする。重ねがけ可能。${cost}`;
   if(skill.type==="heal")return `${skill.name}：味方1人のHPを回復します。${cost}`;
  if(skill.type==="revive")return `${skill.name}：戦闘不能の味方を蘇生します。${cost}`;
  if(skill.type==="taunt")return `${skill.name}：敵の攻撃を自身に引きつけます。${cost}`;
  if(skill.type==="multiSlash")return `${skill.name}：連続攻撃で敵に複数回ダメージを与えます。${cost}`;
  if(skill.type==="fire")return `${skill.name}：炎・属性攻撃で敵を攻撃します。敵の属性耐性に注意しましょう。${cost}`;
  if(skill.type==="charge")return `${skill.name}：HPを消費して強力な攻撃を行います。${cost}`;
  if(skill.type==="pierce"||skill.type==="spAttack")return `${skill.name}：敵の防御力を貫通するSP攻撃です。${cost}`;
  return `${skill.name}：SPを消費して発動するスキルです。${cost}`;
}
function renderSkillMenu(actor){battleState.menuMode="skill";setCommandDescription("使用するSPスキルを選択してください。スキル名にカーソルを合わせると効果を確認できます。");const box=$("battle-commands");$("command-title").textContent=`${actor.name}のSPスキル`;if(isSkillRestricted(actor)){box.innerHTML=`<p class="empty-note">${esc(actor.name)}は装備適性がないため、SPスキルを使用できません。適性装備に戻すと再び使用できます。</p><button class="command-option back-option" data-action="back">戻る</button>`;box.querySelector("[data-action=back]").onclick=()=>renderActionMenu();return;}box.innerHTML=getCharacterSkills(actor).map(s=>`<button class="command-option" data-skill="${s.id}" data-description="${esc(describeSkill(s))}" ${(actor.sp<s.cost||(s.hpCost&&actor.hp<=s.hpCost)||s.disabled)?"disabled":""}>${esc(s.name)} <small>${s.treeLevel?`Lv.${s.treeLevel} ／ `:""}SP ${s.cost}${s.disabled?" ／ 再使用待機中":""}${s.hpCost?` / HP ${s.hpCost}`:""}</small></button>`).join("")+`<button class="command-option back-option" data-action="back">戻る</button>`;box.querySelectorAll("[data-skill]").forEach(b=>{b.addEventListener("focus",()=>setCommandDescription(b.dataset.description));b.addEventListener("pointerenter",()=>{setCommandDescription(b.dataset.description);if(battleState.tutorialMode&&tutorialState.phase==="battle-sp-command")tutorialHighlight(".command-info-window");});b.onclick=()=>{setCommandDescription(b.dataset.description);if(battleState.tutorialMode&&tutorialState.phase==="battle-sp-command")tutorialHighlight(".command-info-window");const s=getCharacterSkills(actor).find(x=>x.id===b.dataset.skill);if(!s)return;sound("select");if(s.target==="enemy")targetEnemy({type:"skill",actor:actor.id,skillId:s.id});else if(s.target==="allEnemies")targetEnemy({type:"skill",actor:actor.id,skillId:s.id,all:true});else if(s.type==="line-heal")renderLineHealMenu(actor,s);else if(s.target==="ally"||s.target==="deadAlly")renderAllyMenu(actor,s);else commitAction({type:"skill",actor:actor.id,skillId:s.id});};});box.querySelector("[data-action=back]").onclick=()=>renderActionMenu();tutorialSyncCommandLock();}
function renderItemMenu(actor){battleState.menuMode="item";const owned=shopItems.filter(i=>i.kind&&(inventory[i.id]||0)>0);const box=$("battle-commands");$("command-title").textContent=`${actor.name}の道具`;if(!owned.length){box.innerHTML='<p class="empty-note">使用できるアイテムがありません。</p><button class="command-option" data-action="back">戻る</button>';box.querySelector("[data-action=back]").onclick=renderActionMenu;return;}box.innerHTML=owned.map(i=>`<button class="command-option" data-item="${i.id}">>${esc(i.name)} <small>×${inventory[i.id]}</small></button>`).join("")+`<button class="command-option" data-action="back">戻る</button>`;box.querySelectorAll("[data-item]").forEach(b=>b.onclick=()=>{const item=itemById(b.dataset.item);renderAllyMenu(actor,item,{item:true});});box.querySelector("[data-action=back]").onclick=renderActionMenu;}
function renderLineHealMenu(actor,skill){
  const party=getParty(),box=$("battle-commands");
  const formations=[[0,1,2],[1,2,3]];
  battleState.menuMode="line-heal";$("command-title").textContent="ラインヒール：対象の列";
  box.innerHTML=formations.map((indices,index)=>{const members=indices.map(i=>party[i]).filter(Boolean);return `<button class="command-option" data-line="${index}" ${members.length!==3?"disabled":""}>${index===0?"左列":"右列"}：${members.map(c=>esc(c.name)).join("・")}</button>`;}).join("")+`<button class="command-option back-option" data-action="back">戻る</button>`;
  box.querySelectorAll("[data-line]").forEach(button=>button.onclick=()=>{const ids=formations[Number(button.dataset.line)].map(i=>party[i]?.id).filter(Boolean);sound("select");commitAction({type:"skill",actor:actor.id,skillId:skill.id,targetIds:ids});});
  box.querySelector("[data-action=back]").onclick=()=>renderSkillMenu(actor);
}
function renderAllyMenu(actor,skillOrItem,opts={}){const isItem=!!opts.item;const type=isItem?skillOrItem.kind:skillOrItem.type;let targets=getParty().filter(c=>type==="revive"?c.hp<=0:type==="heal"?c.hp>0&&c.hp<effectiveStats(c).maxHp:type==="sp"?c.hp>0&&c.sp<c.maxSp:c.hp>0);if(!targets.length){pushLog("対象にできる味方がいません。");isItem?renderItemMenu(actor):renderSkillMenu(actor);return;}const box=$("battle-commands");$("command-title").textContent=isItem?`${skillOrItem.name}：対象を選択`:`${skillOrItem.name}：対象を選択`;box.innerHTML=targets.map(c=>`<button class="command-option" data-target="${c.id}">>${esc(c.name)} <small>HP ${Math.max(0,c.hp)}/${effectiveStats(c).maxHp}　SP ${c.sp}/${c.maxSp}</small></button>`).join("")+`<button class="command-option" data-action="back">戻る</button>`;box.querySelectorAll("[data-target]").forEach(b=>b.onclick=()=>{sound("select");commitAction(isItem?{type:"item",actor:actor.id,itemId:skillOrItem.id,target:b.dataset.target}:{type:"skill",actor:actor.id,skillId:skillOrItem.id,target:b.dataset.target});});box.querySelector("[data-action=back]").onclick=()=>isItem?renderItemMenu(actor):renderSkillMenu(actor);}
function highlightEnemyTarget(id){
  const display=$("battle-enemy");if(!display)return;
  display.querySelectorAll(".target-highlight").forEach(node=>node.classList.remove("target-highlight"));
  if(id==="main"){
    const wolf=display.querySelector('[data-enemy-id="wolf-main"]');
    (wolf||display.querySelector(".enemy-image,.enemy-placeholder"))?.classList.add("target-highlight");
    return;
  }
  if(id==="all"){
    // 全体攻撃：敵全員に黄色いアウトラインを付ける。
    const units=display.querySelectorAll(".enemy-group-unit");
    if(units.length)units.forEach(u=>u.classList.add("target-highlight"));
    else display.querySelector(".enemy-image,.enemy-placeholder")?.classList.add("target-highlight");
    return;
  }
  const mapped=id;
  const node=display.querySelector(`[data-enemy-id="${CSS.escape(mapped)}"]`);
  if(node)node.classList.add("target-highlight");
}
function targetEnemy(action){
  const e=battleState.enemy,box=$("battle-commands");setCommandDescription(action.type==="skill"?(describeSkill(getCharacterSkills(getCharacter(action.actor)).find(x=>x.id===action.skillId))) : "攻撃対象を選択してください。敵ごとに弱点や耐性が異なります。");battleState.menuMode="target";$("command-title").textContent="攻撃対象を選択";
  const targets=livingEnemyTargets(e);
  const allMode=action.all===true;
  if(allMode){action={...action};delete action.all;}
  box.innerHTML=allMode?`<button class="command-option" data-enemy-target="all">敵全体 <small>全体攻撃</small></button><button class="command-option" data-action="back">戻る</button>`:targets.map(t=>{const label=t.kind==="member"?(battleState.tutorialMode?`スライムa ${Number(t.ref.id.split("-").pop())}`:`ゴブリン ${Number(t.ref.id.split("-").pop())}`):t.kind==="clone"?"オオカミ":e.name==="オオカミ"?"オオカミ":e.name;const id=t.kind==="member"||t.kind==="clone"?t.ref.id:t.kind;return `<button class="command-option" data-enemy-target="${esc(id)}">${esc(label)} <small>HP ${Math.max(0,t.ref.hp)}/${t.ref.maxHp}</small></button>`;}).join("")+`<button class="command-option" data-action="back">戻る</button>`;
  box.querySelectorAll("[data-enemy-target]").forEach(b=>{
    const id=b.dataset.enemyTarget;
    b.addEventListener("pointerenter",()=>highlightEnemyTarget(id));
    b.addEventListener("focus",()=>highlightEnemyTarget(id));
    b.addEventListener("pointerleave",()=>{if(!box.querySelector("[data-enemy-target]:focus"))highlightEnemyTarget(null);});
    b.addEventListener("blur",()=>highlightEnemyTarget(null));
    b.onclick=()=>{highlightEnemyTarget(null);commitAction(id==="all"?{...action}:{...action,targetId:id});};
  });
  box.querySelector("[data-action=back]").onclick=()=>{highlightEnemyTarget(null);renderActionMenu();};
  keyboardCursor=0;
  const firstTarget=box.querySelector("[data-enemy-target]");
  if(firstTarget){firstTarget.classList.add("keyboard-focus");highlightEnemyTarget(firstTarget.dataset.enemyTarget);}
  if(battleState.tutorialMode&&tutorialState.phase==="battle-command")tutorialHighlight("#battle-commands [data-enemy-target]");
  else if(battleState.tutorialMode&&tutorialState.phase==="battle-sp-command")tutorialHighlight("#battle-commands [data-enemy-target]");
  else tutorialSyncCommandLock();
}
function renderPartnerMenu(actor){const candidates=getParty().filter(c=>c.id!==actor.id&&c.hp>0&&unionSkills[c.id]&&(battleState.unionGauges[c.id]||0)>=unionSkills[c.id].requiredHits);const box=$("battle-commands");$("command-title").textContent="クロスブレイク：協力者";if(!candidates.length){box.innerHTML='<p class="empty-note">ユニオンゲージが満タンの協力者がいません。</p><button class="command-option" data-action="back">戻る</button>';box.querySelector("[data-action=back]").onclick=renderActionMenu;return;}box.innerHTML=candidates.map(c=>`<button class="command-option" data-partner="${c.id}">>${esc(c.name)}と連携</button>`).join("")+`<button class="command-option" data-action="back">戻る</button>`;box.querySelectorAll("[data-partner]").forEach(b=>b.onclick=()=>{sound("select",true);commitAction({type:"union",actor:actor.id,partner:b.dataset.partner});});box.querySelector("[data-action=back]").onclick=renderActionMenu;}
function commitAction(action){if(battleState.busy)return;const actor=getCharacter(action.actor);if(!actor||actor.hp<=0)return;
  if(battleState.tutorialMode){
    if(["tutorial-intro","enemy-ui","event-ui","party-ui"].includes(tutorialState.battlePhase)){setSystemMessage("画面の説明を順番に確認してから行動しよう。");return;}
    if(tutorialState.battlePhase==="intro"||tutorialState.battlePhase==="normal-resolved"||tutorialState.battlePhase==="sp"||tutorialState.battlePhase==="guard"||tutorialState.battlePhase==="union"){
      if(tutorialState.battlePhase==="normal-resolved"&&action.type!=="skill"){setSystemMessage("次はSPスキルを選んでみよう。");return;}
      if(tutorialState.battlePhase==="sp"&&action.type!=="skill"){setSystemMessage("次はSPスキルを選んでみよう。");return;}
      if(tutorialState.battlePhase==="guard"&&action.type!=="guard"){setSystemMessage("強力な攻撃に備えて、全員で防御しよう。");return;}
      if(tutorialState.battlePhase==="union"&&action.type!=="union"){setSystemMessage("ユニオンスキルを発動しよう。");return;}
    }
    if(tutorialState.battlePhase==="intro"&&action.type==="attack"){
      tutorialState.battlePhase="normal-resolved";battleState.actions=battleState.turnOrder.map(id=>({type:"attack",actor:id}));battleState.currentActorIndex=battleState.turnOrder.length;battleState.busy=true;renderBattle();setTimeout(executeTurn,battleDelayMs(200));return;
    }
    if(tutorialState.battlePhase==="sp"&&action.type==="skill"){tutorialState.battlePhase="sp-resolved";}
    if(tutorialState.battlePhase==="guard"&&action.type==="guard"){
      // 防御は4人全員に行わせる
      battleState.actions=battleState.turnOrder.map(id=>({type:"guard",actor:id}));battleState.currentActorIndex=battleState.turnOrder.length;battleState.busy=true;tutorialState.battlePhase="guard-resolved";renderBattle();setTimeout(executeTurn,battleDelayMs(200));return;
    }
    if(tutorialState.battlePhase==="union"&&action.type==="union"){tutorialState.battlePhase="union-resolved";}
  }battleState.actions[battleState.currentActorIndex]=action;if(action.type==="union"&&action.partner){battleState.consumedActors.push(action.partner);const pi=battleState.turnOrder.indexOf(action.partner);if(pi>=0)battleState.actions[pi]=null;}$("battle-support").textContent=`${actor.name}は「${actionLabel(action)}」を選択しました。`;battleState.currentActorIndex++;while(battleState.currentActorIndex<battleState.turnOrder.length&&(getCharacter(battleState.turnOrder[battleState.currentActorIndex])?.hp<=0||battleState.consumedActors.includes(battleState.turnOrder[battleState.currentActorIndex])))battleState.currentActorIndex++;if(battleState.currentActorIndex>=battleState.turnOrder.length){battleState.busy=true;renderBattle();$("command-title").textContent="行動を実行中…";$("battle-commands").innerHTML='<p class="command-option">味方全員の行動を開始します。</p>';setTimeout(executeTurn,battleDelayMs(250));}else{renderBattle();renderActionMenu();}}
function actionLabel(a){if(a.type==="attack")return "攻撃";if(a.type==="guard")return "防御";if(a.type==="skill")return getCharacterSkills(getCharacter(a.actor)).find(s=>s.id===a.skillId)?.name||"スキル";if(a.type==="item")return `${itemById(a.itemId)?.name||"道具"} → ${getCharacter(a.target)?.name||"味方"}`;if(a.type==="union")return unionSkills[a.actor].name;return "行動";}
function undoPrevious(){if(battleState.currentActorIndex<=0)return;const idx=battleState.currentActorIndex-1;const prev=battleState.actions[idx];if(!prev)return;battleState.actions.splice(idx);battleState.currentActorIndex=idx;pushLog(`${getCharacter(prev.actor).name}の行動選択を取り消しました。`);renderBattle();renderActionMenu();sound("back");}
async function executeTurn(){
  if(!battleState.enemy){battleState.busy=false;return;}
  if(enemyHpTotal(battleState.enemy)<=0){await finishStage();return;}
  const order=battleState.actions.filter(Boolean).map((action,index)=>({action,index})).sort((a,b)=>(a.action.type==="union"?0:1)-(b.action.type==="union"?0:1)||a.index-b.index).map(x=>x.action);
  for(const action of order){
    if(enemyHpTotal(battleState.enemy)<=0)break;
    const actor=getCharacter(action.actor);
    if(!actor||actor.hp<=0||battleState.consumedActors.includes(action.actor))continue;
    if(isActionIncapacitated(actor)){consumeIncapacitatedTurn(actor);continue;}
    battleState.actingIds=[action.actor,...(action.partner?[action.partner]:[])];renderBattle();
    await executeAction(action);
    renderBattle();
    if(action.type!=="guard")animatePartyIcon(actor.id);if(action.type==="union"&&action.partner)animatePartyIcon(action.partner);
    await wait(1180);
    battleState.actingIds=[];renderBattle();
    if(enemyHpTotal(battleState.enemy)<=0)break;
  }
  battleState.actingIds=[];
  if(enemyHpTotal(battleState.enemy)<=0){await finishStage();return;}
  checkBossTransformation(battleState.enemy);
  const resolvedTurn=battleState.turnCount+1;
  await enemyTurn();
  renderBattle();
  await wait(950);
  if(battleState.stage===5&&battleState.enemy?.name==="魔王"&&[3,7,11].includes(resolvedTurn)){showEnemyOmen("maou");}
  if(battleState.enemy?.name==="ドラゴン"&&resolvedTurn%3===2){showEnemyOmen("dragon");}
  if(livingParty().length===0){finishDefeat();return;}
  battleState.turnCount++;
  refreshBattleLog();
  battleState.actions=[];
  battleState.consumedActors=[];
  if(battleState.tutorialMode){
    if(tutorialState.battlePhase==="sp")battleState.turnOrder=["kotama"];
    else if(tutorialState.battlePhase==="guard")battleState.turnOrder=livingParty().map(c=>c.id);
    else if(tutorialState.battlePhase==="union"){battleState.turnOrder=["kotama"];battleState.unionGauges.kotama=unionSkills.kotama.requiredHits;}
    else battleState.turnOrder=[];
  }else battleState.turnOrder=livingParty().map(c=>c.id);
  battleState.currentActorIndex=0;
  battleState.busy=false;
  battleState.guarding={};
  renderBattle();
  if(battleState.tutorialMode&&tutorialState.battlePhase==="retreat"){
    tutorialState.phase="battle-retreat";battleState.busy=true;$("battle-commands").hidden=true;tutorialOverlay("戦い方の基本は完了！","撤退ボタンを押して拠点に戻ろう。");tutorialHighlight("#retreat-button");tutorialSave();return;
  }
  if(battleState.tutorialMode&&battleState.turnOrder.length===0){battleState.busy=true;return;}
  tutorialSave();renderActionMenu();
  if(battleState.tutorialMode&&tutorialState.battlePhase==="sp"){
    tutorialState.phase="battle-sp";tutorialOverlay("2ターン目に進んだよ","スライムは通常の攻撃を受け付けないみたいだ。次はSPスキルを使ってみよう");tutorialHighlight("#turn-counter");document.querySelector(".tutorial-panel")?.classList.add("tutorial-bottom-log");tutorialSave();
  }else if(battleState.tutorialMode&&tutorialState.battlePhase==="guard"){
    // スライムの赤文字の予告が表示された直後に、赤い警告表示の説明を行う。
    tutorialState.phase="battle-event-warning";tutorialOverlay("赤い警告表示について","いま表示された赤い文字が警告表示だよ。赤い警告は、敵が次の行動で強力な攻撃や特殊行動を行う合図です。表示されたら敵の属性や攻撃範囲を確認し、防御・回復・ユニオンスキルなどで備えましょう。警告はイベント欄に追加されるので、見逃さないようにしてください。");tutorialHighlight(".event-window");tutorialSave();
  }else if(battleState.tutorialMode&&tutorialState.battlePhase==="union"){
    tutorialState.phase="battle-union-command";tutorialOverlay("ユニオンスキルを使おう","コタマのユニオンゲージが満タンになったよ。通常行動とは異なる特別な技を使ってみよう。");tutorialHighlight("#battle-commands .union-command");tutorialSave();
  }
}
function showHitEffect(kind="slash"){
  const display=displayEnemyNode();if(!display)return;const fx=document.createElement("div");fx.className=`hit-effect hit-${kind}`;fx.textContent=kind==="slash"?"╱╲":kind==="samurai"?"斬":kind==="flame"?"🔥":"✦";display.appendChild(fx);setTimeout(()=>fx.remove(),battleDelayMs(kind==="samurai"?360:520));
}
// 魔術師の魔法は、対象ごとに演出→ダメージ→HP表示更新の順で処理する。
async function applySequentialMagicHits(enemy,targets,damage,skill,actor){
  let total=0;
  for(const target of targets){
    if(!target||enemyHpTotal(enemy)<=0)break;
    const targetId=target.ref?.id;
    const beforeNode=targetId?document.querySelector(`[data-enemy-id="${targetId}"]`):null;
    const display=displayEnemyNode();
    if(beforeNode){beforeNode.classList.remove("magic-target-hit");void beforeNode.offsetWidth;beforeNode.classList.add("magic-target-hit");}
    else if(display){display.classList.remove("magic-target-active");void display.offsetWidth;display.classList.add("magic-target-active");}
    showHitEffect(skill.type==="fire"||skill.type==="level-flare"?"flame":"magic");
    await wait(140);
    const value=applyDamageToEnemyTarget(enemy,target,damage);
    total+=value;
    if(value>0){
      addBreakDamage(enemy,"sp",skill.element||"無属性",actor);
      const hpBar=beforeNode?.querySelector(".enemy-unit-hp i");
      if(hpBar&&target.ref.maxHp)hpBar.style.width=`${Math.max(0,target.ref.hp)/target.ref.maxHp*100}%`;
      const hpText=beforeNode?.querySelector("small");if(hpText&&target.ref.maxHp)hpText.textContent=`${Math.max(0,target.ref.hp)} / ${target.ref.maxHp}`;
      const mainBar=$("enemy-hp-bar");if(mainBar)mainBar.style.width=`${enemyHpTotal(enemy)/enemy.maxHp*100}%`;
      combatNumber(beforeNode||displayEnemyNode(),`-${value}`,"damage");
      flashEnemyDamage();sound("damage",true);
      pushLog(`${actor.name}の${skill.name}！ ${target.ref.displayName||target.ref.name||(target.kind==="clone"?"オオカミの幻影":enemy.name)}に${value}ダメージ。`);
    }else if(lastEnemyAttackMissed){
      pushLog(`${target.ref.displayName||target.ref.name||enemy.name}は魔法攻撃を回避した！`);
    }
    await wait(260);
    if(display)display.classList.remove("magic-target-active");
    renderBattle();
  }
  return total;
}
async function executeAction(a){const actor=getCharacter(a.actor),enemy=battleState.enemy;if(!actor||actor.hp<=0)return;const stats=effectiveStats(actor);if(actor.id==="mage"&&mageCompressionStacks.mage>0&&a.type!=="skill")mageCompressionStacks.mage=0;if(a.type==="guard"){battleState.guarding[actor.id]=actor.guardCut;flashPartyGuard(actor.id);pushLog(`${actor.name}は防御の構えを取った。`);return;}animatePartyIcon(actor.id);if(a.type==="attack"){let d=calcEnemyPhysicalDamage(enemy,effectiveAttackPower(actor));if(actor.id==="warrior")d=Math.floor(d*BATTLE_RULES.passives.warrior.normalDamage);d=Math.floor(d*(1+treeBonus(actor.id,"normal")));d=applyWeaponAttributeDamage(enemy,d,actor);beginEnemyDamagePreview(enemy);const chosen=a.targetId?livingEnemyTargets(enemy).find(t=>t.ref.id===a.targetId||t.kind===a.targetId):livingEnemyTargets(enemy)[0];const dealt=chosen?applyDamageToEnemyTarget(enemy,chosen,d):applyDamageToEnemy(enemy,d);if(!lastEnemyAttackMissed&&dealt>0)addBreakDamage(enemy,"normal",getWeaponPhysicalElement(actor),actor);animatePartyIcon(actor.id);animateEnemyIcons(chosen);chargeGauge(actor);if(actor.id==="samurai"&&equipment.samurai?.katana1&&equipment.samurai?.katana2&&dealt>0&&enemyHpTotal(enemy)>0){const secondTarget=(a.targetId?livingEnemyTargets(enemy).find(t=>t.ref.id===a.targetId||t.kind===a.targetId):null)||livingEnemyTargets(enemy)[0];const second=secondTarget?applyDamageToEnemyTarget(enemy,secondTarget,d):0;if(second>0)addBreakDamage(enemy,"normal",getWeaponPhysicalElement(actor),actor);pushLog(`二刀流！ 追加で${second}ダメージ！`);combatNumber(displayEnemyNode(),`-${second}`,"damage");}if(lastEnemyAttackMissed){pushLog(`${enemy.name}は攻撃を回避した！`);}else{pushLog(`${actor.name}の攻撃！ ${enemy.name}に${dealt}ダメージ。`);combatNumber(displayEnemyNode(),`-${dealt}`,"damage");showHitEffect("slash");flashEnemyDamage();}if(!lastEnemyAttackMissed)playSe(actor.id==="warrior"?"assets/se/senntou/打撃音_3":"assets/se/senntou/斬撃音");return;}if(a.type==="skill"){if(isSkillRestricted(actor)){pushLog(`${actor.name}は装備の適性がないため、SPスキルを使用できない！`);return;}const skill=getCharacterSkills(actor).find(s=>s.id===a.skillId);if(!skill||actor.sp<skill.cost||(skill.hpCost&&actor.hp<=skill.hpCost)){pushLog(`${actor.name}はスキルを使えなかった。`);return;}actor.sp-=Math.max(1,Math.floor(skill.cost*(1-Math.min(.5,uniqueEquippedItems(actor).reduce((n,i)=>n+(i.spCostReduction||0),0)))));if(skill.hpCost)actor.hp-=skill.hpCost;
   const compressionHits=actor.id==="mage"&&mageCompressionStacks.mage>0&&skill.type!=="compression"?(2**mageCompressionStacks.mage):1;
   if(actor.id==="mage"&&skill.type==="compression"){mageCompressionStacks.mage++;chargeGauge(actor);pushLog(`${actor.name}は「術式圧縮」！ 次の行動で魔法攻撃の回数が${2**mageCompressionStacks.mage}倍になる。`);return;}
   if(skill.type==="defense-camp"){battleState.defenseCampTurns=3;battleState._defenseCampLevel=skill.treeLevel||1;chargeGauge(actor);pushLog(`${actor.name}は「防衛陣地」！ 3ターンの間、味方全体の防御力が${50+5*((skill.treeLevel||1)-1)}上昇する。`);return;}
   if(skill.type==="magic-guard"){battleState.magicGuardActive=true;battleState._magicGuardRate=(50+2*((skill.treeLevel||1)-1))/100;chargeGauge(actor);pushLog(`${actor.name}は「マジックガード」！ このターン、味方全体の魔法ダメージを${50+2*((skill.treeLevel||1)-1)}%軽減する。`);return;}
   if(skill.type==="full-guard"){if(battleState.knightFullGuardCooldown>0){pushLog("フルガードはまだ再使用できない。");return;}const reduction=Math.min(.80,.35+.05*(skill.treeLevel||1));battleState.fullGuardActive=true;battleState._fullGuardReduction=reduction;battleState.guarding.knight=reduction;flashPartyGuard(actor.id);chargeGauge(actor);battleState.knightFullGuardCooldown=6;pushLog(`${actor.name}は「フルガード」！ 味方への攻撃を引き受け、防御率${Math.round(reduction*100)}%で守る！`);return;}
   if(skill.type==="line-heal"){const party=getParty(),targets=(a.targetIds||[]).map(id=>party.find(c=>c.id===id)).filter(c=>c&&c.hp>0);let total=0;for(const target of targets){const before=target.hp;const power=effectiveSpAttackPower(actor)*(.55+.08*(skill.treeLevel||1))*BATTLE_RULES.classBonuses.healer.healing*BATTLE_RULES.passives.healer.healing*(1+treeBonus(actor.id,"heal"));target.hp=Math.min(effectiveStats(target).maxHp,target.hp+Math.floor(power));const amount=target.hp-before;total+=amount;renderBattle();if(amount>0){combatNumber(target.id,`+${amount}`,"heal");const card=document.querySelector(`.battle-member[data-party-id="${target.id}"]`);if(card){card.classList.remove("heal-flash");void card.offsetWidth;card.classList.add("heal-flash");setTimeout(()=>card.classList.remove("heal-flash"),battleDelayMs(420));}}sound("heal");await wait(320);}chargeGauge(actor);pushLog(`${actor.name}の「ラインヒール」！ 味方${targets.length}人のHPを合計${total}回復。`);return;}
   if(skill.type==="refresh"){const targets=skill.treeLevel>=5?getParty():[getCharacter(a.target)].filter(Boolean);for(const target of targets){if(target.hp<=0)continue;clearNegativeStatuses(target);}chargeGauge(actor);pushLog(`${actor.name}の「リフレッシュ」！ ${skill.treeLevel>=5?"味方全体":targets[0]?.name||"味方"}の状態異常を解除した。`);sound("heal");return;}
   if(["level-lightning-all","level-lightning-single","level-flare","level-magic-bomb","holy-light","burst-blade"].includes(skill.type)){
     const lv=skill.treeLevel||1,magical=skill.type!=="burst-blade";let raw=skill.type==="burst-blade"?effectiveAttackPower(actor)*(4+.2*(lv-1)):effectiveSpAttackPower(actor);
     if(skill.type==="level-lightning-all")raw*=.60+.10*lv;if(skill.type==="level-lightning-single")raw*=.90+.10*lv;if(skill.type==="level-flare")raw*=.90+.12*lv;if(skill.type==="level-magic-bomb")raw*=.90+.10*lv;if(skill.type==="holy-light")raw*=.50+.12*lv;
     if(magical&&actor.id==="mage")raw*=BATTLE_RULES.passives.mage.spDamage;
     if(magical&&skill.type!=="level-magic-bomb"){raw=calcSp(raw,Number.isFinite(enemy.spDefense)?enemy.spDefense:Math.floor(enemy.defense/2));raw=applyElementalDamage(enemy,raw,skill.element);}
     if(skill.type==="level-magic-bomb")raw=Math.max(1,Math.floor(raw));
     const all=skill.target==="allEnemies",hits=magical?compressionHits:1;let total=0;if(!magical)beginEnemyDamagePreview(enemy);
     for(let h=0;h<hits;h++){
       const targets=all?livingEnemyTargets(enemy):[livingEnemyTargets(enemy).find(t=>t.ref.id===a.targetId||t.kind===a.targetId)||livingEnemyTargets(enemy)[0]].filter(Boolean);
       if(magical){total+=await applySequentialMagicHits(enemy,targets,Math.max(1,Math.floor(raw)),skill,actor);}
       else{for(const target of targets){const targetDamage=applyWeaponAttributeDamage(enemy,calcPhysical(raw,Number.isFinite(target.ref.defense)?target.ref.defense:enemy.defense),actor);const dealt=applyDamageToEnemyTarget(enemy,target,Math.max(1,Math.floor(targetDamage)));total+=dealt;if(dealt>0)addBreakDamage(enemy,"sp",getWeaponPhysicalElement(actor),actor);if(enemyHpTotal(enemy)<=0)break;}}
       if(enemyHpTotal(enemy)<=0)break;
     }
     if(actor.id==="mage"&&compressionHits>1)mageCompressionStacks.mage=0;chargeGauge(actor);if(!magical&&total>0)combatNumber(displayEnemyNode(),`-${total}`,"damage");sound("damage",true);return;
   }
   if(actor.id==="mage"&&compressionHits>1)mageCompressionStacks.mage=0;
   if(skill.type==="taunt"){battleState.tauntTarget=actor.id;chargeGauge(actor);pushLog(`${actor.name}は挑発！ 敵の攻撃を引きつける。`);return;}
  if(skill.type==="heal"){const target=getCharacter(a.target);if(!target||target.hp<=0){pushLog("回復対象がいません。");return;}const before=target.hp;const healingPower=effectiveSpAttackPower(actor)*(actor.id==="healer"?BATTLE_RULES.classBonuses.healer.healing*BATTLE_RULES.passives.healer.healing:1)*(1+Math.min(.5,uniqueEquippedItems(actor).reduce((n,i)=>n+(i.healingRate||0),0))+treeBonus(actor.id,"heal"));target.hp=Math.min(effectiveStats(target).maxHp,target.hp+Math.floor(healingPower));chargeGauge(actor);pushLog(`${actor.name}のヒール！ ${target.name}のHPが${target.hp-before}回復。`);combatNumber(target.id,`+${target.hp-before}`,"heal");sound("heal");return;}
  if(skill.type==="revive"){const target=getCharacter(a.target);if(!target||target.hp>0){pushLog("蘇生対象がいません。");return;}target.hp=Math.min(50+Math.floor(50*treeBonus(actor.id,"revive")),effectiveStats(target).maxHp);chargeGauge(actor);chargeGauge(target);pushLog(`${actor.name}の死者蘇生！ ${target.name}がHP${target.hp}で復活。`);sound("heal");return;}
  if(skill.type==="multiSlash"){
    let total=0,actualHits=0;const hits=equipment.samurai?.katana1&&equipment.samurai?.katana2?6:3;beginEnemyDamagePreview(enemy);
    for(let i=0;i<hits;i++){
      const candidates=livingEnemyTargets(enemy);if(!candidates.length)break;
      const target=a.targetId?candidates.find(t=>t.ref.id===a.targetId||t.kind===a.targetId):candidates[Math.floor(Math.random()*candidates.length)];if(!target)break;
      const defense=Number.isFinite(target.ref.defense)?target.ref.defense:enemy.defense;
      const d=applyWeaponAttributeDamage(enemy,Math.floor(calcPhysical(effectiveAttackPower(actor),defense)*(1+treeBonus(actor.id,"sp"))),actor);
      const dealt=applyDamageToEnemyTarget(enemy,target,d);if(dealt>0)addBreakDamage(enemy,"sp",getWeaponPhysicalElement(actor),actor);total+=dealt;
      if(dealt>0){actualHits++;showHitEffect("samurai");flashEnemyDamage();renderBattle();await wait(110);}
    }
    chargeGauge(actor);
    pushLog(`${actor.name}の乱れ斬り！ 生存している敵からランダムに選んだ${actualHits}体へ斬撃！ 合計${total}ダメージ！`);
    if(total>0)combatNumber(displayEnemyNode(),`-${total}`,"damage");
    sound("damage",true);return;
  }
  if(skill.type==="pierce"){const d=applyWeaponAttributeDamage(enemy,Math.max(1,Math.floor(effectiveAttackPower(actor)*1.8*(1+treeBonus(actor.id,"normal")))),actor);beginEnemyDamagePreview(enemy);const chosen=a.targetId?livingEnemyTargets(enemy).find(t=>t.ref.id===a.targetId||t.kind===a.targetId):livingEnemyTargets(enemy)[0];const dealt=chosen?applyDamageToEnemyTarget(enemy,chosen,d):applyDamageToEnemy(enemy,d);let second=0;if(equipment.samurai?.katana1&&equipment.samurai?.katana2&&dealt>0&&enemyHpTotal(enemy)>0){const next=(a.targetId?livingEnemyTargets(enemy).find(t=>t.ref.id===a.targetId||t.kind===a.targetId):null)||livingEnemyTargets(enemy)[0];if(next)second=applyDamageToEnemyTarget(enemy,next,d);}if(dealt+second>0)addBreakDamage(enemy,"sp",getWeaponPhysicalElement(actor),actor);chargeGauge(actor);pushLog(`${actor.name}の兜割！ 防御を無視して${dealt}${second?`＋${second}`:""}ダメージ！`);combatNumber(displayEnemyNode(),`-${dealt+second}`,"damage");showHitEffect("slash");flashEnemyDamage();sound("damage",true);return;}
  if(skill.type==="spAttack"||skill.type==="charge"){let d=calcSp(effectiveSpAttackPower(actor),Number.isFinite(enemy.spDefense)?enemy.spDefense:Math.floor(enemy.defense/2));if(actor.id==="mage")d=Math.floor(d*BATTLE_RULES.passives.mage.spDamage);d=Math.floor(d*(1+treeBonus(actor.id,"sp")));d=Math.floor(d*(1+treeBonus(actor.id,"element")));d=skill.type==="charge"?applyWeaponAttributeDamage(enemy,d,actor):applyElementalDamage(enemy,d,skill.element);if(actor.id!=="mage"||skill.type==="charge")beginEnemyDamagePreview(enemy);if(skill.target==="allEnemies"){let total=0;for(const t of livingEnemyTargets(enemy)){const v=applyDamageToEnemyTarget(enemy,t,d);total+=v;if(v>0)addBreakDamage(enemy,"sp",skill.type==="charge"?getWeaponPhysicalElement(actor):skill.element,actor);if(enemyHpTotal(enemy)<=0)break;}chargeGauge(actor);pushLog(`${actor.name}の${skill.name}！ 敵全体に${total}ダメージ。`);combatNumber(displayEnemyNode(),`-${total}`,"damage");showHitEffect("magic");flashEnemyDamage();sound("damage",true);return;}const chosen=a.targetId?livingEnemyTargets(enemy).find(t=>t.ref.id===a.targetId||t.kind===a.targetId):livingEnemyTargets(enemy)[0];const dealt=chosen?applyDamageToEnemyTarget(enemy,chosen,d):applyDamageToEnemy(enemy,d);let second=0;if(actor.id==="samurai"&&equipment.samurai?.katana1&&equipment.samurai?.katana2&&dealt>0&&enemyHpTotal(enemy)>0){const nextTarget=a.targetId?livingEnemyTargets(enemy).find(t=>t.ref.id===a.targetId||t.kind===a.targetId):livingEnemyTargets(enemy)[0];if(nextTarget)second=applyDamageToEnemyTarget(enemy,nextTarget,d);}if(!lastEnemyAttackMissed&&dealt+second>0)addBreakDamage(enemy,"sp",skill.type==="charge"?getWeaponPhysicalElement(actor):skill.element,actor);chargeGauge(actor);if(lastEnemyAttackMissed){pushLog(`${enemy.name}は攻撃を回避した！`);}else{pushLog(`${actor.name}の${skill.name}！ ${enemy.name}に${dealt}${second?`＋${second}`:""}ダメージ。`);combatNumber(displayEnemyNode(),`-${dealt+second}`,"damage");showHitEffect("magic");flashEnemyDamage();}sound("damage",true);return;}
  if(["fire","ice","thunder"].includes(skill.type)){
    let d=calcSp(effectiveSpAttackPower(actor),Number.isFinite(enemy.spDefense)?enemy.spDefense:Math.floor(enemy.defense/2));
    if(actor.id==="mage")d=Math.floor(d*BATTLE_RULES.passives.mage.spDamage);d=Math.floor(d*(1+treeBonus(actor.id,"sp")));
    d=Math.floor(d*(1+treeBonus(actor.id,"element")));d=applyElementalDamage(enemy,d,skill.element);if(actor.id!=="mage")beginEnemyDamagePreview(enemy);
    const all=(skill.type==="fire"||skill.target==="allEnemies"),hits=actor.id==="mage"?compressionHits:1;let dealt=0;
    for(let h=0;h<hits;h++){
      const targets=all?livingEnemyTargets(enemy):[livingEnemyTargets(enemy).find(t=>t.ref.id===a.targetId||t.kind===a.targetId)||livingEnemyTargets(enemy)[0]].filter(Boolean);
      dealt+=await applySequentialMagicHits(enemy,targets,d,skill,actor);
      if(enemyHpTotal(enemy)<=0)break;
    }
    chargeGauge(actor);sound("damage",true);return;
  }}
 if(a.type==="item"){const it=itemById(a.itemId),target=getCharacter(a.target);if(!it||!target||!(inventory[a.itemId]>0)||target.hp<=0){pushLog("アイテムを使用できませんでした。");return;}inventory[a.itemId]--;if(inventory[a.itemId]<=0)delete inventory[a.itemId];if(it.kind==="heal"){const before=target.hp;target.hp=Math.min(effectiveStats(target).maxHp,target.hp+it.amount);pushLog(`${actor.name}は${it.name}を使用。${target.name}のHPが${target.hp-before}回復。`);combatNumber(target.id,`+${target.hp-before}`,"heal");sound("heal");}else{const before=target.sp;target.sp=Math.min(target.maxSp,target.sp+it.amount);pushLog(`${actor.name}は${it.name}を使用。${target.name}のSPが${target.sp-before}回復。`);combatNumber(target.id,`SP +${target.sp-before}`,"sp");sound("heal");}renderAll();return;}
 if(a.type==="union"){await executeUnion(a);}}
function clearNegativeStatuses(character){
  if(!character)return;
  if(character.id==="mage"&&((character._stunTurns||0)>0||(character._actionDisabledTurns||0)>0||(character.stunTurns||0)>0||(character.actionDisabledTurns||0)>0))mageCompressionStacks.mage=0;
  // Current negative effects are managed in these existing stores.
  delete burnedTurns[character.id];
  character._defenseDown=0;
  character._defenseDownTurns=0;
  // Clear conventional per-character incapacitation counters if a future
  // status implementation adds them; no base stats or equipment are changed.
  for(const key of ["_stunTurns","stunTurns","_actionDisabledTurns","actionDisabledTurns"])if(key in character)character[key]=0;
  for(const key of ["_stunned","stunned","actionDisabled"])if(key in character)character[key]=false;
  // Keep this compatible with an optional structured status list if future
  // ailments use it; explicitly beneficial effects are never removed.
  if(Array.isArray(character.statusEffects)){
    character.statusEffects=character.statusEffects.filter(effect=>!(effect?.beneficial===false||effect?.isBeneficial===false||effect?.negative===true));
  }
  if(character.negativeStatuses&&typeof character.negativeStatuses==="object"){
    Object.keys(character.negativeStatuses).forEach(key=>delete character.negativeStatuses[key]);
  }
}
const unionPortraitFiles={kotama:"kotama.png",knight:"kishi.png",warrior:"sennshi.png",healer:"hi-ra-.png",mage:"mahoutukai.png"};
async function showUnionCutin(skill, participants){
  const layer=document.getElementById("union-cutin-layer")||document.createElement("div");
  layer.id="union-cutin-layer";
  layer.className="union-cutin-layer";
  layer.setAttribute("aria-hidden","false");
  const isSamurai=skill.type==="samurai-slash";
  const cards=participants.map((c,i)=>{
    const file=unionPortraitFiles[c.id];
    const portrait=c.id==="samurai"?`<span class="union-cutin-samurai-mark" aria-label="武士">武</span>`:file?`<img class="union-cutin-portrait" src="assets/characters/${file}" alt="">`:"";
    return `<div class="union-cutin-member" style="--member-index:${i}">${portrait}<span>${esc(c.name)}</span></div>`;
  }).join("");
  layer.innerHTML=`<div class="union-cutin-swipe ${isSamurai?"samurai-cutin":""}"><div class="union-cutin-topline"></div><div class="union-cutin-label">${isSamurai?"SPECIAL UNION ATTACK":"UNION SKILL"}</div><div class="union-cutin-members">${cards}</div><div class="union-cutin-skill">${esc(skill.name)}</div>${isSamurai?'<div class="samurai-cut-line" aria-hidden="true"></div>':""}<div class="union-cutin-bottomline"></div></div>`;
  if(!layer.isConnected)document.body.appendChild(layer);
  // Re-trigger animation on each use; participants appear together.
  layer.classList.remove("is-active","is-exiting");
  void layer.offsetWidth;
  layer.classList.add("is-active");
  playSe("assets/se/unionskill/居合抜き1");
  await wait(280);
  await wait(800);
  layer.classList.remove("is-active");
  layer.classList.add("is-exiting");
  await wait(280);
  layer.classList.remove("is-exiting");
  layer.setAttribute("aria-hidden","true");
  layer.innerHTML="";
}
async function executeUnion(a){const actor=getCharacter(a.actor),u=unionSkills[a.actor],e=battleState.enemy;if(actor&&isSkillRestricted(actor)){pushLog(`${actor.name}は装備の適性がないため、ユニオンスキルを使用できない！`);return;}if(!actor||!u||(battleState.unionGauges[actor.id]||0)<u.requiredHits){pushLog("ユニオンゲージが足りません。");return;}const participants=[actor];if(u.type==="cross-break"){const partner=getCharacter(a.partner);if(!partner||partner.hp<=0||(battleState.unionGauges[partner.id]||0)<unionSkills[partner.id].requiredHits){pushLog("協力者のユニオンゲージが不足しています。");return;}participants.push(partner);}participants.forEach(c=>animatePartyIcon(c.id));await showUnionCutin(u,participants);if(!battleState.enemy||enemyHpTotal(battleState.enemy)<=0)return;await wait(160);if(u.type==="stun"){beginEnemyDamagePreview(e);battleState.unionGauges[actor.id]=0;const dealt=applyDamageToEnemy(e,Math.floor(u.damage*(1+treeBonus(actor.id,"union"))));if(lastEnemyAttackMissed){pushLog(`${e.name}は「${u.name}」を回避した！`);renderBattle();return;}if(dealt>0)addBreakDamage(e,"union","無属性",actor);battleState.enemyStunned=true;pushLog(`${actor.name}の「${u.name}」！ ${dealt}ダメージ。敵の次の行動を妨害！`);combatNumber(displayEnemyNode(),`-${dealt}`,"damage");flashEnemyDamage();sound("damage",true);}else if(u.type==="meteor"){beginEnemyDamagePreview(e);battleState.unionGauges[actor.id]=0;const dealt=applyDamageToEnemy(e,Math.floor(u.damage*(1+treeBonus(actor.id,"union"))));if(lastEnemyAttackMissed){pushLog(`${e.name}は「${u.name}」を回避した！`);renderBattle();return;}if(dealt>0)addBreakDamage(e,"union","無属性",actor);pushLog(`${actor.name}の「${u.name}」！ ${dealt}ダメージ！`);combatNumber(displayEnemyNode(),`-${dealt}`,"damage");flashEnemyDamage();playSe("assets/se/unionskill/聖魔法");}else if(u.type==="aegis"){battleState.aegisActive=true;battleState.unionGauges[actor.id]=0;for(const c of livingParty())c.hp=effectiveStats(c).maxHp;pushLog(`${actor.name}の「${u.name}」！ 生存中の味方全員を全回復し、次の敵ターンを無効化！`);sound("heal");}else if(u.type==="full-heal"){
  let sp=0,revived=0;
  for(const c of getParty()){
    const wasDead=c.hp<=0, before=c.hp, beforeSp=c.sp;
    if(wasDead){c.hp=Math.max(1,Math.floor(effectiveStats(c).maxHp*.5));revived++;}
    else c.hp=effectiveStats(c).maxHp;
    if(c.id!==actor.id)c.sp=Math.min(c.maxSp,c.sp+40+Math.floor(40*treeBonus(actor.id,"unionHeal")));
    const recovered=c.hp-before;
    if(c.id!==actor.id)sp+=c.sp-beforeSp;
    if(recovered>0)combatNumber(c.id,`+${recovered}`,"heal");
    clearNegativeStatuses(c);
  }
  battleState.unionGauges[actor.id]=0;
  pushLog(`${actor.name}の「${u.name}」！ 生存者のHP全回復、${revived}人蘇生、SP合計${sp}回復。状態異常も解除した！`);
  sound("heal");
}else if(u.type==="samurai-slash"){beginEnemyDamagePreview(e);battleState.unionGauges[actor.id]=0;const d=applyWeaponAttributeDamage(e,Math.max(1,Math.floor(effectiveStats(actor).attack*4*(1+treeBonus(actor.id,"union")))),actor);const dealt=applyDamageToEnemy(e,d);if(dealt>0)addBreakDamage(e,"union",getWeaponPhysicalElement(actor),actor);pushLog(`${actor.name}の「${u.name}」！ 渾身の一刀で${dealt}ダメージ！（防御無視）`);combatNumber(displayEnemyNode(),`-${dealt}`,"damage");showHitEffect("samurai");flashEnemyDamage();sound("damage",true);}else if(u.type==="cross-break"){const partner=getCharacter(a.partner);beginEnemyDamagePreview(e);let total=0;for(let i=0;i<2;i++){const d=applyWeaponAttributeDamage(e,Math.max(1,Math.floor(actor.spAttack*(1+treeBonus(actor.id,"union")))),actor);const dealt=applyDamageToEnemy(e,d);total+=dealt;if(dealt>0)addBreakDamage(e,"union",getWeaponPhysicalElement(actor),actor);if(enemyHpTotal(e)<=0)break;}if(enemyHpTotal(e)>0){const attack=effectiveStats(partner).attack;const d=applyWeaponAttributeDamage(e,Math.floor(calcEnemyPhysicalDamage(e,attack)*(1+treeBonus(partner.id,"union"))),partner);for(let i=0;i<2;i++){const dealt=applyDamageToEnemy(e,d);total+=dealt;if(dealt>0)addBreakDamage(e,"union",getWeaponPhysicalElement(partner),partner);if(enemyHpTotal(e)<=0)break;}}battleState.unionGauges[actor.id]=0;battleState.unionGauges[partner.id]=0;pushLog(`${actor.name}と${partner.name}の「${u.name}」！ 合計${total}ダメージ！`);combatNumber(displayEnemyNode(),`-${total}`,"damage");sound("damage",true);}
 renderBattle();}
async function applyEnemyTurnStatuses(){
  for(const c of getParty()){
    if(burnedTurns[c.id]>0){
      if(c.hp>0){
        const dealt=await applyPartyDamageAnimated(c,10,{sureHit:true,element:"炎",statusDamage:true});
        if(dealt>0)pushEvent(`${c.name}は火傷で${dealt}ダメージを受けた！`);
        if(c.hp<=0)pushEvent(`${c.name}は戦闘不能になった！`);
      }
      burnedTurns[c.id]--;if(burnedTurns[c.id]<=0){delete burnedTurns[c.id];pushEvent(`${c.name}の火傷が治まった。`);}
    }
    if(defenseDownFresh.has(c.id)){defenseDownFresh.delete(c.id);}else if(c._defenseDownTurns>0)c._defenseDownTurns--;
    if(c._defenseDownTurns<=0){c._defenseDown=0;c._defenseDownTurns=0;}
  }
  if(battleState.defenseCampTurns>0)battleState.defenseCampTurns--;
  battleState.magicGuardActive=false;battleState._magicGuardRate=.5;
  battleState.fullGuardActive=false;delete battleState.guarding.knight;
  if(battleState.knightFullGuardCooldown>0)battleState.knightFullGuardCooldown--;
  renderBattle();
}
function describeEnemyAction(e,turn){
  if(e?.name==="ドラゴン"&&(turn===1||turn%3===0))return "ドラゴンブレス";
  if(e?.name==="ゴブリン"&&goblinCharging)return "強打";
  if(e?.name==="魔王"&&turn===15)return "破滅の光";
  if(e?.name==="魔王"&&[4,8,12].includes(turn))return "瘴気の黒炎";
  return e?.actionName||"通常攻撃";
}
async function enemyTurn(){
  const e=battleState.enemy;
  if(!e)return;
  if(battleState.tutorialMode){
    const phase=tutorialState.battlePhase;
    if(phase==="normal-resolved"){
      pushEvent("このスライムは物理攻撃に強いみたいだ。通常攻撃ではほとんどダメージを与えられないぞ！");tutorialState.battlePhase="sp";tutorialSave();
      return;
    }
    if(phase==="sp-resolved"){
      pushEvent("次のターン、強力な攻撃が来るみたいだ……！ 全員で防御しよう。","warning");tutorialState.battlePhase="guard";tutorialSave();
      return;
    }
    if(phase==="guard-resolved"){
      pushEvent("スライムaは強力な全体攻撃を準備している！","warning");
      for(const c of livingParty()){
        const raw=Math.max(1,Math.floor(effectiveStats(c).maxHp*.90));
        const reduction=battleState.guarding[c.id]||0;
        const dealt=Math.max(1,Math.floor(raw*(1-reduction)));
        await applyPartyDamageAnimated(c,dealt,{sureHit:true,bypassMitigation:true});
      }
      pushEvent("防御していれば、受けるダメージを大きく抑えられる！");tutorialState.battlePhase="union";tutorialSave();
      return;
    }
    if(phase==="union-resolved"){
      pushEvent("ユニオンスキルの体験は完了だ！ 撤退を選んで拠点へ戻ろう。");tutorialState.battlePhase="retreat";tutorialSave();
      return;
    }
    return;
  }
  const aegisForThisTurn=battleState.aegisActive;
  battleState.aegisActive=false;
  pushEvent("―― 敵のターン ――");
  const turn=battleState.turnCount+1;
  // 魔王戦の15ターン目は、ブレイク・スタン・イージスより優先される強制敗北イベント。
  if(e.name==="魔王"&&turn===15){
    pushEvent("終わりの時だ","maou-shake");await wait(2200);
    animateEnemyAttack();document.querySelector(".battle-arena")?.classList.add("maou-dark-flames");setTimeout(()=>document.querySelector(".battle-arena")?.classList.remove("maou-dark-flames"),battleDelayMs(850));
    pushEvent("魔王は「破滅の光」を放った！");sound("damage",true);
    for(const c of livingParty().slice())await applyPartyDamageAnimated(c,c.hp,{sureHit:true,bypassMitigation:true});
    pushEvent("味方全員が倒れた……。");await applyEnemyTurnStatuses();return;
  }
  if(e._brokenTurns>0){
    e._brokenTurns--;battleState.enemyStunned=false;pushEvent(`${e.name}はブレイク状態で行動できない！`);e._breakCurrent=e._breakMax;await applyEnemyTurnStatuses();return;
  }
  if(battleState.enemyStunned){battleState.enemyStunned=false;pushEvent(e.name==="魔王"?"魔王はスタンして行動できなかった！":`${e.name}はスタンして行動できなかった！`);await applyEnemyTurnStatuses();return;}
  if(aegisForThisTurn){pushEvent(`${e.name}は「${describeEnemyAction(e,battleState.turnCount+1)}」を仕掛けた！`);pushEvent("イージスの盾が攻撃を防いだ！");sound("guard",true);await applyEnemyTurnStatuses();return;}
  const alive=livingParty();
  if(!alive.length)return;
  if(e.name==="混沌の幻影"){
    if(e.hp<=e.maxHp*.5&&!e._transformed){e._transformed=true;e.attack=Math.floor(e.attack*1.2);e.spAttack=Math.floor(e.spAttack*1.2);e.defense=Math.floor(e.defense*1.1);e._chaosWaveBonus=1.2;pushEvent("混沌の幻影は姿を変え、力を増した！","warning");document.querySelector(".battle-arena")?.classList.add("boss-transformed");}
    const roll=Math.random();
    if(roll<.2){const target=alive[Math.floor(Math.random()*alive.length)];target._stunTurns=2;target._actionDisabledTurns=2;if(target.id==="mage")mageCompressionStacks.mage=0;pushEvent(`混沌の幻影の「ダークバインド」！ ${target.name}は2ターン行動不能になった！`);}
    else if(roll<.55){pushEvent("混沌の幻影は「カオスウェーブ」を放った！");document.querySelector(".battle-arena")?.classList.add("maou-dark-flames");setTimeout(()=>document.querySelector(".battle-arena")?.classList.remove("maou-dark-flames"),battleDelayMs(850));for(const c of alive.slice()){let d=Math.floor(60*(e._chaosWaveBonus||1));d=Math.floor(d*(1-(battleState.guarding[c.id]||0)));await applyPartyDamageAnimated(c,d,{magic:true});}}
    else {const target=alive.find(c=>c.id===battleState.tauntTarget)||alive[Math.floor(Math.random()*alive.length)];let d=calcPhysical(e.attack,effectiveStats(target).defense,!!battleState.guarding[target.id]);d=Math.floor(d*(1-(battleState.guarding[target.id]||0)));const dealt=await applyPartyDamageAnimated(target,d,{normalAttack:true});if(dealt>0)pushEvent(`混沌の幻影の「混沌の一撃」！ ${target.name}に${dealt}ダメージ。`);}
    battleState.tauntTarget=null;await applyEnemyTurnStatuses();return;
  }
  if(e.name==="ゴブリン"&&e.members){
    const living=e.members.filter(m=>m.hp>0);
    if(goblinTeamAttackPending){
      if(living.length>=3&&!goblinTeamAttackUsed){
      goblinTeamAttackPending=false;goblinTeamAttackUsed=true;animateEnemyAttack();pushEvent("ゴブリンたちは連携攻撃を仕掛けた！","warning");sound("damage",true);
      const totals={};let attacks=0;
      for(let i=0;i<living.length*3;i++){
        const targets=livingParty();if(!targets.length)break;
        const target=targets[Math.floor(Math.random()*targets.length)];
        const raw=calcPhysical(e.attack,effectiveStats(target).defense,false);
        const d=Math.floor(raw*(1-(battleState.guarding[target.id]||0)));
        const dealt=await applyPartyDamageAnimated(target,d,{normalAttack:true});totals[target.name]=(totals[target.name]||0)+dealt;attacks++;
        await wait(160);
      }
      pushEvent(`連携攻撃 ${attacks}回。`);for(const [name,total] of Object.entries(totals))if(total>0)pushEvent(`${name}は合計${total}ダメージを受けた！`);
      await applyEnemyTurnStatuses();return;
      } else {goblinTeamAttackPending=false;pushEvent("ゴブリンの連携は失敗に終わった・・・");await wait(2000);}
    }
    if(living.length>=3&&!goblinTeamAttackUsed&&!goblinTeamAttackPending&&Math.random()<.70){goblinTeamAttackPending=true;pushEvent("ゴブリンたちは連携攻撃の構えを取った！ 次のターンに連携攻撃が来る！","warning");await applyEnemyTurnStatuses();return;}
  }
  if(e.name==="オオカミ"){
    // 警鐘を鳴らした次の敵ターンに、分身がいなければ必ず3体へ分身する。
    if(battleState.wolfSplitPending){
      battleState.wolfSplitPending=false;
      if(!(battleState.wolfClones||[]).some(c=>c.hp>0)){
        battleState.wolfClones=[0,1].map(i=>({id:`wolf-clone-${i}`,hp:e.hp,maxHp:e.maxHp,name:"オオカミ",defense:e.defense,attack:e.attack,isFake:true,_buffs:{evasionTurns:battleState.wolfEvasionTurns}}));
        battleState.wolfCloneTurns=0;
        battleState.wolfDisplayOrder=["wolf-main","wolf-clone-0","wolf-clone-1"];
        for(let i=battleState.wolfDisplayOrder.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[battleState.wolfDisplayOrder[i],battleState.wolfDisplayOrder[j]]=[battleState.wolfDisplayOrder[j],battleState.wolfDisplayOrder[i]];}
        const arena=document.querySelector(".battle-arena");arena?.classList.add("wolf-mist");await wait(620);arena?.classList.remove("wolf-mist");
        pushEvent("霧の中からオオカミが3体に分身した……！");renderBattle();
      }
    }
    if(turn===1){battleState.wolfEvasionTurns=3;battleState.wolfSplitPending=true;pushEvent("オオカミは「警鐘」を鳴らした！ 3ターンの間、攻撃を回避しやすくなった！");await applyEnemyTurnStatuses();return;}
    if(turn>1&&battleState.wolfEvasionTurns<=0&&Math.random()<.80){battleState.wolfEvasionTurns=3;battleState.wolfSplitPending=true;pushEvent("オオカミは再び「警鐘」を鳴らした！ 3ターンの間、攻撃を回避しやすくなった！");await applyEnemyTurnStatuses();return;}
  }
  if(e.name==="ドラゴン"&&(turn===1||turn%3===0)){
    animateEnemyAttack();document.querySelector(".battle-arena")?.classList.add("dragon-breath");setTimeout(()=>document.querySelector(".battle-arena")?.classList.remove("dragon-breath"),battleDelayMs(850));pushEvent(turn===1?"ドラゴンは全体SP攻撃「ドラゴンブレス」を放った！":"ドラゴンは「ドラゴンブレス」を吐いた！");
    playSe("assets/se/tekikoudou/ドラゴンが火を吐く");
    const targets=alive.slice();
    for(const c of targets){
      if(c.hp<=0)continue;
      const guardMultiplier=battleState.fullGuardActive&&c.id==="knight"?1-(battleState._fullGuardReduction||.4):battleState.guarding[c.id]?0.5:1;const raw=calcSp(e.spAttack||80,effectiveSpDefense(c));const d=Math.floor(raw*guardMultiplier);
      await applyPartyDamageAnimated(c,d,{element:"炎",magic:true});
      if(c.hp>0&&Math.random()<(e._burnChance||.30)){burnedTurns[c.id]=2;pushEvent(`${c.name}は火傷状態になった！`);renderBattle();}
    }
    await applyEnemyTurnStatuses();return;
  }
  if(e.name==="ゴブリン"&&goblinCharging){const target=alive.find(c=>c.id===battleState.tauntTarget)||alive[Math.floor(Math.random()*alive.length)];const stats=effectiveStats(target);const raw=calcPhysical(e.attack*2.8,stats.defense,false);const d=Math.floor(raw*(1-(battleState.guarding[target.id]||0)));goblinCharging=false;animateEnemyAttack();sound("damage",true);const dealt=await applyPartyDamageAnimated(target,d,{normalAttack:true});if(dealt>0)pushEvent(`ゴブリンの「強打」！ ${target.name}に${dealt}ダメージ。`);await applyEnemyTurnStatuses();return;}
  if(e.name==="ゴブリン"){goblinCharging=true;pushEvent("ゴブリンは棍棒を振り上げた！ 次のターンに強打が来る！","warning");await applyEnemyTurnStatuses();return;}
  if(e.name==="魔王"&&[4,8,12].includes(turn)){
    animateEnemyAttack();document.querySelector(".battle-arena")?.classList.add("maou-dark-flames");setTimeout(()=>document.querySelector(".battle-arena")?.classList.remove("maou-dark-flames"),battleDelayMs(850));
    pushEvent("魔王は「瘴気の黒炎」を放った！");sound("damage",true);
    for(const c of alive.slice()){
      if(c.hp<=0)continue;
      const guardMultiplier=battleState.fullGuardActive&&c.id==="knight"?1-(battleState._fullGuardReduction||.4):battleState.guarding[c.id]?0.5:1;const d=Math.floor(80*guardMultiplier);
      await applyPartyDamageAnimated(c,d,{element:"炎",magic:true});
      if(c.hp>0&&Math.random()<.5){burnedTurns[c.id]=4;pushEvent(`${c.name}は火傷状態になった！`);renderBattle();}
    }
    await applyEnemyTurnStatuses();return;
  }
  const taunt=alive.find(c=>c.id===battleState.tauntTarget);
  const rearIds=new Set(["mage","healer"]);
  const rear=alive.filter(c=>rearIds.has(c.id));
  let target=taunt||(e.name==="オオカミ"?(alive.find(c=>c.id===battleState.wolfLastTargetId)||rear[Math.floor(Math.random()*Math.max(1,rear.length))]||alive[Math.floor(Math.random()*alive.length)]):alive[Math.floor(Math.random()*alive.length)]);
  let stats=effectiveStats(target);if(target.id==="kotama"&&target.hp<=stats.maxHp*BATTLE_RULES.passives.kotama.threshold)stats={...stats,defense:Math.floor(stats.defense*BATTLE_RULES.passives.kotama.lowHpDefense)};
  const sp=(e.name==="魔王"&&Math.random()>=.7);
  let damage=sp?calcSp(e.spAttack||0,e.spDefense??Math.floor(e.defense/2),!!battleState.guarding[target.id]):calcPhysical(e.attack,stats.defense,!!battleState.guarding[target.id]);
  if(e.name==="オオカミ"&&battleState.wolfLastTargetId===target.id)damage*=2;
  damage=Math.floor(damage*(1-(battleState.guarding[target.id]||0)));
  // チュートリアルで防御の効果を理解しやすくするため、
  // スライムの通常攻撃を騎士がガードした場合は最大HPの1/5を受ける。
  // 防具未装備なら防御態勢でも最大HPの1/3を受ける。
  if(e.name==="スライム"&&target.id==="knight"&&!sp&&battleState.guarding[target.id]){
    const hasArmor=!!equipment.knight?.armor;
    damage=Math.max(1,Math.floor(effectiveStats(target).maxHp*(hasArmor?1/5:1/3)));
  }
  const finalTarget=battleState.fullGuardActive&&target.id!=="knight"&&getCharacter("knight")?.hp>0?getCharacter("knight"):target;animateEnemyAttack();pushEvent(`${e.name}は「${sp?"ダーククロー":(e.actionName||"攻撃")}」で攻撃した！ ${finalTarget.name}に${damage}ダメージ。`);if(e.name==="スライム")playSe("assets/se/tekikoudou/スライムの攻撃");else if(e.name==="魔王"&&!sp)playSe("assets/se/tekikoudou/16bitアタック");else sound("damage",true);await applyPartyDamageAnimated(target,damage,{normalAttack:!sp,spAttack:sp,magic:sp});if(e.name==="スライム"&&target.hp>0){target._defenseDownTurns=5;target._defenseDown=5;defenseDownFresh.add(target.id);pushEvent(`${target.name}の防御力が下がった！`);}if(e.name==="オオカミ")battleState.wolfLastTargetId=target.hp>0?target.id:null;
  if(e.name==="オオカミ"&&(battleState.wolfClones||[]).some(c=>c.hp>0)){
    for(const clone of (battleState.wolfClones||[]).filter(c=>c.hp>0)){
      const cloneTarget=livingParty().find(c=>c.id===battleState.wolfLastTargetId)||livingParty().filter(c=>rearIds.has(c.id))[0]||livingParty()[0];
      if(!cloneTarget)break;
      let cd=calcPhysical(e.attack,effectiveStats(cloneTarget).defense,false);
      if(battleState.wolfLastTargetId===cloneTarget.id||battleState.wolfCloneLastTargetId===cloneTarget.id)cd*=2;
      cd=Math.floor(cd*(1-(battleState.guarding[cloneTarget.id]||0)));
      const cloneDealt=await applyPartyDamageAnimated(cloneTarget,cd,{normalAttack:true});
      if(cloneDealt>0)pushEvent(`オオカミの幻影が${cloneTarget.name}を攻撃！ ${cloneDealt}ダメージ。`);
      battleState.wolfCloneLastTargetId=cloneTarget.hp>0?cloneTarget.id:null;
    }
  }
  if(battleState.wolfEvasionTurns>0)battleState.wolfEvasionTurns--;
  battleState.tauntTarget=null;
  await applyEnemyTurnStatuses();
}
async function playEnemyDefeatAnimation(){
  const arena=document.querySelector(".battle-arena"),display=$("battle-enemy"),enemy=battleState.enemy;
  if(!arena||!display)return;
  arena.classList.remove("enemy-defeating","enemy-defeated","enemy-pixel-defeating");void arena.offsetWidth;
  if(enemy?.name!=="魔王"){
    arena.classList.add("enemy-pixel-defeating");await wait(620);arena.classList.remove("enemy-pixel-defeating");arena.classList.add("enemy-defeated");
  }else{arena.classList.add("enemy-defeating");await wait(900);arena.classList.remove("enemy-defeating");arena.classList.add("enemy-defeated");}
}
async function finishStage(){
  if(battleState.stageFinished)return;
  const e=battleState.enemy;
  if(!e)return;
  battleState.stageFinished=true;
  battleState.busy=true;
  await playEnemyDefeatAnimation();
  battleState.lastRewardGold=e.gold;
  registerDefeat(e.name);
  totalEnemyDefeats+=Array.isArray(e.members)?e.members.length:1;
  state.gold+=e.gold;
  const rankResult=recordBattleRank();
  awardVictoryAchievements(e,rankResult.turns,rankResult.kos);
  let hiddenBossWasFirstClear=false;if(e.name==="混沌の幻影"){if(!hiddenBossFirstClear){hiddenBossWasFirstClear=true;state.gold+=1000;materials.chaos_crystal=(materials.chaos_crystal||0)+3;inventory["acc-chaos-charm"]=(inventory["acc-chaos-charm"]||0)+1;hiddenBossFirstClear=true;}else state.gold+=100;}
  const droppedItems=awardMaterials(e);
  if(e.name==="混沌の幻影"&&hiddenBossWasFirstClear)droppedItems.push({id:"chaos_crystal",name:"混沌の結晶",count:3});
  await showItemDropAnimation(droppedItems);
  if(!battleState.hiddenBossMode){stageCleared[battleState.stage]=true;state.maxUnlockedStage=Math.max(state.maxUnlockedStage||1,Math.min(battleState.maxStage,battleState.stage+1));stageSkillPointAwarded[battleState.stage]=stageSkillPointAwarded[battleState.stage]||{};for(const member of getParty())if(!stageSkillPointAwarded[battleState.stage][member.id]){trainingPoints[member.id]=(trainingPoints[member.id]||0)+3;stageSkillPointAwarded[battleState.stage][member.id]=true;}}
  // 討伐記録・報酬・クリア記録・次ステージ解放を、画面遷移前に一括保存する。
  persistAutoSave();
  renderGold();
  renderClearSummary();
  if(battleState.stage>=battleState.maxStage&&!battleState.hiddenBossMode){
    await playMaouClearAnimation();
  }
  await new Promise(resolve=>playStageClearEvent(battleState.stage,!!battleState.hiddenBossMode,resolve));
  if($("bgm-toggle")?.checked)startBgm();
  $("battle-commands").hidden=true;$("battle-commands").replaceChildren();
  $("battle-bottom")?.classList.add("result-shown");
  $("battle-support").hidden=true;
  $("battle-result").hidden=false;
  $("retry-stage-button").hidden=true;$("formation-retry-button").hidden=true;$("return-home-button").hidden=true;
  const rankLine=`戦闘ランク：${rankResult.rank} ／ ${rankResult.turns}ターン ／ 戦闘不能 ${rankResult.kos}人 ／ ランク報酬 +${rankResult.bonus}G`;
  if(battleState.hiddenBossMode){
    $("result-title").textContent="HIDDEN BOSS CLEAR!";$("result-message").textContent=(hiddenBossWasFirstClear?"初回討伐報酬：1000G・混沌の結晶×3・混沌の護符":"再挑戦報酬：100G")+"\n"+rankLine;$("next-stage-button").hidden=true;
  }else if(battleState.stage>=battleState.maxStage){
    $("result-title").textContent="GAME CLEAR!";
    playSe("assets/se/syouri/アイテムを入手2");
    $("result-message").textContent=`魔王を倒した！ ${e.gold}Gを獲得！\n${rankLine}`;
    $("next-stage-button").hidden=false;
    $("next-stage-button").textContent="ENDINGへ";
  }else{
    $("result-title").textContent="STAGE CLEAR!";
    $("result-message").textContent=`${e.name}を倒した！ ${e.gold}Gを獲得！\n${rankLine}`;
    $("next-stage-button").hidden=false;
    $("next-stage-button").textContent="次へ";
  }
  $("return-home-button").hidden=false;
  pushLog(`${e.name}を倒した！ ${e.gold}G獲得。`);
}
function finishDefeat(){
  playSe("assets/se/haiboku/おやすみ");
  battleState.busy=true;
  battleState.stageFinished=true;
  retryContext={stage:battleState.stage,hiddenBossMode:!!battleState.hiddenBossMode};
  $("battle-commands").hidden=true;$("battle-commands").replaceChildren();
  $("battle-bottom")?.classList.add("result-shown");
  $("battle-support").hidden=true;
  $("battle-result").hidden=false;
  $("result-title").textContent="DEFEAT…";
  $("result-message").textContent="仲間が全員倒れてしまった。獲得した報酬・素材・ランクはありません。";
  $("next-stage-button").hidden=true;
  $("retry-stage-button").hidden=true;
  $("formation-retry-button").hidden=true;
  $("return-home-button").hidden=false;
  $("result-message").innerHTML="仲間が全員倒れてしまった。獲得した報酬・素材・ランクはありません。<br><strong class=\"defeat-preparation-warning\">装備、強化は万全ですか？</strong>";
}
function startStageFromRetryContext(){
  if(!retryContext)return;
  const context={...retryContext};retryContext=null;
  resetTransientBattleState();
  battleState.hiddenBossMode=context.hiddenBossMode;
  battleState.maxStage=context.hiddenBossMode?6:5;
  battleState.stage=context.stage;
  battleState.koCount=0;battleState.rankResult=null;
  battleState.unionGauges={kotama:0,knight:0,healer:0,warrior:0,mage:0,samurai:0};
  getParty().forEach(c=>{c.hp=effectiveStats(c).maxHp;c.sp=c.maxSp;});
  beginStage();
}
function retrySameStage(){if(!retryContext)return;startStageFromRetryContext();}
function goFormationForRetry(){if(!retryContext)return;showScreen("formation");setSystemMessage("編成・装備を調整し、「決定」を押すと同じステージを再開します。");}
function startHiddenBoss(){if(!hiddenBossUnlocked())return;battleBgmSelections={};stageIntroStoryPending=false;retryContext=null;resetTransientBattleState();battleState.koCount=0;battleState.rankResult=null;battleState.hiddenBossMode=true;battleState.stage=6;battleState.maxStage=6;battleState.unionGauges={kotama:0,knight:0,healer:0,warrior:0,mage:0,samurai:0};getParty().forEach(c=>{c.hp=effectiveStats(c).maxHp;c.sp=c.maxSp;});beginStage();}
function nextStage(){if(battleState.hiddenBossMode){showScreen("home");return;}if(battleState.stage>=battleState.maxStage){showScreen("clear");return;}battleState.stage++;beginStage();}
function setupBattleButtons(){$("next-stage-button")?.addEventListener("click",nextStage);$("return-home-button")?.addEventListener("click",()=>{retryContext=null;showScreen("home");});$("retry-stage-button")?.addEventListener("click",retrySameStage);$("formation-retry-button")?.addEventListener("click",goFormationForRetry);}
function describeCommand(button){const hint=$("command-hint");if(!hint||!button)return;const action=button.dataset.action,skillId=button.dataset.skill,itemId=button.dataset.item,unionType=button.dataset.union,target=button.dataset.target,partner=button.dataset.partner;let text="コマンドを選択してください。";
 if(action==="attack")text="敵単体を攻撃します。基本の一撃でユニオンゲージも上昇します。";
 else if(action==="guard")text="身構えて、次に受ける攻撃のダメージを軽減します。";
 else if(action==="skill")text="SPを消費して、キャラクター固有の技を使用します。";
 else if(action==="item")text="所持している回復アイテムを使用します。";
 else if(action==="back")text="ひとつ前の選択へ戻ります。";
 else if(skillId){const actor=currentActor(),sk=getCharacterSkills(actor).find(x=>x.id===skillId);if(sk)text=({taunt:"敵の攻撃を引きつけ、仲間を守ります。",heal:"SP攻撃力をもとに、味方1人のHPを回復します。",revive:"倒れた味方1人をHP少量で蘇生します。",spAttack:"魔力を弾丸に変え、敵単体へダメージを与えます。",charge:"HPとSPを代償に、強烈な一撃を放ちます。",fire:`${sk.element||"炎"}属性の全体魔法です。敵全体に魔力をもとにしたダメージを与えます。${sk.element||"炎"}に弱い敵には威力が上がり、${sk.element||"炎"}に耐性を持つ敵には威力が下がります。`,ice:"氷属性の全体魔法です。敵全体に魔力をもとにしたダメージを与えます。氷に弱い敵に有効です。",thunder:"雷属性の全体魔法です。敵全体に魔力をもとにしたダメージを与えます。雷に弱い敵に有効です。"})[sk.type]||describeSkill(sk);}
 else if(itemId){const it=itemById(itemId);if(it)text=it.description;}
 else if(unionType){const actor=currentActor(),u=actor&&unionSkills[actor.id];if(u)text=({stun:"至高の魔弾。敵を貫き、次の行動を封じる必殺の一撃。",aegis:"イージスの大盾。仲間を全快させ、敵の次の攻撃を防ぎます。","full-heal":"フルヒーリング。仲間全員を癒やし、SPも回復します。","cross-break":"クロスブレイク。仲間と連携して連続攻撃を放ちます。",meteor:"メテオ。天より隕石を呼び、666の固定ダメージを与えます。"})[u.type]||u.name;}
 else if(target){const c=getCharacter(target);if(c)text=`${c.name}を対象に選びます。HP ${Math.max(0,c.hp)}/${effectiveStats(c).maxHp}、SP ${c.sp}/${c.maxSp}。`;}
 else if(partner){const c=getCharacter(partner);if(c)text=`${c.name}と連携します。協力者のユニオンゲージも消費します。`;}
 hint.textContent=text;
}
let lastHoveredCommand=null, mouseFocusedCommand=null;
document.addEventListener("pointerover",e=>{
  const b=e.target.closest("#battle-commands .command-option");
  if(!b||b.disabled)return;
  if(lastHoveredCommand!==b){sound("move");lastHoveredCommand=b;}
  mouseFocusedCommand=b;
  const opts=[...($("battle-commands")?.querySelectorAll(".command-option")||[])];
  opts.forEach((x,i)=>{
    x.classList.toggle("mouse-focus",x===b);
    if(x!==b)x.classList.remove("keyboard-focus");
    else keyboardCursor=i;
  });
  describeCommand(b);
});
document.addEventListener("pointerout",e=>{
  if(!e.relatedTarget?.closest("#battle-commands .command-option")){
    lastHoveredCommand=null;
    mouseFocusedCommand=null;
    document.querySelectorAll("#battle-commands .command-option.mouse-focus").forEach(x=>x.classList.remove("mouse-focus"));
  }
});
document.addEventListener("focusin",e=>{const b=e.target.closest("#battle-commands .command-option");if(b&&!b.disabled){document.querySelectorAll("#battle-commands .command-option").forEach(x=>x.classList.toggle("keyboard-focus",x===b));describeCommand(b);}});
// Keyboard: battle commands and the post-battle confirmation buttons.
let keyboardCursor=0;
document.addEventListener("keydown",e=>{
  const tutorialOverlayElement=$("tutorial-overlay");
  if(tutorialState.started&&!tutorialState.completed&&tutorialOverlayElement&&!tutorialOverlayElement.hidden){
    if(["Enter"," ","ArrowDown","ArrowUp","ArrowLeft","ArrowRight","Escape"].includes(e.key)){
      e.preventDefault();e.stopImmediatePropagation();
      if((e.key==="Enter"||e.key===" ")&&!$("tutorial-next")?.hidden&&!$("tutorial-next")?.disabled){$("tutorial-next").click();}
    }
    return;
  }
  if(state.screen==="clear"){
    const clearButtons=[...($("clear")?.querySelectorAll("button:not(:disabled):not([hidden])")||[])];
    if((e.key==="Enter"||e.key===" ")&&clearButtons.length){
      const active=document.activeElement;
      if(active===document.body||!clearButtons.includes(active)){e.preventDefault();clearButtons[0].focus();clearButtons[0].click();}
      return;
    }
    if(["ArrowDown","ArrowUp","ArrowRight","ArrowLeft"].includes(e.key)&&clearButtons.length){
      e.preventDefault();const idx=clearButtons.indexOf(document.activeElement);clearButtons[(idx<0?0:(idx+1)%clearButtons.length)].focus();return;
    }
    return;
  }
  if(state.screen!=="battle")return;

  // The result dialog is displayed while battleState.busy remains true;
  // handle its buttons before the regular battle-input lock.
  const result=$("battle-result");
  if(result&&!result.hidden){
    const resultButtons=[...result.querySelectorAll("button:not(:disabled):not([hidden])")];
    if(!resultButtons.length)return;
    const focusedIndex=resultButtons.indexOf(document.activeElement);
    if(["ArrowDown","ArrowUp","ArrowRight","ArrowLeft"].includes(e.key)){
      e.preventDefault();
      const direction=(e.key==="ArrowDown"||e.key==="ArrowRight")?1:-1;
      const nextIndex=focusedIndex<0?0:(focusedIndex+direction+resultButtons.length)%resultButtons.length;
      resultButtons[nextIndex].focus();
      sound("move");
      return;
    }
    if(e.key==="Enter"||e.key===" "){
      e.preventDefault();
      const button=focusedIndex>=0?resultButtons[focusedIndex]:resultButtons[0];
      button.focus();
      button.click();
      return;
    }
    return;
  }

  if(battleState.busy)return;
  const opts=[...($("battle-commands")?.querySelectorAll("button:not(:disabled)")||[])];
  if(!opts.length)return;
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){
    e.preventDefault();
    keyboardCursor=(keyboardCursor+(e.key==="ArrowDown"?1:-1)+opts.length)%opts.length;
    opts.forEach((b,i)=>b.classList.toggle("keyboard-focus",i===keyboardCursor));
    if(battleState.menuMode==="target"){
      const selected=opts[keyboardCursor];
      if(selected?.dataset.enemyTarget)highlightEnemyTarget(selected.dataset.enemyTarget);
      else highlightEnemyTarget(null);
    }
    sound("move");
  }else if(e.key==="Enter"||e.key===" "){
    // Always route Enter/Space to the visibly selected command. Mouse hover takes
    // priority so a stale keyboard focus cannot activate a different command.
    e.preventDefault();
    const hovered=opts.includes(mouseFocusedCommand)&&!mouseFocusedCommand.disabled?mouseFocusedCommand:null;
    const focused=document.activeElement?.closest?.("#battle-commands .command-option");
    const keyboardMarked=opts.find(b=>b.classList.contains("keyboard-focus"));
    const button=hovered||(opts.includes(focused)&&!focused.disabled?focused:null)||(keyboardMarked&&!keyboardMarked.disabled?keyboardMarked:null)||opts[keyboardCursor];
    if(button&&!button.disabled){
      keyboardCursor=opts.indexOf(button);
      opts.forEach((b,i)=>b.classList.toggle("keyboard-focus",i===keyboardCursor));
      button.click();
    }
  }else if(e.key==="Escape"){
    e.preventDefault();
    if(state.screen==="battle"){if(battleState.currentActorIndex>0)undoPrevious();}else showScreen("home");
  }
},true);
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.disabled)return;if(!b.dataset.silentSound&&!b.matches("[data-action],[data-skill],[data-item],[data-target],[data-partner],[data-union]"))sound("select");if($("bgm-toggle")?.checked)startBgm();});

// ===== 開発者用管理パネル（確認・バックアップ中心） =====
let adminActiveTab="player";
function adminValue(value){return value===undefined||value===null||value===""?"—":String(value);}
function adminRow(label,value){return `<div class="admin-data-row"><span>${esc(label)}</span><strong>${esc(adminValue(value))}</strong></div>`;}
function adminPanelMarkup(){
  if($("kotama-admin-panel"))return;
  const launcher=document.createElement("button");launcher.id="kotama-admin-launcher";launcher.type="button";launcher.textContent="DEV";launcher.title="開発者用管理パネル";launcher.setAttribute("aria-label","開発者用管理パネルを開く");
  const panel=document.createElement("section");panel.id="kotama-admin-panel";panel.hidden=true;panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-labelledby","kotama-admin-title");
  panel.innerHTML=`<div class="kotama-admin-window"><header class="kotama-admin-header"><div><small>DEVELOPER TOOLS</small><h2 id="kotama-admin-title">管理者パネル</h2></div><button type="button" id="kotama-admin-close" aria-label="閉じる">×</button></header><nav class="kotama-admin-tabs" aria-label="管理者パネルのタブ"><button type="button" data-admin-tab="player">プレイヤー</button><button type="button" data-admin-tab="progress">ステージ進行</button><button type="button" data-admin-tab="battle">戦闘テスト</button><button type="button" data-admin-tab="save">セーブ管理</button></nav><div id="kotama-admin-content" class="kotama-admin-content"></div><footer class="kotama-admin-footer"><span>開発者専用・通常プレイのデータ変更は行いません</span><button type="button" id="kotama-admin-close-bottom">閉じる</button></footer></div>`;
  document.body.append(launcher,panel);
  launcher.addEventListener("click",()=>{renderAdminPanel();panel.hidden=false;document.body.classList.add("admin-panel-open");$("kotama-admin-close")?.focus();});
  const close=()=>{panel.hidden=true;document.body.classList.remove("admin-panel-open");launcher.focus();};
  $("kotama-admin-close").addEventListener("click",close);$("kotama-admin-close-bottom").addEventListener("click",close);
  panel.addEventListener("click",e=>{if(e.target===panel)close();});
  panel.querySelectorAll("[data-admin-tab]").forEach(b=>b.addEventListener("click",()=>{adminActiveTab=b.dataset.adminTab;renderAdminPanel();}));
  document.addEventListener("keydown",e=>{if(!panel.hidden&&e.key==="Escape"){e.preventDefault();close();}});
}
function adminRenderPlayer(){
  const members=characters.map(c=>{const st=effectiveStats(c),slots=equipment[c.id]||{};return `<article class="admin-card"><h3>${esc(c.name)} <small>Lv.${characterLevels[c.id]||1}</small></h3>${adminRow("HP",`${c.hp} / ${st.maxHp}`)}${adminRow("SP",`${c.sp} / ${c.maxSp}`)}${adminRow("攻撃 / 防御",`${st.attack} / ${st.defense}`)}${adminRow("SP攻撃 / SP防御",`${st.spAttack} / ${st.spDefense}`)}${adminRow("武器",getEquippedName(c,"weapon"))}${adminRow("防具",getEquippedName(c,"armor"))}${adminRow("アクセサリ",[slots.accessory1,slots.accessory2].filter(Boolean).map(id=>itemById(id)?.name||id).join(" / ")||"なし")}${adminRow("習得スキル",treeNodes(c.id).filter(n=>getTreeLevel(c.id,n.id)>0).map(n=>`${n.name} Lv.${getTreeLevel(c.id,n.id)}`).join("、")||"なし")}</article>`;}).join("");
  const items=Object.entries(inventory).filter(([,n])=>Number(n)>0).map(([id,n])=>`${itemById(id)?.name||id} ×${n}`);const mats=Object.entries(materials).filter(([,n])=>Number(n)>0).map(([id,n])=>`${materialNames[id]||id} ×${n}`);
  return `<div class="admin-section"><h3>プレイヤー情報</h3>${adminRow("所持ゴールド",`${state.gold} G`)}${adminRow("編成",getParty().map(c=>c.name).join(" / "))}<h3>所持品</h3>${adminRow("アイテム・装備",items.join("、")||"なし")}${adminRow("素材",mats.join("、")||"なし")}</div><div class="admin-grid">${members}</div>`;
}
function adminRenderProgress(){
  const names=["樹海の入り口","ゴブリンの森","霧の森","炎竜の巣","魔王の城"];
  const stages=names.map((name,i)=>{const n=i+1,boss=["スライム","ゴブリン","オオカミ","ドラゴン","魔王"][i];return `<article class="admin-card"><h3>STAGE ${n}：${name}</h3>${adminRow("解放状態",n<=(state.maxUnlockedStage||1)?"解放済み":"未解放")}${adminRow("到達記録",stageEntered[n]?"到達済み":"未到達")}${adminRow("クリア記録",stageCleared[n]?"クリア済み":"未クリア")}${adminRow(`${boss} 討伐記録`,compendium[boss]?.defeated?"討伐済み":"未討伐")}</article>`;}).join("");
  return `<div class="admin-section"><h3>進行状況</h3>${adminRow("現在の解放上限",`STAGE ${state.maxUnlockedStage||1}`)}${adminRow("最初のステージ開始",state.firstStageStarted?"開始済み":"未開始")}${adminRow("討伐数",totalEnemyDefeats)}<p class="admin-note">討伐記録（図鑑）とステージクリア・解放フラグを別々に表示しています。</p></div><div class="admin-grid">${stages}</div>`;
}
function adminRenderBattle(){
  const enemy=battleState.enemy;const party=characters.map(c=>`<article class="admin-card"><h3>${esc(c.name)}</h3>${adminRow("HP / SP",`${c.hp} / ${c.sp}`)}${adminRow("状態",[c._stunTurns>0?`スタン ${c._stunTurns}`:"",c._actionDisabledTurns>0?`行動不能 ${c._actionDisabledTurns}`:"",burnedTurns[c.id]>0?`やけど ${burnedTurns[c.id]}`:"",c._defenseDownTurns>0?`防御低下 ${c._defenseDownTurns}`:""].filter(Boolean).join("・")||"なし")}</article>`).join("");
  const enemyText=enemy?`${enemy.name} ／ HP ${enemy.hp}${enemy.maxHp?` / ${enemy.maxHp}`:""}`:"戦闘中ではありません";
  return `<div class="admin-section"><h3>現在の戦闘</h3>${adminRow("画面",state.screen)}${adminRow("ステージ",battleState.hiddenBossMode?"HIDDEN BOSS":`STAGE ${battleState.stage} / ${battleState.maxStage}`)}${adminRow("ターン",battleState.turnCount)}${adminRow("敵",enemyText)}${adminRow("敵の攻撃 / 防御",enemy?`${enemy.attack??"—"} / ${enemy.defense??"—"}`:"—")}${adminRow("敵の出現数",enemy?.members?.length|| (enemy?1:0))}${adminRow("戦闘処理",battleState.busy?"処理中":"入力待ち")}</div><div class="admin-grid">${party}</div><p class="admin-note">この初期版では戦闘データは確認専用です。HP・SP変更、敵の差し替え、状態異常付与などの操作機能は、通常戦闘への影響を分離してから追加します。</p>`;
}
function adminRenderSave(){
  let data=null,error="";try{data=JSON.parse(localStorage.getItem("fantasyRpgSave")||"null");}catch(e){error="オートセーブのJSONを解析できません。";}
  const pretty=data?JSON.stringify(data,null,2):"オートセーブはありません。";
  return `<div class="admin-section"><h3>セーブデータ</h3>${adminRow("保存形式",data?`saveVersion ${data.saveVersion??"旧形式"}`:"未保存")}${adminRow("オートセーブ",localStorage.getItem("fantasyRpgSave")?"あり":"なし")}${adminRow("セーブスロット1",localStorage.getItem("kotamaSaveSlot1")?"あり":"なし")}${adminRow("セーブスロット2",localStorage.getItem("kotamaSaveSlot2")?"あり":"なし")}<div class="admin-actions"><button type="button" id="admin-backup">バックアップを書き出す</button><button type="button" id="admin-restore-trigger">バックアップを復元</button><input type="file" id="admin-restore-file" accept="application/json,.json" hidden></div>${error?`<p class="admin-warning">${esc(error)}</p>`:""}<h3>オートセーブJSON（確認専用）</h3><pre class="admin-json">${esc(pretty)}</pre></div>`;
}
function renderAdminPanel(){
  const content=$("kotama-admin-content");if(!content)return;
  const renderers={player:adminRenderPlayer,progress:adminRenderProgress,battle:adminRenderBattle,save:adminRenderSave};
  content.innerHTML=(renderers[adminActiveTab]||adminRenderPlayer)();
  $("kotama-admin-panel")?.querySelectorAll("[data-admin-tab]").forEach(b=>b.classList.toggle("active",b.dataset.adminTab===adminActiveTab));
  if(adminActiveTab==="save"){
    $("admin-backup")?.addEventListener("click",adminExportBackup);
    $("admin-restore-trigger")?.addEventListener("click",()=>$("admin-restore-file")?.click());
    $("admin-restore-file")?.addEventListener("change",adminImportBackup);
  }
}
function adminExportBackup(){
  const backup={format:"kotama-admin-backup-v1",createdAt:new Date().toISOString(),storage:{fantasyRpgSave:localStorage.getItem("fantasyRpgSave"),kotamaSaveSlot1:localStorage.getItem("kotamaSaveSlot1"),kotamaSaveSlot2:localStorage.getItem("kotamaSaveSlot2"),kotamaAudioSettings:localStorage.getItem("kotamaAudioSettings")}};
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`kotama-backup-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function adminImportBackup(event){
  const file=event.target.files?.[0];event.target.value="";if(!file)return;
  const reader=new FileReader();reader.onload=()=>{try{
    const backup=JSON.parse(String(reader.result||""));const storage=backup?.format==="kotama-admin-backup-v1"?backup.storage:null;
    if(!storage||typeof storage!=="object")throw new Error("backup format");
    if(storage.fantasyRpgSave){const game=JSON.parse(storage.fantasyRpgSave);if(!game?.state||!Array.isArray(game.state.party)||!Number.isFinite(game.state.gold))throw new Error("save data");}
    for(const key of ["kotamaSaveSlot1","kotamaSaveSlot2"]){if(storage[key]){const slot=JSON.parse(storage[key]);if(!slot?.game?.state||!Array.isArray(slot.game.state.party))throw new Error("slot data");}}
    if(!window.confirm("バックアップ内のセーブデータを復元します。現在のデータはバックアップに含まれていない場合、変更せず維持します。続行しますか？"))return;
    for(const key of ["fantasyRpgSave","kotamaSaveSlot1","kotamaSaveSlot2","kotamaAudioSettings"])if(Object.prototype.hasOwnProperty.call(storage,key)){if(typeof storage[key]==="string")localStorage.setItem(key,storage[key]);else if(storage[key]===null)localStorage.removeItem(key);}
    if(window.confirm("復元したデータを読み込むため、ゲームを再読み込みしますか？"))window.location.reload();else renderAdminPanel();
  }catch(error){window.alert("バックアップを復元できませんでした。ファイル形式または内容を確認してください。");console.warn("管理者バックアップ復元エラー",error);}};reader.readAsText(file);
}
function initAdminTools(){adminPanelMarkup();const overlay=$("tutorial-overlay");if(overlay&&overlay.parentElement!==document.body)document.body.appendChild(overlay);}

document.addEventListener("DOMContentLoaded",()=>{initAdminTools();setupNavigation();setupBattleButtons();$("stage-select-close")?.addEventListener("click",()=>$("stage-select-dialog").hidden=true);
  migrateLegacySlot();
  const forceNewGame=localStorage.getItem("kotamaStartNewGameNow")==="1";
  if(forceNewGame){
    localStorage.removeItem("kotamaStartNewGameNow");localStorage.removeItem("fantasyRpgSave");
    tutorialState={started:true,completed:false,phase:"intro",battlePhase:"tutorial-intro",heroSwordGranted:false,heroSwordEquipped:false,armorBought:false,potionBought:false,healerRemoved:false,healerReadded:false,accessoryExplained:false};
    state.gold=50;state.party=["kotama","knight","mage","healer"];state.maxUnlockedStage=1;state.firstStageStarted=false;
    for(const id of Object.keys(equipment))equipment[id]={weapon:null,armor:null,accessory1:null,accessory2:null,katana1:null,katana2:null};
    equipment.kotama.weapon=null;equipment.kotama.armor=null;ensureStarterGear();
    for(const id of Object.keys(inventory))delete inventory[id];
    inventory.sword=1;inventory["mage-staff"]=1;inventory["leather-armor"]=2;inventory.katana=2;inventory["charm-hp"]=1;
  }else{
    const hasPriorSave=!!(localStorage.getItem("fantasyRpgSave")||localStorage.getItem("kotamaSaveSlot1")||localStorage.getItem("kotamaSaveSlot2"));
    if(localStorage.getItem("fantasyRpgSave")){loadGame();}
    else if(hasPriorSave){tutorialState.completed=true;tutorialState.started=false;tutorialState.phase="complete";state.firstStageStarted=true;}
    else {tutorialState.started=true;tutorialState.completed=false;tutorialState.phase="intro";state.firstStageStarted=false;equipment.kotama.weapon=null;equipment.kotama.armor=null;ensureStarterGear();inventory.sword=1;inventory["mage-staff"]=1;inventory["leather-armor"]=2;inventory.katana=2;inventory["charm-hp"]=1;}
  }
  // 旧版では、未実施のユーザーも tutorial.completed=true と保存される場合があった。
  // この移行は一度だけ実施し、ゲーム進行・所持品・育成値は触らず、初回案内だけを再開可能にする。
  const tutorialStartMigrationKey="kotamaTutorialStartMigrationV2";
  if(localStorage.getItem(tutorialStartMigrationKey)!=="done"){
    tutorialState={...tutorialState,started:true,completed:false,phase:"intro",battlePhase:"tutorial-intro",heroSwordGranted:false,heroSwordEquipped:false,armorBought:false,potionBought:false,healerRemoved:false,healerReadded:false,accessoryExplained:false};
    state.firstStageStarted=false;
    tutorialSave();
    localStorage.setItem(tutorialStartMigrationKey,"done");
  }
  try{const audio=JSON.parse(localStorage.getItem("kotamaAudioSettings")||"null");if(audio){if($("bgm-toggle"))$("bgm-toggle").checked=audio.bgmEnabled!==false;if($("se-toggle"))$("se-toggle").checked=audio.seEnabled!==false;bgmVolume=Math.max(0,Math.min(1,Number(audio.bgmVolume??.15)));seVolume=Math.max(0,Math.min(1,Number(audio.seVolume??.2)));}}catch(e){}applyVolumeControls();
  // Reload時に途中のチュートリアル状態や操作ロックを持ち越さず、拠点から安全に再開できるようにする。
  if(tutorialState.started&&!tutorialState.completed){
    tutorialState.started=true;tutorialState.phase="intro";tutorialState.battlePhase="tutorial-intro";
    battleState.tutorialMode=false;
    $("tutorial-overlay").hidden=true;
    $("tutorial-spotlight").hidden=true;
    document.querySelectorAll(".tutorial-highlight,.tutorial-command-allowed,.tutorial-command-blocked").forEach(n=>n.classList.remove("tutorial-highlight","tutorial-command-allowed","tutorial-command-blocked"));
    document.querySelectorAll("#battle-commands button").forEach(b=>{if(b.dataset.tutorialLocked==="1"){b.disabled=b.dataset.tutorialWasDisabled==="1";delete b.dataset.tutorialLocked;delete b.dataset.tutorialWasDisabled;}});
    tutorialSave();
  }
  syncBattleSpeedUI();showScreen("home");renderAll();if(tutorialState.started&&!tutorialState.completed){document.body.classList.add("tutorial-home-focus");$("start-button").textContent="チュートリアル開始";showTutorialWelcome();}syncTutorialActive();});
