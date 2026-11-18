"""Floor 3 modular wall 01 — one concrete slab only, three measured iterations.
No windows, rebar, plants, rubble, other building geometry, or gameplay changes.
"""
import bpy, math, random, os, json
from mathutils import Vector
OUT="/work/out/floor3_wall01"
os.makedirs(OUT,exist_ok=True)
W,H,T=3.6,2.8,.30
def material():
 m=bpy.data.materials.new("B3_aged_concrete_PBR_procedural")
 m.use_nodes=True
 m.diffuse_color=(.35,.34,.31,1)
 bs=m.node_tree.nodes.get("Principled BSDF")
 bs.inputs["Roughness"].default_value=.93
 bs.inputs["Metallic"].default_value=0
 nt=m.node_tree
 tex=nt.nodes.new("ShaderNodeTexNoise")
 tex.inputs["Scale"].default_value=21
 tex.inputs["Detail"].default_value=4.5
 tex.inputs["Roughness"].default_value=.73
 ramp=nt.nodes.new("ShaderNodeValToRGB")
 ramp.color_ramp.elements[0].position=.18
 ramp.color_ramp.elements[0].color=(.20,.195,.177,1)
 ramp.color_ramp.elements[1].position=.80
 ramp.color_ramp.elements[1].color=(.49,.475,.44,1)
 nt.links.new(tex.outputs["Fac"],ramp.inputs["Fac"])
 nt.links.new(ramp.outputs["Color"],bs.inputs["Base Color"])
 bump=nt.nodes.new("ShaderNodeBump")
 bump.inputs["Strength"].default_value=.35
 bump.inputs["Distance"].default_value=.018
 nt.links.new(tex.outputs["Fac"],bump.inputs["Height"])
 nt.links.new(bump.outputs["Normal"],bs.inputs["Normal"])
 return m
def wall(version,mat):
 nx,nz=28,22
 verts=[]
 rng=random.Random(321)
 # Four corners remain registered to the same nominal modular wall footprint.
 # front/back share the same irregular edge, preventing unclosed geometry.
 for side in (0,1):
  for iz in range(nz+1):
   z=H*iz/nz
   for ix in range(nx+1):
    x=W*(ix/nx-.5)
    edge=(ix==0 or ix==nx or iz==0 or iz==nz)
    wave=(math.sin(ix*2.73+iz*.42)*.011+math.sin(ix*.84+iz*1.95)*.008)
    if version==1: wave*=.18
    if version==2: wave*=.60
    # careful chipped silhouette, not giant destroyed geometry
    if version==3 and edge and iz>nz*.62 and ix>nx*.75:
     wave-=.045*abs(math.sin(ix*.71+iz*.62))
    if version==3 and edge and ix==nx and 8<iz<16:
     wave-=.025*abs(math.sin(iz*.82))
    # low-amplitude relief, not uniform planar front
    depth=(.012 if version==1 else .022 if version==2 else .031)
    displacement=depth*(math.sin(ix*.61+iz*.29)*math.cos(iz*.63)+.25*math.sin(ix*2.53+iz*.97))
    y=(-T/2 if side==0 else T/2)+((-1 if side==0 else 1)*displacement)
    xx=x+(wave if edge else 0)
    zz=z
    if edge and version>=2:zz+=wave*.4
    verts.append((xx,y,zz))
 faces=[]
 section=(nx+1)*(nz+1)
 def idx(side,i,j):return side*section+j*(nx+1)+i
 for j in range(nz):
  for i in range(nx):
   faces.append((idx(0,i,j),idx(0,i,j+1),idx(0,i+1,j+1),idx(0,i+1,j)))
   faces.append((idx(1,i,j),idx(1,i+1,j),idx(1,i+1,j+1),idx(1,i,j+1)))
 for i in range(nx):
  faces.append((idx(0,i,0),idx(0,i+1,0),idx(1,i+1,0),idx(1,i,0)))
  faces.append((idx(0,i,nz),idx(1,i,nz),idx(1,i+1,nz),idx(0,i+1,nz)))
 for j in range(nz):
  faces.append((idx(0,0,j),idx(1,0,j),idx(1,0,j+1),idx(0,0,j+1)))
  faces.append((idx(0,nx,j),idx(0,nx,j+1),idx(1,nx,j+1),idx(1,nx,j)))
 mesh=bpy.data.meshes.new("one_wall_only_mesh")
 mesh.from_pydata(verts,[],faces)
 mesh.update()
 obj=bpy.data.objects.new("B3_wall_01_unbroken_base",mesh)
 bpy.context.collection.objects.link(obj)
 obj.data.materials.append(mat)
 for poly in mesh.polygons:poly.use_smooth=True
 bevel=obj.modifiers.new("gentle worn edges","BEVEL");bevel.width=.012;bevel.segments=2;bevel.limit_method='ANGLE'
 weighted=obj.modifiers.new("edge weighted normals","WEIGHTED_NORMAL");weighted.keep_sharp=True
 return obj
def camera_at(direction,target,scale):
 bpy.ops.object.camera_add()
 c=bpy.context.object
 c.data.type='ORTHO';c.data.ortho_scale=scale
 c.location=target+Vector(direction).normalized()*6.5
 c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler()
 bpy.context.scene.camera=c
 return c
def setup_lights():
 world=bpy.data.worlds.new("overcast_city_world")
 world.use_nodes=True
 world.node_tree.nodes.get("Background").inputs['Color'].default_value=(.56,.60,.65,1)
 world.node_tree.nodes.get("Background").inputs['Strength'].default_value=.65
 bpy.context.scene.world=world
 for loc,power,size in [((-3,-4,5),550,4),((4,2,3),430,3),((2,-1,5),250,4)]:
  bpy.ops.object.light_add(type='AREA',location=loc)
  o=bpy.context.object;o.data.energy=power;o.data.size=size
 scene=bpy.context.scene
 scene.render.engine='CYCLES'
 scene.cycles.samples=24
 scene.render.resolution_x=780
 scene.render.resolution_y=780
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG'
 scene.view_settings.view_transform='AgX'
 scene.view_settings.look='AgX - Medium High Contrast'
 scene.view_settings.exposure=0
 scene.render.film_transparent=True
for ver in (1,2,3):
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.object.delete(use_global=False)
 obj=wall(ver,material())
 bpy.ops.object.select_all(action='DESELECT')
 obj.select_set(True);bpy.context.view_layer.objects.active=obj
 stem=f"floor3_wall01_v{ver}"
 bpy.ops.export_scene.gltf(filepath=f"{OUT}/{stem}.glb",export_format="GLB",use_selection=True,export_apply=True)
 setup_lights()
 target=Vector((0,0,H/2))
 c=camera_at((0,-1,.12),target,4.45)
 bpy.ops.wm.save_as_mainfile(filepath=f"{OUT}/{stem}.blend")
 for view,d in [('front',(0,-1,.12)),('side',(1,-.12,.20)),('angle',(1,-1,.48))]:
  c.location=target+Vector(d).normalized()*6.5
  c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler()
  bpy.context.scene.render.filepath=f"{OUT}/{stem}-{view}.png"
  bpy.ops.render.render(write_still=True)
  print("WALL01_RENDER_OK",ver,view,flush=True)
 print("WALL01_ITERATION_COMPLETE",ver,flush=True)
print("WALL01_ALL_COMPLETE")
