"""F3 Concrete Rubble01 V24: numerical design FIRST.
See docs/3d/F3_CONCRETE_RUBBLE01_V24_DIMENSIONAL_DESIGN_20261120.md
Independent 450x310x120 mm former slab, broken edge, aggregate in the fracture.
Keeps V1-3 unchanged. Blender 5.3 renders 4 views and exports original GLB.
"""
import bpy,math,random,os,bmesh
from mathutils import noise
from mathutils import Vector
OUT="/work/out/f3_concrete_rubble01_v24"
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(620204)
W,D,T=.450,.310,.120
# V24 independent topology: one nonrectangular broken slab and actual cliff wall.
# Polygon traverses CCW, with a missing front-right material wedge.
raw=[
 (-.225,-.132),(-.203,-.155),(-.140,-.149),(-.099,-.141),
 (-.057,-.154),(.015,-.145),(.070,-.120),(.098,-.102),
 (.109,-.070),(.141,-.030),(.176,.005),(.221,.038),
 (.221,.096),(.196,.138),(.145,.155),(.091,.147),
 (.044,.155),(-.022,.148),(-.074,.139),(-.127,.155),
 (-.194,.137),(-.225,.093),(-.195,.033),(-.199,-.026),(-.225,-.091)
]
pts=[]
for i,p in enumerate(raw):
 q=raw[(i+1)%len(raw)]
 pts.append(p)
 # unequal chipped midpoints rather than evenly sampled sinusoidal walls
 if i in (1,4,7,10,12,15,18,22):
  pts.append((.52*p[0]+.48*q[0]+.002*math.sin(i*2.7),
              .52*p[1]+.48*q[1]+.002*math.cos(i*2.1)))
N=len(pts)
verts=[]
# Three side levels and surviving former cast exterior upper rim.
for ring in range(4):
 for k,(x,y) in enumerate(pts):
  nx=noise.noise(Vector((x*43,y*43,ring*2.2+1.0)))
  nz=noise.noise(Vector((x*58,y*58,ring*1.8+3.2)))
  levels=(-.061,-.034,.009,.048)
  z=levels[ring]+(.0028 if ring<3 else .0035)*nz
  offset=(.0018*nx if ring in (1,2) else 0.)
  verts.append((x+offset,y-offset*.6,z))
# Inner angular footprint is deliberately offset towards rear, uneven,
# rather than a circular concentric crater.
for ring in (4,5,6):
 for k,(x,y) in enumerate(pts):
  phi=math.atan2(y,x)
  jag=.055*math.sin(k*1.62)+.035*math.sin(k*.71+1.4)
  scale=(.63 if ring in (4,5) else .33)+jag
  xx=x*scale+.013
  yy=y*scale+.008
  # Crack top/lower rims exactly share XY: true vertical broken wall.
  if ring==4:z=.047+.0035*noise.noise(Vector((xx*55,yy*55,4.0)))
  elif ring==5:
   depth=.023+.008*max(0.,math.sin(k*.61+.7))
   z=.047-depth+.0015*noise.noise(Vector((xx*77,yy*77,2.0)))
  else:z=.016+.006*noise.noise(Vector((xx*32,yy*32,7.0)))
  verts.append((xx,yy,z))
CENTER=len(verts)
verts.append((.013,.008,.018))
BOTTOM=len(verts)
verts.append((0.,0.,-.063))
faces=[]
roles=[]
def tri(a,b,c,material):
 faces.append((a,b,c));roles.append(material)
# Side and fractured top apron and center depression.
for ring in range(6):
 for k in range(N):
  j=(k+1)%N
  a=ring*N+k;b=ring*N+j
  c=(ring+1)*N+j;d=(ring+1)*N+k
  mat=1 if ring in (0,1,2,4,5) else (0 if k>int(N*.55) else 1)
  # For ring 4 coincident XY creates the explicit 23-31mm fracture-wall.
  if k%3==0:
   tri(a,b,d,mat);tri(b,c,d,mat)
  else:
   tri(a,b,c,mat);tri(a,c,d,mat)
for k in range(N):
 j=(k+1)%N
 tri(CENTER,6*N+k,6*N+j,1)
 tri(BOTTOM,j,k,1)
mesh=bpy.data.meshes.new('F3_RUBBLE_V24_BROKEN_SECTION')
mesh.from_pydata(verts,[],faces);mesh.update()
body=bpy.data.objects.new('F3_CONCRETE_RUBBLE01_V24',mesh)
bpy.context.collection.objects.link(body)
uv=mesh.uv_layers.new(name='concrete_uv')
for poly in mesh.polygons:
 for loopidx in poly.loop_indices:
  vi=mesh.loops[loopidx].vertex_index
  co=mesh.vertices[vi].co
  if vi<4*N or (4*N<=vi<6*N):
   ang=(math.atan2(co.y/.155,co.x/.225)+math.pi)/(2*math.pi)
   uv.data[loopidx].uv=(ang,(co.z+.071)/.145)
  else:
   uv.data[loopidx].uv=((co.x+.225)/.45,(co.y+.155)/.31)
# Manifold checks on the intentional closed-shell connectivity.
edge_usage={}
for f in faces:
 for a,b in zip(f,(f[1],f[2],f[0])):
  key=(min(a,b),max(a,b))
  edge_usage[key]=edge_usage.get(key,0)+1
bad=[(edge,n) for edge,n in edge_usage.items() if n!=2]
assert not bad,('nonmanifold topology',bad[:8],len(bad))
assert len(roles)==len(mesh.polygons)
print('F3_RUBBLE_V24_TOPOLOGY_OK',len(mesh.vertices),len(mesh.polygons),flush=True)

# 512×512 self-authored PBR: no photo lighting baked into base-color.
S=512
albedo=bpy.data.images.new('F3_RUBBLE01_V24_ALBEDO_512',width=S,height=S,alpha=False)
rough=bpy.data.images.new('F3_RUBBLE01_V24_ROUGHNESS_512',width=S,height=S,alpha=False)
cols=[];roughs=[]
prng=random.Random(620415)
for y in range(S):
 v=y/(S-1)
 for x in range(S):
  u=x/(S-1)
  n=prng.uniform(-.038,.038)
  fine=.011*math.sin(u*77+v*22)*math.cos(u*32-v*91)
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
normal_image=bpy.data.images.new('F3_RUBBLE01_V24_GRAIN_NORMAL_512',width=512,height=512,alpha=False)
normal_pixels=[]
# Isotropic micro-grain with no orientation: avoids V10's horizontal lines.
grain_random=random.Random(115310)
for iy in range(512):
 for ix in range(512):
  nx=grain_random.uniform(-.11,.11)
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
sideimg=bpy.data.images.new('F3_RUBBLE01_V24_FRACTURE_ALBEDO_512',width=512,height=512,alpha=False)
tex_rnd=random.Random(83219)
stone_points=[]
for i in range(24):
 u=([1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,44,48,52][i]/N)
 v=.20+.60*tex_rnd.random()
 stone_points.append((u,v,.004+.006*tex_rnd.random(),.016+.022*tex_rnd.random()))
sp=[]
for yy in range(512):
 v=yy/511
 for xx in range(512):
  u=xx/511
  speck=tex_rnd.uniform(-.029,.029)
  coarse=.018*math.sin(u*57+v*32)*math.cos(v*49-u*23)
  stain=.055*max(0,math.sin(13*u+v*7)*math.cos(v*19))
  stone=0.
  for sx,sy,sw,sh in stone_points:
   du=min(abs(u-sx),1-abs(u-sx))
   dv=abs(v-sy)
   curve=math.sin((u-sx)*126+sy*33)*.003
   rr=((du+curve)/sw)**2+(dv/sh)**2
   if rr<1:
    stone=max(stone,.065-.036*max(0,rr-.48))
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
 face.material_index=roles[i]
 # Avoid a faceted volcanic rock appearance on the old lower side, but keep
 # newly exposed inner wall and angular break rim as properly hard edges.
 face.use_smooth=(roles[i]==1 and face.center.z<-.018)
# Do not triangulate or boolean the rebuilt shell after manifold validation.
# Export the single concrete chunk, with material splits only (2 primitives).
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.context.view_layer.objects.active=body
stem='f3_concrete_rubble01_v24'
bpy.ops.export_scene.gltf(filepath=OUT+'/'+stem+'.glb',export_format='GLB',
                          use_selection=True,export_apply=True)
# Verify measured model and footprint before exporting.
minv=[min(p[i] for p in verts[:-2]) for i in range(3)]
maxv=[max(p[i] for p in verts[:-2]) for i in range(3)]
bbox=[maxv[i]-minv[i] for i in range(3)]
assert .425<=bbox[0]<=.465,('width',bbox)
assert .290<=bbox[1]<=.330,('depth',bbox)
assert .095<=bbox[2]<=.145,('height',bbox)
print('F3_RUBBLE_V24_DIMENSIONS_MM',*[round(v*1000,2) for v in bbox],flush=True)
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
 ('top',(0,-.22,1.0),.68),
 ('fracture_detail',(1,-1,.12),.27)
]:
 cam.data.ortho_scale=scale
 cam.location=focus+Vector(d).normalized()*1.35
 cam.rotation_euler=(focus-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=OUT+'/'+stem+'-'+name+'.png'
 bpy.ops.render.render(write_still=True)
 print('F3_RUBBLE_V24_RENDER_OK',name,flush=True)
print('F3_RUBBLE_V24_ALL_COMPLETE',flush=True)
