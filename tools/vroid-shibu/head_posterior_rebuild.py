import bpy,os,json,math
from mathutils import Vector
out='output/vroid-shibu/head-rebuild'
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# Import original CC0 VRMs within this same workflow run; never rely on prior artifacts.
def import_head(path,prefix):
 if not os.path.isfile(path):raise RuntimeError('Source VRM missing: '+path)
 before=set(bpy.context.scene.objects)
 bpy.ops.import_scene.gltf(filepath=path)
 objects=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']
 face=next((o for o in objects if o.name.lower()=='face'),None)
 if face is None:raise RuntimeError('Face mesh not found in '+path)
 for o in objects:
  o.name=prefix+'_'+o.name
  o.hide_render=(o!=face)
 pts=[face.matrix_world@Vector(v.co) for v in face.data.vertices]
 lo=Vector([min(p[i] for p in pts) for i in range(3)])
 hi=Vector([max(p[i] for p in pts) for i in range(3)])
 return [face],lo,hi
shibu_objs,smn,smx=import_head('/tmp/Sendagaya_Shibu.vrm','Shibu')
vita_objs,vmn,vmx=import_head('/tmp/Vita.vrm','Vita')
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
# V13: continuous posterior cross-sections, fitted to smoothed side contours.
# The V13 linear interpolation made a flat ribbon with large holes.
face_obj=shibu_objs[0]
source_vertices=[face_obj.matrix_world @ v.co for v in face_obj.data.vertices]
# Sample several vertical slices, then smooth the edge contour across heights.
N=48
zlo=smn.z+sh*.035
zhi=smx.z+sh*.015
def edge_at(z,side):
 band=max(sh*.055,.003)
 candidates=[v for v in source_vertices if abs(v.z-z)<band and (v.x-cx)*side>0]
 if not candidates:
  candidates=sorted((v for v in source_vertices if (v.x-cx)*side>0),key=lambda v:abs(v.z-z))[:20]
 if not candidates:raise RuntimeError('Face lacks vertices on one side')
 # Choose lateral face edge; use robust median of outermost samples.
 candidates.sort(key=lambda v:abs(v.x-cx),reverse=True)
 edge=candidates[:max(4,len(candidates)//8)]
 return (sum(v.x for v in edge)/len(edge),sum(v.y for v in edge)/len(edge))
raw=[]
for i in range(N+1):
 z=zlo+(zhi-zlo)*i/N
 lx,ly=edge_at(z,-1);rx0,ry=edge_at(z,1)
 raw.append((z,lx,ly,rx0,ry))
def smooth(i,k):
 vals=[raw[max(0,min(N,i+d))][k] for d in (-3,-2,-1,0,1,2,3)]
 return sum(vals)/len(vals)
# Back curvature is smooth and widest around the cranium, narrower at jaw.
rows=N;cols=48;verts=[];faces=[]
for i in range(rows+1):
 z=raw[i][0]
 lx,ly,rrx,ry=[smooth(i,k) for k in (1,2,3,4)]
 mid=(lx+rrx)*.5
 half=max((rrx-lx)*.5,.003)
 norm=(z-zlo)/(zhi-zlo)
 crown=max(.045,math.sin(math.pi*norm)**.55)
 depth=rear_depth*crown
 for j in range(cols+1):
  phi=math.pi*j/cols
  # An actual curved rear half of the head, not a flattened strip.
  x=mid+half*math.cos(phi)
  y=ry*(1-j/cols)+ly*(j/cols)-depth*math.sin(phi)
  # Blend upper and lower cross-sections toward the center to round the crown.
  x=mid+(x-mid)*(.30+.70*math.sin(math.pi*norm)**.30)
  verts.append((x,y,z))
for i in range(rows):
 for j in range(cols):
  a=i*(cols+1)+j;b=a+cols+1
  faces.append((a,b,b+1,a+1))
# Close the crown and lower posterior skull without any extra sphere.
for top in (False,True):
 ring=rows if top else 0
 indices=[ring*(cols+1)+j for j in range(cols+1)]
 centroid=Vector((0,0,0))
 for idx in indices:centroid+=Vector(verts[idx])
 centroid/=len(indices)
 cap=len(verts)
 verts.append(tuple(centroid))
 for j in range(cols):
  if top:faces.append((indices[j],indices[j+1],cap))
  else:faces.append((indices[j+1],indices[j],cap))
mesh=bpy.data.meshes.new('Posterior_shell_mesh');mesh.from_pydata(verts,[],faces);mesh.update()
head=bpy.data.objects.new('Assassin_posterior_shell_V13',mesh)
bpy.context.collection.objects.link(head)
for poly in mesh.polygons:poly.use_smooth=True
if face_obj.data.materials:
 # Original face uses textured shader: sample the visible base tint for an even review clay.
 skin=bpy.data.materials.new('V13_posterior_skin_review')
 skin.diffuse_color=(0.82,0.69,0.63,1)
 skin.use_nodes=True
 skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(0.82,0.69,0.63,1)
 head.data.materials.append(skin)
else:
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
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'assassin_head_posterior_v13_review.glb'),export_format='GLB',use_selection=True)
with open(os.path.join(out,'geometry_measurements.json'),'w') as f:
 json.dump({'shibu_bounds':[list(smn),list(smx)],'vita_bounds':[list(vmn),list(vmx)],
 'shibu_width':sw,'vita_width':vw,'shibu_depth':sd,'vita_depth':vd,
 'shibu_height':sh,'vita_height':vh,'rear_depth':rear_depth,
 'rear_seam_y':seam_y,'new_vertices':len(verts),'new_faces':len(faces),
 'construction':'V13 face-sampled seam and posterior shell; no sphere, no hair; unapproved review candidate'},f,indent=2)
