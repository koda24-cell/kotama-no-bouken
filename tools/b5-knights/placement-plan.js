/* Draft-only placement planner, NOT linked into production until GLBs are approved.
 * Deterministic wall-cell statue niches, never writes the map or player collision. */
export const B5_KNIGHT_VARIANTS = Object.freeze(['sentinel','kneeling','shield','fallen']);
export function planB5Knights({a,ch,wallCell,hash,CELL=4,hall=false,maxCount=hall?4:7}) {
  if (!a || !Number.isFinite(CELL) || CELL<=0) throw new Error('invalid map geometry');
  const directions = [[0,-1],[1,0],[0,1],[-1,0]];
  const spots = [];
  for(let ty=1;ty<a.h-1;ty++) for(let tx=1;tx<a.w-1;tx++) {
    if(ch(tx,ty)!=='#') continue;
    if((a.objects||[]).some(o=>Math.abs(o.tx-tx)<=1 && Math.abs(o.ty-ty)<=1)) continue;
    const open=directions.filter(([dx,dz])=>!wallCell(tx+dx,ty+dz));
    if(open.length!==1) continue; // no fork, stair, or ambiguous niche orientation
    const [dx,dz]=open[0];
    spots.push({tx,ty,dx,dz,rank:hash(tx,ty,601)});
  }
  spots.sort((u,v)=>u.rank-v.rank);
  const chosen=[];
  for(const s of spots) {
    if(chosen.some(v=>Math.hypot(v.tx-s.tx,v.ty-s.ty)<(hall?5:4))) continue;
    const idx=chosen.length;
    // Center at the wall/floor boundary. Half the statue recesses into the wall
    // without changing any floor-cell geometry or pathing state.
    const x=(s.tx+s.dx*.5)*CELL;
    const z=(s.ty+s.dz*.5)*CELL;
    const variant=B5_KNIGHT_VARIANTS[(idx+Math.floor(hash(s.tx,s.ty,602)*4))%4];
    chosen.push({
      variant,tx:s.tx,ty:s.ty,x,z,
      yaw:Math.atan2(-s.dx,-s.dz),
      scale:.72+hash(s.tx,s.ty,603)*.06,
      seed:Math.floor(hash(s.tx,s.ty,604)*1e6),
      decorativeOnly:true
    });
    if(chosen.length>=maxCount)break;
  }
  return chosen;
}
