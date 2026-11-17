"""A separately authored four-metre fallen trunk with hollow broken end."""
from pathlib import Path
import math
import random
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from natural import *
from common import reset_scene, finish
import bpy

reset_scene()
rng=random.Random(411017)
m=botanical_materials()
sides=40; rows=12
verts=[]
for i in range(rows):
    t=i/(rows-1);x=-2+4*t
    radius=.43*(1-.18*t)
    for j in range(sides):
        a=j*math.tau/sides
        r=radius*(1+.065*math.sin(a*9)+.028*math.sin(a*17+t))
        end=(.10*math.sin(j*2.3)+.05*math.cos(j*.7)) if i in (0,rows-1) else 0
        verts.append((x+end,r*math.cos(a),.48+r*math.sin(a)+.035*math.sin(t*math.pi)))
faces=[]
for i in range(rows-1):
    for j in range(sides):
        faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
obj=mesh('fallen trunk bark shell',verts,faces,m['bark'])
uv=obj.data.uv_layers.new(name='UVMap')
obj.data.uv_layers.active=uv
uv.active_render=True
for p in obj.data.polygons:
    p.use_smooth=True
    js=[obj.data.loops[q].vertex_index%sides for q in p.loop_indices]
    for q in p.loop_indices:
        vi=obj.data.loops[q].vertex_index;j=vi%sides;row=vi//sides
        u=j/sides
        if max(js)-min(js)>sides/2 and j==0:u=1
        uv.data[q].uv=(u*2,row/(rows-1)*4)

# End grain is a real annulus surrounding a dark recess, not a black sticker.
for end in (-1,1):
    ids=range(sides) if end<0 else range((rows-1)*sides,rows*sides)
    outer=[Vector(verts[j]) for j in ids]
    inner=[];deep=[]
    for j,v in enumerate(outer):
        a=j*math.tau/sides
        inner.append(Vector((v.x,.19*math.cos(a),.48+.19*math.sin(a))))
        deep.append(Vector((end*1.62,.17*math.cos(a),.48+.17*math.sin(a))))
    ring=mesh('exposed ragged endgrain',outer+inner,
              [(j,(j+1)%sides,(j+1)%sides+sides,j+sides) for j in range(sides)],m['heart'])
    mesh('hollow inner dark wall',inner+deep,
         [(j,(j+1)%sides,(j+1)%sides+sides,j+sides) for j in range(sides)]+[tuple(range(sides,2*sides))],m['dark'])
    def end_x(a):
        f=(a % math.tau)/math.tau*sides
        i=int(f);t=f-i
        return outer[i%sides].x*(1-t)+outer[(i+1)%sides].x*t+end*.003
    # Incomplete growth rings, disrupted by radial checks.
    for k in range(4):
        rr=.23+k*.043
        for arc in range(3):
            start=arc*math.tau/3+.12
            pts=[]
            for j in range(17):
                a=start+j*(math.tau/3-.23)/16
                pts.append((end_x(a),rr*math.cos(a),.48+rr*math.sin(a)))
            stem('weathered growth arc',pts,.0035,m['dark'],4)
    for j in range(6):
        a=j*math.tau/6+rng.random()*.2
        stem('end radial check',[(end_x(a),.19*math.cos(a),.48+.19*math.sin(a)),
                                (end_x(a+.04),.38*math.cos(a+.04),.48+.38*math.sin(a+.04))],.006,m['dark'],4)

# Small jagged splinters and old broken limb sockets.
for x,a,size in [(-1.15,.55,.43),(-.30,1.5,.35),(.8,2.3,.28),(1.3,.95,.22)]:
    base=Vector((x,.32*math.cos(a),.48+.32*math.sin(a)))
    tip=base+Vector((-.12,.20*math.cos(a),size))
    stem('old branch stub',[base,base.lerp(tip,.7),tip],[.13,.09,.055],m['bark'],8)
    stem('stub torn pale end',[tip-Vector((.025,0,.015)),tip+Vector((.025,0,.025))],[.055,.025],m['heart'],7)
# Moss conforms to the actual bark shell rather than floating as flat green fans.
from mathutils.bvhtree import BVHTree
bark_bvh=BVHTree.FromPolygons([Vector(v) for v in verts],faces,all_triangles=False)
def bark_height(x,y):
    hit,normal,index,distance=bark_bvh.ray_cast(Vector((x,y,2)),Vector((0,0,-1)),3)
    return hit.z if hit is not None else .48
for i in range(13):
    cx=rng.uniform(-1.65,1.55); cy=rng.uniform(-.18,.18); radius=rng.uniform(.10,.19)
    count=32; boundary=[rng.uniform(.73,1.12) for _ in range(count)]
    v=[(cx,cy,bark_height(cx,cy)+.004)]
    for fraction in (.5,1):
        for j in range(count):
            a=j*math.tau/count;r=radius*boundary[j]*fraction
            x=cx+math.cos(a)*r;y=cy+math.sin(a)*r*.62
            v.append((x,y,bark_height(x,y)+(.003 if fraction<1 else .0007)))
    fs=[(0,1+j,1+(j+1)%count) for j in range(count)]
    fs.extend((1+j,1+count+j,1+count+(j+1)%count,1+(j+1)%count) for j in range(count))
    patch=mesh('bark_conforming_velvet_moss_%02d'%i,v,fs,m['moss'])
    for polygon in patch.data.polygons:polygon.use_smooth=True
    # Short frayed shoots break the cut-paper edge without large pebble clumps.
    shoots=[];sf=[]
    for j in range(24):
        a=rng.uniform(0,math.tau);r=radius*math.sqrt(rng.random())*.85
        x=cx+math.cos(a)*r;y=cy+math.sin(a)*r*.62;z=bark_height(x,y)+.002
        width=rng.uniform(.0008,.0015);height=rng.uniform(.003,.006)
        k=len(shoots);shoots.extend([(x-width,y,z),(x+width,y,z),(x+.001,y+.001,z+height)])
        sf.append((k,k+1,k+2))
    mesh('fine_moss_shoots_%02d'%i,shoots,sf,m['moss'])

# The irregular shell, not an arbitrary primitive radius, defines contact.
lowest=min((o.matrix_world@Vector(c)).z for o in bpy.context.scene.objects
           if o.type=='MESH' for c in o.bound_box)
for o in bpy.context.scene.objects:
    if o.type=='MESH':o.location.z-=lowest

finish('fallen_cedar_log','props','約4mの倒木。接地原点。樹皮の縦UV、両端の空洞・不連続年輪・放射割れ・折れ枝と上面の部分的な苔。')
