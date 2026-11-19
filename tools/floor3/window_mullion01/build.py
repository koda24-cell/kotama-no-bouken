"""F3 ruined-city WINDOW MULLION 01: a single independent vertical steel frame element.
No window assembly, glass, rebar, building or gameplay modifications.
Three progressive treatments of the SAME base profile, retained per variant.
Blender 5.3; export only selected meshes and embedded procedural rust color.
"""
import bpy, math, os, random, hashlib, json
from mathutils import Vector
OUT='/work/out/f3_window_mullion01'
os.makedirs(OUT,exist_ok=True)
H=2.25
# Hollow box channel: 0.105 wide, 0.10 deep, 0.010 wall thickness.
# Open channel faces -Y (front); one profile loop, actual section thickness.
CROSS=[(-.052,-.05),(.052,-.05),(.052,.05),(.040,.05),(.040,-.037),
       (-.040,-.037),(-.040,.05),(-.052,.05)]
def mat(name,col,metal,rough):
 m=bpy.data.materials.new(name);m.diffuse_color=(*col,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(*col,1)
 bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 return m
def main_profile():
 verts=[];faces=[];n=len(CROSS)
 for z in (0,H):
  for x,y in CROSS:verts.append((x,y,z))
 for i in range(n):
  j=(i+1)%n
  faces.append((i,j,j+n,i+n))
 # The open channel contains a concave profile. End caps triangulated as 3 strips;
 # design does not require unrealistic solid filling.
 for zoff,rev in ((0,True),(n,False)):
  for a,b,c in [(0,1,4),(0,4,7),(1,2,3),(1,3,4),(4,5,6),(4,6,7)]:
   tri=(a+zoff,b+zoff,c+zoff)
   faces.append(tuple(reversed(tri)) if rev else tri)
 mesh=bpy.data.meshes.new('rolled-steel-U-channel')
 mesh.from_pydata(verts,[],faces);mesh.update()
 ob=bpy.data.objects.new('F3_WINDOW_MULLION01_BASE',mesh)
 bpy.context.collection.objects.link(ob)
 ob.data.materials.append(mat('aged_enamel_steel',(.21,.225,.215),.7,.72))
 bevel=ob.modifiers.new('factory edges softened by abrasion','BEVEL')
 bevel.width=.0018;bevel.segments=2
 bevel.limit_method='ANGLE'
 ob.modifiers.new('weighted face normals','WEIGHTED_NORMAL')
 return ob
def plate(name,points,depth=.0015):
 # a very thin irregular oxide flake layer, tightly attached to profile front
 vs=[(x, -.052-depth,z) for x,z in points]
 vs.extend((x,-.052,z) for x,z in points)
 n=len(points);fs=[]
 for i in range(1,n-1):
  fs.extend([(0,i,i+1),(n,n+i+1,n+i)])
 for i in range(n):
  j=(i+1)%n
  fs.extend([(i,j,n+j),(i,n+j,n+i)])
 me=bpy.data.meshes.new(name+'_mesh');me.from_pydata(vs,[],fs);me.update()
 ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
 return ob
def setup_variant(v):
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.object.delete(use_global=False)
 original=main_profile()
 if v>=2:
  # Six local oxide / lifted paint patches; do not cover the whole steel strip.
  oxide=mat('iron_oxide_satin',(.34,.12,.055),.22,.89)
  for i,(z,w) in enumerate(((.18,.022),(.50,.017),(.79,.023),(1.16,.019),(1.66,.021),(2.03,.017))):
   rng=random.Random(612+i)
   x=rng.choice((-.028,.0,.029))
   pts=[(x-w,z),(x+.42*w,z+.007),(x+w,z+.03),(x+.57*w,z+.071),
        (x-.62*w,z+.062),(x-w*.80,z+.028)]
   o=plate('oxide_patch_%02d'%i,pts,.0011)
   o.data.materials.append(oxide)
 if v>=3:
  # Three visibly damaged patches, each a thin chipped enamel plate with
  # uneven edges and shallow sectional thickness, not an entire new wall.
  worn=mat('bare_metal_at_abrasions',(.38,.40,.38),.74,.64)
  for i,(zc,side) in enumerate(((.39,-1),(1.42,1),(1.96,-1))):
   x=.047*side
   p=[(x-.008,zc-.050),(x+.004,zc-.027),(x+.010,zc+.001),
      (x+.001,zc+.046),(x-.008,zc+.031),(x-.012,zc+.006)]
   obj=plate('enamel_chip_%02d'%i,p,.0024)
   obj.data.materials.append(worn)
 # ground shadow is deliberately not part of exported GLB.
 bpy.ops.object.select_all(action='DESELECT')
 for obj in bpy.context.scene.objects:
  if obj.type=='MESH':obj.select_set(True)
 bpy.context.view_layer.objects.active=original
 filename=f'f3_window_mullion01_v{v}'
 bpy.ops.export_scene.gltf(filepath=f'{OUT}/{filename}.glb',export_format='GLB',
     use_selection=True,export_apply=True)
 return filename
def configure_render():
 scene=bpy.context.scene
 scene.render.engine='CYCLES';scene.cycles.samples=28
 scene.render.resolution_x=780;scene.render.resolution_y=780
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG'
 scene.render.film_transparent=True
 scene.view_settings.view_transform='AgX'
 scene.view_settings.look='AgX - Medium High Contrast'
 scene.view_settings.exposure=.20
 world=bpy.data.worlds.new('overcast_city')
 world.use_nodes=True
 world.node_tree.nodes['Background'].inputs['Color'].default_value=(.70,.73,.76,1)
 world.node_tree.nodes['Background'].inputs['Strength'].default_value=.85
 scene.world=world
 for pos,energy,size in [((-2.5,-3,4.0),580,3.4),((2,2,3),370,2.8)]:
  bpy.ops.object.light_add(type='AREA',location=pos)
  a=bpy.context.object;a.data.energy=energy;a.data.size=size
 bpy.ops.object.camera_add();camera=bpy.context.object
 camera.data.type='ORTHO';camera.data.ortho_scale=2.9;scene.camera=camera
 return camera
for version in (1,2,3):
 stem=setup_variant(version)
 camera=configure_render()
 focus=Vector((0,0,H/2))
 bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/{stem}.blend')
 for view,direction in [('front',(0,-1,.10)),('side',(1,-.06,.16)),('angle',(1,-1,.33))]:
  camera.location=focus+Vector(direction).normalized()*3.8
  camera.rotation_euler=(focus-camera.location).to_track_quat('-Z','Y').to_euler()
  bpy.context.scene.render.filepath=f'{OUT}/{stem}-{view}.png'
  bpy.ops.render.render(write_still=True)
  print('F3_MULLION_RENDER_OK',version,view,flush=True)
 print('F3_MULLION_ITERATION_SAVED',version,flush=True)
print('F3_MULLION_ALL_COMPLETE',flush=True)
