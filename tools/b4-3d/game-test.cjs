// Isolated browser profile; never reads or writes a player's real save data.
// THREE_DIR=/path/to/three PLAYWRIGHT=/path/to/playwright CHROME=/usr/bin/chromium 
// node tools/b4-3d/game-test.cjs /tmp/b4-checks
// Optional GAME_ROOT for before/after checkouts; QUALITY=high; MOBILE=1.
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright-core');
const ROOT = process.env.GAME_ROOT || path.resolve(__dirname,'../..');
const OUT = path.resolve(process.argv[2] || '/tmp/b4-checks'); fs.mkdirSync(OUT,{recursive:true});
const THREE_DIR = process.env.THREE_DIR || '/tmp/three';
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.mp3':'audio/mpeg'};
const server = http.createServer((q,s) => {
  const p = path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(p,(e,d)=>{s.writeHead(e?404:200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});s.end(e?'':d);});
}).listen(0);
let browser;
(async()=>{
  browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const context=await browser.newContext({viewport:process.env.MOBILE?{width:390,height:844}:{width:1280,height:800},hasTouch:!!process.env.MOBILE});
  await context.route(/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/(.*)/,r=>r.fulfill({path:path.join(THREE_DIR,r.request().url().split('three@0.180.0/')[1]),contentType:'text/javascript'}));
  // Expose renderer internals only in this test response, never in shipped code.
  await context.route('**/field/field-3d-view.js?*',r=>r.fulfill({body:fs.readFileSync(path.join(ROOT,'field/field-3d-view.js'),'utf8')+'\nwindow.__b4test={g,cellInfo,THREE};',contentType:'text/javascript'}));
  const p=await context.newPage(), errors=[], failedRequests=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error' && /\[field|THREE|WebGL/.test(m.text()))errors.push(m.text());});
  p.on('requestfailed',r=>failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
  await p.addInitScript(q=>{localStorage.setItem('kotama.field3d.quality',q);localStorage.setItem('kotama.field3d.maxFps','1');},process.env.QUALITY||'low');
  await p.goto(`http://localhost:${server.address().port}/index.html`,{waitUntil:'load'});
  await p.waitForFunction(()=>window.__b4test && typeof fieldEnterArea==='function');
  await p.evaluate(()=>{
    tutorialState.completed=true;tutorialState.started=false;tutorialState.phase='complete';
    document.querySelectorAll('#tutorial-overlay').forEach(el=>el.hidden=true);
    document.body.classList.remove('tutorial-active','tutorial-home-focus');
    state.maxUnlockedStage=5;window.persistAutoSave=()=>true;
    // Constant Math.random breaks THREE UUIDs and invalidates instancing measurements.
    let seed=12345;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  });
  const enter=async(n,f)=>{
    await p.evaluate(([n,f])=>{fieldEnterArea(n,{floor:f,adminSkip:true});},[n,f]);
    await p.waitForFunction(([n,f])=>KotamaField3D.active() && __b4test.g.builtKey===`${n}-${f}`,[n,f],{timeout:120000});
    await p.evaluate(()=>{cancelAnimationFrame(fieldRaf);fieldRaf=null;__b4test.g.maxFps=0;__b4test.g.cam.ready=false;KotamaField3D.frame();});
  };
  const pose=async(s)=>p.evaluate(s=>{
    const c=fieldTileCenter(s.tx,s.ty);fieldState.x=c.x;fieldState.y=c.y;fieldState.dir=s.dx===1?'right':s.dx===-1?'left':s.dz===1?'down':'up';
    fieldState.view=null;fieldState.stepUntil=0;fieldUpdateVision(true);fieldUpdateNear();
    __b4test.g.cam.ready=false;fieldRender();
  },s);
  const capture=async(name)=>{
    // Freeze decorative phase/FOE bobbing for reproducible screenshot comparisons.
    await p.evaluate(()=>{performance.now=()=>10000;__b4test.g.lastRender=0;KotamaField3D.frame();});
    await p.locator('.field-3d-canvas').screenshot({path:path.join(OUT,name+'.png')});
  };
  const measure=()=>p.evaluate(()=>{
    const {g}=__b4test;let meshes=0,instances=0;
    g.world.traverse(o=>{if(o.isMesh)meshes++;if(o.isInstancedMesh)instances+=o.count;});
    KotamaField3D.frame();
    return {info:KotamaField3D.themeInfo(),render:{...g.renderer.info.render},memory:{...g.renderer.info.memory},meshes,instances,foes:g.foes.size};
  });
  const reports=[], checks=[];
  for(let f=0;f<3;f++){
    await enter(4,f);
    const plan=await p.evaluate(()=>KotamaField3D.themeInfo().scenery);
    if(plan){
      assert.equal(plan.mines.length,4);assert.ok(plan.vista);
      // Check actual rendered instance bounds against the complete player camera lane,
      // including +/-1.1m behind the tile center; the existing boss-gate model
      // intentionally occupies B itself, so only that interaction tile is excluded.
      const overlap=await p.evaluate(()=>{
        const {g,THREE,cellInfo}=__b4test,a=fieldArea(),{wallCell}=cellInfo(a),bad=[];
        const lanes=[];
        for(let y=0;y<a.h;y++)for(let x=0;x<a.w;x++)if(!wallCell(x,y) && fieldTileAt(a,x,y)!=='B')lanes.push({x,y,b:new THREE.Box3(new THREE.Vector3(x*4-1.15,1.3,y*4-1.15),new THREE.Vector3(x*4+1.15,1.9,y*4+1.15))});
        g.world.updateMatrixWorld(true);
        g.world.traverse(o=>{
          if(!o.isMesh || !o.visible)return;
          let owned=false;for(let parent=o;parent;parent=parent.parent)if(parent.userData.b4Owned || parent.userData.disposeB4RockForms)owned=true;
          if(!owned)return;
          o.geometry.computeBoundingBox();
          for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){
            const m=new THREE.Matrix4();if(o.isInstancedMesh)o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);
            const b=o.geometry.boundingBox.clone().applyMatrix4(m);
            for(const lane of lanes)if(b.intersectsBox(lane.b))bad.push({name:o.name,tile:[lane.x,lane.y]});
          }
        });return bad;
      });
      assert.deepEqual(overlap,[],`camera clearance floor ${f}`);
      for(const [i,s] of plan.mines.entries()){
        await pose(s);
        const result=await p.evaluate(s=>{
          const before=JSON.stringify(fieldPlayerTile()),turn=fieldState.turn;
          const moved=fieldTryStep(fieldArea(),s.dx===1?'right':s.dx===-1?'left':s.dz===1?'down':'up');
          return {moved,same:before===JSON.stringify(fieldPlayerTile()),turnUnchanged:turn===fieldState.turn};
        },s);
        assert.deepEqual(result,{moved:false,same:true,turnUnchanged:true});
        if(i<2)await capture(`b4-${f}-mine-${i}`);
      }
      await pose(plan.vista);await capture(`b4-${f}-vista`);
      const blocked=await p.evaluate(()=>!fieldTryStep(fieldArea(),'up'));assert.ok(blocked);
      checks.push({floor:f,cameraClear:true,minesBlocked:true,vistaBlocked:true});
    }else{
      // Same camera positions in the unchanged checkout for visual comparison.
      const shots=f===0?[{tx:3,ty:12,dx:1,dz:0},{tx:23,ty:8,dx:1,dz:0},{tx:13,ty:1,dx:0,dz:-1}]:[];
      for(const [i,s] of shots.entries()){await pose(s);await capture(i===2?'b4-0-vista':`b4-0-mine-${i}`);}
    }
    reports.push({area:4,floor:f,...await measure()});
    // Field save round-trip, including existing fixed IDs and old-format defaults.
    const save=await p.evaluate(()=>{
      const old=JSON.parse(JSON.stringify(fieldSerialize()));fieldDeserialize(old);
      const now=JSON.parse(JSON.stringify(fieldSerialize()));
      return {same:JSON.stringify(old)===JSON.stringify(now),version:createSaveData().saveVersion};
    });assert.ok(save.same);assert.equal(save.version,12);
  }
  // Real walking advances a turn and preserves active FOE state; render rebuild does not.
  await enter(4,0);await pose({tx:1,ty:18,dx:0,dz:-1});
  const walking=await p.evaluate(()=>{
    fieldState.nextEncounter=99999;
    const turn=fieldState.turn;const moved=fieldTryStep(fieldArea(),'up');
    return {moved,tile:fieldPlayerTile(),advance:fieldState.turn-turn,foes:fieldState.foes.length};
  });
  assert.ok(walking.moved);assert.deepEqual(walking.tile,{tx:1,ty:17});assert.equal(walking.advance,1);assert.equal(walking.foes,1);
  const compatibility=await p.evaluate(()=>{
    const saved=JSON.parse(JSON.stringify(fieldSerialize())), legacy={...saved};
    for(const key of ['gatherUsed','gatherTimes','discovered','expedition'])delete legacy[key];
    fieldDeserialize(legacy);
    const valid=Array.isArray(fieldState.foes) && Object.keys(fieldState.gatherUsed).length===0 && fieldState.expedition===0;
    fieldDeserialize(saved);return valid;
  });assert.ok(compatibility);
  // Wall interaction and an opened hidden passage survive a complete B4 rebuild.
  await enter(4,1);
  const passage=await p.evaluate(()=>{
    const a=fieldArea(),door=a.objects.find(o=>o.hidden&&o.kind==='door');
    const before=fieldCanEnter(a,door.tx,door.ty);
    fieldState.flags[`puzzle:${door.puzzle}`]=true;
    return {before,after:fieldCanEnter(a,door.tx,door.ty),key:door.key};
  });assert.equal(passage.before,false);assert.equal(passage.after,true);
  await p.evaluate(()=>KotamaField3D.frame());
  await p.waitForFunction(()=>!__b4test.g.buildingKey && KotamaField3D.active());
  const controls=await p.evaluate(()=>fieldArea().objects.filter(o=>o.onWall).every(o=>__b4test.g.entries.some(e=>e.o.key===o.key)));
  assert.ok(controls);
  await p.evaluate(()=>{cancelAnimationFrame(fieldRaf);fieldRaf=null;delete fieldState.flags['puzzle:a4-cracked-wall'];});
  await enter(4,0);
  if(checks.length){
    await p.evaluate(()=>{
      const {g}=__b4test,owned=new Set(),cached=new Set();
      const root=g.world.children.find(o=>o.name==='b4_magma_map');
      root.traverse(o=>{if(o.geometry)owned.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)owned.add(m);});
      for(const child of g.world.children)if(child!==root)child.traverse(o=>{if(o.geometry)cached.add(o.geometry);});
      window.__b4disposed={counts:Array.from(owned,()=>0),cached:0};
      Array.from(owned).forEach((o,i)=>o.addEventListener('dispose',()=>__b4disposed.counts[i]++));
      cached.forEach(o=>o.addEventListener('dispose',()=>__b4disposed.cached++));
    });
    await enter(4,1);
    const disposed=await p.evaluate(()=>__b4disposed);
    assert.ok(disposed.counts.length>20);assert.ok(disposed.counts.every(n=>n===1),'owned resources disposed exactly once');assert.equal(disposed.cached,0);
  }
  // Repeated B4 rebuilds must plateau after all nearby cached gameplay assets warm up.
  const memory=[];
  for(let i=0;i<4;i++){
    await enter(4,i%3);const plan=await p.evaluate(()=>KotamaField3D.themeInfo().scenery);
    if(plan)for(const s of [...plan.mines,plan.vista]){await pose(s);await p.evaluate(()=>KotamaField3D.frame());}
    if(i===3)memory.push((await measure()).memory);
  }
  for(let i=0;i<3;i++){
    await enter(4,1);
    await enter(4,0);const plan=await p.evaluate(()=>KotamaField3D.themeInfo().scenery);
    if(plan)for(const s of [...plan.mines,plan.vista]){await pose(s);await p.evaluate(()=>KotamaField3D.frame());}
    memory.push((await measure()).memory);
  }
  if(checks.length)assert.deepEqual(memory.slice(1),[memory[0],memory[0],memory[0]],'B4 GPU allocations must plateau');
  for(let f=0;f<3;f++){
    await enter(5,f);await capture(`b5-${f}`);
    const wallControls=await p.evaluate(()=>{const a=fieldArea();return a.objects.filter(o=>o.onWall).every(o=>__b4test.g.entries.some(e=>e.o.key===o.key));});
    assert.ok(wallControls);reports.push({area:5,floor:f,...await measure()});
  }
  await enter(1,0);assert.ok(await p.evaluate(()=>KotamaField3D.active()));
  assert.deepEqual(errors,[]);
  const result={quality:process.env.QUALITY||'low',mobile:!!process.env.MOBILE,checks,walking,compatibility,passage,controls,memory,reports,errors,failedRequests};
  fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
