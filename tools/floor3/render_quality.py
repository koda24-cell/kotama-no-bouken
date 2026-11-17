"""Quality review render for Stage 3 building. Independent of original mesh source."""
import bpy,sys,os,math
from mathutils import Vector
src,outdir=sys.argv[sys.argv.index('--')+1:]
src=os.path.abspath(src);outdir=os.path.abspath(outdir);os.makedirs(outdir,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert meshes,'No mesh imported'
corners=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
lo=Vector([min(p[k] for p in corners) for k in range(3)])
hi=Vector([max(p[k] for p in corners) for k in range(3)])
center=(lo+hi)/2
size=max(hi-lo)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=48
scene.render.resolution_x=960
scene.render.resolution_y=720
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
world=bpy.data.worlds.new('ruined city overcast sky') if not bpy.data.worlds else bpy.data.worlds[0]
scene.world=world
world.use_nodes=True
bg=world.node_tree.nodes.get('Background')
bg.inputs['Color'].default_value=(.64,.70,.76,1)
bg.inputs['Strength'].default_value=.9
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=.65
scene.view_settings.gamma=1
def aim(ob,target):
 ob.rotation_euler=(target-ob.location).to_track_quat('-Z','Y').to_euler()
for label,rel,power,dimension in [
 ('large-softbox',(-.8,-1.1,1.3),2400,1.1),
 ('side-fill',(1.1,.5,.75),1900,.95),
 ('rim',(-.6,1.0,1.35),1600,.75)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(rel)*size)
 ob=bpy.context.object;ob.name=label;ob.data.energy=power*(size/13)**2;ob.data.size=size*dimension;aim(ob,center)
bpy.ops.object.camera_add()
camera=bpy.context.object
camera.data.type='ORTHO'
camera.data.ortho_scale=size*1.45
scene.camera=camera
stem=os.path.splitext(os.path.basename(src))[0]
# Blender checkpoint contains exactly the imported source plus review setup.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(outdir,stem+'.blend'))
for label,direction in [('front',(0,-1,.28)),('side',(1,0,.27)),('angle',(1,-1,.75))]:
 camera.location=center+Vector(direction).normalized()*size*2.8
 aim(camera,center)
 scene.render.filepath=os.path.join(outdir,stem+'-'+label+'.png')
 bpy.ops.render.render(write_still=True)
 print('B3_QUALITY_RENDER_OK',label,scene.render.filepath,flush=True)
print('B3_QUALITY_ALL_VIEWS_COMPLETE')
