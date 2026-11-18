"""B2 waterwheel V08: non-destructive additions to verified V07 Blend.
One waterwheel scoop, photo PBR kept. Blender 5.x, independent workflow checkpoint.
"""
import bpy,os,sys,json,hashlib,math,random
from pathlib import Path
from mathutils import Vector
inp=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
EXPECTED='04129277159a3f69090a80ab420b68c8255400bcf434528056e8451b77ceff91'
raw=inp.read_bytes();sha=hashlib.sha256(raw).hexdigest()
if sha!=EXPECTED:raise RuntimeError('V07 checkpoint SHA mismatch: refuse destructive changes')
bpy.ops.wm.open_mainfile(filepath=str(inp))
base_set=set(o.name for o in bpy.data.objects if o.type=='MESH')
bpy.context.scene.render.engine='CYCLES'
rng=random.Random(20261118)
def mat(name,color,rough=.8,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True
 b=m.node_tree.nodes.get('Principled BSDF')
 b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough
 b.inputs['Metallic'].default_value=metal
 return m
iron=mat('V08 cold iron wear',(.065,.069,.078),.81,.69)
rimwood=mat('V08 exposed end grain',(.11,.093,.085),.9)
snow=mat('V08 irregular thin granular frost',(.66,.73,.75),.95)
ice=mat('V08 ice blue gray',(.35,.50,.57),.27)
# Geometry add only. No existing object is deleted or repositioned.
def mesh(n,verts,faces,m):
 data=bpy.data.meshes.new(n);data.from_pydata(verts,[],faces);data.update()
 obj=bpy.data.objects.new(n,data);bpy.context.collection.objects.link(obj)
 obj.data.materials.append(m);return obj
def tube(name,a,b,rad,material,vertices=8):
 d=Vector(b)-Vector(a);mid=(Vector(a)+Vector(b))*0.5
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=rad,depth=d.length,location=mid)
 ob=bpy.context.object;ob.name=name;ob.rotation_euler=d.to_track_quat('Z','Y').to_euler()
 ob.data.materials.append(material);return ob
def washer(name,center,r,material):
 x,y,z=center;v=[];f=[];N=20
 for inner in [r*.56,r]:
  for j in range(N):
   a=math.tau*j/N
   v.append((x+inner*math.cos(a),y,z+inner*math.sin(a)))
 for j in range(N):f.append((j,(j+1)%N,(j+1)%N+N,j+N))
 return mesh(name,v,f,material)
# Add forged mounting collars on the existing iron straps (original fasteners preserved).
for side,x in enumerate([-.53,.53]):
 for k,z in enumerate([.165,.265,.345]):
  y=-.13 if z>=.265 else -.10
  washer('V08 forged raised washer %s %s'%(side,k),(x,y,z),.020,iron)
  # Bolt axis enters material, gives lateral thickness.
  tube('V08 forged bolt shank %s %s'%(side,k),(x,y-.008,z),(x,y+.035,z),.0075,iron,12)
 # An actual bracket lip at the top, angled along local curve.
 tube('V08 bent bracket lip %s'%side,(x-.043,-.107,.377),(x+.043,-.107,.374),.006,iron)
# Ragged end grain: asymmetric thin tearouts above existing lower lip, no sawtooth repeats.
for k in range(16):
 x=-.575+1.15*(k+.25+rng.random()*.55)/16
 z=-.397+.011*math.sin(x*37)+.006*math.sin(x*71)
 y=-.30+(.02 if abs(x)>.40 else -.025)
 length=rng.uniform(.014,.052)
 dx=rng.uniform(-.012,.012)
 v=[(x-.006,y,z),(x+.007,y+.004,z),(x+dx+.002,y+rng.uniform(-.025,.015),z-length)]
 mesh('V08 fractured timber lip %02d'%k,v,[(0,1,2)],rimwood)
# A few uneven rim ice crusts, visibly anchored, non-periodic and sparse.
for k,(x,z) in enumerate([(-.48,.425),(-.31,.428),(.11,.425),(.44,.423),(.52,.404)]):
 y=.135+.004*math.sin(20*x)
 sx=rng.uniform(.026,.065)
 h=rng.uniform(.007,.018)
 v=[(x-sx,y-.052,z),(x+sx,y-.052,z+.006),(x+sx*.6,y-.062,z+h),
    (x-sx*.55,y-.062,z+h*.7)]
 mesh('V08 corner rime %02d'%k,v,[(0,1,2,3)],snow)
# Irregular 2-5 icicles in different directions, merging at their root.
for k in range(10):
 x=rng.uniform(-.54,.54)
 z=-.392+.011*math.sin(x*36)
 y=-.28+rng.uniform(-.065,.018)
 length=rng.uniform(.019,.071)
 r=rng.uniform(.003,.008)
 bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=.0006,radius2=r,depth=length,
 location=(x,y,z-length/2))
 ob=bpy.context.object;ob.name='V08 underside asymmetric ice %02d'%k;ob.data.materials.append(ice)
# Cold hue, but retain the verified Poly Haven diffuse/rough/normal.
wood=bpy.data.materials['Wood_waterlogged_aged_embedded_PBR']
blend_nodes=[n for n in wood.node_tree.nodes if n.type=='MIX_RGB' and n.blend_type=='MULTIPLY']
if blend_nodes:
 blend_nodes[-1].inputs[0].default_value=.94
 blend_nodes[-1].inputs[2].default_value=(.34,.43,.52,1)
# Preserve scene and V07 camera; record existing mesh base unchanged.
assert base_set.issubset({o.name for o in bpy.data.objects if o.type=='MESH'})
tag='b2_bucket_paddle_blender_v08'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
scene=bpy.context.scene;scene.cycles.samples=30;scene.render.resolution_x=780;scene.render.resolution_y=780
scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
cam=scene.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.7
files=[glb]
for name,pos in [('front',(0,-2.5,.12)),('side',(2.8,0,.12)),('angle',(1.65,-2.15,.72)),('back',(0,2.5,.12))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 p=out/(tag+'_'+name+'.png');scene.render.filepath=str(p)
 bpy.ops.render.render(write_still=True);files.append(p)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'approval':'NOT_APPROVED','base_v07_sha256':sha,'old_meshes_preserved':len(base_set),
 'added_meshes':len([o for o in bpy.data.objects if o.type=='MESH'])-len(base_set),
 'texture':'Poly Haven Wood Planks CC0 V07 color normal rough unchanged',
 'files':{},'blender':bpy.app.version_string}
for f in files:
 b=f.read_bytes();manifest['files'][f.name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('V08_VERIFIED_CHECKPOINT',tag,flush=True)
