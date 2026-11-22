"""One low-cost mixed shade understory patch, individually authored."""
from pathlib import Path
import sys,math,random
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from asset_common import *
from mathutils import Vector
reset_scene();m=materials();rng=random.Random(7302)
def leaf(name,a,b,width,mat):
    a,b=Vector(a),Vector(b);d=b-a;cross=d.cross(Vector((0,0,1)))
    if cross.length<.01:cross=Vector((1,0,0))
    cross.normalize();center=a+d*.46+Vector((0,0,.018))
    v=[a,center+cross*width,center+Vector((0,0,.014)),b,center-cross*width]
    o=mesh(name,[tuple(x) for x in v],[(0,1,2),(1,3,2),(3,4,2),(4,0,2)],mat);uv_world(o,.2)
for plant in range(4):
    cx,cy=rng.uniform(-.48,.48),rng.uniform(-.35,.35)
    for frond in range(4):
        ang=frond*math.tau/4+rng.uniform(-.3,.3);direction=Vector((math.cos(ang),math.sin(ang),0));base=Vector((cx,cy,.01));length=rng.uniform(.28,.52)
        pts=[base+direction*(t*length)+Vector((0,0,math.sin(t*math.pi*.75)*.28)) for t in [0,.25,.5,.75,1]]
        tube('curved fern rachis',pts,[.006,.005,.004,.002,.0007],m['bark'],4)
        side=Vector((-direction.y,direction.x,0))
        for j in range(1,7):
            t=j/7;mid=base+direction*(t*length)+Vector((0,0,math.sin(t*math.pi*.75)*.28));size=.09*math.sin(t*math.pi)**.65
            for sign in [-1,1]:leaf('tapering fern leaflet',mid,mid+side*size*sign+direction*.035+Vector((0,0,.025)),size*.26,m['newleaf'] if plant==2 else m['leaf'])
for i in range(30):
    a=rng.random()*math.tau;rad=rng.uniform(.05,.62);base=Vector((math.cos(a)*rad,math.sin(a)*rad*.7,.008));tip=base+Vector((math.cos(a)*.12,math.sin(a)*.12,rng.uniform(.09,.26)))
    leaf('bent sedge blade',base,tip,rng.uniform(.008,.018),m['leaf'])
for i in range(14):
    a=i*2.399;rad=rng.uniform(.05,.42);base=Vector((math.cos(a)*rad,math.sin(a)*rad*.7,.02));end=base+Vector((math.cos(a)*.16,math.sin(a)*.16,rng.uniform(.08,.16)))
    leaf('wood sorrel heart blade',base,end,.045,m['newleaf'] if i%4==0 else m['leaf'])
finish('v3_shade_understory','低い小シダ・カヤ・広葉の混生株。高さ約0.3m、密度用の低負荷実形状。方向/scaleを変え根際と壁際の苔に重ねる。')
