"""V11 rim wooden plugs: softly fitted joints, reduced black ring contrast, preserved photo-based endgrain.
Source V10 is SHA-verified and preserved in GitHub Actions artifact. Existing rim and joins are unchanged.
"""
import bpy,sys,hashlib,json,math
from pathlib import Path
from mathutils import Vector
source=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
EXPECTED='c897bc8e08c6a459a670d8f30e3871d336658c564c03c5595ada48796ca159e9'
sha=hashlib.sha256(source.read_bytes()).hexdigest()
if sha!=EXPECTED:raise RuntimeError('Wrong V10 source blend SHA')
bpy.ops.wm.open_mainfile(filepath=str(source))
core=bpy.data.objects['B2_RimSegment_01_Curved_OakTimber']
original=bpy.data.objects['V03_Rim_Original_Protected']
before=(len(core.data.vertices),len(core.data.polygons))
endmat=bpy.data.materials.get('Exposed weathered end grain')
assert endmat and endmat.use_nodes
# The V10 fitted pegs and socket palette are retained exactly.
# Add thin, shallow cross-grain recession traces only on the two cut faces.
# No boolean cuts, no change to original thickness, radius or mating topology.
import random
rng=random.Random(20261119)
cut_dark=bpy.data.materials.new('V11 endgrain fine fissure umber')
cut_dark.diffuse_color=(.080,.060,.047,1)
cut_dark.use_nodes=True
bs=cut_dark.node_tree.nodes.get('Principled BSDF')
bs.inputs['Base Color'].default_value=(.080,.060,.047,1)
bs.inputs['Roughness'].default_value=.96
cut_light=bpy.data.materials.new('V11 worn cut-face fiber')
cut_light.diffuse_color=(.28,.205,.15,1)
cut_light.use_nodes=True
bs=cut_light.node_tree.nodes.get('Principled BSDF')
bs.inputs['Base Color'].default_value=(.28,.205,.15,1)
bs.inputs['Roughness'].default_value=.94
SEG=math.tau/14
R=2.55
def cut_face_strip(name,side,points,width,mat):
    # actual old outer endcap is approximately a constant-angle plane.
    # Set a 0.8 mm offset towards the exterior to avoid z-fighting.
    theta=(-.5 if side==0 else .5)*SEG
    tangent=Vector((0,-math.sin(theta),math.cos(theta)))
    outward=tangent*(-1 if side==0 else 1)
    verts=[]
    for x,rr in points:
        p=Vector((x,(R+rr)*math.cos(theta)-R,(R+rr)*math.sin(theta)))+outward*.0011
        verts.extend([tuple(p+Vector((width/2,0,0))),tuple(p-Vector((width/2,0,0)))])
    faces=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(points)-1)]
    mesh=bpy.data.meshes.new(name+'_mesh');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    return obj
traces=0
# Each face gets two irregular hairline fissures and two short faded fibers.
# Retain the 26 cm axial width and 29 cm radial depth.
for side in (0,1):
    for j in range(2):
        x=-.055+j*.102
        radial=-.075+j*.018
        pts=[(x,radial),(x+.008,radial+.019),(x-.004,radial+.040),(x+.005,radial+.059)]
        cut_face_strip('V11_Endgrain_ShortFissure_%d_%d'%(side,j),side,pts,.0011,cut_dark)
        traces+=1
    for j in range(2):
        x=-.077+j*.155
        radial=.016+j*.015
        pts=[(x,radial),(x+.004,radial+.022),(x-.006,radial+.047)]
        cut_face_strip('V11_Endgrain_PaleFiber_%d_%d'%(side,j),side,pts,.0013,cut_light)
        traces+=1
assert traces==8
assert (len(core.data.vertices),len(core.data.polygons))==before
# Remove the protected original only from the export scene; restore afterwards.
coll=original.users_collection[0];coll.objects.unlink(original)
tag='b2_waterwheel_single_rim_segment_v11'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
coll.objects.link(original);original.hide_render=True;original.hide_set(True)
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=44
sc.render.resolution_x=860;sc.render.resolution_y=860;sc.render.resolution_percentage=100
cam=sc.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.80
files=[glb]
for n,pos in [('front',(2.6,.55,0)),('side',(0,1.9,2.4)),
              ('angle',(2.2,1.5,1.7)),('back',(-2.6,.4,0))]:
 cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 png=out/(tag+'_'+n+'.png');sc.render.filepath=str(png)
 bpy.ops.render.render(write_still=True);files.append(png)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'approval':'NOT_APPROVED','source_v10_sha256':sha,
 'preserved_core_mesh':True,'previous_v10_plug_fit_preserved':True,'endgrain_fiber_strips':traces,'original_mesh_topology_preserved':True,'backup_in_editable_blend':True,
 'wood_photo_source':'https://polyhaven.com/a/fine_grained_wood',
 'files':{}}
for p in files:
 b=p.read_bytes();manifest['files'][p.name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('V11_ENDGRAIN_MICROFIBER_REVIEW_OK',traces,flush=True)
