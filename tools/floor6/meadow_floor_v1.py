"""Floor 6: one-square dense meadow tile, exported GLB and four actual Blender renders."""
import bpy,math,random,os,json
from mathutils import Vector
random.seed(6144)
with open('tools/floor6/meadow_color_preset.json',encoding='utf-8') as fp:
 preset=json.load(fp)
def srgb(hex_color):
 h=hex_color.lstrip('#')
 vals=[int(h[i:i+2],16)/255 for i in (0,2,4)]
 return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in vals)
root=srgb(preset['root']);middle=srgb(preset['middle']);tip=srgb(preset['tip'])
shadow_floor=max(0.,min(1.,float(preset['shadowFloor'])))
out='render-output/floor6/meadow-floor';os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,c):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*c,1);return m
# V5 anime palette: subdued natural-green roots, bright yellow-green tips; soften dark occlusion.
colors=[]
for ci in range(4):
 m=material('anime meadow %d'%ci,(.45,.65,.20))
 nodes=m.node_tree.nodes; links=m.node_tree.links
 attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='COLOR_0'
 bsdf=nodes.get('Principled BSDF')
 links.new(attr.outputs['Color'],bsdf.inputs['Base Color'])
 bsdf.inputs['Roughness'].default_value=float(preset['roughness'])
 # A small amount of self-lit color keeps overlapping blades from becoming black.
 links.new(attr.outputs['Color'],bsdf.inputs['Emission Color'])
 bsdf.inputs['Emission Strength'].default_value=float(preset['emission'])
 mix=nodes.new('ShaderNodeMixShader')
 emission=nodes.new('ShaderNodeEmission')
 links.new(attr.outputs['Color'],emission.inputs['Color'])
 emission.inputs['Strength'].default_value=1
 output=nodes.get('Material Output')
 links.new(bsdf.outputs['BSDF'],mix.inputs[1])
 links.new(emission.outputs[0],mix.inputs[2])
 mix.inputs[0].default_value=shadow_floor
 links.new(mix.outputs[0],output.inputs['Surface'])
 colors.append(m)
def z(x,y):return .02*math.sin(x*4+1)*math.cos(y*4)+.01*math.sin(7*x+5*y)
v=[];f=[];n=24
for j in range(n+1):
 for i in range(n+1):
  x=i/n-.5;y=j/n-.5;v.append((x,y,z(x,y)))
for j in range(n):
 for i in range(n):
  a=j*(n+1)+i;f.append((a,a+1,a+n+2,a+n+1))
mesh=bpy.data.meshes.new('ground');mesh.from_pydata(v,[],f);mesh.update();ob=bpy.data.objects.new('meadow_ground',mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(material('ground',srgb(preset['ground'])))
for ci in range(4):
 v=[];f=[];vertex_t=[]
 for k in range(3200):
  if k%4!=ci:continue
  x=random.uniform(-.51,.51);y=random.uniform(-.51,.51)
  # Keep the dense undergrowth, but lift the upper canopy above a lawn-like silhouette.
  h=random.uniform(.035,.105) if k<1200 else random.uniform(.14,.28)
  # Wind shares a prevailing direction, with subtle organic deviations.
  a=math.radians(float(preset.get('windDirectionDegrees',32))+random.gauss(0,float(preset.get('windSpreadDegrees',19))))
  bend=(random.uniform(.04,.085) if k<1200 else random.uniform(.11,.19))*float(preset.get('windLean',.14))/.14
  w=random.uniform(.006,.014) if k<1200 else random.uniform(.006,.012)
  start=len(v)
  for j in range(7):
   t=j/6;px=x+math.cos(a)*bend*t*t;py=y+math.sin(a)*bend*t*t;half=w*(1-t)**.7
   for q in (-1,1):
    v.append((px-q*math.sin(a)*half,py+q*math.cos(a)*half,z(x,y)+h*(t-.15*t**3)))
    vertex_t.append(t)
  for j in range(6):
   a=start+j*2;f.append((a,a+1,a+3,a+2))
 mesh=bpy.data.meshes.new('grass');mesh.from_pydata(v,[],f);mesh.update();ob=bpy.data.objects.new('meadow_grass_%d'%ci,mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(colors[ci])
 # Root is restrained green; upper half turns into warm yellow-green highlights.
 layer=mesh.vertex_colors.new(name='COLOR_0')
 for poly in mesh.polygons:
  for loop_index in poly.loop_indices:
   t=vertex_t[mesh.loops[loop_index].vertex_index]
   scale=(.94,.98,1.02,1.06)[ci]
   # Blend toward brighter tips without harsh yellow saturation.
   u=max(0.,min(1.,t))
   if u<.5:
    blend=u*2;blend=blend*blend*(3-2*blend)
    rgb=tuple((root[k]*(1-blend)+middle[k]*blend)*scale for k in range(3))
   else:
    blend=(u-.5)*2;blend=blend*blend*(3-2*blend)
    rgb=tuple((middle[k]*(1-blend)+tip[k]*blend)*scale for k in range(3))
   layer.data[loop_index].color=(*rgb,1)
# V7: broad overlapping low-canopy ribbons replace thousands of individual root blades.
# These layered leaf masses follow the same wind direction as the visible tall tips.
for ci in range(4):
 v=[];faces=[];vt=[]
 for k in range(440):
  if k%4!=ci:continue
  x=random.uniform(-.51,.51);y=random.uniform(-.51,.51)
  a=math.radians(float(preset.get('windDirectionDegrees',32))+random.gauss(0,12))
  length=random.uniform(.055,.13);width=random.uniform(.018,.042)
  h=random.uniform(.022,.055);start=len(v)
  for j in range(5):
   t=j/4
   px=x+math.cos(a)*length*t;py=y+math.sin(a)*length*t
   half=width*(.85-.55*t)
   for q in (-1,1):
    v.append((px-q*math.sin(a)*half,py+q*math.cos(a)*half,z(x,y)+h*(.4+.6*math.sin(t*math.pi*.8))))
    vt.append(.16+.52*t)
  for j in range(4):
   idx=start+j*2;faces.append((idx,idx+1,idx+3,idx+2))
 mesh=bpy.data.meshes.new('canopy_ribbon');mesh.from_pydata(v,[],faces);mesh.update()
 obj=bpy.data.objects.new('meadow_canopy_layer_%d'%ci,mesh);bpy.context.collection.objects.link(obj)
 mesh.materials.append(colors[ci])
 layer=mesh.vertex_colors.new(name='COLOR_0')
 for poly in mesh.polygons:
  for li in poly.loop_indices:
   t=vt[mesh.loops[li].vertex_index]
   u=min(1.,max(0.,t*2));u=u*u*(3-2*u)
   layer.data[li].color=(*(root[c]*(1-u)+middle[c]*u for c in range(3)),1)
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
