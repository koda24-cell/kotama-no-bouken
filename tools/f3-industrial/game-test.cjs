// Visual + gameplay regression against an isolated browser profile; never uses user saves.
const fs = require('fs'), path = require('path'), http = require('http');
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
const root=process.env.REPO || path.resolve(__dirname, '../..'), out=process.env.OUT || path.join(root, 'work/b3-check');
fs.mkdirSync(out, {recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.mp3':'audio/mpeg','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{let file=path.join(root,decodeURIComponent(req.url.split('?')[0]));fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(err?'':data);});}).listen(8773);
let testBrowser;
(async()=>{
const browser=testBrowser=await chromium.launch({executablePath:process.env.CHROME || '/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const mobile=process.argv.includes('--mobile');
const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
await context.route(/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/(.*)/,r=>r.fulfill({path:path.join(process.env.THREE_DIR || path.resolve(path.dirname(require.resolve('three')), '..'),r.request().url().split('three@0.180.0/')[1]),contentType:'text/javascript'}));
if (process.env.BASELINE_B3_MODULE) await context.route('**/field/field-3d-b3-city.js*', r => r.fulfill({body:fs.readFileSync(process.env.BASELINE_B3_MODULE,'utf8'),contentType:'text/javascript'}));
await context.route('**/field/field-3d-view.js*', r=>r.fulfill({body:fs.readFileSync(root+'/field/field-3d-view.js','utf8')+'\nwindow.__test3d={g};',contentType:'text/javascript'}));
const page=await context.newPage(), errors=[];

page.on('requestfailed',r=>console.log('request failed: '+r.url()+' '+r.failure()?.errorText));
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.addInitScript(({q,cap})=>{localStorage.setItem('kotama.field3d.quality',q);if(cap)localStorage.setItem('kotama.field3d.maxFps',cap);},{q:mobile?'low':'high',cap:process.env.F3_TEST_MAX_FPS||null});
if(process.env.F3_CATALOG)await context.route('**/b3_industrial_candidates/catalog.json',r=>r.fulfill({path:process.env.F3_CATALOG,contentType:'application/json'}));
if(process.env.F3_ASSET_SNAPSHOT)await context.route('**/assets/3d/dungeons/b3_industrial_candidates/**',route=>{
 const relative=decodeURIComponent(new URL(route.request().url()).pathname.split('/b3_industrial_candidates/')[1]),file=path.resolve(process.env.F3_ASSET_SNAPSHOT,relative);
 if(!file.startsWith(path.resolve(process.env.F3_ASSET_SNAPSHOT)+path.sep))return route.abort();return route.fulfill({path:file});
});
await page.addInitScript(()=>{window.KotamaIndustrialPlaytest=true;});
await page.goto('http://localhost:8773/index.html?f3industrial=1');
await page.waitForFunction(()=>window.KotamaField3D);
await page.evaluate(()=>{try{tutorialFinish();tutorialClose();}catch{};if(typeof tutorialState!=='undefined'){tutorialState.phase='complete';tutorialState.completed=true;tutorialState.started=false;}document.querySelectorAll('#tutorial-overlay').forEach(e=>e.hidden=true);document.body.classList.remove('tutorial-active','tutorial-home-focus');state.firstStageStarted=true;state.maxUnlockedStage=5;window.persistAutoSave=()=>true;});
await page.evaluate(()=>fieldEnterArea(3,{floor:0,adminSkip:true}));
await page.waitForFunction(()=>KotamaField3D.active()&&KotamaField3D.themeInfo()?.placed,null,{timeout:120000});
await page.waitForTimeout(1500);
if(!process.env.F3_INSPECT_VIEW)await page.screenshot({timeout:120000,path:out+(mobile?'/mobile':'/pc')+'-entry.png'});
console.log('3D ready');
// Sample street and plaza views on all floors.
const logs=[];
await page.evaluate(()=>{
 window.__perf=[]; const {g}=window.__test3d, render=g.renderer.render.bind(g.renderer);
 g.renderer.render=(scene,camera)=>{const start=performance.now();render(scene,camera);if(scene===g.scene)window.__perf.push({time:performance.now(),ms:performance.now()-start,calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles});};
});

for(const floor of (process.env.F3_TEST_FLOORS?process.env.F3_TEST_FLOORS.split(',').map(Number):(process.argv.includes('--visual-only') ? [0,1,2] : [0,1,2,0]))){
console.log('floor '+floor);
if(!process.env.F3_INSPECT_VIEW||floor!==0)await page.evaluate(f=>fieldEnterArea(3,{floor:f,adminSkip:true}),floor);
await page.waitForFunction(f=>KotamaField3D.active()&&KotamaField3D.themeInfo()?.floor===`3-${f}`,floor,{timeout:120000});
await page.waitForTimeout(600);
const info=await page.evaluate(()=>{const {placements,edgePlacements,...x}=KotamaField3D.themeInfo();const a=fieldArea();const overlaps=[];
for(const p of placements)for(let z=0;z<a.h;z++)for(let x=0;x<a.w;x++)if(fieldTileAt(a,x,z)!=='#'&&p.max[0]>x*4-2+0.001&&p.min[0]<x*4+2-0.001&&p.max[2]>z*4-2+0.001&&p.min[2]<z*4+2-0.001)overlaps.push({key:p.key,x,z});
const edgeOverlaps=[];
for(const p of edgePlacements||[]){
 if(p.min[1]>=2.1||p.max[1]<=.15)continue;
 for(let z=0;z<a.h;z++)for(let x=0;x<a.w;x++)if(fieldTileAt(a,x,z)!=='#'){
  const rects=[[x*4-.9,z*4-.9,x*4+.9,z*4+.9]];
  if(x+1<a.w&&fieldTileAt(a,x+1,z)!=='#')rects.push([x*4-.9,z*4-.9,(x+1)*4+.9,z*4+.9]);
  if(z+1<a.h&&fieldTileAt(a,x,z+1)!=='#')rects.push([x*4-.9,z*4-.9,x*4+.9,(z+1)*4+.9]);
  if(rects.some(r=>p.max[0]>r[0]+.001&&p.min[0]<r[2]-.001&&p.max[2]>r[1]+.001&&p.min[2]<r[3]-.001))edgeOverlaps.push({key:p.key,x,z});
 }
}
return {...x,edgePlacementCount:edgePlacements?.length,edgePlacements,edgeOverlaps,overlaps,entryKinds:__test3d.g.entries.map(e=>({kind:e.kind,visible:!!e.obj,tx:e.o.tx,ty:e.o.ty}))};});logs.push(info);
const pos=floor===2?[11,12,'up']:floor===1?[9,19,'right']:[8,19,'right'];
await page.evaluate(([tx,ty,dir])=>{const c=fieldTileCenter(tx,ty);fieldState.x=c.x;fieldState.y=c.y;fieldState.dir=dir;fieldState.view=null;__test3d.g.cam.ready=false;fieldUpdateVision(true);},pos);
if(process.env.F3_INSPECT_VIEW){
 info.viewProbe=await page.evaluate(async()=>{
  const T=await import('three'),{g}=__test3d;
  g.lastRender=0;KotamaField3D.frame();g.scene.updateMatrixWorld(true);
  const cast=new T.Raycaster(),theme=KotamaField3D.themeInfo(),hits=[];
  for(const [x,y]of [[-.7,0],[.7,0],[-.5,0],[.5,0],[-.5,.3],[.5,.3],[0,0],[.5,-.6]]){
   cast.setFromCamera(new T.Vector2(x,y),g.camera);
   hits.push({sample:[x,y],hits:cast.intersectObjects(g.world.children,true).slice(0,3).map(h=>({material:Array.isArray(h.object.material)?h.object.material[h.face.materialIndex]?.name:h.object.material?.name,point:h.point.toArray(),instance:h.instanceId,owners:[...(theme.placements||[]),...(theme.edgePlacements||[])].filter(p=>h.point.x>=p.min[0]-.01&&h.point.x<=p.max[0]+.01&&h.point.z>=p.min[2]-.01&&h.point.z<=p.max[2]+.01).map(p=>p.key)}))});
  }
  return {active:fieldIsActive(),raf:fieldRaf,camera:g.camera.position.toArray(),scene:g.scene.uuid,composerScene:g.composer?.passes[0]?.scene?.uuid,maxFps:g.maxFps,renderInfo:KotamaField3D.renderInfo(),hits};
 });
 console.log('viewProbe '+JSON.stringify(info.viewProbe));
}
await page.waitForTimeout(1200);
await page.screenshot({timeout:120000,path:`${out}/${mobile?'mobile':'pc'}-floor${floor}.png`,fullPage:mobile});
for(const view of JSON.parse(process.env.F3_EXTRA_VIEWS||'[]').filter(v=>v.floor===floor)){
 if(!/^[a-z0-9-]+$/.test(view.name))throw Error('Invalid review view name');
 await page.evaluate(({tx,ty,dir})=>{const a=fieldArea();if(!fieldCanEnter(a,tx,ty,'player'))throw Error('Review viewpoint is not walkable');const p=fieldTileCenter(tx,ty);fieldState.x=p.x;fieldState.y=p.y;fieldState.dir=dir;fieldState.view=null;__test3d.g.cam.ready=false;fieldUpdateVision(true);__test3d.g.lastRender=0;KotamaField3D.frame();},view);
 await page.waitForTimeout(700);await page.screenshot({timeout:120000,path:`${out}/${mobile?'mobile':'pc'}-${view.name}.png`,fullPage:mobile});console.log('extra view '+view.name);
}
await page.evaluate(()=>window.__perf=[]);await page.waitForTimeout(4000);
info.performance=await page.evaluate(()=>{const p=window.__perf,t=p.map(x=>x.time);return {frames:p.length,fps:p.length>1?(p.length-1)*1000/(t.at(-1)-t[0]):0,calls:Math.max(...p.map(x=>x.calls)),triangles:Math.max(...p.map(x=>x.triangles)),memory:{...__test3d.g.renderer.info.memory}};});

}
if (process.argv.includes('--visual-only')) {
 const failures=logs.filter(r=>r.mode!=='b3-industrial-trial'||!r.industrialAssets?.sourceHashesVerified||r.fallbackReason||r.overlaps?.length||r.edgeOverlaps?.length).map(r=>({floor:r.floor,mode:r.mode,reason:r.fallbackReason,hardOverlaps:r.edgeOverlaps?.length}));
 if(errors.some(e=>!e.includes('ERR_CERT_AUTHORITY_INVALID')))failures.push({reason:'browser errors'});
 fs.writeFileSync(`${out}/${mobile?'mobile':'pc'}-results.json`,JSON.stringify({logs,errors,failures},null,2));
 console.log(JSON.stringify({floors:logs.map(({edgePlacements,...x})=>x),errors,failures},null,2));await browser.close();server.close();if(failures.length)process.exitCode=1;return;
}
// Real input: move, turn without spending a turn, and bump into a solid boundary.
const check=async()=>page.evaluate(()=>({tile:fieldPlayerTile(),dir:fieldState.dir,turn:fieldState.turn,foes:fieldState.foes.map(f=>({x:f.tx,y:f.ty})),near:fieldState.nearKey}));
await page.evaluate(()=>{const c=fieldTileCenter(8,19);fieldState.x=c.x;fieldState.y=c.y;fieldState.dir='right';fieldState.view=null;fieldState.encounterSteps=0;fieldState.nextEncounter=9999;fieldUpdateVision(true);});
const key=async k=>{await page.keyboard.down(k);await page.waitForTimeout(100);await page.keyboard.up(k);await page.waitForTimeout(700);};
const controls={before:await check()};await key('ArrowUp');
await page.waitForFunction(()=>fieldPlayerTile().tx===9,null,{timeout:30000});controls.move=await check();await key('ArrowLeft');
await page.waitForFunction(()=>fieldState.dir==='up',null,{timeout:30000});controls.turn=await check();
const bumpFrame=await page.evaluate(()=>__perf.length);await key('ArrowUp');
await page.waitForFunction(n=>__perf.length>=n+2,bumpFrame,{timeout:30000});controls.bump=await check();
logs.push({controls});
const interactions=[];
const settle=async()=>{for(let i=0;i<18;i++){await page.evaluate(()=>{if(fieldChoiceState){fieldChoiceKey('z');return;}if(fieldDialogTyping){fieldDialogTyping();return;}if(fieldDialogAdvance){const f=fieldDialogAdvance;fieldDialogAdvance=null;f();}});await page.waitForTimeout(100);}};
for(const kind of ['chest','gather','switch']) {
 const before=await page.evaluate(kind=>{const a=fieldArea(),o=a.objects.find(o=>o.kind===kind);if(!o)return null;
 for(const [dir,dx,dz] of [['right',-1,0],['left',1,0],['down',0,-1],['up',0,1]])if(fieldCanEnter(a,o.tx+dx,o.ty+dz,'player')){const c=fieldTileCenter(o.tx+dx,o.ty+dz);fieldState.x=c.x;fieldState.y=c.y;fieldState.dir=dir;break;}
 fieldState.view=null;fieldState.lock=false;fieldUpdateVision(true);fieldUpdateNear();return {key:o.key,near:fieldState.nearKey,flag:!!fieldState.flags[o.key],used:fieldState.gatherUsed[o.key]||0};},kind);
 await page.waitForTimeout(500);await page.evaluate(()=>fieldActionPressed());await settle();await page.waitForTimeout(500);
 const after=await page.evaluate(key=>({flag:!!fieldState.flags[key],used:fieldState.gatherUsed[key]||0,entry:__test3d.g.entries.find(e=>e.o.key===key)?.state,progress:fieldPuzzleProgress}),before?.key);
 interactions.push({kind,before,after});
 if(kind==='switch')await page.screenshot({timeout:120000,path:out+'/'+(mobile?'mobile':'pc')+'-switch.png'});
}
logs.push({interactions});
// Finish the three-lantern puzzle through the same action/choice path as the UI.
for(const id of await page.evaluate(()=>fieldPuzzleDef('a3-lanterns').order)) {
 await page.evaluate(id=>{const a=fieldArea(),o=a.objects.find(o=>o.id===id);for(const [dir,dx,dz] of [['right',-1,0],['left',1,0],['down',0,-1],['up',0,1]])if(fieldCanEnter(a,o.tx+dx,o.ty+dz,'player')){const c=fieldTileCenter(o.tx+dx,o.ty+dz);fieldState.x=c.x;fieldState.y=c.y;fieldState.dir=dir;break;}fieldState.view=null;fieldUpdateVision(true);fieldUpdateNear();fieldActionPressed();},id);await settle();
}
await page.waitForFunction(()=>fieldPuzzleSolved('a3-lanterns')&&__test3d.g.entries.find(e=>e.o.id==='a3-gate')?.state==='open',null,{timeout:30000});
const puzzle=await page.evaluate(()=>({solved:fieldPuzzleSolved('a3-lanterns'),door:__test3d.g.entries.find(e=>e.o.id==='a3-gate')?.state}));logs.push({puzzle});
if(mobile){
 await page.evaluate(()=>{const c=fieldTileCenter(8,19);fieldState.x=c.x;fieldState.y=c.y;fieldState.dir='right';fieldState.view=null;fieldState.lock=false;fieldUpdateVision(true);});
 const before=await check();await page.locator('#field-pad [data-dir="up"]').tap();await page.waitForFunction(()=>fieldPlayerTile().tx===9,null,{timeout:10000});const after=await check();logs.push({touch:{before,after}});
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({timeout:120000,path:out+'/mobile-controls.png',fullPage:true});
}

const lodCheck=await page.evaluate(()=>{
 const {g}=__test3d,camera=g.camera.clone();let groups=0,invalid=0,nearTriangles=0,farTriangles=0;
 g.world.traverse(o=>{if(!o.isLOD)return;groups++;const p=o.getWorldPosition(camera.position);camera.position.copy(p);camera.updateMatrixWorld();o.update(camera);if(o.getCurrentLevel()!==0)invalid++;
 const near=o.levels[0].object,far=o.levels[1].object;
 nearTriangles+=(near.geometry.index?.count||near.geometry.attributes.position.count)/3*near.count;
 if(far.isMesh)farTriangles+=(far.geometry.index?.count||far.geometry.attributes.position.count)/3*far.count;
 camera.position.x+=100;camera.updateMatrixWorld();o.update(camera);if(o.getCurrentLevel()!==1)invalid++;o.update(g.camera);
 });return {groups,invalid,nearTriangles,farTriangles};
});logs.push({lodCheck});
const lifecycle=[];
for(const area of [1,3,1,3]) {
 await page.evaluate(n=>fieldEnterArea(n,{floor:0,adminSkip:true}),area);
 await page.waitForFunction(n=>KotamaField3D.active()&&__test3d.g.builtKey===`${n}-0`,area,{timeout:120000});
 const frameStart=await page.evaluate(()=>__perf.length);
 await page.waitForFunction(n=>__perf.length>=n+2,frameStart,{timeout:120000});
 if (area === 1 && lifecycle.length === 0) await page.screenshot({timeout:120000,path:out+'/'+(mobile?'mobile':'pc')+'-b1-reference.png',fullPage:mobile});
 lifecycle.push(await page.evaluate(()=>({area:fieldState.area,far:__test3d.g.camera.far,roots:__test3d.g.world.children.filter(c=>c.name==='b3_ruined_city_map').length,points:__test3d.g.pool.filter(l=>l.parent).length,memory:{...__test3d.g.renderer.info.memory}})));
}
logs.push({lifecycle});
const save=await page.evaluate(()=>{if(typeof fieldRandomMazeOnLoad==='function')fieldRandomMazeOnLoad();const saved=JSON.parse(JSON.stringify(fieldSerialize()));fieldDeserialize(saved);const round=fieldSerialize();const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
const paths=[];function diff(a,b,path=''){if(JSON.stringify(stable(a))===JSON.stringify(stable(b)))return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const key of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[key],b[key],path+'.'+key);}else paths.push({path,before:a,after:b});}diff(saved,round);
return {same:paths.length===0,keyOrderOnly:JSON.stringify(saved)!==JSON.stringify(round)&&paths.length===0,differences:paths,area:round.area,floor:round.floor};});logs.push({save});
const stairs=await page.evaluate(()=>{fieldState.lock=false;fieldOnStairs('down');return true;});await settle();
await page.waitForFunction(()=>KotamaField3D.active()&&KotamaField3D.themeInfo()?.floor==='3-1',null,{timeout:120000});
logs.push({stairs:{floor:await page.evaluate(()=>fieldState.floor)}});
const failures=[];
for(const x of logs){if(x.overlaps?.length)failures.push('scenery overlaps '+x.floor);if(x.edgeOverlaps?.length)failures.push('body-lane obstruction '+x.floor);}
if(controls.move.tile.tx!==9||controls.move.turn!==controls.before.turn+1||controls.turn.turn!==controls.move.turn||controls.bump.tile.tx!==9||controls.bump.turn!==controls.move.turn)failures.push('controls');
if(!interactions.find(x=>x.kind==='chest')?.after.flag)failures.push('chest');
if(!interactions.find(x=>x.kind==='gather')?.after.used)failures.push('gather');
if(lifecycle.some(x=>x.roots!==(x.area===3?1:0)||x.far!==(x.area===3?44:48)))failures.push('lifecycle');
if(lifecycle[1].memory.geometries!==lifecycle[3].memory.geometries)failures.push('geometry leak');
if(lifecycle[1].memory.textures!==lifecycle[3].memory.textures)failures.push('texture leak');
if(!save.same)failures.push('save roundtrip');
if(!lodCheck.groups||lodCheck.invalid||lodCheck.nearTriangles<=lodCheck.farTriangles)failures.push('LOD');
if(!puzzle.solved||puzzle.door!=='open')failures.push('puzzle door');
if(logs.find(x=>x.touch)&&logs.find(x=>x.touch).touch.after.tile.tx!==9)failures.push('touch');
if(errors.some(x=>!x.includes('ERR_CERT_AUTHORITY_INVALID')))failures.push('browser errors');
logs.push({failures});

fs.writeFileSync(`${out}/${mobile?'mobile':'pc'}-results.json`,JSON.stringify({logs,errors},null,2));
console.log(JSON.stringify({floors:logs.map(({edgePlacements,...x})=>x),errors},null,2));
await browser.close();server.close();if(failures.length)process.exitCode=1;
})().catch(async e=>{console.error(e);if(testBrowser)await testBrowser.close();server.close();process.exitCode=1;});
