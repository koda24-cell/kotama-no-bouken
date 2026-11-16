import bpy,sys,os,math,json,hashlib
from mathutils import Vector
src,outdir=sys.argv[sys.argv.index('--')+1:]
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes: raise RuntimeError('No mesh in '+src)
bounds=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
center=sum(bounds,Vector())/len(bounds)
size=max(max(v[i] for v in bounds)-min(v[i] for v in bounds) for i in range(3))
size=max(size,.1)
# Neutral ground is review scenery only, never embedded into the exported cart GLB.
floor_z=min(p[2] for p in bounds)-.025
bpy.ops.mesh.primitive_plane_add(size=size*4,location=(center[0],center[1],floor_z))
floor=bpy.context.object;floor.name='REVIEW_GROUND_NOT_PART_OF_ASSET'
floormat=bpy.data.materials.new('review neutral ash floor');floormat.diffuse_color=(.42,.43,.45,1);floormat.use_nodes=True
shader=floormat.node_tree.nodes.get('Principled BSDF')
if shader: shader.inputs['Base Color'].default_value=(.42,.43,.45,1);shader.inputs['Roughness'].default_value=.93
floor.data.materials.append(floormat)
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=28
scene.render.resolution_x=960;scene.render.resolution_y=720
scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
world=bpy.data.worlds.new('Studio neutral') if not bpy.data.worlds else bpy.data.worlds[0]
scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.66,.66,.68,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.75
scene.view_settings.view_transform='AgX'
bpy.ops.object.camera_add();cam=bpy.context.object
scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=size*1.65
for pos,power,energy_color,diam in [
 ((-3,-4,5),950,(1,1,1),size*2.4),
 ((3,3,3),700,(.90,.94,1),size*3.0),
 ((0,-2,7),450,(1,.92,.82),size*2.0)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(pos)*size)
 light=bpy.context.object;light.data.energy=power*max(size,1);light.data.shape='DISK';light.data.size=diam
 light.data.color=energy_color;aim(light,center)
os.makedirs(outdir,exist_ok=True)
stem=os.path.splitext(os.path.basename(src))[0]
for label,d in [('front',(0,-1,.38)),('side',(1,0,.35)),('angle',(1,-1,.72))]:
 cam.location=center+Vector(d).normalized()*size*3
 aim(cam,center)
 scene.render.filepath=os.path.abspath(os.path.join(outdir,stem+'-'+label+'.png'))
 bpy.ops.render.render(write_still=True)
 print('RENDER_OK',scene.render.filepath,flush=True)
blend=os.path.abspath(os.path.join(outdir,stem+'.blend'))
bpy.ops.wm.save_as_mainfile(filepath=blend)
print('BLEND_CHECKPOINT',blend,flush=True)
