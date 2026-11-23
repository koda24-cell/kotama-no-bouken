/* Real index.html smoke/regression checks for the opt-in F1/3F closed-ruins V4 trial.
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
const OUT=process.env.GAME_TRIAL_OUT||path.join(ROOT,'docs/reviews/f1-v5-game');
const KIT='assets/3d/dungeons/b1_sacred_forest_candidates/';
const V3KIT='assets/3d/dungeons/b1_closed_ruins_v3/';
const candidate=JSON.parse(fs.readFileSync(path.join(ROOT,KIT+'scene/game-layout-v5.json'),'utf8'));
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
 const files=[KIT+'scene/game-layout-v5.json',KIT+'scene/game-layout-candidate.json',KIT+'manifest.json',
  ...manifest.assets.map(a=>KIT+a.file),
  ...(candidate.revisionSources||[]).map(a=>a.file),
  'field/f1-closed-water-v4.js','field/f1-aperture-light-v4.js','field/f1-aperture-light-v5.js','field/f1-ceiling-seal-v5.js','field/f1-layer-progression-v4.js',
  ...fs.readdirSync(path.join(ROOT,V3KIT+'textures')).filter(f=>/\.(png|jpe?g|json)$/i.test(f)).map(f=>V3KIT+'textures/'+f),
  ...new Set(candidate.ceilingPlacements.map(c=>c.file)),
  'index.html','field.js','data/field-maps.js','field/field-3d-view.js','field/field-3d-b1-sacred-trial.js',
  'preview/f1-foliage-coverage.js',
  'field/field-movement-foe.js','field/field-interactions.js','field/field-navigation.js','field/field-persistence.js','field/field-puzzles.js'];
 return [...new Set(files)].map(file=>({file,sha256:sha(fs.readFileSync(path.join(ROOT,file)))}));
}
const sourceRecord={commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
 inputs:frozenInputs(),candidateMapSha256:candidate.beforeFingerprint.mapSha256};
const report={scope:'Real index.html closed ruins V5 opt-in visual trial; gameplay smoke checks with isolated fixtures, not full game certification or real-device FPS approval',
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
  review:window.KotamaField3D.gameReviewState(),render:window.KotamaField3D.renderInfo(),gold:state.gold,nearKey:fieldState.nearKey,
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
  return trial?!!t&&t.presentationRevision==='closed_ruins_v4'&&t.sourceHashesVerified===true&&!!t.water:!d.staticTrialInfo&&!d.trialFallback;
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

async function main(){
 fs.mkdirSync(OUT,{recursive:true});await new Promise(resolve=>server.listen(PORT,'127.0.0.1',resolve));
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 try{
  if(process.argv.includes('--supplementary')){await supplementary();return;}
  const trial=await createSession('v4-trial',true);const third=await enter(trial,2,true);assertNativeFloor(third,2);
  assert.equal(third.trial.aperture.spotLights,3);assert.equal(third.trial.aperture.visibleEmitterMeshes,0);assert(third.trial.ceilingSeal.backingRoofTiles>0);assert.equal(third.trial.water.reflectionRenderTargets,1);
  await teleport(trial,5,15,'up');await singleInput(trial,'w',{tile:[5,14],turnDelta:1});
  await teleport(trial,5,14,'right');await singleInput(trial,'w',{tile:[5,14],turnDelta:0});
  for(const[x,z,dir,name]of[[5,15,'up','01-v4-root-passage'],[13,3,'left','02-v4-shrine-dead-end'],[13,7,'right','03-v4-water-reflection'],[13,8,'right','04-v4-water-shaft'],[6,3,'right','05-v4-arch-front'],[9,3,'left','06-v4-arch-back']]){
    if(process.env.V3_CAPTURE_ONLY&&!process.env.V3_CAPTURE_ONLY.split(',').includes(name))continue;
    await teleport(trial,x,z,dir);
    await trial.page.waitForFunction(()=>{const t=window.KotamaField3D.sacredTrialInfo();return t?.water?.shaderCompiled&&t.water.reflectionUpdates>0;},null,{timeout:180000});
    await screenshot(trial,name);
  }
  await teleport(trial,3,11,'down');await screenshot(trial,'12-v5-aperture-no-emitter');
  await teleport(trial,13,10,'up');await screenshot(trial,'13-v5-nature-corridor');
  await teleport(trial,9,6,'right');await screenshot(trial,'14-v5-native-chest-visible');await settle(trial);let pre=await state(trial,'chest-before');
  if(pre.nearKey!=='chest:1-2:10:6')console.error('Chest near key',pre.nearKey);
  await action(trial);await settle(trial);let post=await state(trial,'chest-after');
  assert.equal(post.gold-pre.gold,80,'Chest reward changed');await action(trial);await settle(trial);assert.equal((await state(trial,'chest-repeat')).gold,post.gold,'Chest pays twice');
  report.checks.push({case:'native-chest-once',reward:80});
  const two=await enter(trial,1,false);assertNativeFloor(two,1);assert(two.review.firstLayerProgressionInfo?.sourceHashesVerified);await screenshot(trial,'07-v4-2f-progression');
  const one=await enter(trial,0,false);assertNativeFloor(one,0);assert(one.review.firstLayerProgressionInfo?.sourceHashesVerified);await screenshot(trial,'08-v4-1f-progression');
  assert(two.review.firstLayerProgressionInfo.counts.moss>one.review.firstLayerProgressionInfo.counts.moss,'Progression density absent');
  report.checks.push({case:'first-two-native-maps-objects-and-gradual-dressing',first:one.review.firstLayerProgressionInfo,second:two.review.firstLayerProgressionInfo});
  await storageProof(trial);await trial.context.close();
  const legacy=await createSession('legacy-unflagged',false);const native=await enter(legacy,2,false);assertNativeFloor(native,2);assert.equal(native.review.firstLayerProgressionInfo,null);await storageProof(legacy);await legacy.context.close();
  const broken=await createSession('hash-fallback',true,{badManifest:true});const fallback=await enter(broken,2,false,{fallback:true});assertNativeFloor(fallback,2);assert.match(fallback.review.trialFallback,/sha|hash|pin|source/i);await storageProof(broken);await broken.context.close();
  report.checks.push({case:'unflagged-native-and-hash-mismatch-fallback',passed:true});
  for(const session of report.sessions){assert.deepEqual(session.pageErrors,[]);assert.deepEqual(session.consoleErrors,[],session.name+' console errors');}
  assert.deepEqual(frozenInputs(),sourceRecord.inputs);report.passed=true;report.verifiedAt=new Date().toISOString();
  report.limitations=['SwiftShader diagnostics are not real-device FPS approval.','Direct floor entry validates staging; long-play progression/battle and manual artistic approval remain separate.'];
  fs.writeFileSync(path.join(OUT,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,screenshots:report.screenshots.length,checks:report.checks.length}));
 }catch(error){report.error={message:error.message,stack:error.stack};fs.writeFileSync(path.join(OUT,'failure.json'),JSON.stringify(report,null,2));throw error;}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

async function supplementary(){
 report.scope='V5 supplementary corrected cameras, real stairs, native interactions and encounter return';
 const trial=await createSession('v4-supplementary',true);await enter(trial,2,true);
 for(const[x,z,dir,name]of[[13,7,'right','09-v4-water-corrected-view'],[6,3,'right','10-v4-arch-front-corrected-view']]){if(process.env.V3_CAPTURE_ONLY&&!process.env.V3_CAPTURE_ONLY.split(',').includes(name))continue;await teleport(trial,x,z,dir);await screenshot(trial,name);}
 await teleport(trial,3,13,'down');assert.equal((await state(trial,'npc')).nearKey,'npc:1:woodcutter');await action(trial);await settle(trial);
 await teleport(trial,21,9,'right');assert.equal((await state(trial,'sign')).nearKey,'sign:1-2:22:9');await action(trial);await settle(trial);
 await teleport(trial,23,3,'right');assert.equal((await state(trial,'lamp')).nearKey,'save:1-2:24:3');
 await trial.page.evaluate(()=>{for(const c of getParty())c.hp=Math.max(1,effectiveStats(c).maxHp-5);});await action(trial);await settle(trial,{choice:'cancel'});
 const heal=await trial.page.evaluate(()=>({checkpoint:fieldState.checkpoint,fullyHealed:getParty().every(c=>c.hp===effectiveStats(c).maxHp),saveDialogHidden:document.getElementById('save-dialog').hidden}));assert.equal(heal.checkpoint.floor,2);assert(heal.fullyHealed&&heal.saveDialogHidden);report.checks.push({case:'npc-sign-healing-checkpoint',...heal});
 await teleport(trial,1,15,'down');await singleInput(trial,'ArrowUp',{tile:[1,16],direction:'down'});await settle(trial,{choice:'accept'});await waitFloor(trial,1,false);
 const two=await state(trial,'actual-stair-to-2f');assertNativeFloor(two,1);assert(two.review.firstLayerProgressionInfo);
 await teleport(trial,25,2,'up');await singleInput(trial,'ArrowUp',{tile:[25,1],direction:'up'});await settle(trial,{choice:'accept'});await waitFloor(trial,2,true);assertNativeFloor(await state(trial,'actual-stair-return'),2);
 report.checks.push({case:'native-stairs-both-directions',passed:true});
 await teleport(trial,5,14,'up');const before=await state(trial,'before-encounter');await trial.page.evaluate(()=>fieldStartEncounterBattle('stray-slime'));
 await trial.page.waitForFunction(()=>state.screen==='battle'&&battleState.encounterMode===true,null,{timeout:90000});
 await trial.page.evaluate(()=>fieldReturnFromBattle({retreat:true}));await settle(trial);await waitFloor(trial,2,true);const returned=await state(trial,'encounter-return');assert.equal(returned.screen,'field');assert.deepEqual(returned.tile,before.tile);assertNativeFloor(returned,2);report.checks.push({case:'native-encounter-and-return',passed:true});
 await storageProof(trial);assert.deepEqual(trial.record.pageErrors,[]);assert.deepEqual(trial.record.consoleErrors,[]);await trial.context.close();
 assert.deepEqual(frozenInputs(),sourceRecord.inputs);report.passed=true;fs.writeFileSync(path.join(OUT,'supplementary-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,scope:report.scope,checks:report.checks.length,screenshots:report.screenshots.length}));
}
