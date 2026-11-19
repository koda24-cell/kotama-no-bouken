"""V5 material refinement: wall-to-frame bracket only. Preserve original V1-V3.
Replace protruding tube-shaped welds with small adherent beads at two true
intersection lines. No loose oxide cubes. PBR procedural roughness for patina.
"""
import bpy,math,random
from pathlib import Path
from mathutils import Vector
src=Path('/work/tools/floor3/window_joint01/build.py').read_text(encoding='utf-8')
prefix=src.split('for v in (1,2,3):')[0]
exec(compile(prefix,'joint01_original','exec'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
v=5
base=build(1)
# build(1) performs export before render setup and leaves the single joined base
root=bpy.data.objects.get('F3_WINDOW_JOINT01_V1')
assert root is not None
root.name='F3_WINDOW_JOINT01_V5_BASE'
# aged zinc-coated steel: no extra rust particles added to original silhouette
steel=root.data.materials[0]
nodes=steel.node_tree.nodes
link=steel.node_tree.links
bs=nodes.get('Principled BSDF')
noise=nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value=92
noise.inputs['Detail'].default_value=1.5
ramp=nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position=.15
ramp.color_ramp.elements[0].color=(.070,.082,.083,1)
ramp.color_ramp.elements[1].position=.84
ramp.color_ramp.elements[1].color=(.22,.225,.205,1)
link.new(noise.outputs['Fac'],ramp.inputs['Fac'])
link.new(ramp.outputs['Color'],bs.inputs['Base Color'])
bs.inputs['Metallic'].default_value=.70
bs.inputs['Roughness'].default_value=.77
# weld bead seam follows true L-web intersection, x=.031 and z=.031; short y passes
weld=mat('compressed_weld_seam_v5',(.10,.11,.12),.82,.76)
rng=random.Random(409)
new=[]
for seam in (0,1):
 pts=[]
 for i in range(21):
  y=-.032+.064*i/20
  uneven=.00045*math.sin(i*2.4)+rng.uniform(-.00018,.00018)
  x=.0324 + (uneven if seam==0 else .002)
  z=.0308 + (uneven if seam==1 else .002)
  pts.append((x,y,z))
 ob=bead('short_root_seam_%d'%seam,pts,.0019,weld)
 new.append(ob)
# minute pitting and softened discoloration remain in material; no round beads floating
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
for ob in new:ob.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.object.join()
ob=bpy.context.object;ob.name='F3_WINDOW_JOINT01_V5'
stem='f3_window_joint01_v5'
bpy.ops.export_scene.gltf(filepath=f'{OUT}/{stem}.glb',export_format='GLB',use_selection=True,export_apply=True)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=40
scene.render.resolution_x=860;scene.render.resolution_y=860
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=True
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=-.23
world=bpy.data.worlds.new('daylight_window_joint_v5')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.73,.75,.77,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.85
scene.world=world
for p,e,s in [((-1.1,-1.7,1.5),400,1.7),((1.0,1.5,1.8),320,1.8)]:
 bpy.ops.object.light_add(type='AREA',location=p)
 light=bpy.context.object;light.data.energy=e;light.data.size=s
bpy.ops.object.camera_add()
cam=bpy.context.object
cam.data.type='ORTHO';cam.data.ortho_scale=.32
scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/{stem}.blend')
focus=Vector((.047,0,.047))
for label,d,scale in [('front',(0,-1,.12),.32),('side',(1,-.2,.15),.32),('angle',(1,-1,.7),.32),('weld_detail',(1,-1,.35),.14)]:
 cam.data.ortho_scale=scale
 point=Vector((.031,0,.031)) if label=='weld_detail' else focus
 cam.location=point+Vector(d).normalized()*.75
 cam.rotation_euler=(point-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=f'{OUT}/{stem}-{label}.png'
 bpy.ops.render.render(write_still=True)
 print('F3_WINDOW_JOINT_V5_RENDER_OK',label,flush=True)
print('F3_WINDOW_JOINT_V5_ALL_COMPLETE',flush=True)
