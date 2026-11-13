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
# Save complete composite GLB for review.
os.makedirs(outdir,exist_ok=True)
glb=os.path.join(outdir,'b4-v14-polyhaven-rockwall-composite.glb')
bpy.ops.export_scene.gltf(filepath=os.path.abspath(glb),export_format='GLB')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
lo,hi=world_bounds(meshes);center=(lo+hi)/2;size=max(hi[i]-lo[i] for i in range(3))
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=size*1.3;bpy.context.scene.camera=cam
for vec,power,scale in [((-3,3,5),1800,1.0),((4,2,1),950,2.8),((1,-2,4),700,2.2)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(vec)*size)
 light=bpy.context.object;light.data.energy=power*max(size,1);light.data.size=size*scale;aim(light,center)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.world.color=(.2,.2,.2)
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.9
for label,direction in [('front-lit',(0,1,.12)),('front-level',(0,1,0)),('angle-lit',(1,1,.28)),('side-lit',(1,0,.12)),('back-lit',(0,-1,.12))]:
 cam.location=center+Vector(direction).normalized()*size*2.7;aim(cam,center)
 scene.render.filepath=os.path.abspath(os.path.join(outdir,'b4-v14-'+label+'.png'))
 bpy.ops.render.render(write_still=True)
 if not os.path.exists(scene.render.filepath):raise RuntimeError('Missing '+label)
 print('RENDER_OK',label)
print('COMPOSITE_OK',len(base),len(added),len(meshes),glb)
