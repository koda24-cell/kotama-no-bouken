"""B2 single waterwheel footing stone, independently modeled; NOT_APPROVED."""
import bpy, math, json, hashlib, struct, sys, random
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
out=Path(args[0] if args else "render-output/b2-stone-footing-v07").resolve()
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
        verts.append((x*scale*wobble*(.77 if (j in (1,7) and k>=2) else 1.0),y*scale*wobble*(.83 if (j in (4,10) and k>=1) else 1.0),zz))
for k in range(len(rings)-1):
    for j in range(count):
        a=k*count+j;b=k*count+(j+1)%count
        c=(k+1)*count+(j+1)%count;d=(k+1)*count+j
        faces.append((a,b,c,d))
# Top socket is *explicitly meshed*, no Boolean / n-gon crossing the seat.
# 12-point irregular inset following the stone's original perimeter.
faces.append(tuple(reversed(range(count))))
outer_start=(len(rings)-1)*count
innerA=len(verts)
for j,(x,y) in enumerate(outline):
    rad=.55 + .024*math.sin(j*1.91)
    verts.append((x*rad,y*rad,-.012+.002*math.sin(j*1.67)))
innerB=len(verts)
for j,(x,y) in enumerate(outline):
    rad=.53+.025*math.sin(j*1.91)
    verts.append((x*rad,y*rad,-.031+.003*math.cos(j*1.34)))
for j in range(count):
    q=(j+1)%count
    faces.append((outer_start+j,outer_start+q,innerA+q,innerA+j))
    faces.append((innerA+j,innerA+q,innerB+q,innerB+j))
faces.append(tuple(innerB+j for j in range(count)))
mesh=bpy.data.meshes.new("fractured_stone_base_explicit_seat_mesh")
mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new("B2_SINGLE_WATERWHEEL_FOUNDATION_STONE_V07",mesh)
bpy.context.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True)
# Keep the original stone, sculpt rough edges through ring displacement.
# No round-ball, wedge Boolean or unchecked open cuts.
sub=obj.modifiers.new("stone_facets","SUBSURF");sub.subdivision_type='SIMPLE';sub.levels=2
bpy.ops.object.modifier_apply(modifier=sub.name)
from mathutils.noise import noise_vector
for vert in obj.data.vertices:
    p=vert.co
    outer=abs(p.x)>.225 or abs(p.y)>.218
    if outer and p.z<-.023:
        n=noise_vector(Vector((p.x*15.6,p.y*13.1,p.z*17.6)))
        relief=.004*n.x+.002*n.z+.002*math.sin(p.z*43+p.x*14)
        if p.x<-.2 and p.y<-.16 and p.z>-.25:
            relief-=.016*(.5+.5*math.sin(p.z*24+p.y*10))
        if abs(p.x)>abs(p.y):p.x+=math.copysign(relief,p.x)
        else:p.y+=math.copysign(relief,p.y)
obj.data.update()
bev=obj.modifiers.new("real_eroded_rock_edges","BEVEL")
bev.width=.004;bev.segments=2
bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=bev.name)

# V07 structural weathering: real variable-width crack grooves in the front and
# irregular spalled front-left corner. Existing V06 base/socket remain intact.
# Increase tessellation before local displacement; all deformation is limited to exterior.
detail=obj.modifiers.new("crack_detail_tessellation","SUBSURF")
detail.subdivision_type='SIMPLE';detail.levels=2
bpy.context.view_layer.objects.active=obj
bpy.ops.object.modifier_apply(modifier=detail.name)
def distance_segment(x,z,x0,z0,x1,z1):
    vx=x1-x0;vz=z1-z0
    t=max(0.0,min(1.0,((x-x0)*vx+(z-z0)*vz)/(vx*vx+vz*vz)))
    return math.hypot(x-(x0+t*vx),z-(z0+t*vz)),t
crack_a=[(-.31,-.058),(-.235,-.112),(-.17,-.150),(-.07,-.20),(.035,-.294)]
crack_b=[(-.18,-.14),(-.08,-.105),(.035,-.095)]
for vertex in obj.data.vertices:
    p=vertex.co
    # maintain central timber seat and horizontal bearing surfaces
    if p.y<-.25 and -.37<p.z<-.018:
        def cut_crack(points,base_width,depth):
            width=base_width*(.77+.28*math.sin(p.x*39+p.z*11))
            d=min(distance_segment(p.x,p.z,*points[i],*points[i+1])[0] for i in range(len(points)-1))
            return depth*max(0.0,1.0-(d/max(.001,width))**1.4)
        ind=cut_crack(crack_a,.014,.014)+cut_crack(crack_b,.009,.007)
        p.y+=min(.025,ind)
    # One visibly broken corner: stepped erosion, not a spherical hole
    if p.x<-.23 and p.y<-.23 and -.28<p.z<-.032:
        t=(p.z+.28)/.248
        cut=.014+(.013*math.sin(t*19+1.2))**2+.008*math.sin(t*41)
        cut=max(.003,cut)
        p.x+=cut
        p.y+=cut*.77
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
# Use a scanned, externally sourced CC0 photo map if available.
# The workflow downloads and scans it BEFORE opening with Blender.
from os import environ
photo_path=Path(environ.get("B2_STONE_PHOTO_PATH","/workspace/security/rock_surface_diff_1k.jpg"))
assert photo_path.exists() and photo_path.stat().st_size>10000, "Required CC0 reference photo missing"
color=bpy.data.images.load(str(photo_path),check_existing=True)
color.name="PolyHaven_Rock_Surface_CC0_diffuse_1k"
roughness=saveimage("b2_waterwheel_footing_stone_roughness_v07",rough,True)
heightimage=saveimage("b2_waterwheel_footing_stone_height_v07",height,True)
material=bpy.data.materials.new("B2_dark_weathered_stone_PBR");material.use_nodes=True
nodes=material.node_tree.nodes;links=material.node_tree.links
pbr=nodes.get("Principled BSDF")
a=nodes.new("ShaderNodeTexImage");a.image=color
a.extension='REPEAT'
desat=nodes.new("ShaderNodeHueSaturation")
desat.inputs["Saturation"].default_value=.43
desat.inputs["Value"].default_value=.87
links.new(a.outputs["Color"],desat.inputs["Color"])
links.new(desat.outputs["Color"],pbr.inputs["Base Color"])
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
print("B2_FOOTING_V07_SOURCE_MATERIAL",obj.active_material.name,flush=True)
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
    sc.render.filepath=str(out/("b2_footing_v07_"+name+".png"))
    bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(stage,do_unlink=True)
for o in list(bpy.data.objects):
    if o.type in ("CAMERA","LIGHT"):bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action="DESELECT");obj.select_set(True);bpy.context.view_layer.objects.active=obj
glb=out/"b2_single_waterwheel_stone_footing_v07.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,export_materials="EXPORT")
bpy.ops.wm.save_as_mainfile(filepath=str(out/"b2_single_waterwheel_stone_footing_v07.blend"))
data=glb.read_bytes();jlen=struct.unpack_from("<I",data,12)[0];j=json.loads(data[20:20+jlen])
assert len(j.get("images",[]))>=3 and len(j.get("materials",[]))>=1, "PBR missing from exported GLB"
print("B2_FOOTING_V07_GLTF_PBR_VERIFIED",len(j["images"]),len(j["materials"]),flush=True)
files={}
for path in sorted(out.iterdir()):
    if path.is_file():
        b=path.read_bytes();files[path.name]={"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()}
manifest={"approval":"NOT_APPROVED","version":"V07","part":"one stone footing","views":list(views),"source":"original procedural geometry; Poly Haven Rock Surface 1K CC0 photograph diffuse (downloaded and ClamAV scanned); generated roughness and height","blender":"5.3","faces":len(obj.data.polygons),"vertices":len(obj.data.vertices),"embedded_images":len(j["images"]),"fit_to_existing_post":"NOT_TESTED","geometric_seating":"12 edge loops with 19mm recess, no Boolean seat","reference_look":"Poly Haven Rock Surface/Rock Face 03; ambientCG Rock063; tevy Granite Boulder/Stone Dais (geometry and texture created here)","art_review":"NOT_APPROVED","art_review":"NOT_APPROVED","changes":"V07 retained CC0 Rock Surface and seat; added variable-width forked face crack and stepped broken corner","files":files}
(out/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print("B2_FOOTING_V07_RENDER_SUCCESS",len(obj.data.vertices),len(obj.data.polygons),flush=True)
