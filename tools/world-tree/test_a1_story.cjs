"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const source = rel => fs.readFileSync(path.join(root, rel), "utf8");
const ctx = vm.createContext({ console, Math, Object, Promise, Set, Map });
for (const file of ["data/field-maps.js", "data/story.js", "data/story-a1.js", "data/progression.js"]) vm.runInContext(source(file), ctx, { filename: file });
const data = vm.runInContext("({areas:FIELD_AREAS,side:FIELD_SIDE_EVENTS,scenes:STORY_SCENES,speakers:STORY_SPEAKERS,events:stageEvents})", ctx);
const a = data.areas[1];
assert.equal(a.floors.length, 3);
for (const key of ["a1-enter", "a1-exam-pass", "a1-exam-reminder", "a1-f2-arrival", "a1-alarm", "a1-f3-arrival", "a1-f3-besieged", "a1-boss", "a1-senior-pair", "a1-patrol", "a1-knights", "a1-rival-party"]) {
  assert.ok(data.scenes[key]?.lines?.length, "missing scene "+key);
}
for (const id of ["a1-old-stump", "a1-axe-return", "a1-root-cache", "a1-herb-medicine"]) {
  assert.ok(data.side[id], "missing side quest "+id);
}
assert.equal(data.events.find(x=>x.id==="slime-clear").pages[0].includes("異常な魔物"), true);
for (const id of ["forest-intro","goblin-intro","wolf-intro","dragon-intro","maou-intro"]) assert.ok(data.events.some(x=>x.id===id));
// All 1F–3F maps remain rectangular, and stair/exit/gate access is not blocked by added NPCs.
const walkable = c => c !== undefined && !/[#~STG?abcdefghijklmnopqrstuvwxyz]/.test(c);
for (let f=0;f<3;f++) {
  const rows=a.floors[f].map, width=rows[0].length;
  assert.ok(rows.every(r=>r.length===width), "non-rectangular floor "+f);
  const locate=c=>{for(let y=0;y<rows.length;y++)for(let x=0;x<width;x++)if(rows[y][x]===c)return [x,y];return null};
  const begin=locate(f===0?"E":"<"),end=locate(f===2?"B":">");
  assert.ok(begin&&end,"missing staircase "+f);
  const queue=[begin],visited=new Set([begin.join(",")]);
  for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const [x,y]=queue[i],nx=x+dx,ny=y+dy,k=nx+","+ny;
    if(rows[ny]&&walkable(rows[ny][nx])&&!visited.has(k)){visited.add(k);queue.push([nx,ny]);}
  }
  assert.ok(visited.has(end.join(",")),"map exit unreachable "+f);
}
for(const [objId,scene] of [["h","a1-senior-pair"],["i","a1-patrol"],["j","a1-knights"],["k","a1-rival-party"],["a","a1-woodcutter"],["b","a1-herb-girl"]]) {
  assert.equal(a.objects[objId].scene,scene);
  assert.ok(a.floors.some(f=>f.map.some(row=>row.includes(objId))),"missing NPC tile "+objId);
}
const sourceA1=source("field/field-a1-events.js");
const flags={};
let dialogs=[],rewards=[],saves=0,lastSay="";
Object.assign(ctx,{
  fieldState:{area:1,floor:0,flags,lock:false},
  fieldArea:(_,f)=>({objects:[{kind:"chest",tx:2,ty:2},{kind:"door",tx:3,ty:3}]}),
  fieldExploredRate:()=>30,
  fieldPlayScene: async id=>{dialogs.push(id);return true},
  fieldLootGrant:reward=>{rewards.push(reward);return {parts:[]}},
  persistAutoSave:()=>{saves++;return true},
  fieldSay:async msg=>{lastSay=msg;return true},
  $:()=>null,
  document:{querySelector:()=>null},
  fieldDrawFullMap:()=>{},
  fieldMiniDirty:false
});
vm.runInContext(sourceA1,ctx,{filename:"field/field-a1-events.js"});
(async ()=>{
  assert.equal(await vm.runInContext('fieldA1BeforeStairs("down")',ctx),false);
  assert.ok(lastSay.includes("未記録"));
  flags["a1:mark:chest:2:2"]=true;
  flags["a1:mark:door:3:3"]=true;
  assert.equal(await vm.runInContext('fieldA1BeforeStairs("down")',ctx),true);
  assert.equal(flags["a1:exam-passed"],true);
  assert.equal(rewards.length,1);
  assert.equal(await vm.runInContext('fieldA1BeforeStairs("down")',ctx),true);
  assert.equal(rewards.length,1,"exam reward duplicated");
  assert.ok(saves>0);
  console.log("A1 story checks passed: scenes, NPC placement, path reachability, exam reward/flags.");
})().catch(e=>{console.error(e);process.exitCode=1});
