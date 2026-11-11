import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createB4MineRigProps} from '../../field/b4-mine-rig-props.js';
import {enhanceB4MineCart} from '../../field/b4-cart-detail-additions.js';
class NodeFileReader {
  result=null;onloadend=null;onerror=null;
  readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();}).catch(e=>this.onerror?.(e));}
  readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:'+(blob.type||'application/octet-stream')+';base64,'+Buffer.from(b).toString('base64');this.onloadend?.();}).catch(e=>this.onerror?.(e));}
}
globalThis.FileReader=NodeFileReader;
const root=createB4MineRigProps();
enhanceB4MineCart(root);
const cart=root.getObjectByName('b4:buried-ore-cart');
if(!cart)throw Error('Cart not found');
fs.mkdirSync('render-output',{recursive:true});
for(const [name,enhanced] of [['before',false],['after',true]]){
  cart.getObjectByName('b4:cart-detail-additions').visible=enhanced;
  const glb=await new GLTFExporter().parseAsync(cart,{binary:true,onlyVisible:true});
  fs.writeFileSync('render-output/b4-cart-'+name+'.glb',Buffer.from(glb));
  console.log(name,Buffer.byteLength(Buffer.from(glb)));
}
