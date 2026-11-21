"""Floor 3 collapsed reinforced-concrete beam V02, original procedural geometry.
Blender 5.3. No external images/assets. Unapproved isolated candidate.
Dimensions are metres. +X is the fractured end, -X is intact end.
"""
import bpy, math, random, os, json, hashlib
from mathutils import Vector, noise
OUT="/work/out/f3_fractured_beam_v02"
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
rng=random.Random(3301120)
def material(name,rgb,roughness=0.88,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
 bs=m.node_tree.nodes.get("Principled BSDF")
 bs.inputs["Base Color"].default_value=(*rgb,1)
 bs.inputs["Roughness"].default_value=roughness
 bs.inputs["Metallic"].default_value=metal
 return m
aged=material("F3_BEAM_WORN_GREY_BROWN_CONCRETE",(0.21,0.208,0.196))
core=material("F3_BEAM_FRACTURE_DARK_GREY",(0.215,0.207,0.199))
rust=material("F3_BEAM_RUSTED_REBAR",(0.126,0.060,0.033),0.86,0.36)
# Beam nominal width 0.32, height 0.39, length ~1.25.
# This is a toppled fragment, NOT a full wall, with visibly shattered +X end.
# Point list in Y-Z cross section CCW, varied angular corners, not a rectangle extrusion.
perim=[(-.151,-.165),(-.164,-.095),(-.160,.065),(-.143,.189),
       (-.063,.195),(.108,.189),(.158,.162),(.169,.032),
       (.166,-.116),(.123,-.188),(.011,-.197),(-.113,-.192)]
N=len(perim)
xs=[-.64,-.36,-.05,.28,.48,.548]
verts=[]
for ring,x in enumerate(xs):
 for i,(y,z) in enumerate(perim):
  # The break end doesn't share a single plane; 17–60mm chipped away.
  end=ring==len(xs)-1
  seam=.0019*noise.noise(Vector((x*8,y*23,z*25)))
  px=x+seam
  if end:
   steps=[-.033,-.016,-.052,-.029,-.009,-.045,-.055,-.015,-.027,-.061,-.029,-.014]
   px+=steps[i]+rng.uniform(-.005,.005)
  yy=y +(.003 if ring in (2,3,4) else .0)*math.sin(i*2.41+ring)
  zz=z+(.003 if ring in (1,2,4) else .0)*math.sin(i*3.16-ring)
  verts.append((px,yy,zz))
faces=[];matids=[]
def poly(indices,mi):faces.append(indices);matids.append(mi)
for ring in range(len(xs)-1):
 for i in range(N):
  j=(i+1)%N
  # 4-sided strip, changed to localized triangulated fracture only at last ring.
  a=ring*N+i;b=ring*N+j;c=(ring+1)*N+j;d=(ring+1)*N+i
  if ring==len(xs)-2 and i%3!=0:
   poly((a,b,d),0);poly((b,c,d),1)
  else:poly((a,b,c,d),0)
poly(tuple(reversed(tuple(range(N)))),0)
# V02 fracture surface: irregular interior ring plus noncentral core fan
# prevents a single 12-triangle star-shaped cap.
rim_index=len(verts)
for i,(yy,zz) in enumerate(perim):
 x=.489+.023*noise.noise(Vector((yy*30.,zz*31.,8.)))
 verts.append((x,yy*.66+.013*math.sin(i*2.3),zz*.71+.009*math.cos(i*1.7)))
center=len(verts);verts.append((.482,.018,-.023))
for i in range(N):
 j=(i+1)%N
 a=(len(xs)-1)*N+i;b=(len(xs)-1)*N+j;c=rim_index+j;d=rim_index+i
 if i%3==0:poly((a,b,d),1);poly((b,c,d),1)
 else:poly((a,b,c),1);poly((a,c,d),1)
 poly((center,rim_index+i,rim_index+j),1)
mesh=bpy.data.meshes.new("F3_BROKEN_BEAM_CORE");mesh.from_pydata(verts,[],faces);mesh.update()
ob=bpy.data.objects.new("F3_BROKEN_CONCRETE_BEAM_V02",mesh)
bpy.context.collection.objects.link(ob)
mesh.materials.append(aged);mesh.materials.append(core)
for f,idx in zip(mesh.polygons,matids):f.material_index=idx;f.use_smooth=False
# Self-authored tileable grayscale PBR albedo: embed texture into GLB.
# Three scales of nonperiodic stains, granular dark pockets and fine gray grain.
S=256
for tag,mat,seed,base in (("CAST",aged,127,(.20,.204,.192)),("FRACTURE",core,381,(.239,.237,.223))):
 im=bpy.data.images.new("F3_BEAM_V02_"+tag+"_PBR_ALBEDO",width=S,height=S,alpha=False)
 values=[]
 rand=random.Random(seed)
 for iy in range(S):
  vv=iy/(S-1)
  for ix in range(S):
   uu=ix/(S-1)
   n=rand.uniform(-.035,.035)
   grime=(.075*max(0.,noise.noise(Vector((uu*3.5,vv*4.1,seed/20.)))))
   fine=.023*noise.noise(Vector((uu*57,vv*48,seed/11.)))
   crack=.040*max(0.,math.sin(uu*23+vv*9)*math.cos(uu*10-vv*19))
   v=n+fine-grime-crack
   if tag=="FRACTURE":v*=.77
   values.extend((max(.05,base[0]+v),max(.05,base[1]+v),max(.05,base[2]+v),1.))
 im.pixels[:]=values
 im.filepath_raw=OUT+"/f3_beam_v02_"+tag.lower()+"_albedo.png";im.file_format="PNG";im.save()
 texnode=mat.node_tree.nodes.new("ShaderNodeTexImage");texnode.image=im
 mat.node_tree.links.new(texnode.outputs["Color"],mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
# Explicit planar UV projection per face: long sides use beam X direction,
# broken end uses local Y/Z for material orientation.
uv=mesh.uv_layers.new(name="F3_BEAM_PHYSICAL_UV")
for polygon in mesh.polygons:
 normal=polygon.normal
 for loop in polygon.loop_indices:
  v=mesh.vertices[mesh.loops[loop].vertex_index].co
  if abs(normal.x)>.72:xy=((v.y+.17)/.34,(v.z+.20)/.40)
  elif abs(normal.y)>abs(normal.z):xy=((v.x+.64)/1.20,(v.z+.20)/.40)
  else:xy=((v.x+.64)/1.20,(v.y+.17)/.34)
  uv.data[loop].uv=xy

# Real shallow chip near broken corner; original silhouette preserved.
bev=ob.modifiers.new("MINOR_CAST_CORNER_ABRASION","BEVEL")
bev.width=.003;bev.segments=1;bev.affect='EDGES'
bev.limit_method='ANGLE';bev.angle_limit=math.radians(48)
bpy.context.view_layer.objects.active=ob
try:bpy.ops.object.modifier_apply(modifier=bev.name)
except Exception as e:print("BEVEL_WARNING",repr(e))
# Three embedded bars, slight bends and different extension lengths; no floating metal objects.
def bar(name,coords,radius=.008):
 cu=bpy.data.curves.new(name,"CURVE");cu.dimensions="3D"
 cu.bevel_depth=radius;cu.bevel_resolution=3;cu.resolution_u=2
 spline=cu.splines.new("POLY");spline.points.add(len(coords)-1)
 for k,(x,y,z) in enumerate(coords):
  spline.points[k].co=(x,y,z,1)
 obj=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(obj)
 cu.materials.append(rust);return obj
bars=[
 bar("F3_REBAR_BENT_TOP",[(.390,-.091,.105),(.482,-.091,.105),(.554,-.097,.101),(.657,-.110,.079)]),
 bar("F3_REBAR_BENT_SIDE",[(.390,.089,.086),(.480,.084,.087),(.575,.084,.064),(.632,.093,.046)]),
 bar("F3_REBAR_SHORT_BOTTOM",[(.395,.035,-.106),(.495,.037,-.105),(.569,.043,-.116)],.007)
]
# Expose a few aggregate marks as flush, mesh-independent material detail; do not create white balls.
for obj in [ob]+bars:obj.select_set(False)
ob.select_set(True)
for barobj in bars:barobj.select_set(True)
bpy.context.view_layer.objects.active=ob
bpy.ops.export_scene.gltf(filepath=OUT+"/f3_fractured_beam_v02.glb",export_format="GLB",use_selection=True,export_apply=True)
bbox=[(min(v[i] for v in verts),max(v[i] for v in verts)) for i in range(3)]
print("F3_BEAM_CORE_EXTENTS_MM",*[round((hi-lo)*1000,1) for lo,hi in bbox],flush=True)
assert 1.10<=(bbox[0][1]-bbox[0][0])<=1.30
assert .30<=(bbox[1][1]-bbox[1][0])<=.38
assert .35<=(bbox[2][1]-bbox[2][0])<=.43
scene=bpy.context.scene
scene.render.engine="CYCLES";scene.cycles.samples=40
scene.render.resolution_x=1000;scene.render.resolution_y=800
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG";scene.render.film_transparent=True
scene.view_settings.view_transform="AgX"
scene.view_settings.look="AgX - Medium High Contrast"
scene.view_settings.exposure=-.42
world=bpy.data.worlds.new("F3_BEAM_NEUTRAL_STUDIO");world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.77,.79,.83,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.75
scene.world=world
for xyz,power,size in [((-1.2,-1.5,2.0),310,2.5),((1.0,1.0,1.3),185,2.0)]:
 bpy.ops.object.light_add(type="AREA",location=xyz);light=bpy.context.object
 light.data.energy=power;light.data.size=size
bpy.ops.object.camera_add();cam=bpy.context.object
cam.data.type="ORTHO";scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/f3_fractured_beam_v02.blend")
focus=Vector((0,0,0))
for name,d,scale in [
 ("front",(0,-1,.42),1.67),("side",(1,-.25,.38),1.12),
 ("angle",(1,-1,.86),1.64),("top",(0,-.20,1),1.72),
 ("break_detail",(1,-.60,.38),.89)]:
 cam.data.ortho_scale=scale
 cam.location=focus+Vector(d).normalized()*3.0
 cam.rotation_euler=(focus-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=OUT+"/f3_fractured_beam_v02-"+name+".png"
 bpy.ops.render.render(write_still=True)
 print("F3_BEAM_RENDER_OK",name,flush=True)
print("F3_BEAM_V02_ALL_COMPLETE",flush=True)
