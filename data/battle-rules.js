const BATTLE_RULES = {
  classBonuses: { warrior:{attack:1.10}, knight:{defense:1.15,attack:1.0}, kotama:{maxHp:1.10,attack:1.05}, mage:{spAttack:1.15}, healer:{healing:1.20}, samurai:{attack:1.20,defense:.90} },
  passives: { warrior:{normalDamage:1.10}, knight:{normalDamageTaken:.90}, kotama:{lowHpDefense:1.20,threshold:.50}, mage:{spDamage:1.10}, healer:{healing:1.10}, samurai:{} },
  elements: { weak:1.5, normal:1, resist:.5, immune:0 },
  break: { normal:10, sp:20, ultimate:30, union:40, weak:1.5, resist:.5 },
  bosses: { ドラゴン:{break:100}, 魔王:{break:150}, 混沌の幻影:{break:200} }
};
