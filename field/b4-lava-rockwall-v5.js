import * as THREE from 'three';
import {createB4LavaRockwallV4} from './b4-lava-rockwall-v4.js';
/**
 * V5 reference-sculpted front face.
 * Source: user-provided 736x736 volcanic rock image (2026-11-13).
 * Exactly 100 x 50 = 5000 sampled surface control coordinates.
 * All V4 meshes retained; new meshes are additive, for review only.
 */
export function createB4LavaRockwallV5(){
 const root=createB4LavaRockwallV4({magma:true});root.name='b4:lava-rockwall-v5-reference-5000';
 const rock=new THREE.MeshStandardMaterial({color:0x201d1e,roughness:1,flatShading:true,side:THREE.DoubleSide});
 const rim=new THREE.MeshStandardMaterial({color:0x393033,roughness:1,flatShading:true,side:THREE.DoubleSide});
 const fissure=new THREE.MeshStandardMaterial({color:0x170e11,roughness:1,side:THREE.DoubleSide});
 const lava=new THREE.MeshStandardMaterial({color:0xff5b14,emissive:0xff2a05,emissiveIntensity:3.2,roughness:.55,side:THREE.DoubleSide});
 const hot=new THREE.MeshStandardMaterial({color:0xffc14a,emissive:0xff8a17,emissiveIntensity:4.3,side:THREE.DoubleSide});
 // Normalized silhouette landmarks traced from the image, left-to-right.
 // Source image bounds roughly x=90..615, y=20..705; use x in [-4.5,4.5], heights in meters.
 const silhouette=[[-4.5,1.6],[-4.1,2.5],[-3.8,4.3],[-3.3,4.8],[-2.7,5.15],[-2.25,5.9],[-1.7,6.4],[-1.15,6.85],[-.55,7.25],[.15,7.55],[.65,7.3],[.95,6.65],[1.55,6.8],[2.05,6.35],[2.4,5.4],[2.8,4.7],[3.25,4.1],[3.7,2.95],[4.2,2.5],[4.5,1.5]];
 const interp=x=>{for(let i=1;i<silhouette.length;i++)if(x<=silhouette[i][0]){const [x0,y0]=silhouette[i-1],[x1,y1]=silhouette[i];const t=(x-x0)/(x1-x0);return y0+(y1-y0)*t;}return silhouette[silhouette.length-1][1]};
 const nx=100,ny=50,vertices=[],uv=[],indices=[];
 // Nonrandom multi-scale ridges, long vertical shear fractures, and irregular mother rock.
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const x=-4.5+9*i/(nx-1),v=j/(ny-1),y=.15+v*(interp(x)-.15);
  const longRidge=Math.abs(Math.sin(x*2.7+.55*Math.sin(y*1.9)));
  const fractured=Math.sin(x*8.7+y*1.35)*.13+Math.sin(x*17.2-y*4.3)*.075+Math.cos(y*11.3+x*4.1)*.11;
  const stepped=Math.floor((Math.sin(x*3.4+y*.8)+1)*3)/3;
  const z=3.1+.42*longRidge+.24*stepped+fractured+.11*Math.sin(y*2.2+x*1.3);
  vertices.push(x,y,z);uv.push(i/(nx-1),v);
 }
 for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;indices.push(a,c,b,b,c,d)}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,rock);root.add(mesh);
 // Large dark broken stone slabs. Different sizes, irregular vertical alignment.
 const slabs=[[-2.65,4.15,.92,2.7],[-.95,5.2,1.22,3.3],[.95,4.95,.95,3.6],[2.75,3.05,.85,2.4]];
 for(let k=0;k<slabs.length;k++){const [x,y,w,h]=slabs[k];const slab=new THREE.Mesh(new THREE.DodecahedronGeometry(1,1),k%2?rock:rim);slab.scale.set(w,h/2,.3+k*.06);slab.position.set(x,y,3.65);slab.rotation.z=[-.08,.12,-.14,.07][k];root.add(slab)}
 // Irregular branching lava channels with dark rock lips and variable core widths.
 const paths=[
 [[-.95,7.0],[-.68,6.2],[-.86,5.45],[-.55,4.7],[-.84,4.05],[-.45,3.5],[.05,2.95],[.4,2.2]],
 [[-3.4,3.4],[-2.65,3.28],[-1.95,3.5],[-1.3,3.12],[-.65,2.7],[.05,2.95]],
 [[.4,2.2],[1.05,1.85],[1.7,1.2],[2.45,.72]],
 [[2.7,3.2],[2.48,2.45],[2.65,1.8],[2.45,.72]]
 ];
 function ribbon(points,width,material,z){const vv=[],ii=[];for(let i=0;i<points.length;i++){const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];const dx=next[0]-prev[0],dy=next[1]-prev[1],len=Math.hypot(dx,dy)||1;const w=width*(.8+.27*Math.sin(i*2.1+points.length));for(const s of [-1,1])vv.push(p[0]+s*(-dy/len)*w,p[1]+s*(dx/len)*w,z)}for(let i=0;i<points.length-1;i++){const a=2*i;ii.push(a,a+1,a+2,a+1,a+3,a+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vv,3));g.setIndex(ii);g.computeVertexNormals();root.add(new THREE.Mesh(g,material))}
 for(let i=0;i<paths.length;i++){ribbon(paths[i],i===0?.36:.24,fissure,4.05);ribbon(paths[i],i===0?.23:.14,lava,4.075);if(i===0)ribbon(paths[i].slice(3,7),.065,hot,4.09)}
 // Foot of rock: molten pool bounded by irregular talus; no texture-only plane.
 const pool=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.8,.12,19),lava);pool.position.set(-.6,.14,3.65);pool.scale.z=.55;root.add(pool);
 root.userData={floor:4,asset:'lava-rockwall',version:5,controlCoordinates:5000,reference:'user image 2026-11-13',status:'review',gameIntegrated:false};
 return root;
}
