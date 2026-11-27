/* Independent reachability and route invariants on the actual city floor definitions. */
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{create}=require('../../field/f3-city-v3-layout.js');
const context=vm.createContext({});vm.runInContext(fs.readFileSync('data/field-maps.js','utf8')+';this.areas=FIELD_AREAS;',context);
const dirs=[[1,0],[-1,0],[0,1],[0,-1]],key=(x,z)=>x+','+z;
const reports=[];
for(let f=0;f<3;f++){
 const original=context.areas[3].floors[f],p=create(f,original),g=p.floor.map;
 function walkable(x,z,doors){const c=g[z]?.[x];return c&&!/[#~a-z]/.test(c)||(doors&&c==='i');}
 function reach(doors){const queue=[p.start],seen=new Set([key(...p.start)]);for(let i=0;i<queue.length;i++)for(const[dx,dz]of dirs){const[x,z]=queue[i],nx=x+dx,nz=z+dz,k=key(nx,nz);if(!seen.has(k)&&walkable(nx,nz,doors)){seen.add(k);queue.push([nx,nz]);}}return seen;}
 const closed=reach(false),opened=reach(true);assert(closed.has(key(...p.end)),'Stairs/boss route must not be behind optional lantern cache');
 let edges=0,passable=0,maxHeight=0,interactions=0;
 for(let z=0;z<p.h;z++)for(let x=0;x<p.w;x++){
  assert.equal(g[z].length,p.w);const c=g[z][x];maxHeight=Math.max(maxHeight,p.height(x,z));
  if(x===0||z===0||x===p.w-1||z===p.h-1)assert.equal(c,'#','Closed map perimeter');
  if(walkable(x,z,true)){passable++;assert(opened.has(key(x,z)),'Disconnected floor '+key(x,z));for(const[dx,dz]of[[1,0],[0,1]])if(walkable(x+dx,z+dz,true))edges++;}
  if(/[a-z]/.test(c)&&c!=='i'){
   interactions++;const seen=c==='j'?opened:closed;
   assert(dirs.some(([dx,dz])=>seen.has(key(x+dx,z+dz))),'Unreachable interaction '+c);
  }
  for(const[dx,dz]of dirs)assert(Math.abs(p.height(x,z)-p.height(x+dx,z+dz))<=1.600001,'Impossible storey jump');
 }
 for(const c of['T','G','S','?','a','c','d','e','f','g','h','i','j'])assert.equal(g.join('').split(c).length,original.map.join('').split(c).length,'Object count '+c+' floor '+f);
 assert(edges-passable+1>=10,'Need multiple genuine loops');assert(maxHeight>=(f===1?6.4:3.2));
 for(const foe of p.floor.foes)for(const[x,z]of foe.path)assert(walkable(x,z,false),'Invalid FOE path');
 for(const quadrant of[[1,1,p.w/2,p.h/2],[p.w/2,1,p.w-1,p.h/2],[1,p.h/2,p.w/2,p.h-1],[p.w/2,p.h/2,p.w-1,p.h-1]])assert([...opened].filter(k=>{const[x,z]=k.split(',').map(Number);return x>=quadrant[0]&&x<quadrant[2]&&z>=quadrant[1]&&z<quadrant[3];}).length>=60,'Unused city quadrant');
 reports.push({floor:7+f,walkable:passable,closedReach:closed.size,loops:edges-passable+1,interactions,maxHeightMeters:maxHeight});
}
console.log(JSON.stringify({passed:true,reports},null,2));
