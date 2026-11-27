/* Actual transformed low triangles, not the loose AABB of a tall crossing. */
export function bridgeSupportBounds(THREE,holder,x,z,rotation){
  const axis=new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),rotation),origin=new THREE.Vector3(x,0,z),boxes=[new THREE.Box3(),new THREE.Box3()];
  let checkedTriangles=0;
  holder.traverse(o=>{
    if(!o.isMesh)return;
    const p=o.geometry.attributes.position,index=o.geometry.index,count=index?index.count:p.count;
    for(let i=0;i<count;i+=3){
      const triangle=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+k):i+k).applyMatrix4(o.matrixWorld));
      if(triangle.every(v=>v.y>=3.5))continue;
      const low=[];
      for(let j=0;j<3;j++){
        const a=triangle[j],b=triangle[(j+1)%3],inside=a.y<3.5;
        if(inside)low.push(a);
        if(inside!==(b.y<3.5))low.push(a.clone().lerp(b,(3.5-a.y)/(b.y-a.y)));
      }
      if(!low.length)continue;checkedTriangles++;
      const distances=low.map(v=>v.clone().sub(origin).dot(axis)),min=Math.min(...distances),max=Math.max(...distances);
      if(min<1.10&&max> -1.10)throw Error('Low bridge geometry enters the clear central lane');
      const box=boxes[max<0?0:1];low.forEach(v=>box.expandByPoint(v));
    }
  });
  if(boxes.some(b=>b.isEmpty()))throw Error('Missing actual bridge bearing geometry');
  return {checkedTriangles,supports:boxes.map((b,i)=>({key:'v2_truss_bridge:verified-support-'+i,min:b.min.toArray(),max:b.max.toArray(),overhead:false}))};
}
