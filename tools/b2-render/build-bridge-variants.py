"""Non-destructive B2 bridge decoration variants: rubble, ice, and isolated pillar/debris."""
import bpy, math, os, random, json
from mathutils import Vector
random.seed(114)
ROOT="assets/3d/dungeons/b2_water_source/models/ancient_ice_bridge/ancient_ice_bridge_v04.glb"
OUT="render-output/b2-bridge-variants"
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(ROOT))
original=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not original:raise RuntimeError("Missing original bridge mesh")
bpy.context.view_layer.update()
points=[o.matrix_world@Vector(c) for o in original for c in o.bound_box]
lo=[min(v[i] for v in points) for i in range(3)]
hi=[max(v[i] for v in points) for i in range(3)]
# Blender glTF importer yields Z-up. Use longer of X/Y as bridge longitudinal axis.
long_axis=max((0,1),key=lambda i:hi[i]-lo[i])
cross_axis=1-long_axis
span=hi[long_axis]-lo[long_axis]
width=hi[cross_axis]-lo[cross_axis]
height=hi[2]-lo[2]
if min(span,width,height)<=0:raise RuntimeError("Invalid bridge dimensions")
center=[(lo[i]+hi[i])/2 for i in range(3)]
stone=bpy.data.materials.new("B2 cold weathered stone");stone.diffuse_color=(.27,.34,.37,1)
slate=bpy.data.materials.new("B2 chipped slate");slate.diffuse_color=(.19,.26,.30,1)
ice=bpy.data.materials.new("B2 pale blue translucent ice");ice.diffuse_color=(.42,.76,.87,.72)
ice.use_nodes=True
bs=ice.node_tree.nodes.get("Principled BSDF")
if bs:
    bs.inputs["Base Color"].default_value=(.42,.76,.87,1)
    bs.inputs["Roughness"].default_value=.14
    if "Transmission Weight" in bs.inputs:bs.inputs["Transmission Weight"].default_value=.68
    elif "Transmission" in bs.inputs:bs.inputs["Transmission"].default_value=.68
def cube(name,loc,scale,mat,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.name=name
    o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    if bevel:
        mod=o.modifiers.new("chipped softened edges","BEVEL");mod.width=bevel;mod.segments=1
        o.modifiers.new("weighted corners","WEIGHTED_NORMAL")
    return o
def shard(name,loc,radius,mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=loc)
    o=bpy.context.object;o.name=name
    o.scale=(radius*random.uniform(.75,1.35),radius*random.uniform(.6,1.2),radius*random.uniform(.45,.95))
    o.rotation_euler=(random.random()*.7,random.random()*.8,random.random()*math.pi)
    o.data.materials.append(mat)
    return o
def pos(along,across,z):
    v=list(center)
    v[long_axis]+=along
    v[cross_axis]+=across
    v[2]=z
    return v
# Original bridge occupies middle; copies stay untouched. Side decoration never alters source.
for variant in ("01_rubble","02_frozen","03_pillar_debris"):
    bpy.ops.object.select_all(action='DESELECT')
    added=[]
    if variant!="03_pillar_debris":
        for ob in original:
            cp=ob.copy();cp.data=ob.data.copy();bpy.context.collection.objects.link(cp)
            cp.name="v04_original_"+variant+"_"+ob.name;added.append(cp)
    if variant in ("01_rubble","02_frozen"):
        count=28 if variant=="01_rubble" else 16
        for i in range(count):
            along=random.uniform(-span*.43,span*.43)
            across=random.choice([-1,1])*random.uniform(width*.30,width*.49)
            z=lo[2]+random.uniform(height*.18,height*.44)
            added.append(shard(variant+"_rubble_%02d"%i,pos(along,across,z),min(span,width)*random.uniform(.025,.085),slate if i%3 else stone))
        if variant=="02_frozen":
            for i in range(17):
                along=random.uniform(-span*.43,span*.43)
                across=random.choice([-1,1])*width*.43
                z=lo[2]+height*random.uniform(.2,.66)
                bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=min(span,width)*random.uniform(.025,.065),radius2=.005,depth=height*random.uniform(.18,.50),location=pos(along,across,z))
                o=bpy.context.object;o.name="frozen_icicle_%02d"%i;o.data.materials.append(ice);added.append(o)
    else:
        # Standalone one-cell decoration: broken thin column embedded in uneven rubble.
        rad=min(span,width)*.075
        for i in range(24):
            a=random.random()*2*math.pi
            d=random.random()*min(span,width)*.32
            added.append(shard("pillar_foot_rubble_%02d"%i,pos(math.cos(a)*d,math.sin(a)*d,lo[2]+height*.13),min(span,width)*random.uniform(.035,.10),slate if i%2 else stone))
        base=lo[2]+height*.17
        added.append(cube("thin_pillar_buried_base",pos(0,0,base),[rad*2.4,rad*2.4,height*.13],stone,rad*.1))
        bpy.ops.mesh.primitive_cylinder_add(vertices=9,radius=rad,depth=height*.94,location=pos(0,0,base+height*.48))
        o=bpy.context.object;o.name="thin_column_embedded";o.rotation_euler[cross_axis]=.17;o.data.materials.append(stone);added.append(o)
        for i in range(5):
            added.append(shard("pillar_ice_chip_%d"%i,pos(random.uniform(-rad*2,rad*2),random.uniform(-rad*2,rad*2),base+height*.2),rad*.8,ice))
    # Export only new variant. Keep original objects hidden and unselected.
    bpy.ops.object.select_all(action='DESELECT')
    for ob in added:ob.select_set(True)
    bpy.context.view_layer.objects.active=added[0]
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(OUT+"/"+variant+".glb"),export_format='GLB',use_selection=True)
    for ob in original:ob.hide_render=True
    for ob in added:ob.hide_render=False
    scene=bpy.context.scene
    scene.render.engine='BLENDER_EEVEE'
    scene.render.resolution_x=960;scene.render.resolution_y=720;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.world.color=(.22,.29,.35)
    if not scene.camera:
        bpy.ops.object.camera_add();scene.camera=bpy.context.object
    cam=scene.camera
    extent=max(span,width,height)
    for angle,offset in [('front',(0,-1.65,.82)),('side',(1.65,0,.82)),('angle',(1.4,-1.5,1.05))]:
        cam.location=(center[0]+extent*offset[0],center[1]+extent*offset[1],center[2]+extent*offset[2])
        cam.rotation_euler=(Vector(center)-cam.location).to_track_quat('-Z','Y').to_euler()
        cam.data.type='ORTHO';cam.data.ortho_scale=extent*2.6
        scene.render.filepath=os.path.abspath(OUT+"/"+variant+"_"+angle+".png")
        bpy.ops.render.render(write_still=True)
    for ob in added:bpy.data.objects.remove(ob,do_unlink=True)
with open(OUT+"/manifest.json","w") as f:
    json.dump({'source':ROOT,'variants':['01_rubble','02_frozen','03_pillar_debris'],'original_unchanged':True,'note':'Static preview; runtime VFX not yet implemented','dimensions':[span,width,height]},f,indent=2)
