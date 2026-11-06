const { chromium } = require('playwright');
const ROOT=process.argv[2];
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const [label,opts,tap] of [["タブレット(マウス)",{viewport:{width:1024,height:768}},false],["タブレット(タッチ)",{viewport:{width:1024,height:768},hasTouch:true,isMobile:true},true]])
 for(const interval of [100,200,300,500,800]){
  const ctx=await b.newContext(opts);const p=await ctx.newPage();
  await p.goto('file://'+ROOT+'/index.html');await p.waitForTimeout(1000);
  await p.evaluate(()=>{Object.assign(tutorialState,{started:true,completed:true,phase:"complete"});$("tutorial-overlay").hidden=true;for(let i=1;i<=5;i++)stageEntered[i]=true;showScreen("training");
   shopBuyerId="kotama";trainingPoints.kotama=50;setTreeLevel("kotama","kotama-mastery",1);setTreeLevel("kotama","kotama-shock-spark",2);setTreeLevel("kotama","kotama-shock-bolt",2);renderAll();
   window._opened=[];new MutationObserver(()=>{const d=$("skill-upgrade-dialog");if(d&&!d._n){d._n=1;window._opened.push(d.querySelector(".skill-upgrade-name").textContent.split("／")[1].trim());}}).observe(document.body,{childList:true});});
  await p.evaluate(()=>document.querySelector('[data-upgrade-skill="kotama-mastery"]').scrollIntoView({block:"center"}));
  await p.evaluate(()=>document.querySelector('[data-upgrade-skill="kotama-mastery"]').click());
  const r=await p.evaluate(()=>{const e=document.querySelector("[data-upgrade-confirm]").getBoundingClientRect();return [e.x+e.width/2,e.y+e.height/2];});
  const before=await p.evaluate(()=>JSON.stringify(skillLevels.kotama));
  for(let i=0;i<10;i++){if(tap)await p.touchscreen.tap(r[0],r[1]);else await p.mouse.click(r[0],r[1]);await p.waitForTimeout(interval);}
  await p.waitForTimeout(700);
  const res=await p.evaluate(()=>({lv:Object.fromEntries(Object.entries(skillLevels.kotama).map(([k,v])=>[k.replace("kotama-",""),v])),pts:trainingPoints.kotama,opened:window._opened,open:!!$("skill-upgrade-dialog")}));
  console.log(`${label} 間隔${interval}ms×10: 開いたダイアログ=[${res.opened.join(", ")}] / Lv=${JSON.stringify(res.lv)} / pt 50→${res.pts} / 最後にダイアログ表示中:${res.open}`);
  await ctx.close();
 }
 await b.close();})();
