"""Unbranded abandoned sedan, authored as connected sheet body and stripped cabin."""
def build(e):
 import math,json
 from mathutils import Vector
 bpy,c,box,rod,scar=[e[k]for k in['bpy','c','box','rod','scar']]
 rust,steel,dark,fracture=[e[k]for k in['rust','steel','dark','fracture']];rng=e['rng']
 paint=rust.copy();paint.name='faded oxidized sedan paint with scanned rust PBR';p=paint.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.83;p.inputs['Metallic'].default_value=.35
 def beam(name,a,b,w=.05,d=.05,m=None):
  a,b=Vector(a),Vector(b);o=box(name,(a+b)*.5,(w,d,(b-a).length),m or paint,.009);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
 def panel(name,vertices,faces,material=paint,thickness=.018):
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);mesh.materials.append(material)
  o.modifiers.new('physical folded sheet thickness','SOLIDIFY').thickness=thickness
  bevel=o.modifiers.new('rounded pressed metal edges','BEVEL');bevel.width=.018;bevel.segments=3;return o
 # Lower body is a closed tapered shell, with real arched wheel cut-outs.
 sections=[(-2.25,.78,.56),(-2.02,.91,.82),(-1.25,.96,.95),(0,.98,.98),(1.28,.95,.91),(2.02,.88,.77),(2.25,.74,.58)]
 vertices=[]
 for y,w,z in sections:vertices.extend([(-w,y,.38),(w,y,.38),(w,y,z),(-w,y,z)])
 faces=[(3,2,1,0)]
 for i in range(len(sections)-1):
  for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
 faces.append(tuple(range((len(sections)-1)*4,len(sections)*4)))
 body=panel('pressed corroded sedan lower body',vertices,faces,paint,.028)
 bpy.context.view_layer.objects.active=body;body.select_set(True)
 for y in[-1.43,1.43]:
  for x in[-.94,.94]:
   bpy.ops.mesh.primitive_cylinder_add(vertices=40,radius=.46,depth=.65,location=(x,y,.43),rotation=(0,math.pi/2,0));cut=bpy.context.object
   mod=body.modifiers.new('arched wheel opening','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cut;bpy.context.view_layer.objects.active=body
   bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
 # Empty cabin floor, seats, a dashboard and thin pillars; missing windows stay hollow.
 box('dirty cabin floor',(0,.1,.75),(1.65,2.0,.12),dark,.025)
 roof=panel('dented cabin roof',[(-.68,-.65,1.52),(.68,-.65,1.52),(.72,.80,1.48),(-.72,.80,1.48),(-.62,.1,1.59),(.62,.1,1.57)],[(0,1,5,4),(4,5,2,3)],paint,.025)
 for x in[-1,1]:
  beam('front A pillar',(x*.87,-1.21,.94),(x*.68,-.65,1.52),.075,.07)
  beam('middle B pillar',(x*.94,.12,.94),(x*.71,.12,1.54),.08,.06)
  beam('rear C pillar',(x*.87,1.28,.9),(x*.72,.8,1.48),.13,.07)
  beam('roof drip rail',(x*.69,-.69,1.53),(x*.74,.85,1.49),.034,.035,m=rust)
  for y in[-.54,.63]:
   beam('recessed side door seam',(x*.98,y,.42),(x*.95,y,.91),.012,.018,m=dark)
   box('missing handle pocket',(x*.982,y+.22,.91),(.018,.15,.032),dark,.004)
  beam('deformed front bumper',(x*.12,-2.27,.48),(x*.83,-2.16,.53),.11,.10,m=rust)
  beam('separated rear bumper',(x*.08,2.28,.46),(x*.83,2.18,.49),.10,.10,m=rust)
  for y in[-.40,.57]:
   box('torn seat cushion',(x*.41,y,.91),(.62,.55,.16),dark,.06)
   o=box('torn seat back',(x*.41,y+.25,1.14),(.62,.15,.50),dark,.06);o.rotation_euler.x=-.12
 box('cracked dashboard',(0,-.91,1.05),(1.5,.28,.17),dark,.04)
 bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=8,location=(-.39,-.69,1.19),rotation=(.9,0,0),major_radius=.16,minor_radius=.018);bpy.context.object.name='remaining steering wheel';bpy.context.object.data.materials.append(dark)
 # Four flattened tires, inset rims, lug holes and brake drums.
 rubber=bpy.data.materials.new('aged split tire rubber');rubber.diffuse_color=(.018,.020,.018,1);rubber.use_nodes=True;rubber.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.018,.020,.018,1);rubber.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.98
 for y in[-1.43,1.43]:
  for x in[-.95,.95]:
   bpy.ops.mesh.primitive_torus_add(major_segments=40,minor_segments=12,location=(x,y,.43),rotation=(0,math.pi/2,0),major_radius=.32,minor_radius=.105);o=bpy.context.object;o.name='flattened perished tire';o.data.materials.append(rubber)
   # Local X points down after rotation, clamp bottom to simulate settled tire.
   for vertex in o.data.vertices:vertex.co.x=min(vertex.co.x,.385)
   for k in range(32):
    a=k*math.pi/16;beam('tire tread block',(x-.07,y+math.cos(a)*.416,.43+math.sin(a)*.416),(x+.07,y+math.cos(a)*.416,.43+math.sin(a)*.416),.018,.014,m=rubber)
   bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.225,depth=.16,location=(x,y,.43),rotation=(0,math.pi/2,0));bpy.context.object.name='rusted stamped wheel rim';bpy.context.object.data.materials.append(rust)
   outer=x+(.092 if x>0 else-.092)
   for k in range(5):
    a=k*2*math.pi/5;beam('wheel bolt',(outer,y+math.cos(a)*.09,.43+math.sin(a)*.09),(outer+(.02 if x>0 else-.02),y+math.cos(a)*.09,.43+math.sin(a)*.09),.018,.018,m=steel)
 # Crushed hood lifted enough to expose a real block and loose hoses.
 hood=box('creased lifted hood',(0,-1.63,.96),(1.65,.98,.045),paint,.035);hood.rotation_euler=(.17,.04,.03)
 box('exposed engine block',(0,-1.55,.76),(1.1,.65,.32),dark,.025)
 for k in range(7):rod('corroded engine hose',(-.5+k*.14,-1.85,.89),(-.43+k*.13,-1.25,.85),.025,rust,10)
 for x in[-.58,.58]:
  box('empty headlight socket',(x,-2.13,.65),(.38,.12,.17),dark,.025)
  for k in range(3):beam('broken grille strip',(-.28,-2.21,.53+k*.045),(.28,-2.21,.53+k*.045),.014,.02,m=rust)
 for k in range(15):
  x=(rng.random()-.5)*1.9;y=-1.7+rng.random()*3.4;o=box('settled debris inside stripped car',(x,y,.82),(.06,.10,.035),fracture,.008);o.rotation_euler.z=rng.random()*6.28
 (c.OUT/'sources/derelict-car-design.json').write_text(json.dumps({'status':'NOT_APPROVED','source':'Original unbranded sedan geometry; real derelict car photographs used only as structural reference','referenceIndex':'docs/3d/research/F3_CITY_V3_PINTEREST_20261127.json','features':['physical body shell','cut wheel arches','open stripped cabin','dented roof and lifted hood','engine and loose hoses','flattened tires and wheels','broken lights and door seams'],'dimensionsMetresApprox':[2,4.6,1.6]},indent=2))
