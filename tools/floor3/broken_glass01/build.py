"""F3 Broken Window Glass 01: standalone glass sheet only, not a window assembly.
V1 jagged outline; V2 adds localized branching crack paths; V3 adds light dusty
glass PBR with self-authored dirt mask texture. Preserve all earlier stages.
"""
import bpy,math,random,os
from mathutils import Vector
OUT='/work/out/f3_broken_glass01'
os.makedirs(OUT,exist_ok=True)
WIDTH=1.12
HEIGHT=1.80
THICKNESS=.006
# glass vertical in X/Z plane, no frame. Broken upper right and left margin.
EDGES=[
(-.56,-.90),(.56,-.90),(.56,-.53),(.51,-.47),(.54,-.34),
(.56,-.21),(.56,.06),(.49,.17),(.53,.31),(.38,.40),(.35,.51),
(.19,.48),(.17,.64),(.05,.61),(-.015,.72),(-.15,.67),(-.23,.77),
(-.35,.73),(-.39,.89),(-.56,.89),(-.56,.46),(-.50,.39),
(-.56,.27),(-.56,-.07),(-.49,-.14),(-.56,-.21)]
def mat(name,c,transmission,roughness):
 m=bpy.data.materials.new(name);m.use_nodes=True
 shader=m.node_tree.nodes.get('Principled BSDF')
 shader.inputs['Base Color'].default_value=(*c,1)
 shader.inputs['Metallic'].default_value=.0
 shader.inputs['Roughness'].default_value=roughness
 shader.inputs['Transmission Weight'].default_value=transmission
 shader.inputs['IOR'].default_value=1.47
 return m
def dirt_texture():
 w=h=256
 im=bpy.data.images.new('F3_WINDOW_DIRT_MASK_01',width=w,height=h,alpha=True)
 r=random.Random(9064)
 pixels=[]
 for j in range(h):
  y=j/(h-1)
  for i in range(w):
   x=i/(w-1)
   edge=max(0,1-min(x,1-x,y,1-y)/.15)
   # mostly translucent areas, dusty edges / patchy deposits near cracks
   patches=.16*max(0,math.sin(16*x+7*y)*math.sin(19*y-5*x))
   spot=max(0,1-((x-.76)/.14)**2-((y-.61)/.12)**2)*.24
   value=max(0,min(1,.09+.29*edge+patches+spot+r.uniform(-.035,.035)))
   pixels.extend((value,value,value,1.))
 im.pixels[:]=pixels
 im.filepath_raw=f'{OUT}/F3_WINDOW_DIRT_MASK_01.png'
 im.file_format='PNG'
 im.save()
 return im
def glass(v,dirt):
 # Triangulation via Blender face tessellation: single simple polygon,
 # solidify modifier defines physical glass thickness (6 mm).
 verts=[(x,0,z) for x,z in EDGES]
 mesh=bpy.data.meshes.new('irregular_window_glass_mesh')
 mesh.from_pydata(verts,[],[tuple(range(len(verts)))])
 mesh.update()
 obj=bpy.data.objects.new('F3_BROKEN_GLASS01_MAIN',mesh)
 bpy.context.collection.objects.link(obj)
 for polygon in mesh.polygons:polygon.use_smooth=False
 shader=mat('weathered_glass_pbr',(.58,.73,.71) if v==3 else (.68,.81,.82),.78 if v==3 else .90,.24 if v==3 else .13)
 if v==3:
  nodes=shader.node_tree.nodes;links=shader.node_tree.links
  tex=nodes.new('ShaderNodeTexImage');tex.image=dirt
  geo=nodes.new('ShaderNodeTexCoord')
  mapping=nodes.new('ShaderNodeMapping')
  links.new(geo.outputs['Generated'],mapping.inputs['Vector'])
  links.new(mapping.outputs['Vector'],tex.inputs['Vector'])
  ramp=nodes.new('ShaderNodeMapRange')
  ramp.inputs['From Min'].default_value=.0;ramp.inputs['From Max'].default_value=1.0
  ramp.inputs['To Min'].default_value=.14;ramp.inputs['To Max'].default_value=.53
  links.new(tex.outputs['Color'],ramp.inputs['Value'])
  links.new(ramp.outputs['Result'],nodes.get('Principled BSDF').inputs['Roughness'])
 mesh.materials.append(shader)
 sol=obj.modifiers.new('actual glass thickness','SOLIDIFY')
 sol.thickness=THICKNESS
 sol.offset=0
 bevel=obj.modifiers.new('tiny cut rim','BEVEL')
 bevel.width=.0009;bevel.segments=1;bevel.limit_method='ANGLE'
 return obj
def crack(name,points,radius,matl):
 curve=bpy.data.curves.new(name,'CURVE')
 curve.dimensions='3D'
 curve.bevel_depth=radius;curve.bevel_resolution=1
 s=curve.splines.new('POLY')
 s.points.add(len(points)-1)
 for pt,p in zip(points,s.points):p.co=(pt[0],-.0036,pt[1],1)
 ob=bpy.data.objects.new(name,curve)
 bpy.context.collection.objects.link(ob)
 ob.data.materials.append(matl)
 bpy.ops.object.select_all(action='DESELECT')
 ob.select_set(True)
 bpy.context.view_layer.objects.active=ob
 bpy.ops.object.convert(target='MESH')
 return bpy.context.object
def build(v):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 dirt=dirt_texture() if v==3 else None
 core=glass(v,dirt)
 objs=[core]
 if v>=2:
  line=mat('fracture_hairline_tinted',(.30,.39,.40),.18,.55)
  # Crack lengths branch from true chipped boundary at upper right, not a web.
  routes=[
   [(.35,.50),(.28,.40),(.23,.35),(.20,.25),(.14,.20),(.11,.06)],
   [(.23,.35),(.12,.33),(.04,.25),(-.07,.22)],
   [(.14,.20),(.21,.08),(.24,-.03),(.28,-.14)],
   [(.19,.48),(.13,.40),(.09,.36)],
   [(-.39,.89),(-.35,.75),(-.29,.64),(-.24,.55),(-.15,.52)]]
  for i,route in enumerate(routes[:3 if v==2 else 5]):
   objs.append(crack('crack_branch_%d'%i,route,.00085 if i<3 else .00055,line))
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=core
 # Export only the glass and hairline fractures, no lights or display backing plane.
 stem='f3_broken_glass01_v%d'%v
 bpy.ops.export_scene.gltf(filepath=f'{OUT}/{stem}.glb',export_format='GLB',use_selection=True,export_apply=True)
 return stem
def render(stem):
 scene=bpy.context.scene
 scene.render.engine='CYCLES';scene.cycles.samples=40
 scene.render.resolution_x=820;scene.render.resolution_y=820
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG'
 scene.render.film_transparent=False
 scene.view_settings.view_transform='AgX'
 scene.view_settings.look='AgX - Medium High Contrast'
 scene.view_settings.exposure=.18
 world=bpy.data.worlds.new('window_glass_studio')
 world.use_nodes=True
 world.node_tree.nodes['Background'].inputs['Color'].default_value=(.40,.50,.60,1)
 world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
 scene.world=world
 # Studio backing is render-only: thin plane, muted dark to reveal transparent glass.
 bpy.ops.mesh.primitive_plane_add(size=2,location=(0,.45,0),rotation=(math.pi/2,0,0))
 background=bpy.context.object;background.name='RENDER_ONLY_BACKDROP'
 background.scale=(1.25,1.25,1.0)
 backmat=bpy.data.materials.new('bluegray_contrast_backdrop')
 backmat.diffuse_color=(.13,.16,.20,1)
 background.data.materials.append(backmat)
 # Preserve transparency test: backdrop not exported.
 for loc,energy,size in [((-2,-3,3),590,2.8),((2,1,2),370,2.5)]:
  bpy.ops.object.light_add(type='AREA',location=loc)
  ob=bpy.context.object;ob.data.energy=energy;ob.data.size=size
 bpy.ops.object.camera_add()
 cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.30
 scene.camera=cam
 bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/{stem}.blend')
 center=Vector((0,0,0))
 for name,d in [('front',(0,-1,.12)),('side',(1,-.34,.23)),('angle',(1,-1,.38))]:
  cam.location=center+Vector(d).normalized()*3.5
  cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
  scene.render.filepath=f'{OUT}/{stem}-{name}.png'
  bpy.ops.render.render(write_still=True)
  print('F3_BROKEN_GLASS_RENDER_OK',stem,name,flush=True)
for v in (1,2,3):
 stem=build(v);render(stem)
print('F3_BROKEN_GLASS_ALL_COMPLETE',flush=True)
