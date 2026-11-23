"""All-cell foot visibility using final GLB triangles, UVs and actual alpha atlas.
Projection is geometric evidence; game PNG review still required for tone/occlusion.
"""
from pathlib import Path
import json,struct,math,subprocess
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
base=ROOT/'assets/3d/dungeons/b1_nature_v6_candidates'
js="const fs=require('fs'),vm=require('vm'),c={window:{KotamaSacredPlaytest:true}};vm.createContext(c);vm.runInContext(['data/field-maps.js','field/f1-review-layout-v6.js','field.js'].map(p=>fs.readFileSync(p,'utf8')).join('\\n')+';this.result=[0,1,2].map(f=>{const a=fieldArea(1,f),walk=[];for(let z=0;z<a.h;z++)for(let x=0;x<a.w;x++)if(!fieldCharSolid(a,fieldTileAt(a,x,z)))walk.push([x,z]);return {floor:f,walk,objects:a.objects};});',c);console.log(JSON.stringify(c.result));"
floors=json.loads(subprocess.check_output(['node','-e',js],cwd=ROOT,text=True))
def opacity_points(name):
 p=base/name/'props'/f'v6_{name}_cards.glb';raw=p.read_bytes();jlen=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jlen]);binary=raw[28+jlen:]
 def acc(i):
  a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];size={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']];fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];stride=v.get('byteStride',struct.calcsize(fmt)*size);off=v.get('byteOffset',0)+a.get('byteOffset',0)
  return [struct.unpack_from('<'+fmt*size,binary,off+i*stride)for i in range(a['count'])]
 points=[]
 for mesh in doc['meshes']:
  for primitive in mesh['primitives']:
   pos=acc(primitive['attributes']['POSITION']);uv=acc(primitive['attributes']['TEXCOORD_0']);ix=[v[0]for v in acc(primitive['indices'])]
   image=Image.open(base/name/'sources/generated_materials'/f'v6_{name}_cutout_atlas.png').convert('RGBA');w,h=image.size
   for start in range(0,len(ix),3):
    ids=ix[start:start+3]
    for a in range(1,16):
     for b in range(1,16-a):
      weights=[a/16,b/16,1-(a+b)/16];u,v=[sum(uv[i][axis]*t for i,t in zip(ids,weights))for axis in range(2)]
      # glTF UVs use top-left image convention after Blender export.
      if image.getpixel((min(w-1,max(0,int(u*w))),min(h-1,max(0,int(v*h)))))[3]<.35*255:continue
      points.append(tuple(sum(pos[i][axis]*t for i,t in zip(ids,weights))for axis in range(3)))
 assert len(points)>20,(name,len(points))
 return points
points={name:opacity_points(name)for name in ['sedge','trifoliate','fern']}
results=[];failures=[];tan=math.tan(math.radians(34));corners=[[-1,-1],[1,-1],[-1,1],[1,1]]
for floor in floors:
 counts=[]
 for x,z in floor['walk']:
  seed=x*17+z*31+floor['floor']*41;stair=any(o['kind']=='stairs'and o['tx']==x and o['ty']==z for o in floor['objects']);opaque=[]
  for i,(dx,dz)in enumerate(corners):
   tall=i in [0,3];name=('fern'if(seed+i)%4==0 else'sedge')if tall else'trifoliate';scale=.6 if stair else .92 if tall else .95;jitter=((seed+i*7)%5-2)*.025;rad=1.65 if stair else 1.32;a=seed+i*1.7;c,s=math.cos(a),math.sin(a)
   for px,py,pz in points[name]:opaque.append((dx*(rad+jitter)+(c*px+s*pz)*scale,py*scale,dz*(rad-jitter)+(-s*px+c*pz)*scale))
  for direction,(fx,fz)in enumerate([[0,-1],[1,0],[0,1],[-1,0]]):
   count=0
   for px,py,pz in opaque:
    dx,dz=px+fx*1.1,pz+fz*1.1;depth=dx*fx+dz*fz
    if not .05<depth<5:continue
    nx=(dx*-fz+dz*fx)/(depth*tan*1.6);ny=(py-1.6)/(depth*tan)
    if -.95<nx<.95 and -.97<ny<-.2:count+=1
   counts.append(count)
   if count<4:failures.append({'floor':floor['floor']+1,'tile':[x,z],'direction':direction,'opaqueSamplesInLowerViewport':count})
 results.append({'floor':floor['floor']+1,'walkCells':len(floor['walk']),'cardinalViews':len(counts),'minimumOpaqueForegroundSamples':min(counts),'passed':min(counts)>=4})
result={'passed':not failures,'method':'Actual final MASK GLB triangles/UVs sampled against actual RGBA atlas alpha >= .35. All walk cells at camera Y1.6m/backoff1.1m/FOV68/aspect1.6, four headings. Samples in lower viewport y60..98.5%, within5m. Same-cell plants stay inside wall planes. Artistic tone and GPU pixels are independently reviewed.','floors':results,'failures':failures,'opacityPointSamples':{k:len(v)for k,v in points.items()}}
(ROOT/'docs/reviews/f1-v6/foreground-projection.json').write_text(json.dumps(result,indent=2));print(result)
assert not failures
