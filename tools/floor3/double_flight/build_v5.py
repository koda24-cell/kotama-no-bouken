"""V5: apply CC0 moss-photo material to stair surfaces; vary tread UV sampling.
Reference V1/V2 GLBs and scripts remain separate and untouched.
"""
source=open('/work/tools/floor3/double_flight/build_v2.py',encoding='utf-8').read()
needle='# Exposure balanced for dark concrete and moss: still legible in GLB previews.'
assert source.count(needle)==1
patch=r"""
# V3 removes the checkerboard-looking green geometry. Wear comes from UV images.
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and any(q in o.name for q in (
  'sparse rooted moss','moisture strip across treads',
  'weathering down pier face','moisture collection patch',
  'shaded damp base','dripping algae streak under landing lip')):
  bpy.data.objects.remove(o,do_unlink=True)

# Baked image maps, not Blender-only Noise nodes. Render and GLB both retain
# the same PBR base-color patterns. Original source authoring is retained.
import numpy as np
N=512
yy,xx=np.mgrid[0:N,0:N].astype(np.float32)
u=xx/N*2*math.pi;v=yy/N*2*math.pi
big=(.36*np.sin(3*u+1.7*np.sin(2*v))
 +.24*np.cos(5*v-2*u)+.2*np.sin(7*u+3*v)
 +.17*np.cos(11*v+8*u))
fine=(np.sin(41*u+37*v)*np.cos(29*v-19*u))*.06
rngnp=np.random.default_rng(417)
grain=rngnp.normal(0,.035,(N,N)).astype(np.float32)
aging=np.clip(.5+big+fine+grain,0,1)
# Damp moss runs through crevices rather than perfect little squares.
moss_mask=np.clip((big+.13*np.sin(u+8*v)-.15)*2.4,0,1)
moss_mask=moss_mask*moss_mask*(3-2*moss_mask)
def bake(name,rgb):
 image=bpy.data.images.new(name,width=N,height=N,alpha=True)
 arr=np.empty((N,N,4),dtype=np.float32)
 arr[:,:,:3]=rgb;arr[:,:,3]=1.
 image.pixels.foreach_set(arr.ravel())
 image.file_format='PNG';image.pack()
 return image
base=np.stack((.25+.17*aging,.253+.16*aging,.228+.135*aging),axis=-1)
greener=np.stack((.073+.065*aging,.118+.075*aging,.046+.048*aging),axis=-1)
concrete_color=base*(1-moss_mask[:,:,None]*.78)+greener*(moss_mask[:,:,None]*.78)
concrete_img=bake('V3 embedded mossed concrete BaseColor',concrete_color)
rust_a=np.stack((.12+.23*aging,.042+.087*aging,.029+.045*aging),axis=-1)
rust_img=bake('V3 embedded metal oxidation BaseColor',rust_a)
def apply_image(material,image):
 nodes=material.node_tree.nodes;links=material.node_tree.links
 tex=nodes.new('ShaderNodeTexImage')
 tex.label='V3 baked GLB texture (authoritative)'
 tex.image=image
 bs=nodes.get('Principled BSDF')
 links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 return tex
for material in (concrete,edges,wet):
 apply_image(material,concrete_img)
apply_image(rust,rust_img)
# Explicit image-based normal map, tangent-space OpenGL (+Y).
# Embedding is checked by later manifest validation.
slope_y,slope_x=np.gradient(aging)
normx=np.clip(-slope_x*.9,-1,1)
normy=np.clip(-slope_y*.9,-1,1)
normz=np.ones((N,N),dtype=np.float32)
length=np.sqrt(normx*normx+normy*normy+normz*normz)
normal_rgb=np.stack((.5+.5*normx/length,
                     .5+.5*normy/length,
                     .5+.5*normz/length),axis=-1)
normal_img=bake('V3 OpenGL concrete normal',normal_rgb)
normal_img.colorspace_settings.name='Non-Color'
for material in (concrete,edges,wet):
 nodes=material.node_tree.nodes;links=material.node_tree.links
 tex=nodes.new('ShaderNodeTexImage');tex.image=normal_img
 normal=nodes.new('ShaderNodeNormalMap')
 normal.inputs['Strength'].default_value=.68
 links.new(tex.outputs['Color'],normal.inputs['Color'])
 links.new(normal.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
"""
patch += r"""
# External verified CC0 PBR texture images: the actual image pixels are PACKED
# into Blender and embedded by glTF GLB export. No runtime network required.
import pathlib
pbr_root=pathlib.Path('/work/out/pbr_sources')
pbr_info=json.loads((pbr_root/'sources.json').read_text())
def pbr(asset,kind):
 meta=pbr_info['maps'][asset][kind]
 path=pathlib.Path('/work/out')/meta['path']
 assert path.exists(),path
 im=bpy.data.images.load(str(path),check_existing=True)
 im.pack()
 if kind!='diffuse': im.colorspace_settings.name='Non-Color'
 return im
for material,asset in [(concrete,'concrete_moss'),
                       (edges,'chipped_concrete'),
                       (wet,'concrete_moss')]:
 diffuse=pbr(asset,'diffuse')
 normal_img=pbr(asset,'normal')
 rough_img=pbr(asset,'roughness')
 nodes=material.node_tree.nodes;links=material.node_tree.links
 bs=nodes.get('Principled BSDF')
 albedo=nodes.new('ShaderNodeTexImage')
 albedo.label='V4 Poly Haven CC0 photographed concrete'
 albedo.image=diffuse
 links.new(albedo.outputs['Color'],bs.inputs['Base Color'])
 normal_tex=nodes.new('ShaderNodeTexImage')
 normal_tex.image=normal_img
 normal_node=nodes.new('ShaderNodeNormalMap')
 normal_node.inputs['Strength'].default_value=.84
 links.new(normal_tex.outputs['Color'],normal_node.inputs['Color'])
 links.new(normal_node.outputs['Normal'],bs.inputs['Normal'])
 rough_tex=nodes.new('ShaderNodeTexImage')
 rough_tex.image=rough_img
 links.new(rough_tex.outputs['Color'],bs.inputs['Roughness'])

# Each stair tread should sample a different region of the 1k CC0 photograph.
# Keep consistent texel scale but offset UV islands to break visible tiling.
import re
for obj in bpy.context.scene.objects:
 if obj.type!='MESH' or 'eroded cast concrete tread' not in obj.name:continue
 match=re.search(r' tread (\d+)',obj.name)
 if match is None:continue
 i=int(match.group(1))
 for layer in obj.data.uv_layers:
  ox=((i*0.371)%1.0)
  oy=((i*0.227)%1.0)
  for loop in layer.data:
   loop.uv[0]=(loop.uv[0]*.83+ox)%1.0
   loop.uv[1]=(loop.uv[1]*.83+oy)%1.0

# Record provenance inside .blend and as sidecar manifest.
bpy.context.scene['texture_license']='CC0'
bpy.context.scene['texture_provenance']='Poly Haven concrete_moss and chipped_concrete'
"""
source=source.replace(needle,patch+'\n'+needle)
source=source.replace("'f3_double_flight_stairs_v2'","'f3_double_flight_stairs_v5'")
source=source.replace('f3_double_flight_stairs_v2','f3_double_flight_stairs_v5')
source=source.replace('F3_DOUBLE_FLIGHT_V2_COMPLETE','F3_DOUBLE_FLIGHT_V5_COMPLETE')
exec(compile(source,'f3_double_flight_v5.py','exec'))
