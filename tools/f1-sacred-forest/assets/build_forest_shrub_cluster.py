"""Woody evergreen understory; individually authored open branch structure."""
from pathlib import Path
import math
import random
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from natural import *
from common import reset_scene, finish

reset_scene()
rng=random.Random(411019)
m=botanical_materials()
for i in range(8):
    a=i*2.4+rng.uniform(-.15,.15)
    height=rng.uniform(.62,1.03)
    d=Vector((math.cos(a),math.sin(a),0))
    root=Vector((math.cos(a)*.11,math.sin(a)*.11,.012))
    p1=root+d*.16+Vector((0,0,height*.40))
    p2=root+d*.33+Vector((0,0,height*.72))
    p3=root+d*.48+Vector((0,0,height))
    stem('bent understory stem',[root,p1,p2,p3],[.022,.016,.010,.003],m['bark'],7)
    for j in range(4):
        t=.3+j*.19
        anchor=root.lerp(p3,t)
        side=Vector((-d.y,d.x,0))*(-1 if j%2 else 1)
        end=anchor+side*rng.uniform(.20,.32)+d*.11+Vector((0,0,.13))
        stem('woody lateral shoot',[anchor,anchor.lerp(end,.55),end],[.009,.005,.0015],m['stem'],5)
        direction=(end-anchor).normalized()
        across=direction.cross(Vector((0,0,1))).normalized()
        for k in range(5):
            base=anchor.lerp(end,.22+k*.17)
            sign=-1 if k%2 else 1
            v=(direction*.5+across*sign*.8+Vector((0,0,.32))).normalized()
            length=rng.uniform(.17,.26)
            petiole=base+v*.025
            stem('leaf petiole',[base,petiole],[.0028,.0017],m['stem'],4)
            mat=m['leaf_light'] if (i+j+k)%7==0 else m['leaf_old'] if (i+j+k)%17==0 else m['leaf']
            leaf('evergreen broad blade',petiole,petiole+v*length,length*.53,mat,
                 roll=rng.uniform(-.32,.32),curve=.017,bite=(i*3+j+k)%13==0)
            if k%2==0:
                stem('broad leaf midvein',[petiole,petiole+v*length*.70+Vector((0,0,.011))],
                     [.0018,.0005],m['leaf_light'],4)
    for side in (-1,1):
        base=p2.lerp(p3,.7)
        tip=base+d*.12+Vector((-d.y,d.x,.7))*side*.12
        leaf('apical new leaf',base,tip,.06,m['leaf_light'],curve=.009)

finish('forest_shrub_cluster','props','約1.6m幅の常緑低木。接地原点。木質主枝/側枝/葉柄、反りと葉脈、実輪郭の虫食い、小さな新葉を造形。')
