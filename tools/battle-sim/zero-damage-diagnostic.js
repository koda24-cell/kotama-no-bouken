"use strict";
// Reproduce zero-damage reports with the actual script loading order from index.html.
// Run: node tools/battle-sim/zero-damage-diagnostic.js [repository-root]
const { createGame } = require("./env.js");
const path = require("path");
const root = process.argv[2] || path.resolve(__dirname, "../..");
const ids = ["stray-slime", "forest-goblin", "mushroom", "fire-slime", "poison-slime"];
let failures = 0;
for (const id of ids) for (const grouped of [false, true]) for (const kill of [false, true]) {
  const game = createGame(root, {seed: 19, quiet: false});
  const result = game.run(`(() => {
    state.screen = "battle";
    battleState.encounterMode = true;
    battleState.fieldEnemyScale = 1;
    const id = ${JSON.stringify(id)};
    battleState.enemy = fieldCreateEnemy(${grouped ? "[" + JSON.stringify(id) + "]" : JSON.stringify(id)}, 1);
    window.kotamaAdminBattleSettings.oneHitKill = ${kill};
    const enemy = battleState.enemy;
    const target = livingEnemyTargets(enemy)[0];
    const actor = getCharacter("kotama");
    const atk = effectiveAttackPower(actor);
    const physical = calcEnemyPhysicalDamage(enemy, atk);
    const elemental = applyWeaponAttributeDamage(enemy, physical, actor);
    const before = enemyHpTotal(enemy);
    const dealt = applyDamageToEnemyTarget(enemy, target, elemental);
    const after = enemyHpTotal(enemy);
    return { id, grouped: ${grouped}, kill: ${kill}, atk, physical, elemental, before, dealt, after, targetKind: target?.kind };
  })()`);
  const ok = result.dealt > 0 && result.before - result.after === result.dealt &&
    (!kill || result.after === 0);
  console.log((ok ? "PASS " : "FAIL ") + JSON.stringify(result));
  if (!ok) failures++;
}
if (failures) { console.error("Zero-damage reproduction failures:", failures); process.exitCode = 1; }
else console.log("All damage-path assertions passed.");
