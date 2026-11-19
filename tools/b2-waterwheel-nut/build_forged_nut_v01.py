"""One standalone hand-wrought hex nut, Blender 5.3 Cycles four-view review."""
import bpy,sys,math,hashlib,json,random
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
assert len(args)==1
out=Path(args[0]).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# Continuous annular mesh: angular exterior with bevel rings plus continuous inner shaft bore.
N=96
zprofile=[(-.034,.070),(-.028,.079),(-.017,.082),(.016,.081),(.027,.078),(.034,.070)]
vertices=[];faces=[]
def radius(z,r,theta):
    # Six flat sides have interpolated outer angular radius and gentle hand forging bumps.
    sector=(theta+math.pi/6)%(math.pi/3)-math.pi/6
    hex_r=(.075*math.cos(math.pi/6))/max(.70,math.cos(sector))
    irregular=1+.025*math.sin(theta*5+z*31)+.013*math.sin(theta*11-z*19)
    return hex_r*(r/.082)*irregular
for j,(z,r) in enumerate(zprofile):
 for k in range(N):
  a=2*math.pi*k/N
  rr=radius(z,r,a)
  vertices.append((rr*math.cos(a),rr*math.sin(a),z+.001*math.sin(a*7+j*.4)))
# Interior: staggered narrow pseudo-thread valley with multiple axial shoulders.
inner=[(.034,.0382),(.024,.0372),(.015,.0378),(.004,.0371),
       (-.006,.0377),(-.016,.0372),(-.025,.0378),(-.034,.038)]
for j,(z,r) in enumerate(inner):
 for k in range(N):
  a=2*math.pi*k/N
  # 6-turn internal thread relief across the opening, not just painted dark lines.
  phase=2*math.pi*6*(z+.034)/.068-a
  rr=r+.00075*math.cos(phase)
  vertices.append((rr*math.cos(a),rr*math.sin(a),z))
def tube(base,count,flip=False):
 for j in range(count-1):
  for k in range(N):
   t=(k+1)%N
   A=base+j*N+k;B=base+j*N+t;C=base+(j+1)*N+t;D=base+(j+1)*N+k
   faces.append((A,D,C,B) if flip else (A,B,C,D))
tube(0,len(zprofile))
base=len(zprofile)*N
tube(base,len(inner),True)
# Annular top and bottom caps with consistent winding.
for k in range(N):
 t=(k+1)%N
 faces.append(((len(zprofile)-1)*N+k,(len(zprofile)-1)*N+t,base+k,base+t))
 faces.append((k,base+(len(inner)-1)*N+k,base+(len(inner)-1)*N+t,t))
mesh=bpy.data.meshes.new('Forged_nut_real_annular_mesh')
mesh.from_pydata(vertices,[],faces);mesh.update()
obj=bpy.data.objects.new('B2_One_Old_Forged_Hex_Nut',mesh);bpy.context.collection.objects.link(obj)
# Original local oxidized iron texture. Do not use externally sourced photos.
SIZE=512
rng=random.Random(241119)
def h(i,j):
 v=math.sin(i*127.1+j*311.7)*43758.545312
 return v-math.floor(v)
def noise(u,v,tx,ty):
 x=u*tx;y=v*ty;ix=math.floor(x);iy=math.floor(y);a=x-ix;b=y-iy
 a=a*a*(3-2*a);b=b*b*(3-2*b)
 A=h(ix,iy);B=h(ix+1,iy);C=h(ix,iy+1);D=h(ix+1,iy+1)
 return (A+(B-A)*a)*(1-b)+(C+(D-C)*a)*b
pix=[]
for j in range(SIZE):
 v=j/SIZE
 for i in range(SIZE):
  u=i/SIZE
  r=.61*noise(u,v,6,5)+.28*noise(u,v,16,18)+.11*noise(u,v,55,43)
  rust=max(0,min(1,(r-.56)*4.9))
  fine=(noise(u,v,115,108)-.5)*.035
  base=(.061,.070,.078);oxide=(.245,.103,.049)
  col=tuple(max(0,min(1,base[k]*(1-rust)+oxide[k]*rust+fine)) for k in range(3))
  pix.extend((*col,1))
im=bpy.data.images.new('B2_Original_Old_Iron_Nut_Oxide',width=SIZE,height=SIZE,alpha=True)
im.pixels.foreach_set(pix)
img=out/'b2_forged_nut_oxide_albedo_v01.png'
im.filepath_raw=str(img);im.file_format='PNG';im.save();im.pack()
mat=bpy.data.materials.new('Cold aged forged iron nut');mat.use_nodes=True
nd=mat.node_tree.nodes;lk=mat.node_tree.links
bs=nd.get('Principled BSDF');bs.inputs['Metallic'].default_value=.75;bs.inputs['Roughness'].default_value=.82
tx=nd.new('ShaderNodeTexImage');tx.image=im;lk.new(tx.outputs['Color'],bs.inputs['Base Color'])
no=nd.new('ShaderNodeTexNoise');no.inputs['Scale'].default_value=175
bu=nd.new('ShaderNodeBump');bu.inputs['Strength'].default_value=.14;bu.inputs['Distance'].default_value=.0011
lk.new(no.outputs['Fac'],bu.inputs['Height']);lk.new(bu.outputs['Normal'],bs.inputs['Normal'])
mesh.materials.append(mat)
uv=mesh.uv_layers.new(name='Forged_iron_angular_UV')
for poly in mesh.polygons:
 for li in poly.loop_indices:
  pt=mesh.vertices[mesh.loops[li].vertex_index].co
  if abs(poly.normal.z)>.70:uv.data[li].uv=(.5+pt.x*5,.5+pt.y*5)
  else:uv.data[li].uv=((math.atan2(pt.y,pt.x)+math.pi)/(2*math.pi),.5+pt.z*5)
for p in mesh.polygons:p.use_smooth=(abs(p.normal.z)<.75)
# Export one mesh only.
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
tag='b2_one_hand_forged_hex_nut_v01';glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
obj.select_set(False)
world=bpy.data.worlds.new('Neutral forging review');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.31,.34,.39,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
bpy.context.scene.world=world
for where,energy,size in [((.8,-1.5,1.8),500,1.9),((-1.3,.7,.8),350,1.8)]:
 bpy.ops.object.light_add(type='AREA',location=where)
 lamp=bpy.context.object;lamp.data.energy=energy;lamp.data.size=size
 lamp.rotation_euler=(-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=.27
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='CYCLES';scene.cycles.samples=52
scene.render.resolution_x=850;scene.render.resolution_y=850;scene.render.resolution_percentage=100
files=[glb,img]
for n,loc in [('front',(0,-.5,.36)),('side',(.55,0,.08)),('angle',(.43,-.50,.43)),('back',(.05,.15,-.65))]:
 camera.location=loc
 camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler()
 p=out/(tag+'_'+n+'.png')
 scene.render.filepath=str(p);bpy.ops.render.render(write_still=True);files.append(p)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'approval':'NOT_APPROVED','pieces':1,'axis':'Z',
 'nominal_bolt_radius_m':.035,'inner_bore_radius_m':.037,'outer_hex_nominal_radius_m':.075,
 'axial_thickness_m':.068,'internal_approximate_turns':6,
 'mesh_faces':len(mesh.polygons),'joint_test':'NOT_TESTED','performance_audit':'NOT_TESTED','files':{}}
for f in files:
 bb=f.read_bytes();manifest['files'][f.name]={'bytes':len(bb),'sha256':hashlib.sha256(bb).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('B2_FORGED_NUT_V01_CYCLES_RENDER_OK',len(mesh.polygons),flush=True)
