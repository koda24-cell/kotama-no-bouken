// Curved, uneven-width river. The UV V axis follows the river's centerline.
export function createLavaRiverData({segments=96, across=18, length=9, width=1.8}={}) {
  if(segments<2||across<2||length<=0||width<=0) throw new RangeError('invalid river dimensions');
  const positions=[], uvs=[], indices=[];
  const center=t=>[0.55*Math.sin(t*5.4)+0.20*Math.sin(t*12.3), -length/2+length*t];
  for(let i=0;i<=segments;i++){
    const t=i/segments, a=center(Math.max(0,t-0.001)),b=center(Math.min(1,t+0.001));
    const dx=b[0]-a[0], dz=b[1]-a[1], norm=Math.hypot(dx,dz), nx=dz/norm,nz=-dx/norm;
    const localWidth=width*(0.78+0.14*Math.sin(t*13+0.7)+0.10*Math.sin(t*29+1.2));
    for(let j=0;j<=across;j++){
      const u=j/across, cross=2*u-1;
      const shore=0.035*Math.sin(t*37+u*5)+0.045*Math.sin(t*17-u*12);
      const radius=cross*localWidth/2+shore*Math.abs(cross);
      const x=center(t)[0]+nx*radius, z=center(t)[1]+nz*radius;
      const y=0.08+0.14*(1-cross*cross)+0.028*Math.sin(t*24+u*7)*(1-Math.abs(cross));
      positions.push(x,y,z);uvs.push(u,t);
      if(i<segments&&j<across){const k=i*(across+1)+j;indices.push(k,k+across+1,k+1,k+1,k+across+1,k+across+2);}
    }
  }
  return {positions,uvs,indices,segments,across};
}
// Adds an underside and side walls: not a zero-thickness floating plane.
export function createLavaSolidData(options={}) {
  const d=createLavaRiverData(options);
  const topCount=d.positions.length/3, verticesPerRow=d.across+1;
  const positions=[...d.positions], uvs=[...d.uvs], indices=[...d.indices];
  for(let i=0;i<topCount;i++){
    positions.push(d.positions[3*i], d.positions[3*i+1]-0.22, d.positions[3*i+2]);
    uvs.push(d.uvs[2*i],d.uvs[2*i+1]);
  }
  for(let i=0;i<d.segments;i++)for(let j=0;j<d.across;j++){
    const k=i*verticesPerRow+j, r=k+verticesPerRow;
    indices.push(topCount+k,topCount+k+1,topCount+r,topCount+k+1,topCount+r+1,topCount+r);
  }
  const stitch=(a,b)=>indices.push(a,b,topCount+a,b,topCount+b,topCount+a);
  for(let i=0;i<d.segments;i++){
    stitch(i*verticesPerRow,(i+1)*verticesPerRow);
    stitch(i*verticesPerRow+d.across,(i+1)*verticesPerRow+d.across);
  }
  for(let j=0;j<d.across;j++){
    stitch(j,j+1);
    stitch(d.segments*verticesPerRow+j,d.segments*verticesPerRow+j+1);
  }
  return {positions,uvs,indices,segments:d.segments,across:d.across};
}
