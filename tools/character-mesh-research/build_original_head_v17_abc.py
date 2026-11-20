"""Original Assassin Head V16 blockout. NO source VRM imports, ZERO copied vertices.
A brand-new full cranial oval + jaw + minimal face landmarks + ears + neck to judge
rear skull in context. Facial detail remains temporary: NOT APPROVED.
Blender -b -t 2 --python script -- OUT
"""
import bpy,math,os,sys,json,hashlib,collections
VARIANT=os.environ.get('HEAD_V17_VARIANT','A')
assert VARIANT in ('A','B','C'),VARIANT

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
ROWS=88;SEGS=96
# Anatomical original cross-sections, bottom chin -> rounded scalp.
# Shibu references are *not* loaded or copied.
SECTIONS=[
 # Compact neck/nape followed by jaw cheek temporal cranium and crown.
 (0.000,.040,.028,.043),
 (0.110,.041,.029,.045),
 (0.215,.052,.041,.055),
 (0.330,.072,.054,.071),
 (0.460,.085,.064,.086),
 (0.610,.094,.068,.100),
 (0.740,.100,.067,.104),
 (0.840,.090,.059,.093),
 (0.922,.065,.048,.074),
 (0.970,.035,.030,.042),
 (0.993,.015,.015,.018),
 (1.000,.0005,.0005,.0005)]
def pchip_slopes(values):
    x=[r[0] for r in SECTIONS];n=len(x)
    h=[x[i+1]-x[i] for i in range(n-1)]
    sec=[(values[i+1]-values[i])/h[i] for i in range(n-1)]
    m=[0.0]*n
    for i in range(1,n-1):
        if sec[i-1]*sec[i]<=0:continue
        w1=2*h[i]+h[i-1];w2=h[i]+2*h[i-1]
        m[i]=(w1+w2)/(w1/sec[i-1]+w2/sec[i])
    m[0]=sec[0];m[-1]=sec[-1]
    return m
PROFILES=[[row[c] for row in SECTIONS] for c in (1,2,3)]
SLOPES=[pchip_slopes(v) for v in PROFILES]
def profile(t):
    idx=next((i for i in range(len(SECTIONS)-1) if t<=SECTIONS[i+1][0]),len(SECTIONS)-2)
    x0=SECTIONS[idx][0];x1=SECTIONS[idx+1][0];h=x1-x0
    u=min(1.,max(0.,(t-x0)/h))
    h00=2*u**3-3*u**2+1
    h10=u**3-2*u**2+u
    h01=-2*u**3+3*u**2
    h11=u**3-u**2
    return [h00*vals[idx]+h10*h*sl[idx]+h01*vals[idx+1]+h11*h*sl[idx+1] for vals,sl in zip(PROFILES,SLOPES)]
vertices=[];faces=[]
bottom=1.310;top=1.607
for i in range(ROWS+1):
    t=i/ROWS
    z=bottom+(top-bottom)*t
    # Upper cranial volume and tapered cheeks, with rounded crown cap.
    # Original cranial section table, bottom chin -> upper crown. Unlike V2,
    # the crown closes continuously without leaving a wide horizontal ring.
    # Cubic Hermite / PCHIP: C1 continuous at all sections.
    # In V3 smoothstep independently set every knot tangent to zero, causing
    # repeated hard light/dark rings across face and occiput.
    rx,front_depth,rear_depth=profile(t)
    for j in range(SEGS):
        th=2*math.pi*j/SEGS
        sx=math.cos(th);sy=math.sin(th)
        x=rx*sx
        if sy>=0:  # front: forehead, cheek, nose, jaw.
            y=front_depth*(sy**.75)
            # Subtle anatomical sculpt of native original head mesh, not
            # protruding sphere eyes or arbitrary shading-mask wrinkles.
            # V8 over-concentrated nasal-tip and nostril Gaussians caused
            # a dark hollow. V16 uses smoother broad shallow relief without
            # an artificial circular pit or opaque nostril-like cavity.
            eye_socket=-.0030*math.exp(-((abs(x)-.034)/.027)**2-((z-1.490)/.019)**2)
            brow_ridge=.0024*math.exp(-((abs(x)-.032)/.030)**2-((z-1.520)/.018)**2)
            cheek_mound=.0048*math.exp(-((abs(x)-.041)/.032)**2-((z-1.453)/.028)**2)
            nose_bridge=.0035*math.exp(-(x/.022)**2-((z-1.471)/.047)**2)
            nose_tip=.0060*math.exp(-(x/.022)**2-((z-1.443)/.023)**2)
            upper_lip=.0017*math.exp(-(x/.030)**2-((z-1.411)/.013)**2)
            chin_mound=.0045*math.exp(-(x/.039)**2-((z-1.383)/.022)**2)
            jaw_corner=.0016*math.exp(-((abs(x)-.065)/.023)**2-((z-1.417)/.030)**2)
            # V16 diagnostic rebuild: broad nasal bridge + moderate tip with
            # no overlapping secondary shell; preserve all posterior vertices.
            # Two smooth longitudinal lobes avoid V15's steep narrow ridge.
            bridge_falloff=math.exp(-(x/.025)**4)
            bridge_rise=.0047*math.exp(-((z-1.479)/.041)**2)
            tip_rise=.0068*math.exp(-((z-1.449)/.028)**2)
            # Three deliberately bounded original-nose alternatives with no posterior edits.
            # A = broad bridge and smoothly rounded tip.
            # B = slightly stronger side profile, with soft alar transition.
            # C = fuller nasal base and narrower upper bridge.
            config={'A':(.025,.0047,.0068,.028,.0020),
                    'B':(.023,.0058,.0090,.030,.0026),
                    'C':(.020,.0045,.0084,.034,.0035)}[VARIANT]
            width,bridge_amp,tip_amp,tip_span,alar_amp=config
            nose_integrated=(math.exp(-(x/width)**4) *
                 (bridge_amp*math.exp(-((z-1.479)/.041)**2)
                 +tip_amp*math.exp(-((z-1.449)/tip_span)**2))
                 +alar_amp*math.exp(-((abs(x)-.017)/.012)**2-((z-1.440)/.014)**2))
            # Eye socket and cheek relief kept from V15; taper lower nasolabial
            # area rather than an abrupt vertical/normal discontinuity.
            y+=eye_socket+brow_ridge+cheek_mound+upper_lip+chin_mound+jaw_corner+nose_integrated
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
mesh=bpy.data.meshes.new('Original Full Head V16 Independent Surface')
mesh.from_pydata(vertices,[],faces);mesh.update()
head=bpy.data.objects.new('ASSASSIN_ORIGINAL_HEAD_V16_BLOCKOUT',mesh)
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
# V16: wholly original pinna mesh with continuous outer-helix and concha bowl
# loops, replacing floating stacked spheres. It is not a Shibu ear copy, and
# ear-to-temporal weld/weights remain unfinished.
EAR_RINGS=5;EAR_SEGS=48
ear_stats=[]
for side in (-1,1):
    ev=[];ef=[]
    radii=(1.00,.82,.63,.43,.21)
    protrusion=(.093,.104,.101,.096,.091)
    for ring,(rr,depth) in enumerate(zip(radii,protrusion)):
        for j in range(EAR_SEGS):
            theta=2*math.pi*j/EAR_SEGS
            cy=math.cos(theta);sz=math.sin(theta)
            # Ear oval tilts subtly front/up and narrows at the lobe.
            z=1.465+.031*rr*sz+ .002*rr*cy*sz
            y=.002+.016*rr*cy + .006*rr*sz + .002*rr*math.sin(2*theta)
            x=side*depth
            ev.append((x,y,z))
    center_id=len(ev);ev.append((side*.097,.005,1.461))
    for ring in range(EAR_RINGS-1):
        for j in range(EAR_SEGS):
            a=ring*EAR_SEGS+j
            b=ring*EAR_SEGS+(j+1)%EAR_SEGS
            c=(ring+1)*EAR_SEGS+(j+1)%EAR_SEGS
            d=(ring+1)*EAR_SEGS+j
            ef.append((a,b,c,d) if side>0 else (d,c,b,a))
    for j in range(EAR_SEGS):
        a=(EAR_RINGS-1)*EAR_SEGS+j
        b=(EAR_RINGS-1)*EAR_SEGS+(j+1)%EAR_SEGS
        ef.append((a,b,center_id) if side>0 else (center_id,b,a))
    em=bpy.data.meshes.new('Original sculpted auricle V16 '+str(side))
    em.from_pydata(ev,[],ef);em.update()
    ob=bpy.data.objects.new('V17_ORIGINAL_AURICLE_'+str(side),em)
    bpy.context.collection.objects.link(ob)
    em.materials.append(skin);em.materials.append(inner)
    for p in em.polygons:
        p.use_smooth=True
        p.material_index=1 if p.index>=(EAR_SEGS*(EAR_RINGS-2)) else 0
    ear_stats.append({'side':side,'vertices':len(em.vertices),'quads':sum(len(p.vertices)==4 for p in em.polygons),'triangles':sum(len(p.vertices)==3 for p in em.polygons)})
assert len(ear_stats)==2 and all(q['vertices']==241 and q['quads']==192 for q in ear_stats)
# V16 original eye-region topology: four nested circumorbital loops,
# each side quad connected and following the anatomical front head surface.
# This is NOT Shibu Face, not the old floating white spheroids.
def face_y_at(x,z):
    t=max(0.,min(1.,(z-bottom)/(top-bottom)))
    rx,front,rear=profile(t)
    ratio=max(-.98,min(.98,x/max(rx,1e-6)))
    y=front*(math.sqrt(1-ratio*ratio)**.75)
    y+=(-.0030*math.exp(-((abs(x)-.034)/.027)**2-((z-1.490)/.019)**2)
       +.0024*math.exp(-((abs(x)-.032)/.030)**2-((z-1.520)/.018)**2)
       +.0048*math.exp(-((abs(x)-.041)/.032)**2-((z-1.453)/.028)**2)
       +.0035*math.exp(-(x/.022)**2-((z-1.471)/.047)**2)
       +.0060*math.exp(-(x/.022)**2-((z-1.443)/.023)**2)
       +.0017*math.exp(-(x/.030)**2-((z-1.411)/.013)**2)
       +.0045*math.exp(-(x/.039)**2-((z-1.383)/.022)**2)
       +.0016*math.exp(-((abs(x)-.065)/.023)**2-((z-1.417)/.030)**2))
    return y
orbital_stats=[]
ORBIT_SEGS=48
for side in (-1,1):
    x0=side*.035;z0=1.491
    ov=[];of=[]
    for ring,(scale,relief) in enumerate([(1.36,.0001),(1.15,.0004),(.93,.0007),(.75,.00015)]):
        for j in range(ORBIT_SEGS):
            theta=j*math.tau/ORBIT_SEGS
            xx=x0+.019*scale*math.cos(theta)
            zz=z0+.0085*scale*math.sin(theta)
            yy=face_y_at(xx,zz)+relief
            ov.append((xx,yy,zz))
    for ring in range(3):
        for j in range(ORBIT_SEGS):
            a=ring*ORBIT_SEGS+j
            bb=ring*ORBIT_SEGS+(j+1)%ORBIT_SEGS
            c=(ring+1)*ORBIT_SEGS+(j+1)%ORBIT_SEGS
            d=(ring+1)*ORBIT_SEGS+j
            of.append((a,bb,c,d) if side>0 else (d,c,bb,a))
    om=bpy.data.meshes.new('V16 original orbital quad flow '+str(side))
    om.from_pydata(ov,[],of);om.update()
    ob=bpy.data.objects.new('V16_ORBITAL_LOOP_'+str(side),om)
    bpy.context.collection.objects.link(ob)
    om.materials.append(skin)
    for p in om.polygons:p.use_smooth=True
    # Slightly recessed sclera and iris, rather than a floating eye ball.
    eye_base=face_y_at(x0,z0)+.0018
    uv_egg('V17_inset_eye_'+str(side),(x0,eye_base,z0),(.0135,.0014,.0060),white,32,20)
    uv_egg('V16_iris_'+str(side),(x0,eye_base+.0015,z0),(.006,.0009,.0054),iris,32,20)
    uv_egg('V16_pupil_'+str(side),(x0,eye_base+.0022,z0),(.003,.0006,.004),eyes,24,16)
    orbital_stats.append({'side':side,'verts':len(om.vertices),'quads':len(om.polygons)})
assert len(orbital_stats)==2 and all(s['verts']==192 and s['quads']==144 for s in orbital_stats)
# Mouth relief remains a placeholder until separate labial edge loops exist.
mouthy=face_y_at(0,1.409)+.0013
line('V16_Mouth_Contour',[(-.019,mouthy,1.409),(0,mouthy+.0007,1.408),(.019,mouthy,1.409)],.00065,lips)
# V16: neck is modeled continuously by the same original 3D head mesh.
# No separate cylinder intersecting the chin / occipital scalp.
# Non-destructive mesh QA for primary head, no Shibu sample required.
edgecount=collections.Counter()
for f in mesh.polygons:
    v=list(f.vertices)
    for a,b in zip(v,v[1:]+v[:1]):edgecount[tuple(sorted((a,b)))]+=1
boundary=sum(v==1 for v in edgecount.values())
assert len(mesh.vertices)==(ROWS+1)*SEGS+1
assert boundary==SEGS and max(edgecount.values())==2
assert all(len(f.vertices)==4 for f in mesh.polygons[:ROWS*SEGS])
# Profile continuity QA: no artificial slope reset at every section.
# A physical silhouette may still need artistic judgment from the PNGs.
profile_derivative_jumps=[]
for i in range(1,len(SECTIONS)-1):
    x=SECTIONS[i][0];eps=1e-5
    left=profile(x);a=profile(x-eps);right=profile(x+eps)
    dv_l=[(v-w)/eps for v,w in zip(left,a)]
    dv_r=[(v-w)/eps for v,w in zip(right,left)]
    profile_derivative_jumps.append(max(abs(q-p) for p,q in zip(dv_l,dv_r)))
assert max(profile_derivative_jumps)<.01,profile_derivative_jumps
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
# Diagnostic pair: disable light-cast shadows in separate review mode so
# reviewers can distinguish actual geometry/normal defects from lighting.
for ob in bpy.context.scene.objects:
    if ob.type=='LIGHT':
        if hasattr(ob.data,'use_shadow'):ob.data.use_shadow=False
for name,axis in [('front_soft',(0,1,0)),('right_soft',(1,0,0)),('front_three_quarter_soft',(1,1,.15))]:
    cam.location=center+Vector(axis).normalized()*1.6
    cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=os.path.join(out,name+'.png')
    bpy.ops.render.render(write_still=True)
# Bundle only independent original candidate and its temporary parts.
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.context.scene.objects:
    if ob.type in ('MESH','CURVE'):ob.select_set(True)
bpy.context.view_layer.objects.active=head
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'assassin_original_head_v17_'+VARIANT.lower()+'_review.glb'),
                         export_format='GLB',use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'assassin_original_head_v17_'+VARIANT.lower()+'_review.blend'))
qa={'status':'NOT_APPROVED','source_VRM_imported':False,'source_vertices_copied':0,
    'main_head_vertices':len(mesh.vertices),'main_head_quads':ROWS*SEGS,
    'main_head_triangles':SEGS,'head_lower_open_edges':boundary,
    'main_head_nonmanifold_gt2':sum(v>2 for v in edgecount.values()),
    'profile_interpolation':'C1_PCHIP_HERMITE',
    'max_section_derivative_jump':max(profile_derivative_jumps),
    'has_temporary_face':True,'has_temporary_ears':True,'has_temporary_neck':False,
    'auricle_mesh_statistics':ear_stats,
    'orbital_mesh_statistics':orbital_stats,
    'nose_method':'V17_variant_'+VARIANT+'_rounded_bridge_tip_alar', 'nose_variant':VARIANT,
    'notes':'V17 nose A/B/C trial; original rear scalp and neck preserved; technical QA does not imply artistic approval'}
with open(os.path.join(out,'qa.json'),'w') as f:json.dump(qa,f,indent=2)
manifest={'status':'NOT_APPROVED','files':{}}
for fn in os.listdir(out):
    p=os.path.join(out,fn)
    if os.path.isfile(p):
        manifest['files'][fn]={'sha256':hashlib.sha256(open(p,'rb').read()).hexdigest(),
                              'bytes':os.path.getsize(p)}
with open(os.path.join(out,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
print('ORIGINAL_ASSASSIN_V17_VARIANT_QA',qa)
