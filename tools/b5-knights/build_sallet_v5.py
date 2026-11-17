#!/usr/bin/env python3
"""B5 standalone sallet V3. Rebuilt curved shells; original V1/V2 preserved. NOT_APPROVED."""
import bpy, math, hashlib, json, os, random
from mathutils import Vector
from pathlib import Path
random.seed(5303)
D=Path("render-output/b5-knights/sallet_v5").resolve()
D.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
parts=[]
def material(name,col,rough=.89,metal=.08):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*col,1)
    p=m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value=(*col,1)
    p.inputs["Roughness"].default_value=rough
    p.inputs["Metallic"].default_value=metal
    return m
# Reference-inspired aged forged steel, not stone. Procedural original embedded PBR albedo,
# with spatially sparse corrosion. A sampled CC0 reference is cataloged but not redistributed.
def make_steel_texture():
    size=256
    pixels=[]
    for y in range(size):
        for x in range(size):
            u=x/size;v=y/size
            grain=math.sin(u*148.1+v*17.7)*math.sin(v*118.3-u*13.1)
            low=math.sin(u*29.3+v*31.7)*math.cos(v*36.4-u*24.9)
            pores=(math.sin(u*291.7+v*182.9)*math.sin(u*173.3-v*319.1))**6
            oxide=max(0.0,low*.5+grain*.19-.25)
            scratch=max(0,math.sin(u*17+v*420))**46*.015
            base=.31+low*.028+grain*.024-pores*.050-oxide*.16+scratch
            pixels.extend((base*.91,base*.96,base*1.035,1))
    im=bpy.data.images.new("salletV5_original_aged_steel_256",width=size,height=size,alpha=True)
    im.pixels[:]=pixels
    im.pack()
    return im
steel_image=make_steel_texture()
stone=material("B5 original patinated forged steel",(.34,.355,.39),.51,.72)
edge=material("B5 worn steel bevel",(.39,.40,.415),.40,.79)
dark=material("B5 deep visor slit recess",(.019,.024,.030),1.0,0)
seam=material("B5 oxidized pin heads",(.17,.15,.15),.70,.38)
for mat in (stone,):
    p=mat.node_tree.nodes.get("Principled BSDF")
    tex=mat.node_tree.nodes.new("ShaderNodeTexImage")
    tex.name="Baked original weathered-steel albedo";tex.image=steel_image
    mat.node_tree.links.new(tex.outputs["Color"],p.inputs["Base Color"])
def mesh(name,vertices,faces,mat=stone,smooth=True):
    dat=bpy.data.meshes.new(name);dat.from_pydata(vertices,[],faces);dat.update()
    obj=bpy.data.objects.new(name,dat);bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat);parts.append(obj)
    # UV: stable per-corner planar projection, packed original image stays inside GLB.
    uv=dat.uv_layers.new(name="steel UV")
    for poly in dat.polygons:
        poly.use_smooth=smooth
        for loopindex in poly.loop_indices:
            vertex=dat.vertices[dat.loops[loopindex].vertex_index].co
            uv.data[loopindex].uv=((vertex.x+.24)/.48,(vertex.z+.02)/.48)
    mod=obj.modifiers.new("edge softened bevel","BEVEL");mod.width=.0024;mod.segments=2
    mod2=obj.modifiers.new("corrected weighted normal","WEIGHTED_NORMAL")
    mod2.keep_sharp=True
    return obj
# Continuous crown: ellipsoid horizontal cross-sections with actual tapered cheeks and extended rear nape.
# +Y is forward, -Y back. Include lower-back sweep in same shell, not a floating wing.
N=96
sections=[
 (.090,.101,.177,-.063),(.126,.125,.197,-.052),
 (.176,.138,.189,-.028),(.228,.143,.177,-.017),
 (.278,.137,.161,-.018),(.326,.113,.139,-.022),
 (.367,.083,.108,-.024),(.392,.049,.067,-.022),(.410,.009,.018,-.018)]
v=[]
for j,(z,rx,ry,yc) in enumerate(sections):
    for i in range(N):
        a=2*math.pi*i/N
        x=rx*math.cos(a)
        y=yc+ry*math.sin(a)
        # lower face carved tighter, while the rear sweeps into a long integrated flange.
        if z<.18 and math.sin(a)>.20:
            x*=.92
        if z<.18 and math.sin(a)<-.35:
            y-=.047*(.18-z)/.09 * (-math.sin(a))
        # fine, low-frequency handmade irregularity, zero near crown peak
        distortion=.0022*math.sin(a*5+z*19)+.0010*math.sin(a*11+z*9)
        x+=distortion*math.cos(a)
        y+=distortion*math.sin(a)
        v.append((x,y,z))
f=[]
for j in range(len(sections)-1):
    for i in range(N):
        k=j*N+i; nxt=j*N+(i+1)%N
        # Sculpt out the lower forward skull before rebuilding the historically plausible visor and bevor.
        # Removes front-facing *new V4* shell polygons only; V1–V3 sources remain unchanged.
        az=2*math.pi*(i+.5)/N
        if j<4 and math.sin(az)>.51:
            continue
        f.append((k,nxt,nxt+N,k+N))
f.append(tuple((len(sections)-1)*N+i for i in range(N)))
mesh("01 monolithic curved cranium and seamless rear nape",v,f)
# Curved frontal mask as a continuous pair of subtle face plates.
# A genuine dark 0.018 gap between upper brow and lower face, no broad flat horizontal shelf.
def face_plate(name,rows,half_width,mat=stone):
    columns=48;vertices=[]
    for z0 in rows:
        for i in range(columns+1):
            t=2*i/columns-1
            x=half_width*t*(1-.12*abs(t))*(.70+.30*max(0,min(1,(z0-.11)/.11)) if z0<.22 else 1.0)
            z=z0 - .016*(1-t*t) if z0<.22 else z0+.008*(1-t*t)
            # Convex visor wraps toward temples rather than spanning the face as a flat bar.
            y=.092 + .087*math.sqrt(max(0.0,1.0-t*t)) - .008*abs(t)
            vertices.append((x,y,z))
    faces=[]
    for j in range(len(rows)-1):
        for i in range(columns):
            k=j*(columns+1)+i
            faces.append((k,k+1,k+columns+2,k+columns+1))
    obj=mesh(name,vertices,faces,mat)
    mod=obj.modifiers.new("thin shell not slab","SOLIDIFY");mod.thickness=.0055
    return obj
face_plate("02 curved upper brow visor thin arch",[.231,.243,.263,.274],.133)
face_plate("03 curved lower face visor shaped mask",[.117,.143,.171,.212],.130)
# Black recessed interior behind slit, slightly behind both thin shell lips.
face_plate("04 recessed narrow eye aperture darkness",[.213,.231],.113,dark)
# Neck bevor: rising tapered chin guard, separate articulated piece, no disconnected lip.
def bevor():
    W=64
    vertices=[]
    for z,rx,ry,yc in [(.066,.100,.103,.039),(.085,.112,.111,.039),(.112,.113,.114,.036),(.141,.106,.108,.035)]:
        for i in range(W):
            a=math.pi*i/(W-1)
            x=rx*math.cos(a)
            y=yc+ry*math.sin(a)
            zz=z-.009*(1-(x/rx)**2)
            vertices.append((x,y,zz))
    faces=[]
    for j in range(3):
        for i in range(W-1):
            k=j*W+i;faces.append((k,k+1,k+1+W,k+W))
    o=mesh("05 curved lower articulated bevor",vertices,faces)
    o.modifiers.new("thin bevor metal-stone thickness","SOLIDIFY").thickness=.006
bevor()
def bead(name,points,r,mat=edge):
    c=bpy.data.curves.new(name,"CURVE");c.dimensions="3D";c.bevel_depth=r;c.bevel_resolution=3
    sp=c.splines.new("POLY");sp.points.add(len(points)-1)
    for i,p in enumerate(points):sp.points[i].co=(*p,1)
    ob=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat);parts.append(ob)
# restrained stone seam follows skull contour rather than a straight antenna
bead("06 subtle ridge crown spine",[(0,.119,.315),(0,.10,.344),(0,.065,.375),(0,.015,.397),(0,-.06,.387),(0,-.125,.345)],.0016,edge)
for s in (-1,1):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=(s*.125,.013,.223))
    o=bpy.context.object;o.name="07 inset visor hinge "+str(s);o.scale=(.0055,.006,.0055)
    o.data.materials.append(seam);parts.append(o)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=(s*.095,-.125,.140))
    o=bpy.context.object;o.name="08 inset nape fastening "+str(s);o.scale=(.004,.004,.004)
    o.data.materials.append(seam);parts.append(o)
# Under cheek cuts small, restrained; do not add toy rivet patterns.
# A set of low-relief carved marks, each has depth near zero.
bead("09 subtle irregular fracture upper left",[(-.091,.073,.336),(-.074,.088,.321),(-.067,.103,.303),(-.053,.113,.295)],.00075,seam)
# Export only model parts and save editable checkpoint before studio staging.
bpy.ops.object.select_all(action="DESELECT")
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in parts if o.type=="MESH")
bpy.ops.export_scene.gltf(filepath=str(D/"sallet_v5.glb"),export_format="GLB",use_selection=True,export_materials="EXPORT")
bpy.ops.wm.save_as_mainfile(filepath=str(D/"sallet_v5.blend"))
for o in parts:o.select_set(False)
floor_mat=material("preview-only dark floor",(.08,.075,.092),1.0,0)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.023))
floor=bpy.context.object;floor.name="preview only ground";floor.dimensions=(1.8,1.8,.035)
floor.data.materials.append(floor_mat)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
world=bpy.context.scene.world or bpy.data.worlds.new("preview studio")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.16,.18,.23,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.55
for title,loc,power,size in [("key",(-1.0,1.6,1.8),44,1.4),("fill",(1.1,.5,1.6),28,1.3),("rim",(.7,-1.5,1.5),55,1.2)]:
    lamp=bpy.data.lights.new(title,"AREA");lamp.energy=power;lamp.shape="DISK";lamp.size=size
    obj=bpy.data.objects.new(title,lamp);bpy.context.collection.objects.link(obj)
    obj.location=loc;obj.rotation_euler=(Vector((0,0,.23))-obj.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object
camera.data.type="ORTHO";camera.data.ortho_scale=.64
scene=bpy.context.scene;scene.camera=camera
scene.render.engine="CYCLES";scene.cycles.samples=40
scene.cycles.use_denoising=False
for layer in scene.view_layers:
    if hasattr(layer,"cycles"):layer.cycles.use_denoising=False
scene.render.resolution_x=900;scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="Standard";scene.view_settings.exposure=0.0
for view,pos in [("front",(0,1.6,.48)),("side",(1.6,0,.46)),("angle",(1.3,1.35,.68)),("top",(0,.001,1.7))]:
    camera.location=pos;camera.rotation_euler=(Vector((0,0,.237))-camera.location).to_track_quat("-Z","Y").to_euler()
    scene.render.filepath=str(D/(view+".png"));bpy.ops.render.render(write_still=True)
hashes={}
for p in [D/"sallet_v5.glb",D/"sallet_v5.blend"]+[D/(name+".png") for name in ("front","side","angle","top")]:
    hashes[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
manifest={"approval":"NOT_APPROVED","source_sha":os.environ.get("GITHUB_SHA"),"run_id":os.environ.get("GITHUB_RUN_ID"),
"model":"B5 independent V5 actual curved visor with UV baked original worn steel color and physically based metal","game_integrated":False,
"views":["front","side","angle","top"],"component_count":len(parts),
"source":"tools/b5-knights/build_sallet_v5.py","previous_model_preserved":"sallet_v4","files_sha256":hashes,
"limitations":"Original packed metal color and numeric glTF metallic-roughness; no external photo downloaded; historical silhouette and artistic quality pending review."}
(D/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
(D/"progress.json").write_text(json.dumps({"iteration":5,"approval":"NOT_APPROVED","checkpoint":"sallet_v5.blend","next":"visual QA then separate V6 if needed"},indent=2),encoding="utf8")
print("B5_SALLET_V5_ACTUAL_RENDER_COMPLETE",len(parts),list(hashes))
