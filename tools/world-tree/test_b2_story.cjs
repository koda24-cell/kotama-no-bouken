"use strict";
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"../..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const ctx=vm.createContext({console,Set,Map,Math,Object,Promise});
for(const p of ["data/field-maps.js","data/story.js","data/story-b2.js","data/progression.js"])
  vm.runInContext(read(p),ctx,{filename:p});
const {areas,scenes,side,events}=vm.runInContext("({areas:FIELD_AREAS,scenes:STORY_SCENES,side:FIELD_SIDE_EVENTS,events:stageEvents})",ctx);
const a=areas[2];
assert.equal(a.floors.length,3);
for(const id of ["a2-enter","a2-f4-rivalry","a2-f4-missing","a2-f5-arrival","a2-f5-corpses","a2-f5-commission","a2-f6-arrival","a2-f6-deep","a2-boss",
  "a2-family","a2-foreman","a2-senior","a2-knight","a2-medic","a2-envoy","a2-merchant","a2-watchman",
  "side-a2-crate-1","side-a2-crate-2","side-a2-cargo-return","side-a2-watch-fangs","side-a2-son-return",
  "side-a2-ore-sample","side-a2-ore-turnin","side-a2-body-report","side-a2-flower-collection","side-a2-flower-handover",
  "pz-a2-plaque","pz-a2-door","pz-a2-solve"]){
  assert.ok(scenes[id]?.lines?.length,"missing dialogue "+id);
}
for(const id of ["a2-crate-1","a2-crate-2","a2-cargo-return","a2-watch-fangs","a2-ore-sample","a2-ore-turnin","a2-son-return","a2-body-report","a2-flower-collection","a2-flower-handover"]){
  assert.ok(side[id],"missing side quest "+id);
  if(side[id].scene) assert.ok(scenes[side[id].scene],"missing referenced scene "+id);
  for(const dep of side[id].requires||[])assert.ok(side[dep],"missing dependency "+dep);
}
for(const obj of Object.values(a.objects)){
  if(obj.scene)assert.ok(scenes[obj.scene],"missing NPC scene "+obj.id);
  if(obj.event)assert.ok(side[obj.event],"missing event "+obj.id);
  for(const id of obj.sideEvents||[])assert.ok(side[id],"missing side event "+id);
}
assert.ok(events.some(e=>e.id==="goblin-intro"),"changed existing stage intro ID");
assert.ok(events.some(e=>e.id==="goblin-clear"&&e.pages[0].includes("6F")),"missing new clear scene");
const walk=c=>c!==undefined&&!/[#~?STGabcdefghijklmnopqrstuvwxyz]/.test(c);
for(let f=0;f<3;f++){
  const m=a.floors[f].map,W=m[0].length;
  assert.ok(m.every(row=>row.length===W),"nonrectangular map f="+f);
  const getPos=mark=>{for(let y=0;y<m.length;y++)for(let x=0;x<W;x++)if(m[y][x]===mark)return [x,y];return null};
  const start=getPos(f===0?"E":"<"),goal=getPos(f===2?"B":">");
  assert.ok(start&&goal,"missing stairs/gate");
  const q=[start],seen=new Set([start.join(",")]);
  for(let i=0;i<q.length;i++)for(let [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){
    const x=q[i][0]+dx,y=q[i][1]+dy,loc=x+","+y;
    if(walk(m[y]?.[x])&&!seen.has(loc)){seen.add(loc);q.push([x,y]);}
  }
  assert.ok(seen.has(goal.join(",")),"gate blocked on f="+f);
  const icons=[["j","k","l","m","c"],["n","o","p","q","d","e","f","g","h"],["a","b","r"]];
  for(const icon of icons[f]){
    const p=getPos(icon);assert.ok(p,"missing icon "+icon);
    assert.ok([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((p[0]+dx)+","+(p[1]+dy))),"blocked NPC or quest "+icon+" on floor "+f);
  }
}
const flags={},calls=[],ctxPlay=vm.createContext({
  console,Object,Promise,Math,Number,fieldState:{area:2,floor:1,flags,lock:false},
  fieldPlayScene:async scene=>{calls.push(scene);return true},
  persistAutoSave:()=>true
});
vm.runInContext(read("field/field-b2-events.js"),ctxPlay);
(async()=>{
  await vm.runInContext("fieldB2OnEnter()",ctxPlay);
  await vm.runInContext("fieldB2OnEnter()",ctxPlay);
  assert.equal(calls.filter(x=>x==="a2-f5-arrival").length,1,"arrival replayed");
  await vm.runInContext("fieldB2BeforeStairs('down')",ctxPlay);
  await vm.runInContext("fieldB2BeforeStairs('down')",ctxPlay);
  assert.equal(calls.filter(x=>x==="a2-f5-commission").length,1,"commission replayed");
  ctxPlay.fieldState.floor=2;
  await vm.runInContext("fieldB2OnEnter()",ctxPlay);
  await vm.runInContext("fieldB2BeforeBoss()",ctxPlay);
  assert.equal(calls.filter(x=>x==="a2-f6-arrival").length,1);
  assert.equal(calls.filter(x=>x==="a2-f6-deep").length,1);
  console.log("PASS: B2 plot, subquests, all 4F-6F routes/NPCs, and once-only transitions.");
})().catch(e=>{console.error(e);process.exitCode=1});
