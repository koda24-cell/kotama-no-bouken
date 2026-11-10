const EXT_JOB_SPEED = { kotama:70, knight:40, healer:55, warrior:50, mage:45, samurai:80, assassin:100, gunner:75, highlander:60, princess:65, reaper:55, imperial:50 };
const EXT_ENEMY_SPEED = { "スライム":30, "ゴブリン":45, "オオカミ":90, "ドラゴン":65, "魔王":70, "混沌の幻影":85 };
const EXT_BOSS_NAMES = ["ドラゴン", "魔王", "混沌の幻影"];
const EXT_REAR_IDS = ["mage", "healer", "princess", "gunner"];
const EXT_NEW_JOB_IDS = ["assassin", "gunner", "highlander", "princess", "reaper", "imperial"];
// 新職業の解放条件：ステージクリアで1人ずつ。インペリアルは隠しボス討伐。
const EXT_JOB_UNLOCK_BY_STAGE = { 1:"assassin", 2:"gunner", 3:"highlander", 4:"princess", 5:"reaper" };
const EXT_JOB_UNLOCK_HIDDEN = "imperial";
const EXT_HEAT_LIMIT = 6;          // 熱がこの値に達するとオーバーヒート
const EXT_RELEASE_MULT = 2.2;      // チャージ後に放つSP攻撃のダメージ倍率
const EXT_DEFENSELESS_MULT = 1.8;  // チャージ中（無防備）に受けるダメージ倍率

// 新職業の初期装備（解放した時に、空いている枠へ装備する）
const EXT_STARTER_GEAR = {
  highlander:{ weapon:"iron-spear", armor:"leather-armor" },
  assassin:{ weapon:"dagger", armor:"leather-armor" },
  princess:{ weapon:"princess-rod", armor:"linen-robe" },
  gunner:{ weapon:"flintlock", armor:"linen-robe" },
  reaper:{ weapon:"scythe", armor:"leather-armor" },
  imperial:{ weapon:"magic-sword", armor:"leather-armor" }
};

// xj は新スキルの効果記述。executeAction から extExecuteSkill に渡される。
const EXT_NEW_JOBS = [
  { id:"assassin", name:"アサシン", image:"assets/characters/assassin.svg", emblem:"暗", speed:100, hp:85, maxHp:85, attack:70, spAttack:40, defense:15, guardCut:.30, sp:80, maxSp:80,
    spSkills:[
      { id:"poison-blade", name:"毒刃", cost:12, target:"enemy", type:"xj", description:"斬撃で攻撃し、高確率で敵を毒にする。毒は毎ターン開始時にダメージ。", xj:{ kind:"phys", mult:.9, element:"斬撃", fx:"slash", status:{ type:"poison", chance:.85, turns:4, power:.06, bossMul:.7 } } },
      { id:"paralyze-needle", name:"麻痺針", cost:16, target:"enemy", type:"xj", priority:1, description:"突属性の針で攻撃し、敵を麻痺させる。麻痺した敵は一定確率で行動できない。", xj:{ kind:"phys", mult:.5, element:"突", fx:"slash", status:{ type:"paralysis", chance:.7, turns:3, power:0, bossMul:.4 } } },
      { id:"shadow-execution", name:"影討ち", cost:28, target:"enemy", type:"xj", description:"急所を狙う。通常敵は8%、ボスは1%で即死。", xj:{kind:"phys",mult:1.2,element:"突",fx:"slash",instaKill:.08,bossInstaKill:.01} },
      { id:"execution", name:"仕留めの一撃", cost:24, target:"enemy", type:"xj", description:"状態異常中の敵に威力が上昇する追撃。", xj:{kind:"phys",mult:1.3,element:"突",fx:"slash",ailmentBonus:1.8} },
      { id:"venom-fog", name:"毒霧", cost:24, target:"allEnemies", type:"xj", description:"毒の霧で敵全体を攻撃し、毒を与える。", xj:{ kind:"phys", mult:.6, element:"無属性", fx:"magic", status:{ type:"poison", chance:.6, turns:3, power:.06, bossMul:.7 } } }
    ] },
  { id:"gunner", name:"ガンナー", image:"assets/characters/gunner.svg", emblem:"銃", speed:75, hp:90, maxHp:90, attack:95, spAttack:30, defense:15, guardCut:.30, sp:70, maxSp:70,
    spSkills:[
      { id:"snipe", name:"狙撃", cost:15, target:"enemy", type:"xj", priority:1, description:"壊属性の遠距離攻撃。攻撃力の230%の単体ダメージ。", xj:{ kind:"phys", mult:2.3, element:"壊", fx:"slash" } },
      { id:"ricochet", name:"跳弾", cost:24, target:"allEnemies", type:"xj", description:"弾丸を跳ね返らせ、敵全体に壊属性ダメージを2回与える。", xj:{ kind:"phys", mult:.85, hits:2, element:"壊", fx:"slash" } },
      { id:"flame-shot", name:"火炎弾", cost:17, target:"enemy", type:"xj", description:"後衛から敵後衛にも威力が落ちない炎属性の単体射撃。", xj:{ kind:"phys", mult:1.65, element:"炎", fx:"flame", ranged:true } },
      { id:"frost-shot", name:"氷結弾", cost:17, target:"enemy", type:"xj", description:"後衛から敵後衛にも威力が落ちない氷属性の単体射撃。", xj:{ kind:"phys", mult:1.65, element:"氷", fx:"magic", ranged:true } },
      { id:"thunder-shot", name:"雷撃弾", cost:17, target:"enemy", type:"xj", description:"後衛から敵後衛にも威力が落ちない雷属性の単体射撃。", xj:{ kind:"phys", mult:1.65, element:"雷", fx:"magic", ranged:true } },
      { id:"cover-fire", name:"援護射撃", cost:18, target:"enemy", type:"xj", description:"敵の足元を撃ち抜き、3ターンの間、敵の防御力を25%下げる。", xj:{ kind:"phys", mult:.6, element:"壊", fx:"slash", status:{ type:"defenseDown", chance:1, turns:3, power:.25, bossMul:1 } } }
    ] },
  { id:"highlander", name:"ハイランダー", image:"assets/characters/highlander.svg", emblem:"槍", speed:60, hp:120, maxHp:120, attack:90, spAttack:125, defense:40, guardCut:.45, sp:60, maxSp:60,
    spSkills:[
      { id:"lance-charge", name:"ランスチャージ", cost:15, target:"enemy", type:"xj", description:"SP攻撃力の210%を基準とする突属性の単体攻撃。", xj:{ kind:"sp", mult:2.1, element:"突", fx:"slash" } },
      { id:"sky-pierce", name:"天槍穿ち", cost:32, target:"enemy", type:"xj", description:"全力の突き。SP攻撃力の340%を基準とする突属性ダメージ。", xj:{ kind:"sp", mult:3.4, element:"突", fx:"slash" } }
    ] },
  { id:"princess", name:"プリンセス", image:"assets/characters/princess.svg", emblem:"姫", speed:65, hp:90, maxHp:90, attack:10, spAttack:80, defense:12, guardCut:.30, sp:150, maxSp:150,
    spSkills:[
      { id:"inspire-song", name:"鼓舞の歌", cost:25, target:"allAllies", type:"xj", description:"味方全体の攻撃力とSP攻撃力を3ターンの間30%上げる。", xj:{ buff:{ attackUp:{ turns:3, power:.30 } } } },
      { id:"guardian-dance", name:"守りの舞", cost:25, target:"allAllies", type:"xj", priority:3, description:"味方全体の防御力とSP防御力を3ターンの間40%上げる。", xj:{ buff:{ defenseUp:{ turns:3, power:.40 } } } },
      { id:"flame-enchant", name:"炎の加護", cost:20, target:"allAllies", type:"xj", description:"味方全体の通常攻撃に3ターン炎属性を付与する。", xj:{ enchant:{element:"炎",turns:3} } },
      { id:"frost-enchant", name:"氷の加護", cost:20, target:"allAllies", type:"xj", description:"味方全体の通常攻撃に3ターン氷属性を付与する。", xj:{ enchant:{element:"氷",turns:3} } },
      { id:"thunder-enchant", name:"雷の加護", cost:20, target:"allAllies", type:"xj", description:"味方全体の通常攻撃に3ターン雷属性を付与する。", xj:{ enchant:{element:"雷",turns:3} } },
      { id:"victory-hymn", name:"凱歌", cost:45, target:"allAllies", type:"xj", description:"味方全体の攻撃・防御を25%、スピードを30%、3ターンの間上げる。", xj:{ buff:{ attackUp:{ turns:3, power:.25 }, defenseUp:{ turns:3, power:.25 }, speedUp:{ turns:3, power:.30 } } } }
    ] },
  { id:"reaper", name:"リーパー", image:"assets/characters/reaper.svg", emblem:"鎌", speed:55, hp:95, maxHp:95, attack:105, spAttack:60, defense:18, guardCut:.30, sp:70, maxSp:70,
    spSkills:[
      { id:"curse-blade", name:"呪詛の刃", cost:20, target:"enemy", type:"xj", description:"斬撃で攻撃し、3ターンの間、敵の攻撃力と防御力を20%下げる。", xj:{ kind:"phys", mult:1.0, element:"斬撃", fx:"slash", status:[{ type:"attackDown", chance:.9, turns:3, power:.20, bossMul:.8 }, { type:"defenseDown", chance:.9, turns:3, power:.20, bossMul:.8 }] } },
      { id:"withering-mist", name:"衰弱の霧", cost:26, target:"allEnemies", type:"xj", description:"敵全体を弱らせ、3ターンの間、攻撃力を25%下げる。", xj:{ kind:"sp", mult:.7, element:"無属性", fx:"magic", status:{ type:"attackDown", chance:.9, turns:3, power:.25, bossMul:.8 } } },
      { id:"reap-soul", name:"首狩り", cost:30, target:"enemy", type:"xj", description:"鎌による斬撃。敵が弱体化しているほど威力が上昇する。", xj:{ kind:"phys", mult:1.8, element:"斬撃", fx:"slash", debuffBonus:1.5 } }
    ] },
  { id:"imperial", name:"インペリアル", image:"", emblem:"魔", speed:50, hp:110, maxHp:110, attack:85, spAttack:200, defense:30, guardCut:.40, sp:100, maxSp:100,
    spSkills:[
      { id:"imp-flame", name:"炎魔剣", cost:18, target:"enemy", type:"xj", description:"【熱3】チャージ後に炎の魔法剣を放つ。チャージ中は無防備。", xj:{ kind:"sp", mult:1.7, element:"炎", fx:"flame", charge:true, heat:3 } },
      { id:"imp-frost", name:"氷魔剣", cost:18, target:"enemy", type:"xj", description:"【熱3】チャージ後に氷の魔法剣を放つ。チャージ中は無防備。", xj:{ kind:"sp", mult:1.7, element:"氷", fx:"magic", charge:true, heat:3 } },
      { id:"imp-thunder", name:"雷魔剣", cost:26, target:"enemy", type:"xj", description:"【熱3】チャージ後に雷の魔法剣を放つ。チャージ中は無防備。", xj:{ kind:"sp", mult:2.3, element:"雷", fx:"magic", charge:true, heat:3 } },
      { id:"imp-neutral", name:"無属性ドライブ", cost:30, target:"enemy", type:"xj", description:"【熱3】チャージ後に無属性SP攻撃。属性耐性に左右されない。", xj:{ kind:"sp", mult:2.0, element:"無属性", fx:"magic", charge:true, heat:3 } },
      { id:"imp-cooldown", name:"クールダウン", cost:0, target:"self", type:"xj", description:"1ターン使って熱を2減らす。オーバーヒート中は使用不可。", xj:{ cooldown:2 } },
      { id:"imp-nova", name:"煌魔断", cost:38, target:"allEnemies", type:"xj", description:"【熱4】チャージ後に聖なる光で敵全体を斬る。チャージ中は無防備。", xj:{ kind:"sp", mult:1.9, element:"聖", fx:"magic", charge:true, heat:4 } }
    ] }
];

// 新職業用の武器。防具・護符は既存の汎用品に職業IDを追加して共用する。
