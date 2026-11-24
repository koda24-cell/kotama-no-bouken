'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const files=['data/field-maps.js','field/f1-review-layout-v6.js','field.js'];
function load(opt){const c=opt?{window:{KotamaSacredPlaytest:true}}:{};vm.createContext(c);vm.runInContext(files.map(p=>fs.readFileSync(p,'utf8')).join('\n')+';this.floors=[0,1,2].map(f=>fieldArea(1,f));this.solid=(a,x,z)=>fieldCharSolid(a,fieldTileAt(a,x,z));',c);return c;}
const old=load(false),now=load(true),clean=x=>JSON.parse(JSON.stringify(x)),report=[];
for(let f=0;f<3;f++){
 const a=now.floors[f],b=old.floors[f],walk=new Set(),near=(x,z)=>[[x+1,z],[x-1,z],[x,z+1],[x,z-1]];
 for(let z=0;z<a.h;z++)for(let x=0;x<a.w;x++){
  if(!now.solid(a,x,z))walk.add(x+','+z);
  if(!old.solid(b,x,z))assert(!now.solid(a,x,z),'Blocked old valid save position');
 }
 const queue=[a.start.tx+','+a.start.ty],seen=new Set(queue);
 for(let i=0;i<queue.length;i++)for(const p of near(...queue[i].split(',').map(Number)))if(walk.has(p.join(','))&&!seen.has(p.join(','))){seen.add(p.join(','));queue.push(p.join(','));}
 // 1F has its intentional locked puzzle area; compare pre-existing reachability separately.
 const oldQueue=[b.start.tx+','+b.start.ty],oldSeen=new Set(oldQueue);
 for(let i=0;i<oldQueue.length;i++)for(const p of near(...oldQueue[i].split(',').map(Number)))if(!old.solid(b,...p)&&!oldSeen.has(p.join(','))){oldSeen.add(p.join(','));oldQueue.push(p.join(','));}
 for(const k of oldSeen)assert(seen.has(k),'Lost previously reachable position '+k);
 assert.equal(a.objects.length,b.objects.length);
 for(const o of a.objects){const prior=b.objects.find(p=>p.key===o.key);assert(prior,'Persisted object key changed '+o.key);const strip=o=>Object.fromEntries(Object.entries(clean(o)).filter(([k])=>!['tx','ty'].includes(k)));assert.deepEqual(strip(o),strip(prior),'Object content or reward changed');
  if(!o.walk&&!o.onWall&&!['door','switch'].includes(o.kind))assert.equal(near(o.tx,o.ty).filter(([x,z])=>a.grid[z]?.[x]!==undefined&&a.grid[z][x]!=='#').length,1,'Through-route interactable '+o.key);
 }
 report.push({floor:f+1,moves:clean(a.floor.reviewRelocations),walking:walk.size,reachable:seen.size,oldReachable:oldSeen.size,stableKeys:true,rewardsPreserved:true,oldPositionsPreserved:true});
}
fs.mkdirSync('docs/reviews/f1-v6',{recursive:true});fs.writeFileSync('docs/reviews/f1-v6/map-qa.json',JSON.stringify({passed:true,floors:report},null,2));console.log(report);
