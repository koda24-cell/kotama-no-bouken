"""F3 single chipped pane V9 — one chipped upper-right corner, no centre hole.
Standalone glass model. Previous research V1-V7 kept intact.
Blender 5.3, export GLB and 4 view PNGs, one mesh with actual 6mm edge.
"""
import bpy,math,os,random
from mathutils import Vector
OUT="/work/out/f3_glass_corner_chip_v9"
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
# The only geometry is the missing shard from V8.
# The original large glass sheet is omitted.
# The only geometry is the tiny missing corner of V8.
original=[(.56,.755),(.522,.779),(.484,.809),(.456,.838),(.413,.90),(.56,.90)]
cx=sum(x for x,z in original)/len(original)
cz=sum(z for x,z in original)/len(original)
points=[(x-cx,z-cz) for x,z in original]
W,H=.080,.085
mesh=bpy.data.meshes.new("single_detached_corner_shard")
mesh.from_pydata([(x,0,z) for x,z in points],[],[list(range(len(points)))])
mesh.update()
ob=bpy.data.objects.new("F3_GLASS_DETACHED_SHARD01_V9",mesh)
bpy.context.collection.objects.link(ob)
uv=mesh.uv_layers.new(name="whole_glass_uv")
for poly in mesh.polygons:
 for li in poly.loop_indices:
  p=mesh.vertices[mesh.loops[li].vertex_index].co
  uv.data[li].uv=((p.x+W)/(2*W),(p.z+H)/(2*H))
# Small, self-authored non-color roughness map; mostly clear, more dust near frame.
N=256
im=bpy.data.images.new("F3_GLASS_SINGLE_CHIP_ROUGHNESS_01",width=N,height=N,alpha=False)
rng=random.Random(111908)
pix=[]
for j in range(N):
 v=j/(N-1)
 for i in range(N):
  u=i/(N-1)
  edge=max(0.,1.-min(u,1-u,v,1-v)/.095)
  dust=.035*max(0,math.sin(22*u+6*v)*math.cos(32*v-9*u))
  drips=0.
  for a,b in ((.21,.9),(.76,.86)):
   if v<b: drips=max(drips,.12*math.exp(-((u-a-.018*(b-v))/.026)**2)*math.exp(-3.2*(b-v)))
  r=max(.055,min(.48,.077+.16*edge+dust+drips+rng.uniform(-.007,.007)))
  pix.extend((r,r,r,1.))
im.pixels[:]=pix
im.filepath_raw=OUT+"/F3_GLASS_SINGLE_CHIP_ROUGHNESS_01.png"
im.file_format="PNG"
im.save()
material=bpy.data.materials.new("lightly_weathered_clear_glass")
material.use_nodes=True
nodes=material.node_tree.nodes
links=material.node_tree.links
p=nodes.get("Principled BSDF")
p.inputs["Base Color"].default_value=(.94,.98,.975,1)
p.inputs["Metallic"].default_value=0
p.inputs["Transmission Weight"].default_value=.98
p.inputs["IOR"].default_value=1.47
p.inputs["Roughness"].default_value=.08
tn=nodes.new("ShaderNodeTexImage")
tn.image=im
im.colorspace_settings.name="Non-Color"
tn.interpolation="Linear"
links.new(tn.outputs["Color"],p.inputs["Roughness"])
mesh.materials.append(material)
solid=ob.modifiers.new("six_mm_actual_thickness","SOLIDIFY")
solid.thickness=.006
solid.offset=0
bevel=ob.modifiers.new("tiny_light_catching_cut_edges","BEVEL")
bevel.width=.00075;bevel.segments=1;bevel.limit_method='ANGLE'
# The absence of a central hole is checked in source geometry: exactly one ngon.
assert len(mesh.polygons)==1 and len(mesh.vertices)==6
bpy.ops.object.select_all(action='DESELECT')
ob.select_set(True)
bpy.context.view_layer.objects.active=ob
stem="f3_glass_detached_shard01_v9"
bpy.ops.export_scene.gltf(filepath=f"{OUT}/{stem}.glb",export_format="GLB",
                          use_selection=True,export_apply=True)
scene=bpy.context.scene
scene.render.engine="CYCLES";scene.cycles.samples=40
scene.render.resolution_x=850;scene.render.resolution_y=850
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.film_transparent=False
scene.view_settings.view_transform="AgX"
scene.view_settings.look="AgX - Medium High Contrast"
scene.view_settings.exposure=-.24
world=bpy.data.worlds.new("ruined_window_studio")
world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.40,.44,.49,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.8
scene.world=world
# Backdrop belongs to QA only. It is NOT in GLB.
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,.48,0),rotation=(math.pi/2,0,0))
back=bpy.context.object;back.name="RENDER_ONLY_DARK_TEST_BACKDROP"
back.scale=(1.4,1.4,1)
bm=bpy.data.materials.new("slate_gradient_free_backdrop")
bm.use_nodes=True
bm.node_tree.nodes.clear()
em=bm.node_tree.nodes.new("ShaderNodeEmission")
em.inputs["Color"].default_value=(.065,.085,.110,1)
em.inputs["Strength"].default_value=1.
out=bm.node_tree.nodes.new("ShaderNodeOutputMaterial")
bm.node_tree.links.new(em.outputs[0],out.inputs["Surface"])
back.data.materials.append(bm)
for loc,power,size in [((-2,-2.8,2.7),350,2.3),((1.4,1.3,2.2),245,2.4)]:
 bpy.ops.object.light_add(type="AREA",location=loc)
 light=bpy.context.object;light.data.energy=power;light.data.size=size
bpy.ops.object.camera_add()
cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=2.38;scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=f"{OUT}/{stem}.blend")
for name,d,scale,focus in [
 ("front",(0,-1,.12),.30,Vector((0,0,0))),
 ("side",(1,-.35,.14),.30,Vector((0,0,0))),
 ("angle",(1,-1,.30),.30,Vector((0,0,0))),
 ("chip_detail",(1,-1,.24),.18,Vector((0,0,0)))
]:
 cam.data.ortho_scale=scale
 cam.location=focus+Vector(d).normalized()*3.2
 cam.rotation_euler=(focus-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=f"{OUT}/{stem}-{name}.png"
 bpy.ops.render.render(write_still=True)
 print("F3_GLASS_SINGLE_CHIP_V9_RENDER_OK",name,flush=True)
print("F3_GLASS_SINGLE_CHIP_V9_ALL_COMPLETE",flush=True)
