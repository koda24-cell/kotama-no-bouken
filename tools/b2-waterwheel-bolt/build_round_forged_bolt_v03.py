"""Single black-forged dome-head bolt V03. Original muted local rust PBR and four Cycles renders."""
import bpy, math, sys, hashlib, json, random, struct
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
assert len(args)==1
out=Path(args[0]).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rand=random.Random(1951)
N=48
# An irregular forged shank, beveled foot and irregular head, all welded into ONE mesh.
rings=[(-.655,.028),(-.646,.034),(-.615,.0348),(-.45,.035),(-.16,.0349),(-.02,.0354),(.027,.036)]
verts=[];faces=[]
for zi,(z,r) in enumerate(rings):
 for i in range(N):
  a=2*math.pi*i/N
  rr=r*(1+.011*math.sin(5*a+zi*.3)+.008*math.sin(13*a+zi*.6))
  verts.append((rr*math.cos(a),rr*math.sin(a),z))
for j in range(len(rings)-1):
 for i in range(N):
  t=(i+1)%N
  faces.append((j*N+i,j*N+t,(j+1)*N+t,(j+1)*N+i))
faces.append(tuple(reversed(range(N))))
faces.append(tuple((len(rings)-1)*N+i for i in range(N)))
shaftmesh=bpy.data.meshes.new('forge_shank');shaftmesh.from_pydata(verts,[],faces);shaftmesh.update()
shaft=bpy.data.objects.new('B2_single_round_forged_bolt',shaftmesh);bpy.context.collection.objects.link(shaft)
# Hand-forged broad, low dome: irregular circular silhouette, hammered shallow crown.
# A concealed square neck under the head resists rotation in timber.
# Preserve existing shaft radius and distal thread. DO NOT modify the existing V02 version.
M=64
headrings=[(.025,.058),(.029,.072),(.037,.077),(.047,.074),
           (.059,.066),(.070,.050),(.078,.028),(.081,.009)]
hv=[];hf=[]
for j,(zz,rad) in enumerate(headrings):
 for i in range(M):
  theta=2*math.pi*i/M
  asym=1+.038*math.sin(3*theta+.37)+.018*math.sin(7*theta+1.1)+.012*math.sin(13*theta+.8)
  dent=-.0013*(math.sin(11*theta+2.1)+math.sin(17*theta-.4))*math.sin(math.pi*(j+.5)/len(headrings))
  hv.append((rad*asym*math.cos(theta),rad*asym*math.sin(theta),zz+dent))
for j in range(len(headrings)-1):
 for i in range(M):
  k=(i+1)%M
  hf.append((j*M+i,j*M+k,(j+1)*M+k,(j+1)*M+i))
hf.append(tuple(reversed(range(M))))
hv.append((.0008,-.0007,.0815))
top=len(hv)-1
for i in range(M):
 hf.append(((len(headrings)-1)*M+i,(len(headrings)-1)*M+(i+1)%M,top))
mh=bpy.data.meshes.new('low_crowned_hammered_dome_head')
mh.from_pydata(hv,[],hf);mh.update()
head=bpy.data.objects.new('TEMP_low_dome_head',mh);bpy.context.collection.objects.link(head)
# Short square neck, mostly concealed under the dome; NOT a second exposed square cap.
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.022))
neck=bpy.context.object;neck.name='TEMP_anti_rotation_neck'
neck.scale=(.075,.075,.030)
neck.rotation_euler=(0,0,.035)
bpy.context.view_layer.objects.active=neck
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
# Real thread, not uniformly colored shaft paint.
# Helical narrow triangular ridge, 8 complete turns, continuous tube.
nturn=8;segments=nturn*22
v=[];f=[]
for j in range(segments+1):
 t=j/segments;ang=2*math.pi*nturn*t
 z=-.636+.180*t
 rr=.0355
 for k,(r,zz) in enumerate([(.034, z-.004),(.041,z),(.034,z+.004)]):
  v.append((r*math.cos(ang),r*math.sin(ang),zz))
for j in range(segments):
 for k in range(3):
  nk=(k+1)%3;f.append((3*j+k,3*j+nk,3*(j+1)+nk,3*(j+1)+k))
f.append((2,1,0));f.append(tuple(range(3*segments,3*segments+3)))
mt=bpy.data.meshes.new('forged_coarse_thread');mt.from_pydata(v,[],f);mt.update()
thread=bpy.data.objects.new('TEMP_thread',mt);bpy.context.collection.objects.link(thread)
# Join into exactly one editable object; for preview this avoids creating duplicate draws.
bpy.ops.object.select_all(action='DESELECT')
for item in (shaft,head,neck,thread):item.select_set(True)
bpy.context.view_layer.objects.active=shaft;bpy.ops.object.join()
assert len([o for o in bpy.context.scene.objects if o.type=='MESH'])==1
# Original non-periodic rust map. No third-party image or license.
SZ=512
def h(i,j):
 x=math.sin(i*127.1+j*311.7)*43758.545
 return x-math.floor(x)
def noise(u,v,sx,sy):
 x=u*sx;y=v*sy;ix=math.floor(x);iy=math.floor(y)
 fx=x-ix;fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy)
 a=h(ix,iy);b=h(ix+1,iy);c=h(ix,iy+1);d=h(ix+1,iy+1)
 return (a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy
pix=[]
for j in range(SZ):
 y=(j+.5)/SZ
 for i in range(SZ):
  x=(i+.5)/SZ
  patch=.6*noise(x,y,9,8)+.3*noise(x,y,31,25)+.1*noise(x,y,74,68)
  rust=max(0,min(1,(patch-.54)*4.1))*(.35+.65*noise(x,y,5.4,12.7))
  grain=noise(x,y,110,104)-.5
  iron=(.064,.071,.083);oxide=(.235,.107,.057)
  rgb=[max(0,min(1,iron[k]*(1-rust)+oxide[k]*rust+grain*.045)) for k in range(3)]
  pitting=(noise(x,y,86,76)-.5)*.036
  rgb=[max(0,min(1,c+pitting)) for c in rgb]
  pix.extend((*rgb,1))
im=bpy.data.images.new('B2_original_forged_iron_oxide_v03',width=SZ,height=SZ,alpha=True)
im.pixels.foreach_set(pix)
path=out/'b2_forged_bolt_oxide_albedo_v03.png'
im.filepath_raw=str(path);im.file_format='PNG';im.save();im.pack()
mat=bpy.data.materials.new('Hand forged old iron V03');mat.use_nodes=True
nd=mat.node_tree.nodes;ln=mat.node_tree.links;bs=nd.get('Principled BSDF')
bs.inputs['Metallic'].default_value=.79;bs.inputs['Roughness'].default_value=.81
tx=nd.new('ShaderNodeTexImage');tx.image=im;ln.new(tx.outputs['Color'],bs.inputs['Base Color'])
bump=nd.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.16;bump.inputs['Distance'].default_value=.0013
noise_node=nd.new('ShaderNodeTexNoise');noise_node.inputs['Scale'].default_value=155
ln.new(noise_node.outputs['Fac'],bump.inputs['Height']);ln.new(bump.outputs['Normal'],bs.inputs['Normal'])
shaft.data.materials.append(mat)
# UV layer for actual 3D faces, use angle and z; head uses planar projection.
uv=shaft.data.uv_layers.active or shaft.data.uv_layers.new(name='forged_iron_u_v')
for face in shaft.data.polygons:
 for li in face.loop_indices:
  p=shaft.data.vertices[shaft.data.loops[li].vertex_index].co
  if p.z>.02: u,v=.5+p.x*3,.5+p.y*3
  else: u,v=(math.atan2(p.y,p.x)+math.pi)/(2*math.pi),(p.z+.655)*1.3
  uv.data[li].uv=(u,v)
# Force one GLB mesh, no lights/cameras.
bpy.ops.object.select_all(action='DESELECT');shaft.select_set(True);bpy.context.view_layer.objects.active=shaft
tag='b2_single_forged_dome_bolt_v03';glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
shaft.select_set(False)
world=bpy.data.worlds.new('cold wrought iron studio');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.32,.35,.39,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.55
bpy.context.scene.world=world
for where,power,size in [((2,-2,2.6),480,2.4),((-1.5,1.9,1.4),320,2.1)]:
 bpy.ops.object.light_add(type='AREA',location=where)
 lamp=bpy.context.object;lamp.data.energy=power;lamp.data.size=size
 lamp.rotation_euler=(Vector((0,0,-.25))-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=1.13
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES'
scene.cycles.samples=45;scene.render.resolution_x=850;scene.render.resolution_y=850;scene.render.resolution_percentage=100
files=[glb,path]
for name,where in [('front',(1.6,-2,.55)),('side',(2.1,0,.2)),('angle',(2.2,-2,1.1)),('back',(-2.2,1.6,.4))]:
 cam.location=where
 cam.rotation_euler=(Vector((0,0,-.29))-cam.location).to_track_quat('-Z','Y').to_euler()
 f=out/(tag+'_'+name+'.png');scene.render.filepath=str(f)
 bpy.ops.render.render(write_still=True);files.append(f)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'status':'NOT_APPROVED','independent_bolt_count':1,
 'nominal_shank_diameter_m':.07,'head_shape':'asymmetric low hammered dome with hidden square neck','dome_diameter_m':.154,'thread_turns':nturn,
 'geometry_faces':len(shaft.data.polygons),'materials':len(shaft.data.materials),
 'glb_assembly_fit':'NOT_TESTED','files':{}}
for file in files:
 data=file.read_bytes();manifest['files'][file.name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('B2_DOME_FORGED_BOLT_V03_REAL_RENDER_OK',len(shaft.data.polygons),flush=True)
