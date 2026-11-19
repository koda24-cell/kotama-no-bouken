import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright-core';
const root=path.resolve(import.meta.dirname);
const out=path.resolve(root,'../../../render-output/floor6/threejs-backface-review');
const glb=process.env.F6_SOURCE_GLB;
if(!glb)throw Error('F6_SOURCE_GLB not set');
await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.glb':'model/gltf-binary','.json':'application/json','.map':'application/json'};
const server=http.createServer(async(req,res)=>{
 try{
 const u=new URL(req.url,'http://localhost');
 let file;
 if(u.pathname==='/favicon.ico'){res.writeHead(204);res.end();return}
 if(u.pathname==='/') file=path.join(root,'index.html');
 else if(u.pathname==='/asset/foliage_normal_test_NOT_APPROVED.glb')file=glb;
 else if(u.pathname.startsWith('/node_modules/')){
   const rel=decodeURIComponent(u.pathname.substring('/node_modules/'.length));
   file=path.resolve(root,'node_modules',rel);
   if(!file.startsWith(path.join(root,'node_modules')+path.sep))throw Error('traversal');
 } else {res.writeHead(404);res.end('not found');return}
 const bytes=await fs.readFile(file);
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch(e){res.writeHead(404);res.end(String(e))}
});
await new Promise(resolve=>server.listen(4177,'127.0.0.1',resolve));
const executable=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1600,height:680},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try{
 await page.goto('http://127.0.0.1:4177/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.f6?.loaded||window.f6?.errors?.length,{timeout:45000});
 const report=await page.evaluate(()=>window.f6);
 if(!report.loaded||report.errors.length)throw Error(JSON.stringify({report,errors}));
 if(report.meshes!==420||report.materialKinds.length!==3||report.shaderPatched!==2)throw Error('GLB/special shader counts mismatch '+JSON.stringify(report));
 const views=[];
 for(const mode of ['front','angle','underside']){
  const r=await page.evaluate(mode=>window.f6Render(mode),mode);
  if(r.rendered<=0)throw Error('zero GPU draw calls '+mode);
  await page.locator('canvas').screenshot({path:path.join(out,mode+'.png')});
  views.push(r);
 }
 const closeups=[];
 for(const [panel,letter] of ['A','B','C'].entries()){
  for(const mode of ['front','underside']){
   const result=await page.evaluate(({panel,mode})=>window.f6RenderClose(panel,mode),{panel,mode});
   if(result.drawCalls<=0)throw Error('no draw calls for '+letter+mode);
   await page.locator('canvas').screenshot({path:path.join(out,letter+'_'+mode+'_close.png')});
   closeups.push({label:letter,...result});
  }
 }
 await page.evaluate(()=>window.f6FaceDebug(true));
 for(const panel of [1,2]){
  await page.evaluate(panel=>window.f6RenderClose(panel,'underside'),panel);
  await page.locator('canvas').screenshot({path:path.join(out,(panel===1?'B':'C')+'_face_debug.png')});
 }
 await page.evaluate(()=>window.f6FaceDebug(false));
 if(errors.length)throw Error('WebGL/browser errors '+JSON.stringify(errors));
 const info={status:'NOT_APPROVED',three:report.threeVersion,meshes:report.meshes,materialNames:report.materials,
  shaderPatched:report.shaderPatched,bounds:report.bounds,views,closeups,comments:'Blender B backside nodes were not retained in glTF; compared shader-controlled Three.js per-side correction'};
 await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(info,null,2));
 console.log('F6_THREEJS_REAL_RENDER_DONE',JSON.stringify(info));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
