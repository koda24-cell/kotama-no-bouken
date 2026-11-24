'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../..'),MODULES='/workspace/work/browser/node_modules',OUT=path.join(ROOT,'docs/reviews/f1-v6-grass');
const {chromium}=require(MODULES+'/playwright-core'),validator=require(MODULES+'/gltf-validator');
const source='assets/3d/dungeons/b1_nature_v6_candidates/sedge/props/v6_sedge.glb',cards=source.replace('.glb','_cards.glb');
const mime={'.js':'text/javascript','.glb':'model/gltf-binary','.png':'image/png'};
const server=http.createServer((req,res)=>{
 if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}
 if(req.url==='/review'){res.writeHead(200,{'Content-Type':'text/html'});return res.end('<!doctype html><html><head><meta charset="utf-8"><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script></head><body style="margin:0;background:#101b16;color:#dbe3d2;font:16px sans-serif"><div style="display:flex;justify-content:space-around;padding:12px"><span>立体原本：4,320三角形／株</span><span>透過画像の交差板：6三角形／株</span></div><div id="views" style="display:flex"></div></body></html>');}
 const url=decodeURIComponent(req.url.split('?')[0]),base=url.startsWith('/three/')?MODULES+'/three':ROOT,file=path.resolve(base,'.'+(url.startsWith('/three/')?url.slice(6):url));
 if(!file.startsWith(base+'/')){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(e?'missing':b);});
});
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});const validations={};for(const file of [source,cards]){const r=await validator.validateBytes(new Uint8Array(fs.readFileSync(path.join(ROOT,file))),{uri:file});assert.equal(r.issues.numErrors,0);validations[file]=r.issues;}
 await new Promise(r=>server.listen(8836,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1000,height:500}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('http://127.0.0.1:8836/review');
 const result=await page.evaluate(async({source,cards})=>{
  const THREE=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{setFoliageCoverage}=await import('/preview/f1-foliage-coverage.js');const {grassCutoutMaterialV6}=await import('/field/f1-grass-cutout-lighting-v6.js');const loader=new GLTFLoader(),reports=[];
  for(const file of [source,cards]){
   const gltf=await loader.loadAsync('/'+file);if(file.includes('_cards'))gltf.scene.traverse(o=>{if(o.isMesh)o.material=grassCutoutMaterialV6(o.material);});const coverage=setFoliageCoverage(gltf.scene,true);
   const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(500,450);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.getElementById('views').append(renderer.domElement);
   const scene=new THREE.Scene();scene.background=new THREE.Color(0x101b16);scene.fog=new THREE.FogExp2(0x101b16,.044);scene.add(new THREE.HemisphereLight(0x95aaa2,0x263426,1.45));const light=new THREE.DirectionalLight(0xb7c8a5,1.05);light.position.set(-3,5,2);scene.add(light);
   const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,30).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x263829,roughness:.96}));ground.position.y=-.006;scene.add(ground);
   gltf.scene.updateMatrixWorld(true);const inv=gltf.scene.matrixWorld.clone().invert();gltf.scene.traverse(o=>{if(!o.isMesh)return;const batch=new THREE.InstancedMesh(o.geometry,o.material,25);for(let i=0;i<25;i++){const m=new THREE.Matrix4().makeRotationY(i*1.7);m.setPosition((i%5-2)*1.15,0,-Math.floor(i/5)*1.4);batch.setMatrixAt(i,m.multiply(inv).multiply(o.matrixWorld));}batch.computeBoundingSphere();scene.add(batch);});
   const camera=new THREE.PerspectiveCamera(68,500/450,.05,30);camera.position.set(0,1.6,2.7);camera.lookAt(0,1.6,-5);
   renderer.render(scene,camera);const t=performance.now();renderer.render(scene,camera);
   reports.push({file,renderedPlants:25,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,diagnosticCpuFrameMs:performance.now()-t,glError:renderer.getContext().getError(),coverage:coverage.map(c=>({material:c.material,cutoff:c.cutoff,sourceCoverage:c.sourceCoverage,levels:c.levels.length})),alphaMaterials:[]});
   gltf.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])reports.at(-1).alphaMaterials.push({name:m.name,alphaTest:m.alphaTest,transparent:m.transparent,side:m.side});});
  }return reports;
 },{source,cards});
 await page.screenshot({path:path.join(OUT,'source-and-cutout-ground-level.png'),timeout:180000});assert.deepEqual(errors,[]);assert(result.every(r=>r.glError===0));assert.equal(result[1].triangles,152);assert.equal(result[1].drawCalls,2);assert(result[1].coverage.length===1&&result[1].coverage[0].sourceCoverage>.05);assert(result[1].alphaMaterials.every(m=>m.alphaTest===.35&&!m.transparent));
 fs.writeFileSync(path.join(OUT,'verification.json'),JSON.stringify({passed:true,scope:'Independent actual WebGL cutout comparison, 25 plants; CPU/SwiftShader timings are diagnostics and not real-device FPS.',validations,result,errors},null,2));console.log(result.map(({coverage,...r})=>r));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
