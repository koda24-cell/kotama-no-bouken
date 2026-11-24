"""Check actual stone-wall triangles do not hide all approaches to fixed native objects."""
from pathlib import Path
import sys,json,hashlib,math,itertools
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'f1-closed-ruins-v3'))
from verify_clearance import Geometry,placement_matrix,point,bounds
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates/scene/game-layout-v6.json';raw=p.read_bytes();l=json.loads(raw)
cache={};walls=[]
for r in l['boundaryWallPlacements']:
 if r['file'] not in cache:
  b=(ROOT/r['file']).read_bytes();assert hashlib.sha256(b).hexdigest()==r['sourceSha256'];cache[r['file']]=Geometry(b,r['file']).triangles
 m=placement_matrix(r);lo,hi=bounds([v for t in cache[r['file']] for v in t]);corners=itertools.product(*zip(lo,hi));walls.append((bounds([point(m,v) for v in corners]),cache[r['file']],r))
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def cross(a,b):return(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def hits(o,end,t):
 d=sub(end,o);a,b,c=t;e1=sub(b,a);e2=sub(c,a);v=cross(d,e2);det=dot(e1,v)
 if abs(det)<1e-9:return False
 inv=1/det;s=sub(o,a);u=dot(s,v)*inv
 if u<0 or u>1:return False
 q=cross(s,e1);v=dot(d,q)*inv
 if v<0 or u+v>1:return False
 distance=dot(e2,q)*inv;return .001<distance<.999
solid={tuple(t) for t in l['navigation']['navigationSolidTiles']};report=[]
for obj in l['beforeFingerprint']['saveCriticalData']['objects']:
 x,z=obj['tx'],obj['ty'];target=(x*4,1.0,z*4);views=[]
 for dx,dz in [[0,1],[0,-1],[1,0],[-1,0]]:
  if (x+dx,z+dz) in solid:continue
  origin=((x+dx)*4,1.6,(z+dz)*4);lo,hi=bounds([origin,target]);blocked=False
  for (a,b),triangles,row in walls:
   if any(hi[i]<a[i] or lo[i]>b[i] for i in range(3)):continue
   def local(v):
    q=sub(v,row['position']);theta=row.get('rotationY',0);sc=row.get('scale',[1,1,1]);cs,sn=math.cos(theta),math.sin(theta)
    return ((cs*q[0]-sn*q[2])/sc[0],q[1]/sc[1],(sn*q[0]+cs*q[2])/sc[2])
   o,e=local(origin),local(target)
   if any(hits(o,e,t) for t in triangles):blocked=True;break
  views.append({'from':[x+dx,z+dz],'wallOccluded':blocked})
 report.append({'key':obj['key'],'approaches':views,'visibleApproach':any(not v['wallOccluded'] for v in views)})
result={'layoutSha256':hashlib.sha256(raw).hexdigest(),'passed':all(o['visibleApproach'] for o in report),'method':'Moller-Trumbore segment intersections against actual pinned boundary-wall triangles; native object models and foliage acceptance remain separate.','objects':report}
(ROOT/'docs/reviews/f1-v6/native-object-sightlines.json').write_text(json.dumps(result,indent=2));print({'passed':result['passed'],'visibleObjects':sum(o['visibleApproach'] for o in report)})
if not result['passed']:sys.exit(1)
