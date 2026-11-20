#!/usr/bin/env node
// Review-only PNG publisher. Creates an isolated, parentless preview branch for each Actions run.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const directory=process.argv[2];
const {GITHUB_REPOSITORY:repo,GITHUB_TOKEN:token,GITHUB_RUN_ID:run,GITHUB_RUN_ATTEMPT:attempt='1',GITHUB_SHA:sha}=process.env;
if(!directory||!repo||!token||!/^\d+$/.test(run||'')||!/^\d+$/.test(attempt)||!/^[a-f\d]{40}$/i.test(sha||'')) throw Error('Invalid GitHub Actions environment');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
if(manifest.approval!=='NOT_APPROVED'||manifest.game_integrated!==false||manifest.source_sha!==sha)throw Error('Manifest status/source mismatch');
if(!Array.isArray(manifest.views)||manifest.views.length<3||manifest.views.length>12)throw Error('Invalid view count');
const names=[...new Set(manifest.views.map(v=>{if(!/^[a-z0-9_-]{2,30}$/.test(v))throw Error('Unsafe view name');return v+'.png'}))];
if(names.length!==manifest.views.length)throw Error('Duplicate view');
const files=names.map(name=>{const data=fs.readFileSync(path.join(directory,name));const hash=crypto.createHash('sha256').update(data).digest('hex');if(data.length<100||data.length>4000000||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||hash!==manifest.files_sha256?.[name])throw Error('Invalid PNG or hash: '+name);return{name,data,hash}});
const api='https://api.github.com/repos/'+repo;
async function gh(endpoint,body){const response=await fetch(api+endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},body:JSON.stringify(body)});const obj=await response.json();if(!response.ok)throw Error(endpoint+' '+response.status+' '+JSON.stringify(obj).slice(0,400));return obj;}
const entries=[];
for(const {name,data} of files){const blob=await gh('/git/blobs',{content:data.toString('base64'),encoding:'base64'});entries.push({path:name,mode:'100644',type:'blob',sha:blob.sha});}
const ref='render-preview/run-'+run+'-'+attempt;
const metadata={approval:'NOT_APPROVED',source_sha:sha,source_run:'https://github.com/'+repo+'/actions/runs/'+run,views:names,sha256:Object.fromEntries(files.map(x=>[x.name,x.hash])),note:'Review-only. Do not merge this preview branch into development or main.'};
const meta=await gh('/git/blobs',{content:JSON.stringify(metadata,null,2)+'\n',encoding:'utf-8'});entries.push({path:'review-manifest.json',mode:'100644',type:'blob',sha:meta.sha});
const tree=await gh('/git/trees',{tree:entries});
const commit=await gh('/git/commits',{message:'review: PNG-only NOT_APPROVED render '+run,tree:tree.sha,parents:[]});
await gh('/git/refs',{ref:'refs/heads/'+ref,sha:commit.sha});
const url='https://raw.githubusercontent.com/'+repo+'/'+ref+'/';
const summary='## NOT_APPROVED Blender render previews\n\n'+'[Preview branch](https://github.com/'+repo+'/tree/'+ref+') · [Source run](https://github.com/'+repo+'/actions/runs/'+run+')\n\n'+names.map(n=>'### '+n+'\n!['+n+']('+url+n+')\n').join('\n');
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
for(const name of names)console.log('PREVIEW_IMAGE '+url+name);
console.log('PREVIEW_BRANCH '+ref);
