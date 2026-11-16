"""B4 V18 artisan ore cart — independent production candidate, V17 original preserved.
Blender coordinates X gauge, Y track length, Z vertical. GLB uses Y-up automatically.
Only Blender-authored CC0-independent procedural texture maps, no copied reference imagery.
"""
import bpy, math, random, os, sys, json, hashlib
import numpy as np
from mathutils import Vector
from math import pi
ARG=sys.argv[sys.argv.index('--')+1:]
OUT=os.path.abspath(ARG[0]); VAR=ARG[1] if len(ARG)>1 else 'a'
os.makedirs(OUT,exist_ok=True)
random.seed(23817)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
SC=bpy.context.scene
SC.render.engine='CYCLES'
SC.cycles.samples=44 if VAR=='c' else 36
SC.render.resolution_x=1100
SC.render.resolution_y=825
SC.render.resolution_percentage=100
SC.render.image_settings.file_format='PNG'
SC.render.film_transparent=False
SC.view_settings.view_transform='AgX'
SC.view_settings.look='AgX - Medium High Contrast'
WORLD=bpy.data.worlds.new('neutral-grey-studio')
SC.world=WORLD;WORLD.use_nodes=True
WORLD.node_tree.nodes['Background'].inputs['Color'].default_value=(.64,.65,.67,1)
WORLD.node_tree.nodes['Background'].inputs['Strength'].default_value=.70
MODEL=[]
def attach(o,name,material):
    o.name=name
    if material:o.data.materials.append(material)
    MODEL.append(o)
    return o

def write_image(name,a,colorspace):
    img=bpy.data.images.new(name,width=a.shape[1],height=a.shape[0],alpha=True)
    img.pixels.foreach_set(np.clip(a,0,1).astype(np.float32).ravel())
    img.filepath_raw=os.path.join(OUT,name+'.png')
    img.file_format='PNG'; img.save()
    img.colorspace_settings.name=colorspace
    return img

def pbr(name,kind,seed):
    rng=np.random.default_rng(seed)
    N=256
    x,y=np.meshgrid(np.arange(N)/N,np.arange(N)/N)
    noise=rng.normal(0,1,(N,N))
    if kind=='wood':
        wiggle=np.sin(2*pi*(y*27 + .045*np.sin(2*pi*x*3)+.020*np.sin(2*pi*y*4)))
        grain=.65*wiggle+.25*np.sin(2*pi*y*64)+.11*noise
        knot=np.exp(-((x-.31)**2/.003+(y-.58)**2/.018))
        uneven=.07*np.sin(2*pi*x*2)+.05*noise
        tone=np.clip(.51+.20*grain-.31*knot+uneven,0,1)
        col=np.stack([.235+.21*tone,.175+.16*tone,.135+.12*tone],axis=-1) if VAR=='c' else np.stack([.34+.31*tone,.22+.23*tone,.14+.16*tone],axis=-1)
        rgh=np.clip((.88 if VAR=='c' else .83)+.07*noise+.12*knot,0,1)
        h=grain*.45-knot*.75
        metal=0.
    elif kind=='metal':
        spots=np.zeros((N,N))
        for _ in range(36):
            cx,cy=rng.uniform(0,1,2)
            s=rng.uniform(.0004,.007)
            spots+=np.exp(-((x-cx)**2+(y-cy)**2)/s)
        rust=np.clip(spots*.16+np.maximum(0,noise)*.05,0,.7)
        scratches=np.maximum(0,np.sin(2*pi*(x*70+y*2))**20)*.13
        base=np.stack([.18+.39*rust+scratches,.20+.14*rust+scratches,.21+.06*rust+scratches],axis=-1)
        col=np.clip(base,0,1)
        rgh=np.clip(.55+.36*rust+.08*noise,0,1)
        h=.20*noise+.85*rust+scratches
        metal=.72
    else:
        grains=.36*np.sin(2*pi*(x*4+y*11))+.25*noise
        tone=.45+grains*.32
        col=np.stack([.18+tone*.21,.16+tone*.19,.15+tone*.18],axis=-1)
        rgh=np.clip(.86+.10*noise,0,1)
        h=grains
        metal=.03
    rgba=np.concatenate([col,np.ones((N,N,1))],axis=-1)
    r=np.stack([rgh,rgh,rgh,np.ones_like(rgh)],axis=-1)
    dx=np.gradient(h,axis=1)*.25;dy=np.gradient(h,axis=0)*.25
    norm=np.sqrt(dx*dx+dy*dy+1.)
    normal=np.stack([.5-dx/norm*.4,.5-dy/norm*.4,.5+1/norm*.5,np.ones_like(dx)],axis=-1)
    c=write_image(name+'_albedo',rgba,'sRGB')
    rr=write_image(name+'_roughness',r,'Non-Color')
    nn=write_image(name+'_normalGL',normal,'Non-Color')
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True;mat.diffuse_color=tuple(np.mean(col,axis=(0,1)).tolist())+(1,)
    bs=mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Metallic'].default_value=metal
    bs.inputs['Roughness'].default_value=.75
    nodes=mat.node_tree.nodes;links=mat.node_tree.links
    ct=nodes.new('ShaderNodeTexImage');ct.image=c;ct.label='Embedded albedo '+kind
    rt=nodes.new('ShaderNodeTexImage');rt.image=rr;rt.label='Embedded roughness'
    nt=nodes.new('ShaderNodeTexImage');nt.image=nn;nt.label='GL normal'
    nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.65 if kind=='wood' else .36
    links.new(ct.outputs['Color'],bs.inputs['Base Color'])
    links.new(rt.outputs['Color'],bs.inputs['Roughness'])
    links.new(nt.outputs['Color'],nm.inputs['Color'])
    links.new(nm.outputs['Normal'],bs.inputs['Normal'])
    return mat

timber=pbr('B4_Worn_Oak','wood',319)
timber2=pbr('B4_Old_Repairs','wood',547)
iron=pbr('B4_Blackened_Iron','metal',777)
ore=pbr('B4_Ore_Stone','stone',841)
mat_rust=bpy.data.materials.new('B4_Deep_Rust_Spots')
mat_rust.diffuse_color=(.24,.13,.09,1);mat_rust.use_nodes=True
mat_rust.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.89
mat_rust.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.24
mat_rust.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.24,.13,.09,1)
def box(name,loc,scale,mat,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    obj=attach(bpy.context.object,name,mat)
    obj.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=obj.modifiers.new('machined and worn edge','BEVEL')
        mod.width=bevel;mod.segments=2
        obj.modifiers.new('weighted-normals','WEIGHTED_NORMAL')
    return obj
def between(name,a,b,wx,wz,mat,bevel=.012):
    av=Vector(a);bv=Vector(b);v=bv-av
    obj=box(name,(av+bv)/2,(wx,wz,v.length),mat,bevel)
    obj.rotation_mode='QUATERNION'
    obj.rotation_quaternion=Vector((0,0,1)).rotation_difference(v.normalized())
    return obj
def tapered_board(name,edge,sign,t0,t1,mat,chip=0):
    # four sloping sides, each plank includes real thickness & edge chips.
    bottomW=1.44;topW=2.24 if VAR=='a' else 2.20
    bottomL=2.62;topL=3.77 if VAR=='a' else 3.83
    bz=.79;tz=1.83
    def shape(t):
        return (bottomW/2+(topW-bottomW)*t/2,
                bottomL/2+(topL-bottomL)*t/2,bz+(tz-bz)*t)
    x0,y0,z0=shape(t0);x1,y1,z1=shape(t1)
    if edge=='side':
        verts=[(sign*x0,-y0,z0),(sign*x0,y0,z0),
               (sign*x1,y1,z1),(sign*x1,-y1,z1)]
        # some planks lose a tiny bite on one exposed end; not a rectangle overlay.
        if chip and sign>0:verts[2]=(sign*x1,y1-.06,z1-.035)
        if VAR=='c' and t0<.65:
            tm=(t0+t1)/2
            xm=(bottomW/2+(topW-bottomW)*tm/2)
            ym=(bottomL/2+(topL-bottomL)*tm/2)
            zm=bz+(tz-bz)*tm
            verts.insert(2,(sign*xm,ym-.10,zm))
    else:
        verts=[(-x0,sign*y0,z0),(x0,sign*y0,z0),
               (x1,sign*y1,z1),(-x1,sign*y1,z1)]
        if chip and sign<0:verts[3]=(-x1+.075,sign*y1,z1-.04)
    if VAR=='c' and edge=='end' and sign<0 and t0>.3:
        tm=(t0+t1)/2
        xm=(bottomW/2+(topW-bottomW)*tm/2)
        ym=(bottomL/2+(topL-bottomL)*tm/2)
        zm=bz+(tz-bz)*tm
        verts.insert(2,(xm-.08,sign*ym,zm))
    mesh=bpy.data.meshes.new(name+'-mesh');mesh.from_pydata(verts,[],[tuple(range(len(verts)))])
    mesh.update();obj=bpy.data.objects.new(name,mesh);SC.collection.objects.link(obj)
    obj.data.materials.append(mat);MODEL.append(obj)
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            v=mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv=((v.y+.0)*.8,v.z*1.25) if edge=='side' else (v.x*.8,v.z*1.25)
    thick=obj.modifiers.new('true plank thickness','SOLIDIFY')
    thick.thickness=.083
    bevel=obj.modifiers.new('chipped corner softening','BEVEL')
    bevel.width=.014;bevel.segments=2
    obj.modifiers.new('flat weighted normal','WEIGHTED_NORMAL')
    return obj

# Full-length underframe (local +Y is track direction).
for x in [-.57,.57]:
    box('chassis long iron member',(x,.61,0),(.13,.17,2.91),iron) if False else None
    box('heavy longitudinal chassis',(x,0,.61),(.15,2.91,.20),iron,.035)
for yy in [-1.16,0,1.16]:
    box('cross brace',(0,yy,.60),(1.34,.13,.15),iron,.025)
# Bottom base and underlying aged timber floor boards.
box('base iron cradle',(0,0,.76),(1.46,2.59,.14),iron,.045)
for j,x in enumerate(np.linspace(-.51,.51,5)):
    b=box('timber floor slat '+str(j),(float(x),0,.854),(.22,2.50,.07),timber if j%3 else timber2,.021)
    b.rotation_euler[2]=(j-2)*.006

# Realistic lower and upper tapered silhouettes: three visibly separated planks.
for edge in ['side','end']:
    for sign in [-1,1]:
        bands=[(.025,.315),(.345,.640),(.675,.970)]
        for idx,(t0,t1) in enumerate(bands):
            tapered_board(edge+' board '+str(sign)+' '+str(idx),edge,sign,t0,t1,
                          timber if (idx+int(sign>0))%3 else timber2,chip=idx==2)
# Iron angle-iron corner braces attach the hopper to chassis.
for sx in [-1,1]:
    for sy in [-1,1]:
        lo=(sx*.73,sy*1.30,.82);hi=(sx*1.12,sy*1.88,1.85)
        between('sloped corner ironwork',lo,hi,.125,.11,iron,.014)
        for z in [.99,1.55]:
            t=(z-.82)/(1.85-.82)
            xx=sx*(.73+.39*t); yy=sy*(1.30+.58*t)
            bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,radius=.043,location=(xx,yy,z))
            attach(bpy.context.object,'corroded exposed fastener',mat_rust)
# Thin upper U-shaped perimeter iron frame, softened edges.
for x in [-1.12,1.12]:
    between('upper rim longitudinal',(x,-1.9,1.85),(x,1.9,1.85),.12,.12,iron,.024)
for y in [-1.9,1.9]:
    between('upper rim transverse',(-1.12,y,1.85),(1.12,y,1.85),.12,.12,iron,.024)
# real wood fibrous break geometry (not noise blobs)
for j in range(9):
    sx=1 if j%2 else -1
    yy=-1.55+(j%5)*.70
    zz=.99+(j%3)*.29
    spl=box('frayed board edge splinter',(sx*(.84+(zz-.79)*.37),yy,zz),
            (.05,.16+(j%2)*.10,.055),timber2,.008)
    spl.rotation_euler[2]=(j-4)*.08
# Wheels: proper rail gauge ±0.59, axle spacing >=2.0, actual four separate wheels.
wheel_y=1.09 if VAR=='a' else 1.14
axle_z=.505 if VAR=='c' else .46;rad=.383 if VAR=='c' else .342
for yy in [-wheel_y,wheel_y]:
    between('solid steel axle',(-.77,yy,axle_z),(.77,yy,axle_z),.11,.11,iron)
    for sx in [-1,1]:
        xx=sx*.59
        # Torus wheel rims, not disconnected floating rings. X is the axle axis.
        for major,minor,dx,material,label in [
            (.338 if VAR=='c' else .300,.052,0,iron,'wheel rolled steel tyre'),
            (.254 if VAR=='c' else .222,.026,sx*.015,iron,'wheel inner rim'),
            (.378 if VAR=='c' else .340,.021,sx*.035,iron,'wheel flange edge')]:
            bpy.ops.mesh.primitive_torus_add(major_segments=36,minor_segments=8,
                location=(xx+dx,yy,axle_z),rotation=(0,pi/2,0),
                major_radius=major,minor_radius=minor)
            attach(bpy.context.object,label,material)
        for k in range(10):
            angle=k*2*pi/10
            start=(xx,yy+math.cos(angle)*.08,axle_z+math.sin(angle)*.08)
            end=(xx,yy+math.cos(angle)*(.29 if VAR=='c' else .26),axle_z+math.sin(angle)*(.29 if VAR=='c' else .26))
            between('ten forged spokes',start,end,.044,.042,iron,.005)
        bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=.115,depth=.16,
            location=(xx+sx*.07,yy,axle_z),rotation=(0,pi/2,0))
        hub=attach(bpy.context.object,'massive bearing hub',iron)
        hub.modifiers.new('hub machined rim','BEVEL').width=.015
        for offset in [-.14,.14]:
            between('axle cage tie',(sx*.67,yy+offset,.54),
                    (sx*.66,yy+offset,.75),.075,.085,iron)
# Targeted rust growth at bearings, not uniform spots everywhere.
for sx in [-1,1]:
    for yy in [-wheel_y,wheel_y]:
        box('bearing rusty clamp',(sx*.61,yy,.67),(.27,.25,.11),mat_rust,.018)

# Ores no longer oversized; approved original V17 source remains available as separate GLB.
for j in range(15):
    ang=j*2.399963
    radius=.12+(j%5)*.15
    xx=math.cos(ang)*radius;yy=math.sin(ang)*radius*1.2
    size=(.37 if j==0 else .15+(j%4)*.045)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1 if j%4 else 2,radius=size,
        location=(xx,yy,1.62+size*.35+(j%3)*.04))
    ob=attach(bpy.context.object,'contained ore '+str(j),ore)
    ob.scale=(1.05+(j%3)*.15,1.0+(j%5)*.12,.7+(j%2)*.18)
    ob.rotation_euler=(j*.13,j*.28,j*.41)

# Model export excludes any presentation lights, floor, camera, guide tracks.
for obj in bpy.context.selected_objects:obj.select_set(False)
for obj in MODEL:obj.select_set(True)
bpy.context.view_layer.objects.active=MODEL[0]
GLB=os.path.join(OUT,'b4-minecart-v18-'+VAR+'.glb')
bpy.ops.export_scene.gltf(filepath=GLB,export_format='GLB',
    use_selection=True,export_image_format='AUTO')
for obj in MODEL:obj.select_set(False)

# Non-model railway guide for one grounded side-shot, NOT part of the exported GLB.
GUIDES=[]
guide_mat=bpy.data.materials.new('studio rail guide');guide_mat.diffuse_color=(.20,.20,.23,1)
guide_mat.use_nodes=True
bs=guide_mat.node_tree.nodes.get('Principled BSDF')
bs.inputs['Base Color'].default_value=(.18,.18,.20,1)
bs.inputs['Metallic'].default_value=.76
bs.inputs['Roughness'].default_value=.58
for sx in [-1,1]:
    bpy.ops.mesh.primitive_cube_add(size=1,location=(sx*.59,0,.035))
    o=bpy.context.object;o.name='rail_gauge_check_only';o.dimensions=(.13,4.9,.17)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(guide_mat);GUIDES.append(o)
for k in range(12):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(0,-2.4+k*.42,-.12))
    o=bpy.context.object;o.name='temporary_sleeper'
    o.dimensions=(1.68,.24,.15);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(timber);GUIDES.append(o)
for o in GUIDES:o.hide_render=True
# Neutral backdrop/ground studio presentation.
bgmat=bpy.data.materials.new('background only');bgmat.diffuse_color=(.60,.61,.64,1)
bgmat.use_nodes=True
bgmat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.60,.61,.64,1)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.29))
ground=bpy.context.object;ground.name='presentation_floor_not_exported';ground.data.materials.append(bgmat)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
def area(pos,power,color,size):
    bpy.ops.object.light_add(type='AREA',location=pos)
    l=bpy.context.object;l.data.energy=power;l.data.size=size;l.data.color=color;aim(l,(0,0,.9))
area((4.7,-4.2,7.5),850,(1,1,1),5.0)
area((-5.0,3.0,5.1),700,(.90,.93,1),5.5)
area((0,3.8,6),350,(1,.85,.70),3.5)
bpy.ops.object.camera_add();cam=bpy.context.object
SC.camera=cam;cam.data.type='ORTHO'
cam.data.ortho_scale=5.75
for view,position,scale in [
 ('front',(0,6,2.3),5.50),
 ('side',(6,0,2.45),5.00),
 ('angle',(4.5,5.8,4.1),5.75)]:
    cam.location=position;cam.data.ortho_scale=scale;aim(cam,(0,0,1.02))
    SC.render.filepath=os.path.join(OUT,'b4-minecart-v18-'+VAR+'-'+view+'.png')
    bpy.ops.render.render(write_still=True)
    print('RENDER_OK',SC.render.filepath,flush=True)
for o in GUIDES:o.hide_render=False
cam.location=(4.1,5.5,3.1);cam.data.ortho_scale=5.85;aim(cam,(0,0,.95))
SC.render.filepath=os.path.join(OUT,'b4-minecart-v18-'+VAR+'-gauge.png')
bpy.ops.render.render(write_still=True)
for o in GUIDES:o.hide_render=True
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'b4-minecart-v18-'+VAR+'.blend'))
metrics={
 'variant':VAR,'approval_status':'NOT_APPROVED',
 'body_top_width':2.24 if VAR=='a' else 2.20,
 'body_top_length':3.77 if VAR=='a' else 3.83,
 'body_length_to_width':(3.77/2.24 if VAR=='a' else 3.83/2.20),
 'axle_spacing':2*wheel_y,
 'rail_center_x':[-.59,.59],
 'wheel_x':[-.59,.59],
 'wheel_radius':rad,
 'wood_texture_generated':'original procedural PBR maps embedded into GLB (not downloaded Poly Haven)',
 'model_objects':len(MODEL),
 'source_original':'V17 retained as independent source / no previous model deletion',
 'visual_revision':'V19 weathered wood, chipped plank edges, darkened rusty clamps and larger rail-fit wheels' if VAR=='c' else 'V18 baseline'
}
with open(os.path.join(OUT,'b4-minecart-v18-'+VAR+'-metrics.json'),'w') as f:
    json.dump(metrics,f,indent=2)
print('MODEL_CHECK',json.dumps(metrics),flush=True)
