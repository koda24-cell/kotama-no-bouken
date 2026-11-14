import bpy,os,json,math
from mathutils import Vector
out='output/vroid-shibu/head-rebuild'
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# Use exact head meshes from the two earlier CC0 Blender exports.
shibu='output/vroid-shibu/bare_head_review.glb'
vita='output/vroid-shibu/vita-comparison/vita_bare_head.glb'
if not os.path.isfile(shibu) or not os.path.isfile(vita):
 raise RuntimeError('Missing bare head review GLB inputs')
def import_head(path,prefix):
 before=set(bpy.context.scene.objects)
 bpy.ops.import_scene.gltf(filepath=path)
 objects=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']
 for o in objects:o.name=prefix+'_'+o.name
 pts=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
 lo=Vector([min(p[i] for p in pts) for i in range(3)])
 hi=Vector([max(p[i] for p in pts) for i in range(3)])
 return objects,lo,hi
shibu_objs,smn,smx=import_head(shibu,'Shibu')
vita_objs,vmn,vmx=import_head(vita,'Vita')
for o in vita_objs:o.hide_render=True
# Blender glTF import uses X horizontal, Y depth, Z vertical.
# Scale Vita's observed head proportions to Shibu's face width.
sw=smx.x-smn.x;vw=vmx.x-vmn.x
sd=smx.y-smn.y;vd=vmx.y-vmn.y
sh=smx.z-smn.z;vh=vmx.z-vmn.z
cx=(smx.x+smn.x)/2
cz=(smx.z+smn.z)/2
# Place back seam just behind the existing face. Do not create a full sphere.
# Vita depth/width ratio informs posterior curvature, constrained to source bounds.
rear_depth=min(max((vd/vw)*sw*.52,sd*.34),sd*.85)
seam_y=smn.y+sd*.45
rx=sw*.485
rz=sh*.485
# Construct a HALF-ELLIPSOID surface with open front, not a scalp sphere.
# theta controls height, phi runs from left seam to back to right seam.
rows=32;cols=32;verts=[];faces=[]
for i in range(rows+1):
 theta=math.pi*(.025+(.95*i/rows))
 for j in range(cols+1):
  phi=math.pi*j/cols
  x=cx+rx*math.sin(theta)*math.cos(phi)
  y=seam_y-rear_depth*math.sin(theta)*math.sin(phi)
  z=cz+rz*math.cos(theta)
  verts.append((x,y,z))
for i in range(rows):
 for j in range(cols):
  a=i*(cols+1)+j;b=a+cols+1
  faces.append((a,b,b+1,a+1))
mesh=bpy.data.meshes.new('Posterior_shell_mesh');mesh.from_pydata(verts,[],faces);mesh.update()
head=bpy.data.objects.new('Assassin_posterior_shell_V10',mesh)
bpy.context.collection.objects.link(head)
for poly in mesh.polygons:poly.use_smooth=True
mat=bpy.data.materials.new('Head_neutral_clay')
mat.diffuse_color=(.75,.71,.70,1)
head.data.materials.append(mat)
# Keep original Shibu face and its materials; no hair or scalp sphere generated.
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=960;scene.render.resolution_y=960
scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
world=bpy.data.worlds.new('Neutral');scene.world=world;world.color=(.65,.65,.65)
center=Vector((cx,(smn.y+smx.y)/2,cz))
bpy.ops.object.light_add(type='AREA',location=center+Vector((2,3,4)))
lamp=bpy.context.object;lamp.data.energy=700;lamp.data.size=4
lamp.rotation_euler=(center-lamp.location).to_track_quat('-Z','Y').to_euler()
for name,offset in [('front',(0,1,0)),('back',(0,-1,0)),('side',(1,0,0)),('back_upper',(0,-1,.55)),('three_quarter',(1,1,.16))]:
 bpy.ops.object.camera_add(location=center+Vector(offset).normalized()*max(2,sh*5))
 cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
 cam.data.type='ORTHO';cam.data.ortho_scale=max(sh*1.5,sw*1.5,sd*2,.18)
 scene.camera=cam;scene.render.filepath=os.path.join(out,name+'.png')
 bpy.ops.render.render(write_still=True)
 bpy.data.objects.remove(cam,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for o in shibu_objs+[head]:o.select_set(True)
bpy.context.view_layer.objects.active=head
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'assassin_head_posterior_v10_review.glb'),export_format='GLB',use_selection=True)
with open(os.path.join(out,'geometry_measurements.json'),'w') as f:
 json.dump({'shibu_bounds':[list(smn),list(smx)],'vita_bounds':[list(vmn),list(vmx)],
 'shibu_width':sw,'vita_width':vw,'shibu_depth':sd,'vita_depth':vd,
 'shibu_height':sh,'vita_height':vh,'rear_depth':rear_depth,
 'rear_seam_y':seam_y,'new_vertices':len(verts),'new_faces':len(faces),
 'construction':'open posterior half-shell only; no sphere, no hair; unapproved review candidate'},f,indent=2)
