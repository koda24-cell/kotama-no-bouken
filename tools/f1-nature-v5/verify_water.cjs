'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../..'),MODULES=process.env.BROWSER_MODULES||'/workspace/work/browser/node_modules',OUT=process.env.WATER_V5_OUT||path.join(ROOT,'docs/reviews/f1-v5-water');
const {chromium}=require(path.join(MODULES,'playwright-core'));
const types={'.js':'text/javascript','.json':'application/json','.png':'image/png','.html':'text/html'};
const server=http.createServer((q,s)=>{
 if(q.url==='/favicon.ico'){s.writeHead(204);return s.end();}
 if(q.url==='/review'){s.writeHead(200,{'Content-Type':'text/html'});return s.end('<!doctype html><html><head><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/":"/three/","three/addons/":"/three/examples/jsm/"}}</script></head><body style="margin:0;background:#111"></body></html>');}
 const url=decodeURIComponent(q.url.split('?')[0]);const base=url.startsWith('/three/')?path.join(MODULES,'three'):ROOT;
 const file=path.resolve(base,'.'+(url.startsWith('/three/')?url.slice(6):url));if(!file.startsWith(base+'/')){s.writeHead(403);return s.end();}
 fs.readFile(file,(e,b)=>{s.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});s.end(e?'not found':b);});
});
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});await new Promise(r=>server.listen(8819,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[],warnings=[];
 try{
 const page=await browser.newPage({viewport:{width:480,height:320}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
 await page.goto('http://127.0.0.1:8819/review');
 const init=await page.evaluate(async()=>{
  const THREE=await import('three'),{createClosedWaterV4}=await import('/field/f1-closed-water-v4.js');
  const layout=await(await fetch('/assets/3d/dungeons/b1_sacred_forest_candidates/scene/game-layout-v5.json')).json();const map=layout.beforeFingerprint.saveCriticalData.map;
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(480,320);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x111d16);scene.fog=new THREE.FogExp2(0x111d16,.022);
  scene.add(new THREE.HemisphereLight(0xa4bca2,0x263323,2.0));const sun=new THREE.DirectionalLight(0xe0e4be,2.2);sun.position.set(55,12,26);scene.add(sun);
  const camera=new THREE.PerspectiveCamera(54,480/320,.05,48);camera.position.set(62,2.2,43);camera.lookAt(63,-.25,32);
  const nativeGeometry=new THREE.PlaneGeometry(4,4).rotateX(-Math.PI/2),nativeMaterial=new THREE.MeshStandardMaterial({color:0x0b2a36});const meshes=[];
  for(let z=0;z<map.length;z++)for(let x=0;x<map[z].length;x++)if(map[z][x]==='~'){const m=new THREE.Mesh(nativeGeometry,nativeMaterial);m.position.set(x*4,-.15,z*4);meshes.push(m);scene.add(m);}
  const root=new THREE.Group();scene.add(root);renderer.render(scene,camera);const baseline={geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};
  const {createApertureLightV5}=await import('/field/f1-aperture-light-v5.js');const aperture=createApertureLightV5({root,openings:[[15,8]],renderer});
  const {createCeilingSealV5}=await import('/field/f1-ceiling-seal-v5.js');const proxy=new THREE.Group();const proxyMaterial=new THREE.MeshStandardMaterial({name:'sacred_weathered_stone'});proxy.add(new THREE.Mesh(nativeGeometry,proxyMaterial));
  const seal=createCeilingSealV5({root,tiles:[[14,7]],walls:[{position:[56,0,26],rotationY:0},{position:[58,0,28],rotationY:-Math.PI/2},{position:[56,0,30],rotationY:Math.PI},{position:[54,0,28],rotationY:Math.PI/2}],source:proxy});root.updateMatrixWorld(true);
  const sealGroup=root.getObjectByName('f1-v5:closed-wall-roof-junctions');let seamHits=0;for(const d of[[0,1,0],[2,2.9,0],[-2,2.9,0],[0,2.9,2],[0,2.9,-2]]){const ray=new THREE.Raycaster(new THREE.Vector3(56,1.6,28),new THREE.Vector3(...d).normalize(),0,10);if(ray.intersectObject(sealGroup,true).length)seamHits++;}if(seamHits!==5)throw new Error('Actual seam geometry is not closed');
  const water=await createClosedWaterV4({meshes,root,map});water.update(0);renderer.render(scene,camera);window.review={renderer,scene,camera,meshes,water,aperture,seal,proxyMaterial,nativeGeometry,nativeMaterial,baseline};return {info:water.info(),aperture:aperture.info(),seamHits,baseline};
 });
 await page.screenshot({path:path.join(OUT,'water-time-0.png'),timeout:180000});
 const second=await page.evaluate(()=>{const r=window.review;r.water.update(5);r.aperture.update(5);r.renderer.render(r.scene,r.camera);return {...r.water.info(),aperture:r.aperture.info()};});
 await page.screenshot({path:path.join(OUT,'water-time-5.png'),timeout:180000});
 const teardown=await page.evaluate(()=>{const r=window.review;r.water.dispose();r.water.dispose();r.aperture.dispose();r.aperture.dispose();r.seal.dispose();r.seal.dispose();r.proxyMaterial.dispose();r.renderer.render(r.scene,r.camera);return {restored:r.meshes.every(m=>m.material===r.nativeMaterial&&m.geometry===r.nativeGeometry),memory:{geometries:r.renderer.info.memory.geometries,textures:r.renderer.info.memory.textures},baseline:r.baseline,shadowRestored:!r.renderer.shadowMap.enabled,info:r.water.info(),glError:r.renderer.getContext().getError()};});
 assert.equal(init.info.shaderCompiled,true);assert.equal(second.animatedTimeSeconds,5);assert.equal(second.aperture.animatedTimeSeconds,5);assert.equal(init.aperture.visibleEmitterMeshes,0);assert.equal(teardown.restored,true);assert.equal(teardown.shadowRestored,true);assert.equal(init.info.reflectionRenderTargets,1);assert(init.info.reflectionUpdates>0);assert.deepEqual(teardown.memory,teardown.baseline);assert.equal(teardown.glError,0);assert.deepEqual(errors,[]);assert.deepEqual(warnings.filter(s=>/WebGL|GL_INVALID|shader/i.test(s)),[]);
 const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT,file))).digest('hex');const hashes=[hash('water-time-0.png'),hash('water-time-5.png')];assert.notEqual(...hashes);
 const sourceSHA256=crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'field/f1-closed-water-v4.js'))).digest('hex');
 const result={passed:true,sourceSHA256,apertureSourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'field/f1-aperture-light-v5.js'))).digest('hex'),scope:'Independent WebGL water module, not actual-game integration or real-device FPS',init,second,teardown,errors,warnings,screenshotSHA256:hashes};fs.writeFileSync(path.join(OUT,'water-verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
