// C2 の仕組みの動作確認（DOMスタブ・乱数固定）。node tests.js <root>
const { createGame } = require("./env.js"); const fs = require("fs");
const ROOT = process.argv[2] || require("path").join(__dirname, "..", "..");
const DRIVER = fs.readFileSync(__dirname + "/sim.js", "utf8").match(/const DRIVER = `([\s\S]*?)`;/)[1];
let pass = 0, fail = 0;
function ok(cond, name) { if (cond) pass++; else { fail++; console.log("NG:", name); } }
function fresh(seed = 1) { const g = createGame(ROOT, { seed, quiet: true }); g.run(DRIVER); return g; }
function setup(g, stratum, opts = "") {
  g.run(`state.party=["kotama","knight","mage","healer"];for(const c of characters)characterLevels[c.id]=10;__bestGear(${stratum});
  battleState.tutorialMode=false;battleState.hiddenBossMode=false;resetTransientBattleState();battleState.stage=${stratum};${opts}
  extResetBattle();for(const c of getParty()){c.hp=effectiveStats(c).maxHp;c.sp=effectiveStats(c).maxSp;}
  battleState.unionGauges={};for(const c of characters)battleState.unionGauges[c.id]=0;
  battleState.enemy=battleState.encounterMode?fieldCreateEnemy(battleState.fieldEnemyId,1):createEnemy(${stratum});
  Object.assign(battleState,{turnCount:0,guarding:{},actions:[],consumedActors:[],tauntTarget:null,enemyStunned:false,aegisActive:false});`);
}
(async () => {
  // 1. 別名
  { const g = fresh(); setup(g, 4); ok(g.run(`addStatus(getCharacter("knight"),"bindArms",{turns:2});extHasStatus(getCharacter("knight"),"bindArm")&&extHasStatus(getCharacter("knight"),"bindArms")`), "alias bindArms->bindArm"); }
  // 2. 耐性0＝無効、通知
  { const g = fresh(); setup(g, 1, `battleState.encounterMode=true;battleState.fieldEnemyId="stray-slime";`);
    g.run(`battleState.enemy.ailmentResist={sleep:0,poison:.5}`);
    const r = g.run(`extStatusChance(getCharacter("kotama"),battleState.enemy,"sleep",.9)`); ok(r.chance === 0 && r.reason === "immune", "resist 0 => immune");
    ok(Math.abs(g.run(`extStatusChance(getCharacter("kotama"),battleState.enemy,"poison",.8).chance`) - .4) < 1e-9, "resist .5 halves");
    ok(g.run(`extStatusChance(getCharacter("kotama"),battleState.enemy,"paralysis",.8).chance`) === .8, "undefined resist = 1.0");
    g.run(`extTryStatus(getCharacter("kotama"),battleState.enemy,"sleep",.9)`);
    const ev = g.events.filter(e => e.type === "battle:status:resist").pop(); ok(ev && ev.detail.reason === "immune" && ev.detail.type === "sleep" && ev.detail.targetName === "はぐれスライム", "status:resist emitted"); }
  // 3. ボスの耐性上昇（ドラゴン・麻痺）、ボス既定耐性
  { const g = fresh(); setup(g, 4);
    ok(Math.abs(g.run(`extStatusChance(getCharacter("kotama"),battleState.enemy,"paralysis",.8,{bossMul:.5}).chance`) - .4) < 1e-9, "boss paralysis base");
    g.run(`extAddTolerance(battleState.enemy,"paralysis")`);
    ok(Math.abs(g.run(`extStatusChance(getCharacter("kotama"),battleState.enemy,"paralysis",.8,{bossMul:.5}).chance`) - .2) < 1e-9, "tolerance x0.5 after 1 success");
    ok(Math.abs(g.run(`extStatusChance(getCharacter("kotama"),battleState.enemy,"sleep",1,{bossMul:1}).chance`) - .3) < 1e-9, "boss default sleep resist .3");
    ok(g.run(`extStatusChance(getCharacter("kotama"),battleState.enemy,"poison",.8,{bossMul:.5}).chance`) === .4, "poison unaffected by tolerance");
    // 成功するとカウントが増える
    g.run(`Math.random=()=>0;extTryStatus(getCharacter("kotama"),battleState.enemy,"sleep",1)`); ok(g.run(`extToleranceCount(battleState.enemy,"sleep")`) === 1, "success adds tolerance");
    // ステージ1スライム（ステージ戦）も対象、雑魚は対象外
    const g2 = fresh(); setup(g2, 1); ok(g2.run(`extToleranceTarget(battleState.enemy)`) === true, "stage boss slime is tolerance target");
    const g3 = fresh(); setup(g3, 1, `battleState.encounterMode=true;battleState.fieldEnemyId="stray-slime";`); ok(g3.run(`extToleranceTarget(battleState.enemy)`) === false, "field mob not tolerance target"); }
  // 4. 味方の免疫・全員行動不能の上限
  { const g = fresh(); setup(g, 4);
    g.run(`addStatus(getCharacter("mage"),"sleep",{turns:1});extRemoveStatus(getCharacter("mage"),"sleep")`);
    let r = g.run(`extStatusChance(battleState.enemy,getCharacter("mage"),"sleep",1)`); ok(r.chance === 0 && r.reason === "tolerance", "party immunity after cure");
    g.run(`battleState.turnCount=1;extTickPartyImmunity()`); r = g.run(`extStatusChance(battleState.enemy,getCharacter("mage"),"sleep",1)`); ok(r.chance === 0, "immunity lasts next round");
    g.run(`battleState.turnCount=2;extTickPartyImmunity()`); r = g.run(`extStatusChance(battleState.enemy,getCharacter("mage"),"sleep",1)`); ok(r.chance === 1, "immunity ends after 1 round");
    g.run(`for(const id of ["kotama","knight","healer"])addStatus(getCharacter(id),"sleep",{turns:3});extUpdatePartyLockStreak()`);
    ok(g.run(`battleState._partyLockStreak`) === 0, "streak 0 when one can act");
    ok(g.run(`extStatusChance(battleState.enemy,getCharacter("mage"),"sleep",1).chance`) === 1, "first all-lock allowed");
    g.run(`addStatus(getCharacter("mage"),"sleep",{turns:3});extUpdatePartyLockStreak()`); ok(g.run(`battleState._partyLockStreak`) === 1, "streak counts all locked");
    g.run(`extRemoveStatus(getCharacter("mage"),"sleep");extPartyImmunity={}`);
    r = g.run(`extStatusChance(battleState.enemy,getCharacter("mage"),"sleep",1)`); ok(r.chance === 0 && r.reason === "tolerance", "all-lock cap blocks consecutive full lock"); }
  // 5. 睡眠：味方は行動できない／被ダメージ1.5倍／攻撃で起きる
  { const g = fresh(); setup(g, 4);
    ok(g.run(`addStatus(getCharacter("knight"),"sleep",{turns:3});extDefenselessMul(getCharacter("knight"),{})`) === 1.5, "sleep damage taken x1.5");
    ok(g.run(`extDefenselessMul(getCharacter("knight"),{statusDamage:true})`) === 1, "status damage not multiplied");
    const skipped = await g.run(`extPartyAilmentTurn(getCharacter("knight"),{type:"attack",actor:"knight"})`); ok(skipped === true, "sleeping party skips");
    await g.run(`applyPartyDamageAnimated(getCharacter("knight"),10,{sureHit:true})`); ok(!g.run(`extHasStatus(getCharacter("knight"),"sleep")`), "damage wakes party");
    g.run(`addStatus(getCharacter("healer"),"sleep",{turns:3})`); await g.run(`applyPartyDamageAnimated(getCharacter("healer"),10,{sureHit:true,statusDamage:true})`); ok(g.run(`extHasStatus(getCharacter("healer"),"sleep")`), "poison/burn does not wake"); }
  // 6. 睡眠：敵は行動しない／被ダメージ増／攻撃で起きる（executeTurn 経由）
  { const g = fresh(3); setup(g, 4);
    g.run(`addStatus(battleState.enemy,"sleep",{turns:3})`);
    ok(g.run(`extEnemyDamageTakenMul(battleState.enemy,null,100)`) === 150, "enemy sleep dmg x1.5");
    ok(g.run(`extEnemyDamageTakenMul(battleState.enemy,{kind:"main",ref:battleState.enemy},100)`) === 100, "main target not double");
    g.run(`battleState.turnOrder=livingParty().map(c=>c.id);battleState.actions=livingParty().map(c=>({type:"guard",actor:c.id}));__sim.log=[];`);
    await g.run(`executeTurn()`); const log = g.run(`__sim.log.join("|")`); ok(log.includes("ドラゴンは眠っている") && !log.includes("ドラゴンブレス"), "sleeping enemy skips turn");
    const hp0 = g.run(`battleState.enemy.hp`); g.run(`applyDamageToEnemy(battleState.enemy,100)`); ok(hp0 - g.run(`battleState.enemy.hp`) === 150, "enemy took 150 while asleep (before break mult)");
    ok(!g.run(`extHasStatus(battleState.enemy,"sleep")`), "enemy woke after damage"); }
  // 7. 混乱：味方が仲間を攻撃
  { const g = fresh(); setup(g, 4); g.run(`addStatus(getCharacter("kotama"),"confusion",{turns:3});Math.random=()=>0`);
    const hp = g.run(`getParty().filter(c=>c.id!=="kotama").map(c=>c.hp).join()`);
    ok(await g.run(`extPartyAilmentTurn(getCharacter("kotama"),{type:"attack",actor:"kotama"})`) === true, "confused misact");
    ok(g.run(`getParty().filter(c=>c.id!=="kotama").map(c=>c.hp).join()`) !== hp, "an ally took damage"); }
  // 8. 封じ：頭＝ヒール不可、腕＝攻撃力低下・突撃不可、脚＝回避0・速度半減・逃走不可
  { const g = fresh(); setup(g, 4);
    const healer = `getCharacter("healer")`;
    g.run(`addStatus(${healer},"bindHead",{turns:2})`);
    ok(/頭封じ/.test(g.run(`skillUnavailableReason(${healer},getCharacterSkills(${healer}).find(s=>s.id==="heal"))`)), "head bind greys out heal");
    ok(await g.run(`extPartyAilmentTurn(${healer},{type:"skill",actor:"healer",skillId:"heal",target:"knight"})`) === true, "head bind blocks heal at execution");
    ok(await g.run(`extPartyAilmentTurn(${healer},{type:"attack",actor:"healer"})`) === false, "head bind allows attack");
    ok(g.run(`skillUnavailableReason(getCharacter("knight"),getCharacterSkills(getCharacter("knight")).find(s=>s.id==="taunt"))`) === "", "taunt unaffected");
    const atk = g.run(`effectiveStats(getCharacter("knight")).attack`); g.run(`addStatus(getCharacter("knight"),"bindArm",{turns:2})`);
    ok(g.run(`effectiveStats(getCharacter("knight")).attack`) === Math.floor(atk * .6), "arm bind attack x0.6");
    ok(g.run(`extSkillBodyPart({type:"charge"})`) === "arm" && g.run(`extSkillBodyPart({type:"fire"})`) === "head", "body part classification");
    const spd = g.run(`effectiveStats(getCharacter("mage")).speed`); g.run(`addStatus(getCharacter("mage"),"bindLeg",{turns:2})`);
    ok(g.run(`effectiveStats(getCharacter("mage")).speed`) === Math.floor(spd * .5) && g.run(`extEvasionMul(getCharacter("mage"))`) === 0 && g.run(`extEscapeBlocked()`) === true, "leg bind speed/evasion/escape");
    // 敵の腕封じ：攻撃力が下がり、切れると戻る
    const ea = g.run(`battleState.enemy.attack`); g.run(`addStatus(battleState.enemy,"bindArm",{turns:2})`); ok(g.run(`battleState.enemy.attack`) === ea - Math.floor(ea * .4), "enemy arm bind lowers attack");
    g.run(`extRemoveStatus(battleState.enemy,"bindArm")`); ok(g.run(`battleState.enemy.attack`) === ea, "enemy attack restored");
    const es = g.run(`extEnemySpeed(battleState.enemy)`); g.run(`addStatus(battleState.enemy,"bindLegs",{turns:2})`); ok(g.run(`extEnemySpeed(battleState.enemy)`) === Math.floor(es * .5), "enemy leg bind speed (alias)");
    // リフレッシュ相当で封じ・睡眠が消える
    g.run(`addStatus(${healer},"sleep",{turns:2});clearNegativeStatuses(${healer})`); ok(!g.run(`extHasStatus(${healer},"bindHead")||extHasStatus(${healer},"sleep")`), "refresh clears binds/sleep"); }
  // 9. 敵の頭封じ：術系の行動を使わない
  { const g = fresh(5); setup(g, 4, `battleState.encounterMode=true;battleState.fieldEnemyId="fire-lizard";`);
    g.run(`addStatus(battleState.enemy,"bindHead",{turns:5});__sim.log=[]`);
    for (let i = 0; i < 6; i++) await g.run(`extVariantAction(battleState.enemy,${i + 1})`);
    ok(!g.run(`__sim.log.join("|")`).includes("火の息"), "head-bound enemy never uses sp action"); }
  console.log(`pass=${pass} fail=${fail}`);
})();
