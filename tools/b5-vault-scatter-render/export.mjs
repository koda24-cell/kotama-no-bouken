import fs from 'node:fs';import * as THREE from 'three';import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';import {createB5VaultScatterProp,B5_VAULT_SCATTER_KINDS} from '../../field/assets/b5-vault-scatter-props.js';
import {addB5VaultScatterDetails} from '../../field/assets/b5-vault-scatter-details-v2.js';
import {addB5VaultScatterDetailsV3} from '../../field/assets/b5-vault-scatter-details-v3.js';
class Reader{result=null;onloadend=null;onerror=null;readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.()}).catch(e=>this.onerror?.(e))}readAsDataURL(b){b.arrayBuffer().then(x=>{this.result='data:'+b.type+';base64,'+Buffer.from(x).toString('base64');this.onloadend?.()}).catch(e=>this.onerror?.(e))}}globalThis.FileReader=Reader;
const kind=process.argv[2];if(!B5_VAULT_SCATTER_KINDS.includes(kind))throw Error('Invalid kind '+kind);
const out='render-output/b5-vault-scatter/'+kind;fs.mkdirSync(out,{recursive:true});
const {group,dispose}=createB5VaultScatterProp(THREE,kind,17);addB5VaultScatterDetails(THREE,group,kind,17);addB5VaultScatterDetailsV3(THREE,group,kind,41);group.updateMatrixWorld(true);
const data=await new GLTFExporter().parseAsync(group,{binary:true,onlyVisible:true});fs.writeFileSync(out+'/'+kind+'.glb',Buffer.from(data));console.log(kind,data.byteLength);dispose();