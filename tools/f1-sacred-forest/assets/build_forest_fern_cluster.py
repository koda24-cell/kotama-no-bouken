"""Three individually scaled pinnate fern crowns in a 1.4m footprint."""
from pathlib import Path
import math
import random
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from natural import *
from common import reset_scene, finish

reset_scene()
rng=random.Random(411018)
m=botanical_materials()
for plant,(origin,scale,fronds) in enumerate([((-.1,.04,0),1,10),((.32,.24,0),.64,8),((-.34,-.23,0),.45,7)]):
    o=Vector(origin)
    # Fiddleheads retain tightly coiled growing fronds near the crown.
    for k in range(2):
        pts=[o+Vector((k*.025,.015,.01)),o+Vector((k*.025,.018,.18*scale))]
        for j in range(13):
            a=j*math.pi/7
            r=.033*scale*(1-j/18)
            pts.append(o+Vector((k*.025+r*math.sin(a),.018,.18*scale+r*math.cos(a))))
        stem('unfurled fiddlehead',[tuple(p) for p in pts],.006*scale,m['stem'],5)
    for f in range(fronds):
        a=f*math.tau/fronds+rng.uniform(-.18,.18)
        d=Vector((math.cos(a),math.sin(a),0));side=Vector((-d.y,d.x,0))
        length=scale*rng.uniform(.50,.71)
        def center(t):
            return o+d*length*t+Vector((0,0,scale*(.02+.58*math.sin(t*1.8))))
        path=[tuple(center(j/12)) for j in range(13)]
        stem('arched fern rachis',path,[scale*.007*(1-j/16) for j in range(13)],m['stem'],5)
        for j in range(1,17):
            t=.09+j*.049
            anchor=center(t)
            ll=length*.29*(math.sin(t*math.pi)**.75)*(1-.35*t)
            for sign in (-1,1):
                end=anchor+side*sign*ll+d*ll*.23+Vector((0,0,-.018*scale))
                leaf('pinnate fern leaflet',anchor,end,ll*.32,m['leaf_light'] if (f+j)%13==0 else m['leaf'],
                     roll=sign*.13,curve=.009*scale,bite=(j%9==0))
        leaf('terminal fern leaflet',center(.88),center(1.05),.022*scale,m['leaf'],curve=.006)
    # Spent frond remains curled at ground level.
    stem('spent brown frond',[tuple(o+Vector((0,0,.03))),tuple(o+Vector((.1,-.04,.07))),
                              tuple(o+Vector((.23,-.08,.025)))],[.005,.004,.001],m['leaf_old'],5)

finish('forest_fern_cluster','props','約1.4mのシダ3株。接地原点。弓なりの葉軸と対生羽片、若い巻き葉、地際の枯れ葉を別造形。')
