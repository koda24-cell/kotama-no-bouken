'use strict';
// Khronos' actual glTF validator. No game runtime dependency is introduced.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const modules=process.env.BROWSER_MODULES||'/workspace/work/browser/node_modules';
const validator=require(path.join(modules,'gltf-validator'));
const root=path.resolve(__dirname,'../..');
const base=path.join(root,'assets/3d/dungeons/b1_sacred_forest_candidates');
async function main(){
 const manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json')));
 if(manifest.partial)throw Error('Final validation requires all assets');
 const reports=[];
 const sceneFile='scene/sacred_forest_scene.glb';
 const targets=[...manifest.assets];
 if(fs.existsSync(path.join(base,sceneFile)))targets.push({id:'sacred_forest_scene',file:sceneFile});
 for(const asset of targets){
  const bytes=fs.readFileSync(path.join(base,asset.file));
  const report=await validator.validateBytes(new Uint8Array(bytes),{uri:asset.file,maxIssues:250});
  reports.push({id:asset.id,file:asset.file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),report});
  console.log(asset.id,JSON.stringify({errors:report.issues.numErrors,warnings:report.issues.numWarnings,infos:report.issues.numInfos}));
 }
 const result={validator:validator.version(),source:'https://github.com/KhronosGroup/glTF-Validator',
  scope:'Format and conformance; artistic quality and game integration require separate review',
  errors:reports.reduce((s,r)=>s+r.report.issues.numErrors,0),reports};
 const out=path.join(base,'verification');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'khronos-validation.json'),JSON.stringify(result,null,2)+'\n');
 if(result.errors)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
