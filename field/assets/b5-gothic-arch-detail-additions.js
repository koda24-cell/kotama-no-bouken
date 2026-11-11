// Geometry-only additive detailing for the existing approved B5 Gothic arch.
// The source group is never modified or removed.
export function enhanceB5GothicArch(THREE, root) {
 const stone=new THREE.MeshStandardMaterial({color:0x59545e,roughness:.95,flatShading:true});
 const shadow=new THREE.MeshStandardMaterial({color:0x37343d,roughness:.98,flatShading:true});
 const extra=new THREE.Group();extra.name='b5:gothicArch:additiveDetail';
 const box=(x,y,z,w,h,d,mat=stone)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);extra.add(m);return m;};
 const between=(a,b,w=.24,d=.35,mat=stone)=>{const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b);const m=box((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,w,p.distanceTo(q),d,mat);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());return m;};
 // Deep vertical stone flutes and narrow shadow recesses on the surviving jambs.
 for(const x of [-4,4])for(const z of [-.78,.78]){
  for(let i=0;i<4;i++){const y=2+i*2.15;box(x+(x<0?-.04:.04),y,z,.18,1.65,.15,shadow);}
  for(let i=0;i<3;i++){const y=3.0+i*2.2;box(x,y,z,.9,.15,.2);}
 }
 // Two layered, incomplete pointed archivolts. Deliberate breaks preserve the ruined silhouette.
 const left=[[-3.5,10.2,-.75],[-2.75,11.6,-.75],[-1.8,13.0,-.75],[-.75,14.0,-.75]];
 const right=[[3.5,10.2,-.75],[2.75,11.6,-.75],[1.8,13.0,-.75],[.75,14.0,-.75]];
 for(const path of [left,right])for(let i=0;i<path.length-1;i++){if(path===right&&i===1)continue;between(path[i],path[i+1],.58,.48);}
 for(const x of [-3.1,3.1])for(const z of [-1.05,-.48]){
  // Carved buttress tiers add depth without covering the existing columns.
  box(x,6.2,z,.42,5.2,.28);
  box(x,8.9,z,.65,.24,.52);
  box(x,3.4,z,.65,.24,.52);
 }
 // Worn detached stones at ground level, irregular low profiles rather than hovering blocks.
 for(let i=0;i<14;i++){
  const a=i*2.39996,r=2.2+(i%5)*.68,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const geo=new THREE.DodecahedronGeometry(.5+(i%3)*.14,0);
  const m=new THREE.Mesh(geo,stone);m.position.set(x,.22+(i%3)*.06,z);m.scale.set(1.2,.5,.82);m.rotation.set(i*.31,i*.77,i*.13);extra.add(m);
 }
 root.add(extra);return root;
}
