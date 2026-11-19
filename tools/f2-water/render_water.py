"""Floor 2 non-destructive water study, Blender background render.
Requires scan_manifest SCANNED_OK_NOT_APPROVED and verified river_small_rocks PBR file.
No third-party Blender addon or Python execution. Output is NOT_APPROVED.
"""
import bpy, json, math, random, os, pathlib, hashlib
from mathutils import Vector
root=pathlib.Path("out/f2-water")
manifest=json.loads((root/"scan_manifest.json").read_text())
assert manifest["status"]=="SCANNED_OK_NOT_APPROVED", "Malware gate not passed"
imgpath=root/"verified/river_small_rocks_diff_1k.jpg"
assert imgpath.exists()
assert hashlib.sha256(imgpath.read_bytes()).hexdigest()==manifest["sha256"]
random.seed(20261119)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.samples=32
bpy.context.view_layer.cycles.use_denoising=True
scene.render.resolution_x=960;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.world.color=(0.15,0.23,0.26)
scene.view_settings.view_transform="AgX"
def rgba(hexcode):
    h=hexcode.lstrip("#");return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))+(1,)
def mat(name,col,rough=.7,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=rgba(col);m.use_nodes=True
    n=m.node_tree.nodes.get("Principled BSDF");n.inputs["Base Color"].default_value=rgba(col)
    n.inputs["Roughness"].default_value=rough;n.inputs["Metallic"].default_value=metal
    return m
bed=mat("CC0 scanned riverbed texture","#786f5b")
bs=bed.node_tree.nodes.get("Principled BSDF")
image=bed.node_tree.nodes.new("ShaderNodeTexImage")
image.image=bpy.data.images.load(str(imgpath.resolve()))
image.interpolation="Linear"
bed.node_tree.links.new(image.outputs["Color"],bs.inputs["Base Color"])
bump=bed.node_tree.nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.16
bump.inputs["Distance"].default_value=.055
bed.node_tree.links.new(image.outputs["Color"],bump.inputs["Height"])
bed.node_tree.links.new(bump.outputs["Normal"],bs.inputs["Normal"])
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,0,-.45))
ground=bpy.context.object;ground.name="Riverbed_scanned_CC0"
ground.scale=(8,8,1);ground.data.materials.append(bed)
shore=mat("Damp wet bank","#554e42",.44)
pebble=[mat("Wet pebble gray","#595d57",.28),mat("Warm river stones","#81715e",.35),mat("Olive pebbles","#535745",.44)]
for i in range(450):
    x=random.uniform(-7.7,7.7);y=random.uniform(-7.7,7.7)
    # More detail at irregular shoreline, avoid tile / grid placement.
    shoreline=2.8+.34*math.sin(x*.7)+.18*math.cos(x*1.9)
    if y < shoreline and random.random()<.40:continue
    radius=random.uniform(.025,.16) if random.random()<.88 else random.uniform(.16,.43)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1 if radius<.16 else 2,radius=1,location=(x,y,-.43))
    o=bpy.context.object;o.name="Wet_river_pebble"
    o.scale=(radius*random.uniform(.7,1.5),radius*random.uniform(.7,1.2),radius*random.uniform(.35,.74))
    o.rotation_euler=(random.random()*.5,random.random()*.5,random.random()*math.pi)
    o.data.materials.append(random.choice(pebble))
for i in range(28):
    x=random.uniform(-7,7);y=random.uniform(2.6,7.5)
    r=random.uniform(.3,.95)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(x,y,-.25))
    o=bpy.context.object;o.name="Waterline_stone";o.scale=(r,r*.83,r*.47);o.data.materials.append(shore)
# Smooth moving water surface: nonregular frequencies intentionally avoid square-grid appearance
watermat=bpy.data.materials.new("WAVY-inspired translucent blue teal (not WAVY addon)")
watermat.use_nodes=True
p=watermat.node_tree.nodes.get("Principled BSDF")
p.inputs["Base Color"].default_value=(.045,.55,.60,1)
p.inputs["Roughness"].default_value=.065
p.inputs["IOR"].default_value=1.333
(p.inputs.get("Transmission Weight") or p.inputs.get("Transmission")).default_value=.87
(p.inputs.get("Coat Weight") or p.inputs.get("Clearcoat")).default_value=.25
(p.inputs.get("Coat Roughness") or p.inputs.get("Clearcoat Roughness")).default_value=.03
# Shape water to avoid hard straight shoreline, with randomised multifrequency normal from mesh.
verts=[];faces=[];N=95
for j in range(N+1):
    y=-7.9+15.8*j/N
    for i in range(N+1):
        x=-7.9+15.8*i/N
        z=.015*math.sin(1.7*x+1.2*y)+.009*math.sin(3.1*x-.7*y)+.007*math.cos(.52*x+2.9*y)
        verts.append((x,y,z))
for j in range(N):
    for i in range(N):
        a=j*(N+1)+i;faces.append((a,a+1,a+N+2,a+N+1))
mesh=bpy.data.meshes.new("non_uniform_waves");mesh.from_pydata(verts,[],faces);mesh.update()
water=bpy.data.objects.new("Clear_water_surface",mesh);bpy.context.collection.objects.link(water)
water.data.materials.append(watermat)
for pgn in water.data.polygons:pgn.use_smooth=True
# Local translucent foam around irregular bank using scattered thin white flakes
foam=mat("Soft_broken_white_foam","#c1e7df",.35)
for i in range(170):
    x=random.uniform(-7.2,7.2)
    y=2.8+.34*math.sin(x*.7)+.18*math.cos(x*1.9)+random.gauss(0,.18)
    radius=random.uniform(.016,.07)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=1,location=(x,y,.038))
    o=bpy.context.object;o.name="Foam_contact_fragment";o.scale=(radius*2.2,radius*.5,.003)
    o.data.materials.append(foam)
# luminous gobo-ish breaks: light for particulate sparkle, rather than a uniform lattice
for k in range(4):
    bpy.ops.object.light_add(type="AREA",location=((-4+k*2.8),-1,6))
    lamp=bpy.context.object;lamp.data.energy=340 if k==0 else 150
    lamp.data.shape="DISK";lamp.data.size=3 if k else 1.6
bpy.ops.object.light_add(type="SUN",location=(0,0,8))
sun=bpy.context.object;sun.data.energy=1.3;sun.rotation_euler=(.39,-.4,-.5)
# very subtle distance fog using actual volume scatter in a distant cube
fog=bpy.data.materials.new("Subtle distance mist VFX");fog.use_nodes=True
nodes=fog.node_tree.nodes;nodes.clear()
output=nodes.new("ShaderNodeOutputMaterial");volume=nodes.new("ShaderNodeVolumePrincipled")
volume.inputs["Color"].default_value=(.54,.76,.75,1)
volume.inputs["Density"].default_value=.004
fog.node_tree.links.new(volume.outputs["Volume"],output.inputs["Volume"])
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,5,2.5))
mist=bpy.context.object;mist.name="Distance_mist";mist.scale=(16,7,6);mist.data.materials.append(fog)
world=bpy.data.worlds.new("Cool cavern ambient");scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.22,.38,.45,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.7
def point_camera(loc,target):
    bpy.ops.object.camera_add(location=loc);cam=bpy.context.object
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat("-Z","Y").to_euler()
    cam.data.type="ORTHO";cam.data.ortho_scale=12.5
    scene.camera=cam
for name,pos in [("front",(0,-11,5.9)),("side",(11,-2,6)),("angle",(7,-11,8.4))]:
    point_camera(pos,(0,0,-.2));scene.render.filepath=str((root/(name+".png")).resolve())
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(scene.camera,do_unlink=True)
results={}
for n in ("front","side","angle"):
    f=root/(n+".png");assert f.stat().st_size>10000
    results[n]={"path":str(f),"sha256":hashlib.sha256(f.read_bytes()).hexdigest(),"size":f.stat().st_size}
(root/"render_manifest.json").write_text(json.dumps({"status":"NOT_APPROVED","render_engine":"Blender Cycles","images":results,"scan_source":manifest["sha256"]},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str((root/"f2-water-v1.blend").resolve()))
