// Browser screenshots and material/animation checks in the real game.
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
  p.on('requestfailed',r=>{if(r.url().includes('/assets/3d/')&&r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
  await p.addInitScript(q=>{localStorage.setItem('kotama.field3d.quality',q);localStorage.setItem('kotama.field3d.maxFps','1');},process.env.QUALITY||'low');
  await p.goto(`http://localhost:${server.address().port}/index.html`);
  await p.waitForFunction(()=>window.__b4visual&&typeof fieldEnterArea==='function');
  await p.evaluate(()=>{
    tutorialState.completed=true;tutorialState.started=false;
    document.querySelectorAll('#tutorial-overlay').forEach(e=>e.hidden=true);
    document.body.classList.remove('tutorial-active','tutorial-home-focus');window.persistAutoSave=()=>true;
    let seed=1234;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  });
  const scenes=[
    [1,0,3,19,'up','b1-corridor'],
    [4,0,3,12,'right','b4-rig'],[4,0,23,8,'right','b4-minecart'],[4,0,13,1,'up','b4-citadel'],
    [4,0,11,7,'up','b4-lava'],[4,1,10,10,'up','b4-lava2'],[4,2,14,8,'up','b4-chamber'],
    [5,0,1,19,'up','b5-entry']
  ].filter(s=>(!process.env.B4_ONLY||s[0]===4)&&(!process.env.SCENE||s[5]===process.env.SCENE));
  const reports=[];
  for(const [n,f,x,y,dir,name]of scenes){
    await p.evaluate(([n,f])=>fieldEnterArea(n,{floor:f,adminSkip:true}),[n,f]);
    await p.waitForFunction(([n,f])=>__b4visual.g.builtKey===`${n}-${f}`&&KotamaField3D.active(),[n,f],{timeout:120000});
    await p.evaluate(([x,y,dir])=>{
      cancelAnimationFrame(fieldRaf);fieldRaf=null;
      const {g}=__b4visual;g.maxFps=0;const c=fieldTileCenter(x,y);
      fieldState.x=c.x;fieldState.y=c.y;fieldState.dir=dir;fieldState.view=null;g.cam.ready=false;
      fieldUpdateVision(true);fieldUpdateNear();performance.now=()=>10000;
      fieldRender();g.renderer.info.autoReset=false;g.renderer.info.reset();KotamaField3D.frame();
    },[x,y,dir]);
    const check=await p.evaluate(name=>{
      const {g}=__b4visual,materials=new Map();
      g.world.traverse(o=>{if(o.material?.userData.b4SurfaceShared)materials.set(o.material.name,o.material);});
      const basalt=materials.get('b4:basalt'),lava=materials.get('b4:flowing-lava');
      let animated=false,pixelsAnimated=null;
      if(lava){
        const offset=lava.map.offset.y;g.theme.tick(.1,12000,g.camera.position);
        animated=offset!==lava.map.offset.y;g.theme.tick(.1,10000,g.camera.position);
        if(name==='b4-lava'){
          g.renderer.info.reset();KotamaField3D.frame();const before=g.canvas.toDataURL();
          performance.now=()=>12000;g.renderer.info.reset();KotamaField3D.frame();const after=g.canvas.toDataURL();
          pixelsAnimated=before!==after;
          performance.now=()=>10000;g.renderer.info.reset();KotamaField3D.frame();
        }
      }
      const imageWidths=[];
      for(const m of materials.values())for(const slot of ['map','normalMap','roughnessMap','emissiveMap'])if(m[slot]?.image)imageWidths.push(m[slot].image.width);
      return {hasSurfaces:!!basalt,basaltPBR:!!(basalt?.map?.image&&basalt?.normalMap?.image&&basalt?.roughnessMap?.image),animated,pixelsAnimated,
        imageWidths,lightPool:g.pool.length,info:KotamaField3D.themeInfo(),render:KotamaField3D.renderInfo()};
    },name);
    if(n===4&&!process.env.BASELINE)assert.ok(check.hasSurfaces);
    if(n===4&&check.hasSurfaces){
      assert.ok(check.basaltPBR);assert.ok(check.imageWidths.every(w=>w>0&&w<=(process.env.QUALITY==='high'?1024:512)));
      assert.equal(check.lightPool,process.env.QUALITY==='high'?14:6);
      if(name.includes('lava')||name.includes('chamber'))assert.ok(check.animated);
      if(name==='b4-lava')assert.equal(check.pixelsAnimated,true);
    }
    // Page clipping avoids waiting for an element's layout-stability animation;
    // the game's own animation clock and camera are already frozen above.
    const clip=await p.locator('.field-3d-canvas').boundingBox();
    await p.screenshot({path:path.join(out,name+'.png'),clip,timeout:120000});
    reports.push({name,...check});console.log(name);
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({quality:process.env.QUALITY||'low',mobile:!!process.env.MOBILE,reports,errors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
