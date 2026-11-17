"""Render face boundary edges as a diagnostic overlay in Blender.
Uses source face geometry only for private transient inspection. Does not export mesh.
blender -b --python render_boundary_review.py -- source.vrm output_dir
"""
import bpy,sys,os,json,collections
from mathutils import Vector
a=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(a)!=2:raise SystemExit('usage: blender -b --python render_boundary_review.py -- input.vrm output_dir')
src,out=a;os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
faces=[o for o in meshes if any(t in o.name.lower() for t in ('face','head')) and 'hair' not in o.name.lower()]
if not faces:raise RuntimeError('No face/head mesh identified')
for o in meshes:o.hide_render=o not in faces
mat=bpy.data.materials.new('DiagnosticBoundaryOrange');mat.diffuse_color=(1.0,.18,.025,1)
mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear()
em=nodes.new('ShaderNodeEmission');em.inputs['Color'].default_value=(1,.12,.01,1);em.inputs['Strength'].default_value=2
outnode=nodes.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(em.outputs['Emission'],outnode.inputs['Surface'])
count=0;branch=0
for o in faces:
 edgefaces=collections.Counter()
 for poly in o.data.polygons:
  ids=list(poly.vertices)
  for x,y in zip(ids,ids[1:]+ids[:1]):edgefaces[tuple(sorted((x,y)))]+=1
 boundary=[e for e,n in edgefaces.items() if n==1]
 degrees=collections.Counter(v for e in boundary for v in e)
 branch+=sum(d!=2 for d in degrees.values())
 # Display geometry is a temporary overlay, never exported.
 world=o.matrix_world
 for x,y in boundary:
  p=world@o.data.vertices[x].co;q=world@o.data.vertices[y].co
  direction=q-p
  if direction.length<1e-8:continue
  curve=bpy.data.curves.new('boundary_segment','CURVE');curve.dimensions='3D';curve.bevel_depth=.001;curve.bevel_resolution=1
  spline=curve.splines.new('POLY');spline.points.add(1)
  spline.points[0].co=(*p,1);spline.points[1].co=(*q,1)
  ob=bpy.data.objects.new('boundary_overlay',curve);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat)
  count+=1
pts=[o.matrix_world@v.co for o in faces for v in o.data.vertices]
lo=Vector([min(p[i] for p in pts) for i in range(3)])
hi=Vector([max(p[i] for p in pts) for i in range(3)])
center=(lo+hi)/2;extent=max((hi-lo).length,.15)
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items else 'BLENDER_EEVEE'
scene.render.resolution_x=720;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
camd=bpy.data.cameras.new('BoundaryCamera');cam=bpy.data.objects.new('BoundaryCamera',camd);scene.collection.objects.link(cam);scene.camera=cam
cam.data.type='ORTHO';cam.data.ortho_scale=extent*1.5
lightd=bpy.data.lights.new('BoundaryLight','AREA');light=bpy.data.objects.new('BoundaryLight',lightd);scene.collection.objects.link(light)
light.location=center+Vector((extent,extent,extent));lightd.energy=650;lightd.size=extent*1.5
for name,offset in {'front':(0,1,0),'back':(0,-1,0),'side':(1,0,0),'back_upper':(1,-1,.65)}.items():
 cam.location=center+Vector(offset).normalized()*extent*3
 cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=os.path.join(out,name+'.png');bpy.ops.render.render(write_still=True)
with open(os.path.join(out,'boundary_manifest.json'),'w') as f:
 json.dump({'source':os.path.basename(src),'face_objects':[o.name for o in faces],'boundary_segments':count,'non_degree_2_boundary_vertices':branch,'interpretation':'Diagnostic only; intentional face openings are normal. Orange lines are temporary overlays, not exported mesh.'},f,indent=2)
