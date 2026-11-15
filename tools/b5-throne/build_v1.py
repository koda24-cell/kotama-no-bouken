import bpy, math, random, os
from mathutils import Vector
random.seed(51)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,rough=.8,emit=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 if emit:bs.inputs['Emission Color'].default_value=(*emit,1);bs.inputs['Emission Strength'].default_value=1.7
 return m
stone=mat('Basalt carved stone',(.085,.083,.105));edge=mat('Pale worn edges',(.17,.16,.18));iron=mat('Black oxidized iron',(.042,.039,.05),.8,.4);red=mat('Deep crimson enamel',(.23,.018,.028),.45,.35);glow=mat('Subtle infernal seams',(.23,.014,.028),.1,.4,(.6,.025,.045))
def cube(name,loc,scale,material,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:mod=o.modifiers.new('Chipped stone edges','BEVEL');mod.width=bevel;mod.segments=2;o.data.use_auto_smooth=True;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def beam(name,a,b,width,depth,material):
 mid=(Vector(a)+Vector(b))/2;d=Vector(b)-Vector(a);o=cube(name,mid,(width,depth,d.length),material,.025);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o
cube('Broad three-tier plinth',(0,0,.16),(2.5,1.8,.32),stone,.09)
cube('Lower stair',(0,-.97,.08),(2.65,.48,.16),edge,.04)
cube('Seat massive slab',(0,0,.66),(1.55,1.15,.23),stone,.07)
cube('Crimson seat inset',(0,-.06,.79),(1.15,.82,.06),red,.025)
cube('Tall monolithic back',(0,.43,1.92),(1.62,.34,2.45),stone,.08)
cube('Back inset carved panel',(0,.22,1.98),(1.2,.09,1.96),iron,.035)
for sign in (-1,1):
 x=sign*.78
 cube('Broken armrest pillar '+str(sign),(x,-.19,.88),(.31,1.12,.69),stone,.055)
 cube('Armrest cap '+str(sign),(x,-.26,1.25),(.39,1.05,.15),edge,.035)
 cube('Flanking tall buttress '+str(sign),(sign*.95,.45,1.87),(.29,.48,2.75),stone,.045)
 for i in range(3):
  z=1.45+i*.56
  cube('Masonry band '+str(sign)+' '+str(i),(sign*.95,.18,z),(.36,.13,.075),edge,.014)
# Pointed arch, rising above the throne's high back
for sign in (-1,1):
 beam('Gothic arch rising '+str(sign),(sign*.96,.36,3.05),(0,.36,4.0),.23,.29,edge)
 beam('Inner red tracery '+str(sign),(sign*.58,.18,3.12),(0,.18,3.70),.075,.10,red)
# Gothic iron vertical ribs
for x in (-.48,0,.48):
 cube('Forged vertical spine '+str(x),(x,.125,2.1),(.065,.10,1.72),iron,.01)
# Crown
cube('Crown boss',(0,.17,3.55),(.28,.2,.30),red,.03)
# large, intentionally non-granular rubble
for i in range(7):
 x=random.uniform(-1.6,1.6);y=random.uniform(-1.25,.8)
 o=cube('Large broken masonry %02d'%i,(x,y,.12),(.24+random.random()*.28,.20+random.random()*.27,.17+random.random()*.28),stone,.018)
 o.rotation_euler=(random.uniform(-.2,.3),random.uniform(-.4,.4),random.uniform(-1,1))
# jagged diagonal fracture inset on front, not evenly spaced
for i in range(5):
 a=(-.45+i*.16,-.425,.58+i*.075);b=(-.30+i*.16,-.43,.65+i*.075)
 beam('Glowing fissure %02d'%i,a,b,.022,.025,glow)
world=bpy.context.scene.world;world.color=(.12,.11,.15)
def camera(name,loc,target):
 bpy.ops.object.camera_add(location=loc);c=bpy.context.object;c.name=name;direction=Vector(target)-c.location;c.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=5.7;return c
def area(loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1.7))-o.location).to_track_quat('-Z','Y').to_euler()
area((2,-4,6),1100,5);area((-3,2,4),850,4)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False;scene.render.image_settings.color_mode='RGBA'
scene.render.resolution_x=960;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
out=os.environ.get('THRONE_OUTPUT','render-output/b5-throne-v1');os.makedirs(out,exist_ok=True)
for name,loc in [('front',(0,-8,3)),('side',(8,0,3)),('angle',(6,-7,5))]:
 scene.camera=camera(name,loc,(0,0,1.8));scene.render.filepath=os.path.join(out,name+'.png');bpy.ops.render.render(write_still=True)
for o in list(bpy.data.objects):
 if o.type in {'CAMERA','LIGHT'}:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'b5-ruined-throne-v1.glb'),export_format='GLB')
