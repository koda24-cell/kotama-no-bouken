/* Real Three.js r180/GLTFLoader verification. Does not modify game runtime. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..');
const OUT=process.env.REVIEW_OUT||'/workspace/work/browser-review';
const MODULES=process.env.BROWSER_MODULES||'/workspace/work/browser/node_modules';
const {chromium}=require(path.join(MODULES,'playwright-core'));
const THREE=path.join(MODULES,'three'),PORT=Number(process.env.REVIEW_PORT||8791);
const BASE=path.join(ROOT,'assets/3d/dungeons/b1_sacred_forest_candidates');
const TYPES={'.html':'text/html','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.css':'text/css','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{let name;try{name=decodeURIComponent(req.url.split('?')[0]);}catch{res.writeHead(400);return res.end();}const filename=path.resolve(ROOT,'.'+name);if(filename!==ROOT&&!filename.startsWith(ROOT+path.sep)){res.writeHead(403);return res.end();}fs.readFile(filename,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':TYPES[path.extname(filename)]||'application/octet-stream','Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);});});

async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(PORT,'127.0.0.1',resolve);});
 const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']});
 const ctx=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
 await ctx.route(/https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/(.*)/,async route=>{const m=route.request().url().match(/three@0\.180\.0\/(.*)$/);const p=path.resolve(THREE,m[1].split('?')[0]);if(!p.startsWith(THREE+path.sep))return route.abort();await route.fulfill({path:p,contentType:'text/javascript'});});
 const page=await ctx.newPage(),errors=[],assets=[],seams=[];let scene=null;
 page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'&&!/favicon.ico|404.*Not Found/.test(m.text()))errors.push('console: '+m.text());});
 page.on('requestfailed',r=>{if(!r.url().includes('favicon.ico'))errors.push('requestfailed: '+r.url()+' '+r.failure()?.errorText);});
 try{
  await page.goto(`http://127.0.0.1:${PORT}/preview/f1-sacred-forest.html`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.F1Review?.ready,{timeout:120000});
  const manifest=JSON.parse(fs.readFileSync(path.join(BASE,'manifest.json'),'utf8'));
  assert.ok(manifest.assets.length>0);
  for(const a of manifest.assets){
   console.error('[GLB]',a.id);
   const stat=await page.evaluate(id=>window.F1Review.loadAsset(id),a.id);
   assert.ok(stat&&stat.meshes>0,a.id+': no mesh');assert.ok(stat.triangles>0,a.id+': no triangles');assert.deepEqual(stat.invalid,[],a.id+': invalid geometry or texture');
   assert.ok(stat.sizeMeters.every(v=>Number.isFinite(v)&&v>=0),a.id+': invalid dimensions');
   if(a.sizeMeters)for(let i=0;i<3;i++)assert.ok(Math.abs(a.sizeMeters[i]-stat.sizeMeters[i])<.08,`${a.id}: bbox mismatch axis ${i}, declared=${a.sizeMeters[i]} actual=${stat.sizeMeters[i]}`);
   if(a.tris)assert.equal(a.tris,stat.triangles,a.id+': triangles mismatch');
   stat.bytes=fs.statSync(path.join(BASE,a.file)).size;
   if(a.bytes)assert.equal(a.bytes,stat.bytes,a.id+': bytes mismatch');
   assets.push(stat);
   await page.screenshot({path:path.join(OUT,a.id+'.png'),timeout:120000});
   if(await page.locator('#seams').isEnabled()){
    const seam=await page.evaluate(()=>window.F1Review.setSeams(true));
    assert.equal(seam.triangles,stat.triangles*4,a.id+': 2x2 did not clone four tiles');
    assert.ok(Math.abs(seam.sizeMeters[0]-8)<.08,a.id+': X seam dimensions');assert.ok(Math.abs(seam.sizeMeters[2]-8)<.08,a.id+': Z seam dimensions');
    await page.screenshot({path:path.join(OUT,a.id+'-seams.png'),timeout:120000});seams.push(seam);await page.evaluate(()=>window.F1Review.setSeams(false));
   }
  }
  if(process.env.VERIFY_SCENE==='1'&&fs.existsSync(path.join(BASE,'scene/sacred_forest_scene.glb'))){
   await page.click('#scene-button');await page.waitForFunction(()=>!window.F1Review.busy,{timeout:180000});scene=await page.evaluate(()=>window.F1Review.stats());assert.equal(scene.id,'sacred_forest_scene');assert.deepEqual(scene.invalid,[]);await page.screenshot({path:path.join(OUT,'scene-browser.png'),timeout:180000});
  }
  const userErrors=await page.evaluate(()=>window.F1Review.errors);errors.push(...userErrors);
  assert.deepEqual(errors,[],'Browser errors');
  const report={verifiedAt:new Date().toISOString(),engine:'Chromium SwiftShader / Three.js r180 GLTFLoader',scope:'Standalone candidate review, not game integration or real-device performance',assets,seams,scene,errors};
  fs.writeFileSync(path.join(OUT,'browser-verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({assets:assets.length,seamChecks:seams.length,sceneVerified:!!scene,errors,report:path.join(OUT,'browser-verification.json')},null,2));
 }catch(e){fs.writeFileSync(path.join(OUT,'browser-verification-failure.json'),JSON.stringify({message:e.message,errors,assets,seams},null,2)+'\n');throw e;}
 finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
