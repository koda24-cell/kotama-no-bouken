"""V10 one-piece waterwheel scoop: retain photo-PBR timber, replace fake spikes
with attached fluted ice clusters and suppress superficial line meshes.
"""
import bpy,sys,json,hashlib,random,math
from pathlib import Path
from mathutils import Vector
inp=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
expected='1944077419d665912a63f5895a85830e0ba3984865fd263b382f92638ae1d65b'
sha=hashlib.sha256(inp.read_bytes()).hexdigest()
if sha!=expected:raise RuntimeError('wrong V09 BLEND')
bpy.ops.wm.open_mainfile(filepath=str(inp))
# Preserve original solid wooden scoop and all iron. Only discard trial decorations
# that have been independently archived in the V07/V09 artifact snapshots.
removed=[]
for ob in list(bpy.data.objects):
 if ob.name.startswith(('hanging_lip_icicle','V08 underside asymmetric ice','shallow_split_')):
  removed.append(ob.name);bpy.data.objects.remove(ob,do_unlink=True)
wood=bpy.data.objects.get('solid_curved_scoop_timbers')
assert wood and wood.type=='MESH'
ice=bpy.data.materials.get('V08 ice blue gray')
assert ice is not None
snow=bpy.data.materials.get('V08 irregular thin granular frost')
rng=random.Random(10282026)
def ice_mesh(name,x,y,z,length,w):
 N=10
 verts=[];faces=[]
 # multilayer ice is a non-symmetric tapered freeform volume, not a cone primitive
 phases=[(0,.90),(.09,.96),(.30,.78),(.62,.44),(.9,.20),(1.0,.045)]
 for k,(depth,sc) in enumerate(phases):
  zz=z-depth*length
  cx=x+math.sin(depth*3.1+k*.2)*w*.25
  cy=y-math.sin(depth*2.5)*w*.20
  for j in range(N):
   a=math.tau*j/N
   rr=w*sc*(1+.13*math.sin(3*a+k*.9)+.09*math.sin(5*a+2.0+k*.5))
   verts.append((cx+rr*math.cos(a),cy+rr*.73*math.sin(a),zz))
 for k in range(len(phases)-1):
  for j in range(N):
   a=k*N+j;b=k*N+(j+1)%N;c=(k+1)*N+(j+1)%N;d=(k+1)*N+j
   faces.append((a,b,c,d))
 faces.append(tuple(reversed(tuple(range(N)))))
 faces.append(tuple((len(phases)-1)*N+j for j in range(N)))
 data=bpy.data.meshes.new(name+'_mesh')
 data.from_pydata(verts,[],faces);data.update()
 ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob)
 ob.data.materials.append(ice)
 for poly in data.polygons:poly.use_smooth=True
 return ob
# Attach to front underside edge where base timber terminates (front face y≈ -0.33).
positions=[(-.51,.052,.012),(-.35,.039,.010),(-.19,.077,.016),(-.08,.033,.009),
           (.13,.062,.015),(.37,.041,.012),(.49,.057,.014)]
for i,(x,length,width) in enumerate(positions):
 z=-.402+.009*math.sin(36*x)
 y=-.33+.027*(x/.62)**2
 ice_mesh('V10 adherent uneven icicle %02d'%i,x,y,z,length,width)
 # upper root collar, broad taper into ice with no gap
 ice_mesh('V10 ice attachment collar %02d'%i,x,y,z+.009,length*.22,width*1.24)
# Slight ice deposits to emphasize wet wood / ice transition.
if snow:
 for i,x in enumerate([-.42,-.11,.25,.45]):
  y=-.33;z=-.398
  verts=[(x-.025,y,z+.007),(x+.019,y,z+.008),(x+.012,y-.010,z-.004),(x-.017,y-.009,z-.004)]
  mesh=bpy.data.meshes.new('V10 frost grain %d'%i)
  mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.update()
  ob=bpy.data.objects.new('V10 granular frost seam %d'%i,mesh)
  bpy.context.collection.objects.link(ob);mesh.materials.append(snow)
# Previous model entire timber core, PBR images, original rivets are unchanged.
assert bpy.data.objects.get('solid_curved_scoop_timbers') is wood
tag='b2_bucket_paddle_blender_v10'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=34
sc.render.resolution_x=820;sc.render.resolution_y=820;sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG'
cam=sc.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.7
files=[glb]
for n,p in [('front',(0,-2.5,.12)),('side',(2.8,0,.12)),('angle',(1.65,-2.15,.72)),('back',(0,2.5,.12))]:
 cam.location=p;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 f=out/(tag+'_'+n+'.png');sc.render.filepath=str(f);bpy.ops.render.render(write_still=True);files.append(f)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'status':'NOT_APPROVED','source_v09_sha256':sha,
 'retained_wood_geometry':True,'trial_decorations_removed':len(removed),
 'ice_clusters':len(positions),'photos':'Poly Haven Wood Planks CC0 diffuse normal roughness',
 'blender':bpy.app.version_string,'files':{}}
for f in files:
 b=f.read_bytes();manifest['files'][f.name]={'size':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('V10_BLENDER_FINISHED',len(removed),flush=True)
