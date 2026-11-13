import bpy,sys,os,math,random
from mathutils import Vector
src,outdir,tex=sys.argv[sys.argv.index('--')+1:]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes:raise RuntimeError('Missing gloom mesh')
# Actual Kenney CC0 smoke sprite, used on intersecting translucent planes.
image=bpy.data.images.load(os.path.abspath(tex))
mat=bpy.data.materials.new('Kenney_CC0_smoke_tinted');mat.use_nodes=True
nodes=mat.node_tree.nodes;nodes.clear();links=mat.node_tree.links
out=nodes.new('ShaderNodeOutputMaterial');shader=nodes.new('ShaderNodeBsdfPrincipled')
shader.inputs['Base Color'].default_value=(.12,.055,.17,1)
shader.inputs['Alpha'].default_value=.32
shader.inputs['Roughness'].default_value=1
texnode=nodes.new('ShaderNodeTexImage');texnode.image=image
links.new(texnode.outputs['Alpha'],shader.inputs['Alpha'])
links.new(shader.outputs['BSDF'],out.inputs['Surface'])
mat.diffuse_color=(.15,.05,.22,.3)
if hasattr(mat,'surface_render_method'):mat.surface_render_method='DITHERED'
elif hasattr(mat,'blend_method'):mat.blend_method='BLEND'
for i in range(11):
 a=i*2.399; r=.08+.26*(i%4)/3
 x=math.cos(a)*r;y=math.sin(a)*r;z=.10+.045*(i%3)
 bpy.ops.mesh.primitive_plane_add(size=.27,location=(x,y,z))
 obj=bpy.context.object;obj.name='kenney-cc0-smoke-card-'+str(i)
 obj.rotation_euler=(math.pi/2,0,a)
 obj.scale=(1,1.4,1)
 obj.data.materials.append(mat)
# Reference tile and stage lighting.
floor=bpy.data.materials.new('dark_stone');floor.diffuse_color=(.11,.10,.14,1)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.055))
tile=bpy.context.object;tile.name='one_tile_ground';tile.scale=(.5,.5,.045);tile.data.materials.append(floor)
world=bpy.context.scene.world;world.color=(.13,.11,.16)
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power,color in [((1,-2,3),350,(.85,.75,1)),((-2,1,2),250,(1,.15,.36))]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=3;aim(o,(0,0,.1))
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=1.7;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
scene.view_settings.view_transform='Standard';scene.view_settings.exposure=0
scene.render.resolution_x=960;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
os.makedirs(outdir,exist_ok=True)
for label,vec in [('front',(0,-2,.7)),('side',(2,0,.8)),('high-angle',(1.4,-1.6,2.1))]:
 cam.location=vec;aim(cam,(0,0,.10))
 scene.render.filepath=os.path.abspath(os.path.join(outdir,'b5-gloom-patch-'+label+'.png'))
 bpy.ops.render.render(write_still=True)
 print('RENDER_OK',scene.render.filepath)
