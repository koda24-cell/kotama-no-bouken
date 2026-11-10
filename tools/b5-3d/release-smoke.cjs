const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('playwright');
// THREE_DIR points to a local Three.js r180 package; no runtime dependencies are added.
const ROOT=process.env.TEST_ROOT || path.resolve(__dirname,'../..'),OUT=process.argv[2] || '/tmp/b5-integration-shots';fs.mkdirSync(OUT,{recursive:true});
const server=http.createServer((q,s)=>{const p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));fs.readFile(p,(e,d)=>{s.writeHead(e?404:200,{'Content-Type':({'.js':'text/javascript','.html':'text/html','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png'})[path.extname(p)]||'application/octet-stream'});s.end(e?'':d)})}).listen(8775);
(async()=>{
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const ctx=await b.newContext({viewport:{width:960,height:720}});
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
const textures=[];p.on('response',r=>{if(r.url().includes('/textures/b5_'))textures.push({url:r.url(),status:r.status()})});
const report={errors,cancelledRequests};
await floor(1);const pose=await p.evaluate(()=>{const a=fieldArea(),o=a.objects.find(o=>o.id===fieldPuzzleDef('a5-oath-statues').order[0]);for(const [dx,dy,dir]of [[0,1,'up'],[0,-1,'down'],[1,0,'left'],[-1,0,'right']])if(!fieldCharSolid(a,fieldTileAt(a,o.tx+dx,o.ty+dy)))return[o.tx+dx,o.ty+dy,dir]});
await go(...pose);await p.keyboard.press('Enter');await p.waitForFunction(()=>!!fieldChoiceState,null,{timeout:20000});await p.keyboard.press('Enter');for(let i=0;i<4;i++){await skip();await p.waitForTimeout(200)}
report.gameplay=await p.evaluate(async()=>{
 const a=fieldArea(),pz=fieldPuzzleDef('a5-oath-statues'),first=a.objects.find(o=>o.id===pz.order[0]);
 if(!fieldPuzzleSwitchOn(first))throw Error('Wall statue UI did not activate');
 const oldScene=fieldPlayScene,oldSay=fieldSay,oldAsk=fieldAsk;fieldPlayScene=async()=>{};fieldSay=async()=>{};fieldAsk=async()=>0;
 try{
  for(const id of pz.order.slice(1))await fieldPuzzleInteract(a.objects.find(o=>o.id===id));
  if(!fieldDoorOpen(a.objects.find(o=>o.kind==='door'&&o.puzzle==='a5-oath-statues')))throw Error('Door failed');
  const ev=a.objects.find(o=>o.kind==='event');await fieldInteract(ev);if(!fieldSideDone(ev.event))throw Error('Side event failed');
  const saved=fieldSerialize();fieldDeserialize(saved);if(JSON.stringify(saved)!==JSON.stringify(fieldSerialize()))throw Error('Save changed');
  return {statueKeyboardInteraction:true,knightPuzzle:true,doorOpen:true,sideEvent:true,saveRoundtrip:true};
 }finally{fieldPlayScene=oldScene;fieldSay=oldSay;fieldAsk=oldAsk;}
});
await floor(2);await go(11,7,'up');await p.screenshot({timeout:120000,path:OUT+'/release-cathedral.png'});
await p.waitForFunction(()=>KotamaField3D.active());
report.clothTextures=textures.filter(r=>r.url.includes('b5_cloth'));if(report.clothTextures.length!==3||report.clothTextures.some(r=>r.status!==200))throw Error('Cloth maps missing');
report.render=await p.evaluate(()=>KotamaField3D.renderInfo());
report.sample=await p.evaluate(()=>new Promise(resolve=>{let times=[],last=performance.now();function step(t){times.push(t-last);last=t;if(times.length===8)resolve({fps:1000/(times.reduce((a,b)=>a+b,0)/times.length),render:KotamaField3D.renderInfo()});else requestAnimationFrame(step)}requestAnimationFrame(step)}));
fs.writeFileSync(OUT+'/release-report.json',JSON.stringify(report,null,2));console.log('RELEASE',JSON.stringify(report));if(errors.length)process.exitCode=1;await b.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
