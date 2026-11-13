import * as THREE from 'three';
// Standalone B4 cave-wall prototype. Never auto-integrated into game.
export function createB4LavaRockwall(){
 const root=new THREE.Group();root.name='b4:lava-rockwall-v1';
 const stone=[0x282528,0x383034,0x47383a,0x201f23].map(color=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));
 const hot=new THREE.MeshStandardMaterial({color:0xff4d13,emissive:0xff2800,emissiveIntensity:2,roughness:.8});
 const ash=new THREE.MeshStandardMaterial({color:0x17191b,roughness:1});
 let seed=4102;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const shard=(x,y,z,sx,sy,sz,mat,tilt=0)=>{
  const g=new THREE.IcosahedronGeometry(1,0);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const k=0.83+rnd()*.3;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k,p.getZ(i)*k)}
  g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set((rnd()-.5)*.28,tilt,(rnd()-.5)*.28);root.add(m);return m;
 };
 // Broad 8m-wide rock wall with varied buttresses and a deep central overhang.
 for(let i=0;i<34;i++){const x=-4+(i%9)*1.01+(rnd()-.5)*.3,y=.65+Math.floor(i/9)*1.38+(rnd()-.5)*.5,z=(rnd()-.5)*.65;shard(x,y,z,.65+rnd()*.48,.8+rnd()*.65,.55+rnd()*.55,stone[i%stone.length],(rnd()-.5)*.55)}
 for(let i=0;i<12;i++){const x=-3.8+rnd()*7.6;shard(x,4.2+rnd()*1.1,-.4+rnd()*.5,.7+rnd()*.7,.5+rnd()*.7,.9+rnd()*.8,stone[(i+1)%4],(rnd()-.5)*.6)}
 // Jagged broken basalt slabs projecting into the path.
 for(let i=0;i<10;i++){const x=-3.5+rnd()*7;shard(x,.42+rnd()*.45,1.05+rnd()*.95,.35+rnd()*.55,.4+rnd()*.9,.5+rnd()*.65,stone[i%4],(rnd()-.5)*.8)}
 // Recessed glowing seams, irregular tapered branches; visible at normal gameplay distance.
 const crackPts=[[-3.05,3.95,.76],[-2.65,3.15,.94],[-2.85,2.25,1.02],[-2.18,1.55,1.08],[-1.75,.65,1.12]];
 const crack2=[[1.6,4.5,.77],[1.28,3.5,1.04],[1.8,2.65,1.08],[2.25,1.8,1.09],[2.05,.9,1.11]];
 const segment=(a,b,r,material)=>{const v1=new THREE.Vector3(...a),v2=new THREE.Vector3(...b),d=new THREE.Vector3().subVectors(v2,v1);const m=new THREE.Mesh(new THREE.CylinderGeometry(r*.55,r,d.length(),6),material);m.position.copy(v1).add(v2).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());root.add(m)};
 for(const path of [crackPts,crack2])for(let i=1;i<path.length;i++){segment(path[i-1],path[i],.075+i*.009,hot);segment([path[i-1][0]+.11,path[i-1][1],path[i-1][2]-.1],[path[i][0]+.11,path[i][1],path[i][2]-.1],.09,ash)}
 // Falling fractured slabs at the foot of the wall, not repeated round boulders.
 for(let i=0;i<14;i++)shard(-3.8+rnd()*7.6,.15+rnd()*.18,1+rnd()*1.5,.22+rnd()*.52,.12+rnd()*.25,.28+rnd()*.45,stone[i%4],rnd()*2);
 root.userData={floor:4,asset:'lava-rockwall',status:'prototype',gameIntegrated:false};return root;
}
