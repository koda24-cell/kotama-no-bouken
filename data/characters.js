const characters = [
  { id:"kotama", name:"コタマ", image:"assets/characters/kotama.png", hp:100,maxHp:100,attack:150,spAttack:100,defense:35,guardCut:.60,sp:60,maxSp:60,spSkills:[{id:"magic-bullet",name:"魔力弾",cost:15,target:"enemy",type:"spAttack",element:"雷"}] },
  { id:"knight", name:"騎士", image:"assets/characters/kishi.png", hp:120,maxHp:120,attack:35,spAttack:10,defense:60,guardCut:.80,sp:50,maxSp:50,spSkills:[{id:"taunt",name:"挑発",cost:5,target:"self",type:"taunt"}] },
  { id:"healer", name:"治癒士", image:"assets/characters/hi-ra-.png", hp:80,maxHp:80,attack:5,spAttack:90,defense:10,guardCut:.25,sp:120,maxSp:120,spSkills:[{id:"heal",name:"ヒール",cost:15,target:"ally",type:"heal"},{id:"revive",name:"死者蘇生",cost:30,target:"deadAlly",type:"revive"}] },
  { id:"warrior", name:"戦士", image:"assets/characters/sennshi.png", hp:130,maxHp:130,attack:50,spAttack:180,defense:20,guardCut:.50,sp:80,maxSp:80,spSkills:[{id:"charge",name:"突撃",cost:10,hpCost:20,target:"enemy",type:"charge"}] },
  { id:"mage", name:"魔術師", image:"assets/characters/mahoutukai.png", hp:70,maxHp:70,attack:2,spAttack:95,defense:5,guardCut:.20,sp:180,maxSp:180,spSkills:[{id:"fire",name:"ファイア",cost:15,target:"allEnemies",type:"elementalSpell",element:"炎"},{id:"freeze",name:"フリーズ",cost:15,target:"allEnemies",type:"elementalSpell",element:"氷"},{id:"thunder",name:"サンダー",cost:15,target:"allEnemies",type:"elementalSpell",element:"雷"}] },
  { id:"samurai", name:"武士", image:"assets/characters/samurai.svg", hp:105,maxHp:105,attack:72,spAttack:35,defense:18,spDefense:12,guardCut:.35,sp:75,maxSp:75,spSkills:[{id:"many-slashes",name:"乱れ斬り",cost:20,target:"enemy",type:"multiSlash"},{id:"helmet-break",name:"兜割",cost:25,target:"enemy",type:"pierce"}] }
];
const unionSkills = {
  kotama:{id:"magic-bullet-union",name:"至高の魔弾",requiredHits:4,type:"stun",damage:300},
  knight:{id:"aegis-union",name:"イージスの大盾",requiredHits:4,type:"aegis"},
  healer:{id:"full-healing-union",name:"フルヒーリング",requiredHits:5,type:"full-heal"},
  warrior:{id:"cross-break-union",name:"クロスブレイク",requiredHits:4,type:"cross-break",requiredMembers:2},
  mage:{id:"meteor-union",name:"メテオ",requiredHits:5,type:"meteor",damage:666},
  samurai:{id:"samurai-union",name:"一刀両断",requiredHits:4,type:"samurai-slash",damage:420}
};
