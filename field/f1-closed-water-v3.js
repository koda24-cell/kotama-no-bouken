/* F1 enclosed ruins only. Owns its material/textures/dressing, never native geometry. */
import * as THREE from 'three';
const TEXTURES = new URL('../assets/3d/dungeons/b1_closed_ruins_v3/textures/', import.meta.url);
const random = seed => { let a=seed|0; return () => { a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; };

/** Load/decode all maps before changing any native mesh. Explicitly async. */
export async function createClosedWaterV3({ meshes, root, map }) {
  if (!root?.isObject3D || !Array.isArray(meshes) || meshes.length !== 11 || meshes.some(m=>!m.isMesh)) throw new Error('Closed water requires the eleven native water meshes');
  const tiles=[];
  for(let z=0;z<map.length;z++)for(let x=0;x<map[z].length;x++)if(map[z][x]==='~')tiles.push([x,z]);
  if(tiles.length!==11)throw new Error('Closed water native map changed');
  const loader=new THREE.TextureLoader(), names=['water_micro_normal.png','water_silt_color.png','water_algae_cluster.png'];
  const loaded=await Promise.allSettled(names.map(name=>loader.loadAsync(new URL(name,TEXTURES).href)));
  if(loaded.some(r=>r.status==='rejected')) { for(const r of loaded)if(r.status==='fulfilled')r.value.dispose(); throw new Error('Closed water texture decode failed'); }
  const [normalMap,siltMap,algaeMap]=loaded.map(r=>r.value);
  normalMap.colorSpace=THREE.NoColorSpace; siltMap.colorSpace=THREE.SRGBColorSpace; algaeMap.colorSpace=THREE.SRGBColorSpace;
  for(const texture of [normalMap,siltMap]){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;}
  const ownMaterials=[],ownGeometry=[],originalMaterials=new Map(),decor=new THREE.Group();decor.name='f1-closed:water-dressing';
  const time={value:0}; let disposed=false,shaderCompiled=false;
  function material(m){ownMaterials.push(m);return m;}
  function geometry(g){ownGeometry.push(g);return g;}
  const water=material(new THREE.MeshPhysicalMaterial({name:'f1-closed:damp-teal-water',color:0x4b7d81,roughness:.12,metalness:0,
    transparent:true,opacity:.83,depthWrite:false,side:THREE.FrontSide,clearcoat:.55,clearcoatRoughness:.14}));
  water.customProgramCacheKey=()=> 'f1-closed-water-v3-world-normal-2';
  water.onBeforeCompile=shader=>{
    shaderCompiled=true;
    shader.uniforms.closedWaterTime=time;
    shader.uniforms.closedWaterNormal={value:normalMap}; shader.uniforms.closedWaterSilt={value:siltMap};
    shader.vertexShader='varying vec3 vClosedWaterWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vClosedWaterWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader='varying vec3 vClosedWaterWorld;\nuniform float closedWaterTime;\nuniform sampler2D closedWaterNormal;\nuniform sampler2D closedWaterSilt;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 cw = vClosedWaterWorld.xz;
      vec3 silt = texture2D(closedWaterSilt, cw * 0.115).rgb;
      float cloud = texture2D(closedWaterSilt, cw * 0.031 + vec2(0.21)).g;
      diffuseColor.rgb *= mix(vec3(0.33,0.56,0.56), vec3(0.72,0.91,0.94), silt.g * 0.8 + cloud * 0.2);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec2 cwA = vClosedWaterWorld.xz * 0.38 + vec2(closedWaterTime * 0.011, closedWaterTime * 0.007);
      vec2 cwB = vClosedWaterWorld.zx * 0.67 + vec2(-closedWaterTime * 0.008, closedWaterTime * 0.014);
      vec2 nA = texture2D(closedWaterNormal, cwA).xy * 2.0 - 1.0;
      vec2 nB = texture2D(closedWaterNormal, cwB).yx * 2.0 - 1.0;
      vec2 nC = (nA + nB * 0.58) * 0.28;
      normal = normalize(mat3(viewMatrix) * normalize(vec3(nC.x, 1.0, nC.y)));
    `);
    // The standard clearcoat lobe otherwise keeps the original perfectly flat
    // normal, hiding the moving wet highlights even when the base normal moves.
    shader.fragmentShader=shader.fragmentShader.replace('#include <clearcoat_normal_fragment_maps>', `#include <clearcoat_normal_fragment_maps>
      #ifdef USE_CLEARCOAT
        clearcoatNormal = normal;
      #endif
    `);
  };
  const bedMat=material(new THREE.MeshStandardMaterial({name:'f1-closed:submerged-silt',map:siltMap,color:0x455f55,roughness:1}));
  const stoneMat=material(new THREE.MeshStandardMaterial({name:'f1-closed:submerged-stones',color:0x4b5842,roughness:.94}));
  const algaeMat=material(new THREE.MeshStandardMaterial({name:'f1-closed:floating-algae',map:algaeMap,roughness:.96,transparent:true,alphaTest:.16,depthWrite:false,side:THREE.DoubleSide,color:0xabc18b}));
  const bedGeo=geometry(new THREE.PlaneGeometry(4.015,4.015,2,2).rotateX(-Math.PI/2));
  const stoneGeo=geometry(new THREE.DodecahedronGeometry(1,0));
  const algaeGeo=geometry(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2));
  const seed=random(0xF1037), edges=[];
  const waterAt=(x,z)=>map[z]?.[x]==='~';
  for(const [x,z] of tiles)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])if(!waterAt(x+dx,z+dz))edges.push([x,z,dx,dz]);
  let algaePatches=0;
  try {
    const stones=new THREE.InstancedMesh(stoneGeo,stoneMat,tiles.length*5); stones.name='f1-closed:submerged-stone-instances';
    const dummy=new THREE.Object3D();let i=0;
    for(const [x,z] of tiles){
      const edgeCount=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dz])=>!waterAt(x+dx,z+dz)).length;
      const tileBed=geometry(bedGeo.clone()),uv=tileBed.attributes.uv,pos=tileBed.attributes.position;
      for(let v=0;v<uv.count;v++)uv.setXY(v,(x*4+pos.getX(v))/7,(z*4+pos.getZ(v))/7);
      const bed=new THREE.Mesh(tileBed,bedMat);bed.name='f1-closed:waterbed';bed.position.set(x*4,-.64,z*4);decor.add(bed);
      for(let j=0;j<5;j++){
        dummy.position.set(x*4+(seed()-.5)*3.7,-.51-seed()*.05,z*4+(seed()-.5)*3.7);
        dummy.rotation.set(seed()*.5,seed()*Math.PI*2,seed()*.4);
        dummy.scale.set(.15+seed()*.3,.09+seed()*.15,.16+seed()*.32);dummy.updateMatrix();stones.setMatrixAt(i++,dummy.matrix);
      }
    }
    stones.instanceMatrix.needsUpdate=true;stones.computeBoundingBox();stones.computeBoundingSphere();decor.add(stones);
    // Drift collects in unequal bank recesses; the centre stays open and readable.
    for(let index=0;index<edges.length;index++){
      if(index%3===1)continue;
      const [x,z,dx,dz]=edges[index], patch=new THREE.Mesh(algaeGeo,algaeMat);
      patch.name='f1-closed:algae-recess';patch.position.set(x*4+dx*(1.35+seed()*.25)+(dz?(.5-seed())*.9:0),-.135,z*4+dz*(1.35+seed()*.25)+(dx?(.5-seed())*.9:0));
      patch.scale.set(.65+seed()*1.45,1,.55+seed()*1.05);patch.rotation.y=seed()*Math.PI*2;patch.renderOrder=3;decor.add(patch);algaePatches++;
    }
    for(const mesh of meshes){originalMaterials.set(mesh,{material:mesh.material,renderOrder:mesh.renderOrder});mesh.material=water;mesh.renderOrder=2;}
    root.add(decor);
  } catch(error){dispose();throw error;}
  function update(timeSeconds){if(!disposed)time.value=Number.isFinite(timeSeconds)?Math.max(0,timeSeconds):0;}
  function dispose(){
    if(disposed)return;disposed=true;
    for(const [mesh,original] of originalMaterials)if(mesh.material===water){mesh.material=original.material;mesh.renderOrder=original.renderOrder;}
    for(const object of decor.children)if(object.isInstancedMesh)object.dispose();
    decor.removeFromParent();decor.clear();
    for(const g of ownGeometry)g.dispose();for(const m of ownMaterials)m.dispose();for(const t of [normalMap,siltMap,algaeMap])t.dispose();
    originalMaterials.clear();
  }
  function info(){return {version:3,nativeWaterMeshes:meshes.length,waterTiles:tiles.length,shoreBoundaryEdges:edges.length,submergedStoneInstances:tiles.length*5,algaePatches,
    shaderCompiled,worldCoordinateNormals:true,reflectionRenderTargets:0,animatedTimeSeconds:time.value,disposed};}
  return {update,dispose,info};
}
