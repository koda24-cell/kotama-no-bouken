"""Render color-coded connected boundary components for manual anatomical identification.
blender -b --python render_boundary_components.py -- source.vrm boundary.json output_dir
Temporary diagnostic only. No mesh export.
"""
import bpy,sys,os,json
from mathutils import Vector
a=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(a)!=3:raise SystemExit('usage: blender -b --python render_boundary_components.py -- input.vrm report.json out')
src,report,out=a;os.makedirs(out,exist_ok=True)
data=json.load(open(report,encoding='utf-8'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
selected={o['name']:o for o in data['objects']}
for o in meshes:o.hide_render=o.name not in selected
colors=[(1,.08,.02,1),(.05,.75,1,1),(.95,.8,.04,1),(.75,.2,1,1),(.05,1,.3,1),(.95,.35,.65,1)]
curve=bpy.data.curves.new('component_segments','CURVE');curve.dimensions='3D';curve.bevel_depth=.0015;curve.bevel_resolution=1
ob=bpy.data.objects.new('component_overlay',curve);bpy.context.collection.objects.link(ob)
# One curve per color, not per edge; each component has its own material index.
for i,color in enumerate(colors):
 mat=bpy.data.materials.new('component_color_'+str(i));mat.diffuse_color=color;mat.use_nodes=True
 bsdf=mat.node_tree.nodes.get('Principled BSDF')
 if bsdf:mat.node_tree.nodes.remove(bsdf)
 emission=mat.node_tree.nodes.new('ShaderNodeEmission');emission.inputs['Color'].default_value=color;emission.inputs['Strength'].default_value=2
 output=next(n for n in mat.node_tree.nodes if n.type=='OUTPUT_MATERIAL')
 mat.node_tree.links.new(emission.outputs[0],output.inputs['Surface'])
 ob.data.materials.append(mat)
manifest=[]
for obj in meshes:
 if obj.name not in selected:continue
 for i,component in enumerate(selected[obj.name]['components'][:6]):
  used=set()
  for path in component['paths']:
   ids=path['vertex_indices']
   for x,y in zip(ids,ids[1:]):
    edge=tuple(sorted((x,y)))
    if edge in used:continue
    used.add(edge)
    p=obj.matrix_world@obj.data.vertices[x].co
    q=obj.matrix_world@obj.data.vertices[y].co
    spline=curve.splines.new('POLY');spline.points.add(1)
    spline.material_index=i
    spline.points[0].co=(*p,1);spline.points[1].co=(*q,1)
  manifest.append({'object':obj.name,'component':i,'edges_drawn':len(used),'color_rgba':colors[i]})
pts=[o.matrix_world@v.co for o in meshes if o.name in selected for v in o.data.vertices]
if not pts:raise RuntimeError('No selected face mesh')
lo=Vector([min(p[i] for p in pts) for i in range(3)]);hi=Vector([max(p[i] for p in pts) for i in range(3)])
center=(lo+hi)/2;extent=max((hi-lo).length,.15)
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=960;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
camd=bpy.data.cameras.new('camera');cam=bpy.data.objects.new('camera',camd);scene.collection.objects.link(cam);scene.camera=cam
cam.data.type='ORTHO';cam.data.ortho_scale=extent*1.45
lightd=bpy.data.lights.new('light','AREA');light=bpy.data.objects.new('light',lightd);scene.collection.objects.link(light)
light.location=center+Vector((extent,extent,extent));lightd.energy=650;lightd.size=extent*1.5
for name,offset in [('front',(0,1,0)),('back',(0,-1,0)),('side',(1,0,0)),('back_upper',(1,-1,.65))]:
 cam.location=center+Vector(offset).normalized()*extent*3
 cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=os.path.join(out,name+'.png');bpy.ops.render.render(write_still=True)
with open(os.path.join(out,'component_overlay_manifest.json'),'w') as f:
 json.dump({'model':os.path.basename(src),'components':manifest,'caution':'Colors identify largest boundary graph components, not anatomical seams; not a model approval'},f,indent=2)
