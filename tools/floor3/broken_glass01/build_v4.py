"""V4: keep previous glass V1–V3, repair the silhouette and visibility.
Dark neutral render-only background; actual thin glass and close-up cracks.
"""
import bpy,math
from pathlib import Path
from mathutils import Vector
src=Path('/work/tools/floor3/broken_glass01/build.py').read_text(encoding='utf8')
prefix=src.split('for v in (1,2,3):')[0]
exec(compile(prefix,'f3_glass_original','exec'))
# Distinct fracture depths, unequal zigzag frequencies, one wide broken scallop.
EDGES[:]=[
 (-.56,-.90),(.56,-.90),(.56,-.47),(.515,-.43),(.55,-.30),
 (.56,-.03),(.50,.09),(.525,.21),(.43,.33),(.405,.40),
 (.26,.37),(.195,.53),(.083,.50),(.022,.635),(-.126,.612),
 (-.215,.79),(-.282,.72),(-.36,.85),(-.56,.89),
 (-.56,.51),(-.498,.42),(-.56,.285),(-.56,.01),
 (-.488,-.105),(-.56,-.19)]
original_crack=crack
def crack(name,points,radius,matl):
 return original_crack(name,points,radius*1.8,matl)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
dirt=dirt_texture()
core=glass(3,dirt)
# Localized fractures originate at existing broken edge and taper away;
# extra branches intentionally shorter than V3.
line=mat('edge_fissure_smoky_gray',(.13,.20,.22),.05,.64)
objs=[core]
routes=[
 [( .405,.40),(.323,.31),(.283,.21),(.24,.08),(.205,-.04)],
 [(.283,.21),(.15,.17),(.062,.075),(-.04,.02)],
 [(.205,-.04),(.29,-.15),(.32,-.275)],
 [(-.215,.79),(-.18,.65),(-.10,.59),(-.043,.48)],
 [(-.10,.59),(-.04,.51),(.045,.425)]
]
for i,pts in enumerate(routes):
 objs.append(crack(f'glass_fracture_v4_{i}',pts,.00095 if i<3 else .00065,line))
bpy.ops.object.select_all(action='DESELECT')
for obj in objs:obj.select_set(True)
bpy.context.view_layer.objects.active=core
stem='f3_broken_glass01_v4'
bpy.ops.export_scene.gltf(filepath=f'{OUT}/{stem}.glb',export_format='GLB',
                          use_selection=True,export_apply=True)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=36
scene.render.resolution_x=820;scene.render.resolution_y=820
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=.06
world=bpy.data.worlds.new('soft_side_window_room')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.29,.35,.42,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.60
scene.world=world
# Rich dark neutral backing is only for QA preview; never exported into GLB.
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,.46,0),rotation=(math.pi/2,0,0))
back=bpy.context.object
back.name='RENDER_ONLY_CONTRAST_BACKDROP'
back.scale=(1.25,1.25,1)
dark=bpy.data.materials.new('neutral_background')
dark.use_nodes=True
n=dark.node_tree.nodes;n.clear()
e=n.new('ShaderNodeEmission');e.inputs['Color'].default_value=(.065,.085,.102,1)
e.inputs['Strength'].default_value=.75
o=n.new('ShaderNodeOutputMaterial');dark.node_tree.links.new(e.outputs[0],o.inputs['Surface'])
back.data.materials.append(dark)
for p,power,size in [((-2,-2,2.8),580,2.2),((2,1,2),420,2.1),((0,.2,2),290,1.5)]:
 bpy.ops.object.light_add(type='AREA',location=p)
 l=bpy.context.object;l.data.energy=power;l.data.size=size
bpy.ops.object.camera_add()
cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.35
scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/{stem}.blend')
for name,d,scale,target in [
 ('front',(0,-1,.13),2.30,Vector((0,0,0))),
 ('side',(1,-.35,.18),2.30,Vector((0,0,0))),
 ('angle',(1,-1,.35),2.30,Vector((0,0,0))),
 ('fracture_detail',(1,-1,.25),.80,Vector((.15,0,.32)))]:
 cam.data.ortho_scale=scale
 cam.location=target+Vector(d).normalized()*3
 cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=f'{OUT}/{stem}-{name}.png'
 bpy.ops.render.render(write_still=True)
 print('F3_GLASS_V4_RENDER_OK',name,flush=True)
print('F3_GLASS_V4_ALL_COMPLETE',flush=True)
