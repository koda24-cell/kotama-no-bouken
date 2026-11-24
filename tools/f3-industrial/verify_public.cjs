/* Genuine public fixed-SHA HTML and CDN resources in a fresh browser profile. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('/workspace/work/browser/node_modules/playwright-core');
(async()=>{
 const url=process.env.PUBLIC_URL;if(!url)throw Error('PUBLIC_URL is required');
 assert.match(url,/^https:\/\/raw\.githack\.com\/koda24-cell\/kotama-no-bouken\/[a-f0-9]{40}\/preview\/f3-industrial-playtest\.html/);
 const out=path.resolve('docs/reviews/f3-industrial-public');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1280,height:900},ignoreHTTPSErrors:process.env.BROWSER_IGNORE_PROXY_CERT==='1'});
 const page=await context.newPage(),errors=[],requestFailures=[],consoleErrors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('requestfailed',r=>requestFailures.push({url:r.url(),error:r.failure()?.errorText}));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
 await page.addInitScript(()=>{if(window.top===window)localStorage.setItem('f3-public-normal-save-probe','preserved')});
 const report={url,scope:'Actual raw.githack HTML and actual remote resources, no response mocks',ignoreManagedProxyCertificate:process.env.BROWSER_IGNORE_PROXY_CERT==='1',errors,requestFailures,consoleErrors};
 const progress=setInterval(async()=>{try{console.log(await page.locator('#status').textContent({timeout:1000}))}catch{}},15000);
 try{
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});report.httpStatus=response.status();assert.equal(response.status(),200);
  if((await page.title()).includes('External Content Notice')){
   report.externalContentNotice=true;
   await page.getByRole('button',{name:'Open the page',exact:true}).click();
   await page.locator('#status').waitFor({timeout:90000});
  }
  await page.waitForFunction(()=>{const w=document.querySelector('#game')?.contentWindow,t=w?.KotamaField3D?.themeInfo();return t?.mode==='b3-industrial-trial'&&t.industrialAssets?.sourceHashesVerified&&document.querySelector('#status').textContent.includes('試験表示中');},null,{timeout:360000});
  report.result=await page.evaluate(()=>{const w=document.querySelector('#game').contentWindow,t=w.KotamaField3D.themeInfo();return {mode:t.mode,floor:t.floor,sourceHashesVerified:t.industrialAssets.sourceHashesVerified,models:t.industrialAssets.models,builtKey:w.KotamaField3D.gameReviewState().builtKey,randomSuppressed:w.kotamaAdminEncounterSettings.disableRandom,storageIsolated:w.localStorage.getItem('f3-public-normal-save-probe')===null&&localStorage.getItem('f3-public-normal-save-probe')==='preserved'};});
  assert.equal(report.result.models,27);assert.equal(report.result.storageIsolated,true);assert.deepEqual(errors,[]);
  await page.evaluate(()=>{document.querySelector('#game').contentWindow.requestAnimationFrame=()=>0});await page.waitForTimeout(150);
  const cdp=await context.newCDPSession(page),s=await cdp.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'public.png'),Buffer.from(s.data,'base64'));await cdp.detach();report.passed=true;
 }finally{clearInterval(progress);try{report.finalState=await page.evaluate(()=>({title:document.title,status:document.querySelector('#status')?.textContent,childError:document.querySelector('#game')?.contentWindow?.KotamaIndustrialPlaytestError,theme:document.querySelector('#game')?.contentWindow?.KotamaField3D?.themeInfo()}));}catch(e){report.diagnosticError=e.message}fs.writeFileSync(path.join(out,'public-verification.json'),JSON.stringify(report,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
