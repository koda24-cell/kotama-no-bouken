"""Blender 3-view verification for five unapproved B2 fern leaf GLBs."""
import bpy, math, os, json, hashlib
from pathlib import Path
from mathutils import Vector
root=Path(os.environ.get('B2_LEAF_OUTPUT','render-output/b2-fern-leaf-v03')).resolve()
manifest=json.loads((root/'manifest.json').read_text())
assert manifest['status']=='NOT_APPROVED'
for spec in manifest['variants']:
    name=spec['id']
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(root/(name+'.glb')))
    models=[o for o in bpy.context.scene.objects if o.type=='MESH']
    assert models, name
    world=bpy.context.scene.world or bpy.data.worlds.new('World')
    bpy.context.scene.world=world
    world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.70,.76,.76,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
    bpy.ops.object.light_add(type='AREA',location=(.15,-.3,.35))
    bpy.context.object.data.energy=190
    bpy.context.object.data.shape='DISK'
    bpy.context.object.data.size=.45
    bpy.ops.object.camera_add()
    camera=bpy.context.object
    camera.data.type='ORTHO'
    camera.data.ortho_scale=.18
    scene=bpy.context.scene
    scene.camera=camera
    scene.render.engine='BLENDER_EEVEE'
    scene.render.image_settings.file_format='PNG'
    scene.render.resolution_x=800
    scene.render.resolution_y=800
    scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    focus=Vector((0,0,.058))
    for view,pos in [('front',(0,-.45,.07)),('side',(.42,0,.08)),('angle',(.25,-.35,.20))]:
        camera.location=pos
        camera.rotation_euler=(focus-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(root/(name+'_'+view+'.png'))
        bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(root/(name+'.blend')))
    spec['render_files']=[name+'_'+view+'.png' for view in ('front','side','angle')]
    spec['render_sha256']={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in spec['render_files']}
manifest['blender_render_status']='GENERATED_UNAPPROVED'
(root/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
print('B2_LEAF_BLENDER_RENDERS',len(manifest['variants'])*3)
