"""F3 Concrete Rubble01 V14: numerical design FIRST.
See docs/3d/F3_CONCRETE_RUBBLE01_V14_DIMENSIONAL_DESIGN_20261120.md
Independent 450x310x120 mm former slab, broken edge, aggregate in the fracture.
Keeps V1-3 unchanged. Blender 5.3 renders 4 views and exports original GLB.
"""
import bpy,math,random,os
from mathutils import Vector
OUT="/work/out/f3_concrete_rubble01_v14"
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(620204)
W,D,T=.450,.310,.120
# 24 points trace a once-rectangular piece; three deep corner chips and
# eight smaller scallops. Keep long intact facets, not a radial star silhouette.
pts=[
 (-.225,-.132),(-.203,-.155),(-.137,-.151),(-.104,-.145),
 (-.072,-.132),(-.054,-.155),(.027,-.149),(.071,-.115),
 (.117,-.136),(.166,-.151),(.209,-.114),(.225,-.082),
 (.225,-.015),(.218,.035),(.221,.097),(.197,.137),
 (.145,.155),(.096,.145),(.056,.155),(-.022,.155),
 (-.074,.144),(-.128,.155),(-.195,.136),(-.225,.094),
 (-.195,.034),(-.198,-.022),(-.225,-.091)
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
for ring in range(6):
 for k,(x,y) in enumerate(pts):
  a=math.atan2(y/(D/2),x/(W/2))
  # Exactly the same planar footprint, slightly eroded fracture midsection.
  # x,y offsets are kept modest; roughness is primarily on side edge.
  base_levels=(-.061,-.045,-.025,.003,.030,.051)
  # 3 major chips deepen the mid-break face, not the flat central top.
  distance=min(min(abs(k-m),N-abs(k-m)) for m in (6,22,44))
  dent=max(0.,1.-distance/4.0)*(.022 if ring in (1,2,3,4) else .006)
  ripple=(.016*math.sin(k*.46+ring*.93)+.008*math.cos(k*.97-ring*.66)) if ring in (1,2,3) else 0.
  # Shift side tiers tangentially so fracture faces aren't vertical stripes.
  near=Vector(pts[(k-1)%N]);nxt=Vector(pts[(k+1)%N])
  tangent=(nxt-near).normalized()
  lateral=(.013*math.sin(k*.43+ring*1.81)+.006*math.cos(k*.87-ring*.91)) if ring in (1,2,3,4) else 0.
  swell=ripple-dent
  dx=(x/W)*swell+tangent.x*lateral
  dy=(y/D)*swell+tangent.y*lateral
  # Three genuine crumbled upper rim notches (max depth 24mm).
  ch=0.
  for pos,depth,span in ((8,.019,4.0),(27,.024,5.3),(46,.015,3.7)):
   d=min(abs(k-pos),N-abs(k-pos))
   ch=max(ch,depth*max(0.,1.-d/span))
  # V14: deliberately non-parallel fractured ledges; each height band
  # uses different low-frequency phase to prevent a vertically cleaved pillar.
  wave=(.009*math.sin(k*.37+ring*1.31)+.005*math.sin(k*.91-ring*.73))
  ledge=(.007*math.sin(k*.16+ring*2.1)) if ring in (1,2,3,4) else 0.
  z=base_levels[ring]+(wave+ledge if ring in (1,2,3,4) else .0025*math.sin(k*.71+ring*.37))
  if ring==5:z-=ch
  elif ring==4:z-=ch*.35
  elif ring==3:z-=ch*.18
  z+=rng.uniform(-.004,.004) if ring in (1,2,3,4) else rng.uniform(-.0015,.0015)
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
TOP=6*N
faces=[]
# side 3 rings
for ring in range(5):
 for i in range(N):
  j=(i+1)%N
  if (i+ring)%3==0:
   faces.append((ring*N+i,ring*N+j,(ring+1)*N+i))
   faces.append((ring*N+j,(ring+1)*N+j,(ring+1)*N+i))
  else:
   faces.append((ring*N+i,ring*N+j,(ring+1)*N+j))
   faces.append((ring*N+i,(ring+1)*N+j,(ring+1)*N+i))
# top fracture border between 100% ring and 80% footprint, long fractured facets
for i in range(N):
 j=(i+1)%N
 faces.append((5*N+i,5*N+j,TOP+j))
 faces.append((5*N+i,TOP+j,TOP+i))
# flat central top triangulated, mostly planar
for i in range(N):
 j=(i+1)%N
 faces.append((center_idx,TOP+i,TOP+j))
# bottom faces
for i in range(N):
 j=(i+1)%N
 faces.append((bottom_idx,j,i))
# Fit verified overall bounding box inside the 465x325mm design tolerance.
verts=[(x*.991,y*.984,z) for x,y,z in verts]
mesh=bpy.data.meshes.new('F3_RUBBLE_V14_CORE_FRACTURE')
mesh.from_pydata(verts,[],faces);mesh.update()
body=bpy.data.objects.new('F3_CONCRETE_RUBBLE01_V14',mesh)
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
  if idx<10*N:
   # Side uses arc length along perimeter; z varies across both face triangles.
   uv.data[li].uv=(lengths[vi%N]/perimeter,(co.z+.070)/.140)
  else:
   uv.data[li].uv=((co.x+.225)/.450,(co.y+.155)/.310)
# 512×512 self-authored PBR: no photo lighting baked into base-color.
S=512
albedo=bpy.data.images.new('F3_RUBBLE01_V14_ALBEDO_512',width=S,height=S,alpha=False)
rough=bpy.data.images.new('F3_RUBBLE01_V14_ROUGHNESS_512',width=S,height=S,alpha=False)
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
  # Asymmetric ingrained weathering; four patches, no evenly spaced grid.
  old_spots=(.11*math.exp(-((u-.17)/.09)**2-((v-.78)/.15)**2)
      +.07*math.exp(-((u-.63)/.14)**2-((v-.24)/.10)**2)
      +.10*math.exp(-((u-.82)/.08)**2-((v-.67)/.17)**2)
      +.045*math.exp(-((u-.40)/.11)**2-((v-.53)/.09)**2))
  amount=n+fine*.78-seam*.73-stain-old_spots
  c=tuple(max(.04,min(.61,t+amount)) for t in (.31,.315,.299))
  cols.extend((*c,1))
  r=min(.99,max(.73,.89+.12*seam+.03*n))
  roughs.extend((r,r,r,1.0))
albedo.pixels[:]=cols;rough.pixels[:]=roughs
for im in (albedo,rough):
 im.filepath_raw=OUT+'/'+im.name+'.png';im.file_format='PNG';im.save()
# Tangent-space fine normal map: grain-scale micro-pits, 512px, no extra geometry.
normal_image=bpy.data.images.new('F3_RUBBLE01_V14_GRAIN_NORMAL_512',width=512,height=512,alpha=False)
normal_pixels=[]
# Isotropic micro-grain with no orientation: avoids V10's horizontal lines.
grain_random=random.Random(115310)
for iy in range(512):
 for ix in range(512):
  nx=grain_random.uniform(-.085,.085)
  ny=grain_random.uniform(-.085,.085)
  nz=1.0
  ll=math.sqrt(nx*nx+ny*ny+nz*nz)
  normal_pixels.extend((.5+.5*nx/ll,.5+.5*ny/ll,.5+.5*nz/ll,1))
normal_image.pixels[:]=normal_pixels
normal_image.filepath_raw=OUT+'/'+normal_image.name+'.png'
normal_image.file_format='PNG';normal_image.save()
normal_image.colorspace_settings.name='Non-Color'
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
nn=mat.node_tree.nodes.new('ShaderNodeTexImage');nn.image=normal_image
nmap=mat.node_tree.nodes.new('ShaderNodeNormalMap')
nmap.inputs['Strength'].default_value=.38
mat.node_tree.links.new(nn.outputs['Color'],nmap.inputs['Color'])
mat.node_tree.links.new(nmap.outputs['Normal'],shader.inputs['Normal'])
mesh.materials.append(mat)
# Actual side-wall texture: aggregate grains are COPLANAR embedded patches,
# not white 3D spheres protruding out of the wall.
sideimg=bpy.data.images.new('F3_RUBBLE01_V14_FRACTURE_ALBEDO_512',width=512,height=512,alpha=False)
tex_rnd=random.Random(83219)
stone_points=[]
for i in range(18):
 u=([1,3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,52][i]/N)
 v=.20+.60*tex_rnd.random()
 stone_points.append((u,v,.004+.006*tex_rnd.random(),.016+.022*tex_rnd.random()))
sp=[]
for yy in range(512):
 v=yy/511
 for xx in range(512):
  u=xx/511
  speck=tex_rnd.uniform(-.029,.029)
  coarse=.030*math.sin(u*57+v*32)*math.cos(v*49-u*23)
  stain=.055*max(0,math.sin(13*u+v*7)*math.cos(v*19))
  stone=0.
  for sx,sy,sw,sh in stone_points:
   du=min(abs(u-sx),1-abs(u-sx))
   dv=abs(v-sy)
   curve=math.sin((u-sx)*126+sy*33)*.003
   rr=((du+curve)/sw)**2+(dv/sh)**2
   if rr<1:
    stone=max(stone,.045-.026*max(0,rr-.48))
  # branching fissures of 0.8–3.0mm in section UV (not uniform thickness).
  fissure=0.
  for a,b,phase in ((.17,.25,.3),(.58,.66,1.1),(.82,.43,2.3)):
   path=a+.020*math.sin(v*6+phase)+.006*math.sin(v*29+phase)
   dist=min(abs(u-path),1-abs(u-path))
   fissure=max(fissure,max(0,1-dist/(.0015+.002*v))*max(0,1-abs(v-b)/.30))
  base=.29+speck+coarse-stain+stone-.12*fissure
  sp.extend((max(.03,base*.98),max(.03,base),max(.03,base*.95),1))
sideimg.pixels[:]=sp
sideimg.filepath_raw=OUT+'/'+sideimg.name+'.png';sideimg.file_format='PNG';sideimg.save()
fracture=mat.copy()
fracture.name='F3_CONCRETE_BROKEN_INTERIOR_WITH_EMBEDDED_STONES'
fp=fracture.node_tree.nodes.get('Principled BSDF')
for node in list(fracture.node_tree.nodes):
 if node.type=='TEX_IMAGE' and node.image and 'ALBEDO' in node.image.name:node.image=sideimg
for node in fracture.node_tree.nodes:
 if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=.43
mesh.materials.append(fracture)
for i,face in enumerate(mesh.polygons):
 if i<10*N:face.material_index=1
# Export the single concrete chunk, with material splits only (2 primitives).
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.context.view_layer.objects.active=body
stem='f3_concrete_rubble01_v14'
bpy.ops.export_scene.gltf(filepath=OUT+'/'+stem+'.glb',export_format='GLB',
                          use_selection=True,export_apply=True)
# Dimension assertions against original core mesh, prior to GLB.
minv=[min(p[i] for p in verts) for i in range(3)]
maxv=[max(p[i] for p in verts) for i in range(3)]
bbox=[maxv[i]-minv[i] for i in range(3)]
assert .430<=bbox[0]<=.470,('width',bbox)
assert .290<=bbox[1]<=.330,('depth',bbox)
assert .095<=bbox[2]<=.145,('height',bbox)
print('F3_RUBBLE_V14_DIMENSIONS_MM',*[round(v*1000,2) for v in bbox],flush=True)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=36
scene.render.resolution_x=840;scene.render.resolution_y=840
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=True
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=-.42
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
 print('F3_RUBBLE_V14_RENDER_OK',name,flush=True)
print('F3_RUBBLE_V14_ALL_COMPLETE',flush=True)
