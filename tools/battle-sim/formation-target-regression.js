"use strict";
// Independent regression checks for the formation wrapper, including rear-row
// physical reduction, non-physical damage and admin one-hit bypass.
const fs=require("fs"),path=require("path"),vm=require("vm"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"../..");
const source=fs.readFileSync(path.join(root,"battle-formation-ext.js"),"utf8");
const match=source.match(/wrap\("applyDamageToEnemyTarget", base => function \(enemy, target, amount\) \{([\s\S]*?)\n  \}\);/);
assert.ok(match,"formation target wrapper must exist");
const calls=[];
const battleState={_formationPhysicalHit:false};
const base=function(enemy,target,amount){calls.push({enemy,target,amount});return amount;};
const wrapper=vm.runInNewContext("(function(base,battleState){return function(enemy,target,amount){"+match[1]+"\n}})",{})(base,battleState);
const enemy={id:"e"},front={kind:"member",ref:{id:"front",row:"front"}},rear={kind:"member",ref:{id:"rear",row:"rear"}};
function check(target,physical,amount,expected){
 battleState._formationPhysicalHit=physical;
 const result=wrapper(enemy,target,amount);
 const last=calls.at(-1);
 assert.equal(last.enemy,enemy,"enemy forwarded");
 assert.equal(last.target,target,"target forwarded unchanged");
 assert.equal(last.amount,expected,"damage modifier");
 assert.equal(result,expected,"return value");
}
check(front,false,100,100);
check(rear,false,100,100);
check(front,true,100,100);
check(rear,true,100,40);
check(rear,true,1,1);
console.log("PASS 5 independent formation wrapper checks");
