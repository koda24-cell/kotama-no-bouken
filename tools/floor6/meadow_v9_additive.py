"""F6 V9 additive curved-blade study: import V7 GLB, preserve all original meshes.
Output is NOT_APPROVED; Blender 4 views + GLB + blend + manifest.
"""
import bpy, math, random, json, hashlib, os
from pathlib import Path
from mathutils import Vector
random.seed(20261119)
source=Path('render-input/f6_meadow_floor_v1.glb')
if not source.is_file(): raise RuntimeError('V7 source GLB missing')
out=Path('render-output/floor6/meadow-v9')
out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
original={o.name:(len(o.data.vertices),len(o.data.polygons)) for o in bpy.data.objects if o.type=='MESH'}
if len(original)!=9: raise RuntimeError('V7 GLB expected 9 mesh objects, got '+str(len(original)))
def lin(hexval):
 v=[int(hexval[i:i+2],16)/255 for i in (1,3,5)]
 return tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in v)
def ground_z(x,y):return .02*math.sin(x*4+1)*math.cos(y*4)+.01*math.sin(7*x+5*y)
root=lin('#668450');mid=lin('#91B16A');tip=lin('#C1D68D')
materials=[]
for ci in range(3):
 m=bpy.data.materials.new('V9 curved leaf '+str(ci))
 m.use_nodes=True
 nodes=m.node_tree.nodes; links=m.node_tree.links
 bsdf=nodes.get('Principled BSDF')
 bsdf.inputs['Roughness'].default_value=.9
 bsdf.inputs['Metallic'].default_value=0
 attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='COLOR_0'
 links.new(attr.outputs['Color'],bsdf.inputs['Base Color'])
 m.diffuse_color=(*mid,1)
 m.use_backface_culling=False
 materials.append(m)
leaf_count=0
for ci in range(3):
 verts=[];faces=[];weights=[]
 for cluster in range(220):
  if cluster%3!=ci:continue
  cx=random.uniform(-.47,.47);cy=random.uniform(-.47,.47)
  for k in range(3):
   x=cx+random.uniform(-.018,.018);y=cy+random.uniform(-.018,.018)
   # Some leaves cross the prevailing wind to avoid comb-like uniform direction.
   direction=math.radians(random.gauss(32,42) if random.random()<.68 else random.gauss(110,58))
   h=random.uniform(.09,.245)
   width=random.uniform(.009,.018)
   lean=random.uniform(.02,.085)
   curl=random.uniform(-.013,.013)
   ridge=random.uniform(.0015,.004)
   base=len(verts)
   for j in range(7):
    t=j/6
    bend=lean*t*t
    px=x+math.cos(direction)*bend-math.sin(direction)*curl*math.sin(math.pi*t)
    py=y+math.sin(direction)*bend+math.cos(direction)*curl*math.sin(math.pi*t)
    pz=ground_z(x,y)+h*(t-.11*t*t*t)
    half=width*max(.025,(1-t)**.78)
    rib=ridge*math.sin(math.pi*t)
    for u in (-1,0,1):
     verts.append((px-math.sin(direction)*half*u,py+math.cos(direction)*half*u,pz+(rib if u==0 else -rib*.32)))
     weights.append(t)
   for j in range(6):
    a=base+j*3;b=a+3
    faces.extend([(a,a+1,b+1,b),(a+1,a+2,b+2,b+1)])
   leaf_count+=1
 mesh=bpy.data.meshes.new('V9_curved_leaf_mesh_'+str(ci))
 mesh.from_pydata(verts,[],faces);mesh.update()
 ob=bpy.data.objects.new('V9_curved_leaf_layer_'+str(ci),mesh)
 bpy.context.collection.objects.link(ob)
 mesh.materials.append(materials[ci])
 color=mesh.vertex_colors.new(name='COLOR_0')
 for poly in mesh.polygons:
  poly.use_smooth=True
  for li in poly.loop_indices:
   t=weights[mesh.loops[li].vertex_index]
   if t<.52:
    u=t/.52;u=u*u*(3-2*u)
    c=[root[n]*(1-u)+mid[n]*u for n in range(3)]
   else:
    u=(t-.52)/.48;u=u*u*(3-2*u)
    c=[mid[n]*(1-u)+tip[n]*u for n in range(3)]
   scale=(.91,1.0,1.08)[ci]
   color.data[li].color=(*(min(1,c[n]*scale) for n in range(3)),1)
assert leaf_count==660,leaf_count
for name,counts in original.items():
 o=bpy.data.objects.get(name)
 if o is None or (len(o.data.vertices),len(o.data.polygons))!=counts:
  raise RuntimeError('V7 original mesh mutated: '+name)
glb=out/'f6_meadow_v9_candidate.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'f6_meadow_v9_candidate.blend'))
# Neutral studio lighting to compare silhouette and root shading.
world=bpy.context.scene.world or bpy.data.worlds.new('V9 review world')
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.22,.29,.23,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
for name,loc,power,size in [('key',(2,-3,4),380,4),('fill',(-2,2,3),250,5)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
 ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=loc
 ob.rotation_euler=(Vector((0,0,.05))-ob.location).to_track_quat('-Z','Y').to_euler()
cam_data=bpy.data.cameras.new('V9 review camera');cam=bpy.data.objects.new('V9 review camera',cam_data)
bpy.context.collection.objects.link(cam);bpy.context.scene.camera=cam
cam_data.type='ORTHO';cam_data.ortho_scale=1.65
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.eevee.taa_render_samples=64
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
views={'front':(0,-2.1,.8),'side':(2.1,0,.8),'angle':(1.6,-1.9,1.25),'top':(.001,-.001,2.5)}
for name,position in views.items():
 cam.location=position;cam.rotation_euler=(Vector((0,0,.12))-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(out/('f6_meadow_v9_'+name+'.png'))
 bpy.ops.render.render(write_still=True)
files=[glb,out/'f6_meadow_v9_candidate.blend']+[out/('f6_meadow_v9_'+v+'.png') for v in views]
entries=[]
for p in files:
 raw=p.read_bytes()
 if len(raw)<1000:raise RuntimeError('empty render: '+str(p))
 entries.append({'file':p.name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
manifest={'status':'NOT_APPROVED','source':'V7 GLB run 43602069517','original_meshes_preserved':original,'added_curved_leaves':leaf_count,'render_engine':scene.render.engine,'files':entries}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
print('F6_MEADOW_V9_DONE',json.dumps({'added_curved_leaves':leaf_count,'files':len(entries)}))
