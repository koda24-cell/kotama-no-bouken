"""Non-destructive V25-width foliage card / painted bark preview (Blender 5.3).
Inputs: verified V27 GLB + f6_texture_assets_review_v01.zip extracted folder.
Review only. Original leaves remain in the .blend, hidden from render;
NOT_APPROVED GLB is exported from candidate leaves and original wood.
"""
import bpy,sys,argparse,json,hashlib,random,math
from pathlib import Path
from mathutils import Vector
p=argparse.ArgumentParser()
p.add_argument("--source",type=Path,required=True)
p.add_argument("--textures",type=Path,required=True)
p.add_argument("--output",type=Path,required=True)
args=p.parse_args(sys.argv[sys.argv.index("--")+1:])
args.output.mkdir(parents=True,exist_ok=True)
assert args.source.read_bytes()[:4]==b"glTF"
manifest=json.loads((args.textures/"manifest.json").read_text())
assert manifest["status"]=="NOT_APPROVED" and len(manifest["sprites"])==6
for file,sha in manifest["sha256"].items():
 assert hashlib.sha256((args.textures/file).read_bytes()).hexdigest()==sha,file
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.source.resolve()))
leaves=[o for o in bpy.data.objects if o.type=="MESH" and
  (o.name.startswith("tree_mature_leaf_") or o.name.startswith("tree_mature_v25_canopy_"))]
assert len(leaves)>9000
def center(o):
 return o.matrix_world@(sum((v.co for v in o.data.vertices),Vector())/len(o.data.vertices))
pts=[center(o) for o in leaves]
lower=Vector(tuple(min(v[i] for v in pts) for i in range(3)))
upper=Vector(tuple(max(v[i] for v in pts) for i in range(3)))
span=upper-lower
assert span.x>1 and span.y>1
for ob in leaves:ob.hide_render=True
rng=random.Random(62591)
# Source cards use six generated transparent alpha sprites, never screenshots.
materials=[]
for i,entry in enumerate(manifest["sprites"]):
 img=bpy.data.images.load(str((args.textures/entry["filename"]).resolve()))
 img.pack()
 m=bpy.data.materials.new("F6_LeafBunch_%02d"%(i+1))
 m.use_nodes=True
 bs=m.node_tree.nodes.get("Principled BSDF")
 bs.inputs["Roughness"].default_value=.96
 tex=m.node_tree.nodes.new("ShaderNodeTexImage");tex.image=img
 m.node_tree.links.new(tex.outputs["Color"],bs.inputs["Base Color"])
 m.node_tree.links.new(tex.outputs["Alpha"],bs.inputs["Alpha"])
 m.use_backface_culling=False
 if hasattr(m,"surface_render_method"):m.surface_render_method="DITHERED"
 elif hasattr(m,"blend_method"):m.blend_method="HASHED"
 materials.append(m)
# Keep Bark015 actual normal and roughness, changing only painterly albedo.
image=bpy.data.images.load(str((args.textures/"bark015_stylized_albedo_candidate.png").resolve()))
image.pack()
for oldname in ("aged_bark","twigs"):
 old=bpy.data.materials.get(oldname)
 assert old is not None
 new=old.copy();new.name=oldname+"_PaintedReview"
 bs=new.node_tree.nodes.get("Principled BSDF")
 tex=new.node_tree.nodes.new("ShaderNodeTexImage");tex.image=image
 new.node_tree.links.new(tex.outputs["Color"],bs.inputs["Base Color"])
 for obj in bpy.data.objects:
  if obj.type!="MESH" or obj in leaves:continue
  for slot in obj.material_slots:
   if slot.material and slot.material.name==oldname:slot.material=new
# Preserve approved crown WIDTH: choose existing leaf centers across all
# radial shells rather than building a smaller synthetic canopy.
origin=(lower+upper)*.5
bins=[[] for _ in range(4)]
for pt in pts:
 radius=math.hypot(pt.x-origin.x,pt.y-origin.y)/max(span.x,span.y)*2
 bins[min(3,int(max(0,radius)*4))].append(pt)
chosen=[]
for group,quota in zip(bins,(80,115,155,185)):
 rng.shuffle(group)
 chosen+=group[:quota]
assert len(chosen)>=400
cards=[]
for i,pt in enumerate(chosen):
 w=.32+.17*rng.random()
 h=.32+.13*rng.random()
 angle=rng.uniform(0,math.tau)
 right=Vector((math.cos(angle),math.sin(angle),0))
 front=Vector((-right.y,right.x,0))
 vertices=[];uvs=[]
 for row in range(3):
  v=row/2
  for col in range(3):
   u=col/2
   q=pt+right*(u-.5)*w+front*(v-.5)*h*.36
   q.z+=(v-.5)*h*.8+(.05 if col==1 else 0)
   vertices.append(tuple(q));uvs.append((u,v))
 faces=[]
 for y in range(2):
  for x in range(2):
   a=y*3+x;faces.append((a,a+1,a+4,a+3))
 mesh=bpy.data.meshes.new("F6_SprigMesh_%04d"%i)
 mesh.from_pydata(vertices,[],faces);mesh.update()
 mesh.materials.append(materials[(i*7+(i//5))%6])
 uv=mesh.uv_layers.new(name="LeafUV")
 for face in mesh.polygons:
  face.use_smooth=True
  for loop in face.loop_indices:
   uv.data[loop].uv=uvs[mesh.loops[loop].vertex_index]
 ob=bpy.data.objects.new("F6_PaintedSprig_%04d"%i,mesh)
 bpy.context.collection.objects.link(ob)
 cards.append(ob)
vpts=[v.co for ob in cards for v in ob.data.vertices]
min2=Vector(tuple(min(v[j] for v in vpts) for j in range(3)))
max2=Vector(tuple(max(v[j] for v in vpts) for j in range(3)))
assert max2.x-min2.x>=span.x*.78
assert max2.y-min2.y>=span.y*.78
sc=bpy.context.scene
engines=[item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
sc.render.engine="BLENDER_EEVEE" if "BLENDER_EEVEE" in engines else "BLENDER_EEVEE_NEXT"
sc.render.resolution_x=1000;sc.render.resolution_y=840
sc.render.image_settings.file_format="PNG"
if sc.world is None:sc.world=bpy.data.worlds.new("F6_FoliageWorld")
sc.world.use_nodes=True
sc.world.node_tree.nodes["Background"].inputs["Strength"].default_value=.75
dat=bpy.data.lights.new("F6_soft_key","AREA");dat.energy=1300;dat.size=5
lamp=bpy.data.objects.new("F6_soft_key",dat);bpy.context.collection.objects.link(lamp)
lamp.location=(0,-4,7)
lamp.rotation_euler=(origin-lamp.location).to_track_quat("-Z","Y").to_euler()
files=[]
for name,direction in (("front",(0,-7,1)),("side",(7,0,1)),("angle",(6,-6,2)),("top",(0,-.01,10))):
 cam=bpy.data.cameras.new("F6_Camera_"+name)
 cam.type="ORTHO";cam.ortho_scale=max(span.x,span.y)*1.55
 obj=bpy.data.objects.new(cam.name,cam);bpy.context.collection.objects.link(obj)
 obj.location=origin+Vector(direction)
 obj.rotation_euler=(origin-obj.location).to_track_quat("-Z","Y").to_euler()
 sc.camera=obj
 f=args.output/(name+".png");sc.render.filepath=str(f.resolve())
 bpy.ops.render.render(write_still=True);files.append(f)
blend=args.output/"F6_painted_bunch_NOT_APPROVED.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()));files.append(blend)
bpy.ops.object.select_all(action="DESELECT")
for ob in cards:ob.select_set(True)
for ob in bpy.data.objects:
 if ob.type=="MESH" and not ob.hide_render:ob.select_set(True)
bpy.context.view_layer.objects.active=cards[0]
glb=args.output/"F6_painted_bunch_NOT_APPROVED.glb"
bpy.ops.export_scene.gltf(filepath=str(glb.resolve()),export_format="GLB",use_selection=True)
files.append(glb)
report={"status":"NOT_APPROVED","source_glb_sha256":hashlib.sha256(args.source.read_bytes()).hexdigest(),
 "preserved_hidden_source_leaves":len(leaves),"painted_leaf_cards":len(cards),
 "v25_leaf_center_span":list(span),"review_leaf_card_span":list(max2-min2),
 "blender":bpy.app.version_string,"files":[{"name":f.name,"sha256":hashlib.sha256(f.read_bytes()).hexdigest(),"size":f.stat().st_size} for f in files]}
(args.output/"manifest.json").write_text(json.dumps(report,indent=2,ensure_ascii=False))
print("F6_PAINTED_BUNCH_RENDER_DONE",len(cards),len(leaves))
