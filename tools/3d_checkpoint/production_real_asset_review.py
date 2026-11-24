"""Real GLB review candidates; no automatic aesthetic approval."""
import bpy,sys,json,hashlib
from pathlib import Path
from mathutils import Vector
source,out,mode=sys.argv[sys.argv.index("--")+1:]
out=Path(out).resolve();out.mkdir(parents=True,exist_ok=False)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(source).resolve()))
meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
assert meshes and all(not o.data.shape_keys and not o.animation_data for o in meshes)
def fingerprint():
    return hashlib.sha256(repr([(o.name,[tuple(v.co) for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons],tuple(tuple(r) for r in o.matrix_world)) for o in meshes]).encode()).hexdigest()
before=fingerprint()
pts=[o.matrix_world @ Vector(p) for o in meshes for p in o.bound_box]
lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)));hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)))
center=(lo+hi)/2;size=(hi-lo).length
assert size>0
for o in meshes:
    if mode=="bevel":
        m=o.modifiers.new("Review bevel","BEVEL");m.width=max(o.dimensions)*.003;m.segments=2;m.limit_method="ANGLE"
    elif mode=="normals":
        m=o.modifiers.new("Review normals","WEIGHTED_NORMAL");m.keep_sharp=True
    elif mode=="roughness":
        for slot in o.material_slots:
            if slot.material and slot.material.use_nodes:
                slot.material=slot.material.copy()
                for n in slot.material.node_tree.nodes:
                    if n.type=="BSDF_PRINCIPLED" and not n.inputs["Roughness"].is_linked:
                        n.inputs["Roughness"].default_value=min(1,n.inputs["Roughness"].default_value+.1)
    elif mode!="baseline":raise ValueError(mode)
assert fingerprint()==before
s=bpy.context.scene;s.render.engine="CYCLES";s.cycles.samples=12
s.render.resolution_x=384;s.render.resolution_y=384;s.render.resolution_percentage=100
s.render.film_transparent=True;s.render.image_settings.file_format="PNG";s.render.image_settings.color_mode="RGBA"
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type="ORTHO";cam.data.ortho_scale=size*1.15
for direction,power in [((3,-4,5),100),((-3,2,4),65)]:
    bpy.ops.object.light_add(type="AREA",location=center+Vector(direction).normalized()*size*2)
    l=bpy.context.object;l.data.energy=power*size**2;l.data.size=size;l.rotation_euler=(center-l.location).to_track_quat("-Z","Y").to_euler()
for view,direction in {"front":(0,-1,.1),"side":(1,0,.1),"back":(0,1,.1),"angle":(1,-1,.7)}.items():
    cam.location=center+Vector(direction).normalized()*size*3;cam.rotation_euler=(center-cam.location).to_track_quat("-Z","Y").to_euler()
    s.render.filepath=str(out/(view+".png"));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/"model.blend"))
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/"model.glb"),export_format="GLB",use_selection=True)
(out/"geometry.json").write_text(json.dumps({"mesh_hash":before,"preserved":fingerprint()==before,"approval":"NOT_APPROVED"}))
