"""Original Assassin Head V3 blockout. NO source VRM imports, ZERO copied vertices.
A brand-new full cranial oval + jaw + minimal face landmarks + ears + neck to judge
rear skull in context. Facial detail remains temporary: NOT APPROVED.
Blender -b -t 2 --python script -- OUT
"""
import bpy,math,os,sys,json,hashlib,collections
from mathutils import Vector
a=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(a)!=1:raise SystemExit('output directory required')
out=a[0];os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def smoothstep(x):
    x=max(0.,min(1.,x))
    return x*x*(3-2*x)
def material(name,color,rough=.83):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough
    return m
skin=material('neutral clay skin',(.66,.56,.51))
inner=material('ear fold',(.50,.38,.36))
eyes=material('dark upper lash',(.12,.09,.085))
iris=material('iris slate',(.23,.30,.35))
white=material('eye white',(.86,.83,.77))
brows=material('soft eyebrow',(.26,.20,.18))
lips=material('lip contour',(.42,.29,.28))
# Original head: no reference mesh, no topology copied. Elliptic horizontal rings
# combine back-of-head, temporal flanks, cheek, jaw and front-face in 1 shell.
ROWS=40;SEGS=80
vertices=[];faces=[]
bottom=1.348;top=1.607
for i in range(ROWS+1):
    t=i/ROWS
    z=bottom+(top-bottom)*t
    # Upper cranial volume and tapered cheeks, with rounded crown cap.
    # Original cranial section table, bottom chin -> upper crown. Unlike V2,
    # the crown closes continuously without leaving a wide horizontal ring.
    sections=[
       (0.00,.040,.046,.050),
       (0.10,.054,.055,.062),
       (0.22,.074,.063,.079),
       (0.35,.089,.066,.091),
       (0.53,.098,.066,.099),
       (0.67,.099,.065,.103),
       (0.81,.090,.060,.091),
       (0.91,.068,.049,.069),
       (0.975,.033,.025,.033),
       (1.00,.0007,.001,.001)]
    idx=next(q for q in range(len(sections)-1) if sections[q][0]<=t<=sections[q+1][0])
    z0,*v0=sections[idx];z1,*v1=sections[idx+1]
    u=smoothstep((t-z0)/(z1-z0))
    rx,front_depth,rear_depth=[a*(1-u)+b*u for a,b in zip(v0,v1)]
    for j in range(SEGS):
        th=2*math.pi*j/SEGS
        sx=math.cos(th);sy=math.sin(th)
        x=rx*sx
        if sy>=0:  # front: forehead, cheek, nose, jaw.
            y=front_depth*(sy**.75)
            brow=.0037*math.exp(-((z-1.510)/.016)**2)*math.exp(-(x/.082)**2)
            cheek=.008*math.exp(-((abs(x)-.038)/.027)**2-((z-1.440)/.024)**2)
            nose=.028*math.exp(-(x/.012)**2-((z-1.447)/.026)**2)
            chin=.006*math.exp(-(x/.028)**2-((z-1.385)/.023)**2)
            y+=brow+cheek+nose+chin
        else:
            # Posterior maximum above nape, gradual inward return lower down.
            y=-rear_depth*(abs(sy)**.72)
        vertices.append((x,y,z))
for i in range(ROWS):
    for j in range(SEGS):
        a=i*SEGS+j;b=i*SEGS+(j+1)%SEGS
        c=(i+1)*SEGS+(j+1)%SEGS;d=(i+1)*SEGS+j
        faces.append((a,b,c,d))
# Smooth cap with a single flat-to-small last ring, no polar wedge on sides.
cap_id=len(vertices);vertices.append((0,0,top+.0005))
for j in range(SEGS):faces.append((ROWS*SEGS+j,ROWS*SEGS+(j+1)%SEGS,cap_id))
mesh=bpy.data.meshes.new('Original Full Head V3 Independent Surface')
mesh.from_pydata(vertices,[],faces);mesh.update()
head=bpy.data.objects.new('ASSASSIN_ORIGINAL_HEAD_V3_BLOCKOUT',mesh)
bpy.context.collection.objects.link(head);mesh.materials.append(skin)
for p in mesh.polygons:p.use_smooth=True
# Local geometry helpers, still entirely original.
def uv_egg(name,loc,scale,mat,segments=24,rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    ob=bpy.context.object;ob.name=name
    ob.scale=scale;ob.data.materials.append(mat)
    for p in ob.data.polygons:p.use_smooth=True
    return ob
def line(name,pts,radius,mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=20
    c.bevel_depth=radius;c.bevel_resolution=3
    sp=c.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
    for point,xyz in zip(sp.bezier_points,pts):
        point.co=xyz;point.handle_left_type='AUTO';point.handle_right_type='AUTO'
    ob=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat)
    return ob
# Both ear forms: separate reference-quality placeholders to judge head/ear proportions.
for side in (-1,1):
    uv_egg('TEMPORARY ear'+str(side),(side*.096,.001,1.465),(.018,.014,.037),skin)
    uv_egg('TEMPORARY pinna recess'+str(side),(side*.104,.014,1.465),(.009,.004,.025),inner)
    uv_egg('TEMPORARY ear cartilage'+str(side),(side*.110,.017,1.460),(.004,.003,.013),skin)
# Neutral anime face markers (explicitly blockout, not final expressions/eyes).
for side in (-1,1):
    x=side*.034
    uv_egg('TEMPORARY sclera'+str(side),(x,.069,1.489),(.020,.006,.009),white)
    uv_egg('TEMPORARY iris'+str(side),(x,.0752,1.489),(.008,.0025,.008),iris)
    uv_egg('TEMPORARY pupil'+str(side),(x,.077,1.489),(.004,.0015,.006),eyes)
    line('TEMPORARY eyelid'+str(side),[(x-side*.021,.074,1.493),(x,.075,1.502),(x+side*.020,.073,1.493)],.0017,eyes)
    line('TEMPORARY eyebrow'+str(side),[(x-side*.020,.068,1.522),(x,.074,1.530),(x+side*.021,.067,1.524)],.0020,brows)
line('TEMPORARY mouth contour',[(-.020,.072,1.407),(0,.075,1.404),(.020,.072,1.407)],.0008,lips)
# Neck is independent/open at its bottom, with a modest transition for proportions.
verts_neck=[];faces_neck=[]
for i in range(7):
    z=1.284+i*.022
    a=.037+(.012*smoothstep(i/6))
    for j in range(32):
        phi=j*2*math.pi/32
        verts_neck.append((a*math.cos(phi),-.015+.030*math.sin(phi),z))
for i in range(6):
    for j in range(32):
        a=i*32+j;b=i*32+(j+1)%32;c=(i+1)*32+(j+1)%32;d=(i+1)*32+j
        faces_neck.append((a,b,c,d))
neckmesh=bpy.data.meshes.new('ORIGINAL_NECK_BLOCKOUT')
neckmesh.from_pydata(verts_neck,[],faces_neck);neckmesh.update()
neck=bpy.data.objects.new('TEMPORARY_ORIGINAL_NECK',neckmesh)
bpy.context.collection.objects.link(neck);neckmesh.materials.append(skin)
for p in neckmesh.polygons:p.use_smooth=True
# Non-destructive mesh QA for primary head, no Shibu sample required.
edgecount=collections.Counter()
for f in mesh.polygons:
    v=list(f.vertices)
    for a,b in zip(v,v[1:]+v[:1]):edgecount[tuple(sorted((a,b)))]+=1
boundary=sum(v==1 for v in edgecount.values())
assert len(mesh.vertices)==(ROWS+1)*SEGS+1
assert boundary==SEGS and max(edgecount.values())==2
assert all(len(f.vertices)==4 for f in mesh.polygons[:ROWS*SEGS])
source_sha='NO_EXTERNAL_MODEL_IMPORTED'
scene=bpy.context.scene
eng={x.identifier for x in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}
scene.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in eng else 'BLENDER_EEVEE'
scene.render.resolution_x=720;scene.render.resolution_y=720
scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=True
scene.world.color=(.18,.18,.18)
center=Vector((0,0,1.47))
for offset,power,size in [((.9,1.2,2.2),360,1.4),((-.95,-1.4,1.9),290,1.7),((.3,.2,2.8),190,1.8)]:
    pos=center+Vector(offset)
    bpy.ops.object.light_add(type='AREA',location=pos)
    light=bpy.context.object;light.data.energy=power;light.data.size=size
    light.rotation_euler=(center-pos).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO'
scene.camera=cam
views=[('front',(0,1,0)),('right',(1,0,0)),('left',(-1,0,0)),
 ('front_three_quarter',(1,1,.15)),('back',(0,-1,0)),
 ('back_three_quarter',(1,-1,.2)),('back_upper',(1,-1,.7))]
for name,d in views:
    cam.location=center+Vector(d).normalized()*1.6
    cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.ortho_scale=.43
    scene.render.filepath=os.path.join(out,name+'.png')
    bpy.ops.render.render(write_still=True)
# Bundle only independent original candidate and its temporary parts.
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.context.scene.objects:
    if ob.type in ('MESH','CURVE'):ob.select_set(True)
bpy.context.view_layer.objects.active=head
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'assassin_original_head_v3_review.glb'),
                         export_format='GLB',use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'assassin_original_head_v3_review.blend'))
qa={'status':'NOT_APPROVED','source_VRM_imported':False,'source_vertices_copied':0,
    'main_head_vertices':len(mesh.vertices),'main_head_quads':ROWS*SEGS,
    'main_head_triangles':SEGS,'head_lower_open_edges':boundary,
    'main_head_nonmanifold_gt2':sum(v>2 for v in edgecount.values()),
    'has_temporary_face':True,'has_temporary_ears':True,'has_temporary_neck':True,
    'notes':'Original full-head context BLOCKOUT, ears/eyes/neck not production topology, user approval needed'}
with open(os.path.join(out,'qa.json'),'w') as f:json.dump(qa,f,indent=2)
manifest={'status':'NOT_APPROVED','files':{}}
for fn in os.listdir(out):
    p=os.path.join(out,fn)
    if os.path.isfile(p):
        manifest['files'][fn]={'sha256':hashlib.sha256(open(p,'rb').read()).hexdigest(),
                              'bytes':os.path.getsize(p)}
with open(os.path.join(out,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
print('ORIGINAL_ASSASSIN_FULL_HEAD_CONTEXT_QA',qa)
