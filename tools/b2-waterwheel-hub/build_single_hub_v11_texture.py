"""V11 visual silhouette pass: substantial non-regular wood losses and end-face fissures.
Resume exact V02 finished blend. Keep center bore and 14 real spoke mortises.
"""
import bpy,bmesh,sys,hashlib,json,math
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
assert len(args)==2,'expected output directory and V02 checkpoint'
out=Path(args[0]).resolve();out.mkdir(parents=True,exist_ok=True)
checkpoint=Path(args[1]).resolve()
SOURCE_SHA='8e6f827c5fb4dfe8ffe47c33e545a7ff982acc4d01cdb5e82e782c3f402de4d1'
assert hashlib.sha256(checkpoint.read_bytes()).hexdigest()==SOURCE_SHA,'V02 checkpoint mismatch'
bpy.ops.wm.open_mainfile(filepath=str(checkpoint))
hub=bpy.data.objects['B2_Single_Wooden_Hub_01']
before=(len(hub.data.vertices),len(hub.data.polygons))
assert before[0]>=1452 and before[1]>=1273
# Old, fractured wooden end grain: 6 asymmetric wedge-shaped radial cracks
# from the outer end face towards (but not into) the central bore.
endmat=bpy.data.materials.get('Exposed weathered end grain')
assert endmat
if endmat.name not in [m.name for m in hub.data.materials if m]:
    hub.data.materials.append(endmat)
def subtract(obj,name):
    bpy.context.view_layer.objects.active=hub
    modifier=hub.modifiers.new(name,'BOOLEAN')
    modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(obj,do_unlink=True)
# Cut actual broad chips where the wooden beam end face meets its outside wall.
# Choose positions in between neighboring spoke mortises rather than at socket centers.
# Broad angular missing material, not cylindrical holes.
# Restrict cutters to front/back exposed endgrain (outside |X|>0.107m),
# leaving real spoke mortises confined near |X|<0.096m untouched.
def fix_closed_cutter_normals(mesh):
    bm=bmesh.new();bm.from_mesh(mesh);bm.normal_update()
    signed=bm.calc_volume(signed=True)
    if signed<0:
        bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
    bm.to_mesh(mesh);bm.free();mesh.update()
def angular_chip_tool(side,angle,reach,span,index):
    # Zig-zag fracture silhouette: irregular staggered wood volumes
    # at r=.62, ending near r=.62-reach; these edges are intentionally angular.
    # Broad local erosion with an uneven *ledge*, never one acute triangle tip.
    # In radial/tangential coordinates this is an asymmetric shallow broken rim.
    # Unlike V08 each chip's contour is staggered with the ordinal index.
    offset=.13*math.sin(index*2.17)
    contour=[
       (.685,-span*.74),
       (.643,-span*.70),
       (.621,-span*.58),
       (.603,-span*.55),
       (.578,-span*(.42+offset)),
       (.582-reach*.10,-span*.28),
       (.566-reach*.11,-span*.17),
       (.557-reach*.13,-span*.03),
       (.565-reach*.09,span*.13),
       (.575,span*.23),
       (.571+reach*.10,span*.31),
       (.592,span*.48),
       (.615,span*.46),
       (.644,span*.68),
       (.689,span*.72),
    ]
    verts=[]
    for x in (side*.107,side*.255):
        for radius,tangent in contour:
            a=angle+tangent/max(radius,.3)
            verts.append((x,radius*math.cos(a),radius*math.sin(a)))
    n=len(contour)
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    for j in range(n):
        k=(j+1)%n
        faces.append((j,k,n+k,n+j))
    mesh=bpy.data.meshes.new('V11_AngularChipCutter_%02d'%index)
    mesh.from_pydata(verts,[],faces);mesh.update();fix_closed_cutter_normals(mesh)
    cutter=bpy.data.objects.new('TEMP_AngularChip_%02d'%index,mesh)
    bpy.context.collection.objects.link(cutter)
    mesh.materials.append(endmat)
    return cutter
chips=[
    ( 1,.2244,.096,.080),
    ( 1,2.0196,.075,.061),
    (-1,3.3660,.090,.081),
    (-1,4.7124,.080,.077),
    ( 1,5.6104,.075,.067),
    (-1,1.5708,.072,.069)]
for i,(side,a,reach,span) in enumerate(chips):
    cutter=angular_chip_tool(side,a,reach,span,i)
    subtract(cutter,'Deep angular chipped timber edge %02d'%i)
# Irregular wedge-shaped real cuts to end grain, varied depth.
def fissure_tool(side,angle,length,opening,deep,index,branch=False):
    # The previous design was a single tapering triangular wedge.
    # Build a *non-triangular*, crooked channel with asymmetric variable width.
    # Its tip is blunt and irregular; different offsets mimic torn long oak fibers.
    # Eleven samples along radial growth grain; each split has its own asymmetric
    # profile rather than the V09 near-parallel constant-width trench.
    n=13
    inner=.660-length
    # Four phases: open mouth > localized pinch > uneven re-open > hairline tip.
    # Every crack gets a different profile; no identical ring of sawteeth.
    envelopes=[
      [1.00,.88,.61,.36,.19,.31,.55,.66,.40,.23,.14,.07,.018],
      [1.00,.68,.44,.23,.32,.57,.49,.30,.43,.25,.12,.05,.012],
      [1.00,.77,.57,.31,.13,.22,.39,.28,.18,.30,.15,.06,.014],
      [1.00,.92,.53,.39,.26,.16,.31,.61,.37,.19,.11,.04,.011],
      [1.00,.79,.48,.19,.28,.53,.35,.20,.38,.25,.13,.04,.013],
      [1.00,.65,.37,.21,.43,.58,.32,.17,.27,.31,.12,.05,.010],
      [1.00,.79,.52,.31,.15,.24,.43,.32,.21,.14,.10,.04,.010],
      [1.00,.74,.42,.21,.38,.53,.31,.19,.33,.23,.11,.05,.012],
    ]
    envelope=envelopes[index%len(envelopes)]
    # The entrance is only moderately wide; local narrow gaps reveal more timber.
    base=opening*(.95 if branch else (1.18 if index in (0,3) else 1.06))
    left=[];right=[]
    for j in range(n):
        q=j/(n-1)
        rr=.633 + (inner-.633)*q
        drift=(.011*math.sin(3.9*q+index*.89)
               +.0055*math.sin(11.7*q+index*1.23)
               +.0018*math.sin(24*q+index*.59))
        # An asymmetrical pair of splinter edges, not a centered symmetric channel.
        w=base*envelope[j]
        bias=.10*math.sin(8*q+index*1.44)
        left.append((rr,drift-w*(.47+bias)))
        right.append((rr,drift+w*(.53-bias)))
    assert max((right[i][1]-left[i][1]) for i in range(n))/max(.0001,min((right[i][1]-left[i][1]) for i in range(n))) > 10
    contour=left+list(reversed(right))
    vertices=[]
    for x in (side*(.182-deep),side*(.182+.080)):
        for rr,t in contour:
            a=angle+t/max(rr,.32)
            vertices.append((x,rr*math.cos(a),rr*math.sin(a)))
    size=len(contour)
    faces=[tuple(reversed(range(size))),tuple(range(size,2*size))]
    for j in range(size):
        k=(j+1)%size
        faces.append((j,k,size+k,size+j))
    mesh=bpy.data.meshes.new('V11_Irregular_GrainSplit_Cutter_%02d'%index)
    mesh.from_pydata(vertices,[],faces);mesh.update();fix_closed_cutter_normals(mesh)
    cutter=bpy.data.objects.new('TEMP_Fissure_%02d'%index,mesh)
    bpy.context.collection.objects.link(cutter)
    return cutter
cracks=[
 ( 1,.6732,.250,.065,.044),
 ( 1,2.4684,.216,.057,.039),
 ( 1,4.2636,.203,.051,.035),
 (-1,1.12199,.260,.062,.043),
 (-1,2.9172,.225,.056,.038),
 (-1,5.1612,.230,.057,.039),
]
for i,(side,a,length,opening,depth) in enumerate(cracks):
    cutter=fissure_tool(side,a,length,opening,depth,i)
    subtract(cutter,'Crooked branched wood grain fracture %02d'%i)
# Two short tributary breaks fork from existing channels, rather than regular wedges.
branches=[(1,.6732+.061,.125,.017,.016),(-1,2.9172-.043,.109,.013,.015)]
for j,(side,a,length,width,depth) in enumerate(branches):
    cutter=fissure_tool(side,a,length,width,depth,j+13,branch=True)
    subtract(cutter,'Short offshoot fracture %02d'%j)
assert not any(ob.name.startswith('TEMP_') for ob in bpy.data.objects)
# V11: Create an ORIGINAL deterministic, reusable damaged-endgrain PNG texture.
# It is not downloaded external art; generation, embedding and UVs happen within Blender.
import random
rng=random.Random(20261119)
size=512
image=bpy.data.images.new('B2_Generated_Torn_Oak_Endgrain_V11',width=size,height=size,alpha=True)
image.file_format='PNG'
# Long ripped fibers run radially in U; jitter and mixed-frequency channels prevent planks/stripes.
# Multi-scale non-periodic value noise; long grain only a subtle component.
def hash2(x,y):
    v=math.sin(x*127.1+y*311.7)*43758.5453123
    return v-math.floor(v)
def noise(u,v,scale_u,scale_v):
    x=u*scale_u;y=v*scale_v
    ix=math.floor(x);iy=math.floor(y)
    fx=x-ix;fy=y-iy
    sx=fx*fx*(3-2*fx);sy=fy*fy*(3-2*fy)
    a=hash2(ix,iy);b=hash2(ix+1,iy)
    c=hash2(ix,iy+1);d=hash2(ix+1,iy+1)
    return (a+(b-a)*sx)*(1-sy)+(c+(d-c)*sx)*sy
pixels=[]
for yi in range(size):
    v=(yi+.5)/size
    for xi in range(size):
        u=(xi+.5)/size
        warp=(noise(u,v,3.1,4.3)-.5)*.039
        uu=u+warp
        large=noise(uu,v,5.7,8.0)
        chip_noise=noise(uu,v,18,22)
        fibers=noise(uu,v,3.0,112)
        fine=noise(uu,v,23,198)
        fleck=noise(uu,v,48,41)
        jitter=(rng.random()-.5)*.020
        # Old crushed timber: matte brown-gray, broad staining, fine and low-contrast
        # linear grain. No repeated sinusoidal bands / zebra patterns.
        base=.355+.080*(large-.5)+.037*(chip_noise-.5)+.055*(fibers-.5)+.025*(fine-.5)+jitter
        # Occasional subdued exposed wood flecks, not light stripes.
        if fleck>.83 and chip_noise>.60:
            base+=.046
        base=max(.23,min(.46,base))
        pixels.extend((base*.77,base*.59,base*.43,1.0))
image.pixels.foreach_set(pixels)
texture=out/'b2_torn_oak_fracture_albedo_v11.png'
image.filepath_raw=str(texture);image.save();image.pack()
fract=bpy.data.materials.new('V11_generated_torn_oak_cut_faces')
fract.use_nodes=True
nodes=fract.node_tree.nodes;links=fract.node_tree.links
bs=nodes.get('Principled BSDF')
bs.inputs['Roughness'].default_value=.93
bs.inputs['Metallic'].default_value=0
tex=nodes.new('ShaderNodeTexImage');tex.image=image
tex.interpolation='Linear';tex.extension='REPEAT'
tex.location=(-480,120)
links.new(tex.outputs['Color'],bs.inputs['Base Color'])
bw=nodes.new('ShaderNodeRGBToBW')
bw.location=(-250,-130);links.new(tex.outputs['Color'],bw.inputs['Color'])
bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.16
bump.inputs['Distance'].default_value=.006
bump.location=(-50,-120)
links.new(bw.outputs['Val'],bump.inputs['Height'])
links.new(bump.outputs['Normal'],bs.inputs['Normal'])
mat_slot=len(hub.data.materials)
hub.data.materials.append(fract)
uv=hub.data.uv_layers.active or hub.data.uv_layers.new(name='V11_TornTimber')
assigned=0
# Localized only to actual V05 boolean fracture cuts, retaining the V11 photo PBR on intact wood.
angles=[a for side,a,reach,span in chips]+[a for side,a,length,opening,depth in cracks]
def angular_delta(a,b):
    return abs((a-b+math.pi)%(2*math.pi)-math.pi)
for face in hub.data.polygons:
    center=face.center
    r=math.hypot(center.y,center.z)
    a=math.atan2(center.z,center.y)
    # Existing original intact side faces and the bore remain original materials.
    if not(.105 < abs(center.x) < .240 and .365 < r < .67):
        continue
    if min(angular_delta(a,t) for t in angles) > .15:
        continue
    # Newly exposed angled walls have oblique normals, unlike the flat main endgrain.
    n=face.normal
    if abs(n.x)>.985 or (abs(n.x)<.06 and r>.58):
        continue
    face.material_index=mat_slot
    assigned+=1
    for li in face.loop_indices:
        vert=hub.data.vertices[hub.data.loops[li].vertex_index].co
        rr=math.hypot(vert.y,vert.z)
        aa=math.atan2(vert.z,vert.y)
        # U follows radial grain; V measures angular/tangential spread.
        uv.data[li].uv=((rr-.30)*2.55, (aa%(2*math.pi))*1.55)
assert assigned>=12, 'no actual fractured surfaces selected for generated texture'

# Keep all V02 bevels and weighted normals. Remain one hub mesh only.
bpy.ops.object.select_all(action='DESELECT')
hub.select_set(True);bpy.context.view_layer.objects.active=hub
tag='b2_waterwheel_single_wooden_hub_v11'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
hub.select_set(False)
sc=bpy.context.scene
sc.render.engine='CYCLES';sc.cycles.samples=48
sc.render.resolution_x=850;sc.render.resolution_y=850
sc.render.resolution_percentage=100
camera=sc.camera;camera.data.type='ORTHO';camera.data.ortho_scale=1.70
files=[glb,texture]
for name,loc in [('front',(3.0,.35,.35)),('side',(.85,2.95,.8)),
                 ('angle',(2.4,2.0,1.8)),('back',(-2.9,.50,.3))]:
    camera.location=loc
    camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler()
    f=out/(tag+'_'+name+'.png')
    sc.render.filepath=str(f);bpy.ops.render.render(write_still=True)
    files.append(f)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'approval':'NOT_APPROVED','source_v02_blend_sha256':SOURCE_SHA,
    'preserved_original_V02_checkpoint':True,
    'prior_vertices_and_faces':list(before),
    'new_vertices_and_faces':[len(hub.data.vertices),len(hub.data.polygons)],
    'outer_corner_chips':len(chips),'deep_endgrain_wedges':len(cracks),'nontriangular_crooked_fissures':len(cracks),'secondary_branches':len(branches),'fissure_width_mode':'per-crack multistage pinches and widening, tapered hairline tips','width_max_min_ratio_gt':10,'mouth_at_real_wood_edge_radius_m':.633,
    'original_bore_radius_m':.303,'original_radial_socket_count':14,
    'boolean_solver':'EXACT','wood_photo_source':'https://polyhaven.com/a/fine_grained_wood',
    'user_review_needed':True,'fracture_texturing':'generated original PNG, packed in GLB and Blend', 'fracture_material_polygons':assigned,'texture_resolution':[512,512],'fracture_basecolor_filename':texture.name,'files':{}}
for f in files:
    by=f.read_bytes()
    manifest['files'][f.name]={'bytes':len(by),'sha256':hashlib.sha256(by).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('B2_HUB_V11_VISIBLE_TAPERED_FISSURES_RENDERED',assigned,flush=True)
