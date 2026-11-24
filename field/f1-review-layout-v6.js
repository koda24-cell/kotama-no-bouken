/* Candidate-only alcoves. Original maps and persisted reward keys remain intact. */
function fieldFirstStratumReviewFloorV6(def,floor,f) {
  const grid=floor.map.map(r=>r.split('')),h=grid.length,w=grid[0].length,dirs=[[0,1],[1,0],[0,-1],[-1,0]],aliases={},rewards={},moves=[];
  const objects=[];let chest=0;
  for(let z=0;z<h;z++)for(let x=0;x<w;x++){
    const ch=grid[z][x],o=def.objects?.[ch];
    if(ch==='T')rewards[x+','+z]=floor.chests?.[chest++];
    if('STG?D'.includes(ch)||(o&&!o.onWall&&!['door','switch'].includes(o.kind)))objects.push({x,z,ch,o});
  }
  const visual=(x,z)=>grid[z]?.[x]!==undefined&&grid[z][x]!=='#';
  const degree=(x,z)=>dirs.filter(([dx,dz])=>visual(x+dx,z+dz)).length;
  for(const item of objects){
    const {x,z,ch}=item;if(degree(x,z)<=1)continue;
    const candidates=[];
    for(let nz=1;nz<h-1;nz++)for(let nx=1;nx<w-1;nx++){
      if(grid[nz][nx]!=='#'||degree(nx,nz)!==1)continue;
      const distance=Math.abs(nx-x)+Math.abs(nz-z);if(distance>12)continue;
      const [dx,dz]=dirs.find(([dx,dz])=>visual(nx+dx,nz+dz));
      const entry=grid[nz+dz][nx+dx];
      if(!'.,*_'.includes(entry))continue;
      if(objects.some(o=>o.x!==x||o.z!==z?Math.abs(o.x-nx)+Math.abs(o.z-nz)<=1:false))continue;
      candidates.push({nx,nz,distance});
    }
    candidates.sort((a,b)=>a.distance-b.distance||a.nz-b.nz||a.nx-b.nx);
    if(!candidates.length)throw new Error('No isolated review alcove for '+[f,ch,x,z]);
    const{nx,nz}=candidates[0];grid[z][x]='.';grid[nz][nx]=ch;
    const kind={S:'save',T:'chest',G:'gather','?':'sign',D:'decor'}[ch];
    if(kind)aliases[kind+':'+nx+':'+nz]=`${kind}:1-${f}:${x}:${z}`;
    if(ch==='T'){rewards[nx+','+nz]=rewards[x+','+z];delete rewards[x+','+z];}
    moves.push({char:ch,from:[x,z],to:[nx,nz]});
  }
  return {...floor,map:grid.map(r=>r.join('')),reviewKeyAliases:aliases,reviewChestRewards:rewards,reviewRelocations:moves};
}
