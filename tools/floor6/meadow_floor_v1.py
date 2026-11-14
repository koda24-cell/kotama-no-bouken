"""Floor 6: one-square dense meadow tile, exported GLB and four actual Blender renders."""
import bpy,math,random,os
from mathutils import Vector
random.seed(6144)
out='render-output/floor6/meadow-floor';os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,c):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*c,1);return m
# Anime-like unified palette: bright lime roots, original muted green tips.
colors=[]
for ci in range(4):
 m=material('anime meadow %d'%ci,(.45,.65,.20))
 nodes=m.node_tree.nodes; links=m.node_tree.links
 attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='COLOR_0'
 bsdf=nodes.get('Principled BSDF')
 links.new(attr.outputs['Color'],bsdf.inputs['Base Color'])
 bsdf.inputs['Roughness'].default_value=.88
 colors.append(m)
def z(x,y):return .02*math.sin(x*4+1)*math.cos(y*4)+.01*math.sin(7*x+5*y)
v=[];f=[];n=24
for j in range(n+1):
 for i in range(n+1):
  x=i/n-.5;y=j/n-.5;v.append((x,y,z(x,y)))
for j in range(n):
 for i in range(n):
  a=j*(n+1)+i;f.append((a,a+1,a+n+2,a+n+1))
mesh=bpy.data.meshes.new('ground');mesh.from_pydata(v,[],f);mesh.update();ob=bpy.data.objects.new('meadow_ground',mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(material('ground',(.35,.52,.10)))
for ci in range(4):
 v=[];f=[];vertex_t=[]
 for k in range(6400):
  if k%4!=ci:continue
  x=random.uniform(-.51,.51);y=random.uniform(-.51,.51);h=random.uniform(.025,.095) if k<4400 else random.uniform(.10,.23);a=random.uniform(0,math.tau);bend=random.uniform(.015,.065) if k<4400 else random.uniform(.025,.10);w=random.uniform(.007,.017) if k<4400 else random.uniform(.005,.013);start=len(v)
  for j in range(7):
   t=j/6;px=x+math.cos(a)*bend*t*t;py=y+math.sin(a)*bend*t*t;half=w*(1-t)**.7
   for q in (-1,1):
    v.append((px-q*math.sin(a)*half,py+q*math.cos(a)*half,z(x,y)+h*(t-.15*t**3)))
    vertex_t.append(t)
  for j in range(6):
   a=start+j*2;f.append((a,a+1,a+3,a+2))
 mesh=bpy.data.meshes.new('grass');mesh.from_pydata(v,[],f);mesh.update();ob=bpy.data.objects.new('meadow_grass_%d'%ci,mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(colors[ci])
 # Root: vivid yellow-green. Tip: the previous subdued green. Smooth color interpolation.
 layer=mesh.vertex_colors.new(name='COLOR_0')
 for poly in mesh.polygons:
  for loop_index in poly.loop_indices:
   t=vertex_t[mesh.loops[loop_index].vertex_index]
   root=(.49,.76,.15)
   tips=[(.095,.215,.055),(.115,.245,.065),(.145,.275,.075),(.175,.295,.085)]
   tip=tips[ci]
   # Hold lime close to the ground; smoothly blend into the established upper palette.
   u=max(0.,min(1.,(t-.10)/.90));u=u*u*(3.-2.*u)
   rgb=tuple(root[k]*(1-u)+tip[k]*u for k in range(3))
   layer.data[loop_index].color=(*rgb,1)
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
 if o.type=='MESH':o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'f6_meadow_floor_v1.glb'),export_format='GLB',use_selection=True)
bpy.ops.object.select_all(action='DESELECT')
for loc,power in [((2,-3,4),450),((-2,2,4),250)]:
 ld=bpy.data.lights.new('area','AREA');ld.energy=power;ld.shape='DISK';ld.size=4;lo=bpy.data.objects.new('area',ld);bpy.context.collection.objects.link(lo);lo.location=loc;lo.rotation_euler=(Vector((0,0,0))-lo.location).to_track_quat('-Z','Y').to_euler()
cd=bpy.data.cameras.new('camera');cam=bpy.data.objects.new('camera',cd);bpy.context.collection.objects.link(cam);bpy.context.scene.camera=cam;cd.type='ORTHO';cd.ortho_scale=1.8
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.render.resolution_x=768;scene.render.resolution_y=768
for name,loc in [('angle',(2,-3,2)),('front',(0,-3,.7)),('side',(3,0,.7)),('top',(0,0,4))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,0,.05))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(out,'f6_meadow_'+name+'.png');bpy.ops.render.render(write_still=True)
print('F6_MEADOW_DONE',flush=True)
