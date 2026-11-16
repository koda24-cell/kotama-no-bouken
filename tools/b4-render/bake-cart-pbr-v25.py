"""Build original deterministic PBR image maps and embed them into a review GLB.
This is not copying Pinterest photography or an unlicensed texture.
Usage: blender -b --python bake-cart-pbr-v22.py -- src.glb out.glb out.blend
"""
import bpy,sys,os,math
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
src,target,blend=args
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))
SIZE=256
def fract(n):return n-math.floor(n)
def rnd(x,y):
 return fract(math.sin(x*127.1+y*311.7)*43758.5453)
def smooth(t):return t*t*(3-2*t)
def val_noise(x,y):
 i,j=math.floor(x),math.floor(y);u,v=smooth(x-i),smooth(y-j)
 a=rnd(i,j);b=rnd(i+1,j);c=rnd(i,j+1);d=rnd(i+1,j+1)
 return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v
def height(kind,u,v):
 if kind=='rock':
  return .35+.28*val_noise(u*5,v*7)+.21*val_noise(u*29,v*28)+.08*val_noise(u*83,v*85)
 if kind=='wood':
  warp=0.045*math.sin(u*26.3)+0.02*math.sin(u*81+v*7)
  fine=math.sin((v+warp)*115)*0.035+math.sin((v+warp)*320)*.010
  return .55+fine+val_noise(u*5.3,v*11.5)*.18+val_noise(u*22,v*75)*.04
 else:
  return .45+.28*val_noise(u*9,v*10)+.15*val_noise(u*47,v*42)
def make_images(kind):
 colors=[]; rough=[]; normals=[]
 H=[[height(kind,x/SIZE,y/SIZE) for x in range(SIZE)] for y in range(SIZE)]
 for y in range(SIZE):
  for x in range(SIZE):
   u,v=x/SIZE,y/SIZE;h=H[y][x];n=val_noise(u*17,v*23)
   if kind=='wood':
    ch=.55+.48*(h-.53)
    r=(.43+.11*ch)*(.93+.13*n);g=(.34+.11*ch)*(.90+.13*n);b=(.28+.10*ch)*(.90+.14*n)
    q=.83+.12*n
   elif kind=='rock':
    grit=.17+.37*h+.15*val_noise(u*34,v*37)
    r=grit*.79;g=grit*.84;b=grit*.91;q=.82+.15*n
   else:
    rust=smooth(max(0,min(1,(val_noise(u*8,v*7)-.47)*3.5)))
    r=.14+.23*rust;g=.16+.10*rust;b=.17+.065*rust
    grit=.74+.21*val_noise(u*36,v*38)
    r*=grit;g*=grit;b*=grit;q=.59+.34*rust
   colors.extend((min(1,r),min(1,g),min(1,b),1.0))
   rough.extend((q,q,q,1.0))
   dx=H[y][(x+1)%SIZE]-H[y][(x-1)%SIZE];dy=H[(y+1)%SIZE][x]-H[(y-1)%SIZE][x]
   nx,ny,nz=-dx*2.2,-dy*2.2,1.;norm=(nx*nx+ny*ny+nz*nz)**.5
   normals.extend(((nx/norm+1)/2,(ny/norm+1)/2,(nz/norm+1)/2,1.))
 imgs={}
 for suffix,pixels in [('ALBEDO',colors),('ROUGHNESS',rough),('NORMAL',normals)]:
  im=bpy.data.images.new('B4_'+kind.upper()+'_'+suffix,width=SIZE,height=SIZE,alpha=True,float_buffer=False)
  im.pixels.foreach_set(pixels);im.update()
  if suffix!='ALBEDO':im.colorspace_settings.name='Non-Color'
  im.pack();imgs[suffix]=im
 return imgs
images={'wood':make_images('wood'),'metal':make_images('metal'),'rock':make_images('rock')}
matched=0
for mat in list(bpy.data.materials):
 name=mat.name.lower()
 if not name.startswith('b4_'):continue
 kind='wood' if 'wood' in name else ('rock' if 'caveore' in name else 'metal')
 matched+=1;mat.use_nodes=True
 nt=mat.node_tree;bsdf=next((n for n in nt.nodes if n.type=='BSDF_PRINCIPLED'),None)
 if bsdf is None:continue
 for input_name in ['Base Color','Roughness','Normal']:
  sock=bsdf.inputs[input_name]
  for link in list(sock.links):nt.links.remove(link)
 tex=nt.nodes.new('ShaderNodeTexImage');tex.label=kind+' albedo';tex.image=images[kind]['ALBEDO'];tex.location=(-650,200)
 nt.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
 rough=nt.nodes.new('ShaderNodeTexImage');rough.image=images[kind]['ROUGHNESS'];rough.location=(-650,-75)
 nt.links.new(rough.outputs['Color'],bsdf.inputs['Roughness'])
 nor=nt.nodes.new('ShaderNodeTexImage');nor.image=images[kind]['NORMAL'];nor.location=(-650,-325)
 normal=nt.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.48 if kind=='wood' else .36;normal.location=(-370,-300)
 nt.links.new(nor.outputs['Color'],normal.inputs['Color']);nt.links.new(normal.outputs['Normal'],bsdf.inputs['Normal'])
 bsdf.inputs['Metallic'].default_value=.03 if kind=='wood' else (0.0 if kind=='rock' else (.42 if 'rust' in name.lower() else .75))
# Add deterministic UV for custom quadrilateral panels, where Three.js did not create one.
uv_fixed=0
for obj in bpy.context.scene.objects:
 if obj.type!='MESH' or not obj.data.materials:continue
 if not any(m and m.name.lower().startswith('b4_') for m in obj.data.materials):continue
 if obj.data.uv_layers:continue
 uv=obj.data.uv_layers.new(name='B4_UV')
 xs=[v.co.x for v in obj.data.vertices];zs=[v.co.z for v in obj.data.vertices]
 longitudinal='z' if (max(zs)-min(zs))>=(max(xs)-min(xs)) else 'x'
 for face in obj.data.polygons:
  for li in face.loop_indices:
   co=obj.data.vertices[obj.data.loops[li].vertex_index].co
   uv.data[li].uv=((co.z if longitudinal=='z' else co.x)*.55,co.y*1.6)
 uv_fixed+=1
if matched==0:raise RuntimeError('V22 PBR source materials were not named; refusing fake texture claim')
os.makedirs(os.path.dirname(os.path.abspath(target)),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(blend))
bpy.ops.export_scene.gltf(filepath=os.path.abspath(target),export_format='GLB',export_yup=True,export_materials='EXPORT')
print('PBR_EMBEDDED',target,'materials',matched,'uv_fixed',uv_fixed,flush=True)
