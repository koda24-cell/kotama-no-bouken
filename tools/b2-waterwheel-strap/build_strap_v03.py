"""B2 one forged bearing strap, standalone review only, no game or source asset changes."""
import bpy, math, json, hashlib, sys, random
from pathlib import Path
from mathutils import Vector
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
out=Path(argv[0]) if argv else Path("render-output/b2-strap-v03")
out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
# Single forged U retaining strap, end tabs alongside timber. X = 80mm strip width.
# Along path Y/Z, deliberately varying radii and hand-worked edge irregularity.
outline=[(-.53,-.20),(-.525,-.105),(-.516,-.018),(-.510,.080),(-.483,.168),
         (-.437,.236),(-.365,.272),(-.260,.286),(-.13,.291),(0,.300),
         (.145,.292),(.275,.286),(.37,.265),(.450,.218),(.494,.154),
         (.516,.071),(.523,-.020),(.520,-.112),(.528,-.205)]
# subdivide with Catmull-Rom, maintaining non-uniform handmade appearance
def spline(points,k=6):
    result=[]
    for i in range(len(points)-1):
        p0=points[max(0,i-1)];p1=points[i];p2=points[i+1];p3=points[min(len(points)-1,i+2)]
        for j in range(k):
            t=j/k;t2=t*t;t3=t2*t
            result.append(tuple(.5*((2*p1[d])+(-p0[d]+p2[d])*t+
                (2*p0[d]-5*p1[d]+4*p2[d]-p3[d])*t2+
                (-p0[d]+3*p1[d]-3*p2[d]+p3[d])*t3) for d in (0,1)))
    result.append(points[-1]);return result
pathpts=spline(outline)
verts=[];faces=[];n=len(pathpts)
for i,(y,z) in enumerate(pathpts):
    bef=pathpts[max(i-1,0)];aft=pathpts[min(i+1,n-1)]
    dy=aft[0]-bef[0];dz=aft[1]-bef[1];l=math.hypot(dy,dz)
    ny=-dz/l;nz=dy/l
    d=0.010+0.0015*math.sin(1.7*i)+0.0005*math.sin(i*2.4)
    for j in range(4):
        x=(-.040 if j in (0,3) else .040) + .0012*math.sin(i*.77+j*2.1)
        sign=1 if j in (0,1) else -1
        verts.append((x,y+sign*ny*d/2,z+sign*nz*d/2))
for i in range(n-1):
    a=i*4;b=(i+1)*4
    faces.extend([(a,a+1,b+1,b),(a+1,a+2,b+2,b+1),
                  (a+2,a+3,b+3,b+2),(a+3,a,b,b+3)])
faces.extend([(3,2,1,0),((n-1)*4,(n-1)*4+1,(n-1)*4+2,(n-1)*4+3)])
mesh=bpy.data.meshes.new("Original_forged_iron_strap_mesh")
mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new("B2_SINGLE_FORGED_BEARING_STRAP_V03",mesh)
bpy.context.collection.objects.link(obj)
# True piercings only in terminal tabs, carved on strap geometry via applied booleans.
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
for j,(y,z) in enumerate([(-.53,-.145),(.525,-.145)]):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.018,depth=.20,location=(0,y,z))
    cutter=bpy.context.object
    cutter.name="TEMP_HOLE_CUTTER"
    cutter.rotation_euler[1]=math.pi/2 # through the X-width plane? strip normal in Y, so use Y-axis
    cutter.rotation_euler[1]=0
    cutter.rotation_euler[0]=math.pi/2
    bpy.context.view_layer.objects.active=obj
    mod=obj.modifiers.new("forged_tab_hole_"+str(j),"BOOLEAN")
    mod.operation='DIFFERENCE';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
# Rounded worn edges
bpy.context.view_layer.objects.active=obj
bev=obj.modifiers.new("soft_hand_worn_edges","BEVEL")
bev.width=.0023;bev.segments=2
bpy.ops.object.modifier_apply(modifier=bev.name)
for p in obj.data.polygons:p.use_smooth=True
mat=bpy.data.materials.new("Handforged_aged_iron_charcoal_rust")
mat.diffuse_color=(.105,.076,.060,1);mat.use_nodes=True
nodes=mat.node_tree.nodes;links=mat.node_tree.links
bsdf=nodes.get("Principled BSDF")
bsdf.inputs["Metallic"].default_value=.76
bsdf.inputs["Roughness"].default_value=.71
noise=nodes.new("ShaderNodeTexNoise");noise.inputs["Scale"].default_value=75
noise.inputs["Detail"].default_value=3;noise.inputs["Roughness"].default_value=.7
ramp=nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position=.30
ramp.color_ramp.elements[0].color=(.035,.038,.040,1)
ramp.color_ramp.elements[1].position=.73
ramp.color_ramp.elements[1].color=(.25,.105,.048,1)
links.new(noise.outputs["Fac"],ramp.inputs["Fac"])
links.new(ramp.outputs["Color"],bsdf.inputs["Base Color"])
bump=nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.15;bump.inputs["Distance"].default_value=.003
links.new(noise.outputs["Fac"],bump.inputs["Height"]);links.new(bump.outputs["Normal"],bsdf.inputs["Normal"])
# UV unwrap: strip width along X, accumulated arclength along YZ.
uv=obj.data.uv_layers.new(name="ForgedIron_UV")
lengths=[0.]
for k in range(1,n):
    a=pathpts[k-1];b=pathpts[k]
    lengths.append(lengths[-1]+math.hypot(b[0]-a[0],b[1]-a[1]))
for poly in obj.data.polygons:
    for li in poly.loop_indices:
        v=obj.data.vertices[obj.data.loops[li].vertex_index].co
        # Geometry is bevelled/booleaned: project to longitudinal nearest centerline.
        ii=min(range(n),key=lambda k:(pathpts[k][0]-v.y)**2+(pathpts[k][1]-v.z)**2)
        uv.data[li].uv=((v.x+.042)/.084,lengths[ii]/lengths[-1])
# A true raster texture image in the workflow, not just Noise plugged to Base Color.
# Deterministic aged-iron image with dark oxide, local rust pockets, small hammer scars.
from math import sin,cos
texsize=512
pixels=[]
for yy in range(texsize):
    v=yy/(texsize-1)
    for xx in range(texsize):
        u=xx/(texsize-1)
        rust=0.5+0.22*sin(u*18+v*13)+0.17*sin(u*46-v*39)+0.10*cos(u*93+v*78)
        grain=0.07*sin(u*301+v*171)*cos(u*139-v*277)
        pit=0.04*sin(u*510+v*190)*sin(v*475-u*97)
        t=max(0,min(1,(rust+grain-.51)*1.9))
        # mostly black charcoal metal; rust scattered, NOT evenly orange
        cold=(.055,.055,.058)
        oxide=(.23,.085,.038)
        c=[max(.016,min(.8,cold[i]*(1-t)+oxide[i]*t+pit)) for i in range(3)]
        pixels.extend((*c,1.))
img=bpy.data.images.new("B2_ForgedIron_Rust_Albedo_V03",width=texsize,height=texsize,alpha=True)
img.pixels[:]=pixels
img.filepath_raw=str(out/"b2_forged_iron_rust_albedo_v03.png")
img.file_format='PNG'
img.save()
tex=nodes.new("ShaderNodeTexImage")
tex.image=img
tex.interpolation='Linear'
tex.extension='REPEAT'
links.new(tex.outputs["Color"],bsdf.inputs["Base Color"])
# Avoid white metallic reflections; preserve surface variation via mild bump.
bsdf.inputs["Metallic"].default_value=.36
bsdf.inputs["Roughness"].default_value=.88
bump.inputs["Strength"].default_value=.11

obj.data.materials.clear()
obj.data.materials.append(mat)
obj.active_material=mat
for face in obj.data.polygons:
    face.material_index=0
outnode=nodes.get("Material Output")
if outnode is None:
    outnode=nodes.new("ShaderNodeOutputMaterial")
if not any(link.to_node == outnode and link.to_socket.name == "Surface" for link in links):
    links.new(bsdf.outputs["BSDF"],outnode.inputs["Surface"])
assert len(obj.data.materials)==1 and obj.data.materials[0]==mat
print("B2_V03_SOURCE_MATERIAL",obj.active_material.name,flush=True)
# Four-view neutral stage, actual Cycles photographic lighting
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.30))
floor=bpy.context.object;floor.name="RENDER_STAGE_ONLY";floor.scale=(2.5,2.5,.08)
fmat=bpy.data.materials.new("stage_dark_neutral")
fmat.diffuse_color=(.085,.09,.1,1)
fmat.use_nodes=True
fmat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value=(.085,.09,.1,1)
fmat.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value=1.0
floor.data.materials.append(fmat)
def aim(o,pt):o.rotation_euler=(Vector(pt)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power,size in [((2,-3,4),700,3),((-3,1,2),450,2)]:
    light=bpy.data.lights.new("softbox","AREA");light.energy=power;light.shape="DISK";light.size=size
    ob=bpy.data.objects.new("softbox",light);bpy.context.collection.objects.link(ob);ob.location=loc;aim(ob,(0,0,0))
camdata=bpy.data.cameras.new("Review_camera");camera=bpy.data.objects.new("Review_camera",camdata)
bpy.context.collection.objects.link(camera);bpy.context.scene.camera=camera
camera.data.type='ORTHO';camera.data.ortho_scale=1.7
scene=bpy.context.scene;scene.render.engine="CYCLES";scene.cycles.samples=24
scene.render.resolution_x=720;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.film_transparent=False
scene.world.color=(.30,.30,.30)
viewpoints={"front":(2.8,-3.4,1.3),"side":(3.8,0,.55),"angle":(2.8,3.1,2.6),"top":(0,-.05,4)}
for name,xyz in viewpoints.items():
    camera.location=xyz;aim(camera,(0,0,.02))
    scene.render.filepath=str(out/("b2_strap_v03_"+name+".png"))
    bpy.ops.render.render(write_still=True)
# Remove review-only geometry and emit actual single-part GLB
bpy.data.objects.remove(floor,do_unlink=True)
for o in list(bpy.data.objects):
    if o.type in ('LIGHT','CAMERA'):bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
bpy.ops.export_scene.gltf(filepath=str(out/"b2_single_forged_bearing_strap_v03.glb"),export_format="GLB",use_selection=True,export_materials='EXPORT')
bpy.ops.wm.save_as_mainfile(filepath=str(out/"b2_single_forged_bearing_strap_v03.blend"))
# Fail early if GLB lacks real PBR material or image texture.
import struct
blob=(out/"b2_single_forged_bearing_strap_v03.glb").read_bytes()
jsonlen=struct.unpack_from("<I",blob,12)[0]
gltf=json.loads(blob[20:20+jsonlen])
assert len(gltf.get("materials",[]))>=1, "GLB lacks material"
assert len(gltf.get("images",[]))>=1, "GLB lacks embedded texture"
print("B2_V03_EMBEDDED_PBR",len(gltf["materials"]),len(gltf["images"]),flush=True)
files={}
for p in sorted(out.iterdir()):
    if p.is_file():
        d=p.read_bytes()
        files[p.name]={"bytes":len(d),"sha256":hashlib.sha256(d).hexdigest()}
report={"approval":"NOT_APPROVED","blender_expected":"5.3","component":"one forged iron strap","mesh_vertices":len(obj.data.vertices),"mesh_polygons":len(obj.data.polygons),"renders":list(viewpoints),"albedo_image":"b2_forged_iron_rust_albedo_v03.png","files":files,"fit_validation":"NOT_TESTED","art_review":"NOT_REVIEWED"}
(out/"manifest.json").write_text(json.dumps(report,indent=2))
print("B2_STRAP_V03_RENDER_SUCCESS",len(obj.data.vertices),len(obj.data.polygons),flush=True)
