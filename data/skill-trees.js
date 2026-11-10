const skillTreeDefinitions={
 kotama:{passive:{id:"kotama-mastery",name:"剣マスタリー",desc:"レベルごとに攻撃力が2%上昇する。",effect:"stats",stat:"attack"},a:{id:"kotama-shock-spark",name:"ショックスパーク",desc:"敵全体に雷属性のSP攻撃。レベルに応じて威力が上昇する。",effect:"none"},b:{id:"kotama-shock-bolt",name:"ショックボルト",desc:"敵単体に雷属性のSP攻撃。低SP消費で扱いやすい。",effect:"none"},derived:{id:"kotama-burst-blade",name:"バーストブレイド",desc:"ショックスパークとショックボルトを習得すると解放。敵単体に威力400%の強力な一撃。",effect:"none"}},
 knight:{passive:{id:"knight-mastery",name:"盾マスタリー",desc:"レベルごとに防御力が2%上昇する。",effect:"stats",stat:"defense"},a:{id:"knight-defense-camp",name:"防衛陣地",desc:"3ターンの間、味方全体の防御力を上昇させる。",effect:"none"},b:{id:"knight-magic-guard",name:"マジックガード",desc:"使用ターン、味方全体が受ける魔法ダメージを軽減する。",effect:"none"},derived:{id:"knight-full-guard",name:"フルガード",desc:"使用ターン、味方への攻撃を騎士が引き受け、自身も防御状態になる。5ターンの再使用待機。",effect:"none"}},
 healer:{passive:{id:"healer-mastery",name:"回復マスタリー",desc:"レベルごとに回復量が3%上昇する。",effect:"heal"},a:{id:"healer-line-heal",name:"ラインヒール",desc:"横列の味方3人を自動的に回復する。",effect:"none"},b:{id:"healer-refresh",name:"リフレッシュ",desc:"味方の状態異常を解除する。Lv.5で全体化し、Lv.6以降は消費SPが減少する。",effect:"none"},derived:{id:"healer-holy-light",name:"聖なる光",desc:"敵全体に聖属性のSP攻撃。敵ごとの聖属性相性に応じて威力が変化する。",effect:"none"}},
 mage:{passive:{id:"mage-mastery",name:"術マスタリー",desc:"レベルごとにSP攻撃力が2%上昇する。",effect:"stats",stat:"mage"},a:{id:"mage-flare",name:"フレア",desc:"敵単体に強力な炎属性SP攻撃。",effect:"none"},b:{id:"mage-magic-bomb",name:"マジックボム",desc:"敵単体に魔法耐性の影響を受けない無属性SP攻撃。",effect:"none"},derived:{id:"mage-compression",name:"術式圧縮",desc:"次に実行する攻撃の攻撃回数を2倍にする。重ねがけ可能。",effect:"none"}},
 warrior:{passive:{id:"warrior-passive",name:"封殺の基礎",desc:"最大HP・攻撃力・防御力を高め、封じ技を軸に戦う。",effect:"stats",stat:"warrior"},a:{id:"warrior-branch-a",name:"腕封じの拳",desc:"SP攻撃で敵の腕を封じ、物理技を妨害する。",effect:"sp"},b:{id:"warrior-branch-b",name:"脚封じの拳",desc:"SP攻撃で敵の脚を封じ、回避や行動を制限する。",effect:"break",effects:["sp"]},derived:{id:"warrior-derived",name:"頭封じの拳",desc:"派生SPスキルで敵の頭を封じ、術系の行動を妨害する。",effect:"sp"}},
 samurai:{passive:{id:"samurai-passive",name:"剣技の基礎",desc:"攻撃力・最大HP・防御力を高める。",effect:"stats",stat:"samurai"},a:{id:"samurai-branch-a",name:"流水の太刀",desc:"通常攻撃を強化し、SPスキル「居合」を習得する。",effect:"normal"},b:{id:"samurai-branch-b",name:"鋭刃",desc:"SP攻撃の威力を高め、SPスキル「斬鉄」を習得する。",effect:"sp",effects:["normal"]},derived:{id:"samurai-derived",name:"一刀両断の極意",desc:"派生SPスキル「秘剣・無双」を習得する。",effect:"sp"}}
};
const legacyEffectMap={kotama:[["element","sp","union"]],knight:[["guard","taunt","guard"]],healer:[["heal","revive","unionHeal"]],warrior:[["normal","sp","break"]],mage:[["sp","element","union"]],samurai:[["normal","normal","union"]]};
const legacySkillMap={kotama:["kotama-arc","kotama-overload","kotama-finish"],knight:["knight-wall","knight-taunt","knight-aegis"],healer:["healer-care","healer-revive","healer-union"],warrior:["warrior-power","warrior-charge","warrior-break"],mage:["mage-focus","mage-element","mage-meteor"],samurai:["samurai-edge","samurai-flow","samurai-iaido"]};
const skillTreeExtraSkills={
 kotama:{node:"kotama-shock-spark",skill:{id:"kotama-shock-spark-skill",name:"ショックスパーク",cost:25,target:"allEnemies",type:"level-lightning-all",element:"雷"}},
 knight:{node:"knight-defense-camp",skill:{id:"knight-defense-camp-skill",name:"防衛陣地",cost:7,target:"self",type:"defense-camp"}},
 healer:{node:"healer-line-heal",skill:{id:"healer-line-heal-skill",name:"ラインヒール",cost:20,target:"self",type:"line-heal"}},
 mage:{node:"mage-flare",skill:{id:"mage-flare-skill",name:"フレア",cost:15,target:"enemy",type:"level-flare",element:"炎"}},
 warrior:{node:"warrior-branch-a",skill:{id:"warrior-whirlwind",name:"腕封じの拳",cost:18,target:"enemy",type:"xj",bodyPart:"arm",xj:{kind:"sp",mult:1.0,element:"壊",fx:"slash",status:{type:"bindArm",chance:.65,turns:3}}}},
 samurai:{node:"samurai-branch-a",skill:{id:"samurai-iaido",name:"居合",cost:30,target:"enemy",type:"pierce"}}
};
const skillTreeBranchBSkills={
 kotama:{id:"kotama-shock-bolt-skill",name:"ショックボルト",cost:8,target:"enemy",type:"level-lightning-single",element:"雷"},
 knight:{id:"knight-magic-guard-skill",name:"マジックガード",cost:3,target:"self",type:"magic-guard"},
 healer:{id:"healer-refresh-skill",name:"リフレッシュ",cost:5,target:"self",type:"refresh"},
 mage:{id:"mage-magic-bomb-skill",name:"マジックボム",cost:10,target:"enemy",type:"level-magic-bomb"},
 warrior:{id:"warrior-double-strike",name:"脚封じの拳",cost:18,target:"enemy",type:"xj",bodyPart:"arm",xj:{kind:"sp",mult:1.0,element:"壊",fx:"slash",status:{type:"bindLeg",chance:.65,turns:3}}},
 samurai:{id:"samurai-sever",name:"斬鉄",cost:25,target:"enemy",type:"pierce"}
};
const skillTreeDerivedSkills={
 kotama:{id:"kotama-burst-blade-skill",name:"バーストブレイド",cost:40,target:"enemy",type:"burst-blade"},
 knight:{id:"knight-full-guard-skill",name:"フルガード",cost:30,target:"self",type:"full-guard"},
 healer:{id:"healer-holy-light-skill",name:"聖なる光",cost:15,target:"allEnemies",type:"holy-light",element:"聖"},
 mage:{id:"mage-compression-skill",name:"術式圧縮",cost:10,target:"self",type:"compression"},
 warrior:{id:"warrior-overdrive",name:"頭封じの拳",cost:26,target:"enemy",type:"xj",bodyPart:"arm",xj:{kind:"sp",mult:1.35,element:"壊",fx:"slash",status:{type:"bindHead",chance:.55,turns:3}}},
 samurai:{id:"samurai-mugen",name:"秘剣・無双",cost:50,target:"enemy",type:"multiSlash"}
};
