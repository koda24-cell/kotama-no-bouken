"""Compose existing V13 wall with Poly Haven Rock Face 02 scanned geometry; render five views."""
import bpy,sys,os,math
from pathlib import Path
from mathutils import Vector
src,reference,outdir=sys.argv[sys.argv.index('--')+1:]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))
base=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not base:raise RuntimeError('Missing original V13 geometry')
for o in base:o['v13_preserved']=True
# Import scanned cliff without removing existing meshes.
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.import_scene.gltf(filepath=os.path.abspath(reference))
added=[o for o in bpy.context.selected_objects if o.type=='MESH']
if not added:raise RuntimeError('Missing Poly Haven geometry')
# Ground all imported geometry into wall's front (+Y in Blender after glTF conversion).
# Each cluster is independently oriented and stretched to break the rectangular silhouette.
from mathutils import Matrix
def world_bounds(objects):
 pts=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
 return Vector([min(p[i] for p in pts) for i in range(3)]),Vector([max(p[i] for p in pts) for i in range(3)])
lo,hi=world_bounds(base);center=(lo+hi)/2
rlo,rhi=world_bounds(added);rcenter=(rlo+rhi)/2
rs=rhi-rlo
# Make imported cliff broad across x, tall across z, and substantial across y.
target=Vector((3.25,1.3,3.2))
scale=min(target[i]/max(rs[i],.01) for i in range(3))
for o in added:
 o.matrix_world=Matrix.Translation(Vector((-2.3,lo.y-.32,center.z+1.1))) @ Matrix.Rotation(math.radians(-11),4,'Y') @ Matrix.Scale(scale,4) @ Matrix.Translation(-rcenter) @ o.matrix_world
 o['source']='Poly Haven Rock Face 02 / CC0'
# Duplicated masses are not independent floating rocks: overlap the existing solid wall.
for j,(x,z,angle,s) in enumerate([(1.7,-.65,16,.83),(3.15,1.35,-23,.58)]):
 for o in added:
  cp=o.copy();cp.data=o.data.copy();bpy.context.collection.objects.link(cp)
  pivot=Vector((-2.3,lo.y-.32,center.z+1.1))
  cp.matrix_world=Matrix.Translation(Vector((x+2.3,.10,z-(center.z+1.1)))) @ Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(angle),4,'Y') @ Matrix.Scale(s,4) @ Matrix.Translation(-pivot) @ o.matrix_world
  cp['source']='Poly Haven Rock Face 02 / CC0'
# Neutral basalt material while preserving scan geometry; no original rock removed.
mat=bpy.data.materials.new('volcanic_basalt_scan');mat.diffuse_color=(.12,.115,.11,1);mat.use_nodes=True
bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.16,.145,.14,1);bsdf.inputs['Roughness'].default_value=.94
for o in bpy.context.scene.objects:
 if o.type=='MESH' and o.get('source'):
  o.data.materials.clear();o.data.materials.append(mat)
# V15: deform the existing wall's perimeter, retaining all faces and original fissure meshes.
# The original wall geometry is still present: only its outer edge vertices are sculpted.
for obj in base:
 if obj.type!='MESH' or len(obj.data.vertices)<2000:continue
 from mathutils import Vector
 verts=obj.data.vertices
 local=[v.co.copy() for v in verts]
 xx=[v.x for v in local];zz=[v.z for v in local]
 xlo,xhi=min(xx),max(xx);zlo,zhi=min(zz),max(zz)
 if xhi-xlo<3 or zhi-zlo<3:continue
 for v in verts:
  p=v.co;u=(p.x-xlo)/(xhi-xlo);w=(p.z-zlo)/(zhi-zlo)
  # Natural nonrectangular outline: edge-only lateral and vertical erosion.
  left=math.exp(-(u/.12)**2);right=math.exp(-((1-u)/.12)**2)
  top=math.exp(-((1-w)/.12)**2);bottom=math.exp(-(w/.11)**2)
  p.x+=left*(.25+.20*math.sin(w*11)+.10*math.sin(w*23))
  p.x-=right*(.35+.22*math.sin(w*9+1.2)+.12*math.cos(w*19))
  p.z-=top*(.20+.30*math.sin(u*12+.4)**2+.15*math.sin(u*24)**2)
  p.z+=bottom*(.08+.10*math.sin(u*17)**2)
 obj.data.update()
# Use broad asymmetric scan-rock clusters that overlap the existing mother-rock
# and do not form a detached shelf under the wall.
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH' or not obj.get('source'):continue
 obj.location.z+=.38
 obj.location.y+=.14
# Add hand-sculpted basalt buttresses to mask straight side-wall profiles.
rock=bpy.data.materials.get('volcanic_basalt_scan')
for j,(sx,sy,sz,rx,ry,rz) in enumerate([
 (-4.10,lo.y+.20,center.z-1.45,.70,.80,1.70),
 ( 4.02,lo.y+.17,center.z+1.10,.76,.85,1.95),
 (-3.95,lo.y+.15,center.z+1.75,.58,.64,1.25),
 ( 3.70,lo.y+.30,center.z-1.90,.82,.68,1.10)]):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(sx,sy,sz))
 b=bpy.context.object;b.name='V15 basalt edge buttress '+str(j)
 for v in b.data.vertices:
  n=v.co
  jitter=1+.12*math.sin(n.x*7+j)+.08*math.cos(n.z*11+j)
  n.x*=rx*jitter;n.y*=ry*jitter;n.z*=rz*jitter
 b.data.materials.append(rock)
 b['source']='Additive irregular basalt edge buttress'

# Save complete composite GLB for review.
os.makedirs(outdir,exist_ok=True)
glb=os.path.join(outdir,'b4-v15-polyhaven-rockwall-composite.glb')
bpy.ops.export_scene.gltf(filepath=os.path.abspath(glb),export_format='GLB')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
lo,hi=world_bounds(meshes);center=(lo+hi)/2;size=max(hi[i]-lo[i] for i in range(3))
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=size*1.3;bpy.context.scene.camera=cam
for vec,power,scale in [((-3,3,5),1800,1.0),((4,2,1),950,2.8),((1,-2,4),700,2.2)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(vec)*size)
 light=bpy.context.object;light.data.energy=power*max(size,1);light.data.size=size*scale;aim(light,center)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=56
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.world.color=(.2,.2,.2)
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=1.35
for label,direction in [('front-lit',(0,1,.12)),('front-level',(0,1,0)),('angle-lit',(1,1,.28)),('side-lit',(1,0,.12)),('back-lit',(0,-1,.12))]:
 cam.location=center+Vector(direction).normalized()*size*2.7;aim(cam,center)
 scene.render.filepath=os.path.abspath(os.path.join(outdir,'b4-v15-'+label+'.png'))
 bpy.ops.render.render(write_still=True)
 if not os.path.exists(scene.render.filepath):raise RuntimeError('Missing '+label)
 print('RENDER_OK',label)
print('V15_COMPOSITE_OK',len(base),len(added),len(meshes),glb)
