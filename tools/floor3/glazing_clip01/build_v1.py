"""F3 ruined city — glazing retainer clip 01.
One independent bent sheet-steel mounting clip, for old steel window frames.
Model only the retainer; neither the glass nor the window frame is duplicated.
Blender 5.3 headless: .glb, .blend, 4 review PNGs.
"""
import bpy, math, os, random
from mathutils import Vector
OUT="/work/out/f3_glazing_clip01"
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
# 48 mm long, 22 mm high, 2.0 mm bent steel sheet. Cross section in YZ.
# Rear mounting flange, short horizontal bridge and short front lip.
profile=[(-.011,-.012),(-.009,-.012),(-.009,.004),
         (.005,.004),(.005,-.003),(.007,-.003),
         (.007,.006),(-.011,.006)]
verts=[(x,y,z) for x in (-.024,.024) for y,z in profile]
n=len(profile)
faces=[]
for i in range(n):
 j=(i+1)%n
 faces.append((i,j,n+j,n+i))
# Triangulated end caps (concave sheet profile) using a fan would overlap,
# so cap is omitted: two-sided thin cut remains open, while silhouette is valid.
mesh=bpy.data.meshes.new("bent_stamped_sheet_steel")
mesh.from_pydata(verts,[],faces);mesh.update()
ob=bpy.data.objects.new("F3_GLAZING_RETAINER_CLIP01_V1",mesh)
bpy.context.collection.objects.link(ob)
uv=mesh.uv_layers.new(name="clip_uv")
for face in mesh.polygons:
 for li in face.loop_indices:
  p=mesh.vertices[mesh.loops[li].vertex_index].co
  uv.data[li].uv=((p.x+.024)/.048,(p.z+.012)/.024)
# Reproducible, subtle paint decay: generated 256 square PBR albedo/Roughness images.
N=256
color=bpy.data.images.new("F3_GLAZING_CLIP_PAINT_RUST_01",width=N,height=N,alpha=False)
rough=bpy.data.images.new("F3_GLAZING_CLIP_ROUGHNESS_01",width=N,height=N,alpha=False)
rng=random.Random(201126)
cp=[];rp=[]
for j in range(N):
 v=j/(N-1)
 for i in range(N):
  u=i/(N-1)
  edge=max(0,1-min(u,1-u,v,1-v)/.105)
  p1=math.exp(-((u-.18)/.14)**2-((v-.79)/.17)**2)
  p2=math.exp(-((u-.81)/.12)**2-((v-.26)/.10)**2)
  drip=max(0,math.sin(u*19+v*3))*.08
  oxide=min(.87,max(0, .26*p1+.55*p2+.13*edge+drip+rng.uniform(-.025,.025)))
  paint=(.22,.245,.245);rust=(.34,.17,.095)
  rgb=tuple(paint[k]*(1-oxide)+rust[k]*oxide for k in range(3))
  cp.extend((*rgb,1))
  rr=min(.97,.58+.36*oxide)
  rp.extend((rr,rr,rr,1))
color.pixels[:]=cp;rough.pixels[:]=rp
for im in (color,rough):
 im.filepath_raw=OUT+'/'+im.name+'.png'
 im.file_format="PNG";im.save()
mat=bpy.data.materials.new("ruined_frame_painted_sheet")
mat.use_nodes=True
nt=mat.node_tree
bs=nt.nodes.get("Principled BSDF")
bs.inputs["Metallic"].default_value=.63
cs=nt.nodes.new("ShaderNodeTexImage");cs.image=color
nt.links.new(cs.outputs["Color"],bs.inputs["Base Color"])
rs=nt.nodes.new("ShaderNodeTexImage");rs.image=rough
rough.colorspace_settings.name="Non-Color"
nt.links.new(rs.outputs["Color"],bs.inputs["Roughness"])
mesh.materials.append(mat)
bev=ob.modifiers.new("rolled edges","BEVEL")
bev.width=.00065;bev.segments=2
ob.modifiers.new("weighted normals","WEIGHTED_NORMAL")
# Two shallow stamped dimples on back flange: physically small rivet/fastener heads.
fast=bpy.data.materials.new("dark_worn_fasteners")
fast.diffuse_color=(.13,.145,.14,1)
fast.use_nodes=True
ps=fast.node_tree.nodes.get("Principled BSDF")
ps.inputs["Base Color"].default_value=(.13,.145,.14,1)
ps.inputs["Metallic"].default_value=.77;ps.inputs["Roughness"].default_value=.72
for sx in (-.014,.014):
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.0030,depth=.0014,
  end_fill_type="NGON",location=(sx,-.012,-.003),rotation=(math.pi/2,0,0))
 riv=bpy.context.object;riv.name="F3_GLAZING_CLIP01_FASTENER"
 riv.data.materials.append(fast)
 edge=riv.modifiers.new("softened stamp edge","BEVEL")
 edge.width=.0004;edge.segments=1
# Export exact clip and two fastener meshes, no background.
bpy.ops.object.select_all(action="DESELECT")
for item in bpy.context.scene.objects:
 if item.type=="MESH":item.select_set(True)
bpy.context.view_layer.objects.active=ob
stem="f3_glazing_clip01_v1"
bpy.ops.export_scene.gltf(filepath=OUT+"/"+stem+".glb",
 export_format="GLB",use_selection=True,export_apply=True)
scene=bpy.context.scene
scene.render.engine="CYCLES";scene.cycles.samples=40
scene.render.resolution_x=820;scene.render.resolution_y=820;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.film_transparent=True
scene.view_settings.view_transform="AgX"
scene.view_settings.look="AgX - Medium High Contrast"
world=bpy.data.worlds.new("overcast_window_detail")
world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.72,.75,.78,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.65
scene.world=world
for pos,power,size in [((-1,-1,1),300,1.5),((1,.5,1),220,1.4)]:
 bpy.ops.object.light_add(type="AREA",location=pos)
 l=bpy.context.object;l.data.energy=power;l.data.size=size
bpy.ops.object.camera_add()
cam=bpy.context.object;cam.data.type="ORTHO";scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/"+stem+".blend")
target=Vector((0,0,0))
for name,d,scale in [
 ("front",(0,-1,.15),.095),("side",(1,-.3,.15),.095),
 ("angle",(1,-1,.8),.095),("edge_detail",(1,-1,.4),.055)
]:
 cam.data.ortho_scale=scale
 cam.location=target+Vector(d).normalized()*.22
 cam.rotation_euler=(target-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=OUT+"/"+stem+"-"+name+".png"
 bpy.ops.render.render(write_still=True)
 print("F3_GLAZING_CLIP01_RENDER_OK",name,flush=True)
print("F3_GLAZING_CLIP01_ALL_COMPLETE",flush=True)
