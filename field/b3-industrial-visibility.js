/* Visual occlusion only: never modifies navigation, map cells or interactions. */
export function cityLineOfSight(sx, sz, tx, tz, solid, owner = null, cell = 4) {
  // Cells are centered on tile coordinates, including negative outer boundaries.
  const x0 = sx / cell + .5, z0 = sz / cell + .5;
  const x1 = tx / cell + .5, z1 = tz / cell + .5;
  let x = Math.floor(x0), z = Math.floor(z0);
  const endX = Math.floor(x1), endZ = Math.floor(z1), dx = x1-x0, dz = z1-z0;
  const stepX = Math.sign(dx), stepZ = Math.sign(dz);
  const deltaX = dx ? Math.abs(1/dx) : Infinity, deltaZ = dz ? Math.abs(1/dz) : Infinity;
  let nextX = dx ? ((stepX>0?x+1:x)-x0)/dx : Infinity;
  let nextZ = dz ? ((stepZ>0?z+1:z)-z0)/dz : Infinity;
  const inside = (a,b) => owner && a>=owner[0] && a<=owner[2] && b>=owner[1] && b<=owner[3];
  const blocked = (a,b) => solid(a,b) && !inside(a,b);
  for (let i=0;i<512;i++) {
    if (x===endX && z===endZ) return !blocked(x,z);
    if (Math.abs(nextX-nextZ)<1e-9) {
      // A diagonal may not look through a pinhole between touching solid corners.
      if (blocked(x+stepX,z) || blocked(x,z+stepZ)) return false;
      x+=stepX;z+=stepZ;nextX+=deltaX;nextZ+=deltaZ;
    } else if(nextX<nextZ) {x+=stepX;nextX+=deltaX;}
    else {z+=stepZ;nextZ+=deltaZ;}
    if (blocked(x,z)) return false;
  }
  return false;
}
export function cityVisibility(camera, bounds, solid, range=44, cell=4) {
  const cx=(bounds.min[0]+bounds.max[0])/2, cz=(bounds.min[2]+bounds.max[2])/2;
  const rx=(bounds.max[0]-bounds.min[0])/2, rz=(bounds.max[2]-bounds.min[2])/2;
  if (Math.hypot(cx-camera.x,cz-camera.z)>range+Math.hypot(rx,rz)) return false;
  const owner=bounds.ownerCells||[Math.floor((bounds.min[0]+.001)/cell+.5),Math.floor((bounds.min[2]+.001)/cell+.5),Math.floor((bounds.max[0]-.001)/cell+.5),Math.floor((bounds.max[2]-.001)/cell+.5)];
  return [[cx,cz],[cx-rx*.85,cz-rz*.85],[cx+rx*.85,cz-rz*.85],[cx-rx*.85,cz+rz*.85],[cx+rx*.85,cz+rz*.85]]
    .some(([x,z])=>cityLineOfSight(camera.x,camera.z,x,z,solid,owner,cell));
}
