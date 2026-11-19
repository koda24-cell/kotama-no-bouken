"""B2 one hand-forged washer. Real 3D annulus, original rust PBR, four Blender views."""
import bpy,math,json,hashlib,random,sys
from pathlib import Path
from mathutils import Vector
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
assert len(argv)==1
out=Path(argv[0]).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# One manifold ring, slightly dished, 8 cross-section vertices per angle. No boolean seams.
N=128
# radial/vertical profile, counterclockwise cross-section loop.
profile=[(.038,-.0065),(.040,-.0086),(.052,-.0103),
 (.085,-.0098),(.102,-.0105),(.107,-.0062),(.106,.0057),
 (.100,.0083),(.083,.0070),(.052,.0072),(.040,.0064),(.038,.0042)]
verts=[];faces=[];ang_noise=[]
for i in range(N):
 a=2*math.pi*i/N
 noise=(.0036*math.sin(3*a+.28)+.0023*math.sin(7*a+1.29)
        +.00065*math.sin(19*a+.51))
 ang_noise.append(noise)
 for j,(rr,z) in enumerate(profile):
  shift=noise*(min(1,max(0,(rr-.040)/.064)))
  r=rr+shift
  zz=z+(.0016*math.sin(5*a+rr*32)+.0005*math.sin(13*a+1.2))*(min(1,max(0,(rr-.041)/.04)))
  verts.append((r*math.cos(a),r*math.sin(a),zz))
P=len(profile)
for i in range(N):
 k=(i+1)%N
 for j in range(P):
  l=(j+1)%P
  faces.append((i*P+j,k*P+j,k*P+l,i*P+l))
mesh=bpy.data.meshes.new('Wrought_Annular_Solid_OnePiece')
mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('B2_One_Worn_Black_Iron_Washer',mesh)
bpy.context.collection.objects.link(obj)
# Actual vertex normals orientation correct using bmesh operator.
import bmesh
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces[:]);bm.to_mesh(mesh);bm.free()
# Aged forged metal with irregular oxidation and small high frequency forging texture.
SZ=512
rng=random.Random(2407)
def hash2(ix,iy):
 x=math.sin(ix*127.1+iy*311.7)*43758.5453
 return x-math.floor(x)
def noise(u,v,sx,sy):
 x=u*sx;y=v*sy;ix=math.floor(x);iy=math.floor(y)
 fx=x-ix;fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy)
 a=hash2(ix,iy);b=hash2(ix+1,iy);c=hash2(ix,iy+1);d=hash2(ix+1,iy+1)
 return ((a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy)
pix=[]
for j in range(SZ):
 v=(j+.5)/SZ
 for i in range(SZ):
  u=(i+.5)/SZ
  stain=.66*noise(u,v,5.8,7.1)+.25*noise(u,v,22,19)+.09*noise(u,v,67,69)
  rust=max(0,min(.83,(stain-.54)*4.6))
  p=(noise(u,v,110,102)-.5)*.045
  steel=(.068,.078,.088);oxide=(.251,.123,.065)
  rgb=[max(0,min(1,steel[t]*(1-rust)+oxide[t]*rust+p)) for t in range(3)]
  pix.extend((*rgb,1))
im=bpy.data.images.new('B2_original_black_iron_washer_oxidation',width=SZ,height=SZ,alpha=True)
im.pixels.foreach_set(pix)
img=out/'b2_washer_blackiron_oxidation_v01.png'
im.filepath_raw=str(img);im.file_format='PNG';im.save();im.pack()
mat=bpy.data.materials.new('Old Wrought Iron Sparse Rust');mat.use_nodes=True
ns=mat.node_tree.nodes;ls=mat.node_tree.links;bs=ns.get('Principled BSDF')
bs.inputs['Metallic'].default_value=.8;bs.inputs['Roughness'].default_value=.79
tx=ns.new('ShaderNodeTexImage');tx.image=im
ls.new(tx.outputs['Color'],bs.inputs['Base Color'])
noise_tex=ns.new('ShaderNodeTexNoise');noise_tex.inputs['Scale'].default_value=188
bump=ns.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.15;bump.inputs['Distance'].default_value=.0012
ls.new(noise_tex.outputs['Fac'],bump.inputs['Height']);ls.new(bump.outputs['Normal'],bs.inputs['Normal'])
mesh.materials.append(mat)
uv=mesh.uv_layers.new(name='Oxidation radial planar')
# Planar UV keeps oxide patches irregular, no cylindrical repeating brown lines.
for poly in mesh.polygons:
 for li in poly.loop_indices:
  v=mesh.vertices[mesh.loops[li].vertex_index].co
  uv.data[li].uv=(.5+v.x*4.1,.5+v.y*4.1)
 for _ in [0]:poly.use_smooth=True
tag='b2_one_handforged_washer_v01'
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
glb=out/(tag+'.glb');bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
obj.select_set(False)
world=bpy.data.worlds.new('Pale cave forging neutral background');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.55
bpy.context.scene.world=world
for where,energy,size in [((.6,-1.1,1.2),380,2.2),((-1.0,.6,.7),250,1.5)]:
 bpy.ops.object.light_add(type='AREA',location=where)
 lamp=bpy.context.object;lamp.data.energy=energy;lamp.data.size=size
 lamp.rotation_euler=(-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=.29
scene=bpy.context.scene;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=48
scene.render.resolution_x=850;scene.render.resolution_y=850;scene.render.resolution_percentage=100
files=[glb,img]
for name,pos in [('front',(0,-.20,.48)),('side',(.48,-.17,.06)),('angle',(.37,-.48,.44)),('back',(-.01,.10,-.52))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 file=out/(tag+'_'+name+'.png')
 scene.render.filepath=str(file);bpy.ops.render.render(write_still=True);files.append(file)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
m={'asset':tag,'approval':'NOT_APPROVED','piece_count':1,
 'shank_nominal_radius_m':.035,'hole_radius_m':.038,'outer_radius_nominal_m':.106,
 'geometry_faces':len(mesh.polygons),'geometry_vertices':len(mesh.vertices),
 'clash_test':'NOT_TESTED','in_game_fps':'NOT_TESTED','files':{}}
for f in files:
 data=f.read_bytes();m['files'][f.name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(m,indent=2))
print('B2_FORGED_WASHER_V01_CYCLES_RENDER_COMPLETE',len(mesh.polygons),flush=True)
