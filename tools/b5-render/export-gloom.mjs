import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createB5GloomPatch} from '../../field/assets/b5-gloom-vfx.js';
class NodeFileReader {result=null;onloadend=null;onerror=null;readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()}).catch(e=>this.onerror?.(e))}readAsDataURL(b){b.arrayBuffer().then(v=>{this.result='data:'+(b.type||'application/octet-stream')+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.()}).catch(e=>this.onerror?.(e))}}
globalThis.FileReader=NodeFileReader;
fs.mkdirSync('render-output',{recursive:true});
const {group,update}=createB5GloomPatch(THREE,{seed:11,animate:true});update(1.5);
const data=await new GLTFExporter().parseAsync(group,{binary:true,onlyVisible:true});
fs.writeFileSync('render-output/b5-gloom-patch.glb',Buffer.from(data));
console.log('EXPORTED',Buffer.byteLength(Buffer.from(data)));
