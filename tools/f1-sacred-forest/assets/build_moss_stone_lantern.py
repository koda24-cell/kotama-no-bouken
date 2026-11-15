"""One weathered Japanese stone lantern with open firebox; no live light."""
import math
import random
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import bpy
from common import reset_scene, material, mesh, cube, tube, finish, OUT

reset_scene()
rng=random.Random(52)
tex=OUT/'textures'
source={k:tex/v for k,v in {'basecolor':'stone_color_graded.jpg','normal':'stone_normal.jpg','roughness':'stone_roughness.jpg'}.items()}
stone=material('lantern_weathered_stone',(.255,.25,.22,1),.9,
               texture_set=source if all(p.exists() for p in source.values()) else None)
fracture=material('lantern_pale_fracture',(.30,.29,.25,1),.96)
dark=material('lantern_soot_stone',(.055,.049,.033,1),.98)
moss=material('lantern_roof_moss',(.048,.075,.021,1),.99)


def turned(name,levels,mat,sides=12):
    vs=[]
    for z,r in levels:
        for j in range(sides):
            a=j*math.tau/sides+math.pi/4
            vs.append((r*math.cos(a),r*math.sin(a),z))
    fs=[tuple(reversed(range(sides)))]
    for i in range(len(levels)-1):
        for j in range(sides):fs.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    fs.append(tuple((len(levels)-1)*sides+j for j in range(sides)))
    return mesh(name,vs,fs,mat)


turned('hewn_octagonal_base',[(0,.34),(.08,.36),(.16,.30),(.21,.25)],stone,8)
turned('tapered_lantern_shaft',[(.20,.16),(.26,.145),(.63,.11),(.76,.17)],stone,12)
turned('lotus_like_plain_shoulder',[(.75,.18),(.80,.27),(.87,.255),(.91,.22)],stone,8)
turned('firebox_floor_and_soot',[(.90,.22),(.94,.235),(.965,.235)],stone,4)
turned('unlit_firebox_inside',[(.963,.14),(.967,.14)],dark,12)

# Four stone posts frame real open apertures. Front is -Y; side is also open.
for x in (-.13,.13):
    for y in (-.13,.13):
        cube('carved_firebox_corner',(x,y,1.095),(.075,.075,.28),stone,.012)
cube('firebox_rear_panel',(0,.145,1.095),(.25,.045,.28),stone,.009)
cube('firebox_header',(0,0,1.235),(.34,.34,.05),stone,.012)
for x in (-.063,.063):
    cube('slender_front_window_mullion',(x,-.147,1.094),(.022,.035,.235),stone,.005)

# Four-sided hipped roof, with a kicked eave and a real missing corner.
roof=turned('swept_stone_roof',[(1.245,.25),(1.27,.44),(1.315,.43),(1.38,.30),(1.43,.13)],stone,4)
cutter=cube('roof_missing_corner_cutter',(.275,-.275,1.305),(.25,.23,.14),None,0)
cutter.rotation_euler=(.2,.1,.45)
bpy.context.view_layer.objects.active=roof
mod=roof.modifiers.new('broken_roof_corner','BOOLEAN');mod.object=cutter;mod.operation='DIFFERENCE';mod.solver='EXACT'
bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
turned('finial_pedestal',[(1.42,.11),(1.47,.115),(1.49,.075)],stone,10)
turned('weathered_round_finial',[(1.475,.055),(1.50,.075),(1.54,.066),(1.58,.035),(1.60,.006)],stone,12)

# Four square hips are axis-aligned because the turned roof's corner rings
# start at pi/4. Follow their exact piecewise surface, rather than a cone or
# radial approximation that would leave moss hovering over the stone.
def roof_surface_z(x,y):
    r=max(abs(x),abs(y))*math.sqrt(2)
    if r<=.13:return 1.43
    if r<=.30:return 1.43-(r-.13)*(.05/.17)
    return 1.38-(r-.30)*(.065/.13)


def roof_moss_patch(index,cx,cy,radius):
    count=13
    phase=rng.uniform(0,math.tau)
    aspect=rng.uniform(.67,.94)
    rotation=rng.uniform(0,math.tau)
    rim=[]
    for j in range(count):
        a=j*math.tau/count
        # Uneven lobes and short missing bites avoid little disks or pebbles.
        organic=.76+.16*math.sin(a*3+phase)+.08*math.cos(a*5-phase)
        dx=radius*organic*math.cos(a);dy=radius*organic*math.sin(a)*aspect
        x=cx+dx*math.cos(rotation)-dy*math.sin(rotation)
        y=cy+dx*math.sin(rotation)+dy*math.cos(rotation)
        rim.append((x,y))
    # Thin mat: foot is 0.3mm above stone, centre loft 1.8-3.7mm;
    # the body follows every roof hip and does not make a rounded tube bundle.
    thickness=rng.uniform(.0018,.0037)
    verts=[(cx,cy,roof_surface_z(cx,cy)+thickness)]
    verts.extend((x,y,roof_surface_z(x,y)+rng.uniform(.0010,.0018)) for x,y in rim)
    verts.extend((x,y,roof_surface_z(x,y)+.0003) for x,y in rim)
    faces=[]
    for j in range(count):
        a=1+j;b=1+(j+1)%count
        faces.append((0,a,b))
        faces.append((a,count+a,count+b,b))
    faces.append(tuple(count+j for j in reversed(range(1,count+1))))
    return mesh('surface_conforming_roof_moss_%02d'%index,verts,faces,moss)


# Broken front-right eave remains exposed. Shade and retained moisture near
# the rear and left hip transitions favour irregular clustered growth.
clouds=[(-.135,.135,.039),(.055,.205,.030),(-.205,-.025,.035)]
accepted=0
for attempt in range(120):
    cx,cy,spread=clouds[rng.randrange(len(clouds))]
    x=cx+rng.gauss(0,spread);y=cy+rng.gauss(0,spread)
    radius=rng.uniform(.015,.035)
    # Keep every patch on the unbroken upper roof, away from the finial.
    if max(abs(x),abs(y))+radius>.299:continue
    if max(abs(x),abs(y))-radius<.105:continue
    if x+radius>.105 and y-radius<-.105:continue
    roof_moss_patch(accepted,x,y,radius)
    accepted+=1
    if accepted==18:break

# The base growth is retained; this revision changes only the roof mats.
for x,y in [(-.24,-.07),(-.2,.14),(.2,.13)]:
    tube('base_moss',[(x-.035,y,.18),(x,y,.19),(x+.03,y+.015,.17)],[.014,.025,.013],moss,6)

# The lost roof chip lies on the ground; not an attached protrusion masquerading as damage.
mesh('fallen_roof_fragment',[(.26,-.26,.005),(.40,-.25,.005),(.35,-.38,.005),(.30,-.29,.08)],[(0,2,1),(0,1,3),(1,2,3),(2,0,3)],fracture)

# Match the 3m real-world scan scale used by the architecture kit.
from common import uv_world
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH' and any(m and m.name=='lantern_weathered_stone' for m in obj.data.materials):uv_world(obj,scale=3.0)

finish('moss_stone_lantern',description='高さ1.6mの石灯籠。底面中央原点、正面+Z。独立した台座/竿/中台/火袋/笠/宝珠。火袋窓は実開口、笠角は実欠損。苔は上向き面へ限定。光源なし。')
