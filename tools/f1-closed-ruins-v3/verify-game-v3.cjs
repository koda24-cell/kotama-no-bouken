/* Real index.html smoke/regression checks for the opt-in F1/3F closed-ruins V3 trial.
 * Usage: node tools/f1-closed-ruins-v3/verify-game-v3.cjs
 * Uses isolated browser contexts; suppresses game save writes in the harness.
 * Never edits the game, map, candidate descriptor or individual model files.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const MODULES=process.env.BROWSER_MODULES||'/workspace/work/browser/node_modules';
const THREE=process.env.THREE_DIR||path.join(MODULES,'three');
const {chromium}=require(process.env.PLAYWRIGHT||path.join(MODULES,'playwright-core'));
const PORT=Number(process.env.GAME_TRIAL_PORT||8823);
const OUT=process.env.GAME_TRIAL_OUT||path.join(ROOT,'docs/reviews/f1-closed-ruins-v3-game');
const KIT='assets/3d/dungeons/b1_sacred_forest_candidates/';
const V3KIT='assets/3d/dungeons/b1_closed_ruins_v3/';
const candidate=JSON.parse(fs.readFileSync(path.join(ROOT,KIT+'scene/game-layout-v3.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,KIT+'manifest.json'),'utf8'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const clean=value=>JSON.parse(JSON.stringify(value));
const close=(a,b,epsilon=.035)=>Math.abs(a-b)<=epsilon;
const TYPES={'.html':'text/html','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary',
 '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml',
 '.css':'text/css','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.woff2':'font/woff2'};
const server=http.createServer((request,response)=>{
 let pathname;try{pathname=decodeURIComponent(request.url.split('?')[0]);}catch{response.writeHead(400);return response.end();}
 const file=path.resolve(ROOT,'.'+pathname);
 if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){response.writeHead(403);return response.end();}
 fs.readFile(file,(error,bytes)=>{if(error){response.writeHead(404);return response.end();}
  response.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-store'});
  response.end(request.method==='HEAD'?undefined:bytes);
 });
});
const sourceContext={};vm.createContext(sourceContext);
vm.runInContext(read('data/field-maps.js')+'\n'+read('field.js')+'\nthis.floorData=[0,1,2].map(f=>{const a=fieldArea(1,f);return {key:a.key,map:a.floor.map,objects:a.objects,foes:a.floor.foes};});',sourceContext);
const sourceFloors=clean(sourceContext.floorData);
function frozenInputs(){
 const files=[KIT+'scene/game-layout-v3.json',KIT+'scene/game-layout-candidate.json',KIT+'manifest.json',
  ...manifest.assets.map(a=>KIT+a.file),
  ...(candidate.revisionSources||[]).map(a=>a.file),
  'field/f1-closed-water-v3.js',
  ...fs.readdirSync(path.join(ROOT,V3KIT+'textures')).filter(f=>/\.(png|jpe?g|json)$/i.test(f)).map(f=>V3KIT+'textures/'+f),
  ...new Set(candidate.ceilingPlacements.map(c=>c.file)),
  'index.html','field.js','data/field-maps.js','field/field-3d-view.js','field/field-3d-b1-sacred-trial.js',
  'preview/f1-foliage-coverage.js',
  'field/field-movement-foe.js','field/field-interactions.js','field/field-navigation.js','field/field-persistence.js','field/field-puzzles.js'];
 return [...new Set(files)].map(file=>({file,sha256:sha(fs.readFileSync(path.join(ROOT,file)))}));
}
const sourceRecord={commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
 inputs:frozenInputs(),candidateMapSha256:candidate.beforeFingerprint.mapSha256};
const report={scope:'Real index.html closed ruins V3 opt-in visual trial; gameplay smoke checks with isolated fixtures, not full game certification or real-device FPS approval',
 engine:'Chromium SwiftShader / Three.js r180',source:sourceRecord,autoSaveDisabled:true,
 fixtureNotes:['Fresh browser contexts only; no user browser profile or existing saves.',
  'Party/tutorial/unlock flags are test fixtures. Camera review points use validated walk cells.',
  'Movement uses the real exported KotamaField3D.input once per action to avoid short-key loss under slow software rendering.',
  'Save/load persistence is deliberately suppressed and is not certified by these tests.'],
 sessions:[],checks:[],screenshots:[],limitations:[],passed:false};
let browser;

async function createSession(name,optIn,{badManifest=false}={}){
 const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
 await context.route(/https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/(.*)/,async route=>{
  const match=route.request().url().match(/three@0\.180\.0\/(.*)$/),file=path.resolve(THREE,match[1].split('?')[0]);
  if(!file.startsWith(THREE+path.sep))return route.abort();
  await route.fulfill({path:file,contentType:'text/javascript'});
 });
 const record={name,optIn,badManifest,pageErrors:[],consoleErrors:[],warnings:[],resource404:[],requestFailures:[],candidateRequests:[],injectedManifestResponses:0,states:[]};
 if(badManifest)await context.route('**/assets/3d/dungeons/b1_sacred_forest_candidates/manifest.json*',async route=>{
  const altered=clean(manifest);altered.assets[0].sha256='0'.repeat(64);record.injectedManifestResponses++;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(altered)});
 });
 await context.addInitScript(()=>{
  window.__trialHarness={blockedSaveWrites:[],suppressedAutoSaves:0};
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
   if(this===localStorage&&(key==='fantasyRpgSave'||/^kotamaSaveSlot\d+$/.test(String(key)))){
    window.__trialHarness.blockedSaveWrites.push(String(key));return;
   }
   return original.call(this,key,value);
  };
  localStorage.setItem('kotama.field3d.quality','low');
  localStorage.setItem('kotama.field3d.maxFps','20');
  localStorage.setItem('kotamaAudioSettings',JSON.stringify({bgmEnabled:false,seEnabled:false,bgmVolume:0,seVolume:0}));
 });
 const page=await context.newPage();
 page.on('pageerror',error=>record.pageErrors.push(error.message));
 page.on('console',message=>{
  const value={text:message.text(),url:message.location().url||''};
  if(message.type()==='error'){
   if(/404|Failed to load resource/.test(value.text)&&!value.url.includes('b1_sacred_forest_candidates')&&!value.url.includes('b1_closed_ruins_v3'))record.resource404.push(value);
   else record.consoleErrors.push(value);
  }else if(message.type()==='warning')record.warnings.push(value);
 });
 page.on('response',response=>{if(response.status()===404)record.resource404.push({url:response.url(),status:404});});
 page.on('requestfailed',request=>{if(!/favicon\.ico/.test(request.url()))record.requestFailures.push({url:request.url(),error:request.failure()?.errorText});});
 page.on('request',request=>{if((request.url().includes('/'+KIT)||request.url().includes('/'+V3KIT)))record.candidateRequests.push(request.url());});
 const session={name,context,page,record};report.sessions.push(record);
 console.error('[trial] open',name);
 await page.goto(`http://127.0.0.1:${PORT}/index.html${optIn?'?f1sacred=1':''}`,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>typeof fieldEnterArea==='function'&&window.KotamaField3D&&typeof window.KotamaField3D.gameReviewState==='function',null,{timeout:180000});
 await page.evaluate(()=>{
  window.persistAutoSave=()=>{window.__trialHarness.suppressedAutoSaves++;return true;};
  try{tutorialFinish();}catch{}try{tutorialClose();}catch{}
  if(typeof tutorialState!=='undefined'){tutorialState.phase='complete';tutorialState.completed=true;tutorialState.started=false;}
  document.querySelectorAll('#tutorial-overlay').forEach(el=>el.hidden=true);
  document.body.classList.remove('tutorial-home-focus','tutorial-active');
  state.firstStageStarted=true;state.maxUnlockedStage=5;
  fieldState.flags.prologue=true;fieldState.flags['labyrinth-tutorial']=true;
  for(let f=0;f<3;f++)fieldState.flags[`floor:1-${f}`]=true;
  if(typeof eventRead!=='undefined')for(const event of stageEvents||[])eventRead[event.id]=true;
  for(const id of['bgm-toggle','se-toggle']){const element=document.getElementById(id);if(element)element.checked=false;}
  fieldState.nextEncounter=1000000;fieldState.steps=0;
 });
 return session;
}
async function settle(session,{choice='cancel'}={}){
 const page=session.page;
 for(let attempt=0;attempt<90;attempt++){
  const state=await page.evaluate(choice=>{
   if(fieldDialogTyping){fieldDialogTyping();return'typing';}
   if(fieldDialogAdvance){const next=fieldDialogAdvance;fieldDialogAdvance=null;next();return'advance';}
   if(fieldChoiceState){fieldChoiceState.done(choice==='accept'?0:fieldChoiceState.count-1);return'choice';}
   for(const el of document.querySelectorAll('#story-event'))if(!el.hidden)el.querySelector('button')?.click();
   return fieldState.lock?'locked':null;
  },choice);
  if(!state)return;
  await page.waitForTimeout(80);
 }
 throw new Error(session.name+': dialogue did not settle');
}
async function state(session,label){
 const value=await session.page.evaluate(()=>({tile:fieldPlayerTile(),direction:fieldState.dir,turn:fieldState.turn,
  area:fieldState.area,floor:fieldState.floor,screen:state.screen,lock:fieldState.lock,
  active:window.KotamaField3D.active(),trial:window.KotamaField3D.sacredTrialInfo(),
  review:window.KotamaField3D.gameReviewState(),gold:state.gold,nearKey:fieldState.nearKey,
  toggleHidden:document.getElementById('field-3d-toggle')?.hidden,
  objects:JSON.parse(JSON.stringify(fieldArea().objects)),foeDefinitions:JSON.parse(JSON.stringify(fieldArea().floor.foes)),map:fieldArea().floor.map}));
 session.record.states.push({label,...value});return value;
}
async function waitFloor(session,floor,trial=false,{fallback=false}={}){
 await session.page.waitForFunction(({floor,trial,fallback})=>{
  const api=window.KotamaField3D;if(!api?.active())return false;
  const d=api.gameReviewState();if(d.builtKey!==`1-${floor}`||d.buildingKey)return false;
  const t=api.sacredTrialInfo();
  if(fallback)return !!d.trialFallback&&!d.staticTrialInfo;
  return trial?!!t&&t.presentationRevision==='closed_ruins_v3'&&t.sourceHashesVerified===true&&!!t.water:!d.staticTrialInfo&&!d.trialFallback;
 },{floor,trial,fallback},{timeout:240000});
 await session.page.waitForFunction(()=>window.KotamaField3D.gameReviewState().entries.every(e=>e.kind==='switch'||e.hasObject),null,{timeout:120000});
 await session.page.evaluate(()=>{fieldState.nextEncounter=1000000;fieldState.steps=0;});
}
async function enter(session,floor,trial=false,options={}){
 console.error('[trial]',session.name,'enter',floor+1,trial?'candidate':'legacy');
 await session.page.evaluate(async floor=>{await fieldEnterArea(1,{floor,adminSkip:true,fromHome:floor===0});},floor);
 await settle(session);await waitFloor(session,floor,trial,options);return state(session,`enter-${floor+1}F`);
}
async function teleport(session,tx,ty,direction){
 await settle(session);
 await session.page.evaluate(({tx,ty,direction})=>{
  const a=fieldArea();if(!fieldCanEnter(a,tx,ty,'player'))throw new Error('Review camera is not on a walkable tile: '+tx+','+ty);
  const p=fieldTileCenter(tx,ty);fieldState.x=p.x;fieldState.y=p.y;fieldState.dir=direction;fieldState.positioned=true;
  fieldState.view=null;fieldState.stepUntil=0;fieldState.triggerTile=`${tx},${ty}`;
  fieldInput.keys.clear();fieldInput.pad.clear();fieldInput.tap=null;fieldState.nextEncounter=1000000;fieldState.steps=0;
  fieldUpdateVision(true);fieldUpdateNear();window.KotamaField3D.build();
 },{tx,ty,direction});
 await session.page.waitForFunction(({tx,ty,direction})=>{
  const d=window.KotamaField3D.gameReviewState(),v={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]}[direction];
  return d.camera&&Math.abs(d.camera.position[0]-(tx*4-v[0]*1.1))<.08&&Math.abs(d.camera.position[1]-1.6)<.06&&Math.abs(d.camera.position[2]-(ty*4-v[1]*1.1))<.08;
 },{tx,ty,direction},{timeout:120000});
 return state(session,`camera-${tx}-${ty}-${direction}`);
}
async function screenshot(session,name){
 const only=process.env.V3_CAPTURE_ONLY?.split(',');
 if(only && !only.includes(name))return state(session,'uncaptured-'+name);
 const checkpointFile=process.env.V3_VISUAL_CHECKPOINT;
 let reused=null;
 if(checkpointFile){
  const saved=JSON.parse(fs.readFileSync(checkpointFile,'utf8'));
  assert.deepEqual(saved.source.inputs,sourceRecord.inputs,'Visual checkpoint source differs from this run');
  reused=saved.screenshots.find(r=>r.file===name+'.png');
  if(reused)assert.equal(sha(fs.readFileSync(path.join(OUT,reused.file))),reused.sha256,'Visual checkpoint PNG changed');
 }
 if(!reused)await session.page.screenshot({path:path.join(OUT,name+'.png'),timeout:180000});
 const point=await state(session,'screenshot-'+name);report.screenshots.push({file:name+'.png',session:session.name,
  area:point.area,floor:point.floor,tile:point.tile,direction:point.direction,camera:point.review.camera,
  trialActive:!!point.review.staticTrialInfo,sha256:sha(fs.readFileSync(path.join(OUT,name+'.png'))),
  ...(reused?{reusedVisualFrom:'same-input initial capture; gameplay checks rerun in fresh context'}:{})});return point;
}
function assertNativeFloor(snapshot,floor){
 const expected=sourceFloors[floor];assert.deepEqual(snapshot.map,expected.map,'Live map changed');
 const identities=objects=>objects.map(object=>{const value=clean(object);
  // Native gather setup adds gatherKind and changes the presentation label.
  // Neither is a changed object ID, position or interaction contract.
  if(value.kind==='gather'){delete value.gatherKind;delete value.name;}return value;});
 assert.deepEqual(identities(snapshot.objects),identities(expected.objects),'Live object identities changed');
 assert.deepEqual(snapshot.foeDefinitions,expected.foes,'Live FOE definitions changed');
 if(floor===2)assert.equal(snapshot.review.entries.length,expected.objects.length,'Native 3F fixed entries count changed');
 else assert(snapshot.review.entries.length>=expected.objects.length,'Missing native floor entries');
 const found=new Map(snapshot.review.entries.map(e=>[e.key,e]));
 for(const object of expected.objects){const entry=found.get(object.key);assert.ok(entry,'Missing native entry '+object.key);assert.equal(entry.kind,object.kind);
  const height=object.kind==='npc'?2.2:object.kind==='save'?1.9:object.kind==='sign'?1.8:object.onWall&&object.kind==='switch'?1.4:1.2;
  if(object.onWall&&object.kind==='switch'){
   // The legacy 1F lever is rendered on both accessible wall faces. Keep
   // those original duplicates/offsets and compare opt-in/off signatures.
   const dx=Math.abs(entry.at[0]-object.tx*4),dz=Math.abs(entry.at[2]-object.ty*4);
   assert((close(dx,2.5)&&close(dz,0))||(close(dx,0)&&close(dz,2.5)));
  }else{assert(close(entry.at[0],object.tx*4));assert(close(entry.at[2],object.ty*4));}
  assert(close(entry.at[1],height));
  assert.equal(entry.hasObject,true,'Entry has no native visual model: '+object.key);
 }
 const water=expected.map.reduce((n,row)=>n+[...row].filter(c=>c==='~').length,0);
 assert.equal(snapshot.review.waterMeshCount,water,'Native water meshes changed');
}
function fixedVisualSignature(snapshot){return snapshot.review.entries.map(({key,kind,at,objectId,sprite,hasObject,modelName,modelBounds,childNames})=>({key,kind,at,objectId,sprite,hasObject,modelName,modelBounds,childNames}));}
async function singleInput(session,key,{tile,direction,turnDelta}={}){
 const before=await state(session,'input-before-'+key);
 await session.page.evaluate(key=>{
  if(fieldState.lock||fieldState.mapOpen||fieldDialogAdvance||fieldChoiceState)throw new Error('Input fixture is blocked by dialogue');
  fieldInput.keys.clear();fieldInput.pad.clear();fieldInput.tap=null;fieldState.stepUntil=0;
  fieldInput.keys.add(key);try{window.KotamaField3D.input(fieldArea(),performance.now());}finally{fieldInput.keys.clear();fieldInput.pad.clear();fieldInput.tap=null;}
  fieldUpdateVision(true);fieldUpdateNear();
 },key);
 const after=await state(session,'input-after-'+key);
 if(tile)assert.deepEqual(after.tile,{tx:tile[0],ty:tile[1]},'Input tile mismatch for '+key);
 if(direction)assert.equal(after.direction,direction,'Direction mismatch for '+key);
 if(turnDelta!==undefined)assert.equal(after.turn-before.turn,turnDelta,'Turn count mismatch for '+key);
 report.checks.push({case:'single-exported-input',session:session.name,key,before:{tile:before.tile,direction:before.direction,turn:before.turn},after:{tile:after.tile,direction:after.direction,turn:after.turn}});
 return after;
}
async function action(session){await session.page.locator('#field-action').dispatchEvent('pointerdown');}
async function toggleProof(session){
 const before=await state(session,'toggle-before');
 await session.page.evaluate(()=>window.KotamaField3D.toggle(false));
 const off=await state(session,'toggle-false');
 await session.page.evaluate(()=>window.KotamaField3D.toggle(true));
 const on=await state(session,'toggle-true');
 assert.equal(off.active,before.active);assert.equal(on.active,true);assert.equal(off.toggleHidden,true);
 report.checks.push({case:'existing-forced-3d-policy',session:session.name,before:before.active,afterToggleFalse:off.active,afterToggleTrue:on.active,buttonHidden:off.toggleHidden,
  note:'The native game forces 3D in strata 1-5. This preserves that baseline; it is not evidence of a successful 2D transition.'});
}
async function storageProof(session){
 const result=await session.page.evaluate(()=>({harness:window.__trialHarness,saveKeys:Object.keys(localStorage).filter(k=>k==='fantasyRpgSave'||/^kotamaSaveSlot\d+$/.test(k))}));
 assert.deepEqual(result.saveKeys,[],'The isolated test must not write game save data');session.record.storage=result;
}
async function normalSessions(){
 const legacy=await createSession('legacy-off',false);
 const legacy1=await enter(legacy,0);assertNativeFloor(legacy1,0);assert.equal(legacy1.trial,null);
 await screenshot(legacy,'01-legacy-1f');await toggleProof(legacy);
 const legacy2=await enter(legacy,1);assertNativeFloor(legacy2,1);assert.equal(legacy2.trial,null);assert.equal(legacy2.review.environment.far,48);
 const legacy3=await enter(legacy,2);assertNativeFloor(legacy3,2);assert.equal(legacy3.trial,null);
 await teleport(legacy,5,15,'right');await screenshot(legacy,'02-legacy-3f-trial-off');
 assert.equal(legacy.record.candidateRequests.length,0,'Opt-out game must not fetch candidate assets');
 await storageProof(legacy);await legacy.context.close();

 const trial=await createSession('trial-on',true);
 const trial1=await enter(trial,0);assertNativeFloor(trial1,0);assert.equal(trial1.trial,null);
 assert.deepEqual(fixedVisualSignature(trial1),fixedVisualSignature(legacy1),'Opt-in changed native 1F interactable presentation');
 assert.equal(trial.record.candidateRequests.length,0,'Opt-in 1F must remain on native assets');
 await screenshot(trial,'03-optin-1f-unchanged');
 const trial2=await enter(trial,1);assertNativeFloor(trial2,1);assert.equal(trial2.trial,null);
 assert.deepEqual(fixedVisualSignature(trial2),fixedVisualSignature(legacy2),'Opt-in changed native 2F fixed presentation');
 assert.equal(trial.record.candidateRequests.length,0,'Opt-in 2F must remain on native assets');
 const first=await enter(trial,2,true);assertNativeFloor(first,2);
 const info=first.trial;
 const expectedCounts={floors:candidate.floorPlacements.length,walls:candidate.boundaryWallPlacements.length,
  props:candidate.candidatePropPlacements.length,dressingGround:candidate.dressingGroundPlacements.length,
  ceilings:candidate.ceilingPlacements.length,fixedObjectsPreserved:sourceFloors[2].objects.length};
 for(const[key,value]of Object.entries(expectedCounts))assert.equal(info[key],value,'Static V3 count: '+key);
 assert.equal(info.placements,Object.values(expectedCounts).slice(0,5).reduce((a,b)=>a+b,0),'All V3 placements were not consumed');
 assert.equal(info.sourceHashesVerified,true);
 const profiles=candidate.floorPlacements.reduce((counts,row)=>(counts[row.renderProfile]=(counts[row.renderProfile]||0)+1,counts),{});
 assert.deepEqual(info.profileCounts,profiles);assert.equal(info.presentationRevision,'closed_ruins_v3');
 const sourceFiles=new Set([...manifest.assets.map(a=>KIT+a.file),...(candidate.revisionSources||[]).map(a=>a.file),...candidate.ceilingPlacements.map(r=>r.file)]);
 assert.equal(info.sourceCount,sourceFiles.size);assert(info.sourceCount>=18);
 assert.equal(info.revisionSourceCount,candidate.revisionSources.length);
 const hashes=new Map(sourceRecord.inputs.map(r=>[r.file,r.sha256]));
 for(const file of sourceFiles)assert.equal(info.sourceSHA[file],hashes.get(file),'Verified source hash does not match actual file: '+file);
 assert.equal(candidate.closedRuinsV3.roof.openings.length,3,'V3 must retain exactly three local roof openings');
 assert(candidate.closedRuinsV3.roof.walkFloorCoverage>=.9,'V3 roof coverage must be at least 90%');
 assert.equal(candidate.closedRuinsV3.roof.openingCount,3);
 const ceilingCells=new Set(candidate.ceilingPlacements.map(row=>[row.position[0]/4,row.position[2]/4].join(',')));
 const covered=candidate.floorPlacements.filter(row=>ceilingCells.has(row.tile.join(','))).length;
 assert.equal(covered,candidate.closedRuinsV3.roof.coveredWalkFloorCells);
 assert.equal(candidate.closedRuinsV3.roof.walkFloorCells,candidate.floorPlacements.length);
 assert(covered/candidate.floorPlacements.length>=.9,'Actual roof placements do not cover 90% of floor centres');
 assert.deepEqual(info.roof,candidate.closedRuinsV3.roof);
 const torii=candidate.candidatePropPlacements.find(row=>row.id==='root_approach_torii');
 const shrine=candidate.candidatePropPlacements.find(row=>row.assetId==='sacred_hokora_shrine');
 assert(torii&&shrine,'Missing connected shrine landmarks');
 assert.deepEqual(torii.position,candidate.closedRuinsV3.sacredAxis.torii);
 assert.deepEqual(shrine.position,candidate.closedRuinsV3.sacredAxis.shrine);
 assert(close(torii.position[2],shrine.position[2]));
 assert(close(Math.hypot(torii.position[0]-shrine.position[0],torii.position[2]-shrine.position[2]),6));
 assert(close(shrine.rotationY,Math.PI/2));assert(close(torii.rotationY,-Math.PI/2));
 assert.equal(info.water.nativeWaterMeshes,11);assert.equal(info.water.waterTiles,11);
 assert.equal(info.water.worldCoordinateNormals,true);assert.equal(info.water.reflectionRenderTargets,0);
 report.checks.push({case:'closed-roof-sources-and-water',counts:expectedCounts,sourceCount:info.sourceCount,roof:info.roof,water:info.water});
 assert.equal(info.realDevicePerformanceApproved,false);assert.equal(first.review.trialFallback,null);
 assert.equal(first.review.environment.far,40);assert(close(first.review.environment.fogDensity,.045,1e-8));assert.equal(legacy3.review.environment.far,48);
 assert.deepEqual(fixedVisualSignature(first),fixedVisualSignature(legacy3),'Trial changed native fixed model/anchor presentation');
 await trial.page.waitForFunction(()=>window.KotamaField3D.gameReviewState().foes.length>0&&window.KotamaField3D.gameReviewState().foes.every(f=>f.textureLoaded),null,{timeout:120000});
 const foes=await state(trial,'native-foe-models');
 assert.equal(foes.review.foes.length,sourceFloors[2].foes.length);
 assert(foes.review.foes.every(f=>f.meshOrSprite==='Sprite'&&f.visible&&f.textureLoaded));
 assert(foes.review.foes.every(f=>f.textureRasterized===true),'3F dragon FOE SVG was not rasterized before upload');
 for(const foe of foes.review.foes)assert.deepEqual(foe.textureSize,[512,512],'FOE raster source dimensions changed');
 await teleport(trial,5,15,'right');await screenshot(trial,'04-trial-approach');
 await teleport(trial,13,4,'up');await screenshot(trial,'05-trial-shrine-surroundings');
 await teleport(trial,21,10,'right');await screenshot(trial,'06-trial-water-edge');
 await teleport(trial,14,11,'up');await screenshot(trial,'14-v3-water-facing-north');
 await teleport(trial,15,3,'left');await screenshot(trial,'15-v3-torii-shrine-axis');
 await teleport(trial,7,15,'right');await screenshot(trial,'16-v3-enclosed-root-vault');
 const waterBefore=await trial.page.evaluate(()=>window.KotamaField3D.sacredTrialInfo().water);
 await trial.page.waitForFunction(previous=>window.KotamaField3D.sacredTrialInfo()?.water?.animatedTimeSeconds>previous,waterBefore.animatedTimeSeconds,{timeout:60000,polling:100});
 const waterAfter=await trial.page.evaluate(()=>window.KotamaField3D.sacredTrialInfo().water);
 assert.equal(waterAfter.shaderCompiled,true,'V3 water shader never compiled');
 assert(waterAfter.animatedTimeSeconds>waterBefore.animatedTimeSeconds,'V3 water time did not advance');
 report.checks.push({case:'v3-water-compiled-and-advancing',before:waterBefore,after:waterAfter});

 await teleport(trial,5,15,'up');
 await singleInput(trial,'ArrowUp',{tile:[5,15],direction:'up',turnDelta:0});
 await singleInput(trial,'ArrowRight',{tile:[5,15],direction:'right',turnDelta:0});
 await singleInput(trial,'ArrowUp',{tile:[6,15],direction:'right',turnDelta:1});
 await singleInput(trial,'ArrowLeft',{tile:[6,15],direction:'up',turnDelta:0});
 await teleport(trial,10,12,'up');
 await singleInput(trial,'e',{tile:[11,12],direction:'up',turnDelta:1});
 await singleInput(trial,'ArrowDown',{tile:[11,13],direction:'up',turnDelta:1});
 await singleInput(trial,'ArrowUp',{tile:[11,12],direction:'up',turnDelta:1});

 await teleport(trial,11,6,'left');
 const chestBefore=await state(trial,'chest-closed');const chestKey='chest:1-2:10:6';
 const chestEntryBefore=chestBefore.review.entries.find(e=>e.key===chestKey);assert.equal(chestEntryBefore.state,'closed');
 assert.equal(chestBefore.nearKey,chestKey);await screenshot(trial,'07-trial-chest-closed');
 await action(trial);await settle(trial);
 await trial.page.waitForFunction(({key,uuid})=>{const e=window.KotamaField3D.gameReviewState().entries.find(e=>e.key===key);return fieldState.flags[key]===true&&e?.state==='open'&&e.hasObject&&e.objectUuid!==uuid;},{key:chestKey,uuid:chestEntryBefore.objectUuid},{timeout:120000});
 const chestAfter=await state(trial,'chest-open');assert.equal(chestAfter.gold-chestBefore.gold,80);
 await screenshot(trial,'08-trial-chest-open');await action(trial);await settle(trial);
 const emptyChest=await state(trial,'chest-repeat-no-reward');assert.equal(emptyChest.gold,chestAfter.gold);
 report.checks.push({case:'native-chest-state-and-model-swap',key:chestKey,before:chestEntryBefore,
  after:chestAfter.review.entries.find(e=>e.key===chestKey),goldDelta:80,repeatGoldDelta:0});

 await teleport(trial,4,14,'left');const npcBefore=await state(trial,'woodcutter-facing');assert.equal(npcBefore.nearKey,'npc:1:woodcutter');
 await action(trial);await settle(trial);await state(trial,'woodcutter-dialogue-completed');
 await teleport(trial,21,9,'right');const signBefore=await state(trial,'sign-facing');assert.equal(signBefore.nearKey,'sign:1-2:22:9');
 await action(trial);await settle(trial);await state(trial,'sign-dialogue-completed');
 await teleport(trial,23,3,'right');const lampBefore=await state(trial,'save-lamp-facing');assert.equal(lampBefore.nearKey,'save:1-2:24:3');
 await trial.page.evaluate(()=>{for(const c of getParty())c.hp=Math.max(1,effectiveStats(c).maxHp-5);});
 await action(trial);await settle(trial,{choice:'cancel'});
 const lamp=await trial.page.evaluate(()=>({checkpoint:fieldState.checkpoint,fullyHealed:getParty().every(c=>c.hp===effectiveStats(c).maxHp),saveDialogHidden:document.getElementById('save-dialog').hidden}));
 assert.equal(lamp.checkpoint.area,1);assert.equal(lamp.checkpoint.floor,2);assert.equal(lamp.fullyHealed,true);assert.equal(lamp.saveDialogHidden,true);
 report.checks.push({case:'native-lamp-heal-and-checkpoint',...lamp,persistenceSuppressed:true});
 await teleport(trial,22,2,'up');const gate=await state(trial,'native-boss-gate-visible');assert(gate.review.entries.find(e=>e.kind==='gate'&&e.hasObject));
 await screenshot(trial,'09-trial-boss-gate');await toggleProof(trial);

 // Exercise the actual stair prompt and fieldGoFloor path both directions.
 await teleport(trial,1,15,'down');await singleInput(trial,'ArrowUp',{tile:[1,16],direction:'down'});
 await settle(trial,{choice:'accept'});await waitFloor(trial,1,false);const floor2=await state(trial,'stairs-to-native-2f');assertNativeFloor(floor2,1);
 assert.equal(floor2.review.environment.far,48);assert(close(floor2.review.environment.fogDensity,.042,1e-8));
 report.checks.push({case:'trial-closed-ruins-to-native-environment-restored',trial:first.review.environment,native2F:floor2.review.environment});
 await screenshot(trial,'10-return-native-2f');
 await teleport(trial,25,2,'up');await singleInput(trial,'ArrowUp',{tile:[25,1],direction:'up'});
 await settle(trial,{choice:'accept'});await waitFloor(trial,2,true);const again=await state(trial,'stairs-return-trial-3f');assertNativeFloor(again,2);
 assert.equal(again.review.entries.find(e=>e.key===chestKey).state,'open','Chest flag/model did not survive floor revisit');
 assert.equal(again.trial.sourceHashesVerified,true);

 await teleport(trial,7,15,'right');const preBattle=await state(trial,'before-battle');
 await trial.page.evaluate(()=>fieldStartEncounterBattle('stray-slime'));
 await trial.page.waitForFunction(()=>state.screen==='battle'&&battleState.encounterMode===true,null,{timeout:90000});
 report.checks.push({case:'native-encounter-start',...(await trial.page.evaluate(()=>({screen:state.screen,enemyId:battleState.fieldEnemyId,encounterMode:battleState.encounterMode})))});
 await screenshot(trial,'11-native-battle-transition');
 await trial.page.evaluate(()=>fieldReturnFromBattle({retreat:true}));await settle(trial);await waitFloor(trial,2,true);
 const returned=await state(trial,'battle-return-trial-3f');assert.equal(returned.screen,'field');assert.deepEqual(returned.tile,preBattle.tile);assertNativeFloor(returned,2);
 assert.equal(returned.review.entries.find(e=>e.key===chestKey).state,'open');
 await screenshot(trial,'12-trial-battle-return');
 await storageProof(trial);await trial.context.close();
}
async function mismatchFallback(){
 const broken=await createSession('sha-mismatch-fallback',true,{badManifest:true});
 const fallback=await enter(broken,2,false,{fallback:true});assertNativeFloor(fallback,2);
 assert.equal(fallback.review.staticTrialInfo,null);assert.ok(fallback.review.trialFallback);
 assert.match(fallback.review.trialFallback,/sha|hash|pin|source/i);assert(broken.record.injectedManifestResponses>0);
 await teleport(broken,5,15,'right');await screenshot(broken,'13-source-mismatch-legacy-fallback');
 const first=await enter(broken,0,false);assertNativeFloor(first,0);assert.equal(first.active,true);assert.equal(first.review.trialFallback,null);
 report.checks.push({case:'source-sha-mismatch-falls-back-to-native',injectedManifestResponses:broken.record.injectedManifestResponses,
  fallbackReason:fallback.review.trialFallback,nativeEntries:fallback.review.entries.length,waterMeshes:fallback.review.waterMeshCount,
  firstFloorStillActive:first.active,expectedWarnings:broken.record.warnings});
 await storageProof(broken);await broken.context.close();
}
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(PORT,'127.0.0.1',resolve);});
 browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/chromium',headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']});
 try{
  if(process.argv.includes('--water-review')){
   report.scope='Supplementary real index.html north-facing water review; not the full gameplay suite';
   const session=await createSession('water-review',true);
   const snapshot=await enter(session,2,true);assertNativeFloor(snapshot,2);
   await teleport(session,14,11,'up');await screenshot(session,'14-trial-water-facing-north');
   await storageProof(session);
   assert.deepEqual(session.record.pageErrors,[]);assert.deepEqual(session.record.consoleErrors,[]);
   assert.deepEqual(frozenInputs(),sourceRecord.inputs,'Inputs changed during water review');
   report.passed=true;report.verifiedAt=new Date().toISOString();
   fs.writeFileSync(path.join(OUT,'water-review-verification.json'),JSON.stringify(report,null,2)+'\n');
   console.log(JSON.stringify({passed:true,scope:report.scope,screenshots:report.screenshots.length}));
   return;
  }
  await normalSessions();await mismatchFallback();
  const positiveTrial=report.sessions.find(session=>session.name==='trial-on');
  assert.deepEqual(positiveTrial.warnings.filter(warning=>/WebGL|texSubImage|texImage|GL_INVALID|Texture is immutable/i.test(warning.text)),[],
   'Positive trial emitted WebGL texture upload warnings');
  for(const session of report.sessions){assert.deepEqual(session.pageErrors,[],session.name+': page errors');assert.deepEqual(session.consoleErrors,[],session.name+': console errors');
   assert.deepEqual(session.requestFailures.filter(r=>r.url.includes('/'+KIT)||r.url.includes('/'+V3KIT)||r.url.includes('field-3d-b1-sacred-trial')||r.url.includes('f1-closed-water-v3')),[],session.name+': candidate request failed');}
  assert.deepEqual(frozenInputs(),sourceRecord.inputs,'Input assets, runtime or candidate changed during QA');
  report.passed=true;report.verifiedAt=new Date().toISOString();
  report.limitations.push('Native strata 1-5 force 3D; 2D toggle policy was preserved, not changed or certified as a 2D transition.',
   'Fixed-object visibility, dialogue, chest reward/state, stair transitions and encounter return are smoke checks; the entire game and long-play progression are not certified.',
   'Software-renderer draw/triangle counters are diagnostics only; real-device FPS remains unapproved.',
   'Roof, shrine axis, water and material views are actual captures for artistic review; metadata/count assertions alone do not certify artistic quality.');
  fs.writeFileSync(path.join(OUT,'game-v3-verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:true,sessions:report.sessions.length,checks:report.checks.length,screenshots:report.screenshots.length,
   report:path.join(OUT,'game-v3-verification.json')},null,2));
 }catch(error){report.passed=false;report.error={message:error.message,stack:error.stack};report.failedAt=new Date().toISOString();
  fs.writeFileSync(path.join(OUT,'game-v3-failure.json'),JSON.stringify(report,null,2)+'\n');throw error;
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
