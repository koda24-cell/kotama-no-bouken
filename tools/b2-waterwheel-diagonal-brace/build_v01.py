"""One B2 waterwheel oak brace. Review-only geometry; Blender 5.3."""
import bpy,math,random,hashlib,json,struct,sys
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
out=Path(args[0] if args else "render-output/b2-diagonal-brace-v01").resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(20261120)
# Local axis Z length 1.15m; orientation of actual assembly deliberately left uncommitted.
L=1.15; N=8; R=21
outline=[(-.066,-.050),(.053,-.057),(.073,-.038),(.077,.035),(.055,.059),(-.057,.056),(-.076,.038),(-.077,-.031)]
verts=[];faces=[]
for k in range(R):
    t=k/(R-1);z=-L/2+L*t
    bendx=.007*math.sin(t*math.pi*1.35)+.0035*math.sin(t*9.1)
    bendy=.004*math.sin(t*7.7+.8)
    for j,(x,y) in enumerate(outline):
        w=1+.028*math.sin(j*3.2+k*.81)+.014*math.sin(j*7.9-k*1.71)
        zz=z+.0027*math.sin(j*2.7+k*.43)
        if k==0: zz+=.016*(x/.077)+.009*(y/.059)
        if k==R-1: zz-=.012*(x/.077)-.007*(y/.059)
        if j in (0,6) and k in (1,2,17,18):w-=.11
        verts.append((x*w+bendx,y*w+bendy,zz))
for k in range(R-1):
    for j in range(N):
        a=k*N+j;b=k*N+(j+1)%N
        faces.append((a,b,b+N,a+N))
faces.extend([tuple(reversed(range(N))),tuple((R-1)*N+j for j in range(N))])
mesh=bpy.data.meshes.new("Heavily_used_oak_beam_mesh");mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new("B2_SINGLE_DIAGONAL_OAK_BRACE_V01",mesh);bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
bev=obj.modifiers.new("soft_cut_edges","BEVEL");bev.width=.0035;bev.segments=2
bpy.ops.object.modifier_apply(modifier=bev.name)
uv=obj.data.uv_layers.new(name="WoodGrainUV")
for p in obj.data.polygons:
    for li in p.loop_indices:
        v=obj.data.vertices[obj.data.loops[li].vertex_index].co
        if abs(p.normal.z)>.85:uv.data[li].uv=((v.x+.09)/.18,(v.y+.08)/.16)
        else:uv.data[li].uv=((math.atan2(v.y,v.x)+math.pi)/(2*math.pi),(v.z+.6)/1.2)
size=512;colors=[];roughs=[];endpx=[]
for y in range(size):
    v=y/(size-1)
    for x in range(size):
        u=x/(size-1)
        wav=math.sin(u*90+math.sin(v*13+u*8)*5)
        fine=.11*math.cos(u*223+v*9)+.06*math.sin(u*411-v*37)
        knot=math.exp(-((u-.62)/.085)**2-((v-.32)/.13)**2)
        split=0
        for anchor,lo,hi in ((.21,.09,.79),(.69,.23,.89)):
            target=anchor+.018*math.sin(v*17+anchor*9)
            if lo<v<hi:split=max(split,max(0,1-abs(u-target)/(.003+.004*math.sin(v*17)**2)))
        wet=.12*max(0,1-v/.28) if v<.28 else 0.
        intensity=max(.04,min(.7,.27+.095*wav+fine-.10*knot-.13*split-wet))
        colors.extend((intensity*.77,intensity*.66,intensity*.52,1.))
        r=max(.75,min(.99,.89+.04*wav+.025*split))
        roughs.extend((r,r,r,1.))
        dx=(u-.5)*2;dy=(v-.5)*2
        radius=math.hypot(dx,dy)
        ring=math.sin(radius*55+1.2*math.sin(math.atan2(dy,dx)*7))
        e=max(.04,.31+.085*ring-.04*radius)
        endpx.extend((e*.79,e*.60,e*.42,1.))
def create_image(name,pix,noncolor=False):
    i=bpy.data.images.new(name,width=size,height=size,alpha=True);i.pixels[:]=pix
    i.file_format="PNG";i.filepath_raw=str(out/(name+".png"));i.save()
    if noncolor:i.colorspace_settings.name="Non-Color"
    return i
col=create_image("b2_brace_aged_oak_albedo_v01",colors)
rou=create_image("b2_brace_aged_oak_roughness_v01",roughs,True)
end=create_image("b2_brace_endgrain_v01",endpx)
def mat_with_image(name,image,roughness=None):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get("Principled BSDF")
    t=nodes.new("ShaderNodeTexImage");t.image=image;links.new(t.outputs["Color"],bsdf.inputs["Base Color"])
    bsdf.inputs["Metallic"].default_value=0
    if roughness:
        q=nodes.new("ShaderNodeTexImage");q.image=roughness
        links.new(q.outputs["Color"],bsdf.inputs["Roughness"])
    else:bsdf.inputs["Roughness"].default_value=.93
    return mat
side=mat_with_image("Weathered_oak_side_PBR",col,rou)
tip=mat_with_image("Endgrain_old_oak_PBR",end)
obj.data.materials.clear();obj.data.materials.append(side);obj.data.materials.append(tip)
for p in obj.data.polygons:p.material_index=1 if abs(p.normal.z)>.9 else 0
# Stage intentionally not exported
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.65))
floor=bpy.context.object;floor.name="RENDER_STAGE_NOT_ASSET";floor.scale=(2.5,2.5,.1)
stage=bpy.data.materials.new("dark_neutral_stage");stage.use_nodes=True
stage.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value=(.08,.09,.105,1)
floor.data.materials.append(stage)
def look(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat("-Z","Y").to_euler()
for pos,power,size in [((2,-3,3),520,2.5),((-3,2,1.5),280,2.2)]:
    l=bpy.data.lights.new("SoftBox","AREA");l.energy=power;l.shape="DISK";l.size=size
    o=bpy.data.objects.new("SoftBox",l);bpy.context.collection.objects.link(o);o.location=pos;look(o,(0,0,0))
cam=bpy.data.cameras.new("ReviewCamera");camera=bpy.data.objects.new("ReviewCamera",cam)
bpy.context.collection.objects.link(camera);bpy.context.scene.camera=camera;cam.type='ORTHO';cam.ortho_scale=1.65
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=24
sc.render.resolution_x=720;sc.render.resolution_y=720;sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG'
views={"front":(2,-3,1.2),"side":(3,2,.8),"angle":(2.6,-3,2.7),"top":(.2,0,4)}
for name,pos in views.items():
    camera.location=pos;look(camera,(0,0,0))
    sc.render.filepath=str(out/("b2_diagonal_brace_v01_"+name+".png"))
    bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(floor,do_unlink=True)
for o in list(bpy.data.objects):
    if o.type in ('LIGHT','CAMERA'):bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
glb=out/"b2_single_diagonal_oak_brace_v01.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_materials='EXPORT')
bpy.ops.wm.save_as_mainfile(filepath=str(out/"b2_single_diagonal_oak_brace_v01.blend"))
raw=glb.read_bytes();n=struct.unpack_from("<I",raw,12)[0];gltf=json.loads(raw[20:20+n])
assert len(gltf.get("images",[]))>=3 and len(gltf.get("materials",[]))>=2
files={}
for f in sorted(out.iterdir()):
    if f.is_file():
        data=f.read_bytes();files[f.name]={"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()}
report={"approval":"NOT_APPROVED","component":"single weathered oak diagonal brace","views":list(views),"images_embedded":len(gltf['images']),"materials":len(gltf['materials']),"vertices":len(obj.data.vertices),"faces":len(obj.data.polygons),"fit_to_support_post":"NOT_TESTED","files":files}
(out/"manifest.json").write_text(json.dumps(report,indent=2))
print("B2_DIAGONAL_BRACE_V01_RENDER_SUCCESS",len(obj.data.vertices),len(obj.data.polygons),flush=True)
