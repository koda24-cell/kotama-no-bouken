"""Single old hand-hewn wooden waterwheel axle. Cycles4 views, packed original PBR, GLB/Blend."""
import bpy,math,sys,json,hashlib,random
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
assert len(args)==1
out=Path(args[0]).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# A long, continuously connected old timber axle. Small irregular longitudinal facets
# are real geometry; both barrel and journal dimensions preserve hub R=.303 clearance.
N=32
stations=[(-1.725,.252),(-1.707,.272),(-1.660,.286),(-1.50,.291),
          (-1.25,.294),(-1.18,.291),(-.95,.291),(-.72,.294),
          (-.53,.298),(-.30,.298),(-.15,.297),(0,.298),
          (.17,.298),(.34,.297),(.58,.295),(.85,.290),
          (1.10,.289),(1.30,.294),(1.53,.293),(1.68,.284),
          (1.713,.270),(1.725,.249)]
verts=[];faces=[]
for j,(x,base) in enumerate(stations):
 for i in range(N):
  a=i*2*math.pi/N
  # Slow longitudinal asymmetry; no repeating gear-like teeth.
  phase=.022*j
  dent=.0021*math.sin(5*a+phase)+.0013*math.sin(9*a-phase*.6)+.0005*math.sin(13*a+phase*1.3)
  rr=min(base+dent,.3005) if abs(x)<.36 else min(base+dent,.299)
  rr*=1+.006*math.sin(a*2.2+x*1.7)
  xloc=x+(.005*math.sin(a*5+.7)+.002*math.sin(a*9+2.1) if abs(x)>1.68 else 0)
  verts.append((xloc,rr*math.cos(a),rr*math.sin(a)))
for j in range(len(stations)-1):
 for i in range(N):
  k=(i+1)%N
  faces.append((j*N+i,j*N+k,(j+1)*N+k,(j+1)*N+i))
faces.append(tuple(reversed(range(N))))
faces.append(tuple((len(stations)-1)*N+i for i in range(N)))
mesh=bpy.data.meshes.new('Continuous_one_piece_oak_shaft_mesh')
mesh.from_pydata(verts,[],faces);mesh.update()
shaft=bpy.data.objects.new('B2_One_Old_Oak_Waterwheel_Axle',mesh)
bpy.context.collection.objects.link(shaft)
import bmesh
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces[:]);bm.to_mesh(mesh);bm.free()
# Two copyright-clean original maps. Wood along X and exposed growth rings on both ends.
SZ=512
rng=random.Random(131119)
def h(i,j):
 x=math.sin(i*127.121+j*311.749)*43758.5453
 return x-math.floor(x)
def noise(u,v,sx,sy):
 x=u*sx;y=v*sy;ix=math.floor(x);iy=math.floor(y)
 a=x-ix;b=y-iy;a=a*a*(3-2*a);b=b*b*(3-2*b)
 c=h(ix,iy);d=h(ix+1,iy);e=h(ix,iy+1);f=h(ix+1,iy+1)
 return (c+(d-c)*a)*(1-b)+(e+(f-e)*a)*b
sidepixels=[];endpixels=[]
for j in range(SZ):
 v=(j+.5)/SZ
 for i in range(SZ):
  u=(i+.5)/SZ
  # Long irregular fiber lines; knot around u≈.28, v≈.63.
  knot=math.exp(-((u-.28)/.093)**2-((v-.63)/.12)**2)
  fiber=v*32+.38*math.sin(5*u+.9*v)+.28*noise(u,v,7,4)+1.2*knot*math.sin((v-.63)*13)
  grain=.23*math.sin(fiber*2.5)+.075*math.sin(fiber*7.3)+.30*(noise(u,v,22,17)-.5)
  dry=noise(u,v,7,6)
  darkspot=max(0,(dry-.60))*1.1
  fissure=math.exp(-((v-(.26+.008*math.sin(u*31)+.01*math.sin(u*11))) / (.002+.003*math.sin(u*math.pi)**2))**2) if .28<u<.62 else 0
  light=.43+.11*grain-.19*darkspot-.21*fissure
  color=[max(0,min(1,light*c)) for c in (.98,.69,.46)]
  sidepixels.extend((*color,1))
  dx=(u-.52)*2.15;dy=(v-.485)*2.15
  theta=math.atan2(dy,dx);rad=math.hypot(dx,dy)
  rings=math.sin((rad+.022*math.sin(5*theta)+.018*math.sin(9*theta+1.1))*72+noise(u,v,9,10)*5.0)
  radialcrack=max(0,math.sin(theta*3.9+rad*2))**26 * (rad>.20)
  stain=noise(u,v,10,11)
  q=max(.13,min(.67,.43+.058*rings-.22*radialcrack-.16*max(0,stain-.59)))
  endpixels.extend((q*.86,q*.56,q*.31,1))
def make_image(name,pixels,path):
 im=bpy.data.images.new(name,width=SZ,height=SZ,alpha=True)
 im.pixels.foreach_set(pixels)
 im.file_format='PNG';im.filepath_raw=str(path);im.save();im.pack()
 return im
albedo=out/'b2_aged_axle_oak_long_grain_v02.png'
endtex=out/'b2_aged_axle_real_endgrain_v02.png'
longim=make_image('B2_Axle_original_longitudinal_oak',sidepixels,albedo)
endim=make_image('B2_Axle_original_endgrain',endpixels,endtex)
def material(label,img,rough):
 mat=bpy.data.materials.new(label);mat.use_nodes=True
 nd=mat.node_tree.nodes;lk=mat.node_tree.links
 bs=nd.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough
 tx=nd.new('ShaderNodeTexImage');tx.image=img
 lk.new(tx.outputs['Color'],bs.inputs['Base Color'])
 no=nd.new('ShaderNodeTexNoise');no.inputs['Scale'].default_value=140
 bu=nd.new('ShaderNodeBump');bu.inputs['Strength'].default_value=.08;bu.inputs['Distance'].default_value=.002
 lk.new(no.outputs['Fac'],bu.inputs['Height']);lk.new(bu.outputs['Normal'],bs.inputs['Normal'])
 return mat
side=material('Old aged oak longitudinal side wood original PBR',longim,.87)
end=material('Old aged oak cut endgrain original PBR',endim,.91)
mesh.materials.append(side);mesh.materials.append(end)
uv=mesh.uv_layers.new(name='Oak_axial_and_endgrain_UV')
for p in mesh.polygons:
 iscap=(len(p.vertices)==N)
 p.material_index=1 if iscap else 0
 p.use_smooth=not iscap
 for li in p.loop_indices:
  v=mesh.vertices[mesh.loops[li].vertex_index].co
  if iscap:xy=(.5+v.y*1.52,.5+v.z*1.52)
  else:xy=((v.x+1.725)/3.45,(math.atan2(v.z,v.y)+math.pi)/(2*math.pi))
  uv.data[li].uv=xy
bpy.ops.object.select_all(action='DESELECT');shaft.select_set(True);bpy.context.view_layer.objects.active=shaft
tag='b2_single_oak_waterwheel_axle_v02'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
shaft.select_set(False)
world=bpy.data.worlds.new('Icy cave neutral art review');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.41,.44,.48,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.68
bpy.context.scene.world=world
for loc,power,size in [((1,-3,4),700,3.8),((-2.5,2,1.4),400,3.0)]:
 bpy.ops.object.light_add(type='AREA',location=loc)
 lamp=bpy.context.object;lamp.data.energy=power;lamp.data.size=size
 lamp.rotation_euler=(-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO'
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES'
scene.cycles.samples=45
scene.render.resolution_x=850;scene.render.resolution_y=850;scene.render.resolution_percentage=100
views=[('front',(4.6,.16,.44),1.48),('side',(.9,-6,2.2),4.38),
       ('angle',(3.8,-4.7,3.1),4.12),('back',(-4.6,-.22,.25),1.48)]
files=[glb,albedo,endtex]
for name,loc,scale in views:
 cam.location=loc;cam.data.ortho_scale=scale
 cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler()
 path=out/(tag+'_'+name+'.png')
 scene.render.filepath=str(path);bpy.ops.render.render(write_still=True);files.append(path)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
m={'asset':tag,'approval':'NOT_APPROVED','mesh_parts':1,
 'shaft_axis':'X','length_m':3.45,'nominal_hub_bore_radius_m':.303,
 'nominal_center_shaft_radius_max_m':.3005,
 'nominal_bearing_shaft_radius_m':.291,'mesh_faces':len(mesh.polygons),
 'textures_generated':2,'actual_hub_bearing_fit':'NOT_TESTED','in_game_performance':'NOT_TESTED','files':{}}
for p in files:
 data=p.read_bytes()
 m['files'][p.name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(m,indent=2))
print('B2_OAK_AXLE_V02_REAL_CYCLES_COMPLETE',len(mesh.polygons),flush=True)
