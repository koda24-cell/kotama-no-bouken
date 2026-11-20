"""B2 single waterwheel footing stone, independently modeled; NOT_APPROVED."""
import bpy, math, json, hashlib, struct, sys, random
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
out=Path(args[0] if args else "render-output/b2-stone-footing-v04").resolve()
out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
random.seed(20261120)
# 12 corners instead of a perfect rectangular block; three level layers.
outline=[(-.355,-.295),(-.295,-.350),(-.095,-.358),(.18,-.344),(.351,-.286),(.374,-.08),
         (.355,.18),(.281,.328),(.065,.354),(-.205,.33),(-.361,.244),(-.369,-.045)]
rings=[(-.38,1.0),(-.28,.965),(-.14,.91),(-.007,.80)]
verts=[];faces=[];count=len(outline)
for k,(z,scale) in enumerate(rings):
    for j,(x,y) in enumerate(outline):
        wobble=1.0+.026*math.sin(j*3.9+k*.85)+.018*math.cos(j*5.3-k*2.2)
        zz=z+(.006*math.sin(j*2.9+k*1.1) if k!=3 else .008*math.sin(j*2.1))
        verts.append((x*scale*wobble*(.91 if (j in (1,7) and k>=2) else 1.0),y*scale*wobble*(.94 if (j in (4,10) and k>=1) else 1.0),zz))
for k in range(len(rings)-1):
    for j in range(count):
        a=k*count+j;b=k*count+(j+1)%count
        c=(k+1)*count+(j+1)%count;d=(k+1)*count+j
        faces.append((a,b,c,d))
faces.extend([tuple(reversed(range(count))),tuple((len(rings)-1)*count+j for j in range(count))])
mesh=bpy.data.meshes.new("irregular_stone_base_mesh")
mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new("B2_SINGLE_WATERWHEEL_FOUNDATION_STONE_V04",mesh)
bpy.context.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True)
# shallow rectangular seating impression on the TOP of the stone only.
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.024))
cut=bpy.context.object;cut.name="TEMP_seat_cut";cut.dimensions=(.400,.392,.079)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
bpy.context.view_layer.objects.active=obj
m=obj.modifiers.new("indented_timbersill_seat","BOOLEAN");m.operation="DIFFERENCE";m.object=cut
bpy.ops.object.modifier_apply(modifier=m.name)
bpy.data.objects.remove(cut,do_unlink=True)
# No spherical Boolean dimples: damage is carved into the perimeter silhouette.
# The upper and middle vertex rings are pulled inward at asymmetrical corners.
# Natural break silhouettes are preserved by an unmodified base contour.
bev=obj.modifiers.new("rounded_eroded_stone_edges","BEVEL");bev.width=.008;bev.segments=2
bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=bev.name)
# Geological breakup: preserve original footing and shallow seating while adding
# asymmetrical chipped planes (not spherical dents) and sub-centimetre relief.
# A sharp irregular six-vertex wedge cuts into ONE exterior corner, ending below
# the central timber seating. Matching opposite-side loss is smaller.
def wedge(name,center,shape):
    x,y,z=center; sx,sy,sz=shape
    p=[(x-sx,y-sy,z-sz),(x+sx*.8,y-sy*.72,z-sz*.7),
       (x+sx,y+sy*.6,z-sz*.3),(x-sx*.6,y+sy,z-sz*.8),
       (x-sx*.8,y-sy*.8,z+sz),(x+sx*.55,y-sy*.35,z+sz*.7),
       (x+sx*.65,y+sy*.35,z+sz*.85),(x-sx*.55,y+sy*.65,z+sz*.65)]
    idx=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    meshcut=bpy.data.meshes.new(name+"_geometry");meshcut.from_pydata(p,[],idx);meshcut.update()
    cutter=bpy.data.objects.new(name,meshcut);bpy.context.collection.objects.link(cutter)
    bpy.context.view_layer.objects.active=obj
    mod=obj.modifiers.new(name+"_subtract","BOOLEAN");mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
wedge("large_fractured_front_corner",(-.36,-.30,-.102),(.105,.125,.168))
wedge("small_layered_back_corner",(.340,.318,-.235),(.075,.095,.092))
# Small-scale irregular surface displacement on exterior ONLY (protect seat).
sub=obj.modifiers.new("facet_detail","SUBSURF");sub.subdivision_type='SIMPLE';sub.levels=2
bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=sub.name)
from mathutils.noise import noise_vector
for vert in obj.data.vertices:
    p=vert.co
    outer=(abs(p.x)>.224 or abs(p.y)>.221)
    if outer and p.z<-.018:
        n=noise_vector(Vector((p.x*13.7,p.y*11.2,p.z*17.5)))
        relief=.0035*(.65*n.x+.35*n.y)+.0025*math.sin(p.z*61+p.x*19)*math.sin(p.y*27)
        # layered erosion is emphasized between -0.24 and -0.10 m
        layer=.004*math.sin(p.z*76+.3*math.sin(p.x*19+p.y*11))
        if abs(p.x)>abs(p.y):p.x+=math.copysign(relief+layer,p.x)
        else:p.y+=math.copysign(relief+layer,p.y)
obj.data.update()

# UV map after final Boolean; no tangled UV inheritance.
bpy.ops.object.select_all(action="DESELECT");obj.select_set(True);bpy.context.view_layer.objects.active=obj
bpy.ops.object.mode_set(mode="EDIT");bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(island_margin=.015)
bpy.ops.object.mode_set(mode="OBJECT")
# Original generated image textures, no third-party texture downloads.
size=512;albedo=[];rough=[];height=[]
for iy in range(size):
    v=iy/(size-1)
    for ix in range(size):
        u=ix/(size-1)
        low=.72*math.sin(u*8.6+v*3.1)+.48*math.cos(v*11.3-u*4.2)
        weather=.6*math.sin(u*21.4+v*15.2+.7*math.sin(v*7))+.25*math.cos(u*33-v*26)
        # Stable grain is stochastic, removing the repeated moire/checker regularity of V02.
        grain=(random.random()-.5)*.105
        damp=.11*max(0,math.sin(v*6.7+u*3.8))
        lum=max(.12,min(.52,.29+.058*low+.047*weather+grain-.24*damp))
        albedo.extend((lum*.90,lum*.94,lum*1.00,1.))
        r=max(.73,min(.98,.84+.045*weather+.025*low+.025*grain))
        rough.extend((r,r,r,1.))
        h=max(.1,min(.9,.47+.13*low+.18*weather+.8*grain))
        height.extend((h,h,h,1.))
def saveimage(name,values,noncolor=False):
    im=bpy.data.images.new(name,width=size,height=size,alpha=True)
    im.pixels[:]=values
    im.file_format="PNG";im.filepath_raw=str(out/(name+".png"));im.save()
    if noncolor:im.colorspace_settings.name="Non-Color"
    return im
color=saveimage("b2_waterwheel_footing_stone_albedo_v04",albedo)
roughness=saveimage("b2_waterwheel_footing_stone_roughness_v04",rough,True)
heightimage=saveimage("b2_waterwheel_footing_stone_height_v04",height,True)
material=bpy.data.materials.new("B2_dark_weathered_stone_PBR");material.use_nodes=True
nodes=material.node_tree.nodes;links=material.node_tree.links
pbr=nodes.get("Principled BSDF")
a=nodes.new("ShaderNodeTexImage");a.image=color;links.new(a.outputs["Color"],pbr.inputs["Base Color"])
r=nodes.new("ShaderNodeTexImage");r.image=roughness;links.new(r.outputs["Color"],pbr.inputs["Roughness"])
heighttex=nodes.new("ShaderNodeTexImage");heighttex.image=heightimage
bump=nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.27;bump.inputs["Distance"].default_value=.012
links.new(heighttex.outputs["Color"],bump.inputs["Height"]);links.new(bump.outputs["Normal"],pbr.inputs["Normal"])
obj.data.materials.clear()
obj.data.materials.append(material)
obj.active_material=material
for face in obj.data.polygons:face.material_index=0
output=nodes.get("Material Output")
if output is None:output=nodes.new("ShaderNodeOutputMaterial")
if not any(link.to_node==output and link.to_socket.name=="Surface" for link in links):
    links.new(pbr.outputs["BSDF"],output.inputs["Surface"])
assert obj.active_material==material
print("B2_FOOTING_V04_SOURCE_MATERIAL",obj.active_material.name,flush=True)
# Review floor never exported
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.43))
stage=bpy.context.object;stage.name="REVIEW_STAGE_ONLY";stage.scale=(2.6,2.6,.08)
stage_mat=bpy.data.materials.new("stage_neutral_gray");stage_mat.use_nodes=True
stage_mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value=(.16,.17,.19,1)
stage.data.materials.append(stage_mat)
def look(o,t):o.rotation_euler=(Vector(t)-o.location).to_track_quat("-Z","Y").to_euler()
for pos,power,diam in [((2,-3,4),600,3),((-3,2,2),350,2.5)]:
    data=bpy.data.lights.new("softbox","AREA");data.energy=power;data.shape="DISK";data.size=diam
    lamp=bpy.data.objects.new("softbox",data);bpy.context.collection.objects.link(lamp)
    lamp.location=pos;look(lamp,(0,0,-.17))
cam=bpy.data.cameras.new("review_cam");camera=bpy.data.objects.new("review_cam",cam)
bpy.context.collection.objects.link(camera);bpy.context.scene.camera=camera
cam.type="ORTHO";cam.ortho_scale=1.35
sc=bpy.context.scene;sc.render.engine="CYCLES";sc.cycles.samples=24
sc.render.resolution_x=720;sc.render.resolution_y=720;sc.render.resolution_percentage=100
sc.render.image_settings.file_format="PNG";sc.world.color=(.27,.27,.27)
views={"front":(2,-3,1.3),"side":(3,1,1.2),"angle":(2.5,-2.9,2.5),"top":(0,-.01,4)}
for name,pos in views.items():
    camera.location=pos;look(camera,(0,0,-.20))
    sc.render.filepath=str(out/("b2_footing_v04_"+name+".png"))
    bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(stage,do_unlink=True)
for o in list(bpy.data.objects):
    if o.type in ("CAMERA","LIGHT"):bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action="DESELECT");obj.select_set(True);bpy.context.view_layer.objects.active=obj
glb=out/"b2_single_waterwheel_stone_footing_v04.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,export_materials="EXPORT")
bpy.ops.wm.save_as_mainfile(filepath=str(out/"b2_single_waterwheel_stone_footing_v04.blend"))
data=glb.read_bytes();jlen=struct.unpack_from("<I",data,12)[0];j=json.loads(data[20:20+jlen])
assert len(j.get("images",[]))>=3 and len(j.get("materials",[]))>=1, "PBR missing from exported GLB"
print("B2_FOOTING_V04_GLTF_PBR_VERIFIED",len(j["images"]),len(j["materials"]),flush=True)
files={}
for path in sorted(out.iterdir()):
    if path.is_file():
        b=path.read_bytes();files[path.name]={"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()}
manifest={"approval":"NOT_APPROVED","version":"V04","part":"one stone footing","views":list(views),"source":"original procedural geometry + procedural raster PBR","blender":"5.3","faces":len(obj.data.polygons),"vertices":len(obj.data.vertices),"embedded_images":len(j["images"]),"fit_to_existing_post":"NOT_TESTED","reference_look":"Poly Haven Rock Surface/Rock Face 03; ambientCG Rock063; tevy Granite Boulder/Stone Dais (geometry and texture created here)","art_review":"NOT_APPROVED","art_review":"NOT_APPROVED","changes":"remove spherical side holes and repetitive checker; irregular chipped silhouette","files":files}
(out/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print("B2_FOOTING_V04_RENDER_SUCCESS",len(obj.data.vertices),len(obj.data.polygons),flush=True)
