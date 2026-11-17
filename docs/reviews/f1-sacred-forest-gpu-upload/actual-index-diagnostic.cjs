/* Real index.html smoke/regression checks for the opt-in F1/3F visual trial.
 * Usage: node tools/f1-sacred-forest/verify-game-trial.cjs
 * Uses isolated browser contexts; suppresses game save writes in the harness.
 * Never edits the game, map, candidate descriptor or individual model files.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process'),vm=require('node:vm');
const ROOT=process.env.KOTAMA_ROOT||path.resolve(__dirname,'../../..');
const MODULES=process.env.BROWSER_MODULES||'/workspace/work/browser/node_modules';
const THREE=process.env.THREE_DIR||path.join(MODULES,'three');
const {chromium}=require(process.env.PLAYWRIGHT||path.join(MODULES,'playwright-core'));
const PORT=Number(process.env.GAME_TRIAL_PORT||8797);
const OUT=process.env.GAME_TRIAL_OUT||path.join(ROOT,'docs/reviews/f1-sacred-forest-game-trial');
const KIT='assets/3d/dungeons/b1_sacred_forest_candidates/';
const candidate=JSON.parse(fs.readFileSync(path.join(ROOT,KIT+'scene/game-layout-trial.json'),'utf8'));
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
 const files=[KIT+'scene/game-layout-trial.json',KIT+'scene/game-layout-candidate.json',KIT+'manifest.json',
  ...manifest.assets.map(a=>KIT+a.file),
  ...new Set(candidate.ceilingPlacements.map(c=>c.file)),
  'index.html','field.js','data/field-maps.js','field/field-3d-view.js','field/field-3d-b1-sacred-trial.js',
  'preview/f1-foliage-coverage.js',
  'field/field-movement-foe.js','field/field-interactions.js','field/field-navigation.js','field/field-persistence.js','field/field-puzzles.js'];
 return [...new Set(files)].map(file=>({file,sha256:sha(fs.readFileSync(path.join(ROOT,file)))}));
}
const sourceRecord={commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
 inputs:frozenInputs(),candidateMapSha256:candidate.beforeFingerprint.mapSha256};
const report={scope:'Real index.html opt-in visual trial; gameplay smoke checks with isolated fixtures, not full game certification or real-device FPS approval',
 engine:'Chromium SwiftShader / Three.js r180',source:sourceRecord,autoSaveDisabled:true,
 fixtureNotes:['Fresh browser contexts only; no user browser profile or existing saves.',
  'Party/tutorial/unlock flags are test fixtures. Camera review points use validated walk cells.',
  'Movement uses the real exported KotamaField3D.input once per action to avoid short-key loss under slow software rendering.',
  'Save/load persistence is deliberately suppressed and is not certified by these tests.'],
 sessions:[],checks:[],screenshots:[],limitations:[],passed:false};
let browser;

async function createSession(name,optIn,{badManifest=false}={}){
 const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
 await context.addInitScript(instrumentWebGL);
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
   if(/404|Failed to load resource/.test(value.text)&&!value.url.includes('b1_sacred_forest_candidates'))record.resource404.push(value);
   else record.consoleErrors.push(value);
  }else if(message.type()==='warning')record.warnings.push(value);
 });
 page.on('response',response=>{if(response.status()===404)record.resource404.push({url:response.url(),status:404});});
 page.on('requestfailed',request=>{if(!/favicon\.ico/.test(request.url()))record.requestFailures.push({url:request.url(),error:request.failure()?.errorText});});
 page.on('request',request=>{if(request.url().includes('/'+KIT))record.candidateRequests.push(request.url());});
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
  return trial?!!t&&t.floors===274&&t.sourceHashesVerified===true:!d.staticTrialInfo&&!d.trialFallback;
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
 await session.page.screenshot({path:path.join(OUT,name+'.png'),timeout:180000});
 const point=await state(session,'screenshot-'+name);report.screenshots.push({file:name+'.png',session:session.name,
  area:point.area,floor:point.floor,tile:point.tile,direction:point.direction,camera:point.review.camera,
  trialActive:!!point.review.staticTrialInfo});return point;
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

function instrumentWebGL() {
 const log=window.__glDiag={phase:'init',uploads:0,phaseCounts:{},errors:[],recent:[],textureDeletes:[],bitmapCloses:[],bitmapCreates:[]};
 const glStates=new WeakMap(),ids=new WeakMap();let nextID=1;
 const id=x=>{if(!x)return null;if(!ids.has(x))ids.set(x,nextID++);return ids.get(x);};
 const summary=x=>{
  if(x===null||typeof x!=='object')return x;
  const o={type:x.constructor?.name,id:id(x)};
  for(const k of ['width','height','naturalWidth','naturalHeight','videoWidth','videoHeight','complete','byteLength','byteOffset','length','size'])if(typeof x[k]!=='undefined')o[k]=x[k];
  if(x.src)o.src=String(x.src).slice(0,170);
  if(x instanceof Blob)o.mime=x.type;
  return o;
 };
 const glState=gl=>{if(!glStates.has(gl))glStates.set(gl,{id:id(gl),active:33984,bindings:new Map(),textures:new Map()});return glStates.get(gl);};
 for(const Klass of [window.WebGLRenderingContext,window.WebGL2RenderingContext].filter(Boolean)){
  const p=Klass.prototype,getError=p.getError;
  for(const name of ['activeTexture','bindTexture','deleteTexture','texStorage2D','texImage2D','texSubImage2D']){
   const original=p[name];if(!original)continue;
   Object.defineProperty(p,name,{configurable:true,writable:true,value:function(...args){
    const state=glState(this);
    if(name==='activeTexture')state.active=args[0];
    if(name==='bindTexture')state.bindings.set(state.active+':'+args[0],args[1]);
    if(name==='deleteTexture'){log.textureDeletes.push({phase:log.phase,id:id(args[0])});return original.apply(this,args);}
    if(name==='activeTexture'||name==='bindTexture')return original.apply(this,args);
    const texture=state.bindings.get(state.active+':'+args[0]),textureID=id(texture),prior=getError.call(this);
    const call={phase:log.phase,method:name,context:state.id,unit:state.active,textureID,args:args.map(summary),priorError:prior};
    const existing=state.textures.get(textureID);if(existing)call.storage={...existing};
    let result,exception;
    try{result=original.apply(this,args);}catch(e){exception=String(e);}
    call.error=getError.call(this);
    if(name==='texStorage2D'&&!call.error)state.textures.set(textureID,{levels:args[1],internalFormat:args[2],width:args[3],height:args[4],immutable:true});
    log.uploads++;log.phaseCounts[log.phase]=(log.phaseCounts[log.phase]||0)+1;log.recent.push(call);if(log.recent.length>100)log.recent.shift();
    if(call.error||exception||prior){call.exception=exception;call.stack=new Error().stack;call.previous=log.recent.slice(-8,-1).map(x=>({...x,previous:undefined}));log.errors.push(call);}
    if(exception)throw Error(exception);
    return result;
   }});
  }
 }
 if(window.ImageBitmap){const close=ImageBitmap.prototype.close;ImageBitmap.prototype.close=function(){log.bitmapCloses.push({phase:log.phase,image:summary(this),stack:new Error().stack});return close.call(this);};}
 if(window.createImageBitmap){const create=window.createImageBitmap;window.createImageBitmap=function(...args){return create.apply(this,args).then(image=>{log.bitmapCreates.push({phase:log.phase,image:summary(image),source:summary(args[0])});return image;});};}
}


async function mainDiagnostic(){
 fs.mkdirSync(OUT,{recursive:true});await new Promise((r,j)=>{server.once('error',j);server.listen(PORT,'127.0.0.1',r);});
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']});
 const snapshots=[];let session;
 async function phase(name){await session.page.evaluate(name=>window.__glDiag.phase=name,name);console.error('[GPU phase]',name);}
 async function snap(label){const d=await session.page.evaluate(()=>JSON.parse(JSON.stringify(window.__glDiag)));snapshots.push({label,at:new Date().toISOString(),uploadCount:d.uploads,errorCount:d.errors.length});fs.writeFileSync(path.join(OUT,'diagnostic-live.json'),JSON.stringify({session:session.record,gl:d,snapshots},null,2));}
 try{
  session=await createSession('gpu-instrumented',true);
  await phase('native-1f-first');await enter(session,0,false);await snap('native-1f-first');
  await phase('trial-3f-first');await enter(session,2,true);await teleport(session,7,15,'right');await session.page.waitForTimeout(1200);await snap('trial-3f-first');
  await phase('trial-shrine-camera');await teleport(session,13,4,'up');await session.page.waitForTimeout(1200);await snap('trial-shrine-camera');
  await phase('trial-water-camera');await teleport(session,21,10,'right');await session.page.waitForTimeout(1200);await snap('trial-water-camera');
  await phase('native-2f-after-trial');await enter(session,1,false);await snap('native-2f-after-trial');
  await phase('trial-3f-cached-return');await enter(session,2,true);await teleport(session,7,15,'right');await session.page.waitForTimeout(1200);await snap('trial-3f-cached-return');
  await phase('native-battle');await session.page.evaluate(()=>fieldStartEncounterBattle('stray-slime'));await session.page.waitForFunction(()=>state.screen==='battle'&&battleState.encounterMode,null,{timeout:90000});await snap('native-battle');
  await phase('trial-battle-return');await session.page.evaluate(()=>fieldReturnFromBattle({retreat:true}));await settle(session);await waitFloor(session,2,true);await session.page.waitForTimeout(1200);await snap('trial-battle-return');
  await storageProof(session);const gl=await session.page.evaluate(()=>JSON.parse(JSON.stringify(window.__glDiag)));
  const result={scope:'Actual index.html upload instrumentation, diagnostic only; no runtime files changed',phaseSnapshots:snapshots,gl,session:session.record};
  fs.writeFileSync(path.join(OUT,'gpu-diagnostic.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({errors:gl.errors.length,uploads:gl.uploads,warnings:session.record.warnings.filter(w=>/WebGL|GL_INVALID/.test(w.text)),snapshots},null,2));
 }catch(e){fs.writeFileSync(path.join(OUT,'diagnostic-failure.json'),JSON.stringify({error:e.message,stack:e.stack,snapshots,session:session?.record},null,2));if(session)await snap('failure').catch(()=>{});throw e;}
 finally{await browser.close();await new Promise(r=>server.close(r));}
}
mainDiagnostic().catch(e=>{console.error(e);server.close();process.exitCode=1;});
