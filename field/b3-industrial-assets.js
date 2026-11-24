/* Hash-verified review assets. The embedded originals remain independent deliverables. */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
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
  const ownedGeometries=new Set(),ownedMaterials=new Set(),ownedTextures=new Set();let disposed=false;
  const manager=new THREE.LoadingManager();manager.setURLModifier(url=>urlAliases.get(new URL(url,base).href)||url);
  const loader=new GLTFLoader(manager);
  function dispose(){if(disposed)return;disposed=true;ownedGeometries.forEach(x=>x.dispose());ownedMaterials.forEach(x=>x.dispose());ownedTextures.forEach(x=>x.dispose());blobs.forEach(x=>URL.revokeObjectURL(x));models.clear();}
  try {
    for (const row of catalog.sharedImages) {
      const url=new URL(row.file,base),bytes=await verified(url,row.sha256);
      const blob=URL.createObjectURL(new Blob([bytes],{type:row.file.endsWith('.png')?'image/png':'image/jpeg'}));blobs.set(url.href,blob);urlAliases.set(url.href,blob);
    }
    for(const row of catalog.assets){
      const url=new URL(row.file,base),bytes=await verified(url,row.sha256);
      const result=await loader.parseAsync(bytes,new URL('.',url).href),doc=result.parser.json;
      function texKey(index){const t=doc.textures[index];return {image:doc.images[t.source],sampler:doc.samplers?.[t.sampler]||{},extensions:t.extensions||{}};}
      for(const texture of await result.parser.getDependencies('texture'))ownedTextures.add(texture);
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
            if(texturePool.has(tk)){m[prop]=texturePool.get(tk);texture.dispose();ownedTextures.delete(texture);}else texturePool.set(tk,texture);
          }
          materialPool.set(key,m);return m;
        };
        o.material=Array.isArray(o.material)?o.material.map(canonical):canonical(o.material);
      });
      models.set(row.id,result.scene);
    }
    // Dispose duplicate resources which no retained source uses, once the pool is complete.
    const usedMaterials=new Set(),usedTextures=new Set();models.forEach(root=>root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){usedMaterials.add(m);Object.values(m).forEach(t=>{if(t?.isTexture)usedTextures.add(t);});}}));
    ownedMaterials.forEach(m=>{if(!usedMaterials.has(m)){m.dispose();ownedMaterials.delete(m);}});ownedTextures.forEach(t=>{if(!usedTextures.has(t)){t.dispose();ownedTextures.delete(t);}});
    return {models,catalog,materials:[...materialPool.values()],dispose,info:()=>({sourceHashesVerified:true,models:models.size,materials:ownedMaterials.size,textures:ownedTextures.size,sharedImages:blobs.size})};
  } catch(e){dispose();throw e;}
}
