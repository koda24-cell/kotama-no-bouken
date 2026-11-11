/* B5 only. Closed war-ruin corridors / Gothic hall. Navigation remains in field.js.
 * Every wall face has a continuous opaque back, including decorative blind bays. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const B5_HEIGHT = { ruin: 6.4, hall: 16 };
const DIRECTIONS = [[0,-1],[1,0],[0,1],[-1,0]];
const TEXTURES = './assets/3d/dungeons/b5_abyssal_star_realm/textures/';

// A shallow bevel catches light on real edges without dense subdivision.
function bevelBox() {
  const p = [], index = [];
  for (const [s,z] of [[1,-0.5],[1,0.42],[0.9,0.5]]) {
    p.push(-s/2,-s/2,z, s/2,-s/2,z, s/2,s/2,z, -s/2,s/2,z);
  }
  index.push(0,2,1,0,3,2,8,9,10,8,10,11);
  for(let ring=0;ring<2;ring++) for(let j=0;j<4;j++) {
    const a=ring*4+j,b=ring*4+(j+1)%4;
    index.push(a,b,b+4,a,b+4,a+4);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(index);
  const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();
  const uv=[];
  const pos=flat.attributes.position,n=flat.attributes.normal;
  for(let i=0;i<pos.count;i++) {
    if(Math.abs(n.getZ(i))>0.6)uv.push(pos.getX(i)+0.5,pos.getY(i)+0.5);
    else if(Math.abs(n.getY(i))>0.6)uv.push(pos.getX(i)+0.5,pos.getZ(i)+0.5);
    else uv.push(pos.getZ(i)+0.5,pos.getY(i)+0.5);
  }
  flat.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return flat;
}

export function planB5Walls({a,ch,wallCell,hash,CELL=4,hall}) {
  const faces=[];
  for(let ty=0;ty<a.h;ty++)for(let tx=0;tx<a.w;tx++) {
    if(wallCell(tx,ty))continue;
    for(const [dx,dz]of DIRECTIONS)if(wallCell(tx+dx,ty+dz)) {
      const reserved=a.objects.some(o=>Math.abs(o.tx-(tx+dx))<=1&&Math.abs(o.ty-(ty+dz))<=1);
      // A blind niche is a recess in the solid wall cell, never an opening.
      const niche=!reserved&&ch(tx+dx,ty+dz)==='#'&&hash(tx,ty,590+dx+dz*4)<(hall?0.46:0.22);
      faces.push({tx,ty,dx,dz,x:tx*CELL+dx*CELL/2,z:ty*CELL+dz*CELL/2,
        yaw:Math.atan2(-dx,-dz),niche,wallX:tx+dx,wallY:ty+dz});
    }
  }
  return faces;
}

export function createB5Architecture({root,a,ch,wallCell,hash,CELL=4,hall,g}) {
  const group=new THREE.Group();group.name='b5:architecture';group.userData.visualOnly=true;root.add(group);
  const H=hall?B5_HEIGHT.hall:B5_HEIGHT.ruin;
  const geometries=[],materials=[],textures=[],lights=[],batches=new Map(),detailChunks=[];
  const geo=x=>(geometries.push(x),x),mat=x=>(materials.push(x),x);
  const loader=new THREE.TextureLoader();
  let environment=null,previousEnvironment=null,previousEnvironmentIntensity=1;
  if(g?.high && g?.renderer && g?.scene) {
    const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(g.renderer);
    environment=pmrem.fromScene(room,0.04);room.dispose();pmrem.dispose();
    previousEnvironment=g.scene.environment;previousEnvironmentIntensity=g.scene.environmentIntensity;
    g.scene.environment=environment.texture;g.scene.environmentIntensity=hall?0.26:0.2;
  }
  function surface(key,color=0xffffff,metalness=0) {
    const load=(suffix,srgb=false)=>{const t=loader.load(TEXTURES+key+'_'+suffix+'.png');t.flipY=false;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;textures.push(t);return t;};
    const orm=load('orm');
    return mat(new THREE.MeshStandardMaterial({color,map:load('albedo',true),normalMap:load('normal'),
      roughnessMap:orm,metalnessMap:metalness?orm:null,aoMap:orm,aoMapIntensity:0.8,roughness:1,metalness,
      normalScale:new THREE.Vector2(0.75,0.75)}));
  }
  const stone=surface(hall?'b5_ashlar':'b5_basalt',hall?0xc6c0b6:0xb4bfd0);
  const floor=surface('b5_paving',hall?0xc5bdb0:0xa3acbb);
  const iron=surface('b5_iron',0xc1b8a7,1);
  const fabric=hall?surface('b5_cloth'):null;
  const dark=mat(new THREE.MeshStandardMaterial({color:hall?0x39383f:0x272f3b,roughness:0.94}));
  const bronze=mat(new THREE.MeshStandardMaterial({color:0x89724e,roughness:0.48,metalness:0.65}));
  const glow=mat(new THREE.MeshStandardMaterial({color:hall?0xffd39a:0x91bdcd,emissive:hall?0xff9f43:0x6095bf,emissiveIntensity:1.7,roughness:0.32}));
  const box=geo(new THREE.BoxGeometry(1,1,1)),bevel=geo(bevelBox());
  const chipped=geo(bevel.clone());
  { const p=chipped.attributes.position;for(let i=0;i<p.count;i++)if(p.getX(i)>0.35&&p.getY(i)>0.35){p.setX(i,p.getX(i)-0.18);p.setY(i,p.getY(i)-0.12);}p.needsUpdate=true;chipped.computeVertexNormals(); }
  const cylinder=geo(new THREE.CylinderGeometry(0.5,0.5,1,10));
  const bolt=geo(new THREE.SphereGeometry(0.5,6,4));
  const flame=geo(new THREE.ConeGeometry(0.5,1,6));
  const dummy=new THREE.Object3D(),faceMatrix=new THREE.Matrix4();
  const faceQ=new THREE.Quaternion();
  function add(shape,material,x,y,z,sx,sy,sz,ry=0,rz=0,face=null) {
    dummy.position.set(x,y,z);dummy.rotation.set(0,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();
    const matrix=dummy.matrix.clone();if(face){faceQ.setFromAxisAngle(new THREE.Vector3(0,1,0),face.yaw);faceMatrix.compose(new THREE.Vector3(face.x,0,face.z),faceQ,new THREE.Vector3(1,1,1));matrix.premultiply(faceMatrix);}
    const chunk=material===dark?'backing':Math.floor(matrix.elements[12]/12)+','+Math.floor(matrix.elements[14]/12);
    const key=shape.uuid+material.uuid+chunk;if(!batches.has(key))batches.set(key,{shape,material,chunk,matrices:[]});batches.get(key).matrices.push(matrix);
  }
  const faces=planB5Walls({a,ch,wallCell,hash,CELL,hall});
  function local(face,shape,material,x,y,z,sx,sy,sz,ry=0,rz=0){add(shape,material,x,y,z,sx,sy,sz,ry,rz,face);}
  function rib(face,y) {
    // Pointed rib built from short voussoirs; its solid wall backing is separate.
    for(let side of [-1,1])for(let i=0;i<7;i++) {
      const t=(i+0.5)/7, x=side*(1.76*(1-t)), yy=y+Math.sin(t*Math.PI/2)*1.25;
      local(face,bevel,stone,x,yy,0.1,0.42,0.26,0.28,0,side*0.55);
    }
  }
  for(const face of faces) {
    // Continuous cap from below the floor all the way into the roof. Untextured
    // opaque geometry ensures neither mortar seams nor recesses reveal neighbours.
    local(face,box,dark,0,H/2-0.03,face.niche?-1.28:-0.35,4.08,H+0.22,0.36);
    const n=face.niche,top=n?(hall?12.4:3.5):0;
    if(n) {
      local(face,bevel,stone,0,top/2,-1.12,2.6,top-0.24,0.08);
      local(face,box,stone,-1.65,top/2,-0.64,0.72,top,1.35);
      local(face,box,stone,1.65,top/2,-0.64,0.72,top,1.35);
      local(face,box,stone,0,0.13,-0.64,3.4,0.26,1.35);
      local(face,box,stone,0,top+0.15,-0.64,3.4,0.3,1.35);
    }
    const rows=hall?10:5;
    for(let r=0;r<rows;r++)for(let c=0;c<2;c++) {
      const y=(r+0.5)*H/rows;
      if(n&&y<top+0.32)continue;
      const k=hash(face.tx*11+c,face.ty*13+r,601);
      local(face,k>.6?chipped:bevel,stone,(c-0.5)*1.95,y,-0.04-k*0.025,1.9,H/rows-0.045,0.34);
    }
    // Skirting, impost and cornice give real depth and a readable wall scale.
    for(const [y,sy,depth] of [[0.24,0.3,0.26],[hall?3.4:3.75,0.18,0.24],[H-0.22,0.35,0.38]])
      local(face,bevel,hall?stone:iron,0,y,0.1,4.03,sy,depth);
    for(const x of [-1.88,1.88]) {
      local(face,bevel,hall?stone:iron,x,H/2,0.12,0.26,H,0.36);
      if(hall)for(const xx of [-0.1,0.1])local(face,cylinder,stone,x+xx,6,0.31,0.15,11.5,0.15);
    }
    if(hall) {rib(face,12.3);rib(face,3.8);}
    else {
      // Layered, displaced armour is deliberately architectural, not crystal ore.
      if(!n)for(let i=0;i<3;i++) {
        const y=0.9+i*1.4,tilt=(hash(face.tx,face.ty,610+i)-0.5)*0.09;
        local(face,bevel,iron,0,y,0.09,3.4,0.42,0.2,0,tilt);
        for(const x of [-1.47,1.47])local(face,bolt,bronze,x,y,0.22,0.095,0.095,0.07);
      }
      // Recessed diagonal blast scar: solid dark base remains behind each piece.
      if(!n&&hash(face.tx,face.ty,620)<0.32)for(let i=0;i<4;i++)local(face,bevel,dark,-0.9+i*0.53,1.15+i*0.36,0.145,0.65,0.09,0.08,0,0.59);
    }
    // Sparse practical lamps. Reuse the game's bounded nearest-light pool.
    if(n || ((face.tx+face.ty)%3===0 && (face.dx>0 || face.dz>0 || hash(face.tx,face.ty,630)<0.2))) {
      const xx=n?1.58:0,yy=hall?2.8:2.4;
      local(face,bevel,iron,xx,yy,-0.02,0.42,0.95,0.27);
      if(hall) {
        local(face,bevel,bronze,xx,yy-0.38,0.34,0.5,0.1,0.58);
        for(const offset of [-0.16,0.16]) {
          local(face,cylinder,stone,xx+offset,yy-0.04,0.42,0.1,0.64,0.1);
          local(face,flame,glow,xx+offset,yy+0.42,0.42,0.17,0.36,0.17);
        }
      } else {
        local(face,cylinder,bronze,xx,yy,0.2,0.21,0.72,0.21);
        local(face,cylinder,glow,xx,yy+0.03,0.25,0.12,0.36,0.12);
        for(const y of [-0.38,0.38])local(face,bevel,iron,xx,yy+y,0.23,0.4,0.12,0.36);
      }
      const world=new THREE.Vector3(xx,yy,0.48).applyAxisAngle(new THREE.Vector3(0,1,0),face.yaw).add(new THREE.Vector3(face.x,0,face.z));
      const L={world,color:hall?0xffbd7d:0x9fcce6,intensity:1.15,range:5.5,off:false};lights.push(L);g?.lights.push(L);
    }
  }
  // Closed, coffered roof and readable stone floor, with only shallow bevels.
  for(let ty=0;ty<a.h;ty++)for(let tx=0;tx<a.w;tx++)if(!wallCell(tx,ty)) {
    const x=tx*CELL,z=ty*CELL;
    add(box,dark,x,-0.22,z,4.02,0.32,4.02);
    add(box,dark,x,H+0.12,z,4.06,0.3,4.06);
    add(box,stone,x,H+0.04,z,3.78,0.2,3.78);
    // Individual fitted slabs catch low grazing light without uneven walk heights.
    for(let i=0;i<4;i++) {
      const xx=x+(i%2?0.99:-0.99),zz=z+(i<2?-0.99:0.99);
      add(bevel,floor,xx,-0.065,zz,1.94,0.11,1.94,(hash(tx,ty,650+i)>.5?Math.PI:0));
    }
    for(const offset of [-1.83,1.83]) {
      add(bevel,hall?stone:iron,x+offset,H-0.18,z,0.2,0.28,4);
      add(bevel,hall?stone:iron,x,H-0.18,z+offset,4,0.28,0.2);
    }
    if(hall&&ch(tx,ty)===',') {
      // Existing marked approach gets an inlaid border, not a new path or event.
      add(box,bronze,x-1.5,0.003,z,0.035,0.012,3.9);
      add(box,bronze,x+1.5,0.003,z,0.035,0.012,3.9);
    }
  }
  // Cross ribs overhead create distance cues comparable to B1's vaults.
  const walk=(x,y)=>!wallCell(x,y);
  for(let ty=1;ty<a.h-1;ty++)for(let tx=1;tx<a.w-1;tx++) {
    if(!walk(tx,ty)||hash(tx,ty,659)>.34)continue;
    const acrossX=wallCell(tx-1,ty)&&wallCell(tx+1,ty),acrossZ=wallCell(tx,ty-1)&&wallCell(tx,ty+1);
    if(!acrossX&&!acrossZ)continue;
    const f={x:tx*CELL,z:ty*CELL,yaw:acrossX?0:Math.PI/2};
    if(hall)rib(f,H-1.7);
    else { local(f,bevel,iron,0,H-0.52,0,3.9,0.22,0.44,0,0.035);for(let x of [-1.7,1.7])local(f,bevel,iron,x,H-0.55,0,0.24,0.55,0.48); }
  }
  function flush() {
    for(const {shape,material,chunk,matrices}of batches.values()) {
      const mesh=new THREE.InstancedMesh(shape,material,matrices.length);
      matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;
      mesh.name='b5:structure:'+ (material===glow?'lamp':material===floor?'paving':'solid');mesh.computeBoundingSphere();group.add(mesh);
      if(chunk!=='backing')detailChunks.push(mesh);
    }
    batches.clear();
  }
  flush();
  // Exit portal replaces the forest-root model only in B5. It is still the same
  // interactive exit cell. Keep the walkable centre and original key untouched.
  function exitPortal(x,z,yaw) {
    const portal=new THREE.Group();portal.name='b5:exit-portal';portal.position.set(x,0,z);portal.rotation.y=yaw;group.add(portal);
    for(const side of [-1,1]) {
      const m=new THREE.Mesh(bevel,stone);m.position.set(side*1.62,1.55,0);m.scale.set(0.48,3.1,0.65);portal.add(m);
    }
    const lintel=new THREE.Mesh(bevel,iron);lintel.position.y=3.18;lintel.scale.set(3.7,0.45,0.8);portal.add(lintel);return portal;
  }
  function wallKnight(id,x,z,yaw) {
    const statue=new THREE.Group();statue.name='b5:knight-relief:'+id;statue.position.set(x,0,z);statue.rotation.y=yaw;group.add(statue);
    const part=(shape,material,x,y,z,sx,sy,sz,rz=0)=>{const m=new THREE.Mesh(shape,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.z=rz;statue.add(m);return m;};
    part(bevel,stone,0,0.14,0,1.26,0.28,0.36);
    for(const side of [-1,1]) {
      part(cylinder,stone,side*0.19,0.58,0.05,0.27,0.69,0.27);
      part(bevel,stone,side*0.19,0.3,0.13,0.3,0.16,0.4);
      part(bolt,iron,side*0.19,0.81,0.18,0.3,0.25,0.16);
      part(bolt,iron,side*0.39,1.52,0.09,0.38,0.3,0.32,side*0.2);
      part(cylinder,stone,side*0.47,1.18,0.14,0.16,0.56,0.16);
    }
    part(cylinder,stone,0,1.28,0.07,0.65,0.72,0.4);
    part(bevel,iron,0,1.07,0.25,0.66,0.12,0.08);
    part(cylinder,stone,0,1.92,0.08,0.44,0.43,0.4);
    part(bolt,iron,0,2.11,0.08,0.43,0.16,0.39);
    part(bevel,dark,0,1.95,0.275,0.3,0.045,0.025);
    if(id.includes('shield'))part(bevel,iron,-0.48,1.08,0.29,0.45,0.76,0.14,-0.08);
    else if(id.includes('bow')) {
      for(let i=0;i<5;i++)part(cylinder,iron,0.62+Math.sin(i*Math.PI/4)*0.18,0.75+i*0.23,0.26,0.055,0.32,0.055,(i-2)*0.3);
      part(cylinder,bronze,0.62,1.21,0.26,0.025,1.05,0.025);
    } else {
      const staff=id.includes('staff');
      part(cylinder,iron,0.6,1.23,0.24,staff?0.07:0.13,staff?1.7:1.35,0.07);
      if(staff)part(bolt,bronze,0.6,2.18,0.24,0.24,0.24,0.16);
      else part(bevel,bronze,0.6,0.94,0.26,0.4,0.09,0.12);
    }
    statue.userData.lights=[];return statue;
  }
  let disposed=false;
  return {group,faces,H,stone,iron,fabric,exitPortal,wallKnight,
    updateVisibility(camera){for(const mesh of detailChunks){const c=mesh.boundingSphere.center;mesh.visible=Math.hypot(c.x-camera.x,c.z-camera.z)<(hall?44:24)+mesh.boundingSphere.radius;}},
    info:()=>({height:H,opaqueFaces:faces.length,niches:faces.filter(f=>f.niche),materials:'512px albedo / normal / ORM',reflections:!!environment,batches:group.children.filter(o=>o.isInstancedMesh).length}),
    dispose(){if(disposed)return;disposed=true;if(environment){if(g.scene.environment===environment.texture){g.scene.environment=previousEnvironment;g.scene.environmentIntensity=previousEnvironmentIntensity;}environment.dispose();}lights.forEach(l=>l.off=true);group.traverse(o=>{if(o.isInstancedMesh)o.dispose()});group.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
  };
}
