import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createRuinedChandelier} from '../../field/assets/b5-ruined-gothic-chandelier.js';
class NodeFileReader{result=null;onloadend=null;onerror=null;readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()}).catch(e=>this.onerror?.(e))}readAsDataURL(b){b.arrayBuffer().then(v=>{this.result='data:'+b.type+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.()}).catch(e=>this.onerror?.(e))}}
globalThis.FileReader=NodeFileReader;
const {group,dispose}=createRuinedChandelier(THREE);group.updateMatrixWorld(true);
const binary=await new GLTFExporter().parseAsync(group,{binary:true,onlyVisible:true});
const out='render-output/b5-chandelier';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/ruined-gothic-chandelier.glb',Buffer.from(binary));console.log('EXPORTED',binary.byteLength);dispose();
