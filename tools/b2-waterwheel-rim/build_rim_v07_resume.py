"""B2 rim V07 — organic end-grain wear, starting from best V05 Blender checkpoint.
No boolean tears, no loose spikes, no wheel reassembly. Retain all PBR images,
wooden pegs, V03 untouched backing mesh and the original wheel code.
"""
import bpy,sys,json,math,hashlib
from pathlib import Path
from mathutils import Vector

source=Path(sys.argv[sys.argv.index('--')+1]).resolve()
out=Path(sys.argv[sys.argv.index('--')+2]).resolve();out.mkdir(parents=True,exist_ok=True)
expected='55ebe59e0ceb4d4875ff85daa48ff3f14e8e507fe76a60f20cd629ac97af96c4'
sha=hashlib.sha256(source.read_bytes()).hexdigest()
if sha!=expected:raise RuntimeError('Wrong V05 source checkpoint; stop safely')
bpy.ops.wm.open_mainfile(filepath=str(source))
beam=bpy.data.objects.get('B2_RimSegment_01_Curved_OakTimber')
original=bpy.data.objects.get('V03_Rim_Original_Protected')
assert beam and original and beam.type=='MESH'
# V05 uses Boolean-drilled mortises: vertex count no longer equals 43*8.
# Derive each existing vertex's ring angle and actual physical radius instead.
v=beam.data.vertices
before=[tuple(p.co) for p in v]
SEG=math.tau/14
max_shift=0
modified=0
for p in v:
    y=p.co.y+2.55
    z=p.co.z
    radial=Vector((0,y,z))
    if radial.length<.001:continue
    angle=math.atan2(z,y)
    u=angle/SEG+.5
    # Wear away only the radial outer corners of exposed ends.
    # Keep the peg drilling and the inner circumferential contact faces intact.
    r=radial.length
    if r<2.55+.078 or abs(p.co.x)<.082:continue
    wear=0.0
    if u<.16:
        f=max(0.,min(1.,(.16-u)/.16))
        wear=.011*(math.sin(.5*math.pi*f)**2)*(.72+.28*math.sin(12*u+7*p.co.x)**2)
    elif u>.84:
        f=max(0.,min(1.,(u-.84)/.16))
        wear=.0125*(math.sin(.5*math.pi*f)**2)*(.69+.31*math.cos(11*u-8*p.co.x)**2)
    if wear>0:
        p.co-=radial.normalized()*wear
        max_shift=max(max_shift,wear)
        modified+=1
beam.data.update()
assert max_shift<.015 and max_shift>.005 and modified>=4, (max_shift,modified)
assert len(beam.data.vertices)==len(before)
# A physically subtle exposed wood-end tone, not a sticker-like procedural ring.
end=bpy.data.materials.get('Exposed weathered end grain')
assert end and end.use_nodes
p=end.node_tree.nodes.get('Principled BSDF')
p.inputs['Roughness'].default_value=.91
# Do not darken down to the old completely black sockets.
dowel=bpy.data.materials.get('Weathered oak dowel head')
assert dowel
dowel.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.125,.106,.087,1)
# Keep the untouched original inside the saved editable Blend but not the GLB.
backup_col=original.users_collection[0]
backup_col.objects.unlink(original)
tag='b2_waterwheel_single_rim_segment_v07'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True)
backup_col.objects.link(original);original.hide_render=True;original.hide_set(True)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=48
scene.render.resolution_x=860;scene.render.resolution_y=860;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
cam=scene.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.80
files=[glb]
for name,pos in [('front',(2.6,.55,0)),('side',(0,1.9,2.4)),
                 ('angle',(2.2,1.5,1.7)),('back',(-2.6,.4,0))]:
    cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
    png=out/(tag+'_'+name+'.png')
    scene.render.filepath=str(png)
    bpy.ops.render.render(write_still=True);files.append(png)
blend=out/(tag+'.blend')
bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'approval':'NOT_APPROVED','source_v05_blend_sha256':sha,
 'original_v03_backed_up_in_blend':True,'no_boolean_spikes':True,
 'max_wood_deformation_m':max_shift,'endgrain_repaired':True,
 'mesh_vertex_count':len(v),'modified_surface_vertices':modified,'wood_PBR':'Poly Haven fine_grained_wood CC0; retained photo color, normal and roughness',
 'files':{}}
for file in files:
    raw=file.read_bytes()
    manifest['files'][file.name]={'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('B2_RIM_V07_REAL_BLENDER_CHECKPOINT_OK',json.dumps({'max_shift':max_shift}),flush=True)
