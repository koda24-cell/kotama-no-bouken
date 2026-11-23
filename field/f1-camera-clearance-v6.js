/* Eye-only clearance for review arches. Player movement/collisions stay native. */
export function resolveFirstLayerCameraV6(x,z,portals){
 let adjusted=0;
 for(const portal of portals){
  const ry=portal.rotationY||0,c=Math.cos(ry),s=Math.sin(ry),dx=x-portal.position[0],dz=z-portal.position[2];
  let localX=c*dx-s*dz;const localZ=s*dx+c*dz;
  // Exact original arch thickness is Z=-.92..+.12m. Fade before the stone.
  const gap=Math.max(-.92-localZ,localZ-.12,0);
  if(gap>=.6||Math.abs(localX)>2.6)continue;
  const t=gap/.6,smooth=t*t*(3-2*t),limit=.72+.38*smooth;
  if(Math.abs(localX)<=limit)continue;
  localX=Math.sign(localX)*limit;
  x=portal.position[0]+c*localX+s*localZ;z=portal.position[2]-s*localX+c*localZ;adjusted++;
 }
 return{x,z,adjusted};
}
