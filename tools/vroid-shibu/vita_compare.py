import bpy,os,json
from mathutils import Vector
src='/tmp/Vita.vrm';out='output/vroid-shibu/vita-comparison';os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
inventory=[{'name':o.name,'vertices':len(o.data.vertices),'faces':len(o.data.polygons)} for o in meshes]
# Hair removal is a visibility-only trial, preserving the original imported geometry.
for o in meshes:
 n=o.name.lower()
 o.hide_render=('hair' in n or 'sphere' in n or 'accessory' in n)
face=next((o for o in meshes if o.name.lower()=='face'),None)
if face is None:raise RuntimeError('Vita Face mesh missing; inspect inventory before proceeding: '+str(inventory))
# Strict head-only: prevent eyes/garments/hidden original hair from contaminating rear view.
for o in meshes:o.hide_render=(o!=face)
coords=[face.matrix_world @ Vector(c) for c in face.bound_box]
lo=Vector([min(v[i] for v in coords) for i in range(3)])
hi=Vector([max(v[i] for v in coords) for i in range(3)])
center=(lo+hi)*.5;span=hi-lo
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=960;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
world=bpy.data.worlds.new('Neutral');scene.world=world;world.color=(.65,.65,.65)
bpy.ops.object.light_add(type='AREA',location=center+Vector((2,3,4)))
light=bpy.context.object;light.data.energy=700;light.data.size=4
light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
for name,vec in [('front',(0,1,0)),('back',(0,-1,0)),('side',(1,0,0)),('back_upper',(0,-1,.55))]:
 bpy.ops.object.camera_add(location=center+Vector(vec).normalized()*max(2,span.length*5))
 cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
 cam.data.type='ORTHO';cam.data.ortho_scale=max(span.z*1.5,span.x*1.5,span.y*2,.18)
 scene.camera=cam;scene.render.filepath=os.path.join(out,name+'.png')
 bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT');face.select_set(True);bpy.context.view_layer.objects.active=face
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'vita_bare_head.glb'),export_format='GLB',use_selection=True)
with open(os.path.join(out,'mesh_inventory.json'),'w') as f:json.dump({'source':'Vita.vrm','meshes':inventory,'head':face.name,'bounds':[list(lo),list(hi)],'hair_added':False},f,indent=2)
