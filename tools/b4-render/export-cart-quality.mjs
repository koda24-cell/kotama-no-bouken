import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import {createB4MineRigProps} from '../../field/b4-mine-rig-props.js';
import {enhanceB4MineCart} from '../../field/b4-cart-detail-additions.js';
import {enhanceB4CartV12} from '../../field/b4-cart-v12-additions.js';
class NodeFileReader {
 result=null;onloadend=null;onerror=null;
 readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()}).catch(e=>this.onerror?.(e))}
 readAsDataURL(b){b.arrayBuffer().then(v=>{this.result='data:'+(b.type||'application/octet-stream')+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.()}).catch(e=>this.onerror?.(e))}
}
globalThis.FileReader=NodeFileReader;
fs.mkdirSync('render-output',{recursive:true});
for (const level of [0,1,2]) {
 const root=createB4MineRigProps();
 enhanceB4MineCart(root);
 if(level)enhanceB4CartV12(root,level);
 const cart=root.getObjectByName('b4:buried-ore-cart');
 if(!cart)throw Error('missing cart');
 cart.updateMatrixWorld(true);
 const buffer=await new GLTFExporter().parseAsync(cart,{binary:true,onlyVisible:true});
 const target='render-output/b4-cart-quality-'+level+'.glb';
 fs.writeFileSync(target,Buffer.from(buffer));
 console.log(target,Buffer.byteLength(Buffer.from(buffer)));
}
