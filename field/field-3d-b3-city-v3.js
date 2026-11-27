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
 let root,bundle,finish,plan,sun,water,shafts,sky,stats={},geometry=[],materials=[],batches=[],grassHeld=[],oldFar=g.camera.far;
 let oldShadow=null,lastShadow='',wind={value:0},windShaders=[],hardBounds=[],hardCandidates=[];
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
  stats.assetInstances=(stats.assetInstances||0)+1;if(!['v2_fractured_road','v3_asphalt_heave','v3_whiteflower_atlas','v3_sunken_colonnade','v3_sunken_shopfront'].includes(id))hardCandidates.push({object:holder,id});return holder;
 }
 function shiftedBounds(o,id){o.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(o),record={key:id,min:b.min.toArray(),max:b.max.toArray()};hardBounds.push(record);return record;}
 function verifyHardLanes(a,info){
  const lanes=[];
  for(let z=0;z<a.h;z++)for(let x=0;x<a.w;x++)if(info.open(x,z)){
   const h=plan.height(x,z),px=x*4,pz=z*4;
   lanes.push(new THREE.Box3(new THREE.Vector3(px-.9,h+.5,pz-.9),new THREE.Vector3(px+.9,h+2.05,pz+.9)));
   for(const[dx,dz]of[[1,0],[0,1]])if(info.open(x+dx,z+dz)){
    const other=plan.height(x+dx,z+dz);lanes.push(new THREE.Box3(new THREE.Vector3(px-.9,Math.min(h,other)+.5,pz-.9),new THREE.Vector3(px+dx*4+.9,Math.max(h,other)+2.05,pz+dz*4+.9)));
   }
  }
  const overlaps=[],tri=new THREE.Triangle(),v=[tri.a,tri.b,tri.c];let tested=0;
  for(const {object,id}of hardCandidates){
   object.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(object),near=lanes.filter(b=>b.intersectsBox(bounds));if(!near.length)continue;tested++;
   let hit=false;object.traverse(mesh=>{if(hit||!mesh.isMesh||mesh.material.alphaTest>0)return;const p=mesh.geometry.attributes.position,index=mesh.geometry.index,n=index?index.count:p.count;
    for(let i=0;i<n&&!hit;i+=3){for(let j=0;j<3;j++)v[j].fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);if(near.some(b=>b.intersectsTriangle(tri)))hit=true;}
   });if(hit)overlaps.push({id,position:object.position.toArray()});
  }
  stats.hardLaneVerification={width:1.8,bodyHeight:[.5,2.05],candidates:hardCandidates.length,narrowPhaseObjects:tested,overlaps};
 }
 function animateCanopy(source,white=false,strength=1){
  const m=grassCutoutMaterialV6(source),previous=m.onBeforeCompile;m.customProgramCacheKey=()=> 'city-v3-canopy-wind:'+strength;if(white)m.color.multiplyScalar(1/.78);
  m.onBeforeCompile=shader=>{previous(shader);shader.uniforms.uCityWind=wind;shader.vertexShader='uniform float uCityWind;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    float phase=0.0;
    #ifdef USE_INSTANCING
      phase=instanceMatrix[3].x*.21+instanceMatrix[3].z*.14;
    #endif
    transformed.x+=sin(uCityWind*1.3+phase+position.y*2.0)*${(.10*strength).toFixed(4)}*max(position.y,0.0);
    transformed.z+=cos(uCityWind*.85+phase)*${(.045*strength).toFixed(4)}*max(position.y,0.0);`);windShaders.push(shader);};
  materials.push(m);return m;
 }
 function batch(){
  root.updateMatrixWorld(true);const meshes=[];root.traverseVisible(o=>{if(o.isMesh){let dynamic=false;for(let p=o;p;p=p.parent)if(p.userData.cityDynamic)dynamic=true;if(!dynamic)meshes.push(o);}});const groups=new Map();
  for(const o of meshes){let role='',bucket=null;for(let p=o;p&&p!==root;p=p.parent){if(p.userData.cityLodRole)role=p.userData.cityLodRole;if(p.userData.cityBucket)bucket=p.userData.cityBucket;}
   const p=new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);o.userData.cityLodRole=role;o.userData.cityBucket=bucket;
   const k=[...(bucket||[Math.floor(p.x/16),Math.floor(p.z/16)]),role,o.geometry.uuid,o.material.uuid].join(':');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(o);
  }
  for(const group of groups.values()){
   const first=group[0],mesh=new THREE.InstancedMesh(first.geometry,first.material,group.length);mesh.name='city-v3:spatial-batch';mesh.userData.cityLodRole=first.userData.cityLodRole;mesh.userData.cityBucket=first.userData.cityBucket;
   group.forEach((o,i)=>mesh.setMatrixAt(i,o.matrixWorld));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();
   mesh.castShadow=g.high&&!first.material.transparent&&(first.material.alphaTest===0||first.material.name.includes('cedar'));mesh.receiveShadow=true;batches.push(mesh);root.add(mesh);
  }
  for(const child of [...root.children])if(!child.isInstancedMesh&&!child.userData.cityDynamic)root.remove(child);
  stats.sourceMeshes=meshes.length;stats.batches=groups.size;
 }
 async function build(a,S,info){
  dispose();plan=window.KotamaCityV3Layout.create(a.f,a.floor);root=new THREE.Group();root.name='b3_city_v3_map';g.world.add(root);
  stats={mode:'b3-city-v3-trial',artRevision:'V3 structural city in progress',floor:a.key,layoutVersion:plan.version,objects:0,placements:[],edgePlacements:[],terrainCells:0,upperWalkCells:0,stairCells:0,skylineSealed:true};
  const wanted=['v2_fractured_road','v3_structural_corner',
   'v3_catwalk_junction','v3_riveted_span','v3_deep_window_bay','v3_spalled_wall','v3_collapsed_storey','v3_leaning_facade','v3_derelict_car','v3_electric_cabinet','v3_fluorescent_fixture','v3_cable_pole','v3_shutter_shop','v3_rubble_bank','v3_asphalt_heave'];
  if(a.f===1)wanted.push('v3_greenhouse_bay','v3_greenhouse_gate');if(a.f===2)wanted.push('v3_memory_monument','v3_sunken_colonnade','v3_sunken_shopfront','v3_whiteflower_atlas');
  boxes=new THREE.BoxGeometry(1,1,1);cylinder=geo(new THREE.CylinderGeometry(1,1,1,8));bundle=await loadIndustrialAssets({onlyModels:wanted});finish=createCitySurfaces(THREE,g.high,bundle.materials);geometry.push(boxes);
  for(const m of bundle.materials)if(m.name==='aged split tire rubber')m.color.setRGB(.018,.020,.018);
  const P=finish.palette,concrete=P.concrete,steel=P.rust,soil=P.soil,farDark=mat(new THREE.MeshStandardMaterial({color:new THREE.Color().setRGB(.025,.029,.026),roughness:.97}));concrete.color.multiplyScalar(.85);P.stone.color.multiplyScalar(.82);
  heldPointLights.forEach(l=>g.scene.remove(l));oldFar=g.camera.far;api.setEnvironment(env);g.camera.far=api.viewFar(60);g.camera.updateProjectionMatrix();
  // The opaque terrain bed remains below the submerged street, never on top of water.
  box('continuous submerged terrain',soil,(a.w-1)*2,-6.3,(a.h-1)*2,(a.w+2)*4,.5,(a.h+2)*4);
  const closed=(x,z)=>info.wallCell(x,z),open=(x,z)=>info.open(x,z),fronts=[];
  function floor(x,z){
   const px=x*4,pz=z*4,y=plan.height(x,z),left=plan.height(x-.5,z),right=plan.height(x+.5,z),ramp=Math.abs(left-right)>.05;
   stats.terrainCells++;if(y>2.9)stats.upperWalkCells++;
   if(ramp){
    stats.stairCells++;if(a.f===1)for(const dz of[-1.82,1.82])for(const[off,w,d]of[[-.20,.10,.24],[-.08,.20,.04],[-.32,.20,.04]])beam('continuous rolled stair stringer',steel,[px-2,left+off,pz+dz],[px+2,right+off,pz+dz],w,d);const n=12;for(let i=0;i<n;i++){const xx=px-2+(i+.5)*4/n,h=plan.heightWorld(xx,pz);box('climbable supported stair tread',a.f===1?steel:concrete,xx,h-.075,pz,4/n+.006,.15,4.02);if(a.f===1)box('steel stair anti slip nosing',steel,xx-4/n*.42,h+.012,pz,.035,.03,3.8);}
    for(const dz of[-1.55,1.55])if(closed(x,z+Math.sign(dz))){
     beam('continuous ramp guardrail',steel,[px-1.98,left+1.05,pz+dz],[px+1.98,right+1.05,pz+dz],.05,.05);
     for(const xx of[-1.7,0,1.7])pipe('ramp rail stanchion',steel,[px+xx,plan.heightWorld(px+xx,pz),pz+dz],[px+xx,plan.heightWorld(px+xx,pz)+1.05,pz+dz]);
    }
   }else{
    box('opaque supported street deck',concrete,px,y-.20,pz,4.025,.40,4.025);
    if(!plan.tags[x+','+z]){const road=bundle.models.has('v3_asphalt_heave')&&hash(x,z,30)>.84?'v3_asphalt_heave':'v2_fractured_road';model(road,px,y+.018,pz,{ry:Math.floor(hash(x,z,29)*4)*Math.PI/2});}
   }
   if(y>=3.1&&open(x,z-1)&&open(x,z+1)&&closed(x-1,z)&&closed(x+1,z)&&hash(x,z,920)>.9)model('v3_catwalk_junction',px,y-3.2,pz);
   if(y>.5){
    for(const sx of[-1.72,1.72])for(const sz of[-1.72,1.72])if(hash(x,z,91)>.55)box('raised street load bearing pier',concrete,px+sx,y/2-.2,pz+sz,.25,y+.4,.25);
   }
  }
  for(let z=0;z<a.h;z++)for(let x=0;x<a.w;x++){
   const c=info.ch(x,z),px=x*4,pz=z*4,h=plan.height(x,z);
   if(c==='~')continue;
   if(plan.tags[x+','+z]==='car-niche'){
    const garage=plan.garages.find(p=>p[0]===x&&p[1]===z),dx=garage[2],dz=garage[3],ry=Math.atan2(dx,dz);
    box('recessed car alcove ground',concrete,px,h-.18,pz,4,.36,4);
    box('closed garage back',concrete,px-dx*1.8,h+6,pz-dz*1.8,dx?.4:4,12,dz?.4:4);
    for(const sign of[-1,1])box('thick garage side return',concrete,px+dz*sign*1.8,h+6,pz-dx*sign*1.8,dx?4:.4,12,dz?4:.4);
    box('garage connected upper mass',concrete,px,h+7.5,pz,4,9,4);
    const car=model('v3_derelict_car',px+dx*.7,h+.015,pz+dz*.7,{ry,scale:1});if(car)stats.edgePlacements.push(shiftedBounds(car,'garage-car:'+x+':'+z));continue;
   }
   if(plan.tags[x+','+z]==='root-planter'){box('root lifted conservatory planter',concrete,px,h+.4,pz,3.8,.8,3.8);continue;}
   if(plan.monument&&x>=15&&x<=19&&z>=9&&z<=13){box('monument precinct solid foundation',concrete,px,h-.2,pz,4.025,.4,4.025);continue;}
   if(!closed(x,z)){floor(x,z);continue;}
   const adjacent=DIR_ORDER.filter(d=>{const[dx,dz]=DIR_VEC[d];return open(x+dx,z+dz);});if(!adjacent.length)continue;
   const h0=Math.min(h,...adjacent.map(d=>{const[dx,dz]=DIR_VEC[d];return plan.height(x+dx,z+dz);}));
   // Connected corners + an internal core are opaque at every yaw. Recesses
   // stop on the core, while their side depth remains a full metre.
   const height=16+3.2*Math.floor(hash(Math.floor(x/3),Math.floor(z/3),31)*3);
   box('solid city block core',concrete,px,h0+height/2,pz,1.3,height,1.3);
   for(const sx of[-1.5,1.5])for(const sz of[-1.5,1.5])box('full depth bonded corner pier',concrete,px+sx,h0+height/2,pz+sz,1.02,height,1.02);
   box('continuous building footing',concrete,px,h0+.13,pz,4.04,.28,4.04);
   if(adjacent.length>1&&hash(x,z,44)>.6)model('v3_structural_corner',px+1.2,h0,pz+1.2,{maxWidth:1.5,maxDepth:1.5});
   for(const d of adjacent){const[dx,dz]=DIR_VEC[d],ry=FACE_YAW[d]+Math.PI;
    fronts.push({x,z,dx,dz,h:h0,ry,streetX:x+dx,streetZ:z+dz});
    if(!bundle.models.has('v3_deep_window_bay'))throw Error('Sealed V3 window bay is required');
    const single=true,levels=Math.ceil(height/3.2);
    for(let level=0;level<levels;level++){
     const variation=hash(x*7+level,z,893),variant=level===0&&variation>.74&&bundle.models.has('v3_shutter_shop')?'v3_shutter_shop':variation<.13&&bundle.models.has('v3_spalled_wall')?'v3_spalled_wall':'v3_deep_window_bay',source=bundle.models.get(variant);
     stats.facades=stats.facades||{};stats.facades[variant]=(stats.facades[variant]||0)+1;
     const holder=new THREE.Group(),o=source.clone(true);holder.userData.cityLodRole='near';holder.userData.cityBucket=[Math.floor(px/8),Math.floor(pz/8)];o.rotation.y=single?FACE_YAW[d]:ry;holder.add(o);
     o.traverse(m=>{if(m.isMesh&&level>0&&m.material?.name==='f3_exposed_aggregate')m.visible=false;});
     const b=new THREE.Box3().setFromObject(holder),s=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3()),along=dx?s.z:s.x,scale=3.98/along,depth=dx?s.x:s.z,depthScale=single?Math.min(scale,1.95/depth):1.0/depth,sx=dx?depthScale:scale,sz=dz?depthScale:scale,offset=single?1.70:2-depth*depthScale/2;
     holder.scale.set(sx,single?3.2/s.y:Math.min(1.05,scale),sz);holder.position.set(px+dx*offset-center.x*sx,h0+level*3.2-b.min.y*holder.scale.y,pz+dz*offset-center.z*sz);root.add(holder);
     // Closed, recessed far proxy. Original meshes, UVs and near detail are intact.
     const proxy=(u,yy,w,hh,normal,depth,m)=>{const o=box('city-v3 distant recessed bay',m,px+dx*normal+dz*u,h0+level*3.2+yy,pz+dz*normal-dx*u,dx?depth:w,hh,dz?depth:w);o.userData.cityLodRole='far';o.userData.cityBucket=holder.userData.cityBucket;};
     proxy(0,1.6,4.0,3.2,.76,.12,farDark);
     for(const u of[-1.85,0,1.85])proxy(u,1.6,.30,3.2,1.68,.6,concrete);
     for(const yy of[.23,2.98])proxy(0,yy,4.0,.46,1.68,.6,concrete);
     for(const u of[-.925,.925])proxy(u,1.65,1.56,2.16,.95,.12,farDark);
    }
    for(let k=0;k<height/3.2;k++)box('bonded horizontal floor slab',concrete,px+dx*1.55,h0+k*3.2+.10,pz+dz*1.55,dx?.9:4.04,.20,dz?.9:4.04);
   }
   if(hash(x,z,25)>.91&&bundle.models.has('v3_leaning_facade'))model('v3_leaning_facade',px,h0+height-1.4,pz,{maxWidth:3.8,maxDepth:3.8,ry:hash(x,z,26)*6.28});
   if(hash(x,z,24)>.89&&bundle.models.has('v3_collapsed_storey'))model('v3_collapsed_storey',px,h0+height-1.5,pz,{maxWidth:3.8,maxDepth:3.8,ry:hash(x,z)*6.28});
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
   if(crossings%3===0){if(bundle.models.has('v3_riveted_span'))model('v3_riveted_span',px,level,pz,{ry:acrossX?Math.PI/2:0});}crossings++;
  }
  stats.crossings=crossings;
  // Electrical/service continuity follows the fronts, not isolated ornaments.
  for(const f of fronts){
   const {x,z,dx,dz,ry}=f,px=x*4,pz=z*4,sx=px+dx*2.27,sz=pz+dz*2.27,h=plan.heightWorld(sx,sz);
   const upper=h+5.8;
   for(const off of[-.13,.13]){
    const points=[];for(let k=0;k<=5;k++){const t=k/5;const wx=sx+dz*(t-.5)*4,wz=sz-dx*(t-.5)*4;points.push([wx,plan.heightWorld(wx,wz)+5.8-.12*Math.sin(t*Math.PI)+off,wz]);}
    for(let k=0;k<5;k++)pipe('continuous sagged electrical service',steel,points[k],points[k+1],.014);
   }
   if(bundle.models.has('v3_fluorescent_fixture')&&hash(x,z,83)>.6)model('v3_fluorescent_fixture',sx,h+3.4,sz,{ry,scale:.85});
   const rare=hash(x,z,89),id=rare>.96?'v3_electric_cabinet':rare>.93?'v3_shutter_shop':rare>.88?'v3_spalled_wall':rare>.80?'v3_rubble_bank':null;
   if(id&&bundle.models.has(id))model(id,sx+dx*.12,h,sz+dz*.12,{ry,maxWidth:dx?.65:3.2,maxDepth:dz?.65:3.2});
   if(hash(x,z,122)>.92&&bundle.models.has('v3_cable_pole'))model('v3_cable_pole',sx+dz*1.5,plan.heightWorld(sx+dz*1.5,sz-dx*1.5),sz-dx*1.5,{scale:.85});
  }
  // Dense, irregular edge ecology; the centre 1.8m movement strip stays clear.
  const nature=await fetch(new URL('../assets/3d/dungeons/b1_nature_v6_candidates/catalog.json',import.meta.url));if(!nature.ok)throw Error('Verified grass catalog unavailable');
  const catalog=await nature.json(),tufts=[];
  for(const name of['sedge','fern','trifoliate']){const row=catalog.sources.find(a=>a.name===name),held=await retainFirstLayerSource(row.file,row.sha256);grassHeld.push(held);let source;held.source.updateMatrixWorld(true);held.source.traverse(o=>{if(o.isMesh)source=o;});tufts.push({geometry:geo(source.geometry.clone().applyMatrix4(source.matrixWorld)),material:animateCanopy(source.material)});}
  if(a.f===1){
   const held=await retainFirstLayerSource('assets/3d/dungeons/b1_sacred_forest_candidates/props/sacred_cedar_tree.glb','60b90a273602e7cc9c60328b101e8702e029e5c5ef085e6cebd372ff648456cb');grassHeld.push(held);const leafMaterials=new Map();
   for(const key of Object.keys(plan.tags).filter(k=>plan.tags[k]==='root-planter')){const[x,z]=key.split(',').map(Number),tree=held.source.clone(true);tree.scale.setScalar(.65);tree.position.set(x*4,plan.height(x,z)+.8,z*4);
    tree.traverse(o=>{if(o.isMesh&&o.material.alphaTest>0){if(!leafMaterials.has(o.material))leafMaterials.set(o.material,animateCanopy(o.material,false,.15));o.material=leafMaterials.get(o.material);}});root.add(tree);hardCandidates.push({object:tree,id:'reused-cedar'});
   }stats.reusedCedar={sourceSha256:'60b90a273602e7cc9c60328b101e8702e029e5c5ef085e6cebd372ff648456cb',instances:2,sourceTriangles:14712,status:'existing review source retained, no formal promotion'};
  }
  if(bundle.models.has('v3_whiteflower_atlas')){const replaced=new Map();bundle.models.get('v3_whiteflower_atlas').traverse(o=>{if(o.isMesh){if(!replaced.has(o.material))replaced.set(o.material,animateCanopy(o.material,true));o.material=replaced.get(o.material);}});}
  const mossGeometry=new THREE.BufferGeometry(),mossPositions=[0,.006,0],mossUV=[.5,.5],mossIndices=[];
  for(let k=0;k<16;k++){const angle=k*Math.PI/8,r=.80+hash(k,5,760)*.30;mossPositions.push(Math.cos(angle)*r,.004+hash(k,5,761)*.012,Math.sin(angle)*r);mossUV.push(.5+Math.cos(angle)*.5,.5+Math.sin(angle)*.5);}
  for(let k=0;k<16;k++)mossIndices.push(0,(k+1)%16+1,k+1);
  mossGeometry.setAttribute('position',new THREE.Float32BufferAttribute(mossPositions,3));mossGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(mossUV,2));mossGeometry.setIndex(mossIndices);mossGeometry.computeVertexNormals();geo(mossGeometry);
  const mossMaterial=mat(P.stone.clone());mossMaterial.name='sheltered living moss';mossMaterial.color.setHex(0x7c9669);mossMaterial.roughness=.98;
  let flowers=0,plants=0;
  for(let z=1;z<a.h-1;z++)for(let x=1;x<a.w-1;x++){
   if(!open(x,z))continue;const px=x*4,pz=z*4,tag=plan.tags[x+','+z],degree=DIR_ORDER.filter(d=>{const[dx,dz]=DIR_VEC[d];return open(x+dx,z+dz);}).length;
   for(const d of DIR_ORDER){const[dx,dz]=DIR_VEC[d];if(!closed(x+dx,z+dz)&&tag!=='greenhouse'&&tag!=='white-garden')continue;
    for(let k=0;k<3;k++){const along=(hash(x*3+k,z,762)-.5)*4,mx=px+dx*1.57+dz*along,mz=pz+dz*1.57-dx*along;
     if(Math.abs(plan.heightWorld(mx-.4,mz)-plan.heightWorld(mx+.4,mz))<.05){const patch=new THREE.Mesh(mossGeometry,mossMaterial);patch.position.set(mx,plan.heightWorld(mx,mz)+.026,mz);patch.scale.set(dx?.32:.8+hash(x,z+k,763)*.6,1,dz?.32:.8+hash(z,x+k,764)*.6);patch.rotation.y=(hash(x+k,z,765)-.5)*.25;root.add(patch);}
    }
    const n=g.high?12:8;for(let k=0;k<n;k++){
     const q=hash(x*37+k,z*19+k,301),r=hash(x+k,z-k,303),bank=1.23+q*.63,along=(r-.5)*3.8,wx=px+dx*bank+dz*along,wz=pz+dz*bank-dx*along,y=plan.heightWorld(wx,wz),species=tufts[Math.floor(hash(x+k,z,305)*3)];
     const plant=new THREE.Mesh(species.geometry,species.material),s=.45+hash(x,z+k,306)*.95;plant.position.set(wx,y+.018,wz);plant.rotation.y=r*6.28;plant.scale.setScalar(s);root.add(plant);plants++;
    }
   }
   if(tag==='white-garden'&&bundle.models.has('v3_whiteflower_atlas')){
    const n=g.high?112:80;for(let k=0;k<n;k++){const wx=px+(hash(x*71+k,z,421)-.5)*4,wz=pz+(hash(x,z*37+k,422)-.5)*4;
     model('v3_whiteflower_atlas',wx,plan.heightWorld(wx,wz),wz,{ry:hash(x+k,z,423)*6.28,scale:.48+hash(x,z+k,424)*.4});flowers++;}
   }

  }
  for(const room of plan.rooms)if(room.type==='light-court')for(let k=0;k<300;k++){
   const wx=(room.x0-.45+hash(k,4,930)*(room.x1-room.x0+.9))*4,wz=(room.z0-.45+hash(k,7,931)*(room.z1-room.z0+.9))*4,species=tufts[k%tufts.length],plant=new THREE.Mesh(species.geometry,species.material);
   plant.position.set(wx,plan.heightWorld(wx,wz)+.015,wz);plant.rotation.y=hash(k,3,932)*6.28;plant.scale.setScalar(.38+hash(k,9,933)*.55);root.add(plant);plants++;
  }
  stats.groundPlants=plants;stats.whiteFlowerPatches=flowers;
  // Greenhouse frame sockets and submerged ruins are structural landmarks.
  for(const room of plan.rooms)if(room.type==='greenhouse'){
   for(let z=room.z0+.5;z<=room.z1;z+=2)for(let x=room.x0+.5;x<=room.x1;x+=2)model('v3_greenhouse_bay',x*4,plan.height(x,z),z*4,{scale:1});
   model('v3_greenhouse_gate',(room.x0-1)*4,plan.height(room.x0-1,13),13*4,{ry:Math.PI/2});
  }
  if(plan.water.length){
   water=createCityV3Water(THREE,{cells:plan.water,cellSize:4,y:-1.2,high:g.high});water.object.userData.cityDynamic=true;root.add(water.object);
   for(let i=0;i<plan.water.length;i+=5){const[x,z]=plan.water[i];model(i%2?'v3_sunken_colonnade':'v3_sunken_shopfront',x*4,-5.3,z*4,{scale:.7,ry:hash(x,z,719)*6.28});}
  }
  const shaftSites=plan.rooms.map(room=>({x:(room.x0+room.x1)*2,z:(room.z0+room.z1)*2,y:plan.height((room.x0+room.x1)/2,(room.z0+room.z1)/2)}));

  shafts=createCityV3LightShafts(THREE,shaftSites);shafts.object.userData.cityDynamic=true;root.add(shafts.object);
  // Existing story identities, keys, choices and puzzle state stay owned by the game.
  for(const o of a.objects){
   const f=info.facing(o.tx,o.ty),[dx,dz]=DIR_VEC[f],ry=FACE_YAW[f],x=o.tx*4+(o.onWall?dx*2.22:0),z=o.ty*4+(o.onWall?dz*2.22:0),y=o.onWall?plan.height(o.tx+dx,o.ty+dz):plan.height(o.tx,o.ty);
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
  verifyHardLanes(a,info);
  sky=finish.sky();sky.userData.cityDynamic=true;root.add(sky);
  batch();
  sun=new THREE.DirectionalLight(0xffefd2,2.2);sun.position.set(-17,42,-12);sun.target.position.set(16,0,20);g.scene.add(sun,sun.target);
  oldShadow={enabled:g.renderer.shadowMap.enabled,type:g.renderer.shadowMap.type};g.renderer.shadowMap.enabled=g.high;g.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  if(g.high){sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:.5,far:90});sun.shadow.bias=-.0003;sun.shadow.normalBias=.06;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;}
 }
 function tick(dt,now){
  const t=(typeof now==='number'?now:performance.now())*.001;wind.value=t;water?.tick(t);shafts?.tick(t);if(sky)sky.position.copy(g.camera.position);
  let nearBatches=0,farBatches=0;
  for(const mesh of batches){const role=mesh.userData.cityLodRole,b=mesh.userData.cityBucket;if(!role||!b)continue;
   const dx=Math.max(b[0]*8-g.camera.position.x,0,g.camera.position.x-(b[0]+1)*8),dz=Math.max(b[1]*8-g.camera.position.z,0,g.camera.position.z-(b[1]+1)*8),near=Math.hypot(dx,dz)<(g.high?28:14);
   mesh.visible=role==='near'?near:!near;if(mesh.visible){if(role==='near')nearBatches++;else farBatches++;}
  }stats.rigidLOD={nearBatches,farBatches,originalNearPreserved:true,proxy:'closed recessed concrete and dark window frames',distance:g.high?28:14};
  if(sun){const x=Math.floor(g.camera.position.x/4)*4,z=Math.floor(g.camera.position.z/4)*4,k=x+','+z;if(k!==lastShadow){lastShadow=k;sun.position.set(x-17,42,z-12);sun.target.position.set(x,0,z);sun.target.updateMatrixWorld();sun.shadow.needsUpdate=true;}}
 }
 function dispose(){
  water?.dispose();shafts?.dispose();water=shafts=null;sky=null;sun?.shadow.dispose();if(sun){sun.target.removeFromParent();sun.removeFromParent();sun=null;}
  if(oldShadow){g.renderer.shadowMap.enabled=oldShadow.enabled;g.renderer.shadowMap.type=oldShadow.type;oldShadow=null;}
  root?.removeFromParent();batches.forEach(o=>o.dispose());batches=[];geometry.forEach(o=>o.dispose());geometry=[];materials.forEach(o=>o.dispose());materials=[];grassHeld.forEach(o=>o.release());grassHeld=[];
  bundle?.dispose();bundle=null;finish?.dispose();finish=null;heldPointLights.forEach(l=>{if(!l.parent)g.scene.add(l);});g.camera.far=oldFar;g.camera.updateProjectionMatrix();modelCache.clear();windShaders=[];hardBounds=[];hardCandidates=[];root=null;stats={};plan=null;
 }
 return {area:3,env,build,tick,dispose,heightAt:(x,z)=>plan?.heightWorld(x,z)||0,async sync(){return false;},info:()=>({...stats,animationTime:wind.value,industrialAssets:bundle?.info(),v3Complete:bundle?.catalog.v3Complete,pendingAssets:bundle?.catalog.v3Pending,elevationRange:plan?[0,plan.f===1?6.4:3.2]:null})};
}
