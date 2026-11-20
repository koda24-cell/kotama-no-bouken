"""F3 Concrete Rubble01 V7: numerical design FIRST.
See docs/3d/F3_CONCRETE_RUBBLE01_V7_DIMENSIONAL_DESIGN_20261120.md
Independent 450x310x120 mm former slab, broken edge, aggregate in the fracture.
Keeps V1-3 unchanged. Blender 5.3 renders 4 views and exports original GLB.
"""
import bpy,math,random,os
from mathutils import Vector
OUT="/work/out/f3_concrete_rubble01_v7"
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(620204)
W,D,T=.450,.310,.120
# 24 points trace a once-rectangular piece; three deep corner chips and
# eight smaller scallops. Keep long intact facets, not a radial star silhouette.
pts=[
 (-.225,-.132),(-.203,-.155),(-.137,-.151),(-.104,-.145),
 (-.072,-.132),(-.054,-.155),(.027,-.155),(.071,-.147),
 (.117,-.155),(.166,-.151),(.209,-.114),(.225,-.082),
 (.225,-.015),(.218,.035),(.221,.097),(.197,.137),
 (.145,.155),(.096,.145),(.056,.155),(-.022,.155),
 (-.074,.144),(-.128,.155),(-.195,.136),(-.225,.094),
 (-.225,.034),(-.208,-.022),(-.225,-.091)
]
# Insert non-uniform midpoint detail along each edge of the inherited V6 outline.
# 27 -> 54 perimeter stations: large broken surfaces, not a sawtooth/star pattern.
source=pts[:]
pts=[]
for k,p in enumerate(source):
 q=source[(k+1)%len(source)]
 pts.append(p)
 mid=((p[0]+q[0])*.5,(p[1]+q[1])*.5)
 # A handful of local chipped edges; retain original exterior bbox.
 tangent=Vector((q[0]-p[0],q[1]-p[1]))
 outward=Vector((tangent.y,-tangent.x))
 if outward.length>1.e-6:outward.normalize()
 if outward.dot(Vector(mid))<0:outward=-outward
 amp=.004*math.sin(k*2.63+1.9)
 if k in (3,11,22):amp=-.013
 if k in (7,14,18,24):amp=-.008
 pts.append((mid[0]+outward.x*amp,mid[1]+outward.y*amp))
N=len(pts)
# Datum-aligned lower, mid broken side and upper corners. Upper interior
# remains comparatively planar; side rings create 8–20 mm relief.
verts=[]
for ring in range(5):
 for k,(x,y) in enumerate(pts):
  a=math.atan2(y/(D/2),x/(W/2))
  # Exactly the same planar footprint, slightly eroded fracture midsection.
  # x,y offsets are kept modest; roughness is primarily on side edge.
  base_levels=(-.061,-.040,-.009,.025,.051)
  # 3 major chips deepen the mid-break face, not the flat central top.
  distance=min(min(abs(k-m),N-abs(k-m)) for m in (6,22,44))
  dent=max(0.,1.-distance/4.0)*(.022 if ring in (1,2,3) else .006)
  ripple=(.013*math.sin(k*.81+.2)+.005*math.cos(k*.54)) if ring in (1,2,3) else 0.
  swell=ripple-dent
  dx=(x/W)*swell;dy=(y/D)*swell
  z=base_levels[ring]+(.010 if ring in (1,2,3) else .003)*math.sin(k*.71+.1)
  z+=rng.uniform(-.004,.004) if ring in (1,2,3) else rng.uniform(-.0015,.0015)
  verts.append((x+dx,y+dy,z))
# Inset central top "cast surface" and bottom: these vertices make readable
# intact area instead of top-down star, no floating pieces.
for k,(x,y) in enumerate(pts):
 z=.052+.002*math.sin(k*.63)
 verts.append((x*.80,y*.80,z))
center_idx=len(verts)
verts.append((0,0,.051))
bottom_idx=len(verts)
verts.append((0,0,-.059))
TOP=5*N
faces=[]
# side 3 rings
for ring in range(4):
 for i in range(N):
  j=(i+1)%N
  faces.append((ring*N+i,ring*N+j,(ring+1)*N+j))
  faces.append((ring*N+i,(ring+1)*N+j,(ring+1)*N+i))
# top fracture border between 100% ring and 80% footprint, long fractured facets
for i in range(N):
 j=(i+1)%N
 faces.append((4*N+i,4*N+j,TOP+j))
 faces.append((4*N+i,TOP+j,TOP+i))
# flat central top triangulated, mostly planar
for i in range(N):
 j=(i+1)%N
 faces.append((center_idx,TOP+i,TOP+j))
# bottom faces
for i in range(N):
 j=(i+1)%N
 faces.append((bottom_idx,j,i))
mesh=bpy.data.meshes.new('F3_RUBBLE_V7_CORE_FRACTURE')
mesh.from_pydata(verts,[],faces);mesh.update()
body=bpy.data.objects.new('F3_CONCRETE_RUBBLE01_V7',mesh)
bpy.context.collection.objects.link(body)
uv=mesh.uv_layers.new(name='concrete_uv')
# Separate side UV unwrapping: circumference × height, not top-down projection.
# Fixes artificially vertical-streaked broken faces in V4.
lengths=[0.]
for i in range(1,N):
 a,b=pts[i-1],pts[i]
 lengths.append(lengths[-1]+math.hypot(a[0]-b[0],a[1]-b[1]))
perimeter=lengths[-1]+math.dist(pts[-1],pts[0])
for idx,poly in enumerate(mesh.polygons):
 for li in poly.loop_indices:
  vi=mesh.loops[li].vertex_index
  co=mesh.vertices[vi].co
  if idx<8*N:
   # Side uses arc length along perimeter; z varies across both face triangles.
   uv.data[li].uv=(lengths[vi%N]/perimeter,(co.z+.070)/.140)
  else:
   uv.data[li].uv=((co.x+.225)/.450,(co.y+.155)/.310)
# 512×512 self-authored PBR: no photo lighting baked into base-color.
S=512
albedo=bpy.data.images.new('F3_RUBBLE01_V7_ALBEDO_512',width=S,height=S,alpha=False)
rough=bpy.data.images.new('F3_RUBBLE01_V7_ROUGHNESS_512',width=S,height=S,alpha=False)
cols=[];roughs=[]
prng=random.Random(620415)
for y in range(S):
 v=y/(S-1)
 for x in range(S):
  u=x/(S-1)
  n=prng.uniform(-.038,.038)
  fine=.029*math.sin(u*77+v*22)*math.cos(u*32-v*91)
  seam=.065*max(0.,math.sin(17*u+12*v)*math.cos(19*v-4*u))
  stain=.095*math.exp(-((u-.81)/.19)**2-((v-.31)/.14)**2)
  amount=n+fine-seam-stain
  c=tuple(max(.04,min(.61,t+amount)) for t in (.31,.315,.299))
  cols.extend((*c,1))
  r=min(.99,max(.73,.89+.12*seam+.03*n))
  roughs.extend((r,r,r,1.0))
albedo.pixels[:]=cols;rough.pixels[:]=roughs
for im in (albedo,rough):
 im.filepath_raw=OUT+'/'+im.name+'.png';im.file_format='PNG';im.save()
mat=bpy.data.materials.new('F3_OLD_CONCRETE_INTACT_AND_FRACTURE')
mat.use_nodes=True
shader=mat.node_tree.nodes.get('Principled BSDF')
shader.inputs['Metallic'].default_value=0
a=mat.node_tree.nodes.new('ShaderNodeTexImage')
a.image=albedo
mat.node_tree.links.new(a.outputs['Color'],shader.inputs['Base Color'])
r=mat.node_tree.nodes.new('ShaderNodeTexImage')
rough.colorspace_settings.name='Non-Color';r.image=rough
mat.node_tree.links.new(r.outputs['Color'],shader.inputs['Roughness'])
mesh.materials.append(mat)
# Second material for exposed fracture surfaces: same Albedo / Roughness maps,
# but shifted towards a damp dark-gray interior. Noise-based bump gives
# small recessed aggregate impressions without large polygon cost.
fracture=mat.copy()
fracture.name='F3_CONCRETE_BROKEN_INTERIOR'
fp=fracture.node_tree.nodes.get('Principled BSDF')
mix=fracture.node_tree.nodes.new('ShaderNodeMixRGB')
mix.blend_type='MULTIPLY'
mix.inputs[0].default_value=.47
mix.inputs[2].default_value=(.66,.67,.65,1)
orig=[n for n in fracture.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and 'ALBEDO' in n.image.name][0]
fracture.node_tree.links.new(orig.outputs['Color'],mix.inputs[1])
fracture.node_tree.links.new(mix.outputs['Color'],fp.inputs['Base Color'])
noise=fracture.node_tree.nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value=76
noise.inputs['Detail'].default_value=3
bump=fracture.node_tree.nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value=.25
bump.inputs['Distance'].default_value=.0025
fracture.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height'])
fracture.node_tree.links.new(bump.outputs['Normal'],fp.inputs['Normal'])
mesh.materials.append(fracture)
for i,p in enumerate(mesh.polygons):
 if i<8*N:p.material_index=1
aggmat=bpy.data.materials.new('F3_FRACTURE_EMBEDDED_AGGREGATE')
aggmat.use_nodes=True
bs=aggmat.node_tree.nodes.get('Principled BSDF')
bs.inputs['Base Color'].default_value=(.235,.233,.218,1)
bs.inputs['Roughness'].default_value=.91
# Embed twelve stones in roughly vertical fracture side between top/bottom rings.
# Sphere-centre is moved INSIDE the core by 75% of radius, so only an
# irregular dark stone patch is exposed (max approx 2 mm).
agg=[]
indices=[2,6,10,14,18,22,26,30,34,38,44,50]
for i,k in enumerate(indices):
 x,y=pts[k]
 neigh0=Vector(pts[(k-1)%N]);neigh1=Vector(pts[(k+1)%N])
 tan=(neigh1-neigh0).normalized()
 normal=Vector((tan.y,-tan.x))  # polygon CCW, this is outward
 center=Vector((x,y))
 # Determine outward by dot against centroid
 if normal.dot(center)<0:normal=-normal
 radius=rng.uniform(.0040,.0080) # diameter 9–19 mm
 # Place 80% of radius behind surface. Outward overlap <=2.5 mm
 inside=radius*.96
 px=x-normal.x*inside
 py=y-normal.y*inside
 pz=rng.uniform(-.033,.022)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(px,py,pz))
 stone=bpy.context.object
 stone.name='F3_RUBBLE01_BURIED_AGGREGATE'
 stone.scale=(radius*.9,radius*.9,radius*.9)
 stone.rotation_euler=(rng.random()*3,rng.random()*3,rng.random()*3)
 stone.data.materials.append(aggmat)
 agg.append(stone)
# Combine 12 aggregates into one material batch.
bpy.ops.object.select_all(action='DESELECT')
for stone in agg:stone.select_set(True)
bpy.context.view_layer.objects.active=agg[0]
bpy.ops.object.join()
bpy.context.view_layer.objects.active.name='F3_RUBBLE01_V7_AGGREGATE_BATCH'
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.context.view_layer.objects.active=body
bpy.context.view_layer.objects.get('F3_RUBBLE01_V7_AGGREGATE_BATCH').select_set(True)
stem='f3_concrete_rubble01_v7'
bpy.ops.export_scene.gltf(filepath=OUT+'/'+stem+'.glb',export_format='GLB',
                          use_selection=True,export_apply=True)
# Dimension assertions against original core mesh, prior to GLB.
minv=[min(p[i] for p in verts) for i in range(3)]
maxv=[max(p[i] for p in verts) for i in range(3)]
bbox=[maxv[i]-minv[i] for i in range(3)]
assert .435<=bbox[0]<=.465,('width',bbox)
assert .295<=bbox[1]<=.325,('depth',bbox)
assert .095<=bbox[2]<=.145,('height',bbox)
print('F3_RUBBLE_V7_DIMENSIONS_MM',*[round(v*1000,2) for v in bbox],flush=True)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=36
scene.render.resolution_x=840;scene.render.resolution_y=840
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=True
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=-.35
world=bpy.data.worlds.new('F3_ROUGH_CONCRETE_DAYLIGHT')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.75,.79,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.75
scene.world=world
for pos,power,size in [((-1,-1,1.4),150,1.2),((.9,.7,1),90,1.35)]:
 bpy.ops.object.light_add(type='AREA',location=pos)
 l=bpy.context.object;l.data.energy=power;l.data.size=size
bpy.ops.object.camera_add()
cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/'+stem+'.blend')
focus=Vector((0,0,-.005))
for name,d,scale in [
 ('front',(0,-1,.35),.70),
 ('side',(1,-.15,.38),.70),
 ('angle',(1,-1,.95),.72),
 ('fracture_detail',(1,-1,.12),.27)
]:
 cam.data.ortho_scale=scale
 cam.location=focus+Vector(d).normalized()*1.35
 cam.rotation_euler=(focus-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=OUT+'/'+stem+'-'+name+'.png'
 bpy.ops.render.render(write_still=True)
 print('F3_RUBBLE_V7_RENDER_OK',name,flush=True)
print('F3_RUBBLE_V7_ALL_COMPLETE',flush=True)
