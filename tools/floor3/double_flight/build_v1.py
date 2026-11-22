"""Floor 3 standalone overgrown switchback stairs study V1.
Geometry based on user-supplied reference: two flights, two platforms,
two raised concrete supports, horizontal braces and oxide-red steel rails.
This is a NEW isolated review candidate. Approved modular stairs V8 untouched.
"""
import bpy, math, os, random, json
from mathutils import Vector
OUT='/work/out'
os.makedirs(OUT,exist_ok=True)
random.seed(170317)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name, color, metal=0, rough=.96, mottled=False):
 m=bpy.data.materials.new(name); m.use_nodes=True
 n=m.node_tree.nodes; l=m.node_tree.links
 bs=n.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(*color,1)
 bs.inputs['Metallic'].default_value=metal
 bs.inputs['Roughness'].default_value=rough
 if mottled:
  tc=n.new('ShaderNodeTexCoord')
  no=n.new('ShaderNodeTexNoise');no.inputs['Scale'].default_value=2.9
  no.inputs['Detail'].default_value=5.0
  no.inputs['Roughness'].default_value=.72
  l.new(tc.outputs['Generated'],no.inputs['Vector'])
  ramp=n.new('ShaderNodeValToRGB')
  ramp.color_ramp.elements[0].position=.17
  ramp.color_ramp.elements[0].color=(.15,.17,.145,1)
  ramp.color_ramp.elements[1].position=.83
  ramp.color_ramp.elements[1].color=(*color,1)
  l.new(no.outputs['Fac'],ramp.inputs['Fac'])
  l.new(ramp.outputs['Color'],bs.inputs['Base Color'])
  fine=n.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=83
  l.new(tc.outputs['Generated'],fine.inputs['Vector'])
  bump=n.new('ShaderNodeBump')
  bump.inputs['Strength'].default_value=.36;bump.inputs['Distance'].default_value=.035
  l.new(fine.outputs['Fac'],bump.inputs['Height'])
  l.new(bump.outputs['Normal'],bs.inputs['Normal'])
 return m
concrete=mat('aged gray-green cast concrete',(.44,.47,.395),mottled=True)
edges=mat('dark cracked aggregate',(.24,.24,.21),mottled=True)
rust=mat('corroded oxidized pipe',(.29,.105,.067),metal=.44,rough=.91,mottled=True)
moss=mat('damp green moss dark',(.11,.225,.075),rough=.99,mottled=True)
lightmoss=mat('lichen olive light',(.235,.315,.105),rough=.99,mottled=True)
wet=mat('dark water stain',(.12,.19,.145),rough=.86,mottled=True)

def cube(name, xyz, dimensions, material, bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz)
 o=bpy.context.object;o.name=name;o.dimensions=dimensions
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(material)
 if bevel:
  mod=o.modifiers.new('eroded bevel profile','BEVEL');mod.width=bevel;mod.segments=2
  mod=o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
 return o
def span(name,a,b,width,depth,material):
 a,b=Vector(a),Vector(b)
 d=b-a
 o=cube(name,(a+b)/2,(width,depth,d.length),material,bevel=min(width,depth)*.16)
 o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
 return o
def pipe(name,a,b,r=.034,material=rust):
 a,b=Vector(a),Vector(b);d=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=d.length,location=(a+b)/2)
 o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
 o.data.materials.append(material)
 return o
def transform_basis(a,b):
 d=Vector(b)-Vector(a);d.z=0;d.normalize()
 side=Vector((-d.y,d.x,0))
 return d,side
def stairflight(tag,a,b,z0,z1,steps=13):
 a,b=Vector(a),Vector(b)
 forward,side=transform_basis(a,b)
 length=(b-a).length
 for j in range(steps):
  t=(j+.5)/steps
  center=a.lerp(b,t);h=z0+(z1-z0)*(j+.4)/steps
  # Significant realistic tread thickness: not hovering thin panels.
  c=cube(tag+' eroded cast concrete tread '+str(j),
         (center.x,center.y,h), (1.62,length/steps+.028,.20), concrete,bevel=.035)
  c.rotation_euler.z=math.atan2(forward.y,forward.x)-math.pi/2
  # Dark grimed ledge along risers, some moss along sheltered edges.
  for side_sign in (-1,1):
   if (j+side_sign)%4!=0:
    x=center.x+side_sign*.72*side.x
    y=center.y+side_sign*.72*side.y
    hmos=h+.106
    frag=cube(tag+' sparse rooted moss '+str(j)+' '+str(side_sign),
       (x,y,hmos),(.12,.19,.012),moss if j%3 else lightmoss,.007)
    frag.rotation_euler.z=c.rotation_euler.z
  if j in (2,5,8,11):
   # A few structural erosion cuts, deliberately varied in size.
   cutpos=center+side*((-1)**j*.76)
   bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,
     location=(cutpos.x,cutpos.y,h+.05))
   cutter=bpy.context.object;cutter.name='temporary real missing tread edge'
   cutter.scale=(.19+.04*(j%3),.22,.16)
   bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
   m=c.modifiers.new('physical eroded concrete corner','BOOLEAN')
   m.operation='DIFFERENCE';m.solver='EXACT';m.object=cutter
   bpy.context.view_layer.objects.active=c
   bpy.ops.object.modifier_apply(modifier=m.name)
   bpy.data.objects.remove(cutter,do_unlink=True)
 # Concrete stringers, much heavier than stairs V6.
 for side_sign in (-1,1):
  dx=side*side_sign*.70
  start=(a.x+dx.x,a.y+dx.y,z0-.30)
  end=(b.x+dx.x,b.y+dx.y,z1-.30)
  span(tag+' thick supported sloped side stringer',start,end,.31,.33,edges)
  # Corroded balustrade continuous with measured post feet.
  old=None
  for j in range(7):
   t=j/6;center=a.lerp(b,t);h=z0+(z1-z0)*t+.09
   foot=Vector((center.x+dx.x,center.y+dx.y,h))
   top=foot+Vector((0,0,1.0))
   pipe(tag+' handrail anchored baluster',foot,top,.027)
   cube(tag+' steel base plate',(foot.x,foot.y,foot.z+.023),(.155,.145,.045),rust,.007)
   if old is not None:pipe(tag+' continuous handrail',old,top,.04)
   old=top
  # Midrail connecting supporting posts along the whole slope.
  f=(a.x+dx.x,a.y+dx.y,z0+.57)
  e=(b.x+dx.x,b.y+dx.y,z1+.57)
  pipe(tag+' midrail',f,e,.024)
 return
def platform(tag,center,z):
 cube(tag+' heavy landing slab',(center[0],center[1],z-.13),(2.03,2.05,.32),concrete,.045)
 # Large understructure footings and cross members, no unsupported plate.
 for sx in (-.72,.72):
  c=(center[0]+sx,center[1]-.55)
  cube(tag+' load-bearing concrete pier',(c[0],c[1],(z-.26)/2),( .36,.40,z-.26),concrete,.036)
  cube(tag+' dark wet footline',(c[0],c[1],.13),(.38,.41,.20),moss,.015)
 span(tag+' transverse landing bracing',
   (center[0]-.72,center[1]-.55,z*.53),
   (center[0]+.72,center[1]-.55,z*.53),.20,.24,edges)
 # Landing edge corrosion, mottled shallow water/lichen (thin dark patches).
 for j in range(5):
  rng=random.Random(j+int(z*100))
  x=center[0]+rng.uniform(-.72,.72)
  y=center[1]+rng.uniform(-.70,.70)
  cube(tag+' moisture collection patch',(x,y,z+.035),
    (rng.uniform(.17,.35),rng.uniform(.13,.28),.012),wet,.012)

# The original reference presents a dog-leg switchback around a raised landing.
# Lower flight reaches the middle landing from the front.
lower_start=(1.04,-4.55,0)
middle=(1.04,-.25,0)
upper_end=(-1.02,3.75,0)
platform('middle switchback', (1.04,-.25), 2.35)
platform('upper landing',(-1.02,3.75),4.65)
stairflight('lower flight', lower_start, middle, .05,2.35,steps=14)
stairflight('upper flight', middle, upper_end,2.35,4.65,steps=14)
# Landing parapet: rusted verticals, corners and turns, connected rails.
for tag,ctr,z in [('middle',(1.04,-.25),2.35),('upper',(-1.02,3.75),4.65)]:
 for sx,sy in [(-.78,-.78),(.78,-.78),(-.78,.78),(.78,.78)]:
  foot=(ctr[0]+sx,ctr[1]+sy,z+.01)
  top=(foot[0],foot[1],z+1.01)
  pipe(tag+' corrosion upright',foot,top,.028)
  cube(tag+' railing flange',(foot[0],foot[1],z+.034),(.16,.16,.05),rust,.012)
 for sy in (-.78,.78):
  pipe(tag+' guardrail back',
    (ctr[0]-.78,ctr[1]+sy,z+1.01),
    (ctr[0]+.78,ctr[1]+sy,z+1.01),.038)
  pipe(tag+' guardrail midway',
    (ctr[0]-.78,ctr[1]+sy,z+.54),
    (ctr[0]+.78,ctr[1]+sy,z+.54),.022)

# Lighting and orthographic views.
world=bpy.context.scene.world
world.color=(.085,.085,.085)
for loc,energy,size in [((0,-5,11),1850,6),((-7,3,9),1400,6),((4,5,8),1100,5)]:
 bpy.ops.object.light_add(type='AREA',location=loc)
 bpy.context.object.data.energy=energy
 bpy.context.object.data.shape='DISK';bpy.context.object.data.size=size
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=980;scene.render.resolution_y=980
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/f3_double_flight_stairs_v1.blend',compress=True)
meshes=[o for o in scene.objects if o.type=='MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.export_scene.gltf(filepath=OUT+'/f3_double_flight_stairs_v1.glb',
 export_format='GLB',use_selection=True,export_apply=True)
bpy.ops.object.camera_add()
camera=bpy.context.object;scene.camera=camera
camera.data.type='ORTHO';camera.data.ortho_scale=12.2
for view,loc in [('front',(8,-12,10)),('side',(11,2,7)),('angle',(9,-10,13))]:
 camera.location=loc
 camera.rotation_euler=(Vector((0,0,2.35))-camera.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=OUT+'/f3_double_flight_stairs_v1-'+view+'.png'
 bpy.ops.render.render(write_still=True)
print('F3_DOUBLE_FLIGHT_V1_COMPLETE',len(meshes))
