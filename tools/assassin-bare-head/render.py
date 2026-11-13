import bpy, math, os, sys
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
out=os.path.abspath(args[args.index('--out')+1]) if '--out' in args else os.getcwd()
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def gaussian(x,c,w): return math.exp(-.5*((x-c)/w)**2)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*color,1)
 m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.9
 return m
clay=material('solid_clay',(.73,.75,.79))
# Bare head only: 112 rings x 96 points = 10,752 vertices (exactly 2/3 of 16,128).
R,S=112,96
verts=[];faces=[]
# Coordinate system: X left-right, Y front negative, Z vertical.
# Close bottom by narrowing final rings; no hair, no eyeballs, no scalp shell.
for i in range(R):
 t=i/(R-1);z=-.55+1.62*t
 # Rounded jaw, cheeks, cranium and dome; softened chin with no flat cut.
 w=.125+.485*max(0,math.sin(math.pi*(.065+.89*t)))**.59
 w+=.034*gaussian(z,.16,.17)-.018*gaussian(z,-.32,.16)
 if i==0:w=.018
 if i==R-1:w=.009
 for j in range(S):
  a=2*math.pi*j/S;sn=math.sin(a);co=math.cos(a)
  x=w*sn;front=max(0,-co)**6
  depth=.29+.027*gaussian(z,.43,.28)
  y=-.015+depth*co
  # eye sockets and brow; continuous surface, no protruding eyeballs
  y+=front*.022*gaussian(abs(x),.235,.12)*gaussian(z,.30,.075)
  y-=front*.016*gaussian(abs(x),.235,.14)*gaussian(z,.425,.045)
  # nose bridge and small anime nose
  y-=front*(.038*gaussian(x,0,.068)*gaussian(z,.06,.19)+.030*gaussian(x,0,.058)*gaussian(z,-.035,.055))
  # restrained lips, cheek volume and chin projection
  y-=front*.012*gaussian(x,0,.095)*gaussian(z,-.20,.033)
  y-=front*.008*gaussian(x,0,.11)*gaussian(z,-.245,.029)
  y-=front*.032*gaussian(abs(x),.34,.13)*gaussian(z,.09,.17)
  y-=front*.028*gaussian(x,0,.16)*gaussian(z,-.405,.09)
  verts.append((x,y,z))
for i in range(R-1):
 for j in range(S):
  a=i*S+j;b=i*S+(j+1)%S
  faces.append((a,b,b+S,a+S))
assert len(verts)==10752 and len(faces)==10656
me=bpy.data.meshes.new('BARE_HEAD_10752_VERTICES');me.from_pydata(verts,[],faces);me.update()
obj=bpy.data.objects.new('Assassin_bare_head_no_hair',me);bpy.context.collection.objects.link(obj)
me.materials.append(clay)
for p in me.polygons:p.use_smooth=True
# Closing cap surfaces are tiny and keep topology quad-only on main shell.
sc=bpy.context.scene
sc.view_layers[0].material_override=clay
engines={e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}
sc.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
sc.render.resolution_x=700;sc.render.resolution_y=700;sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG'
sc.world.color=(.72,.72,.72)
for pos,power in [((3,-4,5),700),((-3,1,3),420)]:
 bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object
 light.data.energy=power;light.data.size=5
 light.rotation_euler=(Vector((0,0,.20))-light.location).to_track_quat('-Z','Y').to_euler()
for name,loc in [('front',(0,-5,.25)),('right_side',(5,0,.25)),('left_side',(-5,0,.25)),('three_quarter',(3,-4,.35))]:
 bpy.ops.object.camera_add(location=loc);cam=bpy.context.object
 cam.rotation_euler=(Vector((0,0,.20))-cam.location).to_track_quat('-Z','Y').to_euler()
 cam.data.type='ORTHO';cam.data.ortho_scale=2.25;sc.camera=cam
 sc.render.filepath=os.path.join(out,name+'.png')
 bpy.ops.render.render(write_still=True)
 bpy.data.objects.remove(cam,do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'assassin_bare_head.blend'))
with open(os.path.join(out,'geometry_report.txt'),'w') as f:
 f.write('head_vertices=10752\nhead_quads=10656\nhair_vertices=0\nengine='+sc.render.engine+'\n')
