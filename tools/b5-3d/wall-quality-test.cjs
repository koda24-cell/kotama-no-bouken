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
const report={errors,cancelledRequests,floors:[],occlusion:[]};
for(let f=0;f<3;f++) {
 await floor(f);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const info=await p.evaluate(()=>KotamaField3D.themeInfo());
 const v=info.dressing.placements.find(v=>v.view);
 if(f<2)await go(1,17,'up');else await go(11,7,'up');
 await p.screenshot({timeout:120000,path:OUT+'/quality-f'+f+'-corridor.png'});
 if(v){await go(v.view.tx,v.view.ty,v.view.dir);await p.screenshot({timeout:120000,path:OUT+'/quality-f'+f+'-niche.png'});}
 if(f===1){const pose=await p.evaluate(()=>{const a=fieldArea(),o=a.objects.find(o=>o.kind==='switch');for(const [dx,dy,dir]of [[0,1,'up'],[0,-1,'down'],[1,0,'left'],[-1,0,'right']])if(!fieldCharSolid(a,fieldTileAt(a,o.tx+dx,o.ty+dy)))return[o.tx+dx,o.ty+dy,dir]});if(pose){await go(...pose);await p.screenshot({timeout:120000,path:OUT+'/knight-wall-switch.png'});}}
 report.floors.push({f,info,render:await p.evaluate(()=>KotamaField3D.renderInfo())});
}
report.occlusion=await p.evaluate(async()=>{
 const THREE=await import('three');const {createB5Architecture}=await import('./field/b5-architecture.js');
 const result=[],hash=(x,y,s)=>(((Math.imul(x+53,73856093)^Math.imul(y+17,19349663)^s)>>>0)/4294967296);
 for(let f=0;f<3;f++){
  const a=fieldArea(5,f),ch=(x,y)=>fieldTileAt(a,x,y)||'#',wallCell=(x,y)=>ch(x,y)==='#'||!!fieldLetterDef(a,ch(x,y))?.onWall;
  const root=new THREE.Group(),before=JSON.stringify(a);const arc=createB5Architecture({root,a,ch,wallCell,hash,CELL:4,hall:f===2,g:{lights:[]}});root.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(),up=new THREE.Vector3(0,1,0);let checks=0;
  for(const face of arc.faces)for(const height of [.18,1.6,3.9,arc.H-.15])for(const side of [-1.75,0,1.75]){
   const eye=new THREE.Vector3(face.tx*4,height,face.ty*4);
   const target=new THREE.Vector3(face.x+face.dz*side,height,face.z-face.dx*side);
   ray.set(eye,target.sub(eye).normalize());ray.far=3.8;
   const hits=ray.intersectObject(root,true);
   if(!hits.length)throw Error('B5 wall leak at '+JSON.stringify({f,face,height,side}));checks++;
  }
  const renderer=new THREE.WebGLRenderer({antialias:false});renderer.setSize(128,128);
  const scene=new THREE.Scene();scene.add(root);scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2));
  const cam=new THREE.PerspectiveCamera(50,1,.05,20),face=arc.faces.find(f=>f.niche)||arc.faces[0];
  cam.position.set(face.tx*4,1.6,face.ty*4);cam.lookAt(face.x,1.6,face.z);
  const testGeo=new THREE.PlaneGeometry(100,100),testMat=new THREE.MeshBasicMaterial({color:0xff00ff,side:THREE.DoubleSide}),marker=new THREE.Mesh(testGeo,testMat);
  marker.position.set(face.x+face.dx*1.7,1.6,face.z+face.dz*1.7);marker.rotation.y=face.yaw;scene.add(marker);
  const target=new THREE.WebGLRenderTarget(128,128),pixels=new Uint8Array(128*128*4);
  function count(){renderer.setRenderTarget(target);renderer.render(scene,cam);renderer.readRenderTargetPixels(target,0,0,128,128,pixels);let n=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>240&&pixels[i+1]<20&&pixels[i+2]>240)n++;return n;}
  const blockedPixels=count();root.visible=false;const controlPixels=count();root.visible=true;
  if(blockedPixels!==0||controlPixels<16000)throw Error('B5 pixel occlusion failed '+JSON.stringify({f,blockedPixels,controlPixels}));
  const geos=new Set(),mats=new Set(),tex=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material){mats.add(o.material);for(const v of Object.values(o.material))if(v?.isTexture)tex.add(v);}});
  let freedGeo=0,freedMat=0,freedTex=0;geos.forEach(g=>g.addEventListener('dispose',()=>freedGeo++));mats.forEach(m=>m.addEventListener('dispose',()=>freedMat++));tex.forEach(t=>t.addEventListener('dispose',()=>freedTex++));
  arc.dispose();arc.dispose();if(root.children.length||freedGeo!==geos.size||freedMat!==mats.size||freedTex!==tex.size)throw Error('Architecture resources leaked');
  if(JSON.stringify(a)!==before)throw Error('Map changed');
  testGeo.dispose();testMat.dispose();target.dispose();renderer.dispose();
  result.push({f,faces:arc.faces.length,rays:checks,blockedPixels,controlPixels,freedGeo,freedMat,freedTex});
 }
 return result;
});
await floor(2);await p.setViewportSize({width:390,height:844});await go(11,7,'up');await p.screenshot({timeout:120000,path:OUT+'/quality-hall-mobile.png'});
if(!process.env.SKIP_B1){await p.setViewportSize({width:640,height:480});await floor(0,1);await go(1,17,'up');await p.screenshot({timeout:120000,path:OUT+'/b1-reference-current.png'});}
fs.writeFileSync(OUT+'/quality-report.json',JSON.stringify(report,null,2));console.log('QUALITY',JSON.stringify({errors,occlusion:report.occlusion}));if(errors.length)process.exitCode=1;await b.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
