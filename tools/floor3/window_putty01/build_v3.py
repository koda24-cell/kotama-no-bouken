"""Stage 3 ruined-city window putty01 — ONE decayed glazing seal segment.
Real narrow triangular putty strip, softened edges, uneven material, small cracks.
No glass, frame or fasteners duplicated. Blender 5.3 glTF + four PNG proof.
"""
import bpy, math, random, os
from mathutils import Vector
OUT="/work/out/f3_window_putty01_v3"
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
rng=random.Random(20261120)
L=.340
# Original putty wedge, width 16mm x height 12mm, spanning a single short edge.
# x along the window perimeter, y depth, z height.
PROFILE=[(0,0),(.016,0),(.015,.003),(.010,.008),(.004,.012),(0,.011)]
S=23
verts=[]
for i in range(S):
 t=i/(S-1)
 x=L*(t-.5)
 uneven=.00115*math.sin(27*t+1.4)+.00050*math.sin(96*t)
 edge=(1-.48*max(0,(.09-t)/.09)-.65*max(0,(t-.91)/.09))
 for k,(y,z) in enumerate(PROFILE):
  dz=uneven*(.65 if k in (3,4) else .2)
  chip=0.0
  for where,width,depth in ((.22,.039,.0026),(.57,.020,.0016),(.87,.034,.0031)):
   chip=max(chip,depth*max(0,1-abs(t-where)/width))
  znew=z*edge+dz-(chip if k in (3,4,5) else 0)
  ynew=y + .00055*math.sin(t*34+2*k)*(1 if k in (2,3,4) else .22)
  verts.append((x,ynew,znew))
faces=[]
n=len(PROFILE)
for i in range(S-1):
 for k in range(n):
  j=(k+1)%n
  faces.append((i*n+k,i*n+j,(i+1)*n+j,(i+1)*n+k))
faces.append(tuple(reversed(tuple(range(n)))))
faces.append(tuple((S-1)*n+k for k in range(n)))
mesh=bpy.data.meshes.new("worn_putty_wedge_mesh")
mesh.from_pydata(verts,[],faces);mesh.update()
ob=bpy.data.objects.new("F3_WINDOW_PUTTY01_V3",mesh)
bpy.context.collection.objects.link(ob)
uv=mesh.uv_layers.new(name="putty_weathered_uv")
for poly in mesh.polygons:
 for li in poly.loop_indices:
  p=mesh.vertices[mesh.loops[li].vertex_index].co
  uv.data[li].uv=((p.x+L/2)/L,p.y/.016)
# Small self-authored 256px PBR maps. Chalky pale putty, dark edge grime
# and localized organic discoloration rather than uniform procedural stripes.
N=256
color=bpy.data.images.new("F3_PUTTY01_AGED_ALBEDO",width=N,height=N,alpha=False)
rough=bpy.data.images.new("F3_PUTTY01_ROUGHNESS",width=N,height=N,alpha=False)
cpx=[];rpx=[]
for row in range(N):
 v=row/(N-1)
 for col in range(N):
  u=col/(N-1)
  low=.16*max(0,1-v/.18)
  patch1=math.exp(-((u-.16)/.11)**2-((v-.25)/.21)**2)
  patch2=math.exp(-((u-.75)/.095)**2-((v-.77)/.23)**2)
  stain=min(.94,.17+.50*patch1+.65*patch2+low+.18*max(0,math.sin(18*u+7*v)*math.sin(11*v-8*u)))
  n0=rng.uniform(-.016,.016)
  base=(.30,.315,.285);dirty=(.105,.13,.11)
  rgb=[max(.02,min(.97,base[k]*(1-stain)+dirty[k]*stain+n0)) for k in range(3)]
  cpx.extend((*rgb,1))
  rr=min(1,.80+.17*stain)
  rpx.extend((rr,rr,rr,1))
color.pixels[:]=cpx;rough.pixels[:]=rpx
for im in (color,rough):
 im.filepath_raw=OUT+"/"+im.name+".png";im.file_format="PNG";im.save()
mat=bpy.data.materials.new("F3_OLD_CHALKY_PUTTY")
mat.use_nodes=True
p=mat.node_tree.nodes.get("Principled BSDF")
p.inputs["Metallic"].default_value=0
p.inputs["Roughness"].default_value=.88
nt=mat.node_tree
a=nt.nodes.new("ShaderNodeTexImage");a.image=color
nt.links.new(a.outputs["Color"],p.inputs["Base Color"])
r=nt.nodes.new("ShaderNodeTexImage");r.image=rough
rough.colorspace_settings.name="Non-Color"
nt.links.new(r.outputs["Color"],p.inputs["Roughness"])
mesh.materials.append(mat)
bev=ob.modifiers.new("time_softened_paste_edges","BEVEL")
bev.width=.00042;bev.segments=2;bev.limit_method="ANGLE"
ob.modifiers.new("normals_for_wedge","WEIGHTED_NORMAL")
# Physical chipped putty edge only; no hovering crack geometry.
# UV/color maps encode fissures in the coating, leaving GLB as ONE mesh.
# Export ONLY the main chipped putty mesh.
bpy.ops.object.select_all(action="DESELECT")
for object in bpy.context.scene.objects:
 if object.type=="MESH":object.select_set(True)
bpy.context.view_layer.objects.active=ob
stem="f3_window_putty01_v3"
bpy.ops.export_scene.gltf(filepath=OUT+"/"+stem+".glb",export_format="GLB",
 use_selection=True,export_apply=True)
scene=bpy.context.scene
scene.render.engine="CYCLES";scene.cycles.samples=32
scene.render.resolution_x=840;scene.render.resolution_y=840
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.film_transparent=True
scene.view_settings.view_transform="AgX"
scene.view_settings.look="AgX - Medium High Contrast"
scene.view_settings.exposure=-.60
world=bpy.data.worlds.new("overcast_aged_putty")
world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.75,.79,.81,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.75
scene.world=world
for xyz,power,size in [((-1,-1,1),195,1.6),((.8,.8,.7),125,1.2)]:
 bpy.ops.object.light_add(type="AREA",location=xyz)
 light=bpy.context.object;light.data.energy=power;light.data.size=size
bpy.ops.object.camera_add()
cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=.47
scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/"+stem+".blend")
target=Vector((0,.006,.004))
for name,d,scale in [("front",(0,-1,.65),.47),("side",(1,-.45,.6),.47),
 ("angle",(1,-1,1),.47),("surface_detail",(.35,-1,1),.105)]:
 cam.data.ortho_scale=scale
 cam.location=target+Vector(d).normalized()*.85
 cam.rotation_euler=(target-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=OUT+"/"+stem+"-"+name+".png"
 bpy.ops.render.render(write_still=True)
 print("F3_PUTTY01_RENDER_OK",name,flush=True)
print("F3_PUTTY01_ALL_COMPLETE",flush=True)
