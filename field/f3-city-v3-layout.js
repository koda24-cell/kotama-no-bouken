/* Deterministic trial-only city plan. Shared by movement, camera and scenery. */
(function(root){
 'use strict';
 const cache=new Map(),key=(x,z)=>x+','+z;
 function create(f,original){
  if(cache.has(f))return cache.get(f);
  const w=35,h=31,grid=Array.from({length:h},()=>Array(w).fill('#'));
  let seed=731927+f*9173;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  const directions=[[1,0],[-1,0],[0,1],[0,-1]],stack=[[1,h-2]];grid[h-2][1]='.';
  while(stack.length){
   const [x,z]=stack.at(-1),next=directions.map(([dx,dz])=>[x+dx*2,z+dz*2,dx,dz]).filter(([nx,nz])=>nx>0&&nz>0&&nx<w-1&&nz<h-1&&grid[nz][nx]==='#');
   if(!next.length){stack.pop();continue;}const[nx,nz,dx,dz]=next[Math.floor(rand()*next.length)];grid[z+dz][x+dx]='.';grid[nz][nx]='.';stack.push([nx,nz]);
  }
  // Short cross-connections give several circuits instead of a single DFS tree.
  for(let z=2;z<h-2;z++)for(let x=2;x<w-2;x++)if(grid[z][x]==='#'&&rand()<.13&&((grid[z][x-1]==='.'&&grid[z][x+1]==='.')||(grid[z-1][x]==='.'&&grid[z+1][x]==='.')))grid[z][x]='.';
  // Break the continuous boundary street into offset side streets.
  for(let x=5;x<w-4;x+=8){grid[h-2][x]='#';for(let q=x-1;q<=x+1;q++){grid[h-3][q]='.';grid[h-4][q]='.';}}
  const tags={},water=[],rooms=[];
  if(f===0){const room={type:'light-court',x0:10,z0:8,x1:12,z1:10};rooms.push(room);for(let z=8;z<=10;z++)for(let x=10;x<=12;x++){grid[z][x]='.';tags[key(x,z)]='light-court';}}
  if(f===1){
   const room={type:'greenhouse',x0:13,z0:11,x1:19,z1:15};rooms.push(room);
   for(let z=room.z0;z<=room.z1;z++)for(let x=room.x0;x<=room.x1;x++){grid[z][x]='.';tags[key(x,z)]='greenhouse';}
   grid[13][12]='.';grid[13][11]='.';tags[key(12,13)]='greenhouse-entry';
   for(const [x,z]of[[14,12],[18,14]]){grid[z][x]='#';tags[key(x,z)]='root-planter';}
  }
  if(f===2){
   const room={type:'white-garden',x0:15,z0:14,x1:19,z1:18};rooms.push(room);
   for(let z=14;z<=18;z++)for(let x=15;x<=19;x++){grid[z][x]='.';tags[key(x,z)]='white-garden';}
   for(let z=9;z<=13;z++)for(let x=15;x<=19;x++)grid[z][x]='#';
   grid[13][17]='a';tags[key(17,13)]='monument-anchor';
   for(const rect of[[4,8,8,12],[23,17,27,21],[5,22,9,25]]){
    for(let z=rect[1];z<=rect[3];z++)for(let x=rect[0];x<=rect[2];x++)if(grid[z][x]==='#'){grid[z][x]='~';water.push([x,z]);tags[key(x,z)]='sunken-city';}
   }
  }
  // Work in the reachable component; connecting a room must not strand a lane.
  const flood=(blocked=new Set())=>{const q=[[1,h-2]],seen=new Set([key(1,h-2)]);for(let i=0;i<q.length;i++){const[x,z]=q[i];for(const[dx,dz]of directions){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(nx<0||nz<0||nx>=w||nz>=h||seen.has(k)||blocked.has(grid[nz][nx])||'#~'.includes(grid[nz][nx]))continue;seen.add(k);q.push([nx,nz]);}}return seen;};
  function connect(x,z){
   let seen=flood();if(seen.has(key(x,z)))return;
   const target=[...seen].map(k=>k.split(',').map(Number)).sort((a,b)=>(Math.abs(a[0]-x)+Math.abs(a[1]-z))-(Math.abs(b[0]-x)+Math.abs(b[1]-z)))[0];
   let[tx,tz]=target;while(tx!==x){tx+=Math.sign(x-tx);if(grid[tz][tx]!=='a')grid[tz][tx]='.';}while(tz!==z){tz+=Math.sign(z-tz);if(grid[tz][tx]!=='a')grid[tz][tx]='.';}
  }
  connect(w-2,1);if(f===2)connect(17,14);if(f===1)connect(16,13);
  let reachable=flood();for(let z=1;z<h-1;z++)for(let x=1;x<w-1;x++)if(grid[z][x]==='.'&&!reachable.has(key(x,z)))grid[z][x]='#';
  const symbols=[];let oldChest=0;original.map.forEach((row,z)=>[...row].forEach((c,x)=>{if(!'#.*~,<>EPBa_'.includes(c)&&c!==' ')symbols.push({c,x,z,reward:c==='T'?(original.chests||[])[oldChest++]:null});}));
  const occupied=new Set([key(1,h-2),key(w-2,1),key(17,13)]),aliases={},rewards={};
  function placeSymbol(s,i){
   const nodes=[];for(let z=1;z<h-1;z++)for(let x=1;x<w-1;x++)if(grid[z][x]==='.'&&!occupied.has(key(x,z))){const degree=directions.filter(([dx,dz])=>!['#','~'].includes(grid[z+dz]?.[x+dx])).length;if(degree===1)nodes.push([x,z]);}
   if(!nodes.length)for(let z=1;z<h-1;z++)for(let x=1;x<w-1;x++)if(grid[z][x]==='.'&&!occupied.has(key(x,z))&&!tags[key(x,z)])nodes.push([x,z]);
   nodes.sort((a,b)=>Math.abs(a[0]-(3+i*7)%w)+Math.abs(a[1]-(5+i*11)%h)-Math.abs(b[0]-(3+i*7)%w)-Math.abs(b[1]-(5+i*11)%h));
   const[x,z]=nodes[0];grid[z][x]=s.c;occupied.add(key(x,z));
   const kind={T:'chest',G:'gather',S:'save','?':'sign'}[s.c];if(kind)aliases[kind+':'+x+':'+z]=kind+':3-'+f+':'+s.x+':'+s.z;
   if(s.c==='T'&&s.reward)rewards[key(x,z)]=s.reward;
  }
  symbols.filter(s=>s.c!=='i'&&s.c!=='j').forEach(placeSymbol);
  if(symbols.some(s=>s.c==='i')){
   const dead=[];for(let z=2;z<h-2;z++)for(let x=2;x<w-2;x++)if(grid[z][x]==='.'&&!occupied.has(key(x,z))&&directions.filter(([dx,dz])=>!['#','~'].includes(grid[z+dz][x+dx])).length===1)dead.push([x,z]);
   const[x,z]=dead.at(-1)||[w-2,h-2];grid[z][x]='j';const [dx,dz]=directions.find(([dx,dz])=>grid[z+dz]?.[x+dx]==='.')||[0,-1];grid[z+dz][x+dx]='i';
  }
  grid[h-2][1]=f===0?'E':'<';grid[1][w-2]=f===2?'B':'>';
  // Non-walkable garage alcoves keep full-size cars out of the movement lane.
  const garages=[];
  for(let z=3;z<h-3;z++)for(let x=3;x<w-3;x++)if(grid[z][x]==='#'&&!tags[key(x,z)]&&!(f===2&&x>=14&&x<=20&&z>=8&&z<=14)&&rand()<.075&&garages.length<7&&garages.every(p=>Math.abs(p[0]-x)+Math.abs(p[1]-z)>6)){
   const direction=directions.find(([dx,dz])=>grid[z+dz][x+dx]==='.');if(!direction)continue;
   tags[key(x,z)]='car-niche';garages.push([x,z,...direction]);
  }
  const ramp=(x,a,b)=>Math.max(0,Math.min(1,(x-a)/(b-a)));
  function height(x,z){if(f===0)return 3.2*ramp(x,17,19);if(f===1)return 3.2*ramp(x,7,9)+3.2*ramp(x,23,25);return 3.2*ramp(x,3,5)-3.2*ramp(x,9,11)+3.2*ramp(x,25,27);}
  const foeNodes=[];for(let z=3;z<h-3;z++)for(let x=3;x<w-3;x++)if(grid[z][x]==='.'&&Math.abs(x-1)+Math.abs(z-(h-2))>10&&directions.some(([dx,dz])=>grid[z+dz][x+dx]==='.'&&grid[z+dz*2]?.[x+dx*2]==='.'))foeNodes.push([x,z]);
  const floor={...original,map:grid.map(r=>r.join('')),reviewKeyAliases:aliases,reviewChestRewards:rewards,foes:(original.foes||[]).map((o,i)=>{const[x,z]=foeNodes[Math.floor((i+1)*foeNodes.length/((original.foes||[]).length+1))],d=directions.find(([dx,dz])=>grid[z+dz][x+dx]==='.'&&grid[z+dz*2]?.[x+dx*2]==='.');return {...o,path:[[x,z],[x+d[0],z+d[1]],[x+d[0]*2,z+d[1]*2]]};}),cityV3:true};
  const plan={version:'V3-20261127',f,w,h,floor,tags,water,rooms,garages,height,heightWorld:(x,z)=>height(x/4,z/4),start:[1,h-2],end:[w-2,1],monument:f===2?{anchor:[17,13],center:[17,11],height:7.9}:null};
  cache.set(f,plan);return plan;
 }
 const api={create};root.KotamaCityV3Layout=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
