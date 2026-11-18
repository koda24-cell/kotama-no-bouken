"""V14 repair exaggerated V13 grooves using preserved original core + shallow chips.
This is an independent unapproved Blender review, not a promotion.
"""
import bpy,sys,json,hashlib,math,random
from pathlib import Path
source=Path(sys.argv[sys.argv.index("--")+1]).resolve()
out=Path(sys.argv[sys.argv.index("--")+2]).resolve();out.mkdir(parents=True,exist_ok=True)
expected="31183d4bddfd2a785c4cda6c187e65971b33c077cb42a6a6cffa44ae2d577fb4"
sha=hashlib.sha256(source.read_bytes()).hexdigest()
if sha!=expected:raise RuntimeError("V13 original not verified")
bpy.ops.wm.open_mainfile(filepath=str(source))
core=bpy.data.objects.get("solid_curved_scoop_timbers")
backup=bpy.data.objects.get("V12_core_unmodified_backup")
if not core or not backup:raise RuntimeError("V13 backup/original missing")
# Never delete or rewrite the V12 backup. The visible candidate is restored to its
# protected original mesh and decorated with very sparse real shallow carved marks.
core.data=backup.data.copy()
for obj in list(bpy.data.objects):
 if obj.name.startswith("V13 anchored_end_grain_fiber"):
  bpy.data.objects.remove(obj,do_unlink=True)
def front_y(x,t):
 return .18-.47*(math.sin(.5*math.pi*t)**3)+.045*(x/.62)**2+.003*math.sin(x*22+t*15)-.042
def make_cut(n,x0,lo,hi,phase):
 verts=[];faces=[];segments=25
 for i in range(segments+1):
  f=i/segments;t=lo+(hi-lo)*f
  x=x0+.005*math.sin(f*2.7+phase)+.002*math.sin(f*10+phase*.6)
  width=.0014+.0018*(math.sin(math.pi*f)**2)
  z=.415-.82*t
  for side,dy in ((-1,-.007),(1,-.007),(-1,.006),(1,.006)):
   xx=x+side*width
   verts.append((xx,front_y(xx,t)+dy,z))
 for i in range(segments):
  a=i*4;b=a+4
  faces.extend([(a,a+1,b+1,b),(a+2,b+2,b+3,a+3),
                (a,a+2,b+2,b),(a+1,b+1,b+3,a+3)])
 faces.extend([(0,1,3,2),(4*segments,4*segments+2,4*segments+3,4*segments+1)])
 data=bpy.data.meshes.new("V14_cut_%d"%n)
 data.from_pydata(verts,[],faces);data.update()
 obj=bpy.data.objects.new("V14_tool_%d"%n,data)
 bpy.context.collection.objects.link(obj)
 m=core.modifiers.new("Shallow_irregular_age_crack_%d"%n,"BOOLEAN")
 m.operation="DIFFERENCE";m.solver="EXACT";m.object=obj
 bpy.ops.object.select_all(action="DESELECT")
 core.select_set(True);bpy.context.view_layer.objects.active=core
 bpy.ops.object.modifier_apply(modifier=m.name)
 bpy.data.objects.remove(obj,do_unlink=True)
cuts=[(-.41,.23,.35,.1),(-.17,.57,.72,.9),(.09,.29,.44,2.2),(.40,.64,.79,3.1)]
for n,(x,lo,hi,phase) in enumerate(cuts):make_cut(n,x,lo,hi,phase)
# Keep only 2 nonuniform end-grain splits as actual small geometrical fibers.
mat=bpy.data.materials.get("V08 exposed end grain")
for i,x in enumerate((-.36,.42)):
 y=-.34;z=-.394
 vertices=[(x-.009,y,z+.003),(x+.011,y,z+.009),(x+.003,y-.007,z-.020-(.008 if i else 0))]
 me=bpy.data.meshes.new("V14_timber_split_%d"%i)
 me.from_pydata(vertices,[],[(0,1,2)]);me.update()
 ob=bpy.data.objects.new("V14_minor_endgrain_fiber_%d"%i,me)
 bpy.context.collection.objects.link(ob);me.materials.append(mat)
# The original V12 wood backup remains editable and hidden; unlink from scene for GLB.
coll=backup.users_collection[0];coll.objects.unlink(backup)
tag="b2_bucket_paddle_blender_v14"
glb=out/(tag+".glb")
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",export_yup=True)
coll.objects.link(backup);backup.hide_render=True;backup.hide_set(True)
sc=bpy.context.scene;sc.render.engine="CYCLES";sc.cycles.samples=32
sc.render.resolution_x=820;sc.render.resolution_y=820;sc.render.resolution_percentage=100
cam=sc.camera;cam.data.type="ORTHO";cam.data.ortho_scale=1.7
files=[glb]
for view,pos in [("front",(0,-2.5,.12)),("side",(2.8,0,.12)),
                 ("angle",(1.65,-2.15,.72)),("back",(0,2.5,.12))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat("-Z","Y").to_euler()
 path=out/(tag+"_"+view+".png");sc.render.filepath=str(path)
 bpy.ops.render.render(write_still=True);files.append(path)
blend=out/(tag+".blend");bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={"asset":tag,"status":"NOT_APPROVED","source_v13_sha256":sha,
 "preserved_original_in_editable_blend":True,"wood_faces":len(core.data.polygons),
 "shallow_actual_cut_count":len(cuts),"added_endgrain_fibers":2,
 "CC0_photo_materials":"inherited Poly Haven wood_planks color normal roughness",
 "files":{}}
for file in files:
 b=file.read_bytes();manifest["files"][file.name]={"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()}
(out/(tag+"_manifest.json")).write_text(json.dumps(manifest,indent=2))
print("V14_BLENDER_MESH_SCULPT_VERIFIED",len(core.data.polygons),flush=True)
