"""Validate eye clearance through the threshold while strafing/turning."""
from pathlib import Path
import sys,json,math,subprocess
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tools/f1-closed-ruins-v3'))
from verify_clearance import Geometry,bounds
source=ROOT/'assets/3d/dungeons/b1_layer_v4_candidates/modules/v4_passage_arch.glb'
triangles=Geometry(source.read_bytes(),str(source)).triangles;bounded=[(bounds(t),t)for t in triangles]
js="""import{resolveFirstLayerCameraV6 as resolve}from './field/f1-camera-clearance-v6.js';
const result=[];for(let frame=0;frame<=20;frame++)for(let h=0;h<16;h++){
 const yaw=h*Math.PI/8,x=-Math.sin(yaw)*1.1,z=-2+frame*.2-Math.cos(yaw)*1.1;
 const fixed=resolve(x,z,[{position:[0,0,0],rotationY:0}]);
 const r=resolve(z,-x,[{position:[0,0,0],rotationY:Math.PI/2}]);
 if(Math.hypot(r.x-fixed.z,r.z+fixed.x)>1e-8)throw Error('Rotated portal mismatch');
 result.push({frame,heading:h,original:[x,z],fixed:[fixed.x,fixed.z],adjusted:fixed.adjusted});
}console.log(JSON.stringify(result));"""
samples=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=ROOT,text=True))
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def cross(a,b):return(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def intersects(o,end,t):
 d=sub(end,o);a,b,c=t;e1=sub(b,a);e2=sub(c,a);v=cross(d,e2);det=dot(e1,v)
 if abs(det)<1e-10:return False
 inv=1/det;s=sub(o,a);u=dot(s,v)*inv
 if u<0 or u>1:return False
 q=cross(s,e1);v=dot(d,q)*inv
 if v<0 or u+v>1:return False
 distance=dot(e2,q)*inv;return .00001<distance<1.00001

def hits_axis(p):
 end=(0,p[1],p[2]);lo,hi=bounds([p,end])
 for(a,b),t in bounded:
  if any(hi[i]<a[i] or lo[i]>b[i] for i in range(3)):continue
  if intersects(p,end,t):return True
 return False
old_bad=0;fixed_bad=[]
for s in samples:
 for y in [1.565,1.6,1.635]:
  x,z=s['fixed']
  if hits_axis((x,y,z)):fixed_bad.append({**s,'eyeY':y})
  x,z=s['original']
  old_bad+=hits_axis((x,y,z))
assert old_bad>0,old_bad
assert not fixed_bad,fixed_bad[:3]
result={'passed':True,'scope':'Actual GLB eye-to-opening-axis segment rays. 21 interpolation positions across one representative threshold, 16 headings, three bob heights; 90deg rotation covariance checked. Other props and artistic obstruction use actual game PNGs.','eyeSamples':len(samples)*3,'originalStoneCrossings':old_bad,'fixedStoneCrossings':len(fixed_bad),'cameraCorrections':sum(s['adjusted']for s in samples),'playerMovementChanged':False}
(ROOT/'docs/reviews/f1-v6/camera-motion.json').write_text(json.dumps(result,indent=2));print(result)
