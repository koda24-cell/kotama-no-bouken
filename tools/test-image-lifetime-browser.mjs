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
  const levelTest=await page.evaluate(()=>{
    adminActiveTab='player';adminPanelMarkup();renderAdminPanel();
    const original=characterLevels.kotama||1;
    const oldConfirm=window.confirm;
    let confirmations=0;
    window.confirm=()=>{confirmations++;return false;};
    try {
      const click=d=>document.querySelector('[data-admin-level="kotama"][data-delta="'+d+'"]').click();
      const input=()=>document.querySelector('[data-level-input="kotama"]');
      input().value='10';click(0);const set=characterLevels.kotama;
      click(1);const up=characterLevels.kotama;
      click(-1);const down=characterLevels.kotama;
      input().value=String(original);click(0);
      return {set,up,down,confirmations,restored:characterLevels.kotama===original};
    }finally{window.confirm=oldConfirm;}
  });
  assert.deepEqual(levelTest,{set:10,up:11,down:10,confirmations:0,restored:true});
  const fieldLayout=await page.evaluate(()=>{
    fieldEnsureExtraDom();
    const field=document.getElementById('field'),home=document.getElementById('home');
    const old=document.body.dataset.screen;
    home.classList.remove('active');field.classList.add('active');document.body.dataset.screen='field';
    try{
      document.getElementById('field-area-name').textContent='第1階層 はじまりの樹海';
      const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width};};
      fieldRenderPartyHud();
      const party=rect('field-party-hud'),inventory=rect('field-inventory-open'),danger=rect('field-danger');
      const partyCount=document.querySelectorAll('#field-party-hud .field-party-member').length;
      const first=getParty()[0],hp=first.hp;
      first.hp=Math.max(0,hp-1);fieldRenderPartyHud();
      const hpUpdated=document.querySelector('#field-party-hud .field-party-gauge b').textContent.startsWith(first.hp+'/');
      first.hp=hp;fieldRenderPartyHud();
      fieldToggleFullMap(true);
      const workspace=rect('field-map-workspace'),wrap=rect('field-map-canvas-wrap'),header=document.querySelector('.field-fullmap-head').getBoundingClientRect();
      const fit=rect('field-fullmap-canvas').width;
      document.getElementById('field-map-zoom-in').click();
      const zoomed=rect('field-fullmap-canvas').width;
      document.getElementById('field-map-zoom-fit').click();
      const reset=rect('field-fullmap-canvas').width;
      fieldToggleFullMap(false);
      return {field:rect('field'),map:rect('field-map-rail'),name:rect('field-area-name'),clock:rect('field-clock'),party,inventory,danger,partyCount,hpUpdated,workspace,wrap,headerBottom:header.bottom,fit,zoomed,reset};
    }finally{field.classList.remove('active');home.classList.add('active');document.body.dataset.screen=old;}
  });
  assert.ok(fieldLayout.map.top-fieldLayout.field.top<40,'map not top-right');
  assert.ok(fieldLayout.field.right-fieldLayout.map.right<40,'map not aligned right');
  assert.ok(fieldLayout.clock.left>=fieldLayout.name.right-1,'clock must be right of title');
  assert.ok(fieldLayout.clock.right<=fieldLayout.map.left+1,'clock and map overlap');
  assert.equal(fieldLayout.partyCount,home);
  assert.equal(fieldLayout.hpUpdated,true);
  assert.ok(fieldLayout.inventory.bottom<=fieldLayout.party.top+1,'inventory overlaps party');
  assert.ok(fieldLayout.danger.bottom<=fieldLayout.party.top+1,'danger overlaps party');
  assert.ok(fieldLayout.wrap.bottom>=fieldLayout.field.bottom-50,'map does not fill available height');
  assert.ok(fieldLayout.wrap.top<=fieldLayout.headerBottom+35,'unused space above map');
  assert.ok(fieldLayout.fit>0&&fieldLayout.zoomed>fieldLayout.fit,'zoom did not enlarge canvas');
  assert.equal(fieldLayout.reset,fieldLayout.fit);
  await page.screenshot({path:'image-lifetime-'+viewport.width+'.png'});
  results.push({viewport,cycles:3,homePortraits:home,backgroundReferenceReleased:true,adminLevel:levelTest,fieldLayout,pageErrors:errors});
  assert.deepEqual(errors,[]);
  await page.close();
 }
}finally{fs.writeFileSync('browser-image-lifetime-report.json',JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify(results,null,2));
