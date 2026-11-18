"""V13 real wood joints: boolean-cut two irregular grooves from a V12 checkpoint.
Keep a hidden, unedited backup core inside .blend; export only live visible geometry.
No changes to wheel placement, animation or other stage assets.
"""
import bpy, math, random, json, hashlib, sys
from pathlib import Path
from mathutils import Vector
inp=Path(sys.argv[sys.argv.index("--")+1]).resolve()
out=Path(sys.argv[sys.argv.index("--")+2]).resolve();out.mkdir(parents=True,exist_ok=True)
source_sha=hashlib.sha256(inp.read_bytes()).hexdigest()
EXPECTED="f0003d2ba199dd20c744bbf4046b8adcbbf5ae258cd40143b8d3d170d1596bac"
if source_sha!=EXPECTED:raise RuntimeError("Refuse unexpected V12 Blender source")
bpy.ops.wm.open_mainfile(filepath=str(inp))
wood=bpy.data.objects.get("solid_curved_scoop_timbers")
assert wood is not None and wood.type=="MESH"
backup_coll=bpy.data.collections.new("V12_original_core_DO_NOT_EXPORT")
bpy.context.scene.collection.children.link(backup_coll)
backup=wood.copy();backup.data=wood.data.copy();backup.name="V12_core_unmodified_backup"
backup_coll.objects.link(backup);backup.hide_render=True;backup.hide_set(True)
# Original face is curved in Y. Cutters follow its actual sampled surface rather than
# floating parallel bars and preserve the back face plus outer shape.
def front_y(x,t):
 return .18-.47*(math.sin(.5*math.pi*t)**3)+.045*(x/.62)**2+.003*math.sin(x*22+t*15)-.042
def cutter_for(index,xbase):
 rng=random.Random(9812+index);V=[];F=[];steps=49
 for j in range(steps+1):
  t=.065+.86*j/steps
  x=xbase +.0045*math.sin(t*11+index*.7)+.0023*math.sin(t*29+1.2)
  width=.0065+ .002*math.sin(t*13+index)**2
  z=.415-.82*t
  for side,depth in [(-1,-.012),(1,-.012),(-1,.016),(1,.016)]:
   xx=x+side*width
   # negative y is toward front camera, from outside to inside timber
   yy=front_y(xx,t)+depth
   V.append((xx,yy,z))
 for j in range(steps):
  k=4*j;n=k+4
  F.extend([(k,k+1,n+1,n),(k+2,n+2,n+3,k+3),
            (k,k+2,n+2,n),(k+1,n+1,n+3,k+3)])
 F.extend([(0,1,3,2),(4*steps,4*steps+2,4*steps+3,4*steps+1)])
 data=bpy.data.meshes.new("cutting_tool_%d"%index)
 data.from_pydata(V,[],F);data.update()
 obj=bpy.data.objects.new("temporary_cutting_tool_%d"%index,data)
 bpy.context.collection.objects.link(obj)
 return obj
counts={}
for i,x in enumerate((-.21,.23)):
 cut=cutter_for(i,x)
 mod=wood.modifiers.new("Actual_irregular_recessed_joint_%d"%i,"BOOLEAN")
 mod.operation="DIFFERENCE";mod.solver="EXACT";mod.object=cut
 bpy.ops.object.select_all(action="DESELECT")
 wood.select_set(True);bpy.context.view_layer.objects.active=wood
 bpy.ops.object.modifier_apply(modifier=mod.name)
 bpy.data.objects.remove(cut,do_unlink=True)
 counts["groove_%d"%i]=len(wood.data.polygons)
# End grain: selected individually, sparse asymmetric exposed fibers anchored to lower lip
splitmat=bpy.data.materials.get("V08 exposed end grain")
assert splitmat
rng=random.Random(20261118)
for i,x in enumerate((-.48,-.31,.06,.34,.49)):
 z=-.401+.006*math.sin(x*26);y=-.325
 verts=[(x-.012,y,z+.014),(x+.009,y,z+.008),
        (x+.005,y-.014,z-.018-rng.uniform(0,.026))]
 data=bpy.data.meshes.new("end_grain_fracture_%d"%i)
 data.from_pydata(verts,[],[(0,1,2)]);data.update()
 obj=bpy.data.objects.new("V13 anchored_end_grain_fiber_%d"%i,data)
 bpy.context.collection.objects.link(obj);data.materials.append(splitmat)
# True original remains inside .blend; only visible candidate is exported to GLB.
# Ensure backup is not part of GLB selection.
bpy.ops.object.select_all(action="DESELECT")
for obj in bpy.context.scene.objects:
 if obj.type=="MESH" and obj!=backup and not obj.hide_get():
  obj.select_set(True)
tag="b2_bucket_paddle_blender_v13"
glb=out/(tag+".glb")
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",export_yup=True,export_selected=True)
scene=bpy.context.scene;scene.render.engine="CYCLES";scene.cycles.samples=32
scene.render.resolution_x=820;scene.render.resolution_y=820
scene.render.resolution_percentage=100;scene.render.image_settings.file_format="PNG"
cam=scene.camera;cam.data.type="ORTHO";cam.data.ortho_scale=1.7
files=[glb]
for name,pos in [("front",(0,-2.5,.12)),("side",(2.8,0,.12)),
                 ("angle",(1.65,-2.15,.72)),("back",(0,2.5,.12))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat("-Z","Y").to_euler()
 f=out/(tag+"_"+name+".png");scene.render.filepath=str(f)
 bpy.ops.render.render(write_still=True);files.append(f)
blend=out/(tag+".blend");bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={"asset":tag,"approval":"NOT_APPROVED","source_sha256":source_sha,
          "original_core_backup_in_blend":True,"wood_polygons_after_cuts":len(wood.data.polygons),
          "joints":counts,"new_end_grain_fibers":5,
          "material_source":"Poly Haven wood_planks CC0; inherited 3 photo PBR maps",
          "files":{}}
for f in files:
 b=f.read_bytes();manifest["files"][f.name]={"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()}
(out/(tag+"_manifest.json")).write_text(json.dumps(manifest,indent=2))
print("BLENDER_V13_BOOLEAN_JOINTS",manifest["joints"],flush=True)
