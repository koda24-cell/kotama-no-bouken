import * as THREE from 'three';
// V8 standalone production candidate. V1-V7 modules remain unchanged in Git.
// The former additive stack is intentionally NOT imported: it caused sandwich-like
// overlapping planes in side view. One continuous solid mother-rock mesh instead.
export function createB4LavaRockwallV8(){
 const root=new THREE.Group();root.name='b4:lava-rockwall-v8-unified';
 const rock=new THREE.MeshStandardMaterial({color:0x37312f,roughness:1,metalness:0,flatShading:true,side:THREE.DoubleSide});
 const black=new THREE.MeshStandardMaterial({color:0x140d0c,roughness:1,side:THREE.DoubleSide});
 const lava=new THREE.MeshStandardMaterial({color:0xff6014,emissive:0xff3705,emissiveIntensity:2.7,roughness:.7,side:THREE.DoubleSide});
 const hot=new THREE.MeshStandardMaterial({color:0xffc34b,emissive:0xff8111,emissiveIntensity:3.8,side:THREE.DoubleSide});
 const nx=121,ny=81,positions=[],indices=[];
 // x -4.5..4.5, y 0..7.6, z depth 0..2.8. Front toward negative Z.
 // Continuous irregular fracture runs from top to bottom with branches.
 const crackX=y=>-.95+.33*Math.sin(y*.9)+.16*Math.sin(y*2.1);
 const branchX=y=>1.25+.24*Math.sin(y*1.35);
 function width(y){return .16+.09*Math.sin(y*1.6+.4)**2+.06*Math.sin(y*3.4)**2}
 function surface(x,y){
  const macro=.46*Math.sin(x*1.55+y*.44)+.35*Math.cos(x*2.45-y*.75);
  const ridge=.25*Math.sin(x*4.6+y*1.1)+.13*Math.cos(x*9.2-y*2.2);
  const fractured=.12*Math.sin(x*17.3+y*5.6)+.07*Math.cos(x*27.4-y*7.8);
  const stepped=.17*Math.floor(3*Math.sin(x*2.3+y*.56))/3;
  const d=Math.abs(x-crackX(y)),b=Math.abs(x-branchX(y));
  // Carve a true continuous V-shaped depression in the mother-rock surface.
  const mainDepth=1.15*Math.max(0,1-d/(width(y)*2.8));
  const branchDepth=(y>1.2&&y<5.6)?.68*Math.max(0,1-b/.37):0;
  return -.35+macro+ridge+fractured+stepped+mainDepth+branchDepth;
 }
 const index=(i,j)=>j*nx+i;
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const x=-4.5+9*i/(nx-1),y=7.6*j/(ny-1);
  positions.push(x,y,surface(x,y));
 }
 for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
  const a=index(i,j),b=index(i+1,j),c=index(i,j+1),d=index(i+1,j+1);
  indices.push(a,c,b,b,c,d);
 }
 // Close the single surface into a volumetric wall, no separate front layers.
 const frontCount=positions.length/3,backZ=2.3;
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const k=index(i,j);positions.push(positions[3*k],positions[3*k+1],backZ);
 }
 for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
  const a=frontCount+index(i,j),b=frontCount+index(i+1,j),c=frontCount+index(i,j+1),d=frontCount+index(i+1,j+1);
  indices.push(a,b,c,b,d,c);
 }
 function side(a,b,c,d){indices.push(a,b,c,b,d,c)}
 for(let i=0;i<nx-1;i++){
  side(index(i,0),frontCount+index(i,0),index(i+1,0),frontCount+index(i+1,0));
  side(index(i+1,ny-1),frontCount+index(i+1,ny-1),index(i,ny-1),frontCount+index(i,ny-1));
 }
 for(let j=0;j<ny-1;j++){
  side(index(0,j+1),frontCount+index(0,j+1),index(0,j),frontCount+index(0,j));
  side(index(nx-1,j),frontCount+index(nx-1,j),index(nx-1,j+1),frontCount+index(nx-1,j+1));
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
 root.add(new THREE.Mesh(geo,rock));
 // Magma follows the carved valley continuously, below the surrounding rock lips.
 function moltenRibbon(path,halfWidth,material,offset){
  const v=[],tri=[];for(let k=0;k<path.length;k++){
   const [x,y]=path[k],a=path[Math.max(0,k-1)],b=path[Math.min(path.length-1,k+1)];
   const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;
   for(const s of [-1,1]){const px=x-s*dy/l*halfWidth,py=y+s*dx/l*halfWidth;v.push(px,py,surface(px,py)+offset)}
  }
  for(let k=0;k<path.length-1;k++){const a=2*k;tri.push(a,a+2,a+1,a+1,a+2,a+3)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(tri);g.computeVertexNormals();root.add(new THREE.Mesh(g,material));
 }
 const primary=Array.from({length:101},(_,i)=>{const y=i*7.6/100;return [crackX(y),y]});
 moltenRibbon(primary,.12,black,-.075);moltenRibbon(primary,.082,lava,-.045);
 const branch=Array.from({length:65},(_,i)=>{const y=1.2+i*4.4/64;return [branchX(y),y]});
 moltenRibbon(branch,.08,black,-.075);moltenRibbon(branch,.045,lava,-.04);
 // Sparse hot pockets, continuous geometry rather than regularly segmented bars.
 const pockets=[[crackX(1.2),1.2],[crackX(3.9),3.9],[crackX(6.15),6.15]];
 for(const [x,y] of pockets){const o=new THREE.Mesh(new THREE.IcosahedronGeometry(.13,1),hot);o.position.set(x,y,surface(x,y)-.018);o.scale.set(1.1,1.7,.15);root.add(o)}
 root.userData={floor:4,asset:'lava-rockwall',version:8,meshTopology:'single solid mother-rock surface with carved fissures',previousVersionsPreserved:true,status:'review',gameIntegrated:false};
 return root;
}
