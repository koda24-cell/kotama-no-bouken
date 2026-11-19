"""End-face refinement of existing Stage3 window crossbar V3, as V4.
One isolated part; preserves existing scripts and all prior models.
"""
import bpy, math
from mathutils import Vector
from pathlib import Path
src=Path('/work/tools/floor3/window_crossbar01/build.py').read_text(encoding='utf-8')
prefix=src.split('for version in (1,2,3):')[0]
exec(compile(prefix,'crossbar_original','exec'))
create(3)
obj=bpy.data.objects.get('F3_WINDOW_CROSSBAR01')
assert obj is not None
assert len([o for o in bpy.data.objects if o.type=='MESH'])==1
mesh=obj.data
# Small nonuniform chipped cut at both termini. Preserve longitudinal profile,
# load-bearing proportions and hollow channel, rather than deforming whole bar.
for vertex in mesh.vertices:
    side=-1 if vertex.co.x < 0 else 1
    index=vertex.index%len(PROFILE)
    chip= (0.0011 if side<0 else .0017)*(1+.55*math.sin(index*2.7+side))
    if index in (0,1,7): chip*=2.6
    if index in (3,4): chip*=0.32
    vertex.co.x-=side*max(0,chip)
mesh.update()
# End grain exposed steel with slightly warmer oxide; use real polygon end caps.
edge=bpy.data.materials.new('end_cut_worn_steel')
edge.use_nodes=True
node=edge.node_tree.nodes.get('Principled BSDF')
node.inputs['Base Color'].default_value=(.24,.205,.174,1)
node.inputs['Metallic'].default_value=.74
node.inputs['Roughness'].default_value=.77
mesh.materials.append(edge)
for polygon in mesh.polygons:
    if all(abs(mesh.vertices[i].co.x)>L/2-.015 for i in polygon.vertices) and len(polygon.vertices)==3:
        polygon.material_index=1
# Optimize: same one mesh, 2 materials at end caps only.
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True);bpy.context.view_layer.objects.active=obj
stem='f3_window_crossbar01_v4'
bpy.ops.export_scene.gltf(filepath=f'{OUT}/{stem}.glb',export_format='GLB',use_selection=True,export_apply=True)
# Render original look & end cut closeups.
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=36
scene.render.resolution_x=840;scene.render.resolution_y=840
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=True
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=.28
world=bpy.data.worlds.new('overcast_ruins_v4')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.69,.73,.77,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.85
scene.world=world
for pos,energy,size in [((-2,-2.2,3),520,3.2),((1.5,2,2),440,2.8)]:
    bpy.ops.object.light_add(type='AREA',location=pos)
    l=bpy.context.object;l.data.energy=energy;l.data.size=size
bpy.ops.object.camera_add()
cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=1.95
scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/{stem}.blend')
for view,d in [('front',(0,-1,.3)),('side',(1,-.08,.4)),('angle',(1,-1,.72))]:
    target=Vector((0,0,0))
    cam.location=target+Vector(d).normalized()*3.0
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=f'{OUT}/{stem}-{view}.png'
    bpy.ops.render.render(write_still=True)
    print('F3_CROSSBAR_V4_RENDER_OK',view,flush=True)
for name,side in [('end_left',-1),('end_right',1)]:
    target=Vector((side*.68,0,0))
    d=Vector((side*1.0,-.63,.60))
    cam.data.ortho_scale=.36
    cam.location=target+d.normalized()*1.5
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=f'{OUT}/{stem}-{name}.png'
    bpy.ops.render.render(write_still=True)
    print('F3_CROSSBAR_V4_RENDER_OK',name,flush=True)
print('F3_CROSSBAR_V4_ALL_COMPLETE',flush=True)
