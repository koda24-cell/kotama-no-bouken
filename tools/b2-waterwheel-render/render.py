"""Render one imported B5 GLB from FRONT, BACK and HIGH-ANGLE.
Blender glTF import maps Three.js Y-up to Blender Z-up. This renderer
uses the imported mesh bounds, not assumed unconverted coordinates.
"""
import bpy,sys,os
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
if len(args)!=2: raise SystemExit('usage: blender -b --python render.py -- model.glb output-directory')
src,outdir=args
src=os.path.abspath(src);outdir=os.path.abspath(outdir)
os.makedirs(outdir,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes:raise RuntimeError('GLB contains no meshes: '+src)
corners=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
lo=[min(v[i] for v in corners) for i in range(3)]
hi=[max(v[i] for v in corners) for i in range(3)]
center=Vector([(lo[i]+hi[i])/2 for i in range(3)])
size=max([hi[i]-lo[i] for i in range(3)]+[.1])
neutral=bpy.data.materials.new('B5_clay_gray')
neutral.diffuse_color=(.66,.66,.68,1)
neutral.use_nodes=True
p=neutral.node_tree.nodes.get('Principled BSDF')
p.inputs['Base Color'].default_value=(.64,.64,.67,1)
p.inputs['Roughness'].default_value=.94
for obj in meshes:
 obj.data.materials.clear();obj.data.materials.append(neutral)
# Distinct floor reference lies below the model's lowest Z in Blender.
floor=bpy.data.materials.new('B5_floor')
floor.diffuse_color=(.17,.18,.20,1)
bpy.ops.mesh.primitive_plane_add(size=2,location=(center.x,center.y,lo[2]-.035))
ground=bpy.context.object;ground.name='preview_ground_not_asset'
ground.scale=(size*.73,size*.73,1);ground.data.materials.append(floor)
def aim(obj,point):obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
def area(direction,power):
 bpy.ops.object.light_add(type='AREA',location=center+Vector(direction)*size)
 obj=bpy.context.object;obj.data.energy=power*max(size,1)
 obj.data.size=size*1.7;aim(obj,center)
area((-2,-3,4),470);area((2,3,3),300)
bpy.ops.object.camera_add();camera=bpy.context.object
camera.data.type='ORTHO';camera.data.ortho_scale=size*1.75
bpy.context.scene.camera=camera
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=960;scene.render.resolution_y=720
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.world.color=(.10,.10,.12)
stem=os.path.splitext(os.path.basename(src))[0]
views=[('front',(0,-1,.28)),('back',(0,1,.28)),('top-oblique',(1,-1,1.45))]
for name,direction in views:
 camera.location=center+Vector(direction).normalized()*size*3.8
 aim(camera,center)
 scene.render.filepath=os.path.join(outdir,stem+'-'+name+'.png')
 bpy.ops.render.render(write_still=True)
 if not os.path.exists(scene.render.filepath) or os.path.getsize(scene.render.filepath)<1000:
  raise RuntimeError('PNG missing: '+scene.render.filepath)
 print('RENDER_OK',name,scene.render.filepath,flush=True)
