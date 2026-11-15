"""Individually authored ten-metre old cedar; no scene assembly."""
from pathlib import Path
import math
import random
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from natural import *
from cedar_crown import cedar_spray_material, spray_card
from common import reset_scene, finish

reset_scene()
rng = random.Random(411016)
m = botanical_materials()

# Tapered, fluted trunk. A local front split recesses into the actual surface.
zs = [0, .12, .42, .85, 1.3, 1.9, 2.5, 3.2, 4.1, 5.0, 6.0, 7.0, 8.0, 9.0, 9.75, 10.0]
rs = [1.00, .94, .76, .62, .57, .53, .49, .45, .40, .35, .29, .235, .17, .10, .038, .009]
verts = []
sides = 48
for row, (z, r) in enumerate(zip(zs, rs)):
    for i in range(sides):
        a = math.tau*i/sides
        groove = .055*math.sin(a*11+.28*math.sin(z))+.024*math.cos(a*19+z*.3)
        rr = r*(1+groove)
        angle_to_split = abs((a+math.pi/2+math.pi) % math.tau-math.pi)
        if 1.25 < z < 3.25 and angle_to_split < .18:
            rr *= .56
        verts.append((rr*math.cos(a)+.07*math.sin(z*.5),
                      rr*math.sin(a)+.04*math.cos(z*.65)-.04, z))
faces = []
for row in range(len(zs)-1):
    for i in range(sides):
        faces.append((row*sides+i, row*sides+(i+1)%sides,
                      (row+1)*sides+(i+1)%sides, (row+1)*sides+i))
faces += [tuple(reversed(range(sides))), tuple((len(zs)-1)*sides+i for i in range(sides))]
trunk = mesh('fluted ancient trunk with recessed split', verts, faces, m['bark'])
uv = trunk.data.uv_layers.new(name='UVMap')
trunk.data.uv_layers.active=uv
uv.active_render=True
for p in trunk.data.polygons:
    p.use_smooth = True
    ids = [trunk.data.loops[li].vertex_index % sides for li in p.loop_indices]
    for li in p.loop_indices:
        vi = trunk.data.loops[li].vertex_index; j = vi % sides; row = vi // sides
        u = j/sides
        if max(ids)-min(ids)>sides/2 and j==0: u=1
        uv.data[li].uv = (u*math.tau*rs[row], zs[row])

# Buttress roots are broad at the trunk and become exposed tapered roots.
for i in range(11):
    a = i*math.tau/11+rng.uniform(-.10, .10)
    length = rng.uniform(1.3, 2.25)
    d = Vector((math.cos(a), math.sin(a), 0))
    bend = Vector((-d.y, d.x, 0))*rng.uniform(-.23, .23)
    pts = [tuple(d*.47+Vector((0,0,.70))), tuple(d*.86+Vector((0,0,.30))),
           tuple(d*1.18+bend+Vector((0,0,.12))),
           tuple(d*length+bend*1.5+Vector((0,0,.045)))]
    stem('buttress root %02d'%i, pts, [.29,.22,.12,.018], m['bark'], 10)
    if i % 3 == 0:
        end = Vector(pts[-1]); side = Vector((-d.y,d.x,0))
        stem('fine root fork %02d'%i,[pts[2],tuple(end+side*.3),tuple(end+d*.35+side*.45-Vector((0,0,.03)))],
             [.08,.035,.008],m['bark'],6)

# Fine needle sprays replace the broad leaf blades of the first review.
# Each primary limb carries real wooden secondary shoots; the fine terminal
# needles use cutout images on bowed cards, at two different 3D attitudes.
spray_mat=cedar_spray_material()
for i in range(30):
    z = 3.65+i*.187+rng.uniform(-.10,.10)
    a = i*2.39996+rng.uniform(-.18,.18)
    length = (2.42-(z-3.65)*.29)*rng.uniform(.87,1.12)
    d = Vector((math.cos(a),math.sin(a),0))
    tangent = Vector((-d.y,d.x,0))
    start = Vector((.05*math.sin(z),-.04,z))
    points = [start, start+d*(length*.30)+Vector((0,0,.22)),
              start+d*(length*.70)+tangent*.13+Vector((0,0,.26)),
              start+d*length+Vector((0,0,.10))]
    stem('primary cedar limb %02d'%i,points,[.13*(10-z)/7+.025,.085,.045,.008],m['bark'],8)
    for j in range(8):
        t = .20+j*.098
        anchor = start+d*length*t+Vector((0,0,.24))
        sign = -1 if j%2 else 1
        span = length*.37*(1-t*.5)
        tip = anchor+d*.35+tangent*span*sign+Vector((0,0,-.12-rng.random()*.16))
        mid = anchor.lerp(tip,.6)+Vector((0,0,.08))
        stem('secondary fan %02d %02d'%(i,j),[anchor,mid,tip],[.027,.014,.003],m['bark'],5)
        axis = tip-anchor
        for k in range(2):
            base=anchor+axis*(.17+k*.29)
            direction=(axis.normalized()*.73+d*.44+tangent*sign*.16).normalized()
            card_length=(.70+(1-t)*.27)*rng.uniform(.85,1.08)
            card_tip=base+direction*card_length+Vector((0,0,-.12+rng.random()*.08))
            spray_card('cedar fine terminal fan',base,card_tip,
                       card_length*.80,spray_mat,
                       roll=(.55 if k else -.35)+rng.uniform(-.26,.26),bend=.06)

# Terminal leader has sprays, with a visible irregular rather than blunt tip.
for j in range(18):
    z = 9.0+j*.048; a=j*2.4
    base=Vector((0,-.04,z));d=Vector((math.cos(a),math.sin(a),.30)).normalized()
    length=.49-(z-9)*.29
    spray_card('fine leader spray',base,base+d*length,length*.67,spray_mat,
               roll=rng.uniform(-.8,.8),bend=.025)

# Damp side receives isolated moss at root saddles, not a uniform green coat.
for i in range(16):
    a=rng.uniform(.15,2.65); r=rng.uniform(.65,1.5)
    moss_patch('root saddle moss',(r*math.cos(a),r*math.sin(a),.07),rng.uniform(.13,.28),m['moss'],rng)

print('BARK_PHOTO_AVAILABLE', object_texture_state())
finish('sacred_cedar_tree','props',
       '約10mの根張り古杉。基部原点、実形状の幹裂け・根張りを保持。枝階層と独自512px針葉sprayの湾曲alphaMASKカードで密度のある樹冠。')
