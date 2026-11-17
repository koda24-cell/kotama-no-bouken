'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'assets/3d/dungeons/b1_closed_ruins_v3');
const validator=require(path.join(process.env.BROWSER_MODULES||'/workspace/work/browser/node_modules','gltf-validator'));
(async()=>{
 const assets=fs.readdirSync(path.join(base,'metrics')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(base,'metrics',f))));
 if(assets.length!==5)throw Error('Five individually authored assets are required');
 const reports=[];
 for(const a of assets){const bytes=fs.readFileSync(path.join(base,a.file)),sha=crypto.createHash('sha256').update(bytes).digest('hex');if(sha!==a.sha256)throw Error('Hash mismatch '+a.id);
  const report=await validator.validateBytes(new Uint8Array(bytes),{uri:a.file,maxIssues:100});reports.push({id:a.id,sha256:sha,report});console.log(a.id,report.issues.numErrors,report.issues.numWarnings);
 }
 const errors=reports.reduce((n,r)=>n+r.report.issues.numErrors,0),warnings=reports.reduce((n,r)=>n+r.report.issues.numWarnings,0);
 fs.mkdirSync(path.join(base,'verification'),{recursive:true});fs.writeFileSync(path.join(base,'verification/khronos-validation.json'),JSON.stringify({validator:validator.version(),source:'https://github.com/KhronosGroup/glTF-Validator',errors,warnings,reports,scope:'Actual GLB format validation; not art approval'},null,2));
 if(errors)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
