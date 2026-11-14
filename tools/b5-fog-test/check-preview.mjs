import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),port=8765;
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep))throw Error('invalid path');
    const data=await readFile(file);
    res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');
    res.end(data);
  }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('http://127.0.0.1:8765/preview/b5-distant-fog-background.html',{waitUntil:'networkidle',timeout:60000});
  await page.waitForSelector('canvas',{timeout:15000});
  await page.waitForTimeout(1800);
  console.log('Window texture source:',await page.locator('body').getAttribute('data-window-source'));
  await mkdir('render-output/b5-fog',{recursive:true});
  await page.locator('canvas').screenshot({path:'render-output/b5-fog/fog-initial.png'});
  // Save an additional late frame to inspect slow fog drift and randomized lights.
  await page.waitForTimeout(2500);
  await page.locator('canvas').screenshot({path:'render-output/b5-fog/fog-animated.png'});
  await page.waitForTimeout(3200);
  await page.locator('canvas').screenshot({path:'render-output/b5-fog/fog-late.png'});
  await page.locator('#toggle').click();
  const label=await page.locator('#toggle').textContent();
  if(!label.includes('再開'))throw Error('pause button did not toggle');
  if(errors.length)throw Error(errors.join('\n'));
  const fs=await import('node:fs/promises');
  const first=await fs.readFile('render-output/b5-fog/fog-initial.png'),second=await fs.readFile('render-output/b5-fog/fog-animated.png');
  if(first.equals(second))throw Error('Animation frames identical');
  await page.goto('http://127.0.0.1:8765/preview/b5-v5-combined-scene.html',{waitUntil:'networkidle',timeout:60000});
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1500);
  await page.locator('canvas').screenshot({path:'render-output/b5-fog/b5-v5-combined-scene.png'});
  if(errors.length)throw Error(errors.join('\\n'));
  console.log('PASS: fog animation and combined B5 corridor VFX scene rendered');
}finally{await browser.close();await new Promise(r=>server.close(r));}
