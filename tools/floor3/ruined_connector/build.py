"""3F ruined elevated walkway connectors: stair and fractured ramp, each 2m tile."""
import bpy, math, os, random
from mathutils import Vector
OUT='/work/out';os.makedirs(OUT,exist_ok=True)
def material(name,color,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.85
 noise=m.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=24
 bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.24;bump.inputs['Distance'].default_value=.025
 m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
 return m
stone=material('aged concrete',(.41,.40,.35));edge=material('fractured concrete',(.29,.28,.25));rust=material('rusted rebar',(.24,.13,.075),.55);moss=material('moss',(.17,.25,.13))
def cube(name,loc,size,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 b=o.modifiers.new('worn edges','BEVEL');b.width=.016;b.segments=2;o.modifiers.new('weighted normals','WEIGHTED_NORMAL');return o
def rod(name,a,b,r,mat):
 a,b=Vector(a),Vector(b);d=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=d.length,location=(a+b)/2)
 o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat)
def rubble(name,loc,size,mat):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=loc)
 o=bpy.context.object;o.name=name;o.scale=size;o.data.materials.append(mat)
def build(kind):
 rng=random.Random(723+len(kind))
 # 2m x 2m tile; bridge-facing north edge y=+1 at z=.45, lower south edge z=-.45
 if kind=='stairs':
  for i in range(7):
   y=-.855+i*.285
   z=-.39+i*.137
   cube('worn thin concrete tread',(0,y,z), (1.67,.29,.105),stone)
   if i in (2,5):
    rubble('broken stair corner',(rng.choice([-1,1])*.76,y,z+.06),(.15,.11,.09),edge)
 elif kind=='ramp':
  # Staggered narrow slabs approximate a crumbling sloping connection.
  for i in range(12):
   y=-.91+i*.166;z=-.39+i*.076
   x=rng.uniform(-.025,.025)
   slab=cube('fragmented ramp slab',(x,y,z),(1.70,.18,.085),stone)
   if i in (4,7,10):slab.dimensions.x*=.83
 else:
  # bridge-level landing with damaged transition lip
  cube('thin landing',(0,0,.405),(1.70,1.94,.11),stone)
  for i in range(6):
   x=-.7+i*.27;rubble('damaged lip',(x,-.92,.38),(.14,.11,.08),edge)
 for side in (-1,1):
  # delicate broken railing climbs with the stairs
  x=side*.81
  for y,z in [(-.85,-.27),(.02,.20),(.85,.63)]:
   rod('slim rusted post',(x,y,z),(x,y,z+.65),.022,rust)
  rod('sloped upper handrail',(x,-.85,.38),(x,.85,1.28),.028,rust)
  if side==1:
   rod('buckled hanging rail',(x,-.25,.66),(x+.18,.25,.46),.021,rust)
 for i in range(20):
  x=rng.uniform(-.74,.74);y=rng.uniform(-.9,.9)
  z=(.42 if kind=='landing' else -.38+(y+.9)*.48)
  rubble('loose concrete chip',(x,y,z+.055),(rng.uniform(.025,.08),rng.uniform(.025,.08),.025),edge)
 for i in range(12):
  x=rng.uniform(-.72,.72);y=rng.uniform(-.85,.85)
  z=(.47 if kind=='landing' else -.32+(y+.9)*.48)
  rubble('moss seam',(x,y,z),(.04,.07,.008),moss)
def export(name):
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0]
 bpy.ops.export_scene.gltf(filepath=OUT+'/'+name+'.glb',export_format='GLB',use_selection=True,export_apply=True)
 bpy.ops.object.light_add(type='AREA',location=(3,-4,7));bpy.context.object.data.energy=900;bpy.context.object.data.size=5
 bpy.ops.object.light_add(type='AREA',location=(-3,2,4));bpy.context.object.data.energy=450;bpy.context.object.data.size=5
 bpy.ops.object.camera_add();camera=bpy.context.object;bpy.context.scene.camera=camera
 scene=bpy.context.scene
 try:scene.render.engine='BLENDER_EEVEE_NEXT'
 except:scene.render.engine='BLENDER_EEVEE'
 scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100
 camera.data.type='ORTHO';camera.data.ortho_scale=3.8
 for view,loc in [('front',(3,-5,3)),('side',(5,0,2.6)),('angle',(3,-4,4))]:
  camera.location=loc;camera.rotation_euler=(Vector((0,0,.2))-camera.location).to_track_quat('-Z','Y').to_euler()
  scene.render.filepath=OUT+'/'+name+'-'+view+'.png';bpy.ops.render.render(write_still=True)
for kind in ('stairs','ramp','landing'):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 build(kind);export('floor3_ruined_connector_'+kind)
print('FLOOR3_CONNECTOR_RENDER_COMPLETE')
