"""Stage 3 glass V6 / Type A (lighting+material correction): real central opening with perimeter shards.
Research: F3_RUINED_GLASS_RESEARCH_20261119.md
Self-authored maps only; no external downloads, no third-party license import.
Preserve earlier V1-V4. Blender headless produces GLB, Blend, 4 real renders.
"""
import bpy, math, random, os
from mathutils import Vector
OUT='/work/out/f3_broken_glass01_type_a'
os.makedirs(OUT,exist_ok=True)
# Blender default startup cube must never be exported or occlude QA images.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
random.seed(11019)
N=24
W,H=.56,.90
# The hole is deliberately off-center; large glass strips remain attached to frame.
center=(.055,.105)
inner=[(.365,.025),(.405,.070),(.292,.175),(.355,.288),
       (.310,.370),(.280,.428),(.185,.415),(.190,.510),
       (.100,.490),(.075,.600),(-.040,.545),(-.090,.505),
       (-.185,.530),(-.202,.455),(-.285,.400),(-.320,.315),
       (-.355,.255),(-.315,.165),(-.385,.080),(-.315,-.020),
       (-.330,-.150),(-.245,-.180),(-.145,-.205),(-.015,-.180)]
# Ring ordering: monotonically counterclockwise needed. Use polar sort,
# and use outer boundary ray intersecting glass's rectangular frame.
inner.sort(key=lambda p:math.atan2(p[1]-center[1],p[0]-center[0]))
def boundary(x,z):
 dx=x-center[0]; dz=z-center[1]
 values=[]
 if dx>1.e-8:values.append((W-center[0])/dx)
 if dx< -1.e-8:values.append((-W-center[0])/dx)
 if dz>1.e-8:values.append((H-center[1])/dz)
 if dz< -1.e-8:values.append((-H-center[1])/dz)
 t=min(v for v in values if v>0)
 return(center[0]+dx*t,center[1]+dz*t)
outer=[boundary(x,z) for x,z in inner]
# one mesh = two rings of vertices, 24 faces, genuine open centre
verts=[(x,0,z) for x,z in outer+inner]
faces=[]
for i in range(N):
 j=(i+1)%N
 faces.append((i,j,N+j,N+i))
mesh=bpy.data.meshes.new('glass_ring_with_actual_opening')
mesh.from_pydata(verts,[],faces)
mesh.update()
ob=bpy.data.objects.new('F3_RUINED_GLASS01_A_V6',mesh)
bpy.context.collection.objects.link(ob)
uv=mesh.uv_layers.new(name='glass_uv')
for face in mesh.polygons:
 for li in face.loop_indices:
  p=mesh.vertices[mesh.loops[li].vertex_index].co
  uv.data[li].uv=((p.x+W)/(2*W),(p.z+H)/(2*H))
# PBR texture self-generated: roughness localized by edges, rainfall, clustered dust.
image=bpy.data.images.new('F3_GLASS_WEATHERING_ROUGHNESS_A_V6',width=256,height=256,alpha=False)
pixels=[]
rng=random.Random(617)
for yi in range(256):
 v=yi/255
 for xi in range(256):
  u=xi/255
  frame=max(0.,1.-min(u,1-u,v,1-v)/.13)
  rain=0.
  for xx,yy in ((.13,.82),(.78,.95),(.94,.55)):
   if v<yy:
    rain=max(rain,math.exp(-((u-xx-.016*(yy-v))/.032)**2)*math.exp(-(yy-v)*4.5)*.19)
  spots=max(0.,math.sin(u*23+v*8)*math.sin(v*26-u*11))*.09
  rough=min(.55,max(.07,.10+.22*frame+rain+spots+rng.uniform(-.015,.015)))
  pixels.extend((rough,rough,rough,1.))
image.pixels[:]=pixels
image.filepath_raw=OUT+'/F3_GLASS_WEATHERING_ROUGHNESS_A_V6.png'
image.file_format='PNG'
image.save()
mat=bpy.data.materials.new('translucent_weathered_ordinary_glass_A')
mat.use_nodes=True
nt=mat.node_tree; links=nt.links
bs=nt.nodes.get('Principled BSDF')
bs.inputs['Base Color'].default_value=(.93,.97,.97,1)
bs.inputs['Transmission Weight'].default_value=.99
bs.inputs['IOR'].default_value=1.47
bs.inputs['Roughness'].default_value=.07
tex=nt.nodes.new('ShaderNodeTexImage');tex.image=image
image.colorspace_settings.name='Non-Color'
links.new(tex.outputs['Color'],bs.inputs['Roughness'])
mesh.materials.append(mat)
solid=ob.modifiers.new('real six mm glass profile','SOLIDIFY')
solid.thickness=.006
solid.offset=0
bev=ob.modifiers.new('micro bevel on true cut edges','BEVEL')
bev.width=.0008;bev.segments=1
# Hairline crack paths only on surviving glass. 2D coords, thin and shallow.
cracks=[
 [inner[2],(.455,.37),(.49,.42)],
 [inner[7],(.19,.58),(.22,.69)],
 [inner[10],(-.11,.625),(-.16,.73)],
 [inner[17],(-.42,.22),(-.46,.26)],
 [inner[20],(-.34,-.24),(-.40,-.37)],
]
crmat=bpy.data.materials.new('fine_dark_fissures')
crmat.use_nodes=True
cb=crmat.node_tree.nodes.get('Principled BSDF')
cb.inputs['Base Color'].default_value=(.22,.37,.39,1)
cb.inputs['Roughness'].default_value=.32
for k,route in enumerate(cracks):
 curve=bpy.data.curves.new('fracture_path_%d'%k,'CURVE')
 curve.dimensions='3D'
 curve.bevel_depth=.00050;curve.bevel_resolution=1
 spline=curve.splines.new('POLY');spline.points.add(len(route)-1)
 for p,pt in zip(spline.points,route):
  p.co=(pt[0],-.0038,pt[1],1)
 obj=bpy.data.objects.new('hairline_crack_%d'%k,curve)
 bpy.context.collection.objects.link(obj)
 obj.data.materials.append(crmat)
 bpy.ops.object.select_all(action='DESELECT')
 obj.select_set(True);bpy.context.view_layer.objects.active=obj
 bpy.ops.object.convert(target='MESH')
# no backing material exported; only glass and surface fissures
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
 if o.type=='MESH':o.select_set(True)
bpy.context.view_layer.objects.active=ob
stem='f3_broken_glass01_type_a_v6'
bpy.ops.export_scene.gltf(filepath=f'{OUT}/{stem}.glb',export_format='GLB',use_selection=True,export_apply=True)
# Actual Blender Cycles render; compare both lighting conditions.
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=28
scene.render.resolution_x=840;scene.render.resolution_y=840
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.render.film_transparent=False
world=bpy.data.worlds.new('neutral_window_review')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.30,.34,.38,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
scene.world=world
# Opaque render-only backing behind GLASS in scene, not included in export.
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,.40,0),rotation=(math.pi/2,0,0))
back=bpy.context.object;back.name='RENDER_ONLY_BACKDROP'
back.scale=(1.4,1.4,1)
backmat=bpy.data.materials.new('dark_bluegray_back')
backmat.use_nodes=True
nodes=backmat.node_tree.nodes;nodes.clear()
em=nodes.new('ShaderNodeEmission')
em.inputs['Color'].default_value=(.045,.06,.075,1)
em.inputs['Strength'].default_value=1.0
out=nodes.new('ShaderNodeOutputMaterial')
backmat.node_tree.links.new(em.outputs['Emission'],out.inputs['Surface'])
back.data.materials.append(backmat)
for pos,energy,size in [((-2,-3,3),260,2.5),((2,.6,2.2),155,2.4)]:
 bpy.ops.object.light_add(type='AREA',location=pos)
 light=bpy.context.object;light.data.energy=energy;light.data.size=size
bpy.ops.object.camera_add()
cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/{stem}.blend')
for name,d,scale,target in [
 ('front',(0,-1,.13),2.35,Vector((0,0,0))),
 ('side',(1,-.30,.20),2.35,Vector((0,0,0))),
 ('angle',(1,-1,.38),2.35,Vector((0,0,0))),
 ('broken_edge_detail',(1,-1,.22),.75,Vector((.24,0,.36)))
]:
 cam.data.ortho_scale=scale
 cam.location=target+Vector(d).normalized()*3.3
 cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=f'{OUT}/{stem}-{name}.png'
 bpy.ops.render.render(write_still=True)
 print('F3_GLASS_A_V6_RENDER_OK',name,flush=True)
print('F3_GLASS_A_V6_ALL_COMPLETE',flush=True)
