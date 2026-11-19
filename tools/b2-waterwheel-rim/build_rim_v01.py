"""One actual curved wooden outer rim segment for the Floor-2 waterwheel.
No entire waterwheel generated. Blender-native GLB/Blend + four Cycles review angles.
Legacy wheel: radius 2.55, axle X, fourteen spokes.
"""
import bpy,math,random,sys,os,hashlib,json
from pathlib import Path
from mathutils import Vector
OUT=Path(sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'render-output/b2-waterwheel-rim-v01').resolve()
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(20261118)
def material(name,rgb,rough=.8,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True
 bs=m.node_tree.nodes['Principled BSDF']
 bs.inputs['Base Color'].default_value=(*rgb,1)
 bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 return m
wood=material('Cold wet aged oak - actual CC0 photo if retrieved',(.24,.20,.17),.82)
endgrain=material('Exposed weathered end grain',(.16,.13,.105),.94)
dark=material('Aged joinery recess',(.085,.085,.077),.94)
pegmat=material('Weathered oak dowel head',(.20,.16,.12),.84)
PHOTO={}; photo_dir=OUT
for suffix,noncolor in [('diff',False),('nor_gl',True),('rough',True)]:
 path=OUT/('wood_planks_'+suffix+'_1k.jpg')
 if not path.exists():
  print('PHOTO_NOT_DOWNLOADED',suffix,flush=True);continue
 blob=path.read_bytes()
 if not blob.startswith(bytes.fromhex('ffd8')) or len(blob)<20000:
  print('PHOTO_INVALID',suffix,flush=True);continue
 img=bpy.data.images.load(str(path),check_existing=False)
 if noncolor:img.colorspace_settings.name='Non-Color'
 img.pack()
 PHOTO[suffix]=(img,hashlib.sha256(blob).hexdigest())
print('PHOTO_LOADED',list(PHOTO),flush=True)
tree=wood.node_tree;nodes=tree.nodes;links=tree.links;bs=nodes['Principled BSDF']
if 'diff' in PHOTO:
 tex=nodes.new('ShaderNodeTexImage');tex.image=PHOTO['diff'][0]
 tone=nodes.new('ShaderNodeMixRGB');tone.blend_type='MULTIPLY'
 tone.inputs[0].default_value=.69
 tone.inputs[2].default_value=(.57,.69,.80,1)
 links.new(tex.outputs['Color'],tone.inputs[1]);links.new(tone.outputs['Color'],bs.inputs['Base Color'])
if 'rough' in PHOTO:
 t=nodes.new('ShaderNodeTexImage');t.image=PHOTO['rough'][0]
 links.new(t.outputs['Color'],bs.inputs['Roughness'])
if 'nor_gl' in PHOTO:
 t=nodes.new('ShaderNodeTexImage');t.image=PHOTO['nor_gl'][0]
 nn=nodes.new('ShaderNodeNormalMap');nn.inputs['Strength'].default_value=.38
 links.new(t.outputs['Color'],nn.inputs['Color']);links.new(nn.outputs['Normal'],bs.inputs['Normal'])

# The wood is ONE arc segment, centerline radius 2.55 and angle 2*pi/14.
# In isolation, subtract radius from Y so the piece sits near the origin.
R=2.55
SEG=math.tau/14
STEPS=42
# 8 chamfered perimeter points in the local x/radial cross-section.
section=[(-.113,-.145),(.113,-.145),(.130,-.127),(.130,.127),
         (.113,.145),(-.113,.145),(-.130,.127),(-.130,-.127)]
verts=[];faces=[];uv=[];uv_outer=[]
for i in range(STEPS+1):
 u=i/STEPS;angle=(u-.5)*SEG
 for k,(x,radial) in enumerate(section):
  # Small distinct imperfections, concentrated near exposed ends. Preserve mating radius.
  wear=.003*math.sin(18*u+1.1*k)+.0018*math.sin(55*u+2.4*k)
  if k in (2,3,4) and u>.86:
   wear-=.007*(u-.86)/.14*(.5+.5*math.sin(40*u+k))
  if k in (5,6) and u<.10:
   wear-=.014*(.10-u)/.10
  radius=R+radial+wear
  xx=x+.0028*math.sin(u*12+1.9*k)
  verts.append((xx,radius*math.cos(angle)-R,radius*math.sin(angle)))
  uv.append((u,((k/8)+.18)%1.))
N=len(section)
for i in range(STEPS):
 for k in range(N):
  a=i*N+k;b=i*N+(k+1)%N;c=(i+1)*N+(k+1)%N;d=(i+1)*N+k
  faces.append((a,b,c,d))
faces.extend([tuple(reversed(range(N))),tuple(STEPS*N+k for k in range(N))])
me=bpy.data.meshes.new('B2_RimSegment_SolidChamferedTimber_Mesh')
me.from_pydata(verts,[],faces);me.update()
obj=bpy.data.objects.new('B2_RimSegment_01_Curved_OakTimber',me);bpy.context.collection.objects.link(obj)
me.materials.append(wood);me.materials.append(endgrain)
for poly in me.polygons:
 if poly.index>=len(faces)-2:poly.material_index=1
 else:poly.use_smooth=True
layer=me.uv_layers.new(name='UVMap')
for poly in me.polygons:
 for loop_idx in poly.loop_indices:
  index=me.loops[loop_idx].vertex_index
  layer.data[loop_idx].uv=uv[index]
# Near-end chipping: true notches in silhouette, assembled from jagged wedge surfaces
# rather than floating zigzag ink strokes. Leave original curved timber intact.
def addmesh(name,vs,fs,mat):
 data=bpy.data.meshes.new(name+'_mesh');data.from_pydata(vs,[],fs);data.update()
 ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob)
 data.materials.append(mat);return ob
for q,u in enumerate((.09,.83)):
 a=(u-.5)*SEG
 rr=R+.142
 yy=rr*math.cos(a)-R;zz=rr*math.sin(a)
 vv=[(-.125,yy,zz-.038),(-.125,yy+.013,zz+.032),
     (-.112,yy+.017,zz+.016),(-.098,yy+.004,zz-.012)]
 addmesh('B2_Exposed_Small_Fiber_Splinter_%d'%q,vv,[(0,1,2),(0,2,3)],endgrain)
# Wooden dowel head placed on outward face, shallow and geometrically intersecting timber.
# These are part of this single wood segment, not another full wheel.
for q,u in enumerate((.20,.79)):
 a=(u-.5)*SEG
 r=R+.146
 loc=(0,r*math.cos(a)-R,r*math.sin(a))
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.026,depth=.014,location=loc)
 ob=bpy.context.object;ob.name='B2_Wood_Dowel_Head_%d'%q
 # cylinder Z-axis to radial direction, wood wheel is in YZ plane
 radial=Vector((0,math.cos(a),math.sin(a)))
 ob.rotation_euler=radial.to_track_quat('Z','Y').to_euler()
 ob.data.materials.append(pegmat)
 # Slightly darker socket rim behind the dowel
 bpy.ops.mesh.primitive_torus_add(major_segments=20,minor_segments=5,
  location=loc,major_radius=.027,minor_radius=.004)
 tor=bpy.context.object;tor.name='B2_Dowel_Recess_Edge_%d'%q
 tor.rotation_euler=radial.to_track_quat('Z','Y').to_euler()
 tor.data.materials.append(dark)
# Export only the actual segment and its joinery (no cameras or scene set).
tag='b2_waterwheel_single_rim_segment_v01'
glb=OUT/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=32
sc.render.resolution_x=820;sc.render.resolution_y=820;sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG'
sc.world=bpy.data.worlds.new('Neutral_cold_review_world');sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.45
for pos,power,size in [((2,-3,2),450,3.2),((-2,3,1),310,2.4)]:
 bpy.ops.object.light_add(type='AREA',location=pos)
 li=bpy.context.object;li.data.energy=power;li.data.size=size
 li.rotation_euler=(-li.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;sc.camera=cam
cam.data.type='ORTHO';cam.data.ortho_scale=1.80
files=[glb]
for name,position in [('front',(2.6,.55,0)),('side',(0,1.9,2.4)),
                      ('angle',(2.2,1.5,1.7)),('back',(-2.6,.4,0))]:
 cam.location=position;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 imagefile=OUT/(tag+'_'+name+'.png');sc.render.filepath=str(imagefile)
 bpy.ops.render.render(write_still=True);files.append(imagefile)
blend=OUT/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'status':'NOT_APPROVED','legacy_wheel_radius':R,'legacy_spokes':14,
 'one_curved_wood_segment_only':True,'wood_PBR_photo_map_sha256':{k:v[1] for k,v in PHOTO.items()},
 'photo_source':'https://polyhaven.com/a/wood_planks' if PHOTO else None,
 'photos_used':len(PHOTO)==3,'mesh_count':len([o for o in bpy.data.objects if o.type=='MESH']),
 'blender':bpy.app.version_string,'files':{}}
for file in files:
 b=file.read_bytes();manifest['files'][file.name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(OUT/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('B2_RIM_SEGMENT_V01_RENDER_AND_CHECKPOINT_COMPLETE',json.dumps({k:v for k,v in manifest.items() if k!='files'}),flush=True)
