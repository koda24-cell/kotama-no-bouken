"""Review-only V31: sprite foliage from original transparent PNG cards, plus CC0 bark.

Source V27 GLB and V25-derived crown extents stay intact. Hidden legacy
leaf meshes remain in the Blender scene, but are excluded from the review GLB.
"""
import bpy, json, hashlib, math, random, os
from pathlib import Path
from mathutils import Vector
from collections import defaultdict
ROOT=Path("render-output/floor6")
ATLAS=ROOT/"painted-spray-v31-source"
BARK=ROOT/"cc0-bark-source"
OUT=ROOT/"painted-foliage-v31-NOT-APPROVED"
OUT.mkdir(parents=True,exist_ok=True)
assert (ATLAS/"manifest.json").exists()
leaf_sources=json.loads((ATLAS/"manifest.json").read_text())
assert leaf_sources["status"]=="NOT_APPROVED" and len(leaf_sources["variants"])==6
bark_sources=json.loads((BARK/"source_manifest.json").read_text())
assert bark_sources["asset"]=="Bark015" and bark_sources["license"]=="CC0"
for e in leaf_sources["files"]:
    p=ATLAS/e["name"]
    assert hashlib.sha256(p.read_bytes()).hexdigest()==e["sha256"]
for kind,data in bark_sources["maps"].items():
    p=BARK/data["filename"]
    assert hashlib.sha256(p.read_bytes()).hexdigest()==data["sha256"]

source_glb=os.environ.get("F6_SOURCE_GLB")
assert source_glb and Path(source_glb).is_file()
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)  # clear Blender startup Cube/Camera/Light
bpy.ops.import_scene.gltf(filepath=str(Path(source_glb).resolve()))
scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE"
scene.render.resolution_x=760
scene.render.resolution_y=760
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.film_transparent=False
scene.view_settings.view_transform="Standard"
scene.render.image_settings.color_mode="RGBA"

legacy=[o for o in bpy.data.objects if o.type=="MESH" and
        (o.name.startswith("tree_mature_leaf_") or o.name.startswith("tree_mature_v25_canopy_"))]
assert len(legacy)>5000, "Missing inherited tree canopy"
wood=[o for o in bpy.data.objects if o.type=="MESH" and o not in legacy]
assert len(wood)>10, "Existing trunk/branch geometry not preserved"
def centroid(ob):
    return ob.matrix_world @ (sum((v.co for v in ob.data.vertices),Vector())/len(ob.data.vertices))
centers=[centroid(o) for o in legacy]
horizon=(min(v.x for v in centers),max(v.x for v in centers),min(v.y for v in centers),max(v.y for v in centers))
rng=random.Random(61929)

def image(path,noncolor=False):
    im=bpy.data.images.load(str(path.resolve()),check_existing=False)
    im.pack()
    if noncolor:im.colorspace_settings.name="Non-Color"
    return im
mats=[]
for idx,variant in enumerate(leaf_sources["variants"]):
    m=bpy.data.materials.new("V31_OriginalPaintedLeafSpray_"+variant)
    m.use_nodes=True
    nd=m.node_tree.nodes;lk=m.node_tree.links
    shader=nd.get("Principled BSDF")
    shader.inputs["Roughness"].default_value=.94
    shader.inputs["Metallic"].default_value=0
    if "Specular IOR Level" in shader.inputs:
        shader.inputs["Specular IOR Level"].default_value=.12
    tex=nd.new("ShaderNodeTexImage")
    tex.name="Original_F6_Painted_RGBA_Spray_"+variant
    tex.image=image(ATLAS/(variant+".png"))
    lk.new(tex.outputs["Color"],shader.inputs["Base Color"])
    lk.new(tex.outputs["Alpha"],shader.inputs["Alpha"])
    try:m.blend_method="CLIP"
    except (AttributeError,TypeError,ValueError):pass
    try:m.surface_render_method="DITHERED"
    except (AttributeError,TypeError,ValueError):pass
    m.use_backface_culling=False
    mats.append(m)
# Ground the real Bark015 albedo in muted tree color. PBR roughness/normal
# remain photo-derived rather than interpreting color as fake bump.
bark_col=image(BARK/"color.png")
bark_norm=image(BARK/"normal.png",True) if (BARK/"normal.png").exists() else None
bark_rough=image(BARK/"roughness.png",True) if (BARK/"roughness.png").exists() else None
bark=bpy.data.materials.new("V31_Bark015_CC0_DarkWeathered")
bark.use_nodes=True
ns=bark.node_tree.nodes;links=bark.node_tree.links
bs=ns.get("Principled BSDF")
bs.inputs["Roughness"].default_value=.9
col=ns.new("ShaderNodeTexImage");col.image=bark_col
multiply=ns.new("ShaderNodeMixRGB");multiply.blend_type="MULTIPLY"
multiply.inputs[0].default_value=.72
multiply.inputs[2].default_value=(.33,.35,.32,1)
links.new(col.outputs["Color"],multiply.inputs[1])
links.new(multiply.outputs["Color"],bs.inputs["Base Color"])
if bark_norm:
    nt=ns.new("ShaderNodeTexImage");nt.image=bark_norm
    nm=ns.new("ShaderNodeNormalMap");nm.inputs["Strength"].default_value=.58
    links.new(nt.outputs["Color"],nm.inputs["Color"])
    links.new(nm.outputs["Normal"],bs.inputs["Normal"])
if bark_rough:
    rt=ns.new("ShaderNodeTexImage");rt.image=bark_rough
    links.new(rt.outputs["Color"],bs.inputs["Roughness"])
# Store original material slots in the unmodified source checkpoint, not here.
for ob in wood:
    if ob.data.materials:
        for i in range(len(ob.data.materials)):ob.data.materials[i]=bark
    else:
        ob.data.materials.append(bark)

# First photograph legacy V27 at the SAME lighting and framing.
world=bpy.data.worlds.new("F6_PaintedTrial_StudioWorld")
world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.36,.41,.46,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.65
scene.world=world
def light(name,pos,energy,size):
    data=bpy.data.lights.new(name,"AREA");data.energy=energy;data.shape="DISK";data.size=size
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    obj.location=pos
    obj.rotation_euler=(Vector((0,0,2))-obj.location).to_track_quat("-Z","Y").to_euler()
light("F6 Soft Sun",(-4,-5,8),950,6)
light("F6 Soft Fill",(4,3,5),350,4)
def render(name,location,target=(0,0,2),scale=4.8):
    camdat=bpy.data.cameras.new(name);camdat.type="ORTHO";camdat.ortho_scale=scale
    cam=bpy.data.objects.new("F6_ReviewCamera_"+name,camdat)
    bpy.context.collection.objects.link(cam)
    cam.location=location
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat("-Z","Y").to_euler()
    scene.camera=cam
    scene.render.filepath=str((OUT/(name+".png")).resolve())
    bpy.ops.render.render(write_still=True)
    return OUT/(name+".png")
views={"front":(0,-6,3.2),"side":(6,0,3.2),"angle":(4,-6,4),"top":(0,-.1,8)}
files=[]
for name,pos in views.items():
    files.append(render("legacy_"+name,pos))
for o in legacy:o.hide_render=True
# Use leaf source positions as reference but replace noisy individual leaf
# meshes with ~300-600 coherent *sprays*; no extra outlying random particles.
bins=defaultdict(list)
cell=.27
for v in centers:
    key=(round(v.x/cell),round(v.y/cell),round((v.z-1.0)/cell))
    bins[key].append(v)
qualified=[(k,pts) for k,pts in bins.items() if len(pts)>=5]
qualified.sort(key=lambda kp:(kp[0][2],kp[0][0],kp[0][1]))
assert len(qualified)>=110, "Source tree lacks sufficient populated leaf groups"
created=[]
for idx,(key,group) in enumerate(qualified):
    base=sum(group,Vector())/len(group)
    group_radius=max((p-base).length for p in group)
    # Larger leaf-spray cards near the middle, smaller ones at outer edges.
    dist=math.hypot(base.x,base.y)
    width=(.60 if dist<.72 else .47) + min(.10,group_radius*.37)
    # Less low-hanging spherical density: retain the umbrella crown profile.
    if base.z<2.19: width*=.82
    height=width*(1.06+rng.random()*.22)
    copies=3 if len(group)>=14 and base.z>=2.10 else 2
    for k in range(copies):
        theta=rng.uniform(0,math.tau)
        right=Vector((math.cos(theta),math.sin(theta),rng.uniform(-.08,.08))).normalized()
        # V31: local canopy-dome card normals. V30 cards were vertical at
        # every height; from the top they became hair-thin radial needles.
        # Blend vertical underlayer cards to near-horizontal upper crown
        # surfaces, preserving the V25-approved x/y spread.
        dome=max(0,min(.95,(base.z-2.08)/.94))
        upright=Vector((-.04*math.sin(theta),.04*math.cos(theta),1))
        tangent=Vector((-math.sin(theta),math.cos(theta),.06))
        up=(upright*(1-dome)+tangent*dome).normalized()
        center=base+Vector((rng.uniform(-.045,.045),rng.uniform(-.045,.045),rng.uniform(-.035,.035)))
        verts=[];faces=[];uvcoords=[]
        for row in range(3):
            for col in range(3):
                u=col/2;v=row/2
                p=center+right*((u-.5)*width)+up*((v-.5)*height)
                # A broad, softly cupped 3D surface, not a flat billboard.
                normal=right.cross(up).normalized()
                p+=normal*(.021*math.sin(math.pi*u)*math.sin(math.pi*v))
                p.x=max(horizon[0]-.025,min(horizon[1]+.025,p.x))
                p.y=max(horizon[2]-.025,min(horizon[3]+.025,p.y))
                verts.append(tuple(p));uvcoords.append((u,v))
        for y in range(2):
            for x in range(2):
                a=y*3+x;b=a+1;c=a+3;d=c+1
                faces.append((a,b,d,c))
        mesh=bpy.data.meshes.new("V31_PaintedSprayMesh_%04d"%len(created))
        mesh.from_pydata(verts,[],faces);mesh.update()
        mat_idx=(idx+k*3+(key[0]+key[1])%3)%len(mats)
        mesh.materials.append(mats[mat_idx])
        uv=mesh.uv_layers.new(name="UVMap")
        for poly in mesh.polygons:
            for li in poly.loop_indices:
                uv.data[li].uv=uvcoords[mesh.loops[li].vertex_index]
            poly.use_smooth=True
        ob=bpy.data.objects.new("F6_V31_PaintedSpray_%04d"%len(created),mesh)
        bpy.context.collection.objects.link(ob);created.append(ob)
assert len(created)>=380

for name,pos in views.items():files.append(render("painted_"+name,pos))
files.append(render("painted_foliage_close",(1.85,-2.4,2.95),(.25,0,2.53),1.55))
files.append(render("painted_bark_close",(1.1,-2.3,1.1),(0,0,1.0),1.45))
# Export candidate only. Source leaf mesh remains in Blend but is hidden.
bpy.ops.object.select_all(action="DESELECT")
for ob in wood+created:ob.select_set(True)
bpy.context.view_layer.objects.active=created[0]
glb=OUT/"f6_mature_painted_sprays_v31_NOT_APPROVED.glb"
bpy.ops.export_scene.gltf(filepath=str(glb.resolve()),export_format="GLB",use_selection=True)
files.append(glb)
blend=OUT/"f6_mature_painted_sprays_v31_NOT_APPROVED.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()))
files.append(blend)
result={"status":"NOT_APPROVED","version":"V31","source":"V27 original GLB, inheriting approved V25 spread",
 "source_preserved_leaf_meshes":len(legacy),"source_wood_meshes":len(wood),
 "foliage_voxel_groups":len(qualified),"painted_spray_cards":len(created),
 "source_canopy_xy_extents":horizon,
 "bark_license":"CC0","bark_source_sha":bark_sources["archive_sha256"],
 "painted_sprays_sha":[x["sha256"] for x in leaf_sources["files"]],
 "files":[{"name":f.name,"bytes":f.stat().st_size,"sha256":hashlib.sha256(f.read_bytes()).hexdigest()} for f in files]}
(OUT/"manifest.json").write_text(json.dumps(result,indent=2)+"\n")
print("F6_V31_PAINTED_SPRAY_RENDER_SUCCESS",len(created),len(wood),len(legacy))
