"""Static GLB candidate generation and same-camera roundtrip rendering."""
import bpy,sys,json,hashlib
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from advanced_surface import apply
from advanced_bake import bake_normal
from advanced_cracks import add_cracks
args=sys.argv[sys.argv.index("--")+1:]
source,out,mode,samples=args[:4]
if "--fault-test" in args[4:]:raise RuntimeError("CUDA error: out of memory (intentional recovery fixture)")
out=Path(out).resolve();out.mkdir(parents=True,exist_ok=False)
def load(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(Path(path).resolve()))
    return [o for o in bpy.context.scene.objects if o.type=="MESH"]
meshes=load(source)
if not meshes or any(o.animation_data or o.data.shape_keys or o.find_armature() for o in meshes):raise ValueError("static props only")
def fingerprint():
    return hashlib.sha256(repr([(o.name,[tuple(v.co) for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons],tuple(tuple(r) for r in o.matrix_world)) for o in meshes]).encode()).hexdigest()
before=fingerprint()
pts=[o.matrix_world@Vector(p) for o in meshes for p in o.bound_box]
lo=Vector([min(p[i] for p in pts) for i in range(3)]);hi=Vector([max(p[i] for p in pts) for i in range(3)])
center=(lo+hi)/2;size=(hi-lo).length
if size<=0:raise ValueError("empty bounds")
added=[];applied=[]
for o in meshes:
    if mode=="surface":
        if len(o.material_slots)==1 and o.data.uv_layers and o.material_slots[0].material and o.material_slots[0].material.use_nodes:
            apply(o,"surface");bake_normal(o,256);applied.append(o.name)
    elif mode=="material":apply(o,"material");applied.append(o.name)
    elif mode=="chips":added+=apply(o,"chips")
    elif mode=="cracks":
        for p in sorted(o.data.polygons,key=lambda p:p.area,reverse=True)[:20]:
            try:added+=add_cracks(o,p.index);break
            except ValueError:continue
    elif mode!="baseline":raise ValueError(mode)
assert fingerprint()==before
def render(folder):
    folder.mkdir()
    s=bpy.context.scene;s.render.engine="CYCLES";s.cycles.device="CPU";s.cycles.samples=int(samples);s.cycles.seed=42
    s.render.resolution_x=256;s.render.resolution_y=256;s.render.resolution_percentage=100;s.render.film_transparent=True
    s.render.image_settings.file_format="PNG";s.render.image_settings.color_mode="RGBA";s.render.image_settings.color_depth="8"
    bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type="ORTHO";cam.data.ortho_scale=size*1.25
    for direction,power in [((3,-4,5),100),((-3,2,4),65)]:
        bpy.ops.object.light_add(type="AREA",location=center+Vector(direction).normalized()*size*2)
        l=bpy.context.object;l.data.energy=power*size**2;l.data.size=size;l.rotation_euler=(center-l.location).to_track_quat("-Z","Y").to_euler()
    for name,direction in {"front":(0,-1,.1),"side":(1,0,.1),"back":(0,1,.1),"angle":(1,-1,.7)}.items():
        cam.location=center+Vector(direction).normalized()*size*3;cam.rotation_euler=(center-cam.location).to_track_quat("-Z","Y").to_euler()
        s.render.filepath=str(folder/(name+".png"));bpy.ops.render.render(write_still=True)
render(out/"before_export")
bpy.ops.wm.save_as_mainfile(filepath=str(out/"model.blend"))
bpy.ops.object.select_all(action="DESELECT")
for o in meshes+added:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/"model.glb"),export_format="GLB",use_selection=True)
load(out/"model.glb");render(out/"reimport")
(out/"geometry.json").write_text(json.dumps({"original_hash":before,"preserved":True,"added":len(added),"applied":applied,"approval":"NOT_APPROVED"}))
