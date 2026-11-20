"""One separately modeled old oak support POST; NOT APPROVED. Blender 5.3."""
import bpy,math,json,hashlib,sys,struct,random
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
out=Path(args[0] if args else "render-output/b2-timber-post-v03").resolve()
out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
random.seed(251120)
# Eight-sided approximate square with broken corners. Horizontal span ~0.32m.
xy=[(-.135,-.160),(.105,-.168),(.158,-.126),(.170,.116),
    (.108,.158),(-.111,.152),(-.166,.106),(-.166,-.106)]
N=len(xy);steps=17
verts=[];faces=[]
for k in range(steps):
    t=k/(steps-1);z=-1.70+1.70*t
    bendx=.015*math.sin(t*math.pi*1.45)+.005*math.sin(t*9.0)
    bendy=.011*math.sin(t*7.2+.5)
    for j,(x,y) in enumerate(xy):
        chip=.0045*math.sin(j*5.7+k*1.9)+.002*math.sin(k*6.8+j*4.2)
        x2=x*(1+chip/.17)+bendx
        y2=y*(1+chip/.17)+bendy
        # upper end has one cutaway irregular corner
        if k>=steps-3 and j in (1,2):z2=z-.016*(t**5)
        else:z2=z+.002*math.sin(k*2.2+j*3.7)
        verts.append((x2,y2,z2))
for k in range(steps-1):
    for j in range(N):
        a=k*N+j;b=k*N+(j+1)%N;c=(k+1)*N+(j+1)%N;d=(k+1)*N+j
        faces.append((a,b,c,d))
faces += [tuple(reversed(tuple(range(N)))),tuple((steps-1)*N+j for j in range(N))]
mesh=bpy.data.meshes.new("Aged_rough_hewn_oak_post_mesh")
mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new("B2_WATERWHEEL_ONE_SUPPORT_POST_V03",mesh)
bpy.context.collection.objects.link(obj)
# Small bevel retains hard-hewn silhouette, no smoothing of long cuts
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
bevel=obj.modifiers.new("irregular_soft_fiber_edge","BEVEL")
bevel.width=.005;bevel.segments=2
bpy.ops.object.modifier_apply(modifier=bevel.name)
# Side UV: nearest angular sector + height, end faces get planar projection
uv=obj.data.uv_layers.new(name="OakGrain_UV")
for poly in obj.data.polygons:
    for li in poly.loop_indices:
        v=obj.data.vertices[obj.data.loops[li].vertex_index].co
        if abs(poly.normal.z)>.8:uv.data[li].uv=((v.x+.19)/.38,(v.y+.19)/.38)
        else:
            theta=(math.atan2(v.y,v.x)+math.pi)/(2*math.pi)
            uv.data[li].uv=(theta,(v.z+1.71)/1.72)
# Atlas images made in this build (no external downloads).
texsize=512
base=[];rough=[]
for iy in range(texsize):
    v=iy/(texsize-1)
    for ix in range(texsize):
        u=ix/(texsize-1)
        grain=math.sin(u*79+7*math.sin(v*5+u*9))*0.26+math.sin(u*213+v*17)*.11
        age=.25*math.sin(v*31+u*8)+.17*math.cos(u*41-v*23)
        knot=math.exp(-(((u-.66)/.09)**2+((v-.43)/.15)**2)*2.2)
        crack=abs(math.sin(u*117+v*8+math.sin(v*19)*4))
        # Three nonuniform aged checks in the original wood texture (not uniform black stripes)
        fissure=0.
        for origin,mid,lo,hi in [(.29,.18,.14,.86),(.76,.10,.32,.94),(.54,.06,.03,.37)]:
            path=origin+.023*math.sin(v*14+mid*11)+.011*math.sin(v*29+mid*17)
            width=(.0025+.005*abs(math.sin(v*23+mid*9)))
            if lo<v<hi:
                edge=abs(u-path)
                fissure=max(fissure, max(0,1-edge/width)*(0.55+0.45*math.sin(v*19)**2))
        dark=max(0,min(1,.44+.18*grain+.14*age-.32*knot-.10*(crack>.98)-.24*fissure))
        wet=.10*max(0,math.cos(v*12+u*9))*(1-v)
        r=max(.045,.19+dark*.36-wet)
        g=max(.040,.145+dark*.29-wet*.9)
        b=max(.035,.113+dark*.23+wet*.22)
        base.extend((r,g,b,1.0))
        p=max(.68,min(.99,.86+grain*.06+age*.06))
        rough.extend((p,p,p,1.0))
def image(name,pixels,noncolor=False):
    im=bpy.data.images.new(name,width=texsize,height=texsize,alpha=True)
    im.pixels[:]=pixels
    im.file_format="PNG";im.filepath_raw=str(out/(name+".png"));im.save()
    if noncolor: im.colorspace_settings.name="Non-Color"
    return im
albedo=image("b2_post_old_oak_albedo_v03",base)
roughmap=image("b2_post_old_oak_roughness_v03",rough,True)
mat=bpy.data.materials.new("B2_weathered_oak_wood_PBR");mat.use_nodes=True
node=mat.node_tree.nodes;link=mat.node_tree.links
bsdf=node.get("Principled BSDF")
bsdf.inputs["Metallic"].default_value=0
al=node.new("ShaderNodeTexImage");al.image=albedo;link.new(al.outputs["Color"],bsdf.inputs["Base Color"])
ro=node.new("ShaderNodeTexImage");ro.image=roughmap;link.new(ro.outputs["Color"],bsdf.inputs["Roughness"])
noise=node.new("ShaderNodeTexNoise");noise.inputs["Scale"].default_value=125
bump=node.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.14;bump.inputs["Distance"].default_value=.004
link.new(noise.outputs["Fac"],bump.inputs["Height"]);link.new(bump.outputs["Normal"],bsdf.inputs["Normal"])
obj.data.materials.append(mat)
# End grain individually segmented, no extra mesh
# Generate a distinct cut-face endgrain image with irregular annual rings,
# one faint radial crack and old water-darkened outer rim.
endpx=[]
for iy in range(texsize):
    v=iy/(texsize-1);y=(v-.5)*2
    for ix in range(texsize):
        u=ix/(texsize-1);x=(u-.5)*2
        angle=math.atan2(y,x)
        rad=math.hypot(x*1.06,y*.91)
        distort=rad+.045*math.sin(angle*5+rad*9)+.025*math.cos(angle*9-rad*6)
        ring=math.sin(distort*69+math.sin(angle*3)*.8)
        saw=math.sin(distort*147+math.cos(angle*7)*.7)*.05
        split=abs(math.sin(angle-1.8))<.014 and .18<rad<.88
        edge=max(0,(rad-.7)*.5)
        lum=.31+.105*ring+saw-edge-(.21 if split else 0)
        endpx.extend((max(.055,lum*.82),max(.038,lum*.62),max(.027,lum*.43),1.))
endimg=image("b2_post_aged_endgrain_v03",endpx)
endmat=bpy.data.materials.new("Oak_aged_cut_endgrain_PBR")
endmat.use_nodes=True
en=endmat.node_tree.nodes;el=endmat.node_tree.links
eb=en.get("Principled BSDF")
et=en.new("ShaderNodeTexImage");et.image=endimg;el.new(et.outputs["Color"],eb.inputs["Base Color"])
eb.inputs["Roughness"].default_value=.92
obj.data.materials.append(endmat)
for p in obj.data.polygons:
    p.material_index=1 if abs(p.normal.z)>.94 else 0
# Stage is review-only, excluded from export.
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-1.79))
stage=bpy.context.object;stage.name="REVIEW_FLOOR_ONLY"
stage.scale=(2.3,2.3,.08)
stage_mat=bpy.data.materials.new("neutral_gray_stage");stage_mat.use_nodes=True
stage_mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value=(.065,.07,.08,1)
stage.data.materials.append(stage_mat)
def look(ob,point):ob.rotation_euler=(Vector(point)-ob.location).to_track_quat("-Z","Y").to_euler()
for pos,power,size in [((2,-3,4),500,3),((-3,2,1.5),300,2.5),((1.4,3.0,1.0),240,2.5)]:
    l=bpy.data.lights.new("Softbox","AREA");l.energy=power;l.shape="DISK";l.size=size
    o=bpy.data.objects.new("Softbox",l);bpy.context.collection.objects.link(o);o.location=pos;look(o,(0,0,-.9))
cam=bpy.data.cameras.new("ReviewCamera");camera=bpy.data.objects.new("ReviewCamera",cam)
bpy.context.collection.objects.link(camera);bpy.context.scene.camera=camera
cam.type="ORTHO";cam.ortho_scale=2.25
sc=bpy.context.scene;sc.render.engine="CYCLES";sc.cycles.samples=24
sc.render.resolution_x=720;sc.render.resolution_y=720;sc.render.resolution_percentage=100
sc.render.image_settings.file_format="PNG";sc.world.color=(.3,.3,.3)
views={"front":(3,-4,1.2),"side":(4,2,.9),"angle":(3.1,-3.4,2.6),"top":(0,-.01,4)}
for name,pos in views.items():
    camera.location=pos;look(camera,(0,0,-.85))
    sc.render.filepath=str(out/("b2_single_support_post_v03_"+name+".png"))
    bpy.ops.render.render(write_still=True)
# Save only actual model and remove lights/ground.
bpy.data.objects.remove(stage,do_unlink=True)
for o in list(bpy.data.objects):
    if o.type in ("CAMERA","LIGHT"):bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action="DESELECT");obj.select_set(True);bpy.context.view_layer.objects.active=obj
glb=out/"b2_single_timber_support_post_v03.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,export_materials="EXPORT")
bpy.ops.wm.save_as_mainfile(filepath=str(out/"b2_single_timber_support_post_v03.blend"))
raw=glb.read_bytes();n=struct.unpack_from("<I",raw,12)[0]
gltf=json.loads(raw[20:20+n])
assert len(gltf.get("images",[]))>=3 and len(gltf.get("materials",[]))>=2
files={}
for p in sorted(out.iterdir()):
    if p.is_file():
        data=p.read_bytes()
        files[p.name]={"sha256":hashlib.sha256(data).hexdigest(),"bytes":len(data)}
manifest={"approval":"NOT_APPROVED","component":"single aged oak support post","render_views":list(views),"blender":"5.3","files":files,"mesh_vertices":len(obj.data.vertices),"mesh_faces":len(obj.data.polygons),"assembly_fit":"NOT_TESTED","pbr_embedded_images":len(gltf["images"]),"version":"V03","changes":"local cracked grain masks and rim light to avoid dead-black face; preserve V02 post shape"}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
print("B2_TIMBER_SUPPORT_POST_V03_RENDER_SUCCESS",len(obj.data.vertices),len(obj.data.polygons),flush=True)
