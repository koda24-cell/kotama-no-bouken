const { chromium } = require('playwright');
const ROOT=process.argv[2];
const log=(...a)=>console.log(...a);
async function setup(b,opts){
 const ctx=await b.newContext(opts);const p=await ctx.newPage();
 p._errs=[];p.on('pageerror',e=>p._errs.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/ERR_TUNNEL|net::/.test(m.text()))p._errs.push(m.text())});
 await p.goto('file://'+ROOT+'/index.html');await p.waitForTimeout(1200);
 await p.evaluate(()=>{Object.assign(tutorialState,{started:true,completed:true,phase:"complete"});const o=$("tutorial-overlay");if(o)o.hidden=true;
  for(let i=1;i<=5;i++)stageEntered[i]=true;trainingPoints.kotama=20;shopBuyerId="kotama";selectedTrainingSkill=null;showScreen("training");renderAll();});
 await p.waitForTimeout(300);return p;
}
const st=p=>p.evaluate(()=>({pts:trainingPoints.kotama,lv:Object.fromEntries(treeNodes("kotama").map(n=>[n.id.replace("kotama-",""),getTreeLevel("kotama",n.id)])),dialog:!!$("skill-upgrade-dialog"),
  inert:[...document.body.children].filter(e=>e.inert).length,ov:document.body.style.overflow+"|"+document.documentElement.style.overflow,
  focus:document.activeElement?(document.activeElement.tagName+" "+(document.activeElement.dataset.selectSkill?"詳細:"+document.activeElement.dataset.selectSkill:document.activeElement.dataset.upgradeSkill?"強化ボタン:"+document.activeElement.dataset.upgradeSkill:(document.activeElement.textContent||"").trim().slice(0,12))):"none"}));
async function openFor(p,node){await p.locator(`[data-upgrade-skill="${node}"]`).click();await p.waitForTimeout(100);}
async function confirmBox(p){return await p.locator('[data-upgrade-confirm]').boundingBox();}
async function underPoint(p,x,y){return p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);if(!e)return "none";const btn=e.closest("button");return btn?(btn.dataset.upgradeSkill?"強化ボタン:"+btn.dataset.upgradeSkill+(btn.disabled?"(無効)":""):btn.dataset.selectSkill?"詳細:"+btn.dataset.selectSkill:btn.textContent.trim().slice(0,10)):e.tagName+"."+e.className.toString().slice(0,30)},[x,y]);}

(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const VIEWS={PC:{viewport:{width:1280,height:800}},SP:{viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2}};
 for(const [vn,opts] of Object.entries(VIEWS)){
  log(`\n======== ${vn} ========`);
  // --- T1: A-01 連打（確定ボタン位置を一定間隔で連打）
  for(const interval of [60,150,250,400,600]){
   const p=await setup(b,opts);
   // 前提を満たす状態：パッシブLv1にして、SP A/Bも強化可能に
   await p.evaluate(()=>{setTreeLevel("kotama","kotama-mastery",1);renderAll();});
   const target="kotama-shock-spark";await openFor(p,target);
   const bx=await confirmBox(p);const x=bx.x+bx.width/2,y=bx.y+bx.height/2;
   const before=await st(p);
   const opened=[];await p.exposeFunction('_noteOpen',t=>opened.push(t)).catch(()=>{});
   await p.evaluate(()=>{const o=new MutationObserver(()=>{const d=$("skill-upgrade-dialog");if(d&&!d._noted){d._noted=1;window._noteOpen(d.querySelector(".skill-upgrade-name").textContent);}});o.observe(document.body,{childList:true});});
   for(let i=0;i<14;i++){ if(vn==="SP")await p.touchscreen.tap(x,y); else await p.mouse.click(x,y); await p.waitForTimeout(interval);}
   await p.waitForTimeout(600);
   const after=await st(p);const under=await underPoint(p,x,y);
   log(`T1 連打 間隔${interval}ms ×14回: pts ${before.pts}→${after.pts} / Lv ${JSON.stringify(after.lv)} / 追加で開いたダイアログ:${opened.length?opened.join(","):"なし"} / 確定位置の下:${under} / 表示中ダイアログ:${after.dialog} / errors:${p._errs.length}`);
   await p.context().close();
  }
  // --- T2: キーボード二重実行
  {
   const p=await setup(b,opts);await p.evaluate(()=>{setTreeLevel("kotama","kotama-mastery",1);renderAll();});
   await openFor(p,"kotama-shock-spark");await p.locator('[data-upgrade-confirm]').focus();
   for(let i=0;i<10;i++){await p.keyboard.press('Enter');await p.waitForTimeout(30);}
   await p.waitForTimeout(600);let s=await st(p);log(`T2 Enter×10（30ms間隔）: pts 20→${s.pts} / spark Lv ${s.lv["shock-spark"]} / dialog:${s.dialog} / focus:${s.focus}`);
   await openFor(p,"kotama-shock-spark");await p.locator('[data-upgrade-confirm]').focus();
   await p.keyboard.down(' ');for(let i=0;i<20;i++){await p.keyboard.down(' ');await p.waitForTimeout(40);}await p.keyboard.up(' ');
   await p.waitForTimeout(600);s=await st(p);log(`T2 Space長押し→離す: pts→${s.pts} / spark Lv ${s.lv["shock-spark"]} / dialog:${s.dialog} / focus:${s.focus}`);
   await openFor(p,"kotama-shock-spark");await p.locator('[data-upgrade-confirm]').focus();
   await p.keyboard.down('Enter');for(let i=0;i<25;i++){await p.keyboard.down('Enter');await p.waitForTimeout(40);}await p.keyboard.up('Enter');
   await p.waitForTimeout(600);s=await st(p);log(`T2 Enter長押し(約1秒): pts→${s.pts} / spark Lv ${s.lv["shock-spark"]} / dialog:${s.dialog} / focus:${s.focus} / errors:${p._errs.length}`);
   // ダブルクリック（同一ダイアログ内）
   await openFor(p,"kotama-shock-spark");await p.locator('[data-upgrade-confirm]').dblclick({force:true}).catch(e=>log("dblclick err",e.message.slice(0,60)));
   await p.waitForTimeout(600);s=await st(p);log(`T2 確定ボタンをダブルクリック: pts→${s.pts} / spark Lv ${s.lv["shock-spark"]}`);
   await p.context().close();
  }
  // --- T3: 状態整合性
  {
   const p=await setup(b,opts);await p.evaluate(()=>{setTreeLevel("kotama","kotama-mastery",1);renderAll();});
   const cases=[["所持pt減少",()=>{trainingPoints.kotama=0;}],["所持pt変化(+1)",()=>{trainingPoints.kotama+=1;}],["Lv変化",()=>{setTreeLevel("kotama","kotama-shock-spark",getTreeLevel("kotama","kotama-shock-spark")+1);}],["前提喪失(パッシブLv0)",()=>{setTreeLevel("kotama","kotama-mastery",0);}],["ステージ未到達",()=>{stageEntered[2]=false;}]];
   for(const [name,fn] of cases){
    await p.evaluate(()=>{trainingPoints.kotama=20;setTreeLevel("kotama","kotama-mastery",1);setTreeLevel("kotama","kotama-shock-spark",0);for(let i=1;i<=5;i++)stageEntered[i]=true;renderAll();});
    await p.waitForTimeout(500);
    await openFor(p,"kotama-shock-spark");
    await p.evaluate(`(${fn.toString()})()`);const mid=await st(p);
    await p.locator('[data-upgrade-confirm]').click();await p.waitForTimeout(100);
    const s=await st(p);const msg=await p.evaluate(()=>$("system-message")?.textContent||"");
    log(`T3 ${name}: 変更後pt ${mid.pts}→確定後 ${s.pts} / spark Lv ${mid.lv["shock-spark"]}→${s.lv["shock-spark"]} / 中止メッセージ:${/中止/.test(msg)} / focus:${s.focus}`);
   }
   // ダイアログ表示中に背面を操作できるか
   await p.evaluate(()=>{trainingPoints.kotama=20;setTreeLevel("kotama","kotama-mastery",1);setTreeLevel("kotama","kotama-shock-spark",0);for(let i=1;i<=5;i++)stageEntered[i]=true;renderAll();});await p.waitForTimeout(500);
   await openFor(p,"kotama-shock-spark");
   const bg=await p.locator('[data-upgrade-skill="kotama-shock-bolt"]').boundingBox();
   const underBg=await underPoint(p,bg.x+bg.width/2,bg.y+bg.height/2);
   await p.mouse.click(bg.x+bg.width/2,bg.y+bg.height/2);await p.waitForTimeout(100);
   let s=await st(p);log(`T3 表示中に背面の別スキルボタン位置をクリック: その位置の要素=${underBg} / ダイアログ:${s.dialog} / pts ${s.pts} / Lv ${JSON.stringify(s.lv)}`);
   if(s.dialog){await p.locator('[data-upgrade-cancel]').click();await p.waitForTimeout(100);await openFor(p,"kotama-shock-spark");}
   const seen=new Set();for(let i=0;i<8;i++){await p.keyboard.press('Tab');seen.add((await st(p)).focus);} 
   log(`T3 表示中にTab×8でフォーカスした先: ${[...seen].join(" / ")}`);
   s=await st(p);log(`T3 表示中の状態: 背面inert要素数=${s.inert} / overflow=${s.ov}`);
   await p.context().close();
  }
  // --- T4: フォーカス制御
  {
   const p=await setup(b,opts);await p.evaluate(()=>{setTreeLevel("kotama","kotama-mastery",1);renderAll();});
   await openFor(p,"kotama-shock-spark");let s=await st(p);log(`T4 開いた直後のフォーカス: ${s.focus}`);
   await p.locator('[data-upgrade-cancel]').click();await p.waitForTimeout(100);s=await st(p);log(`T4 キャンセル後: focus=${s.focus} / inert=${s.inert} / overflow="${s.ov}"`);
   await openFor(p,"kotama-shock-spark");await p.keyboard.press('Escape');await p.waitForTimeout(100);s=await st(p);log(`T4 Esc後: focus=${s.focus} / dialog=${s.dialog} / inert=${s.inert}`);
   await openFor(p,"kotama-shock-spark");await p.mouse.click(5,5);await p.waitForTimeout(100);s=await st(p);log(`T4 背景クリック後: focus=${s.focus} / dialog=${s.dialog} / inert=${s.inert}`);
   await openFor(p,"kotama-shock-spark");await p.locator('[data-upgrade-confirm]').click();await p.waitForTimeout(100);s=await st(p);log(`T4 確定後: focus=${s.focus} / inert=${s.inert} / overflow="${s.ov}"`);
   await p.waitForTimeout(500);
   // 確定で最大Lvになりボタンが無効化されるケース（旧ツリー：派生 max1）
   await p.evaluate(()=>{shopBuyerId="warrior";trainingPoints.warrior=5;setTreeLevel("warrior","warrior-passive",1);setTreeLevel("warrior","warrior-branch-a",2);setTreeLevel("warrior","warrior-branch-b",2);renderAll();});await p.waitForTimeout(200);
   await openFor(p,"warrior-derived");await p.locator('[data-upgrade-confirm]').click();await p.waitForTimeout(100);
   const wf=await p.evaluate(()=>{const a=document.activeElement;return a.dataset.selectSkill||a.dataset.upgradeSkill||a.tagName;});
   const wb=await p.evaluate(()=>document.querySelector('[data-upgrade-skill="warrior-derived"]').disabled);
   log(`T4 最大Lvに達した確定後: focus=${wf} / 強化ボタン無効=${wb} / warrior pt=${await p.evaluate(()=>trainingPoints.warrior)}`);
   await p.waitForTimeout(500);
   // 450ms後にキー操作が戻るか
   await p.keyboard.press('Tab');const ok=await p.evaluate(()=>document.activeElement!==document.body);log(`T4 シールド解除後にTabが効く: ${ok}`);
   log(`T4 errors: ${p._errs.join(" | ")||"なし"}`);
   await p.context().close();
  }
 }
 await b.close();
})();
