"""V16 review-only posterior shell using the original 36-vertex outer rim.
Never weld or modify original face mesh. This is a test candidate, not a finished asset.
Blender -b --python ... -- shibu.vrm vita.vrm boundary.json output_dir
"""
import bpy,sys,os,json,math,collections
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(args)!=4:raise SystemExit('expected shibu.vrm vita.vrm boundary.json output_dir')
src,vita,report,out=args;os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=src)
obj=next((o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.lower()=='face'),None)
if obj is None:raise RuntimeError('Face missing')
for o in bpy.context.scene.objects:
 if o.type=='MESH' and o!=obj:o.hide_render=True
data=json.load(open(report))
entry=next(x for x in data['objects'] if x['name']==obj.name)
c=entry['components'][5]
if not c['simple_cycle'] or len(c['paths'])!=1:raise RuntimeError('component 5 is not simple cycle')
path=c['paths'][0]['vertex_indices']
if path[0]!=path[-1] or len(path)-1!=36:raise RuntimeError('unexpected rim vertex count')
ids=path[:-1];rim=[obj.matrix_world@obj.data.vertices[i].co for i in ids]
# Face points towards +Y; posterior bulge points towards -Y.
# Keep exact rim vertex coordinates, no Z-band approximation or source modification.
cx=sum(p.x for p in rim)/len(rim);cz=sum(p.z for p in rim)/len(rim)
width=max(p.x for p in rim)-min(p.x for p in rim)
height=max(p.z for p in rim)-min(p.z for p in rim)
if not(.12<width<.30 and .12<height<.35):raise RuntimeError('unexpected anatomical rim size')
# Posterior ring tapers in XZ while Y recedes smoothly; preserve rim vertices at ring 0.
n=len(rim);steps=24;depth=width*.68;vertices=[]
for k in range(steps+1):
 t=k/steps
 for p in rim:
  shrink=math.cos(math.pi*t/2)
  y=p.y-depth*math.sin(math.pi*t/2)
  vertices.append((cx+(p.x-cx)*shrink,y,cz+(p.z-cz)*shrink))
faces=[]
for k in range(steps):
 for j in range(n):
  a=k*n+j;b=k*n+(j+1)%n;c=(k+1)*n+(j+1)%n;d=(k+1)*n+j
  faces.append((a,b,c,d))
# End ring collapses to center; cap explicitly without degenerate last ring.
center_y=sum(vertices[steps*n+j][1] for j in range(n))/n
cap=len(vertices);vertices.append((cx,center_y,cz))
for j in range(n):faces.append((steps*n+j,steps*n+(j+1)%n,cap))
mesh=bpy.data.meshes.new('posterior_v16_review');mesh.from_pydata(vertices,[],faces);mesh.update()
shell=bpy.data.objects.new('Posterior_V16_review_unwelded',mesh);bpy.context.collection.objects.link(shell)
for p in mesh.polygons:p.use_smooth=True
# Orient normals outward by checking a lateral surface normal.
test=next((p for p in mesh.polygons if abs(p.normal.x)>.2),None)
if test and test.center.x*test.normal.x<0:
 for poly in mesh.polygons:poly.flip()
mat=bpy.data.materials.new('V16_clay');mat.diffuse_color=(.8,.65,.59,1);shell.data.materials.append(mat)
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=960;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
mid=Vector((cx,sum(p.y for p in rim)/n-depth*.4,cz))
ld=bpy.data.lights.new('key','AREA');light=bpy.data.objects.new('key',ld);scene.collection.objects.link(light)
light.location=mid+Vector((1,1,1));ld.energy=450;ld.size=2
camd=bpy.data.cameras.new('review_camera');cam=bpy.data.objects.new('review_camera',camd);scene.collection.objects.link(cam);scene.camera=cam
cam.data.type='ORTHO';cam.data.ortho_scale=max(height*1.8,width*1.8)
for name,d in [('front',(0,1,0)),('back',(0,-1,0)),('left',(-1,0,0)),('right',(1,0,0)),('back_upper',(1,-1,.6)),('three_quarter',(1,1,.25))]:
 cam.location=mid+Vector(d).normalized()*2
 cam.rotation_euler=(mid-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=os.path.join(out,name+'.png');bpy.ops.render.render(write_still=True)
# Review GLB keeps source face and posterior shell as separate objects.
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);shell.select_set(True);bpy.context.view_layer.objects.active=shell
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'assassin_head_posterior_v16_review.glb'),export_format='GLB',use_selection=True)
edges=collections.Counter()
for poly in mesh.polygons:
 v=list(poly.vertices)
 for a,b in zip(v,v[1:]+v[:1]):edges[tuple(sorted((a,b)))]+=1
with open(os.path.join(out,'geometry_measurements.json'),'w') as f:
 json.dump({'rim_vertices':n,'rim_component':5,'width_m':width,'height_m':height,
 'shell_vertices':len(vertices),'shell_faces':len(faces),'shell_boundary_edges':sum(x==1 for x in edges.values()),
 'note':'Unwelded review shell; no claim of manifold merged face; inspect normals, caps, and visual seam'},f,indent=2)
