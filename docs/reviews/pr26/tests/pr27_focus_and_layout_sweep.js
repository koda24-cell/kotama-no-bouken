const { chromium } = require('playwright');
const ROOT=process.argv[2];
async function setup(b,opts){const ctx=await b.newContext(opts);const p=await ctx.newPage();p._errs=[];p.on('pageerror',e=>p._errs.push(e.message));
 await p.goto('file://'+ROOT+'/index.html');await p.waitForTimeout(1000);
 await p.evaluate(()=>{Object.assign(tutorialState,{started:true,completed:true,phase:"complete"});const o=$("tutorial-overlay");if(o)o.hidden=true;for(let i=1;i<=5;i++)stageEntered[i]=true;showScreen("training");});return p;}
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 // SP: 表示中のTab
 {const p=await setup(b,{viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await p.evaluate(()=>{shopBuyerId="kotama";trainingPoints.kotama=5;setTreeLevel("kotama","kotama-mastery",1);renderAll();});
  await p.locator('[data-upgrade-skill="kotama-shock-spark"]').click();await p.waitForTimeout(100);
  const seen=new Set();for(let i=0;i<8;i++){await p.keyboard.press('Tab');seen.add(await p.evaluate(()=>document.activeElement.textContent.trim().slice(0,8)));}
  const s=await p.evaluate(()=>({inert:[...document.body.children].filter(e=>e.inert).length,ov:document.body.style.overflow}));
  console.log(`SP 表示中Tab×8: ${[...seen].join(" / ")} / inert=${s.inert} / overflow=${s.ov}`);await p.context().close();}
 // 総当たり：確定・キャンセル位置の下にある要素（閉じた直後）
 const views={"PC 1280x800":{viewport:{width:1280,height:800}},"タブレット 1024x768":{viewport:{width:1024,height:768}},"スマホ 390x844":{viewport:{width:390,height:844},hasTouch:true,isMobile:true},"小型 360x640":{viewport:{width:360,height:640},hasTouch:true,isMobile:true},"横向き 844x390":{viewport:{width:844,height:390},hasTouch:true,isMobile:true}};
 for(const [vn,opts] of Object.entries(views)){
  const p=await setup(b,opts);const risky=[];let total=0;
  for(const cid of ["kotama","knight","healer","mage","warrior","samurai"]){
   for(const scrollY of [0,400,99999]){
    await p.evaluate(([cid])=>{shopBuyerId=cid;trainingPoints[cid]=50;const t=skillTreeDefinitions[cid];setTreeLevel(cid,t.passive.id,1);setTreeLevel(cid,t.a.id,2);setTreeLevel(cid,t.b.id,2);setTreeLevel(cid,t.derived.id,0);selectedTrainingSkill=null;renderAll();},[cid]);
    const nodes=await p.evaluate(()=>[...document.querySelectorAll('[data-upgrade-skill]:not([disabled])')].map(b=>b.dataset.upgradeSkill));
    for(const node of nodes){
     await p.evaluate(([y,node])=>{const b=document.querySelector(`[data-upgrade-skill="${node}"]`);b.scrollIntoView({block:"center"});window.scrollBy(0,0);},[scrollY,node]);
     if(scrollY===400)await p.evaluate(()=>window.scrollBy(0,200));
     const ok=await p.evaluate(([node])=>{const b=document.querySelector(`[data-upgrade-skill="${node}"]`);if(!b||b.disabled)return false;b.click();return !!$("skill-upgrade-dialog");},[node]);
     if(!ok)continue;total++;
     const pts=await p.evaluate(()=>["[data-upgrade-confirm]","[data-upgrade-cancel]"].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,r.x+r.width/2,r.y+r.height/2];}));
     await p.evaluate(()=>closeSkillUpgradeDialog());
     for(const [s,x,y] of pts){const u=await p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);const btn=e&&e.closest("button");return btn&&btn.dataset.upgradeSkill&&!btn.disabled?btn.dataset.upgradeSkill:null;},[x,y]);
      if(u)risky.push(`${cid}:${node} の${s.includes("confirm")?"確定":"キャンセル"}位置→強化ボタン ${u}`);}
    }
   }
  }
  console.log(`${vn}: ダイアログ${total}回 / 閉じた後に有効な強化ボタンが下にあったケース ${risky.length}件`+(risky.length?"\n   "+[...new Set(risky)].slice(0,8).join("\n   "):""));
  await p.context().close();
 }
 await b.close();})();
