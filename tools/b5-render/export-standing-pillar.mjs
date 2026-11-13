import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createB5GateCompanion} from '../../field/assets/b5-gate-companion-assets.js';
class NodeFileReader {result=null;onloadend=null;onerror=null;
 readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()}).catch(e=>this.onerror?.(e))}
 readAsDataURL(b){b.arrayBuffer().then(v=>{this.result='data:'+(b.type||'application/octet-stream')+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.()}).catch(e=>this.onerror?.(e))}
}
globalThis.FileReader=NodeFileReader;
fs.mkdirSync('render-output', {recursive:true});
const model=createB5GateCompanion(THREE,'standing-pillar',505);
model.updateMatrixWorld(true);
const data=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true});
const out='render-output/b5-standing-gothic-pillar.glb';
fs.writeFileSync(out,Buffer.from(data));
console.log('EXPORTED',out,Buffer.byteLength(Buffer.from(data)));
