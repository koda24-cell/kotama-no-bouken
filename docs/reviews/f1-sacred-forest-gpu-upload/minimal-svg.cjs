const fs=require('fs'),path=require('path');
const {chromium}=require('/workspace/work/browser/node_modules/playwright-core');
const instrument=fs.readFileSync('/workspace/work/f1-gpu-diagnostic/instrument.js','utf8');
let browser;
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 browser=b;const c=await b.newContext();await c.addInitScript({content:instrument+'\ninstrumentWebGL();'});const p=await c.newPage(),messages=[];
 p.on('console',m=>messages.push({type:m.type(),text:m.text()}));
 await c.route(/https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/(.*)/,async r=>{const f=r.request().url().split('three@0.180.0/')[1];await r.fulfill({path:path.join('/workspace/work/browser/node_modules/three',f),contentType:'text/javascript'});});
 await c.route('**/gpu-minimal',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
 await c.route('**/assets/monsters/dragon.svg',r=>r.fulfill({path:'/workspace/work/kotama/assets/monsters/dragon.svg',contentType:'image/svg+xml'}));
 await p.goto('http://127.0.0.1:8797/gpu-minimal');
 const result=await p.evaluate(async()=>{
  const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
  const results=[];
  for(const mode of ['svg-html-image','svg-canvas-raster','typed-data-mip-control']){
   window.__glDiag.phase=mode;const errorsBefore=window.__glDiag.errors.length;
   const renderer=new THREE.WebGLRenderer();renderer.setSize(32,32);document.body.appendChild(renderer.domElement);const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=2;
   let texture,image;
   if(mode==='typed-data-mip-control'){
    const data=new Uint8Array(16*16*4).fill(255);texture=new THREE.DataTexture(data,16,16);texture.mipmaps=[];for(let n=16;n;n>>=1)texture.mipmaps.push({width:n,height:n,data:new Uint8Array(n*n*4).fill(255)});texture.generateMipmaps=false;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.needsUpdate=true;
   }else{
    image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src='/assets/monsters/dragon.svg';});
    if(mode==='svg-canvas-raster'){const canvas=document.createElement('canvas');canvas.width=canvas.height=512;canvas.getContext('2d').drawImage(image,0,0,512,512);texture=new THREE.CanvasTexture(canvas);}
    else{texture=new THREE.Texture(image);texture.needsUpdate=true;}
   }
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture}));scene.add(mesh);renderer.render(scene,camera);await new Promise(r=>setTimeout(r,100));
   results.push({mode,image:image?{type:image.constructor.name,width:image.width,height:image.height,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,complete:image.complete,src:image.src}:null,newErrors:window.__glDiag.errors.slice(errorsBefore)});
   scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();texture.dispose();renderer.dispose();
  }
  return {results,gl:JSON.parse(JSON.stringify(window.__glDiag))};
 });await p.waitForTimeout(200);result.messages=messages;fs.writeFileSync('/workspace/work/f1-gpu-diagnostic/minimal-svg-result.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({cases:result.results.map(x=>({mode:x.mode,image:x.image,uploadErrors:x.newErrors.filter(e=>e.error).length,priorErrors:x.newErrors.filter(e=>e.priorError).length})),messages},null,2));await b.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
