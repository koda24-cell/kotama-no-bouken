/* Hash-verified review assets. The embedded originals remain independent deliverables. */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const base = new URL('../assets/3d/dungeons/b3_industrial_candidates/',import.meta.url);
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value==='object' ? Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])) : value;
async function verified(url, sha) {
  const r=await fetch(url); if(!r.ok)throw Error('Industrial source unavailable: '+url.pathname);
  const b=await r.arrayBuffer(), digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==sha)throw Error('Industrial asset hash mismatch: '+url.pathname);
  return b;
}
export async function loadIndustrialAssets() {
  const r=await fetch(new URL('catalog.json',base));if(!r.ok)throw Error('Industrial catalog unavailable');
  const catalog=await r.json();if(catalog.status!=='NOT_APPROVED')throw Error('Unexpected trial catalog state');
  const blobs=new Map(),urlAliases=new Map(),models=new Map(),materialPool=new Map(),texturePool=new Map();
  const ownedGeometries=new Set(),ownedMaterials=new Set(),ownedTextures=new Set(),ownedBitmaps=new Set();let disposed=false;
  const manager=new THREE.LoadingManager();manager.setURLModifier(url=>urlAliases.get(new URL(url,base).href)||url);
  const loader=new GLTFLoader(manager);
  function dispose(){if(disposed)return;disposed=true;ownedGeometries.forEach(x=>x.dispose());ownedMaterials.forEach(x=>x.dispose());ownedTextures.forEach(x=>x.dispose());if(!THREE.Cache.enabled)ownedBitmaps.forEach(x=>x.close());ownedBitmaps.clear();blobs.forEach(x=>URL.revokeObjectURL(x));models.clear();}
  try {
    for (const row of catalog.sharedImages) {
      const url=new URL(row.file,base),bytes=await verified(url,row.sha256);
      const blob=URL.createObjectURL(new Blob([bytes],{type:row.file.endsWith('.png')?'image/png':'image/jpeg'}));blobs.set(url.href,blob);urlAliases.set(url.href,blob);
    }
    for(const row of catalog.assets){
      const url=new URL(row.file,base),bytes=await verified(url,row.sha256);
      const result=await loader.parseAsync(bytes,new URL('.',url).href),doc=result.parser.json;
      function texKey(index){const t=doc.textures[index],image=doc.images[t.source];return {image:{uri:image.uri?new URL(image.uri,url).href:url.href+'#embedded-image-'+t.source,mimeType:image.mimeType,extensions:image.extensions||{}},sampler:doc.samplers?.[t.sampler]||{},extensions:t.extensions||{}};}
      for(const texture of await result.parser.getDependencies('texture')){ownedTextures.add(texture);if(typeof texture.image?.close==='function')ownedBitmaps.add(texture.image);}
      // Expand texture references before comparing materials from independent glTF files.
      function expand(raw,key=''){if(Array.isArray(raw))return raw.map(x=>expand(x,key));if(!raw||typeof raw!=='object')return raw;return Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,k==='index'&&/[Tt]exture/.test(key)?texKey(v):expand(v,k)]));}
      result.scene.traverse(o=>{if(!o.isMesh)return;ownedGeometries.add(o.geometry);
        const canonical=m=>{
          ownedMaterials.add(m);
          const index=result.parser.associations.get(m)?.materials;
          if(index===undefined)throw Error('Missing glTF material provenance');
          const key=JSON.stringify(stable(expand(doc.materials[index])));
          if(materialPool.has(key))return materialPool.get(key);
          for(const prop of Object.keys(m))if(m[prop]?.isTexture){
            const texture=m[prop];ownedTextures.add(texture);
            const assoc=result.parser.associations.get(texture),ti=assoc?.textures;
            const tk=JSON.stringify(stable({source:ti===undefined?{uuid:texture.uuid}:texKey(ti),colorSpace:texture.colorSpace,channel:texture.channel,matrix:texture.matrix.toArray(),flipY:texture.flipY,wrapS:texture.wrapS,wrapT:texture.wrapT,mag:texture.magFilter,min:texture.minFilter}));
            if(texturePool.has(tk))m[prop]=texturePool.get(tk);else texturePool.set(tk,texture);
          }
          materialPool.set(key,m);return m;
        };
        o.material=Array.isArray(o.material)?o.material.map(canonical):canonical(o.material);
      });
      let model=result.scene;
      if(row.reusedApproved){
        // Material grouping only: bake static node transforms, retain every source triangle.
        model.updateMatrixWorld(true);const groups=new Map(),originals=new Set(),batched=new THREE.Group();batched.name=row.id+':material-groups';
        model.traverse(o=>{if(!o.isMesh)return;if(o.isSkinnedMesh||Array.isArray(o.material)||Object.keys(o.geometry.morphAttributes).length)throw Error('Unsupported stair batching source');
          const attrs=Object.keys(o.geometry.attributes).sort().map(k=>[k,o.geometry.attributes[k].itemSize,o.geometry.attributes[k].normalized,o.geometry.attributes[k].array.constructor.name]);
          const key=o.material.uuid+JSON.stringify(attrs)+!!o.geometry.index;if(!groups.has(key))groups.set(key,{material:o.material,geometries:[]});
          const baked=o.geometry.clone().applyMatrix4(o.matrixWorld);
          if(o.matrixWorld.determinant()<0){
            if(baked.index){for(let i=0;i<baked.index.count;i+=3){const b=baked.index.getX(i+1);baked.index.setX(i+1,baked.index.getX(i+2));baked.index.setX(i+2,b);}}
            else for(const attribute of Object.values(baked.attributes))for(let i=0;i<attribute.count;i+=3)for(let j=0;j<attribute.itemSize;j++){const a=(i+1)*attribute.itemSize+j,b=(i+2)*attribute.itemSize+j,t=attribute.array[a];attribute.array[a]=attribute.array[b];attribute.array[b]=t;}
            const tangent=baked.attributes.tangent;if(tangent)for(let i=0;i<tangent.count;i++)tangent.setW(i,-tangent.getW(i));
          }
          groups.get(key).geometries.push(baked);originals.add(o.geometry);
        });
        for(const group of groups.values()){const geometry=mergeGeometries(group.geometries,false);if(!geometry)throw Error('Stair material grouping failed');group.geometries.forEach(g=>g.dispose());ownedGeometries.add(geometry);batched.add(new THREE.Mesh(geometry,group.material));}
        originals.forEach(g=>{g.dispose();ownedGeometries.delete(g);});model=batched;
      }
      models.set(row.id,model);
      // Repeated maps must not retain a decoded copy for every independently parsed GLB.
      if(!THREE.Cache.enabled){const usedImages=new Set([...texturePool.values()].map(t=>t.image));for(const bitmap of ownedBitmaps)if(!usedImages.has(bitmap)){bitmap.close();ownedBitmaps.delete(bitmap);}}

    }
    // Dispose duplicate resources which no retained source uses, once the pool is complete.
    const usedMaterials=new Set(),usedTextures=new Set();models.forEach(root=>root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){usedMaterials.add(m);Object.values(m).forEach(t=>{if(t?.isTexture)usedTextures.add(t);});}}));
    ownedMaterials.forEach(m=>{if(!usedMaterials.has(m)){m.dispose();ownedMaterials.delete(m);}});ownedTextures.forEach(t=>{if(!usedTextures.has(t)){t.dispose();ownedTextures.delete(t);}});
    return {models,catalog,materials:[...materialPool.values()],dispose,info:()=>({sourceHashesVerified:true,models:models.size,materials:ownedMaterials.size,textures:ownedTextures.size,sharedImages:blobs.size,decodedImages:ownedBitmaps.size,estimatedDecodedImageBytes:[...ownedBitmaps].reduce((sum,b)=>sum+b.width*b.height*4,0)})};
  } catch(e){dispose();throw e;}
}
