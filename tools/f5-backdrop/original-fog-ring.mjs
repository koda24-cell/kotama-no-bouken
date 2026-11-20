/** V4: wide, FLAT world-locked abyss vistas, NOT a visible circular cylinder.
 * Preserve original B5 shader. Four 220-unit distant walls surround the map,
 * with large uninterrupted panels instead of narrow strips. Review-only.
 */
import {createB5DistantFogBackground} from '../../field/b5-distant-fog-background.js';
export async function createOriginalB5FogRing(THREE,scene,{radius=145,height=88,seed=514}={}) {
  const group=new THREE.Group();
  group.name='B5_V4_FLAT_ABYSS_VISTAS';
  scene.add(group);
  // Original preview references a PNG absent from development and PR #354.
  // Deterministic emission atlas activates the original irregular-window shader.
  // Review substitute only: not the missing original image.
  const canvas=document.createElement('canvas');
  canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#000';ctx.fillRect(0,0,1024,512);
  let state=55421;
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  for(let block=0;block<42;block++){
    const bx=random()*880,by=random()*400;
    const cols=3+Math.floor(random()*13),rows=2+Math.floor(random()*11);
    const stepX=3+random()*7,stepY=3+random()*9;
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      if(random()<.64)continue;
      const v=110+Math.floor(random()*145);
      ctx.fillStyle='rgb('+v+','+Math.floor(v*(.36+random()*.2))+','+Math.floor(v*(.42+random()*.32))+')';
      ctx.fillRect(bx+x*stepX,by+y*stepY,1+random()*2.5,1+random()*2.7);
    }
  }
  let windowTexture=new THREE.CanvasTexture(canvas);
  let emissionLoaded=false;
  try {
    const emissionStatus=await fetch('/emission-status').then(r=>r.text());
    if(emissionStatus!=='available') throw new Error('Original emission unavailable; render procedural candidate');
    const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src='/facade020c-emission.png';});
    const source=document.createElement('canvas');source.width=1024;source.height=1024;
    source.getContext('2d').drawImage(image,0,0,1024,1024);
    windowTexture.dispose();windowTexture=new THREE.CanvasTexture(source);
    emissionLoaded=true;
  } catch(e){console.warn('Facade020C original emission unavailable; procedural QA fallback',e);}
  document.body.dataset.emissionSource=emissionLoaded?'facade020c-original':'procedural-fallback';
  windowTexture.colorSpace=THREE.SRGBColorSpace;
  windowTexture.wrapS=windowTexture.wrapT=THREE.RepeatWrapping;
  const parts=[];
  const sides=[
    {x:0,z:-radius,ry:0},
    {x:radius,z:0,ry:-Math.PI/2},
    {x:0,z:radius,ry:Math.PI},
    {x:-radius,z:0,ry:Math.PI/2}
  ];
  for(let i=0;i<4;i++){
    const s=sides[i];
    const part=createB5DistantFogBackground({width:radius*2.08,height,seed:seed+i*127,windowTexture});
    part.mesh.position.set(s.x,height*.16,s.z);
    part.mesh.rotation.y=s.ry;
    part.mesh.material.side=THREE.DoubleSide;
    part.mesh.material.depthWrite=false;
    part.mesh.renderOrder=-90;
    part.mesh.name='B5_V4_WIDE_FLAT_VISTA_'+i;
    group.add(part.mesh);
    parts.push(part);
  }
  return {group,update(seconds){for(const p of parts)p.update(seconds)},
    dispose(){for(const p of parts)p.dispose();windowTexture.dispose();group.removeFromParent()}};
}
