"""V03 improve single-timber rim: use CC0 Fine Grained Wood rather than plank seam photo.
Restore V02 actual Blender checkpoint. Rebuild fine subtle endgrain rings on two caps.
"""
import bpy,sys,hashlib,math,json
from pathlib import Path
import numpy as np
inp=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
expected='513693170a01179d4a468a25848fac15efc7f864facbbdb8ff1f4512527eddb0'
sha=hashlib.sha256(inp.read_bytes()).hexdigest()
if sha!=expected:raise RuntimeError('Unexpected rim V02 checkpoint')
bpy.ops.wm.open_mainfile(filepath=str(inp))
core=bpy.data.objects.get('B2_RimSegment_01_Curved_OakTimber');assert core
n0=len(core.data.vertices);p0=len(core.data.polygons)
wood=bpy.data.materials.get('Cold wet aged oak - actual CC0 photo if retrieved')
assert wood
node=wood.node_tree.nodes;links=wood.node_tree.links;bs=node.get('Principled BSDF')
loaded={}
for suffix in ('col','nor_gl','rough'):
 p=out/('fine_grained_wood_'+suffix+'_1k.jpg')
 if not p.is_file():continue
 raw=p.read_bytes()
 if not raw.startswith(bytes.fromhex('ffd8')) or len(raw)<20000:continue
 im=bpy.data.images.load(str(p),check_existing=False);im.pack()
 if suffix!='col':im.colorspace_settings.name='Non-Color'
 loaded[suffix]=(im,hashlib.sha256(raw).hexdigest())
 if suffix=='col':
  candidates=[n for n in node if n.type=='TEX_IMAGE' and n.image and 'wood_planks_diff' in n.image.name]
  assert len(candidates)==1
  candidates[0].image=im
 elif suffix=='rough':
  candidates=[n for n in node if n.type=='TEX_IMAGE' and n.image and 'wood_planks_rough' in n.image.name]
  assert len(candidates)==1;candidates[0].image=im
 elif suffix=='nor_gl':
  candidates=[n for n in node if n.type=='TEX_IMAGE' and n.image and 'wood_planks_nor_gl' in n.image.name]
  assert len(candidates)==1;candidates[0].image=im
# Diffuse was much too pale; preserve natural variation and cool it via tint.
mixes=[n for n in node if n.type=='MIX_RGB' and n.blend_type=='MULTIPLY']
if mixes:
 mixes[0].inputs[0].default_value=.83
 mixes[0].inputs[2].default_value=(.62,.70,.76,1)
# Remove excessively uniform optical illusion on cut section by reducing the frequency.
h=w=512
yy,xx=np.mgrid[:h,:w].astype(np.float32)
x=xx/w-.5;y=yy/h-.5
rad=np.sqrt((x/1.05)**2+(y/.92)**2)
angle=np.arctan2(y,x)
r=rad+.011*np.sin(angle*5+rad*13)+.004*np.sin(angle*13+rad*30)
ring=.5+.5*np.sin(r*37+.8*np.sin(angle*3))
micro=.5+.5*np.sin(r*93+angle*2)
shade=np.clip(.205+.033*ring+.012*micro-.030*rad+
       .021*np.sin(xx/25+yy/91),.12,.35)
color=np.stack((shade*.91,shade*.78,shade*.69),axis=-1)
img=bpy.data.images.new('V03 naturally irregular aged oak endgrain',width=w,height=h,alpha=True)
img.pixels.foreach_set(np.concatenate((color,np.ones((h,w,1),dtype=np.float32)),axis=2).astype(np.float32).ravel())
img.pack()
end=bpy.data.materials.get('Exposed weathered end grain');assert end
end_node=[n for n in end.node_tree.nodes if n.type=='TEX_IMAGE']
assert len(end_node)==1
end_node[0].image=img
# Restore slight abrasion on dowel heads; no visual metal or floating white circles
d=bpy.data.materials.get('Weathered oak dowel head')
if d:d.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.075,.070,.064,1)
assert len(core.data.vertices)==n0 and len(core.data.polygons)==p0
tag='b2_waterwheel_single_rim_segment_v03'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=30
scene.render.resolution_x=820;scene.render.resolution_y=820;scene.render.resolution_percentage=100
cam=scene.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.80
files=[glb]
for name,pos in [('front',(2.6,.55,0)),('side',(0,1.9,2.4)),('angle',(2.2,1.5,1.7)),('back',(-2.6,.4,0))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 file=out/(tag+'_'+name+'.png');scene.render.filepath=str(file)
 bpy.ops.render.render(write_still=True);files.append(file)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'status':'NOT_APPROVED','source_v02_sha256':sha,
 'original_rim_geometry_preserved':True,'endgrain_revised':True,
 'new_CC0_FineGrainedWood_maps':{k:v[1] for k,v in loaded.items()},
 'photo_source':'https://polyhaven.com/a/fine_grained_wood' if len(loaded)==3 else None,
 'three_photo_maps_actually_applied':len(loaded)==3,
 'files':{}}
for f in files:
 b=f.read_bytes();manifest['files'][f.name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('V03_FINE_GRAINED_WOOD_RENDERED',list(loaded),flush=True)
