"""Rooted hanging woodland vines; anchor origin at top, drape down 2.5m."""
from pathlib import Path
import math
import random
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from natural import *
from common import reset_scene, finish

reset_scene()
rng=random.Random(411021)
m=botanical_materials()
for i,(x,length,phase) in enumerate([(-.44,2.48,.3),(0,2.17,1.7),(.46,1.85,2.8),(.23,1.32,.9)]):
    def center(t):
        return Vector((x+math.sin(t*5+phase)*.070-math.sin(phase)*.070,
                       .05*math.sin(t*4+phase)-.05*math.sin(phase),-length*t))
    pts=[center(j/25) for j in range(26)]
    stem('hanging rooted vine',pts,[.012*(1-j/32) for j in range(26)],m['stem'],7)
    for j in range(15):
        t=.06+j*.059
        base=center(t)
        sign=-1 if j%2 else 1
        outward=Vector((sign*.85,-.25,.16)).normalized()
        attachment=base+outward*.040
        stem('alternating vine petiole',[base,attachment],[.003,.0015],m['stem'],5)
        ll=rng.uniform(.12,.19)*(1-.3*t)
        tip=attachment+outward*ll+Vector((0,0,-.035))
        leaf('alternating creeping blade',attachment,tip,ll*.70,
             m['leaf_light'] if j%11==0 else m['leaf'],roll=sign*.16,curve=.014,bite=j%8==0)
        # Node and tendril emerge from the same attached stem point.
        if j in (3,8,12):
            tendril=[base]
            for k in range(14):
                a=k*.38
                rr=.026*(1-k/18)
                tendril.append(base+Vector((sign*(.025+.003*k),rr*math.sin(a),rr*math.cos(a)-.035)))
            stem('curled attaching tendril',tendril,.0018,m['stem'],4)
    # A branch hangs from a real node rather than starting in empty space.
    node=center(.38)
    fork=[node,node+Vector((.15,-.04,-.23)),node+Vector((.23,-.05,-.55))]
    stem('small vine fork',fork,[.006,.003,.001],m['stem'],5)
    for j in range(4):
        base=node.lerp(fork[-1],.2+j*.20)
        sign=-1 if j%2 else 1
        leaf('fork leaf',base,base+Vector((sign*.10,-.035,.020)),.066,m['leaf'],curve=.008)

finish('hanging_forest_vines','props','上端取り付け原点・下方約2.5mの蔓。異長の主蔓、交互の葉柄、節からの枝分岐・巻きひげを造形。')
