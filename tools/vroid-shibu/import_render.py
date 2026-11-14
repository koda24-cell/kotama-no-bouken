import bpy,os,json,math
from mathutils import Vector
src=os.environ.get('SOURCE_VRM','/tmp/Sendagaya_Shibu.vrm')
out=os.environ.get('OUTPUT_DIR','output/vroid-shibu')
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# VRM 0.x embeds glTF 2.0 binary, so geometry can be read as GLB.
bpy.ops.import_scene.gltf(filepath=src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes:raise RuntimeError('No mesh objects found in downloaded VRM')
manifest={'source':'Sendagaya_Shibu.vrm','license':'CC0 per pixiv beta AvatarSample_1',
          'meshes':[],'hidden':[]}
# Keep the original source intact. Render a body-only trial by excluding
# obvious hair, garment, eye and accessory objects when named separately.
for obj in meshes:
 name=obj.name.lower()
 hide=name=='icosphere' or any(token in name for token in ('hair','skirt','dress','cloth','outfit','shoe','accessory','ribbon'))
 manifest['meshes'].append({'name':obj.name,'vertices':len(obj.data.vertices),
                           'polygons':len(obj.data.polygons),'hidden':hide, 'materials':[{'index':i,'name':m.name if m else 'None','faces':sum(1 for p in obj.data.polygons if p.material_index==i)} for i,m in enumerate(obj.data.materials)]})
 if hide:
  obj.hide_render=True
  manifest['hidden'].append(obj.name)
# Separate material-tagged clothing into independent meshes, preserving source.
body=next((o for o in meshes if o.name=='Body'),None)
if body:
 import bmesh
 for label,keep_skin in [('skin',True),('clothing',False)]:
  clone=body.copy();clone.data=body.data.copy()
  bpy.context.collection.objects.link(clone);clone.name='Body_'+label
  bm=bmesh.new();bm.from_mesh(clone.data)
  mats=list(clone.data.materials)
  remove=[]
  for face in bm.faces:
   name=mats[face.material_index].name.upper() if face.material_index<len(mats) and mats[face.material_index] else ''
   if ('SKIN' in name)!=keep_skin:remove.append(face)
  bmesh.ops.delete(bm,geom=remove,context='FACES')
  bm.to_mesh(clone.data);bm.free();clone.data.update()
  clone.hide_render=not keep_skin
  manifest['meshes'].append({'name':clone.name,'vertices':len(clone.data.vertices),'polygons':len(clone.data.polygons),'hidden':clone.hide_render})
 body.hide_render=True
 manifest['hidden'].append('Body')
skin=next((o for o in bpy.context.scene.objects if o.type=='MESH' and o.name=='Body_skin'),None)
# Locate boundary-edge components without modifying the original skin.
if skin:
 from collections import defaultdict
 edge_faces=defaultdict(int)
 for poly in skin.data.polygons:
  for edge in poly.edge_keys:edge_faces[tuple(sorted(edge))]+=1
 boundary=[e for e,n in edge_faces.items() if n==1]
 adjacency=defaultdict(set)
 for a,b in boundary:adjacency[a].add(b);adjacency[b].add(a)
 unseen=set(adjacency);components=[]
 while unseen:
  seed=unseen.pop();stack=[seed];component={seed}
  while stack:
   for nxt in adjacency[stack.pop()]:
    if nxt not in component:
     component.add(nxt);unseen.discard(nxt);stack.append(nxt)
  points=[skin.data.vertices[i].co for i in component]
  lo=[min(p[k] for p in points) for k in range(3)]
  hi=[max(p[k] for p in points) for k in range(3)]
  components.append({'vertices':len(component),'bounds_min':lo,'bounds_max':hi,
                     'closed_loop':all(len(adjacency[v])==2 for v in component)})
 manifest['boundary_components']=sorted(components,key=lambda x:x['vertices'],reverse=True)
 manifest['boundary_component_count']=len(components)
# Geometry-first trial: close only small simple boundary loops on a copy.
# Large openings under garments must be sculpted, never capped automatically.
if skin:
 import bmesh
 repaired=skin.copy();repaired.data=skin.data.copy()
 bpy.context.collection.objects.link(repaired)
 repaired.name='Body_skin_small_hole_repair_trial'
 repaired.hide_render=True
 bm=bmesh.new();bm.from_mesh(repaired.data)
 boundary_edges=[e for e in bm.edges if e.is_boundary]
 seen=set();filled=[]
 for edge in boundary_edges:
  if edge in seen:continue
  group={edge};todo=[edge];seen.add(edge)
  while todo:
   current=todo.pop()
   for v in current.verts:
    for nxt in v.link_edges:
     if nxt.is_boundary and nxt not in seen:
      seen.add(nxt);group.add(nxt);todo.append(nxt)
  verts={v for e in group for v in e.verts}
  if len(group)!=len(verts) or len(verts)>16:continue
  # Only very small, near-planar loops; never bridge garment-sized openings.
  xs=[v.co.x for v in verts];ys=[v.co.y for v in verts];zs=[v.co.z for v in verts]
  diagonal=((max(xs)-min(xs))**2+(max(ys)-min(ys))**2+(max(zs)-min(zs))**2)**.5
  if diagonal>.08:continue
  try:
   bmesh.ops.holes_fill(bm,edges=list(group),sides=0)
   filled.append({'vertices':len(verts),'diagonal':diagonal})
  except Exception:pass
 bm.to_mesh(repaired.data);bm.free();repaired.data.update()
 manifest['small_hole_repair_trial']={'filled_loops':filled,'faces':len(repaired.data.polygons),'vertices':len(repaired.data.vertices),'note':'review candidate; large openings untouched'}
visible=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.hide_render]
if not visible:raise RuntimeError('Body-only filtering removed all meshes')
# World-space bounds and calibrated camera framing, no destructive geometry edits.
coords=[o.matrix_world @ Vector(corner) for o in visible for corner in o.bound_box]
mn=Vector(tuple(min(v[i] for v in coords) for i in range(3)))
mx=Vector(tuple(max(v[i] for v in coords) for i in range(3)))
center=(mn+mx)/2;span=mx-mn
manifest['bounds_min']=list(mn);manifest['bounds_max']=list(mx)
manifest['height']=span.z
# Importer coordinates vary; preserve unmodified original and render four views.
mat=bpy.data.materials.new('Solid_clay');mat.diffuse_color=(.72,.73,.77,1)
for obj in visible:
 obj.data.materials.clear();obj.data.materials.append(mat)
world=bpy.context.scene.world or bpy.data.worlds.new('World')
bpy.context.scene.world=world
world.color=(.65,.65,.65)
for loc,power in [((3,-5,7),900),((-4,2,5),500)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(loc))
 lamp=bpy.context.object;lamp.data.energy=power;lamp.data.size=5
 lamp.rotation_euler=(center-lamp.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene
engines={e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}
scene.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
scene.render.resolution_x=720;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
distance=max(3.0,span.length*2.4)
for name,offset in [('front',(0,1,0)),('back',(0,-1,0)),('right_side',(1,0,0)),('left_side',(-1,0,0)),('three_quarter',(1,1,.22))]:
 bpy.ops.object.camera_add(location=center+distance*Vector(offset).normalized())
 cam=bpy.context.object
 cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
 cam.data.type='ORTHO';cam.data.ortho_scale=max(span.z*1.16,span.x*1.7,span.y*1.7,.5)
 scene.camera=cam
 scene.render.filepath=os.path.join(out,name+'.png')
 bpy.ops.render.render(write_still=True)
 bpy.data.objects.remove(cam,do_unlink=True)
if skin:
 repaired.data.materials.clear();repaired.data.materials.append(mat)
 skin.hide_render=True;repaired.hide_render=False
 for name,offset in [('front',(0,1,0)),('right_side',(1,0,0)),('three_quarter',(1,1,.22))]:
  bpy.ops.object.camera_add(location=center+distance*Vector(offset).normalized())
  cam=bpy.context.object
  cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
  cam.data.type='ORTHO';cam.data.ortho_scale=max(span.z*1.16,span.x*1.7,span.y*1.7,.5)
  scene.camera=cam
  scene.render.filepath=os.path.join(out,'repair_'+name+'.png')
  bpy.ops.render.render(write_still=True)
  bpy.data.objects.remove(cam,do_unlink=True)
 repaired.hide_render=True;skin.hide_render=False
# Face-focused stage: preserve source, isolate the head for high-resolution review.
face=next((o for o in meshes if o.name.lower()=='face'),None)
if face:
 manifest['face_review']={'source_mesh':face.name,'vertices':len(face.data.vertices),
                         'faces':len(face.data.polygons),'materials':next((m['materials'] for m in manifest['meshes'] if m['name']==face.name),[])}
 # Assassin-specific front fringe prototype: near-camera (+X) eye occlusion.
 # Build a separate editable mesh; never modify the VRoid source face.
 from mathutils import Vector as V
 # Blender-native curve workflow: volumetric strands built as tapered mesh rings.
 # This is portable across Blender 5.0 and needs no paid/third-party addon.
 from math import sin,cos,pi
 def make_strand(name,points,widths,depth_ratio=.27,segments=24):
  verts=[];faces=[]
  for i,(p,w) in enumerate(zip(points,widths)):
   tangent=(points[min(i+1,len(points)-1)]-points[max(i-1,0)]).normalized()
   across=tangent.cross(V((0,1,0))).normalized()
   if across.length<.01:across=V((1,0,0))
   depth=tangent.cross(across).normalized()
   for k in range(segments):
    a=2*pi*k/segments
    q=p+across*(cos(a)*w*.5)+depth*(sin(a)*w*depth_ratio*.5)
    verts.append(tuple(q))
  for i in range(len(points)-1):
   for k in range(segments):
    a=i*segments+k;b=i*segments+(k+1)%segments
    faces.append((a,b,b+segments,a+segments))
  faces.extend([tuple(reversed(range(segments))),tuple((len(points)-1)*segments+k for k in range(segments))])
  mesh=bpy.data.meshes.new(name+'_mesh');mesh.from_pydata(verts,[],faces);mesh.update()
  obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
  for poly in mesh.polygons:poly.use_smooth=True
  # Catmull-Clark subdivision rounds both lengthwise and radial hair silhouette.
  sub=obj.modifiers.new('Hair_curve_smoothing','SUBSURF')
  sub.subdivision_type='CATMULL_CLARK';sub.levels=2;sub.render_levels=2
  return obj
 face_bounds=[face.matrix_world @ Vector(c) for c in face.bound_box]
 fmin=Vector(tuple(min(v[i] for v in face_bounds) for i in range(3)))
 fmax=Vector(tuple(max(v[i] for v in face_bounds) for i in range(3)))
 fc=(fmin+fmax)/2;fs=fmax-fmin
 fw=fs.x;fh=fs.z
 hair=bpy.data.materials.new('Assassin_silver_lavender_hair')
 hair.diffuse_color=(.72,.68,.82,1)
 # Anchor roots closer to the scalp and follow the forehead surface.
 # Keep the camera-near (+X) eye covered while the far eye remains visible.
 strands=[]
 for idx,(shift,scale,drop) in enumerate([(-.06,.25,.015),(.02,.29,.0),(.11,.22,-.02),(.19,.15,-.035),(.27,.12,-.045)]):
  x0=.05+shift
  pts=[
   V((fc.x+fw*x0, fmax.y-fs.y*.035, fmax.z-fh*(.015+drop))),
   V((fc.x+fw*(x0+.055), fmax.y+fs.y*.025, fmax.z-fh*(.12+drop))),
   V((fc.x+fw*(x0+.105), fmax.y+fs.y*.065, fmax.z-fh*(.26+drop))),
   V((fc.x+fw*(x0+.13), fmax.y+fs.y*.095, fmax.z-fh*(.41+drop))),
   V((fc.x+fw*(x0+.12), fmax.y+fs.y*.08, fmax.z-fh*(.56+drop))),
   V((fc.x+fw*(x0+.08), fmax.y+fs.y*.045, fmax.z-fh*(.69+drop)))]
  obj=make_strand('Assassin_layered_bang_%02d'%idx,pts,[fw*scale*q for q in (.55,.9,1,.85,.58,.018)],depth_ratio=.44,segments=24)
  obj.data.materials.append(hair);strands.append(obj)
 manifest['face_review']['assassin_fringe']={
  'names':[o.name for o in strands],
  'side':'camera-near +X',
  'construction':'five tapered volumetric strands, 24 radial segments, Catmull-Clark subdivision level 2',
  'note':'review actual front, side, three-quarter images for face intersection and occlusion'}
 prior={o.name:o.hide_render for o in bpy.context.scene.objects if o.type=='MESH'}
 for obj in bpy.context.scene.objects:
  if obj.type=='MESH':obj.hide_render=(obj!=face and obj not in strands)
 face_bounds=[face.matrix_world @ Vector(c) for c in face.bound_box]
 fmin=Vector(tuple(min(v[i] for v in face_bounds) for i in range(3)))
 fmax=Vector(tuple(max(v[i] for v in face_bounds) for i in range(3)))
 fc=(fmin+fmax)/2;fs=fmax-fmin
 manifest['face_review']['bounds_min']=list(fmin)
 manifest['face_review']['bounds_max']=list(fmax)
 scene.render.resolution_x=960;scene.render.resolution_y=960
 for name,offset in [('front',(0,1,0)),('side',(1,0,0)),('three_quarter',(1,1,.16))]:
  bpy.ops.object.camera_add(location=fc+max(2,fs.length*5)*Vector(offset).normalized())
  cam=bpy.context.object
  cam.rotation_euler=(fc-cam.location).to_track_quat('-Z','Y').to_euler()
  cam.data.type='ORTHO';cam.data.ortho_scale=max(fs.z*1.5,fs.x*1.5,fs.y*2.0,.18)
  scene.camera=cam
  scene.render.filepath=os.path.join(out,'face_'+name+'.png')
  bpy.ops.render.render(write_still=True)
  bpy.data.objects.remove(cam,do_unlink=True)
 for obj in bpy.context.scene.objects:
  if obj.type=='MESH':obj.hide_render=prior[obj.name]
 scene.render.resolution_x=720;scene.render.resolution_y=900
with open(os.path.join(out,'source_manifest.json'),'w') as f:json.dump(manifest,f,ensure_ascii=False,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'vroid_shibu_import.blend'))
bpy.ops.object.select_all(action='DESELECT')
for obj in visible:obj.select_set(True)
bpy.context.view_layer.objects.active=visible[0]
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'skin_only_review.glb'),export_format='GLB',use_selection=True)
bpy.ops.object.select_all(action='DESELECT')
print('IMPORTED_MESHES',len(meshes),'VISIBLE',len(visible))
