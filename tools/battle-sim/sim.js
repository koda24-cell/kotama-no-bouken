"use strict";
// 自動戦闘シミュレーション（乱数固定）。node tools/battle-sim/sim.js [ゲームのフォルダ] [試行数] [階層]
// 方針：店売り装備の最良品・スキルツリーなし・各階層の想定レベル。対策なし＝スキルで攻撃、対策あり＝予兆ターンに防御・騎士が挑発、通常攻撃のみ＝治癒士以外は通常攻撃。
const { createGame } = require("./env.js");
const ROOT = process.env.SIM_ROOT || (require.main === module && process.argv[2]) || require("path").join(__dirname, "..", "..");
const N = (require.main === module && Number(process.argv[3])) || 40;

const DRIVER = `
function __bestGear(stratum){
  const all=shopItems.filter(i=>!i.tutorialOnly&&(i.unlock||1)<=stratum);
  for(const c of characters){
    const slots=equipment[c.id];for(const k of Object.keys(slots))slots[k]=null;
    const ok=i=>(i.classes||[]).includes(c.id);
    const score=i=>(i.attackBonus||0)*(["mage","healer"].includes(c.id)?0:1)+(i.spAttackBonus||0)*(["mage","healer","kotama","warrior"].includes(c.id)?1:0)+(i.defenseBonus||0)+(i.spDefenseBonus||0)+(i.hpBonus||0)*.5;
    const pick=cat=>all.filter(i=>i.category===cat&&ok(i)&&i.slot!=="katana").sort((a,b)=>score(b)-score(a));
    if(c.id==="samurai"){const k=all.filter(i=>i.slot==="katana").sort((a,b)=>b.attackBonus-a.attackBonus)[0];if(k){slots.katana1=k.id;slots.katana2=k.id;}}
    else slots.weapon=pick("weapon")[0]?.id||null;
    slots.armor=pick("armor")[0]?.id||null;
    const acc=pick("accessory");slots.accessory1=acc[0]?.id||null;slots.accessory2=acc[1]?.id||null;
  }
}
async function __battle(cfg){
  __sim.result=null;__sim.log=[];
  if(cfg.patch&&!globalThis.__patched){globalThis.__patched=true;(0,eval)(cfg.patch);}
  state.party=cfg.party.slice();
  for(const c of characters){characterLevels[c.id]=cfg.level;}
  __bestGear(cfg.stratum);
  battleState.tutorialMode=false;battleState.hiddenBossMode=false;battleState.maxStage=5;
  resetTransientBattleState();
  battleState.stage=cfg.stratum;
  if(cfg.field){battleState.encounterMode=true;battleState.fieldEnemyId=cfg.field;battleState.fieldEnemyScale=cfg.scale||1;}
  extResetBattle();
  for(const c of getParty()){c.hp=effectiveStats(c).maxHp;c.sp=effectiveStats(c).maxSp;}
  battleState.unionGauges={};for(const c of characters)battleState.unionGauges[c.id]=0;
  battleState.enemy=cfg.field?fieldCreateEnemy(cfg.field,cfg.scale||1):createEnemy(cfg.stratum);
  const e=battleState.enemy;
  const breakMax=BATTLE_RULES.bosses[e.name]?.break||0;if(breakMax){e._breakMax=breakMax;e._breakCurrent=breakMax;}
  Object.assign(battleState,{turnCount:0,defenseCampTurns:0,magicGuardActive:false,fullGuardActive:false,knightFullGuardCooldown:0,koCount:0,busy:true,actions:[],consumedActors:[],guarding:{},tauntTarget:null,enemyStunned:false,aegisActive:false,stageFinished:false});
  const maxHpTotal=getParty().reduce((n,c)=>n+effectiveStats(c).maxHp,0);
  let turns=0;
  for(;turns<cfg.maxTurns&&!__sim.result;turns++){
    battleState.turnOrder=livingParty().map(c=>c.id);battleState.currentActorIndex=0;
    battleState.actions=__policy(cfg);battleState.consumedActors=[];battleState.busy=true;
    await executeTurn();
  }
  const hpLeft=getParty().reduce((n,c)=>n+Math.max(0,c.hp),0);
  return {result:__sim.result||"timeout",turns,hpLoss:1-hpLeft/maxHpTotal,ko:getParty().filter(c=>c.hp<=0).length,enemyHpRate:enemyHpTotal(e)/e.maxHp};
}
function __omen(){
  const e=battleState.enemy,turn=battleState.turnCount+1;
  if(e.name==="ドラゴン"&&(turn===1||turn%3===0))return true;
  if(e.name==="ゴブリン"&&(goblinCharging||goblinTeamAttackPending))return true;
  if(e.name==="魔王"&&[4,8,12].includes(turn))return true;
  return false;
}
function __policy(cfg){
  const e=battleState.enemy,acts=[],alive=livingParty(),turn=battleState.turnCount+1;
  const targets=livingEnemyTargets(e);
  const tgt=()=>{if(!targets.length)return null;if(e.members){const t=targets.slice().sort((a,b)=>a.ref.hp-b.ref.hp)[0];return t.ref.id;}if(targets.length>1){const t=targets[Math.floor(Math.random()*targets.length)];return t.kind==="main"?"main":t.ref.id;}return null;};
  const omen=cfg.prepared&&__omen();
  const hurt=alive.filter(c=>c.hp<effectiveStats(c).maxHp*.45).sort((a,b)=>a.hp/effectiveStats(a).maxHp-b.hp/effectiveStats(b).maxHp);
  const dead=getParty().filter(c=>c.hp<=0);
  for(const c of alive){
    const u=unionSkills[c.id],ready=u&&(battleState.unionGauges[c.id]||0)>=u.requiredHits;
    const sk=id=>getCharacterSkills(c).find(s=>s.id===id);
    const can=s=>s&&c.sp>=s.cost&&(!s.hpCost||c.hp>s.hpCost+10);
    if(ready&&["stun","meteor","samurai-slash"].includes(u.type)){acts.push({type:"union",actor:c.id});continue;}
    if(ready&&u.type==="full-heal"&&(hurt.length>=2||dead.length)){acts.push({type:"union",actor:c.id});continue;}
    if(ready&&u.type==="aegis"&&(omen||hurt.length>=2)){acts.push({type:"union",actor:c.id});continue;}
    if(cfg.plain&&c.id!=="healer"){acts.push({type:"attack",actor:c.id,targetId:tgt()});continue;}
    if(c.id==="healer"){
      if(dead.length&&can(sk("revive"))){acts.push({type:"skill",actor:c.id,skillId:"revive",target:dead[0].id});continue;}
      if(hurt.length&&can(sk("heal"))){acts.push({type:"skill",actor:c.id,skillId:"heal",target:hurt[0].id});continue;}
      if(omen){acts.push({type:"guard",actor:c.id});continue;}
      acts.push({type:"attack",actor:c.id,targetId:tgt()});continue;
    }
    if(omen){acts.push({type:"guard",actor:c.id});continue;}
    if(c.id==="knight"){if(cfg.prepared&&can(sk("taunt"))&&turn%2===1){acts.push({type:"skill",actor:c.id,skillId:"taunt"});continue;}acts.push({type:"attack",actor:c.id,targetId:tgt()});continue;}
    if(c.id==="mage"){
      const order=["thunder","freeze","fire"].map(sk).filter(can);
      const weak=order.find(s=>(e.weaknesses||[]).includes(s.element))||order.find(s=>!(e.resistances||[]).includes(s.element))||null;
      if(weak){acts.push({type:"skill",actor:c.id,skillId:weak.id});continue;}
      acts.push({type:"attack",actor:c.id,targetId:tgt()});continue;
    }
    if(c.id==="kotama"&&can(sk("magic-bullet"))){acts.push({type:"skill",actor:c.id,skillId:"magic-bullet",targetId:tgt()});continue;}
    if(c.id==="warrior"&&can(sk("charge"))){acts.push({type:"skill",actor:c.id,skillId:"charge",targetId:tgt()});continue;}
    if(c.id==="samurai"&&can(sk("helmet-break"))){acts.push({type:"skill",actor:c.id,skillId:"helmet-break",targetId:tgt()});continue;}
    acts.push({type:"attack",actor:c.id,targetId:tgt()});
  }
  return acts;
}
`;

async function measure(cfg, n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const g = createGame(ROOT, { seed: 1000 + i, quiet: true });
    g.run(DRIVER);
    try { rows.push(await g.run(`__battle(${JSON.stringify(cfg)})`)); }
    catch (e) { rows.push({ result: "error", err: e.message }); }
  }
  const wins = rows.filter(r => r.result === "win");
  const avg = (arr, k) => arr.length ? arr.reduce((s, r) => s + r[k], 0) / arr.length : NaN;
  const err = rows.find(r => r.result === "error");
  return { lose: rows.filter(r => r.result === "lose").length / n, timeout: rows.filter(r => r.result === "timeout").length / n, win: wins.length / n, turns: avg(wins, "turns"), hpLoss: avg(wins, "hpLoss"), lossAll: avg(rows.filter(r => r.result !== "error"), "hpLoss"), enemyLeft: avg(rows.filter(r => r.result !== "win" && r.result !== "error"), "enemyHpRate"), err: err && err.err };
}
module.exports = { measure };

if (require.main === module) {
  const P4 = ["kotama", "knight", "mage", "healer"], P5 = [...P4, "warrior"];
  const LV = { 1: 4, 2: 8, 3: 13, 4: 20, 5: 25 };
  const NEXT = { 1: 8, 2: 13, 3: 20, 4: 25, 5: 30 };
  const strata = {
    1: { mobs: ["stray-slime", "mushroom"], foe: "foe-bear" },
    2: { mobs: ["forest-goblin", "goblin-scout"], foe: "foe-goblin-captain" },
    3: { mobs: ["mist-bat", "forest-wolf"], foe: "foe-mist-stag" },
    4: { mobs: ["fire-lizard", "lava-golem"], foe: "foe-salamander" },
    5: { mobs: ["dark-knight", "wraith"], foe: "foe-black-general" }
  };
  const scale3 = { 1: 1.3, 2: 1.3, 3: 1.2, 4: 1.3, 5: 1.3 };
  const only = process.argv[4];
  (async () => {
    const out = [];
    const f = x => Number.isFinite(x) ? x : NaN;
    const fmt = r => `${Math.round(r.win * 100)}% / ${Number.isFinite(r.turns) ? r.turns.toFixed(1) : "-"}T / ${Number.isFinite(r.hpLoss) ? Math.round(r.hpLoss * 100) + "%" : "-"}${r.win < 1 && Number.isFinite(r.enemyLeft) ? ` (全滅${Math.round(r.lose * 100)}%・30T切れ${Math.round(r.timeout * 100)}%・敗時敵HP残${Math.round(r.enemyLeft * 100)}%)` : ""}${r.err ? " ERR:" + r.err : ""}`;
    for (const [s, d] of Object.entries(strata)) {
      if (only && only !== s) continue;
      const st = Number(s);
      for (const [pname, party] of [["4人", P4], ["5人", P5]]) {
        const base = { stratum: st, level: LV[st], party, maxTurns: 30 };
        for (const m of d.mobs) {
          out.push([s, pname, `雑魚1F ${m}`, fmt(await measure({ ...base, field: m, scale: 1 }, N))]);
          out.push([s, pname, `雑魚3F ${m}`, fmt(await measure({ ...base, field: m, scale: scale3[st] }, N))]);
        }
        out.push([s, pname, `FOE ${d.foe} Lv${LV[st]}`, fmt(await measure({ ...base, field: d.foe }, N))]);
        out.push([s, pname, `FOE ${d.foe} Lv${NEXT[st]}`, fmt(await measure({ ...base, level: NEXT[st], field: d.foe }, N))]);
        out.push([s, pname, `ボス 通常攻撃のみ`, fmt(await measure({ ...base, plain: true }, N))]);
        out.push([s, pname, `ボス 対策なし`, fmt(await measure({ ...base }, N))]);
        out.push([s, pname, `ボス 対策あり`, fmt(await measure({ ...base, prepared: true }, N))]);
        console.error("done", s, pname);
      }
    }
    for (const r of out) console.log(r.join("\t"));
  })();
}
