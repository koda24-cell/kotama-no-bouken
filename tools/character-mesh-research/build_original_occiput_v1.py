"""Original Assassin posterior cranium v1 — FULLY NEW geometry, no VRM import.
Build new quads using analytic head cross sections. Shibu may be used as visual
reference OUTSIDE this generator, never as source vertices or output GLB.
Blender -b --python script.py -- OUT_DIR
"""
import bpy,sys,os,math,json,hashlib
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(args)!=1:raise SystemExit("Expected OUT_DIR")
out=args[0];os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# REAR HEMISHELL: forward is +Y. Ring orientations are intentionally not
# welded to any source mesh. Front and lower rim remain OPEN for later stages.
N_Z=28;N_PHI=32
verts=[];faces=[]
z_bottom=1.402;z_top=1.590
for k in range(N_Z+1):
    t=k/N_Z
    z=z_bottom+(z_top-z_bottom)*t
    # Broad rounded upper occiput, nape tucked inward; avoid a cone.
    fullness=0.33+0.67*math.sin(math.pi*(0.04+0.90*t))**0.8
    halfwidth=0.093*fullness
    posterior_depth=0.071+0.029*math.exp(-((t-0.66)/0.32)**2)
    # Lower neck/occiput curvature in z and y are separate design parameters
    for j in range(N_PHI+1):
        phi=math.pi*j/N_PHI
        x=halfwidth*math.cos(phi)
        # Rearward y projection is broad across the whole posterior shell.
        y=0.003-posterior_depth*math.sin(phi)**0.75
        # Temporal flanks are slightly forward of central occiput.
        y+=0.006*(abs(math.cos(phi))**3)
        verts.append((x,y,z))
for k in range(N_Z):
    for j in range(N_PHI):
        a=k*(N_PHI+1)+j;b=a+1;c=(k+1)*(N_PHI+1)+j+1;d=c-1
        faces.append((a,b,c,d))
mesh=bpy.data.meshes.new("V1_ORIGINAL_CRANIUM_QUADS")
mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new("Assassin_Original_Posterior_V1_NOT_APPROVED",mesh)
bpy.context.collection.objects.link(obj)
for f in mesh.polygons:f.use_smooth=True
mat=bpy.data.materials.new("review_warm_clay");mat.diffuse_color=(.74,.66,.62,1);mat.use_nodes=True
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(.74,.66,.62,1)
mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value=.80
mesh.materials.append(mat)
# QA: original generated mesh must have only new vertices, all 4-sided faces.
assert all(len(p.vertices)==4 for p in mesh.polygons)
assert len(mesh.vertices)==(N_Z+1)*(N_PHI+1)
assert len(mesh.polygons)==N_Z*N_PHI
edge_use={}
for f in mesh.polygons:
    p=list(f.vertices)
    for a,b in zip(p,p[1:]+p[:1]):
        key=tuple(sorted((a,b)));edge_use[key]=edge_use.get(key,0)+1
boundary=sum(v==1 for v in edge_use.values())
assert boundary==2*N_Z+2*N_PHI
assert max(edge_use.values())==2
# Render 6 angles + side silhouette close-up with no borrowed material/texture.
scene=bpy.context.scene
eng={e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}
scene.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in eng else 'BLENDER_EEVEE'
scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
target=Vector((0,-.03,1.496))
for offset,power,size in [((1,1,2),350,1.4),((-1,-1,2),280,1.8)]:
    p=target+Vector(offset)
    bpy.ops.object.light_add(type='AREA',location=p)
    l=bpy.context.object;l.data.energy=power;l.data.size=size
    l.rotation_euler=(target-p).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO'
scene.camera=cam
views=[('right',(1,0,0)),('left',(-1,0,0)),('back',(0,-1,0)),
 ('back_three_quarter',(1,-1,.15)),('back_upper',(1,-1,.7)),
 ('front',(0,1,0)),('side_closeup',(1,0,0))]
for name,axis in views:
    cam.location=target+Vector(axis).normalized()*1.3
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.ortho_scale=.31 if name=='side_closeup' else .40
    scene.render.filepath=os.path.join(out,name+'.png')
    bpy.ops.render.render(write_still=True)
# Keep only current original model in review GLB; do not export imported VRM.
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
bpy.context.view_layer.objects.active=obj
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'assassin_original_occiput_v1_review.glb'),export_format='GLB',use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'assassin_original_occiput_v1.blend'))
qa={'status':'NOT_APPROVED','generator':'original analytic quadrilateral rear shell',
 'source_VRM_imported':False,'source_mesh_vertices_copied':0,
 'vertices':len(mesh.vertices),'quads':len(mesh.polygons),
 'open_boundary_edges':boundary,'nonmanifold_edges_gt2':0,
 'note':'Partial posterior shell only; no Face/ears/hair/neck interface built; silhouette approval pending'}
with open(os.path.join(out,'qa.json'),'w') as f:json.dump(qa,f,indent=2)
manifest={'status':'NOT_APPROVED','outputs':{}}
for f in os.listdir(out):
    p=os.path.join(out,f)
    if os.path.isfile(p):
        manifest['outputs'][f]={'bytes':os.stat(p).st_size,'sha256':hashlib.sha256(open(p,'rb').read()).hexdigest()}
with open(os.path.join(out,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
print('ORIGINAL_OCCIPUT_V1_QA',qa)
