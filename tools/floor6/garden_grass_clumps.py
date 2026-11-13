"""Floor 6 garden: modular stylized grass clumps; separate GLB and four renders."""
import bpy, math, os, random
from mathutils import Vector
random.seed(613)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
out=os.path.abspath('render-output/floor6/garden-grass'); os.makedirs(out,exist_ok=True)
def mat(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1)
 m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.82
 return m
colors=[mat('soft moss green',(.19,.36,.12)),mat('sunlit grass',(.31,.47,.17)),mat('forest grass',(.12,.27,.11)),mat('warm meadow',(.41,.49,.22))]
# Four independent modular grass clumps with broad tapered, gently folded blades.
# Each clump occupies a sub-cell of the presentation layout and can be reused alone.
for clump in range(4):
 count=[9,15,22,12][clump]
 base=Vector((((clump%2)-.5)*1.4,((clump//2)-.5)*1.4,0))
 for material_index in range(4):
  verts=[];faces=[]
  for blade in range(count):
   if blade%4!=material_index:continue
   angle=blade*2.399963+clump*.7+random.uniform(-.22,.22)
   radius=random.uniform(.012,.095)
   origin=base+Vector((radius*math.cos(angle),radius*math.sin(angle),0))
   length=random.uniform(.24,.52)*(1.2 if clump==2 else 1)
   lean=random.uniform(.10,.34)
   width=random.uniform(.022,.055)
   tangent=Vector((math.cos(angle),math.sin(angle),0));side=Vector((-tangent.y,tangent.x,0))
   start=len(verts)
   for step in range(6):
    t=step/5
    center=origin+tangent*(lean*t*t)+Vector((0,0,length*(t-.09*t*t)))
    half=width*(1-t)**.8*(.85+.15*math.sin(math.pi*t))
    fold=Vector((0,0,.009*math.sin(math.pi*t)))
    for q in (-1,0,1):verts.append(tuple(center+side*(q*half)+fold*(1-q*q)))
   for step in range(5):
    a=start+3*step
    faces.extend([(a,a+1,a+4,a+3),(a+1,a+2,a+5,a+4)])
  if not verts:continue
  mesh=bpy.data.meshes.new('grass blade mesh');mesh.from_pydata(verts,[],faces);mesh.update()
  ob=bpy.data.objects.new('grass_clump_%02d_color_%d'%(clump+1,material_index),mesh)
  bpy.context.collection.objects.link(ob);mesh.materials.append(colors[material_index])
  for face in mesh.polygons:face.use_smooth=True
# Export all 4 as a modular set, with object names identifying the clumps.
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.context.scene.objects:
 if ob.type=='MESH':ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'f6_garden_grass_clumps_v1.glb'),export_format='GLB',use_selection=True)
bpy.ops.object.select_all(action='DESELECT')
world=bpy.context.scene.world;world.color=(.22,.27,.22)
def light(loc,power,size):
 data=bpy.data.lights.new('softbox','AREA');data.energy=power;data.shape='DISK';data.size=size
 obj=bpy.data.objects.new('softbox',data);bpy.context.collection.objects.link(obj);obj.location=loc
 obj.rotation_euler=(Vector((0,0,.15))-obj.location).to_track_quat('-Z','Y').to_euler()
light((2,-3,4),600,4);light((-2,2,3),400,3)
camdata=bpy.data.cameras.new('camera');cam=bpy.data.objects.new('camera',camdata);bpy.context.collection.objects.link(cam);bpy.context.scene.camera=cam
camdata.type='ORTHO';camdata.ortho_scale=3.0
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=960;scene.render.resolution_y=960;scene.render.resolution_percentage=100
for view,loc in [('angle',(3,-4,3)),('front',(0,-5,1.4)),('side',(5,0,1.4)),('top',(0,-.01,5))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,0,.15))-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=os.path.join(out,'f6_garden_grass_'+view+'.png')
 bpy.ops.render.render(write_still=True)
print('F6_GARDEN_GRASS_DONE',flush=True)
