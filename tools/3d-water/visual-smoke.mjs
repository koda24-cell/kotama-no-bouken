// Experimental visual regression: screenshot the independent viewer, not approved game assets.
import {chromium,devices} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const PORT=8777,base='http://127.0.0.1:'+PORT+'/tools/3d-water/preview.html';
await mkdir('render-output/shader-research',{recursive:true});
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function ready(){for(let i=0;i<40;i++){try{const r=await fetch(base);if(r.ok)return;}catch{}await sleep(250);}throw Error('HTTP server failed');}
let browser;
try{
 await ready();browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report=[];
 for(const mode of ['desktop','mobile']){
  const context=await browser.newContext(mode==='mobile'?{...devices['iPhone 13'],viewport:{width:390,height:720}}:{viewport:{width:1100,height:720},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push('pageerror:'+e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text())});
  await page.goto(base,{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('起動済み'),{timeout:20000});
  await sleep(2200);
  for(const kind of ['lake','stream','waterfall']){
   await page.selectOption('#kind',kind);
   await sleep(1000);
   const file='render-output/shader-research/'+mode+'-'+kind+'.png';
   await page.screenshot({path:file});
   const stats=await page.evaluate(()=>({calls:window.__kotamaShaderPreview?.renderer.info.render.calls,triangles:window.__kotamaShaderPreview?.renderer.info.render.triangles}));
   report.push({mode,kind,file,...stats});
  }
  if(mode==='desktop'){
   const real=await context.newPage(),issues=[];
   real.on('pageerror',e=>issues.push('pageerror:'+e.message));
   real.on('console',m=>{if(m.type()==='error')issues.push('console:'+m.text())});
   await real.goto('http://127.0.0.1:'+PORT+'/tools/3d-water/b2-real-asset-preview.html',{waitUntil:'load'});
   await real.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('GLBロード済み'),null,{timeout:45000});
   await sleep(1200);
   await real.screenshot({path:'render-output/shader-research/b2-existing-glb.png'});
   await real.locator('#enhance').check();
   await sleep(1200);
   await real.screenshot({path:'render-output/shader-research/b2-enhanced-water-v2.png'});
   report.push({mode:'b2-real-glb',kind:'existing/enhanced',status:await real.locator('#status').innerText()});
   if(issues.length)throw Error('B2 real GLB preview: '+issues.join('\n'));
   await real.close();
   const meadow=await context.newPage(),windErrors=[];
   meadow.on('pageerror',e=>windErrors.push('pageerror:'+e.message));
   meadow.on('console',m=>{if(m.type()==='error')windErrors.push('console:'+m.text())});
   await meadow.goto('http://127.0.0.1:'+PORT+'/tools/floor6/v7-wind-asset-preview.html',{waitUntil:'load'});
   await meadow.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('V7実GLB読込成功'),null,{timeout:45000});
   await meadow.locator('#wind').uncheck();await sleep(900);
   await meadow.screenshot({path:'render-output/shader-research/f6-v7-static-glb.png'});
   await meadow.locator('#wind').check();await sleep(900);
   await meadow.screenshot({path:'render-output/shader-research/f6-v7-wind-glb.png'});
   report.push({mode:'f6-real-glb',kind:'static/wind',status:await meadow.locator('#status').innerText()});
   if(windErrors.length)throw Error('F6 real GLB preview: '+windErrors.join('\n'));
   await meadow.close();
  }
  if(errors.length)throw Error(mode+' browser error: '+errors.join('\n'));
  await context.close();
 }
 await writeFile('render-output/shader-research/report.json',JSON.stringify({status:'UNAPPROVED',results:report},null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();server.kill();}
