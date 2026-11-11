import bpy,sys,os
from mathutils import Vector
src,outdir=sys.argv[sys.argv.index('--')+1:]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes:raise RuntimeError('No mesh in '+src)
corners=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
min_y=min(v.y for v in corners)
center=sum(corners,Vector())/len(corners)
size=max(max(v[i] for v in corners)-min(v[i] for v in corners) for i in range(3))
size=max(size,.1)
clay=bpy.data.materials.new('neutral_clay')
clay.diffuse_color=(.65,.66,.68,1)
for o in meshes:
 o.data.materials.clear()
 o.data.materials.append(clay)
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
# Ground is XZ at Y=0. Keep it visible with a thin translucent fill and frame.
ground=bpy.data.materials.new('ground_preview')
ground.diffuse_color=(.23,.32,.4,1)
ground.use_nodes=True
nodes=ground.node_tree.nodes
nodes.clear()
output=nodes.new('ShaderNodeOutputMaterial')
transparent=nodes.new('ShaderNodeBsdfTransparent')
diffuse=nodes.new('ShaderNodeBsdfPrincipled')
diffuse.inputs['Base Color'].default_value=(.22,.3,.4,1)
mix=nodes.new('ShaderNodeMixShader')
mix.inputs[0].default_value=.23
ground.node_tree.links.new(transparent.outputs[0],mix.inputs[1])
ground.node_tree.links.new(diffuse.outputs[0],mix.inputs[2])
ground.node_tree.links.new(mix.outputs[0],output.inputs['Surface'])
bpy.ops.mesh.primitive_plane_add(size=2,location=(center.x,min_y-.04,center.z))
plane=bpy.context.object
plane.name='ground_reference'
plane.scale=(size*.68,size*.68,1)
plane.data.materials.append(ground)
# Blender plane is XY by default; rotate to XZ.
plane.rotation_euler[0]=1.57079632679
edge=bpy.data.materials.new('ground_outline')
edge.diffuse_color=(.18,.65,.8,1)
def frame_line(a,b):
 curve=bpy.data.curves.new('ground_frame','CURVE')
 curve.dimensions='3D';curve.bevel_depth=max(.012,size*.002);curve.bevel_resolution=2
 spline=curve.splines.new('POLY');spline.points.add(1)
 spline.points[0].co=(*a,1);spline.points[1].co=(*b,1)
 obj=bpy.data.objects.new('ground_frame',curve);bpy.context.collection.objects.link(obj)
 obj.data.materials.append(edge)
r=size*.68
pts=[(center.x-r,min_y-.02,center.z-r),(center.x+r,min_y-.02,center.z-r),(center.x+r,min_y-.02,center.z+r),(center.x-r,min_y-.02,center.z+r)]
for i in range(4):frame_line(pts[i],pts[(i+1)%4])
bpy.ops.object.camera_add()
camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=size*1.85
bpy.context.scene.camera=camera
for vec,power in [((3,-4,6),850),((-4,2,4),550)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(vec)*size)
 light=bpy.context.object;light.data.energy=power*max(size,1);light.data.size=size*2;aim(light,center)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20
scene.render.resolution_x=960;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
os.makedirs(outdir,exist_ok=True)
stem=os.path.splitext(os.path.basename(src))[0]
for label,direction in [('front',(0,.18,1)),('back',(0,.18,-1)),('high-angle',(1,1.15,1))]:
 camera.location=center+Vector(direction).normalized()*size*3.5
 aim(camera,center)
 scene.render.filepath=os.path.abspath(os.path.join(outdir,stem+'-'+label+'.png'))
 bpy.ops.render.render(write_still=True)
 print('RENDER_OK',scene.render.filepath)
