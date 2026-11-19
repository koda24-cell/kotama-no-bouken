#!/usr/bin/env python3
"""B5 ruined sentinel statue V1 candidate. Original meshes only, NOT_APPROVED."""
import bpy, math, os, json, hashlib, random
from mathutils import Vector
from pathlib import Path

OUT=Path(os.environ.get("KNIGHT_OUTPUT","render-output/b5-knights/sentinel_v2")).resolve()
OUT.mkdir(parents=True,exist_ok=True)
random.seed(516)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
asset=[]

def mat(name,color,rough=0.94,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1)
    m.use_nodes=True
    n=m.node_tree.nodes.get("Principled BSDF")
    n.inputs["Base Color"].default_value=(*color,1)
    n.inputs["Roughness"].default_value=rough
    n.inputs["Metallic"].default_value=metal
    return m
stone=mat("cold graphite weathered stone",(0.107,0.119,0.155))
light=mat("edge erosion light stone",(0.19,0.196,0.223))
dark=mat("deep joints stone",(0.057,0.061,0.084))
trim=mat("aged steel stone trim",(0.134,0.13,0.158),.88,.08)
crack=mat("recesses dark",(0.115,0.105,0.130))
def saveobj(o,name,material):
    o.name=name;o.data.materials.append(material);asset.append(o)
    return o
def bevel(o,width=.045,segments=2):
    mod=o.modifiers.new("rounded worn edges","BEVEL");mod.width=width;mod.segments=segments
    mod2=o.modifiers.new("weighted normals","WEIGHTED_NORMAL")
    return o
def cube(name,loc,scale,material=stone,bev=.045,rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object
    o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if rotation:o.rotation_euler=rotation
    saveobj(o,name,material)
    if bev:bevel(o,bev)
    return o
def ico(name,loc,radius,material=stone,subdiv=2,scale=(1,1,1)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv,radius=radius,location=loc)
    o=bpy.context.object;o.scale=scale
    # Non-uniform weathering of the surface at mesh level; no shader-only bump.
    for v in o.data.vertices:
        p=v.co;phase=p.x*9.13+p.y*7.21+p.z*11.7
        f=1+0.036*math.sin(phase)+0.027*math.sin(p.x*21.3-p.z*7.3)
        p.x*=f;p.y*=f;p.z*=f
    return saveobj(o,name,material)
def rod(name,a,b,r,material=stone,vertices=12):
    a,b=Vector(a),Vector(b);v=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=v.length,location=(a+b)/2)
    o=bpy.context.object;o.rotation_euler=v.to_track_quat('Z','Y').to_euler()
    return saveobj(o,name,material)
def cone(name,loc,r1,r2,h,material=stone):
    bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=r1,radius2=r2,depth=h,location=loc)
    return saveobj(bpy.context.object,name,material)

# Carved double plinth; corner blocks are deliberately irregular.
cube("BASE intact lower plinth",(0,0,.11),(1.78,1.55,.22),stone,.06)
cube("BASE stepped course",(0,0,.27),(1.57,1.36,.16),stone,.045)
cube("BASE split upper course",(0,-.02,.39),(1.34,1.13,.13),light,.028)
for i,(x,y,s) in enumerate([(-.72,-.65,.18),(.68,-.61,.12),(.74,.55,.16),(-.68,.53,.10)]):
    ico("BASE worn chipped corner %02d"%i,(x,y,.23),s,stone,1,(1,.7,.5))
# Instep and sabatons
for side in (-1,1):
    x=side*.30
    cube("ARMOR greave knee to foot %s"%side,(x,.025,.83),(.36,.43,.80),stone,.09,
         (0,side*.03,side*.022))
    cube("ARMOR greave ankle rib %s"%side,(x,-.14,.62),(.41,.14,.20),light,.032)
    ico("ARMOR knee bowl %s"%side,(x,-.03,1.24),.22,light,2,(1.08,1.02,.85))
    cube("ARMOR forward boot %s"%side,(x,-.17,.47),(.43,.70,.19),stone,.07)
    rod("ARMOR longitudinal shin ridge %s"%side,(x,-.22,.67),(x,-.17,1.12),.044,trim,10)
# Waist and torso, ridge overlaps layered armor
cube("BODY hips",(0,0,1.49),(1.03,.58,.49),stone,.11)
cube("BODY lower breastplate",(0,-.03,1.96),(.99,.60,.69),stone,.16)
cube("BODY upper breastplate",(0,-.01,2.32),(1.17,.70,.75),stone,.19)
cube("BODY sculpted central ridge",(0,-.39,2.18),(.11,.16,.98),light,.048)
for i in range(3):
    cube("ARMOR overlapping waist lames %d"%i,(0,-.315,1.76-i*.135),(1.00-i*.05,.19,.155),stone,.04)
# Gothic pointed chest relief
for side in (-1,1):
    rod("CHEST gothic diagonal relief %s"%side,(0,-.43,2.28),(side*.42,-.38,2.60),.036,light,9)
    # one intact shoulder, one visibly damaged with lost outer cap
    if side==-1:
        ico("SHOULDER surviving carved pauldron",(-.76,-.02,2.60),.39,stone,3,(1.25,.96,.68))
        cube("SHOULDER laminated guard",(-.79,-.11,2.38),(.55,.58,.29),light,.08,(0,0,-.16))
    else:
        ico("SHOULDER snapped shoulder socket",(.62,.04,2.49),.25,dark,1,(.95,.9,.7))
        ico("SHOULDER asymmetrical fracture shard",(.83,.02,2.50),.16,stone,1,(1.6,1,.60))
# Neck & helmet
rod("NECK carved collar",(0,.00,2.68),(0,0,2.86),.24,dark)
ico("HEAD helm skull",(0,-.015,3.045),.38,stone,4,(.88,.86,1.05))
cube("HEAD visor face plate",(0,-.305,2.97),(.60,.18,.37),stone,.09)
cube("HEAD eye slit deep shadow",(0,-.414,3.08),(.46,.018,.047),crack,.009)
for side in (-1,1):
    cube("HEAD visor bar %s"%side,(side*.22,-.412,3.05),(.065,.064,.26),trim,.015)
rod("HEAD crest surviving spine",(0,.0,3.36),(0,.06,3.66),.08,light,10)
ico("HEAD chipped crest tip",(0,.06,3.67),.125,stone,1,(.9,.8,.45))
# Arms held next to torso, one arm farther forward to grip a ruined longsword
rod("LEFT upper arm",(-.75,0,2.39),(-.82,-.12,1.87),.18,stone)
ico("LEFT damaged elbow",(-.82,-.13,1.86),.18,light,1,(1.2,1.1,.75))
rod("LEFT forearm",(-.82,-.13,1.84),(-.62,-.39,1.56),.15,stone)
ico("LEFT gauntlet",(-.61,-.41,1.52),.19,stone,1,(.95,1,.8))
rod("RIGHT upper arm",(.67,.01,2.42),(.72,-.20,1.98),.19,stone)
ico("RIGHT elbow",(.72,-.19,1.95),.20,light,2,(1,.95,.82))
rod("RIGHT forearm",(.71,-.21,1.94),(.61,-.53,1.47),.15,stone)
ico("RIGHT gripping hand",(.60,-.54,1.44),.17,light,2,(1,.9,1))
# Longsword deliberately battered; supported on the plinth in front of the figure
rod("SWORD weathered central fuller",(.60,-.65,.50),(.60,-.65,1.48),.069,trim,8)
cone("SWORD stone point",(.60,-.65,.47),.085,.005,.18,trim)
rod("SWORD crossguard",(.30,-.65,1.48),(.92,-.65,1.48),.069,stone,8)
rod("SWORD pommel",(.60,-.65,1.54),(.60,-.65,1.85),.069,trim,10)
ico("SWORD pitted pommel",(.60,-.65,1.87),.108,stone,1)
# Decay damage and physically grounded fragments.
for i,(x,y,z,rr) in enumerate([
    (.70,.17,.48,.18),(-.64,-.53,.46,.15),(.42,.60,.43,.12),(-.86,.21,.23,.13),
    (.83,-.02,.29,.14),(.46,-.56,.31,.10),(-.52,.48,.39,.11)]):
    ico("RUBBLE on-ground irregular fragment %02d"%i,(x,y,z),rr,stone if i%2 else light,1,(1.3,.8,.65))
# Hand-carved chips along one plinth seam, no identical particles.
for i in range(4):
    x=-.47+i*.31
    rod("PLINTH rough horizontal fracture %d"%i,(x,-.692,.30), (x+.19,-.691,.32+(-1)**i*.023),.009,dark,6)


# V2 relief and articulated armor (base V1 meshes retained untouched).
def carved_plate(name,outline,material,thickness=.085):
    mesh=bpy.data.meshes.new(name+"_mesh")
    mesh.from_pydata(outline,[],[tuple(range(len(outline)))])
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    saveobj(obj,name,material)
    solid=obj.modifiers.new("chiseled thickness","SOLIDIFY");solid.thickness=thickness
    bevel(obj,.024,2)
    return obj
# Sculpted cuirass halves create a convex sternum silhouette over V1 block.
carved_plate("V2 curved breast left",
  [(-.52,-.385,2.51),(-.10,-.505,2.61),(-.035,-.585,2.23),(-.45,-.455,2.00),(-.57,-.37,2.20)],stone)
carved_plate("V2 curved breast right",
  [(.52,-.385,2.51),(.10,-.505,2.61),(.035,-.585,2.23),(.45,-.455,2.00),(.57,-.37,2.20)],stone)
carved_plate("V2 gothic central lancet",
  [(-.085,-.59,2.44),(0,-.62,2.65),(.085,-.59,2.44),(.055,-.62,2.16),(0,-.65,2.08),(-.055,-.62,2.16)],light,.028)
# Segmented sculpted abdominals with staggered lengths and bevel.
for i in range(4):
    z=1.99-i*.116
    width=.94-i*.035
    cube("V2 articulated abdominal lame %02d"%i,(0,-.406-i*.007,z),
         (width,.12,.105),stone,.030,rotation=(0,0,(-1)**i*.017))
    for side in (-1,1):
        cube("V2 lame carved edge %02d %d"%(i,side),(side*(width/2-.075),-.48,z),
            (.05,.05,.084),light,.010)
# Strongly chiseled helmet brows and hidden mouth guard.
carved_plate("V2 damaged pointed helmet brow",
  [(-.31,-.375,3.18),(-.14,-.42,3.225),(0,-.43,3.16),(.22,-.41,3.23),(.30,-.366,3.15),(.25,-.41,3.115),(-.27,-.41,3.115)],stone,.045)
for x in [-.23,-.10,.10,.22]:
    rod("V2 vertical lower visor slots %.2f"%x,(x,-.425,2.84),(x,-.425,3.02),.020,dark,8)
# Layered left shoulder plate with real width and stepped outline.
carved_plate("V2 left shoulder lower gorget",
 [(-1.07,-.33,2.51),(-.89,-.40,2.58),(-.61,-.38,2.43),(-.62,-.35,2.28),(-.98,-.35,2.29)],light,.09)
for i in range(3):
    rod("V2 left pauldron ridge %d"%i,
       (-1.02+i*.1,-.36,2.53+i*.036),(-.69+i*.09,-.37,2.58+i*.028),.023,trim,9)
# Right broken shoulder guard: a narrow dangling surviving plate.
carved_plate("V2 right broken hanging plate",
 [(.59,-.38,2.50),(.80,-.33,2.57),(.91,-.34,2.36),(.73,-.40,2.29),(.64,-.40,2.33)],stone,.06)
# Gauntlet finger bands and arm joint motifs.
for side in (-1,1):
    x=(-.60 if side==-1 else .60)
    y=(-.46 if side==-1 else -.58)
    for k in range(3):
        rod("V2 gauntlet transverse finger %d %d"%(side,k),(x-.115,y-.02,1.48-k*.048),
          (x+.115,y-.02,1.48-k*.048),.017,trim,8)
# Stone split in the sword, and angular guard finials.
for sign in [-1,1]:
    ico("V2 sword crossguard finial %d"%sign,(.60+sign*.33,-.65,1.48),.10,light,2,(1,.8,1.6))
rod("V2 sword fuller left",(.552,-.73,.65),(.552,-.73,1.35),.018,dark,8)
rod("V2 sword fuller right",(.648,-.73,.68),(.648,-.73,1.35),.018,dark,8)
# Large, non-repetitive broken stone slabs on the plinth; stay physically grounded.
carved_plate("V2 fractured plinth front left",
 [(-.71,-.787,.36),(-.42,-.79,.38),(-.33,-.78,.31),(-.49,-.78,.27),(-.71,-.78,.30)],dark,.030)
carved_plate("V2 fractured plinth front right",
 [(.42,-.79,.39),(.72,-.78,.34),(.69,-.78,.26),(.51,-.78,.27),(.46,-.78,.32)],dark,.028)
for i,coords in enumerate([
 ((-.42,-.39,2.11),(-.23,-.45,2.29)),
 ((.30,-.46,2.06),(.39,-.42,2.18)),
 ((-.31,-.27,.96),(-.24,-.28,1.11)),
 ((.59,-.33,2.37),(.75,-.33,2.48)),
]):
    rod("V2 deep stone fissure %02d"%i,*coords,.013,dark,6)

# Save portable model only. Render floor/lights must not enter GLB.
bpy.ops.object.select_all(action='DESELECT')
for o in asset:o.select_set(True)
bpy.context.view_layer.objects.active=asset[0]
bpy.ops.export_scene.gltf(filepath=str(OUT/"sentinel_v2.glb"),export_format='GLB',
    use_selection=True,export_apply=True,export_materials='EXPORT')
bpy.ops.object.select_all(action="SELECT")
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"sentinel_v2.blend"))

# Review-only stage is made after glTF export and original .blend save.
for o in asset:o.select_set(False)
floor=mat("preview only ground",(0.10,.095,.145))
cube("REVIEW_STAGE_not_in_export",(0,0,-.15),(8,8,.22),floor,.05)
asset.pop() # remove review floor from the tracked model object list
world=bpy.context.scene.world or bpy.data.worlds.new("World")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.14,.13,.23,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.38
def area_light(name,pos,power,size):
    data=bpy.data.lights.new(name,"AREA");data.energy=power;data.shape="DISK";data.size=size
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=pos
    direction=Vector((0,0,1.9))-o.location;o.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
area_light("key neutral gray",(-4,-5,7),520,4.0)
area_light("fill violet",(4,0,6),310,4)
area_light("rim pale blue",(0,5,7),600,3)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=22
scene.cycles.use_denoising=False
for layer in scene.view_layers:
    if hasattr(layer,'cycles'): layer.cycles.use_denoising=False
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='Standard'
try:scene.view_settings.look='Medium High Contrast'
except:pass
def camera(loc,target):
    bpy.ops.object.camera_add(location=loc);cam=bpy.context.object
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=5.2;scene.camera=cam
    return cam
cam=camera((5,-8,4.0),(0,0,1.85))
for view,pos in {"front":(0,-9,3.4),"side":(9,0,3.5),"angle":(6,-7,4.0)}.items():
    cam.location=pos;cam.rotation_euler=(Vector((0,0,1.88))-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/(view+".png"))
    bpy.ops.render.render(write_still=True)
meshes=[o for o in asset if o.type=='MESH']
checks={}
for p in [OUT/"sentinel_v2.glb", OUT/"sentinel_v2.blend"] + [OUT/(v+".png") for v in ("front","side","angle")]:
    checks[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
summary={"approval":"NOT_APPROVED","game_integrated":False,"asset":"b5_ancient_knight_sentinel_v2",
         "source_commit":os.getenv("GITHUB_SHA"),"run_id":os.getenv("GITHUB_RUN_ID"),
         "mesh_count":len(meshes),"triangulation":"blender glTF exporter",
         "object_names":[o.name for o in meshes],
         "views":["front","side","angle"],"files_sha256":checks,
         "quality_note":"Technical export and image files only. Artistic quality awaits image review. No baked normal texture."}
(OUT/"manifest.json").write_text(json.dumps(summary,indent=2),encoding="utf-8")
print("KNIGHT_RENDER_COMPLETE",json.dumps({"meshes":len(meshes),"output":str(OUT)}))
