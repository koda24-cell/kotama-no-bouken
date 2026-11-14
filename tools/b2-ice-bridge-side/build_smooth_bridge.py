"""Separate smooth translucent ice bridge core study; preserves V7 bank models."""
import bpy, math
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent/"reviews"
OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
def mat(name,col,rough,trans=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*col,1);m.use_nodes=True
 bs=m.node_tree.nodes.get("Principled BSDF")
 bs.inputs["Base Color"].default_value=(*col,1)
 bs.inputs["Roughness"].default_value=rough
 bs.inputs["Transmission Weight"].default_value=trans
 bs.inputs["IOR"].default_value=1.31
 return m
clear=mat("Smooth blue translucent ice",(0.32,.70,.84),.12,.43)
edge=mat("Frosted fractured edges",(.74,.89,.91),.55,.05)
core=mat("Deep glacial blue",(.12,.38,.53),.18,.22)
# Bridge axis X; fixed x=-1 and x=1 cross-sections for 2m tile adjacency.
nx=32;ny=12;verts=[];faces=[]
for layer in range(3):
 for i in range(nx+1):
  x=-1+2*i/nx
  taper=math.sin(math.pi*i/nx)**2
  for j in range(ny+1):
   v=-1+2*j/ny
   y=v*(.49+taper*(.045*math.sin(6*x+1)+.023*math.cos(13*x)))
   # Smooth, walkable surface: no high-frequency bumps or protruding stones.
   z=(-.01 if layer==0 else (-.17 if layer==1 else -.25))
   if layer==0: z+=taper*.006*math.cos(4*x+3*v)
   if layer==2: z+=taper*.022*math.sin(7*x+v)
   verts.append((x,y,z))
n=(nx+1)*(ny+1)
for i in range(nx):
 for j in range(ny):
  a=i*(ny+1)+j;b=a+ny+1
  faces.append((a,b,b+1,a+1))
  faces.append((a+2*n,a+2*n+1,b+2*n+1,b+2*n))
for i in range(nx):
 for j in (0,ny):
  a=i*(ny+1)+j;b=(i+1)*(ny+1)+j
  faces.extend([(a,a+n,b+n,b),(a+n,a+2*n,b+2*n,b+n)])
for i in (0,nx):
 for j in range(ny):
  a=i*(ny+1)+j;b=a+1
  faces.extend([(a,b,b+n,a+n),(a+n,b+n,b+2*n,a+2*n)])
mesh=bpy.data.meshes.new("smooth_ice_bridge_mesh");mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new("smooth_translucent_bridge_core",mesh);bpy.context.collection.objects.link(obj)
mesh.materials.append(clear)
# Thin embedded blue ice stratum: internal color without noisy surface geometry.
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.175))
stratum=bpy.context.object;stratum.name="embedded_blue_ice_stratum"
stratum.dimensions=(1.92,.68,.025)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
stratum.data.materials.append(core)
# Small frosted chips only at two long edges; never over the walking surface.
for k,(x,y,z,sx,sy,sz) in enumerate([(-.62,-.49,-.11,.22,.028,.10),(.31,.50,-.14,.31,.035,.12),(.72,-.48,-.10,.17,.028,.09)]):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z))
 o=bpy.context.object;o.name="localized_frost_edge_%02d"%k;o.dimensions=(sx,sy,sz)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(edge)
# GLB export includes only actual mesh geometry; all materials are glTF compatible.
objects=[o for o in bpy.context.scene.objects if o.type=="MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=obj
bpy.ops.export_scene.gltf(filepath=str(OUT/"ice_bridge_smooth_core.glb"),export_format="GLB",use_selection=True)
bpy.ops.object.light_add(type="AREA",location=(2,-3,5))
bpy.context.object.data.energy=900;bpy.context.object.data.size=3
bpy.ops.object.camera_add()
cam=bpy.context.object;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine="CYCLES";scene.cycles.samples=32
scene.render.resolution_x=800;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.world.color=(.24,.30,.35)
for name,location in {"front":(0,-3.3,1.8),"side":(3.4,0,1.6),"angle":(2.6,-3.1,2.2)}.items():
 cam.location=location
 cam.rotation_euler=(Vector((0,0,-.12))-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=str(OUT/("ice_bridge_smooth_"+name+".png"))
 bpy.ops.render.render(write_still=True)
print("SMOOTH_ICE_BRIDGE_STUDY_DONE")
