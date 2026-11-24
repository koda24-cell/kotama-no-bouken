/* Validate actual archived candidates, without selecting any for game use. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const validator=require('/workspace/work/browser/node_modules/gltf-validator');
const base=path.resolve(__dirname,'../../assets/3d/dungeons/b3_industrial_candidates/lod_reviews');
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
(async()=>{const rows=[];for(const id of fs.readdirSync(base).sort()){
 const folder=path.join(base,id),mp=path.join(folder,'comparison/manifest.json');if(!fs.existsSync(mp))continue;
 const m=JSON.parse(fs.readFileSync(mp)),receipt=JSON.parse(fs.readFileSync(path.join(folder,'SHARED_BLENDER53_QA_NOT_APPROVED.json')));
 if(m.original_modified||m.status!=='NOT_APPROVED'||digest(mp)!==receipt.files['comparison/manifest.json'].sha256)throw Error('Invalid receipt '+id);
 for(const variant of m.variants){const file=variant.files.find(f=>f.name.endsWith('.glb')),p=path.join(folder,'comparison',file.name);
  if(digest(p)!==file.sha256)throw Error('SHA mismatch '+p);
  const v=await validator.validateBytes(new Uint8Array(fs.readFileSync(p)),{uri:file.name,maxIssues:30});
  rows.push({id,lod:variant.lod,triangles:variant.triangle_equivalent,sourceTriangles:m.original_triangle_equivalent,sha256:file.sha256,...v.issues});
  if(v.issues.numErrors)throw Error('Invalid GLB '+id+' '+variant.lod);
 }}
 const out=path.resolve('docs/reviews/f3-industrial-final/lod-validation.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({scope:'Actual archived rigid LOD GLBs, not runtime adoption or visual acceptance',models:rows.length/3,variants:rows},null,2));console.log(JSON.stringify(rows.map(({id,lod,numErrors,numWarnings})=>({id,lod,errors:numErrors,warnings:numWarnings}))));
})().catch(e=>{console.error(e);process.exitCode=1});
