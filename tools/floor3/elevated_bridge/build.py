"""Modular ruined elevated bridge: straight, end, collapse, support. Blender only."""
import bpy, math, os, random
from mathutils import Vector
OUT='/work/out';os.makedirs(OUT,exist_ok=True)
def mat(n,c,m=0):
 a=bpy.data.materials.new(n);a.diffuse_color=(*c,1);a.use_nodes=True;p=a.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=m;p.inputs['Roughness'].default_value=.82;return a
stone=mat('aged concrete',(.43,.42,.35));fracture=mat('exposed aggregate',(.31,.30,.26));steel=mat('oxidized steel',(.20,.15,.115),.65);moss=mat('lichen',(.17,.25,.12))
def box(n,loc,dims,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=n;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);b=o.modifiers.new('rounded worn edges','BEVEL');b.width=.025;b.segments=2;o.modifiers.new('weighted normal','WEIGHTED_NORMAL');return o
def bar(n,a,b,r,m):
 a=Vector(a);b=Vector(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.name=n;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(m)
def rubble(n,loc,scale,m):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=loc);o=bpy.context.object;o.name=n;o.scale=scale;o.data.materials.append(m)
def rail(side,short=False,broken=False):
 x=side*.86;end=.45 if short else .94
 for y in (-.94,end):bar('rail upright',(x,y,.49),(x,y,1.35),.034,steel)
 if broken:
  bar('buckled railing',(x,-.94,1.35),(x+side*.17,0,1.04),.04,steel)
  bar('hanging railing',(x+side*.17,0,1.04),(x+side*.26,end,.72),.036,steel)
 else:
  bar('upper railing',(x,-.94,1.35),(x,end,1.35),.043,steel)
  bar('middle railing',(x,-.94,.94),(x,end,.94),.028,steel)
def build(kind):
 if kind=='straight' or kind=='support':box('full bridge deck',(0,0,.31),(1.85,2,.35),stone)
 if kind=='end':
  box('terminal deck',(0,-.2,.31),(1.85,1.6,.35),stone)
  for i in range(11):rubble('irregular fractured terminus',(-.83+i*.165,.61+.07*math.sin(i*2.7),.34),(.13,.11,.14),fracture)
 if kind=='collapse':
  box('surviving left deck',(-.56,-.15,.31),(.73,1.7,.35),stone)
  box('surviving right deck',(.56,-.37,.31),(.68,1.26,.35),stone)
  for i in range(13):rubble('jagged break edge',(-.8+(i%5)*.36,.25+(i//5)*.22,.22),(.09,.13,.10),fracture)
  bar('exposed reinforcement',(-.63,.36,.33),(-.32,.95,.09),.024,steel)
  bar('exposed reinforcement',(.55,.22,.33),(.27,.85,-.02),.024,steel)
 if kind=='support':
  box('pier shaft',(0,0,-.68),(.62,.67,1.65),stone)
  box('pier foundation',(0,0,-1.53),(1.02,1.03,.24),fracture)
  for x in (-.28,.28):
   for y in (-.28,.28):bar('foundation anchor',(x,y,-1.48),(x,y,-1.26),.028,steel)
 for x in (-.7,.7):box('under deck girder',(x,0,.07),(.14,1.95,.19),steel)
 for y in (-.65,0,.65):box('under deck cross beam',(0,y,.07),(1.45,.10,.15),steel)
 for i in range(17):
  x=-.75+(i*37%101)/101*1.5;y=-.84+(i*53%97)/97*1.7
  rubble('moss patch',(x,y,.50),(.045,.08,.008),moss)
 for side in (-1,1):rail(side,kind=='end',kind=='collapse')
def export(name):
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0]
 bpy.ops.export_scene.gltf(filepath=OUT+'/'+name+'.glb',export_format='GLB',use_selection=True,export_apply=True)
 bpy.ops.object.light_add(type='AREA',location=(3,-4,7));key=bpy.context.object;key.data.energy=850;key.data.size=5
 bpy.ops.object.light_add(type='AREA',location=(-3,2,4));fill=bpy.context.object;fill.data.energy=430;fill.data.size=5
 bpy.ops.object.camera_add();camera=bpy.context.object;bpy.context.scene.camera=camera
 scene=bpy.context.scene
 try:scene.render.engine='BLENDER_EEVEE_NEXT'
 except:scene.render.engine='BLENDER_EEVEE'
 scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 camera.data.type='ORTHO';camera.data.ortho_scale=4.6
 for view,loc in [('front',(3,-5,3)),('side',(5,0,2.6)),('angle',(3,-4,4))]:
  camera.location=loc;camera.rotation_euler=(Vector((0,0,-.25))-camera.location).to_track_quat('-Z','Y').to_euler()
  scene.render.filepath=OUT+'/'+name+'-'+view+'.png';bpy.ops.render.render(write_still=True)
for kind in ('straight','end','collapse','support'):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 build(kind);export('floor3_elevated_bridge_'+kind)
print('FLOOR3_ELEVATED_BRIDGE_RENDER_COMPLETE')
