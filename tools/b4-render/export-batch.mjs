import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createB4MineRigProps} from '../../field/b4-mine-rig-props.js';
import {enhanceB4Furnace} from '../../field/b4-furnace-detail-additions.js';
import {createB4DetailedRails} from '../../field/b4-detailed-rails.js';
import {enhanceB4RailsV11} from '../../field/b4-rail-v11-additions.js';
import {enhanceB4MineCart} from '../../field/b4-cart-detail-additions.js';
class NodeFileReader {
 result=null;onloadend=null;onerror=null;
 readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()}).catch(e=>this.onerror?.(e))}
 readAsDataURL(b){b.arrayBuffer().then(v=>{this.result='data:'+(b.type||'application/octet-stream')+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.()}).catch(e=>this.onerror?.(e))}
}
globalThis.FileReader=NodeFileReader;
fs.mkdirSync('render-output',{recursive:true});
for(const enhanced of [false,true]){
 const root=createB4MineRigProps();
 if(enhanced){enhanceB4MineCart(root);enhanceB4Furnace(root);}
 const cart=root.getObjectByName('b4:buried-ore-cart');
 const furnace=root.getObjectByName('b4:ruined-smelting-furnace');
 const items=[['cart',cart],['furnace',furnace],['mine-rig',root]];
 for(const [name,obj] of items){
  if(!obj)throw Error('Missing '+name);
  obj.updateMatrixWorld(true);
  const buffer=await new GLTFExporter().parseAsync(obj,{binary:true,onlyVisible:true});
  const path='render-output/b4-'+name+'-'+(enhanced?'after':'before')+'.glb';
  fs.writeFileSync(path,Buffer.from(buffer));
  console.log(path);
 }
}

for(const [variant,opts] of [['straight',{}],['curved',{curve:.9}],['broken',{broken:true}]]){
 const rails=createB4DetailedRails(opts);
 rails.updateMatrixWorld(true);
 const data=await new GLTFExporter().parseAsync(rails,{binary:true,onlyVisible:true});
 const path='render-output/b4-rails-'+variant+'.glb';
 fs.writeFileSync(path,Buffer.from(data));console.log(path);
}

// Export V11 variants separately so V10 assets remain a genuine before baseline.
for(const [variant,opts] of [['straight',{}],['curved',{curve:.9}],['broken',{broken:true}]]){
 const rails=enhanceB4RailsV11(createB4DetailedRails(opts),opts);
 rails.updateMatrixWorld(true);
 const data=await new GLTFExporter().parseAsync(rails,{binary:true,onlyVisible:true});
 const path='render-output/b4-rails-v11-'+variant+'.glb';
 fs.writeFileSync(path,Buffer.from(data));console.log(path);
}
