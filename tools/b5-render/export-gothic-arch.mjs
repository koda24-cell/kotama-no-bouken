import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createB5ThroneProp} from '../../field/assets/b5-throne-props.js';
import {enhanceB5GothicArch} from '../../field/assets/b5-gothic-arch-detail-additions.js';
class NodeFileReader {result=null;onloadend=null;onerror=null;
 readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()}).catch(e=>this.onerror?.(e))}
 readAsDataURL(b){b.arrayBuffer().then(v=>{this.result='data:'+(b.type||'application/octet-stream')+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.()}).catch(e=>this.onerror?.(e))}
}
globalThis.FileReader=NodeFileReader;
fs.mkdirSync('render-output',{recursive:true});
for(const [label,enhanced] of [['before',false],['after',true]]){
 const model=createB5ThroneProp(THREE,'gothicArch',{seed:505});
 if(enhanced)enhanceB5GothicArch(THREE,model);
 model.updateMatrixWorld(true);
 const buffer=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true});
 const path='render-output/b5-gothic-arch-'+label+'.glb';
 fs.writeFileSync(path,Buffer.from(buffer));console.log(path);
}
