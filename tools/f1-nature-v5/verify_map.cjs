'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
function load(maps,field){const c={};vm.createContext(c);vm.runInContext(maps+'\n'+field+'\nthis.floors=[0,1,2].map(f=>fieldArea(1,f)); this.solid=(a,c)=>fieldCharSolid(a,c);',c);return c;}
const current=load(read('data/field-maps.js'),read('field.js'));
const old=load(cp.execFileSync('git',['show','fb8a7769ed149c94fe4ef2565642a6c07b23cdfa:data/field-maps.js'],{cwd:ROOT,encoding:'utf8'}),read('field.js'));
const clean=x=>JSON.parse(JSON.stringify(x));
for(let i=0;i<2;i++)assert.deepEqual(clean({floor:current.floors[i].floor,objects:current.floors[i].objects,start:current.floors[i].start}),clean({floor:old.floors[i].floor,objects:old.floors[i].objects,start:old.floors[i].start}),'1F/2F native data changed');
const a=current.floors[2],before=old.floors[2];assert.deepEqual(clean(a.objects),clean(before.objects),'Native object identity/reward/position changed');
const walk=new Set();for(let z=0;z<a.h;z++)for(let x=0;x<a.w;x++)if(!current.solid(a,a.grid[z][x]))walk.add(x+','+z);
const near=(x,z)=>[[x-1,z],[x+1,z],[x,z-1],[x,z+1]],start=a.start.tx+','+a.start.ty;
let q=[start],seen=new Set(q);for(let i=0;i<q.length;i++){const [x,z]=q[i].split(',').map(Number);for(const p of near(x,z)){const k=p.join(',');if(walk.has(k)&&!seen.has(k)){seen.add(k);q.push(k);}}}
assert.equal(seen.size,walk.size,'Unreachable walking cells');
for(const o of a.objects)assert(walk.has(o.tx+','+o.ty)||near(o.tx,o.ty).some(p=>walk.has(p.join(','))),'Unreachable object '+o.key);
for(const f of a.floor.foes){for(const [x,z] of f.path)assert(walk.has(x+','+z),'FOE route is blocked');for(let i=0;i<f.path.length;i++){const p=f.path[i],q=f.path[(i+1)%f.path.length];assert.equal(Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1]),1,'FOE loop crosses a wall or skips a tile');}}
const priorV4=JSON.parse(read('assets/3d/dungeons/b1_sacred_forest_candidates/scene/game-layout-v4.json')).beforeFingerprint.saveCriticalData.map;let preservedV4Positions=0;for(let z=0;z<priorV4.length;z++)for(let x=0;x<priorV4[z].length;x++)if(!current.solid(a,priorV4[z][x])){assert(walk.has(x+','+z),'V5 blocks a valid V4 save position');preservedV4Positions++;}
const degree=k=>near(...k.split(',').map(Number)).filter(p=>walk.has(p.join(','))).length;
const report={passed:true,scope:'Native data comparison and actual reachable corridor topology; not artistic/FPS approval',floor1and2Unchanged:true,previousV4WalkingPositionsPreserved:preservedV4Positions,fixedObjectsUnchanged:a.objects.length,reachableWalkingCells:walk.size,deadEnds:[...walk].filter(k=>degree(k)===1),junctions:[...walk].filter(k=>degree(k)>=3),bossAndStairsConnected:walk.has('22,1')&&walk.has('1,16'),foeRoutePassable:true,waterCells:a.floor.map.join('').split('~').length-1,beforeMap:before.floor.map,afterMap:a.floor.map};
assert(report.deadEnds.length>=10&&report.junctions.length>=10);const out=path.join(ROOT,'docs/reviews/f1-v5/map-qa.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,walk:walk.size,deadEnds:report.deadEnds.length,junctions:report.junctions.length,fixed:report.fixedObjectsUnchanged}));
