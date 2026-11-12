import bpy,sys,os
from mathutils import Vector
src,outdir=sys.argv[sys.argv.index('--')+1:]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes:raise RuntimeError('No mesh in '+src)
# Verify imported axis using the hero icefall geometry, not assumed exporter axes.
hero=[o for o in meshes if 'hero_waterfall' in o.name]
if not hero:
 raise RuntimeError('Missing named hero waterfall after GLB import')
def bounds(objects):
 corners=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
 lo=Vector([min(v[i] for v in corners) for i in range(3)])
 hi=Vector([max(v[i] for v in corners) for i in range(3)])
 return lo,hi
hlo,hhi=bounds(hero)
extent=hhi-hlo
print('AXIS_CHECK hero_world_extent_xyz',list(extent))
# Some GLB exporters encode a Z-up to Y-up transform; Blender may import this
# with the tall dimension on Y. Correct the scene once, before cameras/lights.
if extent.y>extent.z*1.45 and extent.y>extent.x*.7:
 from mathutils import Matrix
 rotation=Matrix.Rotation(1.5707963267948966,4,'X')
 for o in list(bpy.context.scene.objects):
  if o.parent is None:
   o.matrix_world=rotation@o.matrix_world
 hlo,hhi=bounds(hero)
 extent=hhi-hlo
 print('AXIS_CORRECTED hero_world_extent_xyz',list(extent))
if extent.z<extent.x*.65:
 raise RuntimeError('Waterfall is not upright in Blender: '+str(list(extent)))
lo,hi=bounds(meshes)
center=(lo+hi)*.5
size=max(hi[i]-lo[i] for i in range(3))
size=max(size,.1)
print('AXIS_OK waterfall height',extent.z,'width',extent.x)
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
camera=bpy.context.object
camera.data.type='ORTHO'
camera.data.ortho_scale=size*1.38
bpy.context.scene.camera=camera
for vec,power in [((3,-4,6),850),((-4,2,4),550)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(vec)*size)
 light=bpy.context.object
 light.data.energy=power*max(size,1)
 light.data.size=size*2
 aim(light,center)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=48
scene.render.resolution_x=1100
scene.render.resolution_y=820
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
os.makedirs(outdir,exist_ok=True)
stem=os.path.splitext(os.path.basename(src))[0]
for label,direction in [('front',(0,-1,.08)),('side',(1,-.12,.12)),('angle',(.58,-1,.24))]:
 camera.location=center+Vector(direction).normalized()*size*3
 aim(camera,center)
 scene.render.filepath=os.path.abspath(os.path.join(outdir,stem+'-'+label+'.png'))
 bpy.ops.render.render(write_still=True)
 print('RENDER_OK',scene.render.filepath)
