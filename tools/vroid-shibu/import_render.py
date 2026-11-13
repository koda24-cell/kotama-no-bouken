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
if skin:
 candidate=skin.copy();candidate.data=skin.data.copy()
 bpy.context.collection.objects.link(candidate)
 candidate.name='Body_skin_lowpoly_candidate'
 candidate.hide_render=True
 before_faces=len(candidate.data.polygons)
 modifier=candidate.modifiers.new('Trial_reduction_50pct','DECIMATE')
 modifier.ratio=.5
 bpy.context.view_layer.objects.active=candidate
 candidate.select_set(True)
 bpy.ops.object.modifier_apply(modifier=modifier.name)
 candidate.select_set(False)
 manifest['lowpoly_trial']={'before_faces':before_faces,'after_faces':len(candidate.data.polygons),'vertices':len(candidate.data.vertices),'note':'non-destructive duplicate; not approved'}
 edge_uses={}
 for poly in skin.data.polygons:
  for key in poly.edge_keys:
   k=tuple(sorted(key));edge_uses[k]=edge_uses.get(k,0)+1
 manifest['skin_boundary_edges']=sum(v==1 for v in edge_uses.values())
 manifest['skin_nonmanifold_edges']=sum(v>2 for v in edge_uses.values())
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
# Compare original skin and reduced candidate using identical cameras and lighting.
if skin:
 candidate.data.materials.clear();candidate.data.materials.append(mat)
 skin.hide_render=True
 candidate.hide_render=False
 for name,offset in [('front',(0,1,0)),('right_side',(1,0,0)),('three_quarter',(1,1,.22))]:
  bpy.ops.object.camera_add(location=center+distance*Vector(offset).normalized())
  cam=bpy.context.object
  cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
  cam.data.type='ORTHO'
  cam.data.ortho_scale=max(span.z*1.16,span.x*1.7,span.y*1.7,.5)
  scene.camera=cam
  scene.render.filepath=os.path.join(out,'lowpoly_'+name+'.png')
  bpy.ops.render.render(write_still=True)
  bpy.data.objects.remove(cam,do_unlink=True)
 candidate.hide_render=True
 skin.hide_render=False
with open(os.path.join(out,'source_manifest.json'),'w') as f:json.dump(manifest,f,ensure_ascii=False,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'vroid_shibu_import.blend'))
bpy.ops.object.select_all(action='DESELECT')
for obj in visible:obj.select_set(True)
bpy.context.view_layer.objects.active=visible[0]
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'skin_only_review.glb'),export_format='GLB',use_selection=True)
bpy.ops.object.select_all(action='DESELECT')
print('IMPORTED_MESHES',len(meshes),'VISIBLE',len(visible))
