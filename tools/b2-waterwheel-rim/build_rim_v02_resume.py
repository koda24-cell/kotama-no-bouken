"""V02 rim-endgrain review, restore exact V01 Blender checkpoint.
Only refine timber end caps and wooden dowel coloring; keep original beam mesh geometry.
"""
import bpy,sys,os,math,json,hashlib,random
import numpy as np
from pathlib import Path
from mathutils import Vector
inp=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
expected='190c4780534e007052bf0693777679e0de759b6b7d30414a115829830c67e5a1'
sha=hashlib.sha256(inp.read_bytes()).hexdigest()
if sha!=expected:raise RuntimeError('V01 source BLEND mismatch')
bpy.ops.wm.open_mainfile(filepath=str(inp))
core=bpy.data.objects.get('B2_RimSegment_01_Curved_OakTimber')
assert core is not None
original_verts=len(core.data.vertices);original_faces=len(core.data.polygons)
H=W=512
yy,xx=np.mgrid[:H,:W].astype(np.float32)
x=xx/W-.5;y=yy/H-.5
radius=np.sqrt((x/1.10)**2+(y/.90)**2)
theta=np.arctan2(y,x)
grain_distortion=.012*np.sin(theta*13+radius*19)+.008*np.sin(theta*31+radius*41)
rings=np.sin((radius+grain_distortion)*135)*.5+.5
fine=np.sin((radius+grain_distortion)*285+theta*8)*.5+.5
knots=.05*np.sin(x*45+y*12)*np.sin(y*46-x*13)
light=np.clip(.21+.095*rings+.030*fine+knots-.04*radius,.09,.48)
rgb=np.stack((light*.90,light*.76,light*.66),axis=-1)
img=bpy.data.images.new('V02 exposed oak radial endgrain CC0 compatible procedural',width=W,height=H,alpha=True)
rgba=np.concatenate((rgb,np.ones((H,W,1),dtype=np.float32)),axis=2)
img.pixels.foreach_set(rgba.astype(np.float32).ravel());img.pack()
mat=bpy.data.materials.get('Exposed weathered end grain')
assert mat and mat.use_nodes
bs=mat.node_tree.nodes.get('Principled BSDF')
t=mat.node_tree.nodes.new('ShaderNodeTexImage');t.image=img
mat.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color'])
bs.inputs['Roughness'].default_value=.94
# Two material-selected end faces, map x/radial coordinates to physical endgrain UVs.
me=core.data
assert me.uv_layers
uv=me.uv_layers.active
caps=[p for p in me.polygons if p.material_index==1]
assert len(caps)==2, f'expected 2 end caps found {len(caps)}'
for poly in caps:
 for li in poly.loop_indices:
  vi=me.loops[li].vertex_index
  vx,vy,vz=me.vertices[vi].co
  radius=math.sqrt((vy+2.55)**2+vz**2)
  uv.data[li].uv=((vx+.14)/.28,(radius-(2.55-.15))/.30)
# Dowel wood should be dark wet timber rather than near-white in high exposure.
pegs=bpy.data.materials.get('Weathered oak dowel head')
assert pegs
pbs=pegs.node_tree.nodes['Principled BSDF']
pbs.inputs['Base Color'].default_value=(.095,.083,.070,1)
pbs.inputs['Roughness'].default_value=.92
socket=bpy.data.materials.get('Aged joinery recess')
assert socket
sbs=socket.node_tree.nodes['Principled BSDF']
sbs.inputs['Base Color'].default_value=(.065,.061,.057,1)
# Keep every original mesh vertex intact and preserve wheel alignment.
assert len(core.data.vertices)==original_verts and len(core.data.polygons)==original_faces
tag='b2_waterwheel_single_rim_segment_v02'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=32
sc.render.resolution_x=820;sc.render.resolution_y=820;sc.render.resolution_percentage=100
cam=sc.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.80
files=[glb]
for name,pos in [('front',(2.6,.55,0)),('side',(0,1.9,2.4)),('angle',(2.2,1.5,1.7)),('back',(-2.6,.4,0))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 f=out/(tag+'_'+name+'.png');sc.render.filepath=str(f)
 bpy.ops.render.render(write_still=True);files.append(f)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'status':'NOT_APPROVED','source_v01_sha256':sha,
 'one_segment_only':True,'original_beam_geometry_unchanged':True,
 'endgrain_cap_faces':len(caps),'endgrain_texture_size':[W,H],
 'photo_CC0_wood_from_v01':True,'files':{}}
for p in files:
 b=p.read_bytes();manifest['files'][p.name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('V02_REAL_BLENDER_ENDGRAIN_COMPLETE',flush=True)
