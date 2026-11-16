import bpy, math, random, os, json, hashlib
from mathutils import Vector
rng=random.Random(20261116)
OUT=os.path.abspath("render-output/b2-ruined-stone-arch-v1")
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF");p.inputs["Base Color"].default_value=(*color,1);p.inputs["Roughness"].default_value=.91
 noise=m.node_tree.nodes.new("ShaderNodeTexNoise");noise.inputs["Scale"].default_value=22;noise.inputs["Detail"].default_value=3
 bump=m.node_tree.nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.22;bump.inputs["Distance"].default_value=.075
 m.node_tree.links.new(noise.outputs["Fac"],bump.inputs["Height"]);m.node_tree.links.new(bump.outputs["Normal"],p.inputs["Normal"])
 return m
mats=[material("weathered gray sandstone",(.36,.33,.28)),material("dark weathered joints",(.25,.24,.22)),material("warm aged stone",(.45,.39,.30)),material("pale worn face",(.50,.47,.40))]
def stone(name,center,size,mat,rotation=None):
 dx,dy,dz=size;verts=[]
 for z in [-1,1]:
  for y in [-1,1]:
   for x in [-1,1]:
    verts.append((x*dx*.5+rng.uniform(-.035,.035),y*dy*.5+rng.uniform(-.028,.028),z*dz*.5+rng.uniform(-.035,.035)))
 faces=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 obj.location=center;obj.rotation_euler=rotation or (rng.uniform(-.025,.025),rng.uniform(-.025,.025),rng.uniform(-.04,.04))
 mesh.materials.append(mat);b=obj.modifiers.new("eroded edges","BEVEL");b.width=.035;b.segments=2
 obj.modifiers.new("weighted normals","WEIGHTED_NORMAL")
 return obj
# Two asymmetrical piers with interlocking masonry courses and visible mortar joints.
for side in [-1,1]:
 for course in range(9 if side==-1 else 7):
  z=.19+course*.32
  x=side*(1.43+rng.uniform(-.055,.055))
  for y in [-.28,.28]:
   if rng.random()<.10:continue
   stone("pier %s course %02d"%(side,course),(x,y,z),(.66,.52,.29),rng.choice(mats))
 # carved lintel support shoulder and cracked springing stone
 stone("arch springer",(side*1.30,0,2.85 if side==-1 else 2.25),(.94,.9,.35),mats[0])
# Arch follows a semicircular curve; keystone and several voussoirs are missing.
radius=1.42
for i in range(13):
 if i in (2,3,10):continue
 theta=math.pi-i*math.pi/12
 x=radius*math.cos(theta)
 z=2.77+radius*math.sin(theta)
 # stones are wedge-like by rotated weathered block and broken edge profiles
 obj=stone("voussoir %02d"%i,(x,0,z),(.40,.88,.43),mats[i%len(mats)],(0,-(theta-math.pi/2),rng.uniform(-.025,.025)))
 if i==6:obj.name="large weathered keystone"
# V1 additive connection repairs: retain original mesh blocks and missing-slot history.
# The early V1 left gaps at arch indices 2,3,10; the detached middle span
# appeared to float. Reintroduce deliberately chipped, staggered support stones
# rather than removing or replacing any original voussoir.
# Retain the visible broken gaps from the admired old V1: repairs are partial,
# not complete replacement of missing voussoir slots.
for idx,scale,shift in [(2,.52,-.115),(3,.46,.145),(10,.50,.135)]:
 theta=math.pi-idx*math.pi/12
 x=radius*math.cos(theta)
 z=2.77+radius*math.sin(theta)
 m=stone("additive fractured support voussoir %02d"%idx,(x+shift,0,z-.025),(.38*scale,.72,.40*scale),mats[(idx+1)%len(mats)],(0,-(theta-math.pi/2),rng.uniform(-.035,.035)))
 m.scale=(1.0,.92,.90)
# Right shoulder supports the lower curve where the original pier is shorter.
stone("right shoulder bridging masonry",(1.34,0,2.49),(.62,.84,.43),mats[0],(0,-.08,.035))
# Uneven extra blocks create stepped edges; the original columns remain intact.
stone("left broken outer cap",(-1.78,.05,2.70),(.31,.76,.29),mats[2],(0,.06,-.11))
stone("right uneven outer cap",(1.76,-.035,2.17),(.32,.76,.34),mats[1],(.03,-.08,.09))

# V1-preserving surface and masonry pass: separate details, no original mesh removed.
# Keep the established asymmetrical arch silhouette and recognizable stone courses.
# Add a few broad, weathered spalls, not clouds of small floating debris.
for n,(x,y,z,w,h,d,rx,ry,rz) in enumerate([
 (-1.44,-.558,.74,.42,.075,.15,.02,-.05,-.09),
 (-1.55,-.564,1.71,.31,.055,.17,-.02,.07,.12),
 (-1.31,-.559,2.33,.35,.080,.15,.03,.10,-.04),
 ( 1.47,-.559,.91,.35,.070,.14,-.01,.04,.08),
 ( 1.33,-.560,1.80,.39,.065,.14,.02,-.05,-.11),
]):
 stone("weathered joint lip %02d"%n,(x,y,z),(w,d,h),mats[(n+1)%len(mats)],(rx,ry,rz))
# A few grounded displaced fragments echo the missing crown masonry, keeping the
# original large rubble arrangement intact. Their bases intersect the ground.
for n,(x,y,w,h,d) in enumerate([
 (-1.91,-.83,.30,.19,.26),(-1.67,.88,.38,.23,.30),
 ( 1.88,.73,.34,.22,.27),(1.48,-.92,.31,.18,.25),
]):
 stone("fallen chipped edge %02d"%n,(x,y,h*.38),(w,d,h),mats[(n+2)%len(mats)],(.09*n,-.10,.15*(n-1)))

# Broken rubble on ground, one side heavier than other
for i in range(26):
 x=rng.uniform(-2.15,2.15);y=rng.uniform(-1.1,1.1);s=rng.uniform(.08,.34)
 stone("collapsed arch fragment %02d"%i,(x,y,s*.42),(s*rng.uniform(.8,2),s*rng.uniform(.8,1.5),s),rng.choice(mats))
# thin ground foundation stone slabs
for i in range(7):
 x=-1.8+i*.60
 stone("uneven ancient threshold %02d"%i,(x,0,.035+rng.uniform(0,.02)),(.57,1.55,.09),mats[i%4])
# Export mesh only before creating render stage
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
 if o.type=='MESH':o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,"ruined_stone_arch_v1.glb"),export_format='GLB',use_selection=True)
bpy.ops.object.select_all(action='DESELECT')
world=bpy.context.scene.world or bpy.data.worlds.new("World");bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.27,.29,.33,1);world.node_tree.nodes["Background"].inputs["Strength"].default_value=.55
def area(name,loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size
area("key",(2,-4,7),850,6);area("fill",(-4,2,5),450,5)
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=6.9
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='BLENDER_EEVEE'  # Blender 5.0+ uses BLENDER_EEVEE, not BLENDER_EEVEE_NEXT
scene.render.resolution_x=960;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=0
target=Vector((0,0,1.9))
for name,loc in [('front',(0,-8,4)),('side',(8,0,3.5)),('angle',(6,-8,5.5))]:
 cam.location=loc;direction=target-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=os.path.join(OUT,"ruined_stone_arch_v1_"+name+".png");bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,"ruined_stone_arch_v1.blend"))
# Validate saved outputs and record file hashes for Claude/browser handoff.
files=["ruined_stone_arch_v1.glb","ruined_stone_arch_v1.blend"]+["ruined_stone_arch_v1_"+x+".png" for x in ("front","side","angle")]
checksums={}
for file in files:
 path=os.path.join(OUT,file)
 with open(path,"rb") as inp: payload=inp.read()
 if len(payload)<1024:raise RuntimeError("Missing or undersized output: "+file)
 if file.endswith(".png") and not payload.startswith(bytes.fromhex("89504e470d0a1a0a")):raise RuntimeError("Invalid PNG header: "+file)
 if file.endswith(".glb") and not payload.startswith(b"glTF"):raise RuntimeError("Invalid GLB header")
 checksums[file]=hashlib.sha256(payload).hexdigest()
manifest={"name":"ruined_stone_arch_v1","status":"NOT_APPROVED","files":files,"sha256":checksums,
 "mesh_count":len([o for o in bpy.data.objects if o.type=="MESH" and not o.name.startswith("preview_")]),
 "source":"tools/b2-render/build-ruined-stone-arch-v1.py","notes":"Old V1 retained; additive weathering, rubble and partial arch supports. Blender three-view visual QA pending."}
with open(os.path.join(OUT,"manifest.json"),"w") as f:json.dump(manifest,f,indent=2)
print("OUTPUT_VALIDATED",len(files),"files",flush=True)
