#!/usr/bin/env python3
"""Produce review-only LOD candidates from an existing rigid GLB, no source writes.

Blender -b -t 2 --python tools/3d-performance/build_rigid_lod_review.py -- --source path.glb --out render-output/...
For trees, thin branches, transparent foliage, particles, dynamic gameplay or skinned meshes,
use category-specific LOD tooling instead of automatic decimation.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import struct
import bpy
from mathutils import Vector

def args_after_dash():
    return sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []

parser = argparse.ArgumentParser()
parser.add_argument("--source", required=True)
parser.add_argument("--out", required=True)
parser.add_argument("--export-tangents", action="store_true", help="Keep explicit normal-map tangent frames in review GLBs")
parser.add_argument("--ratios", nargs=2, type=float, default=[0.55,0.25])
opt = parser.parse_args(args_after_dash())
src = Path(opt.source)
out = Path(opt.out)
out.mkdir(parents=True,exist_ok=True)
assert src.is_file() and src.suffix.lower()==".glb"
assert 0<opt.ratios[1]<opt.ratios[0]<1
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(src.resolve()))
source_objects=[o for o in bpy.context.scene.objects if o.type=="MESH"]
assert source_objects, "no mesh"
assert not any(o.type=="ARMATURE" for o in bpy.context.scene.objects), "skinned content unsupported"
# In Blender 5.x imported opaque materials may use DITHERED blend_method;
# trust original glTF material alphaMode instead of Blender's display mode.
with src.open("rb") as f:
    header=f.read(12)
    magic,version,total=struct.unpack("<4sII",header)
    assert magic==b"glTF" and version==2
    jsonlen,kind=struct.unpack("<I4s",f.read(8))
    assert kind==b"JSON"
    gltf_doc=json.loads(f.read(jsonlen))
assert all(m.get("alphaMode","OPAQUE")=="OPAQUE" for m in gltf_doc.get("materials",[])), "alpha foliage and glass must use specialized LOD"
assert not any(o.type=="MESH" and o.find_armature() for o in source_objects)
for o in source_objects:o.hide_render=False

# Fixed identical bounding box/cameras for every level.
corners=[]
for ob in source_objects:
    corners += [ob.matrix_world @ Vector(v) for v in ob.bound_box]
lo=Vector([min(p[k] for p in corners) for k in range(3)])
hi=Vector([max(p[k] for p in corners) for k in range(3)])
center=(hi+lo)*0.5
extent=hi-lo
scale=max(float(extent.x),float(extent.y),float(extent.z),0.2)
if scale>10000: raise RuntimeError("implausible geometry bounds")
scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE"
scene.render.resolution_x=512
scene.render.resolution_y=512
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="Standard"
scene.world.use_nodes=True
scene.world.node_tree.nodes["Background"].inputs["Color"].default_value=(.39,.42,.43,1)
for name,direction in [("key",(1,-1,2.4)),("fill",(-1,1,1.5))]:
    ld=bpy.data.lights.new(name,"AREA")
    ob=bpy.data.objects.new("REVIEW_"+name,ld)
    bpy.context.collection.objects.link(ob)
    ob.location=center+Vector(direction)*scale*1.7
    ld.energy=400
    ld.size=scale*1.5
cams={}
for name,direction in [("front",(0,-1,.45)),("side",(1,0,.45)),("angle",(.75,-1,.7)),("top",(0,-.001,1.0))]:
    d=Vector(direction).normalized()
    cam=bpy.data.cameras.new("review_cam_"+name)
    ob=bpy.data.objects.new("REVIEW_cam_"+name,cam)
    bpy.context.collection.objects.link(ob)
    ob.location=center+d*scale*3.5
    ob.rotation_euler=(center-ob.location).to_track_quat("-Z","Y").to_euler()
    cam.type="ORTHO"
    cam.ortho_scale=scale*1.9
    cams[name]=ob

def faces_count():
    # Triangle-equivalent geometry count, not final WebGL processed pixels.
    return sum(max(0,len(f.vertices)-2) for ob in source_objects for f in ob.data.polygons)

baseline_faces=faces_count()
assert baseline_faces>10, "trivial mesh"
data=[]
for level,ratio in [(0,1.0),(1,opt.ratios[0]),(2,opt.ratios[1])]:
    # Every variant is reimported from the ORIGINAL GLB. Do not stack decimation.
    if level:
        for obj in source_objects:
            bpy.data.objects.remove(obj,do_unlink=True)
        bpy.ops.import_scene.gltf(filepath=str(src.resolve()))
        source_objects=[o for o in bpy.context.scene.objects if o.type=="MESH" and not o.name.startswith("REVIEW_")]
        for ob in source_objects:
            tris=sum(max(0,len(f.vertices)-2) for f in ob.data.polygons)
            if tris>=80:
                bpy.ops.object.select_all(action="DESELECT")
                ob.select_set(True)
                bpy.context.view_layer.objects.active=ob
                mod=ob.modifiers.new("REVIEW_LOD_DECIMATE","DECIMATE")
                # Moss/surface coatings are silhouette and colour-critical.
                # Protect them from the destructive stone mesh reduction.
                material_names=[m.name.lower() for m in ob.data.materials if m]
                protected=any(("moss" in name or "foliage" in name or "leaf" in name)
                              for name in material_names)
                mod.ratio=max(ratio, .95 if level==1 else .85) if protected else ratio
                bpy.ops.object.modifier_apply(modifier=mod.name)
    count=faces_count()
    bpy.ops.object.select_all(action="DESELECT")
    for ob in source_objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=source_objects[0]
    glb=out/("lod%d_NOT_APPROVED.glb"%level)
    bpy.ops.export_scene.gltf(filepath=str(glb.resolve()),export_format="GLB",use_selection=True,export_tangents=opt.export_tangents)
    png=[]
    for view,cam in cams.items():
        scene.camera=cam
        file=out/("lod%d_%s.png"%(level,view))
        scene.render.filepath=str(file.resolve())
        bpy.ops.render.render(write_still=True)
        png.append(file)
    data.append({"lod":level,"target_ratio":ratio,"triangle_equivalent":count,
                 "mesh_objects":len(source_objects),"files":[{"name":p.name,"bytes":p.stat().st_size,"sha256":hashlib.sha256(p.read_bytes()).hexdigest()} for p in [glb]+png]})
assert data[0]["triangle_equivalent"] >= data[1]["triangle_equivalent"] >= data[2]["triangle_equivalent"]
manifest={"schema":"kotama-rigid-lod-review-v1","status":"NOT_APPROVED","source":str(src),"original_modified":False,
          "category":"rigid_opaque_only","comparison_cameras":["front","side","angle","top"],
          "original_triangle_equivalent":baseline_faces,"variants":data,
          "warning":"Not safe for foliage/glass/rigged meshes. Geometry LOD candidates are not visually approved and are not integrated into the game."}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print("RIGID_LOD_CANDIDATES_DONE",[(v["lod"],v["triangle_equivalent"]) for v in data])
