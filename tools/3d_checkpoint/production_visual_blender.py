"""Isolated static-prop candidate worker; original mesh data remains unchanged."""
import bpy, sys, json, hashlib, math
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index("--")+1:]
source,out,mode,name=args
out=Path(out); out.mkdir(parents=True,exist_ok=False)
if source=="fixture":
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.mesh.primitive_cube_add()
    obj=bpy.context.object; obj.name=name
    mat=bpy.data.materials.new("Stone"); mat.use_nodes=True
    mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value=(.24,.31,.42,1)
    obj.data.materials.append(mat)
else:
    bpy.ops.wm.open_mainfile(filepath=str(Path(source).resolve()),load_ui=False)
    obj=bpy.data.objects[name]
assert obj.type=="MESH" and not obj.animation_data and not obj.data.shape_keys
def fingerprint(o):
    return hashlib.sha256(repr(([(tuple(v.co)) for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons],tuple(tuple(r) for r in o.matrix_world))).encode()).hexdigest()
before=fingerprint(obj)
if mode in ("bevel_small","bevel_medium"):
    m=obj.modifiers.new("Visual candidate bevel","BEVEL"); m.width=.035 if mode=="bevel_small" else .08; m.segments=3; m.limit_method="ANGLE"
elif mode=="normals":
    m=obj.modifiers.new("Visual candidate normals","WEIGHTED_NORMAL"); m.keep_sharp=True
elif mode=="roughness":
    for slot in obj.material_slots:
        if slot.material and slot.material.use_nodes:
            slot.material=slot.material.copy()
            for n in slot.material.node_tree.nodes:
                if n.type=="BSDF_PRINCIPLED" and not n.inputs["Roughness"].is_linked:
                    n.inputs["Roughness"].default_value=min(1,n.inputs["Roughness"].default_value+.15)
elif mode=="detail":
    # Explicit static-prop-only additive trim, kept as separate mesh.
    bpy.ops.mesh.primitive_cube_add(size=1,location=obj.matrix_world @ Vector((0,0,.98)))
    trim=bpy.context.object; trim.name="Visual candidate trim"; trim.scale=(.65,.65,.08)
    if obj.data.materials: trim.data.materials.append(obj.data.materials[0])
elif mode!="baseline": raise ValueError(mode)
assert fingerprint(obj)==before
s=bpy.context.scene
s.render.engine="CYCLES"; s.cycles.samples=8
s.render.resolution_x=192;s.render.resolution_y=192;s.render.resolution_percentage=100
s.render.film_transparent=True;s.render.image_settings.file_format="PNG";s.render.image_settings.color_mode="RGBA";s.render.image_settings.color_depth="8"
# Fixture or explicitly prepared static-prop scene, fixed camera and lighting across candidates.
for o in list(s.objects):
    if o.type in ("CAMERA","LIGHT"): bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.camera_add(); cam=bpy.context.object;s.camera=cam;cam.data.type="ORTHO";cam.data.ortho_scale=4.5
for loc,power in [((3,-4,5),700),((-3,2,4),450)]:
    bpy.ops.object.light_add(type="AREA",location=loc); light=bpy.context.object;light.data.energy=power;light.data.shape="DISK";light.data.size=4;light.rotation_euler=(-light.location).to_track_quat("-Z","Y").to_euler()
for view,loc in {"front":(0,-6,1),"side":(6,0,1),"back":(0,6,1),"angle":(4,-5,3)}.items():
    cam.location=loc;cam.rotation_euler=(-cam.location).to_track_quat("-Z","Y").to_euler()
    s.render.filepath=str((out/(view+".png")).resolve());bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str((out/"model.blend").resolve()))
bpy.ops.export_scene.gltf(filepath=str((out/"model.glb").resolve()),export_format="GLB")
(out/"geometry.json").write_text(json.dumps({"original_mesh_hash":before,"geometry_preserved":fingerprint(obj)==before,"mode":mode}))
