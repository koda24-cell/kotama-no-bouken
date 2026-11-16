import bpy, math, random, os, json, hashlib
from mathutils import Vector
rng=random.Random(20261116)
OUT=os.path.abspath("render-output/b2-ruined-stone-arch-v1")
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF");p.inputs["Base Color"].default_value=(*color,1);p.inputs["Roughness"].default_value=.91
 noise=m.node_tree.nodes.new("ShaderNodeTexNoise");noise.inputs["Scale"].default_value=22;noise.inputs["Detail"].default_value=3
 bump=m.node_tree.nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.22;bump.inputs["Distance"].default_value=.075
 m.node_tree.links.new(noise.outputs["Fac"],bump.inputs["Height"]);m.node_tree.links.new(bump.outputs["Normal"],p.inputs["Normal"])
 return m
mats=[material("weathered gray sandstone",(.36,.33,.28)),material("dark weathered joints",(.25,.24,.22)),material("warm aged stone",(.45,.39,.30)),material("pale worn face",(.50,.47,.40))]
def stone(name,center,size,mat,rotation=None):
 dx,dy,dz=size;verts=[]
 for z in [-1,1]:
  for y in [-1,1]:
   for x in [-1,1]:
    verts.append((x*dx*.5+rng.uniform(-.035,.035),y*dy*.5+rng.uniform(-.028,.028),z*dz*.5+rng.uniform(-.035,.035)))
 faces=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 obj.location=center;obj.rotation_euler=rotation or (rng.uniform(-.025,.025),rng.uniform(-.025,.025),rng.uniform(-.04,.04))
 mesh.materials.append(mat);b=obj.modifiers.new("eroded edges","BEVEL");b.width=.035;b.segments=2
 obj.modifiers.new("weighted normals","WEIGHTED_NORMAL")
 return obj
# Two asymmetrical piers with interlocking masonry courses and visible mortar joints.
for side in [-1,1]:
 for course in range(9 if side==-1 else 7):
  z=.19+course*.32
  x=side*(1.43+rng.uniform(-.055,.055))
  for y in [-.28,.28]:
   if rng.random()<.10:continue
   stone("pier %s course %02d"%(side,course),(x,y,z),(.66,.52,.29),rng.choice(mats))
 # carved lintel support shoulder and cracked springing stone
 stone("arch springer",(side*1.30,0,2.85 if side==-1 else 2.25),(.94,.9,.35),mats[0])
# Arch follows a semicircular curve; keystone and several voussoirs are missing.
radius=1.42
for i in range(13):
 if i in (2,3,10):continue
 theta=math.pi-i*math.pi/12
 x=radius*math.cos(theta)
 z=2.77+radius*math.sin(theta)
 # stones are wedge-like by rotated weathered block and broken edge profiles
 obj=stone("voussoir %02d"%i,(x,0,z),(.40,.88,.43),mats[i%len(mats)],(0,-(theta-math.pi/2),rng.uniform(-.025,.025)))
 if i==6:obj.name="large weathered keystone"
# Broken rubble on ground, one side heavier than other
for i in range(26):
 x=rng.uniform(-2.15,2.15);y=rng.uniform(-1.1,1.1);s=rng.uniform(.08,.34)
 stone("collapsed arch fragment %02d"%i,(x,y,s*.42),(s*rng.uniform(.8,2),s*rng.uniform(.8,1.5),s),rng.choice(mats))
# thin ground foundation stone slabs
for i in range(7):
 x=-1.8+i*.60
 stone("uneven ancient threshold %02d"%i,(x,0,.035+rng.uniform(0,.02)),(.57,1.55,.09),mats[i%4])
# Export mesh only before creating render stage
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
 if o.type=='MESH':o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,"ruined_stone_arch_v1.glb"),export_format='GLB',use_selection=True)
bpy.ops.object.select_all(action='DESELECT')
world=bpy.context.scene.world or bpy.data.worlds.new("World");bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.27,.29,.33,1);world.node_tree.nodes["Background"].inputs["Strength"].default_value=.55
def area(name,loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size
area("key",(2,-4,7),850,6);area("fill",(-4,2,5),450,5)
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=6.9
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='BLENDER_EEVEE' if bpy.app.version<(4,2,0) else 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x=960;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=0
target=Vector((0,0,1.9))
for name,loc in [('front',(0,-8,4)),('side',(8,0,3.5)),('angle',(6,-8,5.5))]:
 cam.location=loc;direction=target-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=os.path.join(OUT,"ruined_stone_arch_v1_"+name+".png");bpy.ops.render.render(write_still=True)
with open(os.path.join(OUT,"manifest.json"),"w") as f:json.dump({"name":"ruined_stone_arch_v1","status":"prototype awaiting user approval","files":["ruined_stone_arch_v1.glb"]+["ruined_stone_arch_v1_"+x+".png" for x in ("front","side","angle")],"source":"tools/b2-render/build-ruined-stone-arch-v1.py"},f,indent=2)
