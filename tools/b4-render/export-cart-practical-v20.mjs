import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createB4MineRigProps} from '../../field/b4-mine-rig-props.js';
import {enhanceB4MineCart} from '../../field/b4-cart-detail-additions.js';
import {enhanceB4CartV14} from '../../field/b4-cart-v14-additions.js';
import {enhanceB4CartPractical} from '../../field/b4-cart-v20-practical.js';
class NodeFileReader {
 result=null;onloadend=null;onerror=null;
 readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()}).catch(e=>this.onerror?.(e))}
 readAsDataURL(b){b.arrayBuffer().then(v=>{this.result='data:'+(b.type||'application/octet-stream')+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.()}).catch(e=>this.onerror?.(e))}
}
globalThis.FileReader=NodeFileReader;
fs.mkdirSync('render-output',{recursive:true});
for(const variant of [14,20,21,22,23,24,25,26,27,28]){
 const root=createB4MineRigProps();
 enhanceB4MineCart(root);
 enhanceB4CartV14(root);
 if(variant>=20)enhanceB4CartPractical(root,variant);
 if(variant>=25) {
   // Original icosahedron ore meshes are preserved, only material copies renamed
   // for an independent, image-PBR weathered-rock candidate.
   const cart=root.getObjectByName('b4:buried-ore-cart');
   for(const obj of [...cart.children]){
     if(obj.isMesh && obj.geometry?.type==='IcosahedronGeometry'){
       obj.material=obj.material.clone();obj.material.name='B4_CaveOre';
     }
   }
 }
 if(variant>=24){
   // A functional standalone placement: original tipped scene version remains unchanged.
   const cart=root.getObjectByName('b4:buried-ore-cart');
   cart.rotation.set(0,0,0);cart.position.set(0,.50,0);
 }
 const cart=root.getObjectByName('b4:buried-ore-cart');
 if(!cart)throw Error('Missing cart');
 cart.updateMatrixWorld(true);
 const data=await new GLTFExporter().parseAsync(cart,{binary:true,onlyVisible:true});
 const path='render-output/b4-cart-practical-v'+variant+'.glb';
 fs.writeFileSync(path,Buffer.from(data));
 console.log('EXPORTED',path,Buffer.byteLength(Buffer.from(data)),cart.userData);
}
