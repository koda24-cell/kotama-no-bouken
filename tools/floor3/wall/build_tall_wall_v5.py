"""Floor 3 tall ruined wall — standalone ONE-part V1, Blender 5.3.
Produces GLB + packed .blend + front/side/angle/game-eye PNG.
All sourced CC0 photographs are already present on development.
No game runtime, entire building, window, vines or rubble modified.
"""
import bpy,math,random,os
from mathutils import Vector
OUT='/work/out'
TEX='/work/reference/assets/models/floor3/double_flight/textures'
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(310817)
def material(name,photo,normal,rough):
 m=bpy.data.materials.new(name);m.use_nodes=True
 nodes=m.node_tree.nodes;links=m.node_tree.links
 bs=nodes.get('Principled BSDF')
 bs.inputs['Roughness'].default_value=.95
 bs.inputs['Metallic'].default_value=0
 def image(path,noncolor=False):
  t=nodes.new('ShaderNodeTexImage')
  t.image=bpy.data.images.load(os.path.join(TEX,path),check_existing=True)
  if noncolor:t.image.colorspace_settings.name='Non-Color'
  t.image.pack()
  return t
 d=image(photo);links.new(d.outputs['Color'],bs.inputs['Base Color'])
 n=image(normal,True);nm=nodes.new('ShaderNodeNormalMap')
 nm.inputs['Strength'].default_value=.38
 links.new(n.outputs['Color'],nm.inputs['Color'])
 links.new(nm.outputs['Normal'],bs.inputs['Normal'])
 r=image(rough,True);links.new(r.outputs['Color'],bs.inputs['Roughness'])
 return m
concrete=material('CC0 heavily weathered concrete',
 'chipped_concrete_diffuse.jpg','chipped_concrete_normal.jpg','chipped_concrete_roughness.jpg')
damp=material('CC0 ground-contact damp concrete',
 'concrete_moss_diffuse.jpg','concrete_moss_normal.jpg','concrete_moss_roughness.jpg')
rust=bpy.data.materials.new('Embedded corroded steel core');rust.use_nodes=True
bs=rust.node_tree.nodes.get('Principled BSDF')
bs.inputs['Base Color'].default_value=(.28,.092,.044,1)
bs.inputs['Metallic'].default_value=.48;bs.inputs['Roughness'].default_value=.86
fracture=bpy.data.materials.new('Dark mineral fracture section');fracture.use_nodes=True
bs=fracture.node_tree.nodes.get('Principled BSDF')
bs.inputs['Base Color'].default_value=(.29,.28,.25,1)
bs.inputs['Roughness'].default_value=.97
def profile_mesh(name,profile,ymin,ymax,mat,section):
 n=len(profile)
 verts=[(x,ymin,z) for x,z in profile]+[(x,ymax,z) for x,z in profile]
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
 for i in range(n):
  j=(i+1)%n
  faces.append((i,j,n+j,n+i))
 mesh=bpy.data.meshes.new(name+' geometry')
 mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 obj.data.materials.append(mat);obj.data.materials.append(section)
 # Faces on chipped top/edge receive darker exposed aggregate
 for i,face in enumerate(mesh.polygons):
  if i>=2 and (i-2) in (2,3,4,5,6):
   face.material_index=1
 uv=mesh.uv_layers.new(name='meter-scaled UV')
 for p in mesh.polygons:
  face_normal=p.normal
  for loop_idx in p.loop_indices:
   v=mesh.vertices[mesh.loops[loop_idx].vertex_index].co
   if abs(face_normal.y)>.65:pair=(v.x*.36,v.z*.36)
   elif abs(face_normal.x)>.65:pair=(v.y*.36,v.z*.36)
   else:pair=(v.x*.36,v.y*.36)
   uv.data[loop_idx].uv=pair
 return obj
# The continuous lower 3m is intact: corridor-facing sight-blocker.
# Broken cap irregularity deliberately broad and off-centre, not zigzag evenly.
profile=[
 (-1.00,0),(1.00,0),(1.00,3.19),(.83,3.29),
 (.91,3.47),(.74,3.58),(.73,3.95),(.59,4.02),
 (.37,4.09),(.28,3.87),(.13,3.99),(.03,4.36),
 (-.17,4.60),(-.35,4.50),(-.41,4.20),
 (-.54,4.28),(-.69,4.19),(-.73,4.45),
 (-.91,4.38),(-1.00,4.23)
]
wall=profile_mesh('V5 one-storey tall concrete ruin wall',profile,-.17,.17,concrete,fracture)
# Attached secondary delamination: a thick shape that follows the wall,
# never a floating rectangular billboard.
def plate(name,pts,ymin,ymax,mat):
 return profile_mesh(name,pts,ymin,ymax,mat,fracture)
# V3 structural spalls are carved FROM the wall, not thin added plates.
for k,(pos,scale) in enumerate([
  ((1.28,-.16,2.45),(.25,.18,.31)),
  ((1.24,-.14,3.32),(.21,.19,.22)),
  ((-1.10,-.14,4.28),(.19,.20,.14))]):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=pos)
 cut=bpy.context.object;cut.name='V2 temporary structural eroded corner'
 cut.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 mod=wall.modifiers.new('V5 irregular broken outer edge '+str(k),'BOOLEAN')
 mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cut
 bpy.context.view_layer.objects.active=wall
 bpy.ops.object.modifier_apply(modifier=mod.name)
 bpy.data.objects.remove(cut,do_unlink=True)
# Strength of load-bearing wall: cast-in tie beam stub on one flank.
def box(name,pos,size,mat,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos)
 ob=bpy.context.object;ob.name=name;ob.dimensions=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 ob.data.materials.append(mat)
 if bevel:
  m=ob.modifiers.new('worn edge','BEVEL');m.width=bevel;m.segments=2
 return ob
box('V3 structural return at left seam',(-.91,.10,1.59),(.17,.48,3.18),concrete,.025)
# Damp masonry is *located* at the actual foot, not a full-height moss green wall.
# V2: Remove the obvious rectangular green plaque at the foot.
# Moss will be part of the photo-derived aged concrete, not a floating sticker.
# Embedded reinforcement bends out from the damaged top rather than sticking
# from an arbitrary place in the side of the mesh.
def rod(name,start,end,r,mat):
 a=Vector(start);b=Vector(end);d=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=d.length,location=(a+b)/2)
 ob=bpy.context.object;ob.name=name
 ob.rotation_euler=d.to_track_quat('Z','Y').to_euler()
 ob.data.materials.append(mat)
for i,(x,z) in enumerate([(-.35,4.50),(.14,4.30),(.64,4.02)]):
 rod('V3 embedded bent reinforcement '+str(i),
     (x,0,z-.27),(x+(.09 if i%2 else -.12),-.06,z+.22),.018,rust)
 # Ties are small but only where actual steel is exposed.
# Decorative noise particles and dangling vine bundles intentionally omitted.
bpy.context.scene['approval']='NOT_APPROVED'
bpy.context.scene['floor3_asset']='one_floor_tall_ruined_wall_v1'
bpy.context.scene['original_source']='independent modular asset, original PR256/482 not modified'
# V2 photographic BaseColor adjustment. Preserve fine CC0 surface detail.
# The input is the actual already packed image, not a Blender-only shader node.
import numpy as np
texnode=next(n for n in concrete.node_tree.nodes if n.type=='TEX_IMAGE' and 'chipped_concrete_diffuse' in n.image.name)
srcimg=texnode.image
w,h=srcimg.size
rgba=np.empty(w*h*4,dtype=np.float32)
srcimg.pixels.foreach_get(rgba)
pixels=rgba.reshape((h,w,4))
# Muted grey-olive cast aged over decades, not uniform vivid green paint.
aged=pixels.copy()
# Photo texture stays authoritative but macro weathering replaces pebble-like tiling.
luma=(pixels[:,:,0]*.25+pixels[:,:,1]*.62+pixels[:,:,2]*.13)
yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
# Tile-safe macro variation with integer UV frequencies. Seam mismatch
# is forbidden because repeating planar UVs expose it at regular intervals.
macro=(.038*np.sin(xx/w*2*np.pi*2+yy/h*2*np.pi*1)
      +.028*np.cos(yy/h*2*np.pi*1-xx/w*2*np.pi*1))
# A broad photographic variation, not micro-painted green dots.
value=np.clip(.27+.34*luma+macro,0,1)
aged[:,:,:3]=np.stack((value*.98,value*.98,value*.93),axis=-1)
rebaked=bpy.data.images.new('V2 CC0 chipped concrete patina baked',width=w,height=h,alpha=True)
rebaked.pixels.foreach_set(aged.ravel());rebaked.file_format='PNG';rebaked.pack()
texnode.image=rebaked
# Save original project with packed images.
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/f3_ruined_wall_floor1_v5.blend',compress=True)
mesh_objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
bpy.ops.object.select_all(action='DESELECT')
for ob in mesh_objects:ob.select_set(True)
bpy.context.view_layer.objects.active=wall
bpy.ops.export_scene.gltf(filepath=OUT+'/f3_ruined_wall_floor1_v5.glb',
 export_format='GLB',use_selection=True)
bpy.ops.object.select_all(action='DESELECT')
# Neutral 3-point setup with a dark neutral backdrop.
world=bpy.context.scene.world
world.color=(.105,.11,.11)
for pos,energy,scale in [((4,-5,7),950,5),((-4,2,6),720,5),((2,4,5),560,4)]:
 bpy.ops.object.light_add(type='AREA',location=pos)
 obj=bpy.context.object;obj.data.energy=energy;obj.data.size=scale
 obj.rotation_euler=(Vector((0,0,2.2))-obj.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=960;scene.render.resolution_y=760
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
bpy.ops.object.camera_add()
camera=bpy.context.object;scene.camera=camera
camera.data.type='ORTHO';camera.data.ortho_scale=6.5
for name,pos,look in [
 ('front',(0,-7,3.1),(0,0,2.2)),
 ('side',(6,-.6,3.1),(0,0,2.2)),
 ('angle',(5,-7,5),(0,0,2.2)),
 ('game-eye',(0,-5,1.62),(0,0,2.0))]:
 camera.location=pos
 camera.rotation_euler=(Vector(look)-camera.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=OUT+'/f3_ruined_wall_floor1_v5-'+name+'.png'
 bpy.ops.render.render(write_still=True)
print('F3_TALL_WALL_V5_COMPLETE',len(mesh_objects))
