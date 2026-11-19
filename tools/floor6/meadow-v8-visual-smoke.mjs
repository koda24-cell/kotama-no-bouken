/** Screenshot actual V7 GLB through Three.js. All output is unapproved review evidence. */
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
const dir='render-output/f6-meadow-v8';
await mkdir(dir,{recursive:true});
const port=8786;
const url=`http://127.0.0.1:${port}/tools/floor6/meadow-v8-preview.html`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){for(let i=0;i<60;i++){try{if((await fetch(url)).ok)return;}catch{}await sleep(200);}throw Error('local HTTP server unavailable');}
let browser;
try{
 await ready();
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1200,height:800},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push('pageerror: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
 await page.goto(url,{waitUntil:'load'});
 await page.waitForFunction(()=>window.__kotamaMeadowV8?.ready===true || !!window.__kotamaMeadowV8?.error,null,{timeout:45000});
 const loadError=await page.evaluate(()=>window.__kotamaMeadowV8.error);
 if(loadError)throw Error('V7 GLB preview error: '+loadError);
 await page.evaluate(()=>{window.__kotamaMeadowV8.freeze(0);window.__kotamaMeadowV8.setWind(false);window.__kotamaMeadowV8.setEnhanced(false);});
 const shots=[];
 async function shot(name,view){
  await page.evaluate(v=>window.__kotamaMeadowV8.setView(v),view);
  await sleep(450);
  const file=`${dir}/${name}.png`;
  await page.screenshot({path:file});
  const data=await readFile(file);
  const metrics=await page.evaluate(()=>window.__kotamaMeadowV8.metrics());
  shots.push({name,view,file,sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length,...metrics});
 }
 await shot('v7-baseline-angle','angle');
 await page.evaluate(()=>window.__kotamaMeadowV8.setEnhanced(true));
 for(const view of ['front','side','angle','top'])await shot('v8-enhanced-'+view,view);
 await page.evaluate(()=>{window.__kotamaMeadowV8.setTiling(true);window.__kotamaMeadowV8.setWind(true);window.__kotamaMeadowV8.freeze(2.0);});
 await shot('v8-3x3-wind-t2','wide');
 await page.evaluate(()=>window.__kotamaMeadowV8.freeze(3.5));
 await shot('v8-3x3-wind-t3p5','wide');
 if(shots[0].sha256===shots[3].sha256)throw Error('V8 shading made no visible difference from baseline');
 if(shots[5].sha256===shots[6].sha256)throw Error('wind frames are identical');
 if(shots[5].calls<=shots[3].calls)throw Error('3x3 tile did not increase rendered draw calls');
 if(errors.length)throw Error(errors.join('\n'));
 const report={status:'NOT_APPROVED',source:'V7 original GLB artifact run 43602069517',preview:'Three.js WebGL SwiftShader / Playwright desktop',notes:['V8 changes shader only, not GLB geometry','GPU hardware FPS and visual acceptance NOT verified'],shots,errors};
 await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({status:report.status,shots:shots.length,files:shots.map(s=>s.file),metrics:shots.map(s=>({name:s.name,calls:s.calls,tris:s.triangles}))},null,2));
 await page.close();
}finally{await browser?.close();server.kill();}
