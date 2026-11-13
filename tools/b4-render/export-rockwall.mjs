import fs from 'node:fs';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createB4LavaRockwall} from '../../field/b4-lava-rockwall.js';
class NodeFileReader{result=null;onloadend=null;onerror=null;readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()}).catch(e=>this.onerror?.(e))}readAsDataURL(b){b.arrayBuffer().then(v=>{this.result='data:'+(b.type||'application/octet-stream')+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.()}).catch(e=>this.onerror?.(e))}}
globalThis.FileReader=NodeFileReader;
fs.mkdirSync('render-output',{recursive:true});
const root=createB4LavaRockwall();root.updateMatrixWorld(true);
const buffer=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});
fs.writeFileSync('render-output/b4-lava-rockwall-v1.glb',Buffer.from(buffer));
console.log('Wrote render-output/b4-lava-rockwall-v1.glb');
