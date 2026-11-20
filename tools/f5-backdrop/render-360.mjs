import { chromium } from 'playwright';
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, extname } from 'node:path';

const root = process.cwd();
// Source: ambientCG Facade020C 8K Emission (CC0), mirrored on Wikimedia Commons.
// Download to the temporary Actions workspace, never silently treat fallback as original.
let emissionBytes=null,emissionError=null;
try {
 const url='https://commons.wikimedia.org/wiki/Special:Redirect/file/Facade020C_8K_Emission.png';
 const response=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'Kotama3DRenderQA/1.0 (CC0 texture validation)'}});
 if(!response.ok)throw new Error('HTTP '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length<1000||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Invalid PNG');
 emissionBytes=bytes;
 console.log('FACADE020C_EMISSION_VERIFIED bytes='+bytes.length+' sha256='+createHash('sha256').update(bytes).digest('hex'));
} catch(e){emissionError=String(e);console.warn('FACADE020C_EMISSION_UNAVAILABLE '+emissionError);}

const server = http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    let file;
    if (path === '/facade020c-emission.png') {
      if(!emissionBytes){res.writeHead(404);res.end('Emission unavailable: '+emissionError);return;}
      res.writeHead(200,{'content-type':'image/png','cache-control':'no-store'});res.end(emissionBytes);return;
    }
    if (path === '/three.module.js') file = resolve(root, 'node_modules/three/build/three.module.js');
    else if (path === '/worldlocked-360-backdrop.mjs') file = resolve(root, 'tools/f5-backdrop/worldlocked-360-backdrop.mjs');
    else if (path === '/original-fog-ring.mjs') file = resolve(root, 'tools/f5-backdrop/original-fog-ring.mjs');
    else if (path === '/field/assets/b5-abyss-backdrop.js') file = resolve(root, 'field/assets/b5-abyss-backdrop.js');
    else if (path === '/field/b5-vfx-presets.js') file = resolve(root, 'field/b5-vfx-presets.js');
    else if (path === '/field/b5-distant-fog-background.js') file = resolve(root, 'field/b5-distant-fog-background.js');
    else file = resolve(root, 'tools/f5-backdrop/preview.html');
    let body = await readFile(file);
    if (extname(file) === '.html') {
      body = Buffer.from(body.toString().replace('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js', '/three.module.js'));
    }
    res.writeHead(200, {'content-type':extname(file)==='.html'?'text/html':'text/javascript'});
    res.end(body);
  } catch(e) {res.writeHead(500);res.end(String(e));}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port=server.address().port;
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-web-security']});
const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
page.setDefaultTimeout(90000);
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://127.0.0.1:'+port, {waitUntil:'load'});
try { await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('方位'),{timeout:12000}); }
catch(e) { await mkdir('f5-360-renders',{recursive:true}); await page.screenshot({path:'f5-360-renders/startup-failure.png'}); await writeFile('f5-360-renders/startup-errors.json',JSON.stringify({errors,html:await page.content(),message:String(e)},null,2)); throw new Error('Preview failed to initialize: '+JSON.stringify(errors)+' / '+e); }
await mkdir('f5-360-renders',{recursive:true});
const records=[];
for (const angle of [0,45,90,135,180,225,270,315]) {
  await page.evaluate(a => document.querySelector('[data-angle="'+a+'"]').click(),Math.floor(angle/90)*90);
  if(angle%90!==0) await page.evaluate(() => {for(let i=0;i<3;i++)document.querySelector('#right').click()});
  await page.waitForTimeout(250);
  const name='f5-view-'+String(angle).padStart(3,'0')+'.png';
  const buf=await page.screenshot({path:'f5-360-renders/'+name,timeout:90000});
  records.push({angle,file:name,sha256:createHash('sha256').update(buf).digest('hex'),bytes:buf.length});
}
await page.evaluate(() => document.querySelector('[data-angle="0"]').click());
const before=await page.screenshot({timeout:90000});
for(let i=0;i<8;i++) await page.evaluate(() => document.querySelector('#forward').click());
await page.waitForTimeout(200);
const after=await page.screenshot({path:'f5-360-renders/f5-moved-forward.png',timeout:90000});
const parallax= !before.equals(after);
const unique=new Set(records.map(r=>r.sha256)).size;
const report={status:errors.length?'ERROR':'RENDERED',emissionSource:emissionBytes?'Wikimedia Commons CC0 Facade020C 8K Emission':'FALLBACK_NOT_ORIGINAL',emissionError,uniqueViews:unique,parallaxChanged:parallax,errors,records};
await writeFile('f5-360-renders/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
await browser.close();
server.close();
if(errors.length || unique!==8 || !parallax) process.exitCode=1;
