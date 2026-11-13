import fs from 'node:fs';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createB4LavaRockwallV5} from '../../field/b4-lava-rockwall-v5.js';
class NodeFileReader{result=null;onloadend=null;onerror=null;readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()}).catch(e=>this.onerror?.(e))}readAsDataURL(b){b.arrayBuffer().then(v=>{this.result='data:'+(b.type||'application/octet-stream')+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.()}).catch(e=>this.onerror?.(e))}}
globalThis.FileReader=NodeFileReader;fs.mkdirSync('render-output',{recursive:true});
const root=createB4LavaRockwallV5();root.updateMatrixWorld(true);
const buffer=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});
fs.writeFileSync('render-output/b4-lava-rockwall-v5-reference-5000.glb',Buffer.from(buffer));
console.log('V5 exported: 5000 front-surface coordinates');
