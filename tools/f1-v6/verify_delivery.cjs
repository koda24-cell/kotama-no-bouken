/* Live delivery check: local launcher HTML, real pinned CDN scripts/GLBs, no resource mocks.
 * Serve repo on 8838; BROWSER_IGNORE_PROXY_CERT=1 is only for the managed test proxy.
 */
const {chromium}=require('/workspace/work/browser/node_modules/playwright-core');
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const BASE=process.env.DELIVERY_BASE||'http://127.0.0.1:8838';
const OUT=path.resolve(process.env.DELIVERY_OUT||'docs/reviews/f1-v6-delivery');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({ignoreHTTPSErrors:process.env.BROWSER_IGNORE_PROXY_CERT==='1',viewport:{width:1280,height:900}});
 const page=await context.newPage(),errors=[],responses=[],failures=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)responses.push({url:r.url(),status:r.status()})});page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));
 const progress=setInterval(()=>console.log('delivery checks running'),20000);
 const report={scope:'Live CDN through local launcher, not direct raw.githack HTML availability or all-device certification',ignoreProxyCert:process.env.BROWSER_IGNORE_PROXY_CERT==='1',floors:[],errors,responses,failures};
 try{
  await page.goto(BASE+'/preview/f1-sacred-playtest.html?delivery=cdn');
  await page.evaluate(()=>localStorage.setItem('fantasyRpgSave','preserved-delivery-sentinel'));
  for(const floor of JSON.parse(process.env.DELIVERY_FLOORS||'[2,0,1]')){
   if(floor!==2)await page.goto(BASE+'/preview/f1-sacred-playtest.html?delivery=cdn&floor='+floor);
   await page.waitForFunction(f=>{const w=document.querySelector('#game').contentWindow,d=w.KotamaField3D?.gameReviewState();return document.querySelector('#status').textContent.includes('試験表示中')&&d?.builtKey==='1-'+f&&d.natureV6Info?.sourceHashesVerified;},floor,{timeout:240000});
   const record=await page.evaluate(()=>{const w=document.querySelector('#game').contentWindow;return {status:document.querySelector('#status').textContent,parent:localStorage.getItem('fantasyRpgSave'),childSeesSentinel:w.localStorage.getItem('fantasyRpgSave')==='preserved-delivery-sentinel',saveVersion:JSON.parse(w.localStorage.getItem('fantasyRpgSave'))?.saveVersion,review:w.KotamaField3D.gameReviewState()};});
   assert.equal(record.parent,'preserved-delivery-sentinel');assert.equal(record.childSeesSentinel,false);assert.equal(record.saveVersion,12);assert.equal(record.review.builtKey,'1-'+floor);
   await page.evaluate(()=>{const w=document.querySelector('#game').contentWindow;w.eval('fieldInput.keys.clear();fieldInput.keys.add("ArrowRight");try{KotamaField3D.input(fieldArea(),performance.now())}finally{fieldInput.keys.clear()}');});
   await page.waitForTimeout(500);
   // Freeze only render-loop animation for the screenshot, after live display/input checks.
   await page.evaluate(()=>{document.querySelector('#game').contentWindow.requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
   const cdp=await context.newCDPSession(page);const shot=await cdp.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(OUT,`live-${floor+1}f.png`),Buffer.from(shot.data,'base64'));await cdp.detach();
   report.floors.push(record);console.log('live CDN floor passed',floor+1);
  }
  // A failed isolation script must leave the iframe empty, not run the normal game.
  await context.route('**/field/f1-sacred-playtest-entry.js',r=>r.fulfill({status:503,body:'unavailable'}));
  await page.goto(BASE+'/preview/f1-sacred-playtest.html?delivery=cdn');
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('必要なファイルを取得できません'));
  report.isolationFailure=await page.evaluate(()=>({empty:!document.querySelector('#game').getAttribute('srcdoc'),parent:localStorage.getItem('fantasyRpgSave')}));
  assert.equal(report.isolationFailure.empty,true);assert.equal(report.isolationFailure.parent,'preserved-delivery-sentinel');assert.deepEqual(errors,[]);report.passed=true;
 }finally{clearInterval(progress);fs.writeFileSync(path.join(OUT,'live-verification.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
