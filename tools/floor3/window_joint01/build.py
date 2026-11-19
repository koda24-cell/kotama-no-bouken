"""F3 WINDOW JOINT01 — single modular L-corner steel joining bracket.
One isolated connecting part, compatible with ~100 mm steel channels.
V1 plain bracket, V2 local weld beads, V3 welded/aged metal.
Existing wall, rebar, vertical and crossbar files remain untouched.
"""
import bpy,math,random,os
from mathutils import Vector
OUT='/work/out/f3_window_joint01'
os.makedirs(OUT,exist_ok=True)
def mat(name,color,metal=.75,rough=.72):
 m=bpy.data.materials.new(name)
 m.diffuse_color=(*color,1)
 m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*color,1)
 p.inputs['Metallic'].default_value=metal
 p.inputs['Roughness'].default_value=rough
 return m
def box(name,loc,scale,material,bevel=.001):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
 ob=bpy.context.object;ob.name=name
 ob.dimensions=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 ob.data.materials.append(material)
 if bevel:
  mod=ob.modifiers.new('cut steel rim','BEVEL')
  mod.width=bevel;mod.segments=2;mod.limit_method='ANGLE'
  ob.modifiers.new('weighted normals','WEIGHTED_NORMAL')
 return ob
def bead(name,points,rad,material):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D'
 cu.bevel_depth=rad;cu.bevel_resolution=2
 s=cu.splines.new('POLY');s.points.add(len(points)-1)
 for p,xyz in zip(s.points,points):
  p.co=(*xyz,1)
 ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob)
 ob.data.materials.append(material)
 # convert to mesh for reliable glTF export
 bpy.ops.object.select_all(action='DESELECT')
 ob.select_set(True);bpy.context.view_layer.objects.active=ob
 bpy.ops.object.convert(target='MESH')
 return bpy.context.object
def build(v):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 steel=mat('aged_phosphate_steel',(.28,.30,.29),.77,.73)
 end=mat('edge_worn_metal',(.40,.41,.39),.80,.62)
 weld=mat('dark_weld_metal',(.20,.19,.17),.78,.78)
 oxide=mat('surface_oxide_aged',(.35,.17,.095),.27,.90)
 # small inside-corner reinforcement: two narrow perpendicular tongues, no full window
 # dimensions (x horizontal, z vertical): each 0.16 m long, 3mm thick
 parts=[
  box('JOINT01_horizontal_tongue',(0.075,0,0),(.16,.080,.008),steel),
  box('JOINT01_vertical_tongue',(0,0,.075),(.008,.080,.16),steel),
  box('JOINT01_inside_web',(.013,0,.013),(.036,.082,.036),steel,bevel=.003)]
 if v>=2:
  rng=random.Random(227)
  # short localized beads at the intersection, never smooth perfect ring
  for side in (-1,1):
   y=side*.042
   for typ in (0,1):
    pts=[]
    for i in range(10):
     t=i/9
     wig=(rng.random()-.5)*.0027
     if typ==0:pts.append((.018+.04*t,y+wig,.005))
     else:pts.append((.005,y+wig,.018+.04*t))
    parts.append(bead('weld_bead_%d_%d'%(side,typ),pts,.0028,weld))
 if v>=3:
  # abrasion on physically exposed edges; small, readable asymmetry.
  parts.append(box('small_worn_edge_horizontal',(.144,-.040,-.003),(.024,.0016,.0018),end,.0005))
  parts.append(box('small_worn_edge_vertical',(-.003,-.040,.145),(.0018,.0016,.023),end,.0005))
  # dotted localized oxide deposits at weld root, not on entire bracket
  rng=random.Random(555)
  for i in range(7):
   x=.012+rng.random()*.026
   z=.010+rng.random()*.023
   size=.0035+rng.random()*.004
   parts.append(box('oxide_deposit_%02d'%i,(x,-.042,z),(size,.0015,size),oxide,.0004))
 bpy.ops.object.select_all(action='DESELECT')
 for ob in parts:ob.select_set(True)
 bpy.context.view_layer.objects.active=parts[0]
 # retain individual material distinction but merge object surfaces into single GLB node
 bpy.ops.object.join()
 result=bpy.context.object
 result.name='F3_WINDOW_JOINT01_V%d'%v
 stem=f'f3_window_joint01_v{v}'
 bpy.ops.export_scene.gltf(filepath=f'{OUT}/{stem}.glb',export_format='GLB',use_selection=True,export_apply=True)
 return stem
def render(stem):
 scene=bpy.context.scene
 scene.render.engine='CYCLES';scene.cycles.samples=32
 scene.render.resolution_x=800;scene.render.resolution_y=800
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG'
 scene.render.film_transparent=True
 scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
 scene.view_settings.exposure=.2
 world=bpy.data.worlds.new('overcast_window_joint')
 world.use_nodes=True
 world.node_tree.nodes['Background'].inputs['Color'].default_value=(.70,.73,.77,1)
 world.node_tree.nodes['Background'].inputs['Strength'].default_value=.82
 scene.world=world
 for pos,power,size in [((-1.5,-2.2,2),380,2),((1.3,1.2,2),285,1.8)]:
  bpy.ops.object.light_add(type='AREA',location=pos)
  light=bpy.context.object;light.data.energy=power;light.data.size=size
 bpy.ops.object.camera_add()
 cam=bpy.context.object
 cam.data.type='ORTHO';cam.data.ortho_scale=.32
 scene.camera=cam
 bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/{stem}.blend')
 target=Vector((.046,0,.044))
 for view,d in [('front',(0,-1,.15)),('side',(1,-.23,.18)),('angle',(1,-1,.7))]:
  cam.location=target+Vector(d).normalized()*.8
  cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
  scene.render.filepath=f'{OUT}/{stem}-{view}.png'
  bpy.ops.render.render(write_still=True)
  print('F3_WINDOW_JOINT_RENDER_OK',stem,view,flush=True)
 print('F3_WINDOW_JOINT_ITERATION_COMPLETE',stem,flush=True)
for v in (1,2,3):
 stem=build(v)
 render(stem)
print('F3_WINDOW_JOINT_ALL_COMPLETE',flush=True)
