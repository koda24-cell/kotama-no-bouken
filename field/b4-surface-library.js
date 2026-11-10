/* Existing B4 PBR maps plus original procedural charred timber. B4-only ownership. */
import * as THREE from 'three';
const BASE='./assets/3d/dungeons/b4_dragonfire/textures/';

export function createB4SurfaceLibrary({high=true}={}) {
  const loader=new THREE.TextureLoader(), textures=new Set(), materials=new Set(), pending=[];
  const load=(file,color=false,repeat=1)=>{
    let resolve,reject; pending.push(new Promise((yes,no)=>{resolve=yes;reject=no;}));
    const t=loader.load(BASE+file,texture=>{
      // Mobile/low quality keeps the same maps at half resolution (1/4 texel memory).
      if(!high && texture.image.width>512){
        const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
        canvas.getContext('2d').drawImage(texture.image,0,0,512,512);texture.image=canvas;texture.needsUpdate=true;
      }
      resolve(texture);
    },undefined,reject);
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.setScalar(repeat);t.anisotropy=4;
    if(color)t.colorSpace=THREE.SRGBColorSpace;textures.add(t);return t;
  };
  const material=(name,settings)=>{
    const m=new THREE.MeshStandardMaterial(settings);m.name='b4:'+name;
    m.userData.b4SurfaceShared=true;materials.add(m);return m;
  };
  const basaltMap=load('volcanic_basalt_albedo.png',true,1.2);
  const basaltNormal=load('volcanic_basalt_normal.png',false,1.2);
  const basaltRough=load('volcanic_basalt_roughness.png',false,1.2);
  const ashMap=load('ashen_stone_albedo.png',true),ashNormal=load('ashen_stone_normal.png'),ashRough=load('ashen_stone_roughness.png');
  const metalMap=load('blackened_bronze_albedo.png',true),metalNormal=load('blackened_bronze_normal.png'),metalRough=load('blackened_bronze_roughness.png');
  const lavaMap=load('molten_lava_albedo.png',true),lavaNormal=load('molten_lava_normal.png'),lavaRough=load('molten_lava_roughness.png'),lavaGlow=load('molten_lava_emissive.png',true);
  const basalt=material('basalt',{map:basaltMap,normalMap:basaltNormal,normalScale:new THREE.Vector2(.8,.8),roughnessMap:basaltRough,roughness:1,color:0xffffff,flatShading:true});
  const ash=material('ash-stone',{map:ashMap,normalMap:ashNormal,normalScale:new THREE.Vector2(.65,.65),roughnessMap:ashRough,roughness:1,color:0xffffff});
  const ceiling=material('basalt-ceiling',{map:basaltMap,normalMap:basaltNormal,normalScale:new THREE.Vector2(.6,.6),roughnessMap:basaltRough,roughness:1,color:0xc2b8b0,side:THREE.DoubleSide});
  const iron=material('blackened-bronze',{map:metalMap,normalMap:metalNormal,roughnessMap:metalRough,roughness:.9,metalness:.3,color:0xd4cfca});
  const ore=material('copper-ore',{map:ashMap,normalMap:ashNormal,roughness:.9,metalness:0.02,color:0xe7b888,flatShading:true});
  const crystal=material('ember-crystal',{map:metalMap,normalMap:metalNormal,roughness:.35,metalness:.22,color:0xb85024,emissive:0xa52c08,emissiveIntensity:.45});
  const lava=material('flowing-lava',{map:lavaMap,normalMap:lavaNormal,normalScale:new THREE.Vector2(.6,.6),roughnessMap:lavaRough,roughness:.7,emissive:0xffffff,emissiveMap:lavaGlow,emissiveIntensity:1.25});
  const ember=material('ember-seams',{color:0xf49646,emissive:0xff4b09,emissiveIntensity:1.6,roughness:1});
  const timberCanvas=document.createElement('canvas');timberCanvas.width=timberCanvas.height=256;
  const ctx=timberCanvas.getContext('2d'),data=ctx.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const grain=Math.sin(x*.41+Math.sin(y*.027)*1.7)+Math.sin(x*1.7+y*.015)*.32;
    const split=Math.pow(Math.abs(Math.sin(x*.074+Math.sin(y*.023)*.18)),26);
    const v=76+grain*7-split*38+Math.sin(x*3.7+y*5.3)*3,i=(y*256+x)*4;
    data.data[i]=v*1.12;data.data[i+1]=v*.79;data.data[i+2]=v*.53;data.data[i+3]=255;
  }
  ctx.putImageData(data,0,0);const woodMap=new THREE.CanvasTexture(timberCanvas);
  woodMap.wrapS=woodMap.wrapT=THREE.RepeatWrapping;woodMap.colorSpace=THREE.SRGBColorSpace;textures.add(woodMap);
  const wood=material('charred-timber',{map:woodMap,bumpMap:woodMap,bumpScale:.012,roughness:1,color:0xffffff});
  const rope=material('old-rope',{map:woodMap,roughness:1,color:0xb9a48b});
  const palette=new Map([
    [0x443330,basalt],[0x51413b,iron],[0x493329,wood],[0x4a4547,iron],[0x302824,basalt],[0x79604b,rope],
    [0x3d2824,wood],[0x383b3c,iron],[0x675049,ore],[0x211b20,basalt],[0x46302a,ash],
    [0x62535a,ash],[0x81604f,ash],[0x33262c,iron],[0x30272b,basalt],[0x4c3230,ash],[0x9e4933,crystal]
  ]);
  function apply(group) {
    const replaced=new Set();
    group.traverse(o=>{
      if(!o.isMesh || Array.isArray(o.material) || o.material.userData.b4SurfaceShared)return;
      const replacement=palette.get(o.material.color?.getHex());
      if(replacement){replaced.add(o.material);o.material=replacement;}
    });
    replaced.forEach(m=>m.dispose());
  }
  let disposed=false;
  return {basalt,ash,ceiling,iron,ore,crystal,lava,ember,wood,rope,materials,textures,apply,
    ready:Promise.all(pending),
    tick(now){const seconds=now*.001;lavaMap.offset.y=lavaGlow.offset.y=lavaNormal.offset.y=lavaRough.offset.y=seconds*.018;lava.emissiveIntensity=1.1+Math.sin(seconds*.8)*.12;},
    dispose(){if(disposed)return;disposed=true;materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
  };
}
