// Claude review: B4 prop GLBs placed by field/b4-asset-dressing.js, shot from a neighbouring tile.
// See game-test.cjs for gameplay, camera clearance and resource-lifetime assertions.
// THREE_DIR=/path/to/three PLAYWRIGHT=/path/to/playwright node visual-test.cjs /tmp/b4-visual
// Optional QUALITY=high, MOBILE=1, B4_ONLY=1, SCENE=b4-lava,
// or GAME_ROOT=/path/to/baseline BASELINE=1.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT||'/opt/node-tools/node_modules/playwright-core');
const root=process.env.GAME_ROOT||path.resolve(__dirname,'../..');
const out=path.resolve(process.argv[2]||'/tmp/b4-visual');fs.mkdirSync(out,{recursive:true});
const types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((q,s)=>{
  const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f,(e,d)=>{s.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});s.end(e?'':d);});
}).listen(0);
let browser;
(async()=>{
  browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const context=await browser.newContext({viewport:process.env.MOBILE?{width:390,height:844}:{width:1280,height:800},hasTouch:!!process.env.MOBILE});
  await context.route(/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/(.*)/,r=>r.fulfill({
    path:path.join(process.env.THREE_DIR||'/tmp/three',r.request().url().split('three@0.180.0/')[1]),contentType:'text/javascript'
  }));
  await context.route('**/field/field-3d-view.js?*',r=>r.fulfill({
    body:fs.readFileSync(path.join(root,'field/field-3d-view.js'),'utf8')+'\nwindow.__b4visual={g};',contentType:'text/javascript'
  }));
  const p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('console',m=>{if(m.type()==='warning'&&m.text().includes('b4-dressing'))errors.push(m.text());});
  await p.addInitScript(q=>{localStorage.setItem('kotama.field3d.quality',q);localStorage.setItem('kotama.field3d.maxFps','1');},process.env.QUALITY||'high');
  await p.goto(`http://localhost:${server.address().port}/index.html`);
  await p.waitForFunction(()=>window.__b4visual&&typeof fieldEnterArea==='function');
  await p.evaluate(()=>{
    tutorialState.completed=true;tutorialState.started=false;
    document.querySelectorAll('#tutorial-overlay').forEach(e=>e.hidden=true);
    document.body.classList.remove('tutorial-active','tutorial-home-focus');window.persistAutoSave=()=>true;
    let seed=1234;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  });
  const DIRN={'0,-1':'up','1,0':'right','0,1':'down','-1,0':'left'};
  const report=[];
  for(const f of [0,1,2]){
    await p.evaluate(f=>fieldEnterArea(4,{floor:f,adminSkip:true}),f);
    await p.waitForFunction(f=>__b4visual.g.builtKey===`4-${f}`&&KotamaField3D.active(),f,{timeout:120000});
    await p.waitForFunction(()=>KotamaField3D.themeInfo()?.scenery?.props,null,{timeout:120000}).catch(()=>{});
    const info=await p.evaluate(()=>KotamaField3D.themeInfo()?.scenery?.props||null);
    report.push({floor:f,info});
    if(!info)continue;
    const seen=new Set();let k=0;
    const mines=await p.evaluate(()=>KotamaField3D.themeInfo()?.scenery?.mines||[]);
    for(const [mi,m] of mines.slice(1).entries()){
      await p.evaluate(({m,DIRN})=>{
        const {g}=__b4visual;cancelAnimationFrame(fieldRaf);fieldRaf=null;g.maxFps=0;
        const c=fieldTileCenter(m.tx,m.ty);fieldState.x=c.x;fieldState.y=c.y;fieldState.dir=DIRN[m.dx+','+m.dz];fieldState.view=null;g.cam.ready=false;
        fieldUpdateVision(true);fieldUpdateNear();performance.now=()=>10000;fieldRender();KotamaField3D.frame();
      },{m,DIRN});
      const clip=await p.locator('.field-3d-canvas').boundingBox();
      await p.screenshot({path:path.join(out,`f${f}-mine${mi}.png`),clip,timeout:120000});
    }
    for(const it of info.list){
      if(seen.has(it.id)&&k>=6)continue;seen.add(it.id);
      if(k++>=10)break;
      const shot=await p.evaluate(({it,DIRN})=>{
        const {g}=__b4visual;const a=fieldArea();
        const walk=(x,y)=>!fieldCharSolid(a,fieldTileAt(a,x,y));
        const opts=[[it.tx-it.dx,it.ty-it.dz,it.dx,it.dz],[it.tx+it.dz,it.ty-it.dx,-it.dz,it.dx],[it.tx-it.dz,it.ty+it.dx,it.dz,-it.dx],[it.tx,it.ty,it.dx,it.dz]];
        let o=opts.find(([x,y])=>walk(x,y))||opts[3];
        cancelAnimationFrame(fieldRaf);fieldRaf=null;
        g.maxFps=0;const c=fieldTileCenter(o[0],o[1]);
        fieldState.x=c.x;fieldState.y=c.y;fieldState.dir=DIRN[o[2]+','+o[3]];fieldState.view=null;g.cam.ready=false;
        fieldUpdateVision(true);fieldUpdateNear();performance.now=()=>10000;
        fieldRender();g.renderer.info.autoReset=false;g.renderer.info.reset();KotamaField3D.frame();
        return {at:o,render:KotamaField3D.renderInfo(),phase:'game'};
      },{it,DIRN});
      {const clip=await p.locator('.field-3d-canvas').boundingBox();
       await p.screenshot({path:path.join(out,`f${f}-${String(k).padStart(2,'0')}-game.png`),clip,timeout:120000});}
      await p.evaluate(({it})=>{
        const {g}=__b4visual;
        // close-up: free camera 2.3m in front of the prop (towards the corridor), eye height 1.35m
        if(it.x!==undefined){
          const cam=g.camera;cam.position.set(it.x-it.dx*2.3+it.dz*0.6,1.35,it.z-it.dz*2.3-it.dx*0.6);
          cam.lookAt(it.x,(it.y||0)+0.45,it.z);cam.updateMatrixWorld(true);
          if(g.composer)g.composer.render();else g.renderer.render(g.scene,cam);
        }
      },{it});
      const clip=await p.locator('.field-3d-canvas').boundingBox();
      const name=`f${f}-${String(k).padStart(2,'0')}-${it.id}`;
      await p.screenshot({path:path.join(out,name+'.png'),clip,timeout:120000});
      report.push({name,it,...shot});console.log(name);
    }
  }
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({report,errors},null,2));
  console.log('errors',errors.length);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
