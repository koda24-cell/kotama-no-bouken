import bpy, math, random, os, json, hashlib
from mathutils import Vector
rng=random.Random(20261116)
OUT=os.path.abspath("render-output/b2-ruined-stone-arch-v1")
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color):
 # Deterministic, authored stone-albedo texture; embedded in GLB for Three.js.
 # No external images or unverified licenses. Large value changes emulate
 # mineral bands; small variation creates rough, aged stone instead of flat paint.
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF");p.inputs["Base Color"].default_value=(*color,1);p.inputs["Roughness"].default_value=.97
 image=bpy.data.images.new(name+"_baked_albedo",width=256,height=256,alpha=True)
 pixels=[]
 grain=random.Random(9923+sum(ord(c) for c in name))
 phase=grain.random()*6.283
 for y in range(256):
  for x in range(256):
   broad=.20*math.sin(x*.048+y*.034+phase)+.12*math.sin(x*.117-y*.09+phase*2)
   fine=.055*math.sin(x*.69+y*.41)+grain.uniform(-.075,.075)
   v=max(.60,min(1.37,1+broad+fine))
   pixels.extend((min(.92,color[0]*v),min(.90,color[1]*v),min(.85,color[2]*v),1.0))
 image.pixels.foreach_set(pixels)
 image.filepath_raw=os.path.join(OUT,name.replace(" ","_")+"_albedo.png")
 image.file_format="PNG";image.save()
 tex=m.node_tree.nodes.new("ShaderNodeTexImage");tex.name="Baked stone albedo (GLB-compatible)";tex.image=image
 m.node_tree.links.new(tex.outputs["Color"],p.inputs["Base Color"])
 noise=m.node_tree.nodes.new("ShaderNodeTexNoise");noise.inputs["Scale"].default_value=42;noise.inputs["Detail"].default_value=4
 bump=m.node_tree.nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.35;bump.inputs["Distance"].default_value=.05
 m.node_tree.links.new(noise.outputs["Fac"],bump.inputs["Height"]);m.node_tree.links.new(bump.outputs["Normal"],p.inputs["Normal"])
 return m
def planar_uv(mesh):
 # Explicit per-face planar UVs, rather than relying on Blender-only Generated
 # coordinates that would disappear from GLB exports.
 uv=mesh.uv_layers.new(name="StoneTexUV")
 for poly in mesh.polygons:
  normal=poly.normal
  dominant=max(range(3),key=lambda i:abs(normal[i]))
  axes=([1,2] if dominant==0 else [0,2] if dominant==1 else [0,1])
  for loopidx in poly.loop_indices:
   v=mesh.vertices[mesh.loops[loopidx].vertex_index].co
   uv.data[loopidx].uv=(v[axes[0]]/1.05+.5,v[axes[1]]/1.05+.5)

mats=[material("weathered gray sandstone",(.36,.33,.28)),material("dark weathered joints",(.25,.24,.22)),material("warm aged stone",(.45,.39,.30)),material("pale worn face",(.50,.47,.40))]
def stone(name,center,size,mat,rotation=None):
 dx,dy,dz=size;verts=[]
 for z in [-1,1]:
  for y in [-1,1]:
   for x in [-1,1]:
    verts.append((x*dx*.5+rng.uniform(-.035,.035),y*dy*.5+rng.uniform(-.028,.028),z*dz*.5+rng.uniform(-.035,.035)))
 faces=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();planar_uv(mesh)
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

# PASS V2: dramatic broken masonry, separated as additive meshes, preserving V1.
# Silhouette: deep diagonal shears and one collapsed wall mass. Not a regular frame.
def fracture(name,location,scale,mat,rotation):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=location)
 ob=bpy.context.object;ob.name=name
 # faceted ancient blocks with sharp, chipped intersections
 ob.scale=scale;ob.rotation_euler=rotation
 ob.data.materials.append(mat);planar_uv(ob.data)
 return ob

# Split upper left wall: two staggered massive remnants offset in depth.
stone("left overhanging broken buttress",(-1.97,-.12,2.22),(.73,.79,.44),mats[1],(.12,-.13,-.26))
fracture("left outer shattered fracture",(-2.05,-.36,2.56),(.47,.39,.38),mats[0],(.08,-.33,.4))
stone("left fallen pier header",(-2.07,.57,.60),(.88,.57,.36),mats[2],(.31,-.19,-.46))
# Right pier breaks outward as a heavy fractured corner, partly embedded in the
# upper courses, with no floating parts.
stone("right split pier face",(1.91,-.19,2.02),(.76,.72,.52),mats[0],(-.12,.1,.29))
fracture("right jagged pier breach",(1.96,-.35,2.48),(.42,.33,.39),mats[1],(.1,.44,-.22))
# Damaged arch crest, offset shards straddling the original ring; don't rebuild
# missing stones into a pristine arch.
for idx,radial,tilt in [(4,.21,-.37),(6,.32,.21),(8,.25,.29),(11,.18,-.28)]:
 theta=math.pi-idx*math.pi/12
 x=(radius+radial)*math.cos(theta);z=2.77+(radius+radial)*math.sin(theta)
 fracture("arch rim spall %02d"%idx,(x,-.17,z),(.36,.27,.23),mats[idx%4],(.24,theta*.17,tilt))
# Large, identifiable fallen arch segments on the ground, not confetti.
for n,(x,y,z,sx,sy,sz,rx,ry,rz) in enumerate([
 (-2.10,-.64,.31,.88,.63,.59,.09,.20,-.28),
 (-1.10,.99,.24,.70,.50,.42,.31,-.12,.40),
 ( 1.94,.71,.28,.95,.60,.46,-.17,.18,.44),
 ( 1.24,-.92,.23,.67,.62,.36,.22,-.12,-.32),
 (.34,1.09,.16,.57,.49,.28,.26,.08,.21)
]):
 fracture("large collapsed voussoir %02d"%n,(x,y,z),(sx,sy,sz),mats[(n+1)%4],(rx,ry,rz))
# Narrow gouges and mineral deposits are subordinate to the large fracture.
for n in range(12):
 side=-1 if n<7 else 1
 level=.49+(n%7)*.31
 x=side*(1.72+.02*(n%3));y=-.59-(n%2)*.012
 stone("uneven exposed stone seam %02d"%n,(x,y,level),(.14,.08,.07),mats[(n+1)%4],(0,.12,(n%5-2)*.18))

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
 "source":"tools/b2-render/build-ruined-stone-arch-v1.py","notes":"Old V1 arch silhouette retained; dramatic chipped buttresses/large grounded rubble, UV and embedded procedural albedo. Blender three-view visual QA pending."}
with open(os.path.join(OUT,"manifest.json"),"w") as f:json.dump(manifest,f,indent=2)
print("OUTPUT_VALIDATED",len(files),"files",flush=True)
