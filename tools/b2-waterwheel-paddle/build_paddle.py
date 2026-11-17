"""B2 waterwheel bucket: real Blender-only component, native mesh & editability.
Standalone; existing wheel preserved. Blender 4/5, no external Python dependencies.
"""
import bpy, math, random, sys, os, json, hashlib
from mathutils import Vector

OUT = os.path.abspath(sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'render-output/b2-paddle-blender')
os.makedirs(OUT,exist_ok=True)

def material(name,color,rough=.8,metal=0,transmission=0):
 m=bpy.data.materials.new(name);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 bs.inputs['Metallic'].default_value=metal
 if transmission:
  try:bs.inputs['Transmission Weight'].default_value=transmission
  except KeyError: pass
 return m

def wood():
 m=material('Dark_waterlogged_weathered_timber',(.12,.11,.10),.78)
 n=m.node_tree.nodes;lk=m.node_tree.links;bs=n.get('Principled BSDF')
 tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=5.1;tex.inputs['Detail'].default_value=5.5
 tc=n.new('ShaderNodeTexCoord');scale=n.new('ShaderNodeVectorMath');scale.operation='MULTIPLY'
 scale.inputs[1].default_value=(.5,8,29)
 lk.new(tc.outputs['Generated'],scale.inputs[0]);lk.new(scale.outputs[0],tex.inputs['Vector'])
 ramp=n.new('ShaderNodeValToRGB')
 ramp.color_ramp.elements[0].position=.24;ramp.color_ramp.elements[0].color=(.046,.048,.05,1)
 ramp.color_ramp.elements[1].position=.78;ramp.color_ramp.elements[1].color=(.24,.188,.15,1)
 lk.new(tex.outputs['Fac'],ramp.inputs['Fac']);lk.new(ramp.outputs['Color'],bs.inputs['Base Color'])
 bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.19;bump.inputs['Distance'].default_value=.011
 lk.new(tex.outputs['Fac'],bump.inputs['Height']);lk.new(bump.outputs['Normal'],bs.inputs['Normal'])
 return m

def mesh(name,verts,faces,mat):
 data=bpy.data.meshes.new(name+'_mesh');data.from_pydata(verts,[],faces);data.update()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);data.materials.append(mat)
 for face in data.polygons:face.use_smooth=True
 return obj

def cube(name,loc,size,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name
 o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(mat)
 b=o.modifiers.new('worn_edge_bevel','BEVEL');b.width=.01;b.segments=2
 o.modifiers.new('weighted_normals','WEIGHTED_NORMAL');return o

def sphere(name,loc,r,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=7,radius=r,location=loc)
 o=bpy.context.object;o.name=name;o.data.materials.append(mat);return o

def ring(name,x,y,z,r,thickness,mat,N=20):
 verts=[];faces=[]
 for radial in [r-thickness/2,r+thickness/2]:
  for i in range(N):
   a=2*math.pi*i/N;verts.append((x+radial*math.cos(a),y,z+radial*math.sin(a)))
 for i in range(N):
  a=i;b=(i+1)%N;faces.append((a,b,N+b,N+a))
 return mesh(name,verts,faces,mat)

def build(variant):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 woodmat=wood();iron=material('Blue_black_forged_iron',(.11,.15,.165),.8,.6)
 frost=material('Snow_frost_on_top_edges',(.72,.81,.82),.93)
 ice=material('Water_ice_translucent',(.39,.64,.73),.22,.03,.26)
 crackmat=material('Deep_split_end_grain',(.05,.045,.041),.98)
 # Curved longitudinal profile, asymmetrical chipped timber ends; no texture-only fake.
 nx,nz=55,39;w=.63;verts=[]
 def point(i,j,depth):
  x=-w+2*w*i/nx;t=j/nz
  z=.44-.81*t+.007*math.sin(x*41+2*t)
  y=.20-.38*(t*t*(3-2*t))+.045*(x/w)**2*(.3+t)
  y+=.0018*math.sin(x*25+t*68)
  if i in (0,nx):x+=(1 if i==0 else -1)*(.004+.007*math.sin(j*2.23+variant)**2)
  if j==nz:z+=.009*math.sin(x*70)+.006*math.sin(x*119+variant)
  if variant==2 and j<11 and i>46:z-=.075*(i-46)/9*(11-j)/11
  return (x,y+depth,z)
 for d in [-.055,.055]:
  for j in range(nz+1):
   for i in range(nx+1):verts.append(point(i,j,d))
 count=(nx+1)*(nz+1)
 def vid(i,j,k):return k*count+j*(nx+1)+i
 faces=[]
 for j in range(nz):
  for i in range(nx):
   faces.extend(((vid(i,j,0),vid(i+1,j,0),vid(i+1,j+1,0),vid(i,j+1,0)),
                 (vid(i,j,1),vid(i,j+1,1),vid(i+1,j+1,1),vid(i+1,j,1))))
 for i in range(nx):
  for j in (0,nz):
   faces.append((vid(i,j,0),vid(i,j,1),vid(i+1,j,1),vid(i+1,j,0)))
 for j in range(nz):
  for i in (0,nx):
   faces.append((vid(i,j,0),vid(i,j+1,0),vid(i,j+1,1),vid(i,j,1)))
 mesh('actual_curved_bucket_wood',verts,faces,woodmat)
 rng=random.Random(20261117+variant)
 # Separate split grooves and genuine iron fitting geometry.
 for k in range(22 if variant==1 else 30):
  i=rng.randrange(3,nx-4);j=rng.randrange(2,nz-2)
  start=Vector(point(i,j,-.06));finish=Vector(point(min(i+rng.randrange(2,11),nx),j,-.06))
  d=finish-start
  if d.length<.001:continue
  o=cube('embedded_dark_wood_split_%02d'%k,(start+finish)/2,(d.length,.0018,.002),crackmat)
  o.rotation_euler[1]=math.atan2(-d.z,d.x)
 for side in (-1,1):
  x=.54*side
  cube('side_iron_bracket_'+str(side),(x,-.075,.275),(.105,.027,.29),iron)
  ring('open_mounting_eye_'+str(side),x,-.094,.385,.035,.013,iron)
  for z in (.2,.31):sphere('forged_rivet_%s_%s'%(side,z),(x,-.099,z),.019,iron)
 for k in range(21 if variant==1 else 32):
  i=rng.randrange(1,nx);j=rng.choice((0,nz));x,y,z=point(i,j,-.066)
  length=rng.uniform(.012,.067)
  bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=rng.uniform(.005,.015),radius2=.0001,
   depth=length,location=(x,y-.006,z-length/2))
  ob=bpy.context.object;ob.name='rim_ice_crystal_%02d'%k;ob.data.materials.append(ice)
 for k in range(10 if variant==1 else 17):
  i=rng.randrange(1,nx);x,y,z=point(i,0,-.061)
  ob=sphere('top_edge_snow_%02d'%k,(x,y,z+.007),rng.uniform(.013,.031),frost)
  ob.scale=(rng.uniform(.5,1.3),.3,.38)
 tag='b2_bucket_paddle_blender_v%02d'%variant
 blend=os.path.join(OUT,tag+'.blend');glb=os.path.join(OUT,tag+'.glb')
 bpy.ops.export_scene.gltf(filepath=glb,export_format='GLB',export_yup=True)
 # QA render captured internally only; no illustrative image generation.
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
 scene.render.resolution_x=560;scene.render.resolution_y=560;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG'
 world=bpy.data.worlds.new('neutral_qa_world');world.use_nodes=True
 world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7;scene.world=world
 for pos,power in [((1.6,-2.3,2.5),430),((-1.7,1.6,1.1),290)]:
  bpy.ops.object.light_add(type='AREA',location=pos)
  light=bpy.context.object;light.data.energy=power;light.data.size=2.4
  light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=1.85
 files=[blend,glb]
 for name,pos in [('front',(0,-2.7,.5)),('side',(2.7,0,.5)),('angle',(1.6,-2.2,.9)),('back',(0,2.7,.5))]:
  cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
  path=os.path.join(OUT,tag+'_'+name+'.png');scene.render.filepath=path
  bpy.ops.render.render(write_still=True);files.append(path)
 # The editable Blender checkpoint includes the QA camera and lights.
 bpy.ops.wm.save_as_mainfile(filepath=blend)
 manifest={'asset':'waterwheel_individual_bucket_paddle','variant':variant,'status':'NOT_APPROVED',
  'blender':bpy.app.version_string,'existing_scene_modified':False,'mesh_count':len([o for o in bpy.data.objects if o.type=='MESH']),'files':{}}
 for path in files:
  with open(path,'rb') as f:data=f.read()
  if len(data)<100:raise RuntimeError('missing/invalid '+path)
  manifest['files'][os.path.basename(path)]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
 with open(os.path.join(OUT,tag+'_manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
 progress_path=os.path.join(OUT,'progress.json')
 if os.path.exists(progress_path):
  with open(progress_path) as pf:progress=json.load(pf)
 else:progress={'status':'NOT_APPROVED','completed_variants':[]}
 progress['completed_variants'].append({'variant':variant,'tag':tag,'file_count':len(files),'manifest':tag+'_manifest.json'})
 progress['next_variant']=variant+1 if variant<2 else None
 with open(progress_path,'w') as pf:json.dump(progress,pf,indent=2)
 print('VERIFIED_BLENDER_CHECKPOINT',tag,flush=True)

for ver in [1,2]:
 print('BLENDER_START_VARIANT',ver,flush=True)
 build(ver)
