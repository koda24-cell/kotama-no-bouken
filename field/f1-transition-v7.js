/* First half of 2F keeps 1F masonry. Progress follows traversable routes, not world X/Z. */
export function firstLayerTransition(area,walkTiles){
 const walk=new Set(walkTiles.map(p=>p.join(','))),near=(x,z)=>[[x+1,z],[x-1,z],[x,z+1],[x,z-1]];
 function distances(origin){const d=new Map(),q=[];if(origin){q.push([origin.tx,origin.ty]);d.set(q[0].join(','),0);}for(let i=0;i<q.length;i++)for(const p of near(...q[i]))if(walk.has(p.join(','))&&!d.has(p.join(','))){d.set(p.join(','),d.get(q[i].join(','))+1);q.push(p);}return d;}
 const up=distances(area.up),down=distances(area.down);
 const distanceAt=(d,x,z)=>d.get(x+','+z)??Math.min(...near(x,z).map(p=>(d.get(p.join(','))??1e6)+1));
 const progress=(x,z)=>{if(area.f===0)return 0;if(area.f===2)return 1;const a=distanceAt(up,x,z),b=distanceAt(down,x,z);return a/Math.max(1,a+b);};
 const blend=(x,z)=>Math.max(0,Math.min(1,(progress(x,z)-.5)*2));
 const wall=(x,z)=>{
  const t=blend(x,z);if(t===0)return 'native';if(t===1)return 'wall_f3';
  const v=t*4,i=Math.floor(v),fraction=v-i;
  const random=((Math.imul(x,73856093)^Math.imul(z,19349663))>>>0)/4294967296;
  return ['native','wall_a','wall_b','wall_c','wall_f3'][i+(random<fraction?1:0)];
 };
 return{progress,blend,wall};
}
