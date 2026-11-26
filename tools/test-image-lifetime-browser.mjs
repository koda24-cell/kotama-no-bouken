import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{
 for(const viewport of [{width:1366,height:768},{width:844,height:390}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1,isMobile:viewport.width<1000,hasTouch:viewport.width<1000});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/index.html?skipOpening',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof showScreen==='function'&&document.body.dataset.screen==='home');
  await page.evaluate(()=>{tutorialState.completed=true;tutorialState.started=false;tutorialState.phase='complete';});
  const navigate=async name=>{await page.evaluate(n=>showScreen(n),name);await page.waitForFunction(n=>document.body.dataset.screen===n,name);};
  const inspect=async selector=>{
    const loc=page.locator(selector);
    await loc.first().waitFor({state:'attached'});
    await loc.first().scrollIntoViewIfNeeded();
    await page.waitForFunction(s=>{const i=document.querySelector(s);return i&&i.complete&&i.naturalWidth>0;},selector);
    return loc.count();
  };
  const home=await inspect('#home-party img');
  for(let cycle=0;cycle<3;cycle++){
    await navigate('formation');
    assert.equal(await page.locator('#home-party img').count(),0);
    await inspect('#selected-party img');
    await navigate('shop');
    assert.equal(await page.locator('#selected-party img,#character-roster img').count(),0);
    await inspect('#shop-buyer img');
    await navigate('home');
    assert.equal(await page.locator('#shop-buyer img').count(),0);
    assert.equal(await inspect('#home-party img'),home);
  }
  await page.evaluate(()=>{battleState.hiddenBossMode=false;renderStageEnvironment(2);});
  await navigate('battle');
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('battle')).getPropertyValue('--battle-floor-art').includes('floor-02-water.webp'));
  await navigate('home');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.getElementById('battle')).getPropertyValue('--battle-floor-art').trim()),'none');
  assert.equal(await inspect('#home-party img'),home);
  await page.screenshot({path:'image-lifetime-'+viewport.width+'.png'});
  results.push({viewport,cycles:3,homePortraits:home,backgroundReferenceReleased:true,pageErrors:errors});
  assert.deepEqual(errors,[]);
  await page.close();
 }
}finally{fs.writeFileSync('browser-image-lifetime-report.json',JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify(results,null,2));
