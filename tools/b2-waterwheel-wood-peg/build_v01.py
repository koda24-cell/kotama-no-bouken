"""Drawbore oak timber peg single asset for B2 waterwheel. NOT APPROVED."""
import bpy,math,hashlib,json,struct,sys,random
from mathutils import Vector
from pathlib import Path
args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
out=Path(args[0] if args else "render-output/b2-wood-peg-v01").resolve()
out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(20261120)
# 10-sided hand carved stock, longitudinal axis Y.
SECT=10
rings=[(0.0,.0315),(.016,.0305),(.028,.0279),(.068,.0277),(.127,.0260),(.161,.0234),(.189,.0200),(.205,.0174)]
verts=[];faces=[]
for k,(y,diam) in enumerate(rings):
    r=diam/2
    for j in range(SECT):
        angle=math.pi*2*j/SECT
        # Non-uniform hand-cut facets and wobbling material stock.
        off=1+.034*math.sin(j*2.15+k*.7)+.026*math.sin(j*4.2+k*1.41)
        if (j,k) in ((2,0),(3,1),(8,3),(5,6),(1,7)): off*=.89
        x=math.cos(angle)*r*off+.0011*math.sin(y*25)
        z=math.sin(angle)*r*off+.0008*math.cos(y*24)
        yy=y+.0005*math.sin(j*3.3+k*.8)
        verts.append((x,yy,z))
for k in range(len(rings)-1):
    for j in range(SECT):
        a=k*SECT+j;b=k*SECT+(j+1)%SECT
        faces.append((a,b,b+SECT,a+SECT))
faces.append(tuple(reversed(range(SECT))))
faces.append(tuple((len(rings)-1)*SECT+j for j in range(SECT)))
mesh=bpy.data.meshes.new('uneven_10_sided_pegged_oak');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new("B2_ONE_DRAWBORE_OAK_PEG_V01",mesh);bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
bev=obj.modifiers.new("light_tool_chamfer","BEVEL");bev.width=.00075;bev.segments=2
bpy.ops.object.modifier_apply(modifier=bev.name)
# UV: longitudinal fibers along Y axis, 10 angular sectors.
uv=obj.data.uv_layers.new(name="AlongGrain")
for poly in obj.data.polygons:
    for li in poly.loop_indices:
        co=obj.data.vertices[obj.data.loops[li].vertex_index].co
        if abs(poly.normal.y)>.9:
            uv.data[li].uv=((co.x+.018)/.036,(co.z+.018)/.036)
        else:
            angle=(math.atan2(co.z,co.x)+math.pi)/(2*math.pi)
            uv.data[li].uv=(angle,co.y/.205)
size=512
colors=[];roughs=[];tips=[]
for y in range(size):
    v=y/(size-1)
    for x in range(size):
        u=x/(size-1)
        grain=.53*math.sin(u*45+math.sin(v*8+u*5)*4)+.21*math.sin(u*131+v*19)+.12*math.sin(u*249-v*13)
        randomgrain=(rng.random()-.5)*.05
        dirt=.10*max(0,1-v/.17) if v<.17 else 0.
        check=.0
        for anchor,lo,hi in ((.19,.31,.78),(.74,.13,.48)):
            center=anchor+.013*math.sin(v*17+anchor*4)
            if lo<v<hi:check=max(check,max(0,1-abs(u-center)/(.003+.002*math.sin(v*13)**2)))
        lum=max(.05,min(.62,.27+.065*grain+randomgrain-dirt-.14*check))
        colors.extend((lum*.77,lum*.65,lum*.49,1))
        rr=max(.73,min(.99,.87+.05*grain+.045*check))
        roughs.extend((rr,rr,rr,1))
        dx=(u-.5)*2;dy=(v-.5)*2
        radial=math.hypot(dx*1.06,dy*.94)
        ring=math.sin(radial*49+math.sin(math.atan2(dy,dx)*5))
        end=max(.09,.34+.07*ring-.04*radial)
        tips.extend((end*.78,end*.61,end*.43,1))
def make_image(name,values,noncolor=False):
    img=bpy.data.images.new(name,width=size,height=size,alpha=True)
    img.pixels[:]=values;img.filepath_raw=str(out/(name+".png"));img.file_format='PNG';img.save()
    if noncolor:img.colorspace_settings.name='Non-Color'
    return img
color=make_image('b2_oak_drawbore_peg_albedo_v01',colors)
rough=make_image('b2_oak_drawbore_peg_roughness_v01',roughs,True)
tip=make_image('b2_oak_drawbore_peg_endgrain_v01',tips)
def material(name,albedo,roughness=None):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links
    shader=n.get('Principled BSDF');shader.inputs['Metallic'].default_value=0
    t=n.new('ShaderNodeTexImage');t.image=albedo;l.new(t.outputs['Color'],shader.inputs['Base Color'])
    if roughness:
        r=n.new('ShaderNodeTexImage');r.image=roughness
        l.new(r.outputs['Color'],shader.inputs['Roughness'])
    else:shader.inputs['Roughness'].default_value=.92
    return m
obj.data.materials.append(material('Peg_old_oak_PBR',color,rough))
obj.data.materials.append(material('Peg_endgrain_PBR',tip))
for poly in obj.data.polygons:poly.material_index=1 if abs(poly.normal.y)>.9 else 0
# 3-point studio lighting and neutral dark stage, excluded from output.
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.028))
floor=bpy.context.object;floor.name="STAGE_REVIEW_ONLY";floor.scale=(.38,.5,.02)
fm=bpy.data.materials.new("stage_dark_gray");fm.use_nodes=True
fm.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.075,.08,.092,1)
floor.data.materials.append(fm)
def track(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
for pos,power,diam in [((.4,-.2,.55),155,.45),((-.42,.25,.27),95,.36)]:
    d=bpy.data.lights.new('studio_key','AREA');d.energy=power;d.shape='DISK';d.size=diam
    light=bpy.data.objects.new('studio_key',d);bpy.context.collection.objects.link(light)
    light.location=pos;track(light,(0,.1,0))
cam=bpy.data.cameras.new('review_camera');camera=bpy.data.objects.new('review_camera',cam)
bpy.context.collection.objects.link(camera);bpy.context.scene.camera=camera;cam.type='ORTHO';cam.ortho_scale=.34
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=32;sc.render.resolution_x=720;sc.render.resolution_y=720
sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG'
views={'front':(.22,-.33,.19),'side':(.34,.14,.12),'angle':(.20,-.25,.34),'end':(0,-.40,.035)}
for name,pos in views.items():
    camera.location=pos;track(camera,(0,.102,0))
    sc.render.filepath=str(out/('b2_drawbore_peg_v01_'+name+'.png'))
    bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(floor,do_unlink=True)
for other in list(bpy.data.objects):
    if other.type in ('CAMERA','LIGHT'):bpy.data.objects.remove(other,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
glb=out/'b2_single_oak_drawbore_peg_v01.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_materials='EXPORT')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'b2_single_oak_drawbore_peg_v01.blend'))
data=glb.read_bytes();length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length])
assert len(doc.get('materials',[]))>=2 and len(doc.get('images',[]))>=3,'PBR images not embedded'
files={}
for p in out.iterdir():
    if p.is_file():
        data=p.read_bytes();files[p.name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
manifest={'approval':'NOT_APPROVED','name':'one wooden drawbore peg','dimensions_m':{'length':.205,'head_diameter':.032,'tip_diameter':.018},'embedded_images':len(doc['images']),'faces':len(obj.data.polygons),'vertices':len(obj.data.vertices),'fitted_to_frame':False,'files':files}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('B2_DRAWBORE_PEG_V01_RENDER_SUCCESS',len(obj.data.vertices),len(doc['images']),flush=True)
