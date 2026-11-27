/* Trial city: closed building volumes, genuine elevation and connected industrial fabric. */
import * as THREE from 'three';
import {loadIndustrialAssets} from './b3-industrial-assets.js';
import {createCitySurfaces} from './b3-industrial-surfaces.js';
import {retainFirstLayerSource} from './field-3d-b1-sacred-trial.js';
import {grassCutoutMaterialV6} from './f1-grass-cutout-lighting-v6.js';
import {createCityV3Water,createCityV3LightShafts} from './f3-city-v3-vfx.js';

export function createTheme(api){
 const {g,CELL,DIR_VEC,DIR_ORDER,FACE_YAW,place,load,npcFile,FILES}=api;
 const env={background:0xb9c5c2,fog:{color:0xb9c5c2,density:.027},hemi:{sky:0xe2e6dd,ground:0x435044,high:1.3,low:1.4}};
 let root,bundle,finish,plan,sun,water,shafts,stats={},geometry=[],materials=[],batches=[],grassHeld=[],oldFar=g.camera.far;
 let oldShadow=null,lastShadow='',wind={value:0},windShaders=[],hardBounds=[];
 let boxes,cylinder;
 const modelCache=new Map(),heldPointLights=g.pool.slice(g.high?4:2);
 const hash=(x,z,s=1)=>{let n=Math.imul(x+s*53,374761393)^Math.imul(z+s*71,668265263);n=Math.imul(n^n>>>13,1274126177);return((n^n>>>16)>>>0)/4294967296;};
 const geo=o=>(geometry.push(o),o),mat=o=>(materials.push(o),o);
 function box(name,m,x,y,z,sx,sy,sz,ry=0){const o=new THREE.Mesh(boxes,m);o.name=name;o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.y=ry;root.add(o);return o;}
 function beam(name,m,a,b,w=.16,d=.16){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),o=box(name,m,0,0,0,w,d,start.distanceTo(end));o.position.copy(start).add(end).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),end.sub(start).normalize());return o;}
 function pipe(name,m,a,b,r=.025){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),o=new THREE.Mesh(cylinder,m);o.name=name;o.position.copy(start).add(end).multiplyScalar(.5);o.scale.set(r,start.distanceTo(end),r);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());root.add(o);return o;}
 function model(id,x,y,z,{ry=0,scale=1,maxWidth=null,maxDepth=null,ground=true}={}){
  if(!bundle.models.has(id))return null;
  const holder=new THREE.Group(),o=bundle.models.get(id).clone(true);o.rotation.y=ry;holder.add(o);
  const b=new THREE.Box3().setFromObject(holder),size=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());
  if(maxWidth)scale=Math.min(scale,maxWidth/size.x);if(maxDepth)scale=Math.min(scale,maxDepth/size.z);
  holder.scale.setScalar(scale);holder.position.set(x-c.x*scale,y-(ground?b.min.y*scale:0),z-c.z*scale);root.add(holder);
  stats.assetInstances=(stats.assetInstances||0)+1;return holder;
 }
 function shiftedBounds(o,id){o.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(o),record={key:id,min:b.min.toArray(),max:b.max.toArray()};hardBounds.push(record);return record;}
 function animateCanopy(source){
  const m=grassCutoutMaterialV6(source),previous=m.onBeforeCompile;m.customProgramCacheKey=()=> 'city-v3-canopy-wind';
  m.onBeforeCompile=shader=>{previous(shader);shader.uniforms.uCityWind=wind;shader.vertexShader='uniform float uCityWind;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    float phase=0.0;
    #ifdef USE_INSTANCING
      phase=instanceMatrix[3].x*.21+instanceMatrix[3].z*.14;
    #endif
    transformed.x+=sin(uCityWind*1.3+phase+position.y*2.0)*.10*max(position.y,0.0);
    transformed.z+=cos(uCityWind*.85+phase)*.045*max(position.y,0.0);`);windShaders.push(shader);};
  materials.push(m);return m;
 }
 function batch(){
  root.updateMatrixWorld(true);const meshes=[];root.traverse(o=>{if(o.isMesh){let dynamic=false;for(let p=o;p;p=p.parent)if(p.userData.cityDynamic)dynamic=true;if(!dynamic)meshes.push(o);}});const groups=new Map();
  for(const o of meshes){const p=new THREE.Vector3().setFromMatrixPosition(o.matrixWorld),k=[Math.floor(p.x/16),Math.floor(p.z/16),o.geometry.uuid,o.material.uuid].join(':');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(o);}
  for(const group of groups.values()){
   const first=group[0],mesh=new THREE.InstancedMesh(first.geometry,first.material,group.length);mesh.name='city-v3:spatial-batch';
   group.forEach((o,i)=>mesh.setMatrixAt(i,o.matrixWorld));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();
   mesh.castShadow=g.high&&!first.material.transparent&&first.material.alphaTest===0;mesh.receiveShadow=true;batches.push(mesh);root.add(mesh);
  }
  for(const child of [...root.children])if(!child.isInstancedMesh&&!child.userData.cityDynamic)root.remove(child);
  stats.sourceMeshes=meshes.length;stats.batches=groups.size;
 }
 async function build(a,S,info){
  dispose();plan=window.KotamaCityV3Layout.create(a.f,a.floor);root=new THREE.Group();root.name='b3_city_v3_map';g.world.add(root);
  stats={mode:'b3-city-v3-trial',artRevision:'V3 structural city in progress',floor:a.key,layoutVersion:plan.version,objects:0,placements:[],edgePlacements:[],terrainCells:0,upperWalkCells:0,stairCells:0,skylineSealed:true};
  const wanted=['v2_truss_bridge','v2_fractured_road',
   'v3_catwalk_junction','v3_riveted_span','v3_deep_window_bay','v3_spalled_wall','v3_collapsed_storey','v3_leaning_facade','v3_derelict_car','v3_electric_cabinet','v3_fluorescent_fixture','v3_cable_pole','v3_shutter_shop','v3_rubble_bank','v3_asphalt_heave'];
  if(a.f===1)wanted.push('v3_greenhouse_bay','v3_greenhouse_gate');if(a.f===2)wanted.push('v3_memory_monument','v3_sunken_colonnade','v3_sunken_shopfront','v3_whiteflower_atlas');
  boxes=new THREE.BoxGeometry(1,1,1);cylinder=geo(new THREE.CylinderGeometry(1,1,1,8));bundle=await loadIndustrialAssets({onlyModels:wanted});finish=createCitySurfaces(THREE,g.high,bundle.materials);geometry.push(boxes);
  const P=finish.palette,concrete=P.concrete,steel=P.rust,soil=P.soil;concrete.color.multiplyScalar(.85);P.stone.color.multiplyScalar(.82);
  heldPointLights.forEach(l=>g.scene.remove(l));oldFar=g.camera.far;g.camera.far=60;g.camera.updateProjectionMatrix();api.setEnvironment(env);
  // The opaque terrain bed remains below the submerged street, never on top of water.
  box('continuous submerged terrain',soil,(a.w-1)*2,-6.3,(a.h-1)*2,(a.w+2)*4,.5,(a.h+2)*4);
  const closed=(x,z)=>info.wallCell(x,z),open=(x,z)=>info.open(x,z),fronts=[];
  function floor(x,z){
   const px=x*4,pz=z*4,y=plan.height(x,z),left=plan.height(x-.5,z),right=plan.height(x+.5,z),ramp=Math.abs(left-right)>.05;
   stats.terrainCells++;if(y>2.9)stats.upperWalkCells++;
   if(ramp){
    stats.stairCells++;const n=12;for(let i=0;i<n;i++){const xx=px-2+(i+.5)*4/n,h=plan.heightWorld(xx,pz);box('climbable supported stair tread',concrete,xx,h-.075,pz,4/n+.006,.15,4.02);}
    for(const dz of[-1.55,1.55])if(closed(x,z+Math.sign(dz))){
     beam('continuous ramp guardrail',steel,[px-1.98,left+1.05,pz+dz],[px+1.98,right+1.05,pz+dz],.05,.05);
     for(const xx of[-1.7,0,1.7])pipe('ramp rail stanchion',steel,[px+xx,plan.heightWorld(px+xx,pz),pz+dz],[px+xx,plan.heightWorld(px+xx,pz)+1.05,pz+dz]);
    }
   }else{
    box('opaque supported street deck',concrete,px,y-.20,pz,4.025,.40,4.025);
    if(bundle.models.has('v2_fractured_road')&&!plan.tags[x+','+z])model('v2_fractured_road',px,y+.018,pz,{ry:Math.floor(hash(x,z,29)*4)*Math.PI/2});
   }
   if(y>=3.1&&open(x,z-1)&&open(x,z+1)&&closed(x-1,z)&&closed(x+1,z)&&hash(x,z,920)>.9)model('v3_catwalk_junction',px,y-3.2,pz);
   if(y>.5){
    for(const sx of[-1.72,1.72])for(const sz of[-1.72,1.72])if(hash(x,z,91)>.55)box('raised street load bearing pier',concrete,px+sx,y/2-.2,pz+sz,.25,y+.4,.25);
   }
  }
  for(let z=0;z<a.h;z++)for(let x=0;x<a.w;x++){
   const c=info.ch(x,z),px=x*4,pz=z*4,h=plan.height(x,z);
   if(c==='~')continue;
   if(plan.tags[x+','+z]==='root-planter'){box('root lifted conservatory planter',concrete,px,h+.4,pz,3.8,.8,3.8);continue;}
   if(plan.monument&&x>=15&&x<=19&&z>=9&&z<=13){box('monument precinct solid foundation',concrete,px,h-.2,pz,4.025,.4,4.025);continue;}
   if(!closed(x,z)){floor(x,z);continue;}
   const adjacent=DIR_ORDER.filter(d=>{const[dx,dz]=DIR_VEC[d];return open(x+dx,z+dz);});if(!adjacent.length)continue;
   const h0=Math.min(h,...adjacent.map(d=>{const[dx,dz]=DIR_VEC[d];return plan.height(x+dx,z+dz);}));
   // Connected corners + an internal core are opaque at every yaw. Recesses
   // stop on the core, while their side depth remains a full metre.
   const height=16+3.2*Math.floor(hash(Math.floor(x/3),Math.floor(z/3),31)*3);
   box('solid city block core',concrete,px,(height+h0)/2,pz,2.1,height-h0,2.1);
   for(const sx of[-1.5,1.5])for(const sz of[-1.5,1.5])box('full depth bonded corner pier',concrete,px+sx,(height+h0)/2,pz+sz,1.02,height-h0,1.02);
   box('continuous building footing',concrete,px,h0+.13,pz,4.04,.28,4.04);
   for(const d of adjacent){const[dx,dz]=DIR_VEC[d],ry=FACE_YAW[d]+Math.PI;
    fronts.push({x,z,dx,dz,h:h0,ry,streetX:x+dx,streetZ:z+dz});
    const id='v3_deep_window_bay';
    if(!bundle.models.has(id))continue;
    const source=bundle.models.get(id),sourceSize=new THREE.Box3().setFromObject(source).getSize(new THREE.Vector3()),single=id==='v3_deep_window_bay',levels=single?Math.ceil(height/3.2):1;
    for(let level=0;level<levels;level++){
     const holder=new THREE.Group(),o=source.clone(true);o.rotation.y=single?FACE_YAW[d]:ry;holder.add(o);
     o.traverse(m=>{if(m.isMesh&&m.material?.name==='v2_exposed_infill_brick')m.visible=false;});
     const b=new THREE.Box3().setFromObject(holder),s=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3()),along=dx?s.z:s.x,scale=3.98/along,depth=dx?s.x:s.z,depthScale=single?Math.min(scale,1.95/depth):1.0/depth,sx=dx?depthScale:scale,sz=dz?depthScale:scale,offset=2-depth*depthScale/2;
     holder.scale.set(sx,single?3.2/s.y:Math.min(1.05,scale),sz);holder.position.set(px+dx*offset-center.x*sx,h0+level*3.2-b.min.y*holder.scale.y,pz+dz*offset-center.z*sz);root.add(holder);
    }
    for(let k=0;k<height/3.2;k++)box('bonded horizontal floor slab',concrete,px+dx*1.55,h0+k*3.2+.10,pz+dz*1.55,dx?.9:4.04,.20,dz?.9:4.04);
   }
   if(hash(x,z,24)>.89&&bundle.models.has('v3_collapsed_storey'))model('v3_collapsed_storey',px,height-1.5,pz,{maxWidth:3.8,maxDepth:3.8,ry:hash(x,z)*6.28});
  }
  // A street crossing carries load into both neighbouring solid blocks.
  let crossings=0;
  for(let z=2;z<a.h-2;z++)for(let x=2;x<a.w-2;x++){
   if(!open(x,z)||plan.tags[x+','+z]||hash(x,z,217)>.18)continue;
   const px=x*4,pz=z*4,h=plan.height(x,z);
   const acrossX=closed(x-1,z)&&closed(x+1,z),acrossZ=closed(x,z-1)&&closed(x,z+1);if(!acrossX&&!acrossZ)continue;
   const dx=acrossX?1:0,dz=acrossX?0:1,level=h+3.6;
   beam('wall to wall I girder',steel,[px-dx*3.6,level,pz-dz*3.6],[px+dx*3.6,level,pz+dz*3.6],.26,.32);
   for(const side of[-1,1]){
    box('girder bolted bearing socket',steel,px+dx*side*2.2,level-.22,pz+dz*side*2.2,.56,.65,.56);
    beam('crossing diagonal knee brace',steel,[px+dx*side*2.5,level-1.45,pz+dz*side*2.5],[px+dx*side*1.25,level,pz+dz*side*1.25],.10,.10);
   }
   if(crossings%3===0){if(bundle.models.has('v3_riveted_span'))model('v3_riveted_span',px,level,pz,{ry:acrossX?Math.PI/2:0});else model('v2_truss_bridge',px,h,pz,{ry:acrossX?0:Math.PI/2});}crossings++;
  }
  stats.crossings=crossings;
  // Electrical/service continuity follows the fronts, not isolated ornaments.
  for(const f of fronts){
   const {x,z,dx,dz,h,ry}=f,px=x*4,pz=z*4,sx=px+dx*2.27,sz=pz+dz*2.27;
   const upper=h+5.8;
   for(const off of[-.13,.13]){
    const points=[];for(let k=0;k<=5;k++){const t=k/5;const wx=sx+dz*(t-.5)*4,wz=sz-dx*(t-.5)*4;points.push([wx,plan.heightWorld(wx,wz)+5.8-.12*Math.sin(t*Math.PI)+off,wz]);}
    for(let k=0;k<5;k++)pipe('continuous sagged electrical service',steel,points[k],points[k+1],.014);
   }
   if(bundle.models.has('v3_fluorescent_fixture')&&hash(x,z,83)>.6)model('v3_fluorescent_fixture',sx,h+3.4,sz,{ry,scale:.85});
   const rare=hash(x,z,89),id=rare>.96?'v3_electric_cabinet':rare>.93?'v3_shutter_shop':rare>.88?'v3_spalled_wall':rare>.80?'v3_rubble_bank':null;
   if(id&&bundle.models.has(id))model(id,sx+dx*.12,h,sz+dz*.12,{ry,maxWidth:dx?.65:3.2,maxDepth:dz?.65:3.2});
   if(hash(x,z,122)>.92&&bundle.models.has('v3_cable_pole'))model('v3_cable_pole',sx+dz*1.5,h,sz-dx*1.5,{scale:.85});
  }
  // Dense, irregular edge ecology; the centre 1.8m movement strip stays clear.
  const nature=await fetch(new URL('../assets/3d/dungeons/b1_nature_v6_candidates/catalog.json',import.meta.url));if(!nature.ok)throw Error('Verified grass catalog unavailable');
  const catalog=await nature.json(),tufts=[];
  for(const name of['sedge','fern','trifoliate']){const row=catalog.sources.find(a=>a.name===name),held=await retainFirstLayerSource(row.file,row.sha256);grassHeld.push(held);let source;held.source.updateMatrixWorld(true);held.source.traverse(o=>{if(o.isMesh)source=o;});tufts.push({geometry:geo(source.geometry.clone().applyMatrix4(source.matrixWorld)),material:animateCanopy(source.material)});}
  if(bundle.models.has('v3_whiteflower_atlas')){const replaced=new Map();bundle.models.get('v3_whiteflower_atlas').traverse(o=>{if(o.isMesh){if(!replaced.has(o.material))replaced.set(o.material,animateCanopy(o.material));o.material=replaced.get(o.material);}});}
  let flowers=0,plants=0;
  for(let z=1;z<a.h-1;z++)for(let x=1;x<a.w-1;x++){
   if(!open(x,z))continue;const px=x*4,pz=z*4,tag=plan.tags[x+','+z],degree=DIR_ORDER.filter(d=>{const[dx,dz]=DIR_VEC[d];return open(x+dx,z+dz);}).length;
   for(const d of DIR_ORDER){const[dx,dz]=DIR_VEC[d];if(!closed(x+dx,z+dz)&&tag!=='greenhouse'&&tag!=='white-garden')continue;
    const n=g.high?12:8;for(let k=0;k<n;k++){
     const q=hash(x*37+k,z*19+k,301),r=hash(x+k,z-k,303),bank=1.23+q*.63,along=(r-.5)*3.8,wx=px+dx*bank+dz*along,wz=pz+dz*bank-dx*along,y=plan.heightWorld(wx,wz),species=tufts[Math.floor(hash(x+k,z,305)*3)];
     const plant=new THREE.Mesh(species.geometry,species.material),s=.45+hash(x,z+k,306)*.95;plant.position.set(wx,y+.018,wz);plant.rotation.y=r*6.28;plant.scale.setScalar(s);root.add(plant);plants++;
    }
   }
   if(tag==='white-garden'&&bundle.models.has('v3_whiteflower_atlas')){
    const n=g.high?48:30;for(let k=0;k<n;k++){const wx=px+(hash(x*71+k,z,421)-.5)*4,wz=pz+(hash(x,z*37+k,422)-.5)*4;
     model('v3_whiteflower_atlas',wx,plan.heightWorld(wx,wz),wz,{ry:hash(x+k,z,423)*6.28,scale:.48+hash(x,z+k,424)*.4});flowers++;}
   }
   if(degree<3&&hash(x,z,317)>.95&&bundle.models.has('v3_derelict_car')){
    const walls=DIR_ORDER.filter(d=>{const[dx,dz]=DIR_VEC[d];return closed(x+dx,z+dz);});if(walls.length){const[dx,dz]=DIR_VEC[walls[0]];model('v3_derelict_car',px+dx*3.05,plan.heightWorld(px+dx*3.05,pz+dz*3.05),pz+dz*3.05,{ry:dx?0:Math.PI/2,maxWidth:dx?1.5:3.8,maxDepth:dz?1.5:3.8});}
   }
  }
  stats.groundPlants=plants;stats.whiteFlowerPatches=flowers;
  // Greenhouse frame sockets and submerged ruins are structural landmarks.
  for(const room of plan.rooms)if(room.type==='greenhouse'){
   for(let z=room.z0;z<=room.z1;z+=2)for(let x=room.x0;x<=room.x1;x+=2)model('v3_greenhouse_bay',x*4,plan.height(x,z),z*4,{scale:1});
   model('v3_greenhouse_gate',(room.x0-1)*4,plan.height(room.x0-1,13),13*4,{ry:Math.PI/2});
  }
  if(plan.water.length){
   water=createCityV3Water(THREE,{cells:plan.water,cellSize:4,y:-1.2,high:g.high});water.object.userData.cityDynamic=true;root.add(water.object);
   for(let i=0;i<plan.water.length;i+=5){const[x,z]=plan.water[i];model(i%2?'v3_sunken_colonnade':'v3_sunken_shopfront',x*4,-5.3,z*4,{scale:.7,ry:hash(x,z,719)*6.28});}
  }
  const shaftSites=plan.rooms.map(room=>({x:(room.x0+room.x1)*2,z:(room.z0+room.z1)*2,y:plan.height((room.x0+room.x1)/2,(room.z0+room.z1)/2)}));
  if(a.f===0)shaftSites.push({x:44,z:36,y:plan.height(11,9)});
  shafts=createCityV3LightShafts(THREE,shaftSites);shafts.object.userData.cityDynamic=true;root.add(shafts.object);
  // Existing story identities, keys, choices and puzzle state stay owned by the game.
  for(const o of a.objects){
   const x=o.tx*4,z=o.ty*4,y=plan.height(o.tx,o.ty),f=info.facing(o.tx,o.ty),ry=FACE_YAW[f];
   const e={o,kind:o.kind,obj:null,state:null,ry,groundY:y,at:new THREE.Vector3(x,y+1.6,z)};
   if(o.kind==='npc'&&o.id==='statue'){
    if(!bundle.models.has('v3_memory_monument'))throw Error('Monument has not passed the V3 source intake');
    e.obj=place(g.world,bundle.models.get('v3_memory_monument'),plan.monument.center[0]*4,y,plan.monument.center[1]*4,0,1);e.at.set(x,y+4,z);
   }else if(o.kind==='npc')e.obj=place(g.world,await load(npcFile(o)),x,y,z,ry);
   else if(o.kind==='stairs'){
    e.obj=place(g.world,o.dir==='down'?S.stairsDown:S.stairsUp,x,y,z,ry,1);
    for(const sx of[-1.6,1.6])beam('stair portal support',steel,[x+sx,y,z-1.6],[x+sx,y+3.8,z-1.6],.16,.16);
    beam('floor transition lintel',steel,[x-1.7,y+3.8,z-1.6],[x+1.7,y+3.8,z-1.6],.20,.22);
   }else if(o.kind==='save'){place(g.world,S.seal,x,y+.01,z,0,.8);e.obj=place(g.world,S.torch,x,y,z);}
   else if(o.kind==='sign')e.obj=place(g.world,S.sign,x,y,z,ry);
   else if(o.kind==='switch')e.obj=place(g.world,S.lever,x,y,z,ry,.85);
   else if(o.kind==='gate')e.obj=place(g.world,S.runeDoor,x,y,z,ry);
   else if(o.kind==='exit'){e.obj=place(g.world,S.sign,x,y,z,ry);for(const sx of[-1.55,1.55])beam('city entrance jamb',steel,[x+sx,y,z],[x+sx,y+3.2,z],.2,.22);beam('city entrance connected lintel',steel,[x-1.65,y+3.2,z],[x+1.65,y+3.2,z],.22,.25);}
   g.entries.push(e);
  }
  stats.objects=g.entries.length;stats.placed=true;
  batch();
  sun=new THREE.DirectionalLight(0xffefd2,2.2);sun.position.set(-20,36,-18);sun.target.position.set(16,0,20);g.scene.add(sun,sun.target);
  oldShadow={enabled:g.renderer.shadowMap.enabled,type:g.renderer.shadowMap.type};g.renderer.shadowMap.enabled=g.high;g.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  if(g.high){sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:.5,far:90});sun.shadow.bias=-.0003;sun.shadow.normalBias=.06;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;}
 }
 function tick(time){
  const t=(typeof time==='number'?time:performance.now())*.001;wind.value=t;water?.tick(t);shafts?.tick(t);
  if(sun){const x=Math.floor(g.camera.position.x/4)*4,z=Math.floor(g.camera.position.z/4)*4,k=x+','+z;if(k!==lastShadow){lastShadow=k;sun.position.set(x-20,36,z-18);sun.target.position.set(x,0,z);sun.target.updateMatrixWorld();sun.shadow.needsUpdate=true;}}
 }
 function dispose(){
  water?.dispose();shafts?.dispose();water=shafts=null;sun?.shadow.dispose();if(sun){sun.target.removeFromParent();sun.removeFromParent();sun=null;}
  if(oldShadow){g.renderer.shadowMap.enabled=oldShadow.enabled;g.renderer.shadowMap.type=oldShadow.type;oldShadow=null;}
  root?.removeFromParent();batches.forEach(o=>o.dispose());batches=[];geometry.forEach(o=>o.dispose());geometry=[];materials.forEach(o=>o.dispose());materials=[];grassHeld.forEach(o=>o.release());grassHeld=[];
  bundle?.dispose();bundle=null;finish?.dispose();finish=null;heldPointLights.forEach(l=>{if(!l.parent)g.scene.add(l);});g.camera.far=oldFar;g.camera.updateProjectionMatrix();modelCache.clear();windShaders=[];hardBounds=[];root=null;stats={};plan=null;
 }
 return {area:3,env,build,tick,dispose,heightAt:(x,z)=>plan?.heightWorld(x,z)||0,async sync(){return false;},info:()=>({...stats,industrialAssets:bundle?.info(),v3Complete:bundle?.catalog.v3Complete,pendingAssets:bundle?.catalog.v3Pending,elevationRange:plan?[0,plan.f===1?6.4:3.2]:null})};
}
