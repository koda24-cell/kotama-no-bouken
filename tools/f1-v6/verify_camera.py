"""Camera turn envelope vs actual GLB triangles, not the player body alone."""
from pathlib import Path
import sys,json,math
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/f1-closed-ruins-v3'))
from verify_clearance import Geometry,placement_matrix,point
layout=json.loads((ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates/scene/game-layout-v6.json').read_text())
# Point-to-triangle closest distance, Ericson's Voronoi region formulation.
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def add(a,b):return tuple(x+y for x,y in zip(a,b))
def mul(a,t):return tuple(x*t for x in a)
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def dist(p,t):
 a,b,c=t;ab=sub(b,a);ac=sub(c,a);ap=sub(p,a);d1=dot(ab,ap);d2=dot(ac,ap)
 if d1<=0 and d2<=0:q=a
 else:
  bp=sub(p,b);d3=dot(ab,bp);d4=dot(ac,bp)
  if d3>=0 and d4<=d3:q=b
  else:
   vc=d1*d4-d3*d2
   if vc<=0 and d1>=0 and d3<=0:q=add(a,mul(ab,d1/max(1e-20,d1-d3)))
   else:
    cp=sub(p,c);d5=dot(ab,cp);d6=dot(ac,cp)
    if d6>=0 and d5<=d6:q=c
    else:
     vb=d5*d2-d1*d6
     if vb<=0 and d2>=0 and d6<=0:q=add(a,mul(ac,d2/max(1e-20,d2-d6)))
     else:
      va=d3*d6-d5*d4
      if va<=0 and d4-d3>=0 and d5-d6>=0:q=add(b,mul(sub(c,b),(d4-d3)/max(1e-20,d4-d3+d5-d6)))
      else:
       denom=va+vb+vc
       if abs(denom)<1e-20:return min(math.dist(p,v) for v in t)
       q=add(a,add(mul(ab,vb/denom),mul(ac,vc/denom)))
 return math.dist(p,q)
arches=[r for r in layout['candidatePropPlacements'] if r['id'].startswith('threshold_')]
source=Geometry((ROOT/arches[0]['file']).read_bytes(),arches[0]['file']).triangles
report=[]
for row in arches:
 _,x,z=row['id'].split('_');x,z=int(x),int(z)
 triangles=[[point(placement_matrix(row),p) for p in tri] for tri in source]
 # All 72 turn samples around both cells adjacent to this threshold.
 neighbor=[x,z+1] if row['rotationY']==0 else [x+1,z]
 minimum=1e9
 for tx,tz in [[x,z],neighbor]:
  for i in range(72):
   a=i*math.tau/72;p=(tx*4-math.sin(a)*1.1,1.6,tz*4-math.cos(a)*1.1)
   minimum=min(minimum,min(dist(p,t) for t in triangles))
 report.append({'id':row['id'],'cameraSamples':144,'minimumTriangleDistanceMeters':round(minimum,4)})
 assert minimum>.1,(row['id'],minimum)
# Document the old failure using the actual same GLB at the old center.
old=dict(arches[0],position=[int(arches[0]['id'].split('_')[1])*4,0,int(arches[0]['id'].split('_')[2])*4])
triangles=[[point(placement_matrix(old),p) for p in t]for t in source]
p=(old['position'][0]+1.1,1.6,old['position'][2])
old_distance=min(dist(p,t)for t in triangles)
result={'passed':True,'method':'Exact point-to-triangle distance at eye height, 72 turn samples on both cells per authored arch. Near-plane radius 0.1m. Does not replace visual obstruction review.','arches':report,'oldSidewaysSurfaceDistanceMeters':old_distance}
(ROOT/'docs/reviews/f1-v6/camera-envelope.json').write_text(json.dumps(result,indent=2));print(result)
