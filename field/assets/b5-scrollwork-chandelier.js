/* Demon King's cathedral: ornate two-tier suspended chandelier.
 * Original geometry-only prop; front/back are symmetric around Y.
 * Geometry uses curled iron tubes, candle cups and uneven damaged hoops.
 * Anchor at y=0 (ceiling suspension point); chandelier hangs below.
 */
export function createB5ScrollworkChandelier(THREE,options={}) {
 const group=new THREE.Group();group.name='b5:throne:scrollworkChandelier';
 group.userData.visualOnly=true;
 const geos=[],mats=[],G=g=>(geos.push(g),g),M=m=>(mats.push(m),m);
 const iron=M(new THREE.MeshStandardMaterial({color:0x35313a,metalness:.78,roughness:.43}));
 const edge=M(new THREE.MeshStandardMaterial({color:0x89735c,metalness:.72,roughness:.48}));
 const candle=M(new THREE.MeshStandardMaterial({color:0xe1d6bd,roughness:.84}));
 const flame=M(new THREE.MeshBasicMaterial({color:0xffb95b}));
 const add=(g,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(G(g),m);o.position.set(x,y,z);group.add(o);return o;};
 const tube=(points,r=.045,m=iron)=>{
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');
  return add(new THREE.TubeGeometry(curve,Math.max(12,points.length*5),r,7,false),m);
 };
 const ring=(radius,y,material=iron,cut=null)=>{
  const N=120;
  for(let k=0;k<N;k++){
   const a=k*2*Math.PI/N,b=(k+1)*2*Math.PI/N;
   if(cut&&a>cut[0]&&a<cut[1])continue;
   tube([[radius*Math.cos(a),y,radius*Math.sin(a)],[radius*Math.cos((a+b)/2),y,radius*Math.sin((a+b)/2)],[radius*Math.cos(b),y,radius*Math.sin(b)]],.085,material);
  }
 };
 const cup=(x,y,z)=>{
  add(new THREE.CylinderGeometry(.22,.11,.12,12),edge,x,y,z);
  add(new THREE.CylinderGeometry(.075,.09,.48,10),candle,x,y+.28,z);
  add(new THREE.ConeGeometry(.105,.26,9),flame,x,y+.67,z);
 };
 const spiral=(radius,y,a,side,scale=.55)=>{
  // Inward-facing forged iron C-scroll with a curled terminal.
  const pts=[];
  const x=radius*Math.cos(a),z=radius*Math.sin(a);
  const tangent=[-Math.sin(a),Math.cos(a)],radial=[Math.cos(a),Math.sin(a)];
  for(let i=0;i<=34;i++){
   const t=i/34,theta=-.25+side*t*Math.PI*2.55;
   const r=scale*(1-.82*t);
   const inward=.15+.45*t;
   const xx=x-radial[0]*inward+tangent[0]*r*Math.cos(theta);
   const zz=z-radial[1]*inward+tangent[1]*r*Math.cos(theta);
   pts.push([xx,y+.10+r*Math.sin(theta),zz]);
  }
  tube(pts,.038,edge);
 };
 // Upper and lower rings; break one short arc on the lower level.
 ring(2.55,-3.35);ring(2.55,-3.48,edge);
 ring(3.55,-5.45,iron,[.36,.62]);ring(3.55,-5.61,edge,[.36,.62]);
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6;
  const outer=[3.55*Math.cos(a),-5.45,3.55*Math.sin(a)];
  const upper=[2.55*Math.cos(a),-3.35,2.55*Math.sin(a)];
  tube([[0,-.28,0],[.38*Math.cos(a),-1.1,.38*Math.sin(a)],upper],.064);
  tube([upper,[3.0*Math.cos(a),-4.3,3.0*Math.sin(a)],outer],.053);
  spiral(3.55,-5.35,a,1,.62);spiral(3.55,-5.35,a,-1,.42);
  if(i%2===0)cup(outer[0],-5.1,outer[2]);
 }
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4;
  spiral(2.55,-3.26,a,1,.50);
  spiral(2.55,-3.26,a,-1,.34);
  cup(2.55*Math.cos(a),-3.0,2.55*Math.sin(a));
 }
 // Curved Gothic braces and hanging scrollwork within the ring.
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4;
  tube([[.42*Math.cos(a),-2.1,.42*Math.sin(a)],[1.0*Math.cos(a),-3.6,1.0*Math.sin(a)],[2.2*Math.cos(a),-4.7,2.2*Math.sin(a)],[3.45*Math.cos(a),-5.45,3.45*Math.sin(a)]],.058,iron);
 }
 // Suspended chain: alternating elongated links, plus four outer swag chains.
 const chain=(a,b,links=12)=>{
  for(let i=0;i<links;i++){
   const t=i/links,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
   const link=add(new THREE.TorusGeometry(.11,.026,6,10),iron,...p);
   link.rotation.y=i%2?Math.PI/2:0;
  }
 };
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2;
  chain([.24*Math.cos(a),-.12,.24*Math.sin(a)],[2.55*Math.cos(a),-3.35,2.55*Math.sin(a)],18);
 }
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,b=a+Math.PI/4;
  const pts=[];
  for(let k=0;k<=12;k++){
   const t=k/12,ang=a+(b-a)*t;
   pts.push([3.55*Math.cos(ang),-5.65-.42*Math.sin(Math.PI*t),3.55*Math.sin(ang)]);
  }
  tube(pts,.028,edge);
 }
 add(new THREE.CylinderGeometry(.34,.23,.5,12),edge,0,-.2,0);
 tube([[0,-.45,0],[0,-2.8,0],[0,-5.3,0],[0,-6.1,0]],.09,iron);
 add(new THREE.OctahedronGeometry(.25),edge,0,-6.35,0);
 const scale=Number.isFinite(options.scale)?Math.max(.1,Math.min(3,options.scale)):1;
 group.scale.setScalar(scale);
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);group.clear();geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}};
}
