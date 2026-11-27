/* Validate the actual thin GLBs with their canonical external image bytes. */
const fs=require('node:fs'),path=require('node:path'),validator=require('/workspace/work/browser/node_modules/gltf-validator');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'assets/3d/dungeons/b3_industrial_candidates');
(async()=>{const catalog=JSON.parse(fs.readFileSync(process.argv[2]||path.join(base,'catalog.json'))),rows=[];
 for(const a of catalog.assets){const file=path.join(base,a.file),result=await validator.validateBytes(new Uint8Array(fs.readFileSync(file)),{uri:a.file,maxIssues:50,externalResourceFunction:async uri=>new Uint8Array(fs.readFileSync(path.resolve(path.dirname(file),decodeURIComponent(uri))))});
 rows.push({id:a.id,file:a.file,...result.issues});if(result.issues.numErrors)throw Error(JSON.stringify(rows.at(-1)));
 }
 fs.writeFileSync(process.argv[3]||'/tmp/f3-runtime-validation.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows.map(r=>({id:r.id,errors:r.numErrors,warnings:r.numWarnings}))));
})().catch(e=>{console.error(e);process.exitCode=1});
