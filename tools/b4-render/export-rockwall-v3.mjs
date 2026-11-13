import fs from 'node:fs';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createB4LavaRockwallV2} from '../../field/b4-lava-rockwall-v2.js';
import {createB4LavaRockwallV3} from '../../field/b4-lava-rockwall-v3.js';
class NodeFileReader{result=null;onloadend=null;onerror=null;readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()}).catch(e=>this.onerror?.(e))}readAsDataURL(b){b.arrayBuffer().then(v=>{this.result='data:'+(b.type||'application/octet-stream')+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.()}).catch(e=>this.onerror?.(e))}}
globalThis.FileReader=NodeFileReader;fs.mkdirSync('render-output',{recursive:true});
for(const [name,root] of [['v2',createB4LavaRockwallV2()],['v3',createB4LavaRockwallV3()]]){root.updateMatrixWorld(true);const buffer=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});fs.writeFileSync('render-output/b4-lava-rockwall-'+name+'.glb',Buffer.from(buffer));console.log('Exported '+name)}
