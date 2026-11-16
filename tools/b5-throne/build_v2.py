"""B5 ruined throne V2: preserve V1 objects and add non-destructive relief.
Based on V1's model-generating preamble, rerender with extra irregular stonework.
Never writes to approved asset folders.
"""
from pathlib import Path
import os
import math
import random
import bpy
from mathutils import Vector
source=Path(__file__).with_name("build_v1.py")
v1=source.read_text(encoding="utf-8")
cut=v1.index("world=bpy.context.scene.world")
# The V1 modeling preamble is used verbatim. Rendering/export code is isolated.
exec(compile(v1[:cut], str(source), "exec"))
variant=int(os.environ.get("THRONE_VARIANT", "0"))
if variant not in range(0, 8):
    raise ValueError("THRONE_VARIANT must be 0..7")
rng=random.Random(2068 + variant * 71)
relief_delta=max(-3,min(3,int(os.environ.get("THRONE_RELIEF_DELTA","0"))))
rubble_delta=max(-3,min(3,int(os.environ.get("THRONE_RUBBLE_DELTA","0"))))
back_depth_delta=max(-.15,min(.15,float(os.environ.get("THRONE_BACK_DEPTH_DELTA","0"))))
arch_curvature_delta=max(-.2,min(.2,float(os.environ.get("THRONE_ARCH_CURVATURE_DELTA","0"))))

def irregular_block(name, loc, dimensions, material, seed, damage=0.13):
    """Faceted block with uneven beveled outline; original meshes unchanged."""
    rr=random.Random(seed)
    sx,sy,sz=dimensions
    verts=[]
    # Twelve corners? Eight skewed cube corners make real irregular planar faces.
    for z in (-1,1):
        for y in (-1,1):
            for x in (-1,1):
                verts.append((x*sx*.5+rr.uniform(-damage,damage)*sx,
                              y*sy*.5+rr.uniform(-damage,damage)*sy,
                              z*sz*.5+rr.uniform(-damage,damage)*sz))
    faces=[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)]
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    ob=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(ob)
    ob.location=loc
    ob.data.materials.append(material)
    return ob

def band(name, a, b, width, material):
    p=Vector(a);q=Vector(b)
    d=q-p
    ob=cube(name,(p+q)*.5,(width,.035,d.length),material,.008)
    ob.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    return ob

# Back: inset vertical stone reliefs and concentric pointed shrine motif.
for i in range(max(6,11+relief_delta)):
    x=-.53+i*(1.06/max(1,10+relief_delta))
    z=1.37+abs(x)*.32
    band(f"V2 eroded relief spine {i:02d}",(x,.155,z),(x+rng.uniform(-.02,.02),.15,2.78-abs(x)*.50),
         .012+rng.random()*.017,edge if i%3==0 else iron)
for sign in (-1,1):
    # Engraved gothic arches: slender ribs, not original heavy box-beams
    for j in range(3):
        offset=j*.095
        band(f"V2 narrow inner pointed ogee {sign} {j}",
             (sign*(.61-offset),.105,2.42-offset*.2),
             (0,.105,3.12-offset*.44),.024-j*.003,edge)
    for j in range(7):
        t=j/6
        band(f"V2 vine carving {sign} {j}",
             (sign*(.09+t*.39),.105,1.38+t*.95),
             (sign*(.13+t*.39),.105,1.45+t*.95),
             .010,iron)
# Unequal crack seams crossing otherwise rectangular V1 stone panels.
for i in range(14 + variant * 2):
    x=rng.uniform(-.72,.72)
    z=rng.uniform(.92,2.85)
    y=.039 if z>1.3 else -.64
    band(f"V2 irregular dark joint {i:02d}",(x,y,z),
         (x+rng.uniform(-.12,.12),y-.004,z+rng.uniform(.035,.15)),
         rng.uniform(.009,.022),iron)
# Break silhouette via physically irregular attached stone facets on buttresses,
# arch and left-hand broken armrest; embed them into the host stone.
for i in range(26 + variant * 3):
    side=-1 if i%3 else 1
    z=rng.uniform(1.2,3.07)
    x=side*rng.uniform(.79,1.04)
    y=rng.uniform(.20,.52)
    part=irregular_block(f"V2 chipped buttress rock {i:02d}",
        (x,y,z),(rng.uniform(.09,.24),rng.uniform(.09,.24),rng.uniform(.10,.39)),
        stone if i%4 else edge,2068+i,.18)
    part.rotation_euler[1]=rng.uniform(-.26,.26)
for i in range(9 + variant):
    # Loose missing-looking pieces embedded along the front rim; no floaters.
    x=rng.uniform(-1.10,1.10)
    y=-.80+rng.uniform(-.04,.04)
    z=rng.uniform(.15,.39)
    irregular_block(f"V2 plinth chipped protrusion {i:02d}",
        (x,y,z),(rng.uniform(.15,.36),.15,rng.uniform(.10,.25)),
        stone,3100+i,.20)
# Strong asymmetry: left arm truncated fractured stone capped by jagged pieces.
for i in range(5):
    irregular_block(f"V2 shattered left arm {i}",
        (-.78+rng.uniform(-.17,.13),-.43+rng.uniform(-.15,.15),
         1.23+rng.uniform(.03,.22)),
        (.18+rng.random()*.14,.24+rng.random()*.13,.12+rng.random()*.14),
        edge if i==0 else stone,3900+i,.22)
# Big irregular rubble only; no decorative small pebbles.
for i in range(max(4,10 + variant + rubble_delta)):
    x=rng.uniform(-1.7,1.7);y=rng.uniform(-1.35,1.0)
    if abs(x)<1.05 and y>-.75: y=-1.15
    size=(rng.uniform(.23,.54),rng.uniform(.22,.43),rng.uniform(.15,.35))
    ob=irregular_block(f"V2 fallen masonry {i:02d}",(x,y,size[2]*.30),
                      size,stone if i%4 else edge,4900+i,.23)
    ob.rotation_euler=(rng.uniform(-.13,.22),rng.uniform(-.3,.3),rng.uniform(-.7,.7))
# Apply visual feedback as ADDED geometry, never destructive edits.
if back_depth_delta > 0:
    cube("V2 feedback backing depth", (0,.47 + back_depth_delta/2,1.97),
         (1.40,back_depth_delta,2.1),stone,.03)
# Curved fan of small segments approximates a non-rectilinear inner arch.
arch_strength=.10+arch_curvature_delta
if arch_strength > 0:
    for sign in (-1,1):
        previous=None
        for j in range(9):
            t=j/8
            point=(sign*(.70*(1-t)-arch_strength*math.sin(math.pi*t)),
                   .065,2.50+0.63*t+arch_strength*math.sin(math.pi*t))
            if previous is not None:
                band(f"V2 feedback curved arch {sign} {j}",previous,point,.024,edge)
            previous=point
# Restore rendering in V2 without mutating any V1 source file.
world=bpy.context.scene.world
world.color=(.12,.11,.15)
def camera(name,loc,target):
    bpy.ops.object.camera_add(location=loc)
    c=bpy.context.object
    c.name=name
    c.rotation_euler=(Vector(target)-c.location).to_track_quat("-Z","Y").to_euler()
    c.data.type="ORTHO"
    c.data.ortho_scale=5.7
    return c
def area(loc,power,size):
    bpy.ops.object.light_add(type="AREA",location=loc)
    o=bpy.context.object
    o.data.energy=power;o.data.shape="DISK";o.data.size=size
    o.rotation_euler=(Vector((0,0,1.7))-o.location).to_track_quat("-Z","Y").to_euler()
area((2,-4,6),1100,5)
area((-3,2,4),850,4)
scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.samples=24
scene.view_settings.exposure=float(os.environ.get("THRONE_EXPOSURE", "0"))
scene.cycles.use_denoising=False
scene.render.image_settings.color_mode="RGBA"
scene.render.resolution_x=960
scene.render.resolution_y=960
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.film_transparent=True
out=Path(os.environ.get("THRONE_OUTPUT","render-output/b5-throne-v2"))
out.mkdir(parents=True,exist_ok=True)
for name,loc in [("front",(0,-8,3)),("side",(8,0,3)),("angle",(6,-7,5))]:
    scene.camera=camera(name,loc,(0,0,1.8))
    scene.render.filepath=str(out/(name+".png"))
    bpy.ops.render.render(write_still=True)
for o in list(bpy.data.objects):
    if o.type in {"CAMERA","LIGHT"}:
        bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/"b5-ruined-throne-v2.blend"))
bpy.ops.export_scene.gltf(filepath=str(out/"b5-ruined-throne-v2.glb"),export_format="GLB")
import json
mesh_objects=[o for o in bpy.data.objects if o.type=="MESH"]
(out/"geometry.json").write_text(json.dumps({"variant":variant,"mesh_count":len(mesh_objects),"vertex_count":sum(len(o.data.vertices) for o in mesh_objects),"object_names":[o.name for o in mesh_objects],"approval":"NOT_APPROVED"},indent=2),encoding="utf-8")
