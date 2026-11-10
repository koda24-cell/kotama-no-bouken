const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('playwright');
// THREE_DIR points to a local Three.js r180 package; no runtime dependencies are added.
const ROOT=process.env.TEST_ROOT || path.resolve(__dirname,'../..'),OUT=process.argv[2] || '/tmp/b5-integration-shots';fs.mkdirSync(OUT,{recursive:true});
const server=http.createServer((q,s)=>{const p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));fs.readFile(p,(e,d)=>{s.writeHead(e?404:200,{'Content-Type':({'.js':'text/javascript','.html':'text/html','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png'})[path.extname(p)]||'application/octet-stream'});s.end(e?'':d)})}).listen(8775);
(async()=>{
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const ctx=await b.newContext({viewport:{width:1280,height:800}});
await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/(.*)/,r=>r.fulfill({path:(process.env.THREE_DIR || '/tmp/three')+'/'+r.request().url().split('three@0.180.0/')[1],contentType:'text/javascript'}));
// Chrome's test profile does not inherit the environment proxy CA. Fetch the
// existing Google font through curl's inherited CA trust, keeping TLS verified.
await ctx.route(/https:\/\/(fonts.googleapis.com|fonts.gstatic.com)\//, async r=>{
 const body=require('child_process').execFileSync('curl',['--fail','--silent','--show-error','--location',r.request().url()],{maxBuffer:8*1024*1024});
 await r.fulfill({body,contentType:r.request().url().includes('googleapis')?'text/css':'font/woff2'});
});
const p=await ctx.newPage(),errors=[],cancelledRequests=[];p.on('requestfailed',r=>{const message=r.url()+': '+r.failure()?.errorText;(r.failure()?.errorText==='net::ERR_ABORTED'?cancelledRequests:errors).push(message)});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await p.addInitScript(()=>{localStorage.setItem('kotama.field3d.quality','low')});
await p.goto('http://localhost:8775/index.html');await p.waitForFunction(()=>!!window.KotamaField3D);
await p.evaluate(()=>{try{tutorialFinish();tutorialClose()}catch{}; tutorialState.phase='complete';tutorialState.completed=true;tutorialState.started=false;document.querySelectorAll('#tutorial-overlay').forEach(e=>e.hidden=true);document.body.classList.remove('tutorial-home-focus','tutorial-active');state.firstStageStarted=true;state.maxUnlockedStage=5;fieldState.flags.prologue=true;fieldState.flags['labyrinth-tutorial']=true;for(const e of stageEvents||[])eventRead[e.id]=true;window.persistAutoSave=()=>true;if(window.kotamaAdminEncounterSettings)window.kotamaAdminEncounterSettings.disableRandom=true;});
async function skip(){await p.evaluate(()=>{for(let i=0;i<40;i++){if(fieldChoiceState){fieldChoiceKey('z');continue}if(fieldDialogTyping){fieldDialogTyping();continue}if(fieldDialogAdvance){const r=fieldDialogAdvance;fieldDialogAdvance=null;r();continue}}document.querySelectorAll('#story-event').forEach(e=>{if(!e.hidden)e.querySelector('button')?.click()});});}
async function floor(f,area=5){await p.evaluate(([f,area])=>fieldEnterArea(area,{floor:f,adminSkip:true}),[f,area]);for(let i=0;i<5;i++){await skip();await p.waitForTimeout(200)}await p.waitForFunction(()=>KotamaField3D.active(),null,{timeout:120000});await skip();console.log('state',await p.evaluate(()=>({screen:state.screen,lock:fieldState.lock,modal:fieldModalOpen(),modals:[...document.querySelectorAll('.game-dialog, #story-event, #tutorial-overlay, #list-menu')].filter(e=>!e.hidden).map(e=>e.id)})));}
async function go(x,y,dir){await p.evaluate(([x,y,dir])=>{const c=fieldTileCenter(x,y);fieldState.x=c.x;fieldState.y=c.y;fieldState.dir=dir;fieldState.view=null;fieldUpdateVision(true)},[x,y,dir]);await p.evaluate(()=>new Promise(resolve=>{let n=0;function step(){if(++n===7)resolve();else requestAnimationFrame(step)}requestAnimationFrame(step)}))}
const report={floors:[],errors,cancelledRequests,gameplay:[]};
for(let f=0;f<3;f++){
 await floor(f); const info=await p.evaluate(()=>KotamaField3D.themeInfo());
 console.log('FLOOR',f,info.dressing?.placements.length || 0);
 if(f===0){await go(1,19,'up');}if(f===1){await go(3,19,'right')}if(f===2){await go(13,14,'up')}
 await p.screenshot({timeout:120000,path:`${OUT}/b5-f${f+1}-entry.png`});
 const sample=await p.evaluate(()=>new Promise(resolve=>{let times=[],last=performance.now();function tick(t){times.push(t-last);last=t;if(times.length===8)resolve({fps:1000/(times.reduce((a,b)=>a+b,0)/times.length),render:KotamaField3D.renderInfo()});else requestAnimationFrame(tick)}requestAnimationFrame(tick)}));
 report.floors.push({f,info,sample});
 if(f===0){
  await go(1,17,'up');
  const before=await p.evaluate(()=>({...fieldPlayerTile(),dir:fieldState.dir}));
  await p.keyboard.press('ArrowUp');await p.waitForFunction(y=>fieldPlayerTile().ty<y,before.ty,{timeout:20000});
  const after=await p.evaluate(()=>({...fieldPlayerTile(),dir:fieldState.dir,foes:fieldState.foes.length}));
  if(after.ty>=before.ty)throw Error('B5 forward movement failed');
  await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>fieldState.dir==='right',null,{timeout:20000});
  if(await p.evaluate(()=>fieldState.dir)!=='right')throw Error('B5 turning failed');
  report.gameplay.push({movement:true,turning:true,foes:after.foes});
 }
 if(f===1){
  const checks=await p.evaluate(async()=>{
   const oldScene=fieldPlayScene,oldSay=fieldSay,oldAsk=fieldAsk;fieldPlayScene=async()=>{};fieldSay=async()=>{};fieldAsk=async()=>0;
   try{
    const a=fieldArea(),pz=fieldPuzzleDef('a5-oath-statues'),door=a.objects.find(o=>o.kind==='door'&&o.puzzle==='a5-oath-statues');
    for(const id of pz.order)await fieldPuzzleInteract(a.objects.find(o=>o.id===id));
    if(!fieldDoorOpen(door))throw Error('B5 knight puzzle door did not open');
    const ev=a.objects.find(o=>o.kind==='event');await fieldInteract(ev);
    if(!fieldSideDone(ev.event))throw Error('B5 event did not complete');
    return {knightPuzzle:true,doorOpen:true,sideEvent:true};
   }finally{fieldPlayScene=oldScene;fieldSay=oldSay;fieldAsk=oldAsk;}
  });report.gameplay.push(checks);
 }
 if(f<2&&info.dressing?.placements.length){const v=info.dressing.placements[0];if(v.view){await go(v.view.tx,v.view.ty,v.view.dir);await p.screenshot({timeout:120000,path:`${OUT}/b5-f${f+1}-prop.png`})}}
}
await p.setViewportSize({width:390,height:844});await go(13,14,'up');await p.screenshot({timeout:120000,path:`${OUT}/b5-hall-mobile.png`});
console.log('starting checks');
if(!process.env.BASELINE)report.geometry=await p.evaluate(async()=>{
 const THREE=await import('three'), {createB5Dressing,isB5Hall}=await import('./field/b5-scene-dressing.js');
 const results=[];
 const hash=(x,y,s)=>(((Math.imul(x+53,73856093)^Math.imul(y+17,19349663)^s)>>>0)/4294967296);
 for(let f=0;f<3;f++){
  const a=fieldArea(5,f),ch=(x,y)=>fieldTileAt(a,x,y)||'#',wallCell=(x,y)=>ch(x,y)==='#'||!!fieldLetterDef(a,ch(x,y))?.onWall;
  const root=new THREE.Group(),hall=isB5Hall(a,ch),args={root,a,ch,wallCell,hash,CELL:4,hall};
  const before=JSON.stringify(a),asset=createB5Dressing(args),info=asset.info();
  for(const item of info.placements){
   const {min,max}=item.bounds;
   if(min[1]>=3)continue;
   for(let y=0;y<a.h;y++)for(let x=0;x<a.w;x++){
    if(ch(x,y)==='#')continue;
    if(max[0]>x*4-2&&min[0]<x*4+2&&max[2]>y*4-2&&min[2]<y*4+2)throw Error('B5 prop overlaps navigation: '+f+':'+item.kind+':'+x+','+y);
   }
  }
  const geos=new Set(),mats=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material)});
  let freedGeo=0,freedMat=0;geos.forEach(g=>g.addEventListener('dispose',()=>freedGeo++));mats.forEach(m=>m.addEventListener('dispose',()=>freedMat++));
  asset.dispose();asset.dispose();
  if(root.children.length||freedGeo!==geos.size||freedMat!==mats.size)throw Error('B5 dispose failed');
  const next=createB5Dressing(args);if(JSON.stringify(next.info())!==JSON.stringify(info))throw Error('Nondeterministic placement');next.dispose();
  if(JSON.stringify(a)!==before)throw Error('B5 map mutated');
  results.push({floor:f,hall,props:info.placements.length,freedGeo,freedMat,deterministic:true,walkableCellsClear:true});
 }
 return results;
});
report.checks=await p.evaluate(async()=>{ const saved=fieldSerialize();fieldDeserialize(saved);const roundtrip=fieldSerialize(); return {saveRoundtrip:JSON.stringify(saved)===JSON.stringify(roundtrip),saveVersion:createSaveData().saveVersion}; });
fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));console.log('REPORT',JSON.stringify({errors,checks:report.checks,gameplay:report.gameplay,floors:report.floors.map(v=>({f:v.f,sample:v.sample}))}));if(errors.length)process.exitCode=1;await b.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
