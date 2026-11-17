#!/usr/bin/env python3
"""Review-only 8-direction transparent whole-tree impostor frames from original Blend.

Does not copy or modify the input .blend. Trees remain high-detail in LOD0,
while these RGBA frames can serve as candidate far-view LOD2 only after
camera-dependent view selection and flicker/alpha testing in Three.js.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import bpy
from mathutils import Vector

def cli():
    return sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []

p=argparse.ArgumentParser()
p.add_argument("--out",required=True)
p.add_argument("--prefix",default="tree_mature_")
p.add_argument("--size",type=int,default=512)
p.add_argument("--directions",type=int,default=8)
args=p.parse_args(cli())
assert 4<=args.directions<=16 and 128<=args.size<=1024
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=="MESH" and o.name.startswith(args.prefix)]
assert len(meshes)>20,"source lacks expected tree geometry"
for o in scene.objects:
    if o.type=="MESH" and o not in meshes:
        o.hide_render=True
    if o.type=="EMPTY":
        pass
scene.render.engine="BLENDER_EEVEE"
scene.render.film_transparent=True
scene.render.resolution_x=args.size
scene.render.resolution_y=args.size
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGBA"
scene.view_settings.view_transform="Standard"

points=[]
for ob in meshes:
    points += [ob.matrix_world @ Vector(v) for v in ob.bound_box]
mini=Vector([min(x[i] for x in points) for i in range(3)])
maxi=Vector([max(x[i] for x in points) for i in range(3)])
span=maxi-mini
center=(maxi+mini)*0.5
max_extent=max(span.x,span.y,span.z,0.1)
cam_data=bpy.data.cameras.new("REVIEW_impostor_camera")
cam=bpy.data.objects.new("REVIEW_impostor_camera",cam_data)
bpy.context.collection.objects.link(cam)
cam_data.type="ORTHO"
cam_data.ortho_scale=max_extent*1.45
scene.camera=cam
frames=[]
for i in range(args.directions):
    yaw=math.tau*i/args.directions
    eye=center+Vector((math.sin(yaw),-math.cos(yaw),.27))*max_extent*3
    cam.location=eye
    cam.rotation_euler=(center-eye).to_track_quat("-Z","Y").to_euler()
    name="angle_%02d.png"%i
    filename=out/name
    scene.render.filepath=str(filename.resolve())
    bpy.ops.render.render(write_still=True)
    raw=filename.read_bytes()
    assert raw[:8]==b"\x89PNG\r\n\x1a\n"
    frames.append({"name":name,"yaw_degrees":round(i*360/args.directions,3),
                   "bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()})
manifest={
    "schema":"kotama-multiview-impostor-v1",
    "status":"NOT_APPROVED",
    "source_blend_modified":False,
    "orientation":"camera-facing texture selected by view yaw; atlas bake only",
    "frames":frames,
    "image_size_px":args.size,
    "bounds_m":[round(float(v),5) for v in span],
    "bounds_min_m":[round(float(v),5) for v in mini],
    "camera_ortho_scale_m":round(cam_data.ortho_scale,5),
    "limitations":"Transparent whole-tree 8-view atlas for distant sprites; no Three.js runtime LOD2, dynamic wind, occlusion, shadows, or camera interpolation implemented or verified.",
}
(out/"impostor_manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print("IMPOSTOR_FRAMES_DONE",len(frames))
