# Blender 4.x procedural asset generator
# Kotama no Bouken / B1F: Deep Forest Ruins
# Run: blender -b -P tools/blender/generate_b1_assets.py
import bpy, math, os, random
from mathutils import Vector

OUT = os.path.abspath("assets/3d/dungeons/b1_ancient_forest/props")
os.makedirs(OUT, exist_ok=True)
random.seed(2401)

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def mat(name, color, metallic=0.0, rough=0.8, emission=None):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1)
    m.use_nodes=True; p=m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value=(*color,1)
    p.inputs["Metallic"].default_value=metallic; p.inputs["Roughness"].default_value=rough
    if emission:
        p.inputs["Emission Color"].default_value=(*emission,1)
        p.inputs["Emission Strength"].default_value=2.0
    return m

BARK=mat("Ancient bark",(0.105,0.075,0.052))
STONE=mat("Mossed limestone",(0.22,0.25,0.22))
MOSS=mat("Deep moss",(0.055,0.16,0.095))
GLOW=mat("Bioluminescent cyan",(0.02,0.38,0.48),emission=(0.02,0.55,0.8))
CRYSTAL=mat("Moon crystal",(0.16,0.48,0.62),metallic=.15,rough=.22,emission=(0.04,0.22,0.36))
WOOD=mat("Old timber",(0.19,0.105,0.055))
IRON=mat("Blackened iron",(0.045,0.055,0.06),metallic=.8,rough=.32)
GOLD=mat("Aged brass",(0.42,0.27,0.09),metallic=.72,rough=.3)

def finish(name, material):
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH':
            o.data.materials.append(material)
            o.name=name+"_"+o.name
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active=bpy.context.selected_objects[0]
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

def cube(loc, scale, material, bevel=.08):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object
    o.dimensions=scale; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod=o.modifiers.new("Worn softened edges","BEVEL"); mod.width=bevel; mod.segments=2
        o.modifiers.new("Weighted corner normals","WEIGHTED_NORMAL")
    o.data.materials.append(material); return o

def cyl(loc, radius, depth, material, vertices=12, r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    else: bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=r2, depth=depth, location=loc)
    o=bpy.context.object; o.data.materials.append(material); return o

def ico(loc, scale, material, subdivisions=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1, location=loc)
    o=bpy.context.object; o.scale=scale; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material); return o

def branch(a,b,r,material,verts=9):
    d=Vector(b)-Vector(a); mid=(Vector(a)+Vector(b))/2
    o=cyl(mid,r,d.length,material,verts)
    o.rotation_mode='QUATERNION'; o.rotation_quaternion=d.to_track_quat('Z','Y')
    return o

def export(name, material):
    finish(name,material)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+".glb"),export_format='GLB',use_selection=True)
    clear()

def make(name, fn, material):
    clear(); fn(); export(name,material)

def tree():
    cyl((0,0,2.2),.72,4.4,BARK,16,r2=.42)
    for i in range(7):
        a=i*math.tau/7
        branch((0,0,1.2),(math.cos(a)*1.8,math.sin(a)*1.8,.18),.25,BARK)
        branch((0,0,3.1),(math.cos(a)*1.6,math.sin(a)*1.6,4.3+random.random()),.18,BARK)
    for i in range(5): ico((random.uniform(-.6,.6),random.uniform(-.6,.6),random.uniform(3.7,4.8)),(.65,.7,.55),MOSS,2)
def root():
    for i in range(5):
        a=i*math.tau/5
        branch((0,0,.55),(math.cos(a)*1.7,math.sin(a)*1.7,.12),.28,BARK)
def fallen():
    branch((-1.8,0,.55),(1.8,.25,.28),.42,BARK,12)
    for x in [-.8,.3,1.1]: branch((x,.1,.45),(x+.4,.8,1.0),.12,BARK)
def boulder():
    for i in range(5): ico((random.uniform(-.5,.5),random.uniform(-.4,.4),random.uniform(.2,.6)),(random.uniform(.4,.8),random.uniform(.4,.7),random.uniform(.35,.75)),STONE,2)
def pillar():
    cyl((0,0,1.3),.38,2.6,STONE,12); cyl((0,0,.12),.62,.24,STONE,8); cyl((0,0,2.58),.58,.28,STONE,8)
def wall():
    cube((0,0,1.1),(3.4,.55,2.2),STONE,.12)
    for z in [.55,1.65]:
        for x in [-1,0,1]: cube((x,-.29,z),(.92,.08,.08),MOSS,.02)
def arch():
    for x in [-.9,.9]: cube((x,0,1.25),(.38,.55,2.5),STONE,.08)
    # segmented curved lintel
    for i in range(9):
        a=math.pi*i/8
        o=cube((math.cos(a)*.9,0,2.5+math.sin(a)*.9),(.42,.58,.38),STONE,.05)
        o.rotation_euler[1]=a-math.pi/2
def tile():
    cube((0,0,.12),(2,2,.24),STONE,.06)
    for x in [-.5,.5]: cube((x,0,.245),(.025,1.85,.018),MOSS,.005)
def crystal():
    for x,y,h in [(-.35,0,1.1),(0,0,1.8),(.38,.1,.9)]:
        cyl((x,y,h/2),.28,h,CRYSTAL,6,r2=.02)
def mushroom():
    for x,y,h in [(-.45,0,.65),(0,.1,1.0),(.5,-.1,.55)]:
        cyl((x,y,h/2),.09,h,MOSS,8)
        ico((x,y,h),(.38,.34,.22),GLOW,2)
def chest():
    cube((0,0,.48),(1.25,.8,.75),WOOD,.12)
    cube((0,0,.88),(1.28,.83,.22),WOOD,.08)
    cube((0,-.43,.55),(.22,.06,.5),IRON,.02)
    cube((0,-.47,.65),(.24,.07,.2),GOLD,.02)
def door():
    cube((0,0,1.35),(1.7,.25,2.7),WOOD,.07)
    for x in [-.62,.62]: cube((x,-.15,1.35),(.12,.08,2.6),IRON,.02)
    for z in [.35,1.25,2.3]: cube((0,-.17,z),(1.55,.08,.1),IRON,.02)
def altar():
    cube((0,0,.25),(1.7,1.3,.5),STONE,.12)
    cube((0,0,.62),(1.2,.9,.25),STONE,.08)
    cyl((0,0,1.05),.38,.65,IRON,8)
    ico((0,0,1.55),(.28,.28,.42),GLOW,2)
def torch():
    branch((0,0,.7),(0,0,1.7),.09,WOOD)
    cyl((0,0,1.82),.18,.35,IRON,8)
    ico((0,0,2.08),(.16,.16,.3),GLOW,2)
def stairs():
    for i in range(5): cube((0,i*.38,.15+i*.25),(2,.42,.3+i*.0),STONE,.04)
def rubble():
    for i in range(12):
        ico((random.uniform(-.8,.8),random.uniform(-.8,.8),random.uniform(.1,.35)),(.25,.2,.16),STONE,1)
def vine():
    for i in range(8):
        z=i*.32
        branch((math.sin(i*.7)*.18,0,z),(math.sin((i+1)*.7)*.18,0,z+.34),.045,MOSS,7)
        if i%2==0: ico((math.sin(i*.7)*.18+.18,0,z+.2),(.12,.08,.1),GLOW,1)
def sarcophagus():
    cube((0,0,.35),(1.4,2.2,.55),STONE,.12)
    cube((0,0,.72),(1.5,2.25,.25),STONE,.12)
    cube((0,-.15,.9),(.5,1.2,.12),MOSS,.04)
def stump():
    cyl((0,0,.5),.58,1,BARK,12,r2=.48)
    for i in range(6):
        a=i*math.tau/6
        branch((0,0,.2),(math.cos(a)*1.1,math.sin(a)*1.1,.08),.16,BARK)

ASSETS=[
("ancient_giant_tree",tree,BARK),("spreading_root_cluster",root,BARK),
("fallen_ancient_trunk",fallen,BARK),("moss_boulder_cluster",boulder,STONE),
("ruined_stone_pillar",pillar,STONE),("mossed_ruin_wall",wall,STONE),
("ruin_archway",arch,STONE),("ancient_stone_floor_tile",tile,STONE),
("bioluminescent_crystal_cluster",crystal,CRYSTAL),("glow_mushroom_cluster",mushroom,MOSS),
("sealed_treasure_chest",chest,WOOD),("ancient_wooden_door",door,WOOD),
("forest_shrine_altar",altar,STONE),("blue_wisp_torch",torch,IRON),
("broken_stone_stairs",stairs,STONE),("ruin_rubble_pile",rubble,STONE),
("hanging_glow_vines",vine,MOSS),("ancient_sarcophagus",sarcophagus,STONE),
("hollow_tree_stump",stump,BARK)
]
for name,fn,material in ASSETS:
    make(name,fn,material)
print("Exported",len(ASSETS),"B1F GLB props to",OUT)
