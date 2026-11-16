/* Real r180 GLTFLoader proof of the review-only 3F candidate floor profiles.
 * Does not edit assets, candidate JSON, sources, the hero preview or the game.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'../..');
const MODULES=process.env.BROWSER_MODULES||'/workspace/work/browser/node_modules';
const {chromium}=require(path.join(MODULES,'playwright-core'));
const THREE=path.join(MODULES,'three');
const PORT=Number(process.env.GAME_LAYOUT_REVIEW_PORT||8793);
const OUT=process.env.GAME_LAYOUT_REVIEW_OUT||'/workspace/work/f1-game-layout-review';
const BASE=path.join(ROOT,'assets/3d/dungeons/b1_sacred_forest_candidates');
const CANDIDATE=path.join(BASE,'scene/game-layout-candidate.json');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const TYPES={'.html':'text/html','.js':'text/javascript','.cjs':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.css':'text/css'};
const server=http.createServer((req,res)=>{
 let name;try{name=decodeURIComponent(req.url.split('?')[0]);}catch{res.writeHead(400);return res.end();}
 const file=path.resolve(ROOT,'.'+name);
 if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream','Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);});
});
function snapshotFiles(manifest){
 const files=[CANDIDATE,...manifest.assets.map(a=>path.join(BASE,a.file)),
  ...readJson(CANDIDATE).expectedSourceBaseline.sourceFiles.map(f=>path.join(ROOT,f.file))];
 return files.map(file=>({file:path.relative(ROOT,file),sha256:sha(fs.readFileSync(file))}));
}
function verifyAllAssetHashes(manifest){return manifest.assets.map(a=>{
 const bytes=fs.readFileSync(path.join(BASE,a.file));
 assert.equal(sha(bytes),a.sha256,a.id+': manifest SHA mismatch');assert.equal(bytes.length,a.bytes,a.id+': byte count mismatch');
 return {id:a.id,file:a.file,sha256:a.sha256,bytes:bytes.length};
});}
function parseGLB(file){const data=fs.readFileSync(path.join(ROOT,file));assert.equal(data.readUInt32LE(0),0x46546c67);return JSON.parse(data.subarray(20,20+data.readUInt32LE(12)));}
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const manifest=readJson(path.join(BASE,'manifest.json')),candidate=readJson(CANDIDATE);
 assert.equal(manifest.assets.length,17,'This review must retain the existing 17 individual assets.');
 assert.equal(candidate.schemaVersion,2);assert.equal(candidate.scope,'candidate_not_applied');
 assert.equal(candidate.floorPlacements.length,274);assert.equal(candidate.fixedObjects.length,7);
 const prior=JSON.parse(cp.execFileSync('git',['show','HEAD:assets/3d/dungeons/b1_sacred_forest_candidates/scene/game-layout-candidate.json'],{cwd:ROOT,encoding:'utf8',maxBuffer:10*1024*1024}));
 assert.deepEqual(candidate.beforeFingerprint,prior.beforeFingerprint,'Save-critical map data changed');
 assert.deepEqual(candidate.fixedObjects,prior.fixedObjects,'Fixed object identities changed');
 assert.deepEqual(candidate.preservedFoes,prior.preservedFoes,'FOE data changed');
 assert.deepEqual(candidate.floorPlacements,prior.floorPlacements,'The 274 original floors must be retained');
 assert.deepEqual(candidate.expectedSourceBaseline.sourceFiles,prior.expectedSourceBaseline.sourceFiles,'Runtime source fingerprints changed');
 for(const id of ['solid_cell_shrub_0','solid_cell_shrub_1'])assert(candidate.omittedUnsafePropPlacements.some(p=>p.id===id),'Previously unsafe prop must remain omitted: '+id);
 assert(candidate.authoredForestDensity.acceptedCedarCount>=20&&candidate.authoredForestDensity.acceptedCedarCount<=30);
 assert.equal(candidate.authoredForestDensity.uniformMapScatterAdded,false);
 assert(candidate.candidatePropPlacements.filter(p=>p.pocketId).every(p=>p.clearance.status==='passed_conservative_triangle_aabb'&&p.clearance.reservedNeighbourhoodsChecked));
 const fileBefore=snapshotFiles(manifest),assetHashes=verifyAllAssetHashes(manifest);
 const profile=candidate.floorRenderProfiles.soil_surface_only,j=parseGLB(profile.sourceFile);
 assert.equal(sha(fs.readFileSync(path.join(ROOT,profile.sourceFile))),profile.sourceSha256);
 const nodes=j.nodes.filter(n=>n.name===profile.selection.node);assert.equal(nodes.length,1);
 assert.equal(j.meshes[nodes[0].mesh].primitives.length,1);
 assert.equal(j.materials[j.meshes[nodes[0].mesh].primitives[0].material].name,profile.selection.material);
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(PORT,'127.0.0.1',resolve);});
 const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/chromium',headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 await ctx.route(/https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/(.*)/,async route=>{
  const match=route.request().url().match(/three@0\.180\.0\/(.*)$/),file=path.resolve(THREE,match[1].split('?')[0]);
  if(!file.startsWith(THREE+path.sep))return route.abort();
  await route.fulfill({path:file,contentType:'text/javascript'});
 });
 const page=await ctx.newPage(),errors=[],warnings=[];
 page.on('pageerror',error=>errors.push('pageerror: '+error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push('console: '+message.text());else if(message.type()==='warning')warnings.push(message.text());});
 page.on('requestfailed',request=>errors.push('requestfailed: '+request.url()+' '+request.failure()?.errorText));
 const report={scope:'Independent 3F candidate GLTFLoader reviewer; not gameplay, collision, regression or FPS approval',
  engine:'Chromium SwiftShader / Three.js r180 GLTFLoader',candidateSha256:sha(fs.readFileSync(CANDIDATE)),
  assetHashes,errors,warnings};
 try{
  console.error('[game-layout] Loading actual 3F floor/wall/prop layout');
  await page.goto(`http://127.0.0.1:${PORT}/preview/f1-game-layout-candidate.html`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.F1GameLayoutReview&&(!window.F1GameLayoutReview.busy),null,{timeout:240000});
  const initial=await page.evaluate(()=>window.F1GameLayoutReview.snapshot());
  assert.equal(initial.ready,true,JSON.stringify(initial.errors));assert.equal(initial.floorCount,274);
  assert.deepEqual(initial.profileCounts,{stone_full_asset:187,soil_surface_only:87});
  assert.equal(initial.wallCount,candidate.boundaryWallPlacements.length);
  assert.equal(initial.propCount,candidate.candidatePropPlacements.length);
  assert.equal(initial.dressingGroundCount,candidate.dressingGroundPlacements.length);
  assert.deepEqual(initial.estimatedCost,candidate.performanceEstimate.totals);
  assert.equal(initial.ceilingsVisible,false);assert.equal(initial.ceilingCount,0,'Ceilings must be off and lazy-loaded initially.');
  assert.equal(initial.omittedFixedObjects,7);assert.equal(initial.foesRendered,false);
  assert.equal(initial.candidateSha256,report.candidateSha256);assert.deepEqual(initial.errors,[]);
  assert.ok((await page.locator('aside .warning').textContent()).includes('水、固定オブジェクト7点、FOE'));
  const floors=await page.evaluate(()=>window.F1GameLayoutReview.floorReport());
  const expected=new Map(candidate.floorPlacements.map(f=>[f.id,f]));
  assert.equal(floors.length,274);
  for(const floor of floors){
   const row=expected.get(floor.id);assert.ok(row);assert.equal(floor.profile,row.renderProfile);
   assert.equal(floor.sourceHashVerified,true,floor.id+': source hash not checked');
   assert.equal(floor.sourceSha256,candidate.floorRenderProfiles[row.renderProfile].sourceSha256);
   assert.equal(floor.sharedGeometry,true,floor.id+': geometry must be shared with parsed source');
   assert.equal(floor.attributesPresent,true,floor.id+': normals/UV missing or vertex colour present');
   assert.ok(Math.abs(floor.bboxMin[0]-(row.position[0]-2))<.003,floor.id+': X origin/bounds');
   assert.ok(Math.abs(floor.bboxMax[0]-(row.position[0]+2))<.003,floor.id+': X origin/bounds');
   assert.ok(Math.abs(floor.bboxMin[2]-(row.position[2]-2))<.003,floor.id+': Z origin/bounds');
   assert.ok(Math.abs(floor.bboxMax[2]-(row.position[2]+2))<.003,floor.id+': Z origin/bounds');
   if(floor.profile==='soil_surface_only'){
    assert.equal(floor.meshes,1,floor.id+': full module fallback detected');
    assert.deepEqual(floor.materialNames,[profile.selection.material]);
    assert.ok(Math.abs(floor.bboxMax[1])<1e-5,floor.id+': top is not Y=0 (ancestor transform lost)');
    assert.ok(Math.abs(floor.bboxMin[1]+.22)<1e-5,floor.id+': original node translation not preserved');
   }
  }
  console.error('[game-layout] Verified all 274 transformed floors, including 87 exact soil meshes');
  const ground=await page.evaluate(()=>window.F1GameLayoutReview.groundReport());
  assert.equal(ground.length,candidate.dressingGroundPlacements.length);
  for(const row of ground){
   const declared=candidate.dressingGroundPlacements.find(p=>p.id===row.id);assert.ok(declared);
   assert.equal(row.gameTraversable,false);assert.equal(row.navigationSolidUnchanged,true);
   assert.equal(row.profile,'soil_surface_only');assert.equal(row.meshes,1);
   assert.equal(row.sharedGeometry,true);assert.equal(row.attributesPresent,true);assert.equal(row.sourceHashVerified,true);
   assert.ok(Math.abs(row.bboxMax[1])<1e-5);assert.ok(Math.abs(row.bboxMin[1]+.22)<1e-5);
   const[x,y]=row.tile;assert.equal(candidate.beforeFingerprint.saveCriticalData.map[y]?.[x]??'#','#');
   assert.equal(declared.clearance.status,'passed_conservative_triangle_aabb');
  }
  const seams=[];
  for(const name of ['stone_full_asset','soil_surface_only']){
   const seam=await page.evaluate(name=>window.F1GameLayoutReview.seamReport(name),name);
   assert.equal(seam.tileCount,4);assert.ok(Math.abs(seam.size[0]-8)<.003);assert.ok(Math.abs(seam.size[2]-8)<.003);
   for(const[edge,values]of Object.entries(seam.outerEdges)){assert.ok(values.vertices>0,name+': no '+edge+' edge samples');assert.ok(Math.abs(values.topMax)<.003,name+': '+edge+' edge top not at Y=0');}
   seams.push(seam);
  }
  await page.screenshot({path:path.join(OUT,'candidate-perspective.png'),timeout:180000});
  await page.click('#plan');assert.equal((await page.evaluate(()=>window.F1GameLayoutReview.snapshot())).planView,true);
  await page.screenshot({path:path.join(OUT,'candidate-plan.png'),timeout:180000});
  await page.click('#ceilings');
  await page.waitForFunction(count=>window.F1GameLayoutReview.snapshot().ceilingCount===count&&window.F1GameLayoutReview.snapshot().ceilingsVisible,candidate.ceilingPlacements.length,{timeout:120000});
  const withCeilings=await page.evaluate(()=>window.F1GameLayoutReview.snapshot());
  assert.equal(withCeilings.ceilingCount,17);assert.equal(withCeilings.ceilingsVisible,true);
  const assembledCost=await page.evaluate(()=>window.F1GameLayoutReview.assembledCostReport());
  assert.equal(assembledCost.triangles,candidate.performanceEstimate.totals.triangles,'Actual loaded primitive triangles differ from whole-map estimate');
  assert.equal(assembledCost.estimatedDrawCalls,candidate.performanceEstimate.totals.estimatedDrawCalls,'Actual loaded material primitives differ from estimate');
  assert.equal(assembledCost.instances,candidate.performanceEstimate.totals.instances);
  await page.click('#ceilings');assert.equal((await page.evaluate(()=>window.F1GameLayoutReview.snapshot())).ceilingsVisible,false);
  await page.click('#props');assert.equal((await page.evaluate(()=>window.F1GameLayoutReview.snapshot())).propsVisible,false);
  await page.click('#props');assert.equal((await page.evaluate(()=>window.F1GameLayoutReview.snapshot())).propsVisible,true);
  const negativeChecks=await page.evaluate(async()=>{
   const api=window.F1GameLayoutReview,result=[];
   const expectReject=async(name,action)=>{let message=null;try{await action();}catch(error){message=error.message;}if(!message)throw new Error('Expected rejection: '+name);result.push({name,rejected:true,message});};
   const unsupported=api.candidate();unsupported.requiredCapabilities.push('__unsupported_capability__');
   await expectReject('unsupported required capability',()=>api.validateCandidate(unsupported));
   await expectReject('old consumer cannot omit dressing ground',()=>api.validateCandidate(api.candidate(),['explicit_floor_render_profiles_v1','gltf_node_material_selection_v1']));
   const expands=api.candidate();expands.dressingGroundPlacements[0].gameTraversable=true;
   await expectReject('dressing ground cannot expand navigation',()=>api.validateCandidate(expands));
   const fallback=api.candidate();fallback.consumerContract.implicitFullAssetFallback=true;
   await expectReject('full asset fallback not allowed',()=>api.validateCandidate(fallback));
   const unknown=api.candidate();unknown.floorPlacements[0].renderProfile='__unknown_profile__';
   await expectReject('unknown floor profile',()=>api.validateCandidate(unknown));
   const original=api.candidate().floorRenderProfiles.soil_surface_only;
   await expectReject('source SHA mismatch',()=>api.verifyFloorProfile({...original,sourceSha256:'0'.repeat(64)}));
   await expectReject('exact node mismatch',()=>api.verifyFloorProfile({...original,selection:{...original.selection,node:'__missing_node__'}}));
   await expectReject('exact material mismatch',()=>api.verifyFloorProfile({...original,selection:{...original.selection,material:'__wrong_material__'}}));
   await expectReject('ancestor transform cannot be discarded',()=>api.verifyFloorProfile({...original,selection:{...original.selection,preserveAncestorTransforms:false}}));
   return result;
  });
  assert.equal(negativeChecks.length,9);assert(negativeChecks.every(c=>c.rejected));
  const sources=await page.evaluate(()=>window.F1GameLayoutReview.sourceSummary());
  for(const source of sources){
   assert.equal(sha(fs.readFileSync(path.join(ROOT,source.file))),source.sha256,source.file+': browser source bytes differ');
   assert.deepEqual(source.geometry.invalid,[],source.file+': invalid loaded geometry');
   if(source.file.startsWith('assets/3d/dungeons/b1_sacred_forest_candidates/'))assert.equal(source.manifestHashVerified,true,source.file+': manifest SHA not verified');
  }
  assert.equal(new Set(sources.map(s=>s.file)).size,sources.length,'A source should only be fetched and parsed once.');
  for(const ceiling of candidate.ceilingPlacements){
   assert.equal(sha(fs.readFileSync(path.join(ROOT,ceiling.file))),ceiling.sourceSha256);
   const source=sources.find(s=>s.file===ceiling.file);assert.ok(source);
   assert.equal(source.sha256,ceiling.sourceSha256);assert(source.explicitPins.includes(ceiling.sourceSha256),'Legacy ceiling candidate pin not verified in browser');
  }
  errors.push(...await page.evaluate(()=>window.F1GameLayoutReview.errors));
  assert.deepEqual(errors,[],'Browser errors');
  assert.deepEqual(snapshotFiles(manifest),fileBefore,'Assets, source runtime or candidate JSON changed during review');
  Object.assign(report,{verifiedAt:new Date().toISOString(),initial,withCeilings,final:await page.evaluate(()=>window.F1GameLayoutReview.snapshot()),
   floors,ground,seams,negativeChecks,sources,assembledCost,performanceEstimate:candidate.performanceEstimate,
   authoredForestDensity:candidate.authoredForestDensity,unchangedFiles:fileBefore,
   passed:true,limitations:['Water, fixed 7 objects and FOE deliberately omitted from rendering.',
    'This proves standalone layout loading and profile selection; no collision, gameplay regression or FPS approval.',
    'Existing ceiling GLB SHA is pinned by each candidate row and checked against browser/local bytes; it remains outside the new 17-asset manifest.']});
  fs.writeFileSync(path.join(OUT,'game-layout-browser-verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({floors:floors.length,soilOnly:floors.filter(f=>f.profile==='soil_surface_only').length,
   walls:initial.wallCount,props:initial.propCount,cedars:candidate.authoredForestDensity.acceptedCedarCount,
   dressingGround:ground.length,ceilings:withCeilings.ceilingCount,seamProfiles:seams.length,
   failClosedChecks:negativeChecks.length,errors,warnings,report:path.join(OUT,'game-layout-browser-verification.json')},null,2));
 }catch(error){Object.assign(report,{message:error.message,passed:false});fs.writeFileSync(path.join(OUT,'game-layout-browser-failure.json'),JSON.stringify(report,null,2)+'\n');throw error;}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
