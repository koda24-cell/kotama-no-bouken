const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('script.js','utf8');
const start=source.indexOf('function getSkillBulkUpgradeOptions(');
const end=source.indexOf('function openSkillUpgradeDialog(',start);
assert(start>=0&&end>start,'bulk helper exists');
const code=source.slice(start,end);
const state={levels:{},points:20};
const context={
 trainingPoints:{hero:20},
 getTrainingUpgradeEligibility(id,node){
  const lv=state.levels[node]||0,cost=2;
  const stage=lv>=3?false:true;
  const allowed=stage&&context.trainingPoints[id]>=cost;
  return {allowed,cost,level:lv,max:5,node:{id:node}};
 },
 setTreeLevel(id,node,lv){state.levels[node]=lv;}
};
vm.createContext(context);vm.runInContext(code,context);
const options=context.getSkillBulkUpgradeOptions('hero','bolt');
assert.deepEqual(options.map(o=>[o.count,o.level,o.cost]),[[1,1,2],[2,2,4],[3,3,6]]);
assert.equal(state.levels.bolt,0,'level unchanged after preview');
assert.equal(context.trainingPoints.hero,20,'points unchanged after preview');
context.trainingPoints.hero=3;
assert.deepEqual(context.getSkillBulkUpgradeOptions('hero','bolt').map(o=>o.count),[1],'insufficient SP prevents second level');
assert.equal(context.trainingPoints.hero,3);
state.levels.bolt=2;context.trainingPoints.hero=20;
assert.deepEqual(context.getSkillBulkUpgradeOptions('hero','bolt').map(o=>o.level),[3],'stage lock prevents exceeding limit');
assert.equal(state.levels.bolt,2);
const css=fs.readFileSync('css/05-progression-and-boss.css','utf8');
assert(css.includes('.skill-upgrade-quantity select'));
assert(css.includes('.training-skill-main .skill-node-select'));
assert(source.includes('data-upgrade-count')&&source.includes('data-upgrade-effects'));
console.log('Skill bulk upgrades: 9 regression assertions passed');
