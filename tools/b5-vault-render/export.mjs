import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createB5VaultAsset,B5_VAULT_KINDS} from '../../field/assets/b5-modular-vault-kit.js';

class NodeFileReader {
 result=null;onloadend=null;onerror=null;
 readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()}).catch(e=>this.onerror?.(e))}
 readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result='data:'+(blob.type||'application/octet-stream')+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.()}).catch(e=>this.onerror?.(e))}
}
globalThis.FileReader=NodeFileReader;

const kind=process.argv[2];
if(!B5_VAULT_KINDS.includes(kind))throw new Error('Specify kind: '+B5_VAULT_KINDS.join(', '));
const output='render-output/b5-vault/'+kind;
fs.mkdirSync(output,{recursive:true});
const {group,dispose}=createB5VaultAsset(THREE,kind);
group.updateMatrixWorld(true);
const meshes=[];
group.traverse(o=>{if(o.isMesh)meshes.push(o)});
if(!meshes.length)throw new Error('Empty vault group: '+kind);
const binary=await new GLTFExporter().parseAsync(group,{binary:true,onlyVisible:true});
if(binary.byteLength<1024)throw new Error('Suspiciously small GLB');
const filename=output+'/'+kind+'.glb';
fs.writeFileSync(filename,Buffer.from(binary));
console.log('EXPORTED',kind,meshes.length,'meshes',binary.byteLength,'bytes',filename);
dispose();
