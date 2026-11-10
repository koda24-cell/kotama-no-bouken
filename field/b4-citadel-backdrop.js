/* Fourth stratum: distant volcanic citadel and lava bridges.
 * Decorative scenery only. Everything is outside the authoritative tile map.
 */
import * as THREE from 'three';
export function addB4CitadelBackdrop({root,area,map,cellSize,anchor}) {
  if(area!==4 || !root || !map || !map.w || !map.h)return 0;
  const group=new THREE.Group();group.name='b4:citadel-backdrop';
  const stone=new THREE.MeshStandardMaterial({color:0x62535a,roughness:1,flatShading:true});
  const ledge=new THREE.MeshStandardMaterial({color:0x81604f,roughness:0.94,flatShading:true});
  const magma=new THREE.MeshStandardMaterial({color:0xff4517,emissive:0xe92a04,emissiveIntensity:1.6,roughness:0.4});
  const dark=new THREE.MeshStandardMaterial({color:0x33262c,roughness:1});
  const windowGlow=new THREE.MeshStandardMaterial({color:0xffc174,emissive:0xff871e,emissiveIntensity:2.1,roughness:.8});
  const box=new THREE.BoxGeometry(1,1,1);
  const tower=new THREE.CylinderGeometry(0.78,1.05,1,8);
  const roof=new THREE.ConeGeometry(1,1,8);
  const arch=new THREE.TorusGeometry(1,0.14,5,12,Math.PI);
  const dome=new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2);
  const cliff=new THREE.IcosahedronGeometry(1,0);
  const geometries=[box,tower,roof,arch,dome,cliff],materials=[stone,ledge,magma,dark,windowGlow];
  const put=(geo,mat,x,y,z,sx,sy,sz,rz=0)=>{
    const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.z=rz;group.add(o);return o;
  };
  const w=map.w*cellSize,h=map.h*cellSize;
  // Stage sits beyond the northern edge: no scenery overlaps walkable cells.
  const z=-cellSize*4.5;
  const cx=(w-cellSize)/2;
  const width=Math.min(Math.max(w*0.65,16),64);
  const baseH=6;
  // Original procedural ash sky: warm backlight reads the distant architecture
  // without adding lights or importing vegetation/colours from the forest stratum.
  const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=256;
  const skyCtx=skyCanvas.getContext('2d'),skyPixels=skyCtx.createImageData(512,256);
  const lattice=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  const noise=(x,y)=>{
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
    const a=lattice(ix,iy)*(1-u)+lattice(ix+1,iy)*u,b=lattice(ix,iy+1)*(1-u)+lattice(ix+1,iy+1)*u;return a*(1-v)+b*v;
  };
  for(let y=0;y<256;y++)for(let x=0;x<512;x++){
    const u=x/512,v=y/256,glow=Math.exp(-Math.pow((u-.5)/.48,2)-Math.pow((v-.78)/.43,2));
    const cloud=noise(x*.009,y*.032)*.6+noise(x*.021,y*.071)*.28+noise(x*.053,y*.14)*.12;
    const soot=THREE.MathUtils.smoothstep(cloud,.34,.76)*.65;
    const ridge=v>.87+Math.sin(u*16)*.025+noise(u*13,2)*.075 ? .28 : 1;
    const i=(y*512+x)*4;
    skyPixels.data[i]=(23+125*glow*(1-soot))*ridge;
    skyPixels.data[i+1]=(18+41*glow*(1-soot))*ridge;
    skyPixels.data[i+2]=(22+17*glow*(1-soot))*ridge;skyPixels.data[i+3]=255;
  }
  skyCtx.putImageData(skyPixels,0,0);
  const skyTexture=new THREE.CanvasTexture(skyCanvas);skyTexture.colorSpace=THREE.SRGBColorSpace;
  const skyGeo=new THREE.PlaneGeometry(150,65),skyMat=new THREE.MeshBasicMaterial({map:skyTexture,depthWrite:false,fog:false,toneMapped:false});
  const sky=new THREE.Mesh(skyGeo,skyMat);sky.position.set(cx,12,z-14);sky.name='b4:ash-sky';group.add(sky);
  geometries.push(skyGeo);materials.push(skyMat);
  put(box,stone,cx,baseH/2,z,width,baseH,7);
  put(box,ledge,cx,baseH,z,width+1,0.65,7.6);
  put(box,dark,cx,baseH+2,z,width*0.46,4,5);
  put(box,stone,cx,baseH+4.3,z,width*0.49,0.6,5.5);
  // Buttressed curtain walls, battlements and recessed arched facade bays.
  for(let i=0;i<15;i++){
    const x=cx-width*.48+i*width*.068;
    put(box,ledge,x,2.8,z+3.75,.46,5.6,.8,(i%3-1)*.014);
    if(i!==3 && i!==11)put(box,stone,x,6.7,z+3.4,.72,.9,1.0);
    if(i%2===0){
      put(arch,ledge,x,4.1,z+3.58,.85,1.4,.6);
      put(box,windowGlow,x,3.8,z+3.62,.16,.8,.04);
    }
  }
  // Distinct height rhythm: two bastions, tall keep, and narrow distant spires.
  const offsets=[-0.47,-0.30,0.025,0.26,0.48];
  const heights=[10,14,23,17,9];
  for(let i=0;i<offsets.length;i++){
    const x=cx+offsets[i]*width,y=heights[i],radius=i===2?2.25:1.4;
    put(tower,stone,x,y/2,z,radius,y,radius);
    put(tower,ledge,x,y-0.45,z,radius*1.18,0.8,radius*1.18);
    put(roof,dark,x,y+2.3,z,radius*1.5,4.8,radius*1.5,(i-2)*.035);
    put(box,magma,x,y*0.55,z+radius*0.86,0.3,0.8,0.12);
    for(const dx of [-1,1])put(box,stone,x+dx*radius*0.73,y+0.35,z,0.35,0.8,0.6);
    // Buttresses and lantern-like slit windows give each tower a readable scale.
    for(const side of [-1,1]){
      put(box,ledge,x+side*radius*.7,y*.28,z+radius*.68,.28,y*.56,.42,side*.04);
      for(let row=0;row<3;row++)put(box,windowGlow,x+side*radius*.31,4+row*(y-5)/3,z+radius*.98,.12,.62,.06);
    }
    if(i===1||i===3){
      put(dome,ledge,x+radius*1.8,y*.48,z+1.0,radius*1.5,radius*1.2,radius*1.5);
      put(tower,stone,x+radius*1.8,y*.24,z+1.0,radius*1.5,y*.48,radius*1.5);
    }
  }
  // Two broken elevated viaducts, deliberately on the far side of the map.
  for(const side of [-1,1]){
    const start=cx+side*width*0.32;
    // Missing central deck and a tipped broken end read as damage at game distance.
    put(box,stone,start+side*1.5,4.3,z+5,3.3,0.8,2.1);
    put(box,stone,start+side*6.7,4.0,z+5,3.0,0.8,2.1,side*.16);
    for(let i=0;i<3;i++){
      const x=start+side*(i*3+0.6);
      put(box,stone,x,2.0,z+5,0.7,3.9,1.7);
      put(arch,ledge,x+side*1.5,3.3,z+5,1.2,1.2,1.0);
    }
  }
  // A low lava terrace reinforces the glowing horizon without dynamic lights.
  put(box,magma,cx,-0.12,z+7,width+20,0.13,2.6);
  put(box,stone,cx,0.2,z+9,width+20,0.7,1.1);
  // Volcanic island foundations, stepped lava falls and suspended broken skybridges.
  for(let i=0;i<14;i++){
    const x=cx-width*.6+i*width*.09,scale=2.4+(i%4)*.8;
    put(cliff,stone,x,-1.2-(i%3)*.45,z+2.5,scale,3.7+(i%4),3.3,(i%3-1)*.18);
    if(i%4===1){
      put(box,magma,x,-2.7,z+6.4,.45,5.8,.18,(i%3-1)*.06);
      put(box,magma,x+.35,-5.4,z+6.7,1.4,.15,1.3);
    }
  }
  for(const side of [-1,1]){
    const x=cx+side*width*.26;
    put(box,stone,x,10.3,z+1.8,width*.21,.55,1.25,side*.03);
    for(let i=0;i<4;i++)put(box,dark,x+(i-1.5)*2.5,12.0,z+2.2,.07,3.4,.07,side*.04);
  }
  group.userData.disposeFortress=()=>{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());skyTexture.dispose();};
  if (anchor) {
    // Fit the authored skyline into the 48m camera range, below the cave roof sightline.
    group.scale.setScalar(.65);
    group.position.set(anchor.x-cx*.65,-5,anchor.z-z*.65);
  }
  root.add(group);
  return group.children.length;
}
