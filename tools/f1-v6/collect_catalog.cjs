'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const base='assets/3d/dungeons/b1_nature_v6_candidates',names=['sedge','trifoliate','fern','schist','fractured','riverstones','wall_a','wall_b','wall_c'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),sources=[];
for(const name of names){
 const grass=['sedge','trifoliate','fern'].includes(name),id='v6_'+name+(grass?'_cards':''),dir=path.join(base,name),file=path.join(dir,grass||!name.startsWith('wall_')?'props':'modules',id+'.glb');
 const bytes=fs.readFileSync(file),length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length));
 const m=JSON.parse(fs.readFileSync(path.join(dir,'metrics',id+'.json')));
 assert.equal(m.sha256,sha(bytes));assert(['NOT_APPROVED','pending_visual_review'].includes(m.approvalStatus));assert.equal(m.renders.length,5);
 for(const render of m.renders)assert(fs.readFileSync(path.join(dir,render)).subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')));
 if(grass){assert.equal(m.tris,6);assert.equal(doc.materials.length,1);assert.equal(doc.materials[0].alphaMode,'MASK');assert(doc.materials[0].doubleSided);assert.equal(doc.materials[0].alphaCutoff,.35);}
 sources.push({name,id,file,sha256:sha(bytes),triangles:m.tris,primitives:m.drawCalls,approvalStatus:'NOT_APPROVED',...(grass?{method:'3 crossed cutout cards',originalFile:path.join(dir,m.originalFile),textureAtlas:[1536,512]}:{})});
}
fs.writeFileSync(path.join(base,'catalog.json'),JSON.stringify({version:6,status:'NOT_APPROVED',sequentialProduction:true,sources},null,2)+'\n');console.log(sources);
