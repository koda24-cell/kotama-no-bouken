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
  await page.evaluate(()=>{tutorialState.completed=true;tutorialState.started=false;tutorialState.phase='complete';tutorialClose();});
  await page.locator('#tutorial-overlay').waitFor({state:'hidden'});
  const navigate=async name=>{await page.evaluate(n=>showScreen(n),name);await page.waitForFunction(n=>document.body.dataset.screen===n,name);};
  const inspect=async selector=>{
    const loc=page.locator(selector);
    await loc.first().waitFor({state:'attached'});
    await loc.first().scrollIntoViewIfNeeded();
    await page.waitForFunction(s=>{const i=document.querySelector(s);return i&&i.complete&&i.naturalWidth>0;},selector);
    return loc.count();
  };
  // Real pointer actions, not direct showScreen calls: catch bubbling and overlap regressions.
  const menuButton=page.locator('#list-button'),listMenu=page.locator('#list-menu');
  const press=async loc=>{if(viewport.width<1000)await loc.tap({timeout:5000});else await loc.click({timeout:5000});};
  await press(menuButton);
  assert.equal(await listMenu.isVisible(),true,'menu did not open');
  assert.equal(await menuButton.getAttribute('aria-expanded'),'true');
  const menuGeometry=await page.evaluate(()=>{
    const rect=id=>document.getElementById(id).getBoundingClientRect();
    const b=rect('list-button'),m=rect('list-menu'),g=document.querySelector('.gold-display').getBoundingClientRect();
    return {buttonLeft:b.left,buttonRight:b.right,buttonBottom:b.bottom,goldRight:g.right,menuTop:m.top,menuRight:m.right,menuLeft:m.left,viewportWidth:innerWidth};
  });
  assert.ok(menuGeometry.goldRight<=menuGeometry.buttonLeft+1,'gold overlaps menu button');
  assert.ok(menuGeometry.menuTop>=menuGeometry.buttonBottom-1,'menu overlaps trigger');
  assert.ok(menuGeometry.menuRight<=menuGeometry.viewportWidth&&menuGeometry.menuLeft>=0,'menu outside viewport');
  await press(menuButton);
  assert.equal(await listMenu.isVisible(),false,'menu did not close');
  await press(menuButton);
  await press(page.locator('#compendium-menu-button'));
  assert.equal(await page.locator('body').getAttribute('data-screen'),'compendium');
  await press(page.locator('.main-nav button[data-screen="home"]'));
  assert.equal(await page.locator('body').getAttribute('data-screen'),'home');
  await press(menuButton);
  await press(page.locator('#load-button'));
  assert.equal(await page.locator('#load-dialog').isVisible(),true,'load dialog did not open');
  await press(page.locator('#load-dialog-close'));
  assert.equal(await page.locator('#load-dialog').isVisible(),false);
  const home=await inspect('#home-party img');
  const townBackground=await page.evaluate(async()=>{
    const style=getComputedStyle(document.querySelector('#home .home-poster-background'));
    const match=style.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
    if(!match)throw new Error('Home background URL missing');
    const image=new Image();image.src=match[1];await image.decode();
    return {url:match[1],width:image.naturalWidth,height:image.naturalHeight,size:style.backgroundSize};
  });
  assert.ok(townBackground.url.endsWith('/assets/8091ad13-a63c-469c-b31a-8c16f3d1d70d.png'));
  assert.ok(townBackground.width>0&&townBackground.height>0);
  assert.ok(townBackground.size.includes('cover'));
  const homePoster=await page.evaluate(()=>{
    const nav=document.querySelector('.main-nav'),stage=document.getElementById('home-party');
    const menu=document.querySelector('.home-menu');
    const old=window.kotamaBattleExportRows();
    const party=getParty();
    const slots=[5,0,4,2,1,3];
    try{
      window.kotamaBattleImportRows(Object.fromEntries(party.map((c,i)=>[c.id,{row:slots[i]>=3?'rear':'front',slot:slots[i]%3}])));
      renderHome();
      const members=[...stage.querySelectorAll('[data-home-slot]')].map(e=>({id:e.dataset.partyId,slot:Number(e.dataset.homeSlot),shadow:getComputedStyle(e.querySelector('img')||e.querySelector('.character-art')).filter}));
      const expected=party.map((c,i)=>({id:c.id,slot:slots[i]})).sort((a,b)=>a.slot-b.slot);
      return {members,expected,navMoved:nav.parentElement.id==='home-nav-slot',vertical:getComputedStyle(nav).flexDirection==='column',menuRight:menu.getBoundingClientRect().right,artLeft:stage.getBoundingClientRect().left};
    }finally{window.kotamaBattleImportRows(old);renderHome();}
  });
  assert.equal(homePoster.navMoved,true);
  assert.equal(homePoster.vertical,true);
  assert.ok(homePoster.menuRight<=homePoster.artLeft+12,'menu overlaps stage');
  assert.deepEqual(homePoster.members.map(({id,slot})=>({id,slot})),homePoster.expected);
  assert.ok(homePoster.members.some(m=>m.shadow.includes('drop-shadow')));
  assert.ok(homePoster.members.filter(m=>m.shadow.includes('drop-shadow')).every(m=>m.shadow.includes('brightness(0)')),'home portraits must be silhouettes');
  await page.screenshot({path:'home-poster-'+viewport.width+'.png'});

  for(let cycle=0;cycle<3;cycle++){
    await navigate('formation');
    assert.equal(await page.locator('.topbar > .main-nav').count(),1);
    assert.equal(await page.locator('#home-party img').count(),0);
    await inspect('#selected-party img');
    assert.ok(await page.locator('#selected-party img').first().evaluate(img=>!getComputedStyle(img).filter.includes('brightness(0)')),'formation portraits must remain visible');
    await navigate('shop');
    assert.equal(await page.locator('#selected-party img,#character-roster img').count(),0);
    await inspect('#shop-buyer img');
    await navigate('home');
    assert.equal(await page.locator('#home-nav-slot > .main-nav').count(),1);
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
  const adminTest=await page.evaluate(()=>{
    const before=JSON.stringify({compendium,records:compendiumSerialize(),stageCleared,stageEntered,gold:state.gold,limit:state.maxUnlockedStage,hidden:hiddenBossUnlocked()});
    const entries=monsterCompendiumEntries();
    adminActiveTab='progress';renderAdminPanel();
    document.getElementById('admin-compendium-reveal').click();
    renderMonsterCompendium();
    const cards=document.querySelectorAll('#compendium-list .compendium-card.unlocked').length;
    const saved=JSON.parse(localStorage.getItem('fantasyRpgSave')).adminCompendiumReveal;
    const unchanged=before===JSON.stringify({compendium,records:compendiumSerialize(),stageCleared,stageEntered,gold:state.gold,limit:state.maxUnlockedStage,hidden:hiddenBossUnlocked()});
    document.getElementById('admin-compendium-restore').click();
    const restored=!adminCompendiumReveal;
    adminActiveTab='encounter';renderAdminPanel();
    const bosses=[...document.querySelectorAll('#admin-boss-select option')].map(o=>o.value);
    const old=battleState.adminBossId;
    battleState.adminBossId='variant:snowdrift-boss';const snow=createEnemy(1);
    battleState.adminBossId='boss-3';const wolf=createEnemy(3);
    battleState.adminBossId=old;
    return {cards,expected:entries.length,saved,unchanged,restored,bosses,snow:snow.name,wolf:wolf.name};
  });
  assert.equal(adminTest.cards,adminTest.expected);
  assert.ok(adminTest.saved&&adminTest.unchanged&&adminTest.restored);
  assert.ok(adminTest.bosses.includes('variant:snowdrift-boss')&&adminTest.bosses.includes('hidden-boss')&&adminTest.bosses.includes('boss-5'));
  assert.equal(adminTest.snow,'スノードリフト');assert.equal(adminTest.wolf,'オオカミ');
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
  const profile=await page.evaluate(()=>{
    const dlg=document.getElementById('field-inventory-dialog');
    dlg.dataset.menuTab='field-inventory-status-tab';
    renderFieldCharacterStatus();dlg.showModal();
    const art=dlg.querySelector('.field-status-art'),info=dlg.querySelector('.field-status-info');
    const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const initial=art.querySelector('.field-status-art-caption strong').textContent;
    const portrait=art.querySelector('img');
    const select=document.getElementById('field-status-character');
    select.selectedIndex=1;select.dispatchEvent(new Event('change'));
    const switched=dlg.querySelector('.field-status-art-caption strong').textContent;
    return {art:rect(dlg.querySelector('.field-status-art')),info:rect(dlg.querySelector('.field-status-info')),dialog:rect(dlg),initial,switched,portrait:!!portrait,skills:dlg.querySelectorAll('.field-status-skill-row').length,gear:dlg.querySelectorAll('.field-status-gear-row').length,scrollable:dlg.querySelector('.field-status-info').scrollHeight>dlg.querySelector('.field-status-info').clientHeight};
  });
  assert.ok(Math.abs(profile.art.left-profile.dialog.left)<3 && Math.abs(profile.art.top-profile.dialog.top)<3,'art must begin at dialog edge');
  assert.ok(profile.art.width>=profile.dialog.width-3&&profile.art.height>=profile.dialog.height-3,'art must cover entire dialog');
  assert.ok(profile.info.left>=profile.art.left&&profile.info.right<profile.art.right,'info must overlay artwork');
  assert.ok(profile.art.width>profile.info.width,'art should dominate layout');
  assert.ok(profile.art.height>150,'art height too small');
  assert.ok(profile.initial!==profile.switched,'character did not switch');
  assert.ok(profile.portrait&&profile.skills>0&&profile.gear>0);
  await page.locator('#field-status-detail .field-status-art img').first().waitFor({state:'visible'});
  await page.waitForFunction(()=>{const i=document.querySelector('#field-status-detail .field-status-art img');return i?.complete&&i.naturalWidth>0;});
  await page.screenshot({path:'status-profile-'+viewport.width+'.png'});
  await page.evaluate(()=>document.getElementById('field-inventory-dialog').close());
  await page.screenshot({path:'image-lifetime-'+viewport.width+'.png'});
  // Start an actual locked boss battle through the admin control.
  await page.evaluate(()=>{
    state.maxUnlockedStage=1;
    window.confirm=()=>true;
    adminActiveTab='encounter';renderAdminPanel();
    document.getElementById('admin-boss-select').value='variant:snowdrift-boss';
    document.getElementById('admin-boss-launch').click();
  });
  await page.waitForFunction(()=>state.screen==='battle'&&battleState.enemy?.name==='スノードリフト'&&!battleState.busy,{},{timeout:30000});
  assert.equal(await page.evaluate(()=>battleState.enemy.variantId),'snowdrift-boss');
  assert.ok(await page.locator('#battle-commands button').count()>0);
  await navigate('home');
  await page.evaluate(()=>{
    adminActiveTab='encounter';renderAdminPanel();
    document.getElementById('admin-boss-select').value='boss-3';
    document.getElementById('admin-boss-launch').click();
  });
  await page.waitForFunction(()=>state.screen==='battle'&&battleState.stage===3&&battleState.enemy?.name==='オオカミ'&&!battleState.busy,{},{timeout:30000});
  assert.equal(await page.evaluate(()=>state.maxUnlockedStage),1);
  const adminBossLaunch=true;
  const enemyPortraits=await page.evaluate(async()=>{
    const expected={"mushroom":"毒胞子を放つキノコもどき.png","mist-bat":"33710b53-8af8-4ef3-b69b-a204696db496.png","ore-crab":"氷晶をまとった鉱石ガニ.png","stray-slime":"e16ff5a5-7daf-4a04-a823-3ab68e474647.png","goblin-scout":"dcebcee7-80cb-4260-8ded-3680ee605f6b.png"};
    const result=[];
    const oldEnemy=battleState.enemy,oldMode=battleState.encounterMode,oldReveal=adminCompendiumReveal;
    try{
      adminCompendiumReveal=true;renderMonsterCompendium();
      battleState.encounterMode=true;
      for(const [id,file] of Object.entries(expected)){
        const path='assets/monsters/'+file;
        const unit=fieldCreateEnemy(id,1);
        if(unit.image!==path)throw Error('Incorrect battle mapping: '+id);
        const card=document.querySelector('[data-monster-id="field:'+id+'"] img');
        if(!card||card.getAttribute('src')!==path)throw Error('Incorrect compendium mapping: '+id);
        const probe=new Image();probe.src=path;await probe.decode();
        battleState.enemy=unit;renderBattle();
        const art=document.querySelector('#battle-enemy .enemy-image');
        if(!art||art.dataset.enemyImage!==path)throw Error('Incorrect battle portrait: '+id);
        await art.decode();
        result.push({id,file,width:art.naturalWidth,height:art.naturalHeight});
      }
      const path=enemyData[0].image;
      if(path!=='assets/monsters/e16ff5a5-7daf-4a04-a823-3ab68e474647.png')throw Error('Incorrect slime mapping');
      const bossCard=document.querySelector('[data-monster-id="boss-1"] img');
      if(!bossCard||bossCard.getAttribute('src')!==path)throw Error('Incorrect slime compendium mapping');
      battleState.encounterMode=false;battleState.enemy={...enemyData[0],maxHp:enemyData[0].hp};renderBattle();
      const slimeArt=document.querySelector('#battle-enemy .enemy-image');
      if(!slimeArt||slimeArt.dataset.enemyImage!==path)throw Error('Incorrect slime battle portrait');
      await slimeArt.decode();result.push({id:'boss-1',file:path.split('/').pop(),width:slimeArt.naturalWidth,height:slimeArt.naturalHeight});
      return result;
    }finally{battleState.enemy=oldEnemy;battleState.encounterMode=oldMode;adminCompendiumReveal=oldReveal;renderBattle();renderMonsterCompendium();}
  });
  assert.equal(enemyPortraits.length,6);
  assert.ok(enemyPortraits.every(x=>x.width>0&&x.height>0));
  results.push({viewport,cycles:3,homePortraits:home,homePoster,townBackground,menuGeometry,menuClickVerified:true,backgroundReferenceReleased:true,adminLevel:levelTest,adminTest,adminBossLaunch,enemyPortraits,fieldLayout,profile,pageErrors:errors});
  assert.deepEqual(errors,[]);
  await page.close();
 }
}finally{fs.writeFileSync('browser-image-lifetime-report.json',JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify(results,null,2));
