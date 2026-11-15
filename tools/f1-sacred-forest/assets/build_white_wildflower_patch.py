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
        # Smooth teardrop perimeter and a shallow real cup replace an eight-point
        # paper-like petal. Single end vertices avoid degenerate tip triangles.
        steps=12;across=4
        verts=[tuple(c+d*radius*.10)]
        coords=[(.5,0)]
        for row in range(1,steps):
            t=row/steps
            width=radius*.39*math.sin(math.pi*t)**.58*(.82+.18*t)
            for column in range(across+1):
                u=-1+2*column/across
                z=radius*(.12*math.sin(math.pi*t)+.06*t+.035*u*u*math.sin(math.pi*t))
                verts.append(tuple(c+d*radius*(.10+.90*t)+side*(u*width)+Vector((0,0,z))))
                coords.append(((u+1)/2,t))
        tip_index=len(verts)
        verts.append(tuple(c+d*radius+Vector((0,0,radius*.06))))
        coords.append((.5,1))
        faces=[(0,1+j,1+j+1) for j in range(across)]
        for row in range(steps-2):
            start=1+row*(across+1);next_start=start+across+1
            for column in range(across):
                faces.append((start+column,next_start+column,next_start+column+1,start+column+1))
        last_start=1+(steps-2)*(across+1)
        faces.extend((last_start+j,tip_index,last_start+j+1) for j in range(across))
        o=mesh('rounded cupped fivefold petal',verts,faces,petal)
        uv=o.data.uv_layers.new(name='UVMap')
        o.data.uv_layers.active=uv
        uv.active_render=True
        for loop in o.data.loops:uv.data[loop.index].uv=coords[loop.vertex_index]
        for polygon in o.data.polygons:polygon.use_smooth=True
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
