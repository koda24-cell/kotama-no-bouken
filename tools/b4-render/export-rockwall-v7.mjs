import fs from 'node:fs';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createB4LavaRockwallV7} from '../../field/b4-lava-rockwall-v7.js';
class NodeFileReader{result=null;onloadend=null;onerror=null;readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()}).catch(e=>this.onerror?.(e))}readAsDataURL(b){b.arrayBuffer().then(v=>{this.result='data:'+(b.type||'application/octet-stream')+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.()}).catch(e=>this.onerror?.(e))}}
globalThis.FileReader=NodeFileReader;fs.mkdirSync('render-output',{recursive:true});const root=createB4LavaRockwallV7();root.updateMatrixWorld(true);const buffer=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});fs.writeFileSync('render-output/b4-lava-rockwall-v7-massive.glb',Buffer.from(buffer));console.log('Exported V7 large-mass continuous lava rockwall');
