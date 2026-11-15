"""Nine white woodland flowers, buds and seedheads in a 0.9m patch."""
from pathlib import Path
import math
import random
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from natural import *
from common import reset_scene, finish

reset_scene()
rng=random.Random(411020)
m=botanical_materials()
petal=material('woodland_warm_white_petal',(.72,.70,.60,1),.77)
pollen=material('woodland_muted_pollen',(.45,.30,.065,1),.86)
seed=material('woodland_dry_seed',(.15,.10,.045,1),.94)

def flower(center, radius, angle, maturity):
    c=Vector(center)
    # Five cupped petals share a calyx but have distinct lobed outlines.
    for k in range(5):
        a=angle+k*math.tau/5
        d=Vector((math.cos(a),math.sin(a),0));side=Vector((-d.y,d.x,0))
        b=c+d*radius*.10
        p1=c+d*radius*.49+Vector((0,0,radius*.16))
        p2=c+d*radius*.88+Vector((0,0,radius*.12))
        tip=c+d*radius+Vector((0,0,radius*.06))
        w=radius*.36
        verts=[b,p1,p2,tip,p1-side*w,p2-side*w*.71,
               p1+side*w,p2+side*w*.71]
        o=mesh('cupped fivefold petal',[tuple(v) for v in verts],
               [(0,4,1),(1,4,5,2),(2,5,3),(0,1,6),(1,2,7,6),(2,3,7)],petal)
        uv=o.data.uv_layers.new(name='UVMap')
        o.data.uv_layers.active=uv
        uv.active_render=True
        coords=[(.5,0),(.5,.4),(.5,.8),(.5,1),(0,.4),(.1,.8),(1,.4),(.9,.8)]
        for l in o.data.loops:uv.data[l.index].uv=coords[l.vertex_index]
        # Fine radial petal fold is geometry, readable on the side view.
        for p in o.data.polygons:p.use_smooth=True
        # Five narrow green sepals beneath the blossom.
        leaf('pointed calyx sepal',c-Vector((0,0,.012)),c+d*radius*.50-Vector((0,0,.015)),
             radius*.19,m['leaf'],curve=.004)
    for k in range(11):
        a=angle+k*math.tau/11
        pos=c+Vector((math.cos(a),math.sin(a),0))*radius*.16
        end=pos+Vector((math.cos(a)*.003,math.sin(a)*.003,radius*.17))
        stem('small stamen',[pos,end],[.0012,.0024],pollen,5)
    for k in range(5):
        a=k*math.tau/5
        stem('clustered seed carpel',[c+Vector((math.cos(a)*.006,math.sin(a)*.006,.005)),
                                   c+Vector((math.cos(a)*.007,math.sin(a)*.007,.014))],
             [.003,.001],m['leaf_light'],5)

for i in range(12):
    a=i*2.4; r=.08+math.sqrt(i/12)*.32
    root=Vector((math.cos(a)*r,math.sin(a)*r,0))
    height=rng.uniform(.30,.57)
    lean=Vector((rng.uniform(-.06,.06),rng.uniform(-.06,.06),0))
    top=root+lean+Vector((0,0,height))
    stem('woodland flower stem',[root,root.lerp(top,.45)-lean*.3,top],[.004,.003,.0018],m['stem'],6)
    for j in range(3):
        base=root.lerp(top,.18+j*.18)
        az=a+j*2.7
        d=Vector((math.cos(az),math.sin(az),.30))
        leaf('pointed basal leaf',base,base+d*rng.uniform(.09,.16),.050,m['leaf'],curve=.009)
    if i<8:
        flower(top,rng.uniform(.046,.062),a,1)
    elif i<10:
        # Young closed bud: overlapping green lancets with pale petal tips.
        for k in range(5):
            aa=k*math.tau/5
            base=top+Vector((math.cos(aa)*.008,math.sin(aa)*.008,0))
            leaf('closed pale bud',base,top+Vector((math.cos(aa)*.004,math.sin(aa)*.004,.030)),.010,petal,curve=.003)
            leaf('bud sepal',base-Vector((0,0,.006)),top+Vector((math.cos(aa)*.011,math.sin(aa)*.011,.014)),.009,m['leaf'])
    else:
        for k in range(7):
            aa=k*math.tau/7
            end=top+Vector((math.cos(aa)*.012,math.sin(aa)*.012,.018))
            stem('spent seed capsule',[top,end],[.0035,.001],seed,5)

finish('white_wildflower_patch','props','約0.9mの白い林床花群。接地原点。五弁花・萼・雄しべ・若い蕾・種房を個別造形し、生育段階を混在。')
